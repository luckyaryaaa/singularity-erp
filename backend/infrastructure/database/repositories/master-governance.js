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
      ['CONTACT_MISSING','WARNING','Kontak supplier belum tersedia',`NOT EXISTS(SELECT 1 FROM supplier_contacts x WHERE x.supplier_id=m.id AND x.active)`]
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

module.exports={validateMaster,refreshQuality,scanQuality,qualityDashboard,listCurrencies,listExchangeRates,createExchangeRate,resolveCurrency,resolveDimensions,productCostTrace};
