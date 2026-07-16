'use strict';

const { randomUUID } = require('node:crypto');
const { AppError } = require('../../../core/errors');

const MASTER_RULES = {
  customers: {
    fields: ['legal_name','npwp','currency'],
    checks: [
      ['CONTACT_MISSING','WARNING','Kontak utama pelanggan belum tersedia',`NOT EXISTS(SELECT 1 FROM customer_contacts x WHERE x.customer_id=m.id AND x.active)`],
      ['ADDRESS_MISSING','WARNING','Alamat pelanggan belum tersedia',`NOT EXISTS(SELECT 1 FROM customer_addresses x WHERE x.customer_id=m.id AND x.active)`]
    ]
  },
  suppliers: {
    fields: ['legal_name','npwp','category'],
    checks: [
      ['BANK_UNVERIFIED','CRITICAL','Rekening supplier belum diverifikasi',`NOT EXISTS(SELECT 1 FROM supplier_bank_accounts x WHERE x.supplier_id=m.id AND x.verification_status='VERIFIED')`],
      ['CONTACT_MISSING','WARNING','Kontak supplier belum tersedia',`NOT EXISTS(SELECT 1 FROM supplier_contacts x WHERE x.supplier_id=m.id AND x.active)`],
      ['DOCUMENT_EXPIRED','CRITICAL','Dokumen wajib supplier kedaluwarsa atau belum terverifikasi',`EXISTS(SELECT 1 FROM supplier_documents x WHERE x.supplier_id=m.id AND x.required AND (x.verification_status<>'VERIFIED' OR (x.expiry_date IS NOT NULL AND x.expiry_date<current_date)))`],
      ['PERFORMANCE_HOLD','CRITICAL','Supplier ditahan oleh kontrol kinerja otomatis',`m.performance_hold`]
    ]
  },
  products: {
    fields: ['category','uom','product_type'],
    checks: [
      ['COST_MISSING','CRITICAL','Produk MAKE belum memiliki Active HPP',`m.make_or_buy='MAKE' AND NOT EXISTS(SELECT 1 FROM product_cost_revisions x WHERE x.product_id=m.id AND x.status='ACTIVE')`],
      ['SPEC_MISSING','WARNING','Spesifikasi produk belum lengkap',`m.product_type<>'SERVICE' AND NULLIF(trim(m.specification),'') IS NULL`]
    ]
  },
  employees: {
    fields: ['department','job_title','branch_id','join_date'],
    checks: [
      ['POSITION_MISSING','CRITICAL','Posisi aktif karyawan belum tersedia',`NOT EXISTS(SELECT 1 FROM employee_positions x WHERE x.employee_id=m.id AND x.effective_from<=current_date AND (x.effective_to IS NULL OR x.effective_to>=current_date))`],
      ['BANK_UNVERIFIED','CRITICAL','Rekening payroll belum diverifikasi',`NOT EXISTS(SELECT 1 FROM employee_bank_accounts x WHERE x.employee_id=m.id AND x.verification_status='VERIFIED')`],
      ['TAX_MISSING','WARNING','Profil pajak aktif belum tersedia',`NOT EXISTS(SELECT 1 FROM employee_tax_profiles x WHERE x.employee_id=m.id AND x.effective_from<=current_date AND (x.effective_to IS NULL OR x.effective_to>=current_date))`]
    ]
  }
};

const normalize = (value) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g,'');

async function validateMaster(client, master, body, excludeId) {
  if (!MASTER_RULES[master]) throw new AppError('RESOURCE_NOT_FOUND');
  const code = body.code || body.nik;
  if (code) {
    const column = master === 'employees' ? 'nik' : 'code';
    const duplicate = (await client.query(
      `SELECT id FROM ${master} WHERE regexp_replace(upper(${column}),'[^A-Z0-9]','','g')=$1 AND ($2::uuid IS NULL OR id<>$2) LIMIT 1`,
      [normalize(code), excludeId || null])).rows[0];
    if (duplicate) throw new AppError('VALIDATION_ERROR', `${column.toUpperCase()} sudah dipakai data master lain.`);
  }
  if (['customers','suppliers'].includes(master) && body.npwp) {
    const duplicate = (await client.query(
      `SELECT id FROM ${master} WHERE NULLIF(regexp_replace(npwp,'[^0-9]','','g'),'')=$1 AND ($2::uuid IS NULL OR id<>$2) LIMIT 1`,
      [normalize(body.npwp).replace(/[^0-9]/g,''), excludeId || null])).rows[0];
    if (duplicate) throw new AppError('VALIDATION_ERROR', 'NPWP terindikasi duplikat pada master yang sama.');
  }
}

async function refreshQuality(client, master, id) {
  const cfg = MASTER_RULES[master];
  if (!cfg) throw new AppError('RESOURCE_NOT_FOUND');
  const row = (await client.query(`SELECT * FROM ${master} m WHERE m.id=$1`,[id])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND');
  const flags = [];
  for (const field of cfg.fields) {
    if (row[field] === null || row[field] === undefined || String(row[field]).trim() === '') {
      flags.push({ code:`${field.toUpperCase()}_MISSING`, severity:'WARNING', detail:`Kolom ${field} belum dilengkapi` });
    }
  }
  for (const [code,severity,detail,condition] of cfg.checks) {
    const hit=(await client.query(`SELECT (${condition}) hit FROM ${master} m WHERE m.id=$1`,[id])).rows[0]?.hit;
    if(hit) flags.push({code,severity,detail});
  }
  const penalty=flags.reduce((sum,x)=>sum+(x.severity==='CRITICAL'?25:x.severity==='WARNING'?10:5),0);
  const score=Math.max(0,100-penalty);
  await client.query(`UPDATE ${master} SET data_quality_score=$2,quality_flags=$3,quality_checked_at=now() WHERE id=$1`,[id,score,JSON.stringify(flags)]);
  for(const flag of flags){
    await client.query(`INSERT INTO master_data_quality_issues(id,master_type,master_id,rule_code,severity,detail)
      VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(master_type,master_id,rule_code) WHERE status='OPEN' DO UPDATE SET severity=excluded.severity,detail=excluded.detail,detected_at=now()`,
      [randomUUID(),master,id,flag.code,flag.severity,flag.detail]);
  }
  const activeCodes=flags.map(x=>x.code);
  await client.query(`UPDATE master_data_quality_issues SET status='RESOLVED',resolved_at=now(),resolution_note='Resolved by automated quality scan'
    WHERE master_type=$1 AND master_id=$2 AND status='OPEN' AND NOT(rule_code=ANY($3::text[]))`,[master,id,activeCodes]);
  return {score,flags};
}

async function scanQuality(client) {
  for(const master of Object.keys(MASTER_RULES)){
    const ids=(await client.query(`SELECT id FROM ${master} WHERE active ORDER BY quality_checked_at NULLS FIRST LIMIT 500`)).rows;
    for(const {id} of ids) await refreshQuality(client,master,id);
  }
  return qualityDashboard(client);
}

async function qualityDashboard(client) {
  const summary=[];
  for(const master of Object.keys(MASTER_RULES)){
    const row=(await client.query(`SELECT count(*)::int total,round(avg(data_quality_score),1)::float score,count(*) FILTER(WHERE data_quality_score<70)::int critical FROM ${master} WHERE active`)).rows[0];
    summary.push({master,...row});
  }
  const issues=(await client.query(`SELECT q.*,CASE q.master_type WHEN 'employees' THEN e.name WHEN 'customers' THEN c.name WHEN 'suppliers' THEN s.name ELSE p.name END master_name
    FROM master_data_quality_issues q
    LEFT JOIN employees e ON q.master_type='employees' AND e.id=q.master_id
    LEFT JOIN customers c ON q.master_type='customers' AND c.id=q.master_id
    LEFT JOIN suppliers s ON q.master_type='suppliers' AND s.id=q.master_id
    LEFT JOIN products p ON q.master_type='products' AND p.id=q.master_id
    WHERE q.status='OPEN' ORDER BY CASE q.severity WHEN 'CRITICAL' THEN 1 WHEN 'WARNING' THEN 2 ELSE 3 END,q.detected_at DESC LIMIT 100`)).rows;
  return {summary,issues};
}

async function listCurrencies(client) {
  return (await client.query('SELECT * FROM currencies WHERE active ORDER BY code')).rows;
}

async function listExchangeRates(client,{fromCurrency,toCurrency,limit=100}={}) {
  const params=[];let where='TRUE';
  if(fromCurrency){params.push(String(fromCurrency).toUpperCase());where+=` AND from_currency=$${params.length}`;}
  if(toCurrency){params.push(String(toCurrency).toUpperCase());where+=` AND to_currency=$${params.length}`;}
  params.push(Math.min(Math.max(Number(limit)||100,1),250));
  return (await client.query(`SELECT * FROM exchange_rates WHERE ${where} ORDER BY effective_date DESC,created_at DESC LIMIT $${params.length}`,params)).rows;
}

async function createExchangeRate(client,body,user) {
  const from=String(body.fromCurrency||'').toUpperCase(),to=String(body.toCurrency||'').toUpperCase();
  if(!/^[A-Z]{3}$/.test(from)||!/^[A-Z]{3}$/.test(to)||!(Number(body.rate)>0)||!body.effectiveDate||!String(body.source||'').trim())
    throw new AppError('VALIDATION_ERROR','Mata uang, tanggal efektif, kurs positif, dan sumber wajib diisi.');
  const row=(await client.query(`INSERT INTO exchange_rates(id,rate_type,from_currency,to_currency,effective_date,rate,source,status,notes,created_by,approved_by,approved_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,'ACTIVE',$8,$9,$9,now())
    ON CONFLICT(rate_type,from_currency,to_currency,effective_date) DO UPDATE SET rate=excluded.rate,source=excluded.source,notes=excluded.notes,status='ACTIVE',approved_by=excluded.approved_by,approved_at=now()
    RETURNING *`,[randomUUID(),body.rateType||'CORPORATE',from,to,body.effectiveDate,Number(body.rate),String(body.source).trim(),body.notes||null,user.id])).rows[0];
  return row;
}

async function findRate(client,from,to,date) {
  if(from===to)return {rate:1,source:'IDENTITY',effective_date:date};
  const direct=(await client.query(`SELECT rate,source,effective_date FROM exchange_rates WHERE from_currency=$1 AND to_currency=$2 AND rate_type='CORPORATE' AND status='ACTIVE' AND effective_date<=$3 ORDER BY effective_date DESC LIMIT 1`,[from,to,date])).rows[0];
  if(direct)return direct;
  const inverse=(await client.query(`SELECT 1/rate rate,'INVERSE:'||source source,effective_date FROM exchange_rates WHERE from_currency=$2 AND to_currency=$1 AND rate_type='CORPORATE' AND status='ACTIVE' AND effective_date<=$3 ORDER BY effective_date DESC LIMIT 1`,[from,to,date])).rows[0];
  if(inverse)return inverse;
  throw new AppError('VALIDATION_ERROR',`Kurs aktif ${from}/${to} untuk ${date} belum tersedia.`);
}

async function resolveCurrency(client,{legalEntityId,transactionCurrency='IDR',date,amount}) {
  const tx=String(transactionCurrency||'IDR').toUpperCase(),rateDate=date||new Date().toISOString().slice(0,10);
  const entity=legalEntityId?(await client.query('SELECT functional_currency,reporting_currency FROM legal_entities WHERE id=$1',[legalEntityId])).rows[0]:null;
  const functional=entity?.functional_currency||'IDR',reporting=entity?.reporting_currency||functional;
  const [functionalRate,reportingRate]=await Promise.all([findRate(client,tx,functional,rateDate),findRate(client,tx,reporting,rateDate)]);
  return {transactionCurrency:tx,functionalCurrency:functional,reportingCurrency:reporting,exchangeRate:Number(functionalRate.rate),exchangeRateDate:rateDate,functionalAmount:Number(amount)*Number(functionalRate.rate),reportingAmount:Number(amount)*Number(reportingRate.rate),snapshot:{transactionCurrency:tx,functionalCurrency:functional,reportingCurrency:reporting,functionalRate:Number(functionalRate.rate),reportingRate:Number(reportingRate.rate),rateDate,source:functionalRate.source,reportingSource:reportingRate.source}};
}

async function resolveDimensions(client,{type,legalEntityId,departmentId,costCenterId,profitCenterId,projectWbsId}) {
  const policy=(await client.query('SELECT * FROM transaction_dimension_policies WHERE document_type=$1 AND effective_from<=current_date',[type])).rows[0];
  let cost=costCenterId||null;
  if(!cost&&policy?.cost_center_required&&legalEntityId){
    cost=(await client.query(`SELECT id FROM cost_centers WHERE legal_entity_id=$1 AND active ORDER BY CASE WHEN code LIKE 'CC-HO%' THEN 0 ELSE 1 END,code LIMIT 1`,[legalEntityId])).rows[0]?.id||null;
  }
  if(policy?.legal_entity_required&&legalEntityId&&policy.cost_center_required&&!cost)throw new AppError('VALIDATION_ERROR','Cost center wajib untuk tipe transaksi ini.');
  if(cost&&legalEntityId){const valid=(await client.query('SELECT 1 FROM cost_centers WHERE id=$1 AND legal_entity_id=$2 AND active',[cost,legalEntityId])).rowCount;if(!valid)throw new AppError('VALIDATION_ERROR','Cost center tidak berada pada legal entity transaksi.');}
  const ids={departmentId:departmentId||null,costCenterId:cost,profitCenterId:profitCenterId||null,projectWbsId:projectWbsId||null};
  return {...ids,snapshot:{policy:policy?.document_type||'DEFAULT',legalEntityId,...ids,resolvedAt:new Date().toISOString()}};
}

async function productCostTrace(client,productId) {
  const product=(await client.query('SELECT id,code,name,uom,hpp,make_or_buy FROM products WHERE id=$1',[productId])).rows[0];
  if(!product)throw new AppError('RESOURCE_NOT_FOUND');
  const bom=(await client.query(`SELECT * FROM bom_headers WHERE product_id=$1 AND status='EFFECTIVE' AND COALESCE(effective_date,current_date)<=current_date ORDER BY effective_date DESC NULLS LAST,revision_no DESC LIMIT 1`,[productId])).rows[0];
  if(!bom)return {product,bom:null,lines:[],materialCost:0,uncostedComponents:0,message:'Belum ada BOM efektif.'};
  const lines=(await client.query(`SELECT l.line_no,l.qty,l.uom,l.scrap_pct,p.id product_id,p.code,p.name,
    COALESCE(cr.total_cost,p.hpp,0)::float unit_cost,CASE WHEN cr.id IS NOT NULL THEN 'ACTIVE_HPP' ELSE 'PRODUCT_HPP' END cost_source,
    (l.qty*(1+l.scrap_pct/100)*COALESCE(cr.total_cost,p.hpp,0))::float extended_cost
    FROM bom_lines l JOIN products p ON p.id=l.component_product_id
    LEFT JOIN product_cost_revisions cr ON cr.product_id=p.id AND cr.status='ACTIVE'
    WHERE l.bom_id=$1 ORDER BY l.line_no`,[bom.id])).rows;
  const materialCost=lines.reduce((sum,x)=>sum+Number(x.extended_cost),0);
  const uncostedComponents=lines.filter(x=>Number(x.unit_cost)===0).length;
  return {product,bom,lines,materialCost,uncostedComponents,calculatedAt:new Date().toISOString()};
}

async function calculateSupplierPerformance(client,supplierId,period,user) {
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(period||'')))throw new AppError('VALIDATION_ERROR','Periode supplier score harus YYYY-MM.');
  const supplier=(await client.query('SELECT * FROM suppliers WHERE id=$1',[supplierId])).rows[0];
  if(!supplier)throw new AppError('RESOURCE_NOT_FOUND');
  const policy=(await client.query(`SELECT * FROM supplier_score_policies WHERE active AND effective_from<=($1||'-01')::date AND (effective_to IS NULL OR effective_to>=($1||'-01')::date) ORDER BY effective_from DESC,version DESC LIMIT 1`,[period])).rows[0];
  if(!policy)throw new AppError('VALIDATION_ERROR','Policy supplier score belum tersedia untuk periode ini.');
  const evidence=(await client.query(`WITH bounds AS (SELECT ($2||'-01')::date d1,(($2||'-01')::date+interval '1 month') d2),
    po AS (SELECT d.* FROM business_documents d,bounds b WHERE d.document_type='PURCHASE_ORDER' AND d.party_id=$1 AND d.created_at>=b.d1 AND d.created_at<b.d2 AND d.status NOT IN('CANCELLED','VOID','REJECTED')),
    gr AS (SELECT DISTINCT c.*,p.id po_id,p.due_date po_due FROM po p JOIN document_relations r ON r.parent_document_id=p.id JOIN business_documents c ON c.id=r.child_document_id AND c.document_type='GOODS_RECEIPT'),
    qc AS (SELECT q.* FROM qc_inspections q JOIN gr ON gr.id=q.subject_document_id),
    quotes AS (SELECT q.rfq_document_id,q.landed_cost,(SELECT min(q2.landed_cost) FROM rfq_quotes q2 WHERE q2.rfq_document_id=q.rfq_document_id) best FROM rfq_quotes q,bounds b WHERE q.supplier_id=$1 AND q.received_at>=b.d1 AND q.received_at<b.d2),
    docs AS (SELECT count(*) FILTER(WHERE required)::int required_count,count(*) FILTER(WHERE required AND verification_status='VERIFIED' AND (expiry_date IS NULL OR expiry_date>=current_date))::int valid_count,count(*) FILTER(WHERE required AND (verification_status<>'VERIFIED' OR (expiry_date IS NOT NULL AND expiry_date<current_date)))::int invalid_count FROM supplier_documents WHERE supplier_id=$1)
    SELECT (SELECT count(*)::int FROM po) order_count,(SELECT count(*)::int FROM gr) receipt_count,
      (SELECT count(*)::int FROM gr WHERE po_due IS NULL OR updated_at::date<=po_due) on_time_count,
      (SELECT count(*)::int FROM qc) inspection_count,(SELECT COALESCE(sum(passed_qty),0)::float FROM qc) passed_qty,(SELECT COALESCE(sum(sampled_qty),0)::float FROM qc) sampled_qty,
      (SELECT count(*)::int FROM quotes) price_sample_count,(SELECT COALESCE(avg(LEAST(100,(best/NULLIF(landed_cost,0))*100)),100)::float FROM quotes) price_score,
      (SELECT required_count FROM docs) required_docs,(SELECT valid_count FROM docs) valid_docs,(SELECT invalid_count FROM docs) invalid_docs`,[supplierId,period])).rows[0];
  const orders=Number(evidence.order_count),receipts=Number(evidence.receipt_count),inspections=Number(evidence.inspection_count),samples=Number(evidence.sampled_qty);
  const delivery=orders?Math.round(Number(evidence.on_time_count)/orders*10000)/100:100;
  const quality=samples?Math.round(Number(evidence.passed_qty)/samples*10000)/100:100;
  const price=Number(evidence.price_score)||100;
  const compliance=Number(evidence.required_docs)?Math.round(Number(evidence.valid_docs)/Number(evidence.required_docs)*10000)/100:100;
  const score=Math.round((delivery*Number(policy.delivery_weight)+quality*Number(policy.quality_weight)+price*Number(policy.price_weight)+compliance*Number(policy.compliance_weight)))/100;
  const rejected=samples?Math.round((samples-Number(evidence.passed_qty))/samples*10000)/100:0;
  const hold=(orders>=Number(policy.min_orders_for_hold)&&score<Number(policy.hold_threshold))||Number(evidence.invalid_docs)>0;
  const risk=score>=85?'LOW':score>=Number(policy.approved_threshold)?'MEDIUM':'HIGH';
  const breakdown={policyCode:policy.code,policyVersion:policy.version,weights:{delivery:Number(policy.delivery_weight),quality:Number(policy.quality_weight),price:Number(policy.price_weight),compliance:Number(policy.compliance_weight)},scores:{delivery,quality,price,compliance},evidence:{orders,receipts,inspections,priceSamples:Number(evidence.price_sample_count),requiredDocuments:Number(evidence.required_docs),invalidDocuments:Number(evidence.invalid_docs)}};
  const evaluation=(await client.query(`INSERT INTO supplier_evaluations(supplier_id,period,on_time_delivery_pct,quality_acceptance_pct,rejection_rate_pct,price_competitiveness,document_compliance,overall_score,risk_level,approved_vendor,notes,calculation_source,order_count,receipt_count,inspection_count,price_sample_count,score_breakdown,calculated_at,calculated_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'AUTOMATIC',$12,$13,$14,$15,$16,now(),$17)
    ON CONFLICT(supplier_id,period) DO UPDATE SET on_time_delivery_pct=excluded.on_time_delivery_pct,quality_acceptance_pct=excluded.quality_acceptance_pct,rejection_rate_pct=excluded.rejection_rate_pct,price_competitiveness=excluded.price_competitiveness,document_compliance=excluded.document_compliance,overall_score=excluded.overall_score,risk_level=excluded.risk_level,approved_vendor=excluded.approved_vendor,notes=excluded.notes,calculation_source='AUTOMATIC',order_count=excluded.order_count,receipt_count=excluded.receipt_count,inspection_count=excluded.inspection_count,price_sample_count=excluded.price_sample_count,score_breakdown=excluded.score_breakdown,calculated_at=now(),calculated_by=excluded.calculated_by RETURNING *`,
    [supplierId,period,delivery,quality,rejected,Math.max(1,Math.min(5,Math.round(price/20))),Math.max(1,Math.min(5,Math.round(compliance/20))),score,risk,!hold&&score>=Number(policy.approved_threshold),`Automatic score ${period}`,orders,receipts,inspections,Number(evidence.price_sample_count),breakdown,user?.id||null])).rows[0];
  await client.query(`UPDATE suppliers SET last_performance_score=$2,last_performance_period=$3,performance_hold=$4,performance_hold_reason=$5,risk_level=$6,rating=$7,updated_at=now() WHERE id=$1`,[supplierId,score,period,hold,hold?Number(evidence.invalid_docs)>0?'Dokumen wajib tidak valid atau kedaluwarsa':`Skor ${score} di bawah ambang ${policy.hold_threshold}`:null,risk,Math.max(1,Math.min(5,Math.round(score/20)))]);
  await refreshQuality(client,'suppliers',supplierId);
  return evaluation;
}

async function supplierPerformance(client,supplierId) {
  const supplier=(await client.query('SELECT id,code,name,performance_hold,performance_hold_reason,last_performance_score,last_performance_period,risk_level,onboarding_status FROM suppliers WHERE id=$1',[supplierId])).rows[0];
  if(!supplier)throw new AppError('RESOURCE_NOT_FOUND');
  const evaluations=(await client.query(`SELECT * FROM supplier_evaluations WHERE supplier_id=$1 ORDER BY period DESC LIMIT 24`,[supplierId])).rows;
  const documents=(await client.query(`SELECT *,CASE WHEN expiry_date<current_date THEN 'EXPIRED' WHEN expiry_date<=current_date+interval '30 days' THEN 'EXPIRING' ELSE verification_status END control_status FROM supplier_documents WHERE supplier_id=$1 ORDER BY required DESC,expiry_date NULLS LAST`,[supplierId])).rows;
  return {supplier,evaluations,documents};
}

async function scoreSuppliers(client,period,user) {
  const ids=(await client.query('SELECT id FROM suppliers WHERE active ORDER BY code')).rows;
  const items=[];for(const {id} of ids)items.push(await calculateSupplierPerformance(client,id,period,user));
  return items;
}

module.exports={validateMaster,refreshQuality,scanQuality,qualityDashboard,listCurrencies,listExchangeRates,createExchangeRate,resolveCurrency,resolveDimensions,productCostTrace,calculateSupplierPerformance,supplierPerformance,scoreSuppliers};
