'use strict';
// Sprint 16 (R023) — semantic layer untuk Executive Cockpit. Angka finansial
// selalu berakar pada GL/materialized summary; saldo AR/AP memakai subledger
// terposting dan seluruh query membawa scope cabang eksplisit.
const { randomUUID } = require('node:crypto');
const { AppError } = require('../../../core/errors');
const { hasGlobalScope, assertBranchAccess } = require('../../../core/data-scope');
const { camel } = require('./runtime');

const REPORTS = Object.freeze([
  { key:'sales_customer', title:'Penjualan per pelanggan', group:'Operasional', description:'Nilai quotation, order, dan invoice per pelanggan.' },
  { key:'ar_ap_aging', title:'AR & AP aging', group:'Keuangan', description:'Outstanding dan umur piutang/utang per relasi.' },
  { key:'project_profitability', title:'Profitabilitas proyek', group:'Keuangan', description:'Nilai proyek dibanding job cost aktual work order.' },
  { key:'production_performance', title:'Kinerja produksi', group:'Produksi', description:'Progress, lead time, jam aktual, dan costing WO.' },
  { key:'inventory_movement', title:'Mutasi persediaan', group:'Operasional', description:'Pergerakan stok per SKU dan lokasi.' },
  { key:'payroll_bpjs', title:'Rekap payroll & BPJS', group:'Keuangan', description:'Komponen gaji, BPJS, pajak, dan net pay.' },
  { key:'financial_statement', title:'Neraca & laba rugi', group:'Keuangan', description:'Saldo akun GL dan mutasi periode.' },
  { key:'quality_analytics', title:'Quality analytics', group:'Produksi', description:'Yield inspeksi, kegagalan, NCR, dan tindakan korektif.' }
]);
const BY_KEY = new Map(REPORTS.map((r) => [r.key,r]));
const BY_TITLE = new Map(REPORTS.map((r) => [r.title,r]));
const round = (v) => Math.round(Number(v || 0) * 100) / 100;

function period(value) {
  const p=String(value||new Date().toISOString().slice(0,7));
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(p))throw new AppError('VALIDATION_ERROR','Periode wajib berformat YYYY-MM.');
  return p;
}
function report(value){const item=BY_KEY.get(value)||BY_TITLE.get(value);if(!item)throw new AppError('VALIDATION_ERROR','Laporan tidak dikenal.');return item;}
function scopeFor(user,requestedBranchId){
  if(requestedBranchId){assertBranchAccess(user,requestedBranchId);return{global:false,branchId:requestedBranchId};}
  return hasGlobalScope(user)?{global:true,branchId:null}:{global:false,branchId:user.branchId};
}
const scopedUser=(user,branchId)=>branchId?{...user,branchId,branchScope:null}:user;

async function cockpit(client,{period:value,branchId,user}){
  const p=period(value),start=`${p}-01`,scope=scopeFor(user,branchId);
  const args=[start,scope.global,scope.branchId];
  const summary=(await client.query(`SELECT
      COALESCE(sum(revenue),0)::float revenue,COALESCE(sum(cogs),0)::float cogs,
      COALESCE(sum(gross_margin),0)::float gross_margin,COALESCE(sum(operating_expense),0)::float operating_expense,
      COALESCE(sum(operating_income),0)::float operating_income,COALESCE(sum(order_intake),0)::float order_intake,
      COALESCE(sum(invoice_value),0)::float invoice_value,COALESCE(sum(collections),0)::float collections,
      COALESCE(sum(procurement_spend),0)::float procurement_spend,
      COALESCE(sum(deliveries_completed),0)::int deliveries_completed,
      COALESCE(sum(deliveries_on_time),0)::int deliveries_on_time,
      COALESCE(sum(qc_passed_qty),0)::float qc_passed_qty,COALESCE(sum(qc_failed_qty),0)::float qc_failed_qty,
      COALESCE(sum(quality_failures),0)::int quality_failures
    FROM mv_executive_monthly_kpis WHERE period_start=$1::date AND ($2::boolean OR branch_id=$3)`,args)).rows[0];
  const previous=(await client.query(`SELECT COALESCE(sum(revenue),0)::float revenue,COALESCE(sum(gross_margin),0)::float gross_margin,
      COALESCE(sum(order_intake),0)::float order_intake FROM mv_executive_monthly_kpis
    WHERE period_start=($1::date-interval '1 month')::date AND ($2::boolean OR branch_id=$3)`,args)).rows[0];
  const trends=(await client.query(`SELECT period_start,
      COALESCE(sum(revenue),0)::float revenue,COALESCE(sum(gross_margin),0)::float gross_margin,
      COALESCE(sum(order_intake),0)::float order_intake,COALESCE(sum(collections),0)::float collections
    FROM mv_executive_monthly_kpis WHERE period_start BETWEEN ($1::date-interval '11 months')::date AND $1::date
      AND ($2::boolean OR branch_id=$3) GROUP BY period_start ORDER BY period_start`,args)).rows.map(camel);
  const balances=(await client.query(`WITH inv AS (
      SELECT d.id,d.document_type,d.amount,
        COALESCE((SELECT sum(pa.amount) FROM payment_allocations pa WHERE pa.invoice_document_id=d.id AND pa.reversed_at IS NULL),0) paid
      FROM business_documents d WHERE d.document_type IN('INVOICE','SUPPLIER_INVOICE')
        AND d.status NOT IN('DRAFT','REJECTED','CANCELLED','VOID','CLOSED') AND d.created_at<($1::date+interval '1 month')
        AND ($2::boolean OR d.branch_id=$3)
    ), stock AS (
      SELECT COALESCE(sum(value_idr),0) value FROM inventory_balances WHERE ($2::boolean OR warehouse_id=$3)
    ), cash AS (
      SELECT COALESCE(sum(j.debit-j.credit),0) value FROM journal_lines j
      JOIN chart_of_accounts a ON a.id=j.account_id JOIN business_documents d ON d.id=j.journal_document_id
      WHERE a.code='1100' AND d.created_at<($1::date+interval '1 month') AND ($2::boolean OR d.branch_id=$3)
    ) SELECT
      COALESCE(sum(GREATEST(amount-paid,0)) FILTER(WHERE document_type='INVOICE'),0)::float ar,
      COALESCE(sum(GREATEST(amount-paid,0)) FILTER(WHERE document_type='SUPPLIER_INVOICE'),0)::float ap,
      (SELECT value::float FROM stock) inventory,(SELECT value::float FROM cash) cash FROM inv`,args)).rows[0];
  const live=(await client.query(`SELECT
      COALESCE(sum(functional_amount) FILTER(WHERE document_type='SALES_ORDER' AND status IN('APPROVED','IN_PROCESS','PARTIALLY_COMPLETED')),0)::float order_book,
      count(*) FILTER(WHERE document_type='SALES_ORDER' AND status IN('APPROVED','IN_PROCESS','PARTIALLY_COMPLETED'))::int active_orders,
      count(*) FILTER(WHERE document_type='WORK_ORDER' AND status IN('APPROVED','IN_PROCESS','PARTIALLY_COMPLETED'))::int active_work_orders,
      COALESCE(avg(CASE WHEN document_type='WORK_ORDER' AND status IN('APPROVED','IN_PROCESS','PARTIALLY_COMPLETED')
        THEN COALESCE(NULLIF(payload->>'progress','')::numeric,0) END),0)::float production_progress
    FROM business_documents d WHERE ($1::boolean OR d.branch_id=$2)`,[scope.global,scope.branchId])).rows[0];
  const agingRows=(await client.query(`SELECT GREATEST(d.amount-COALESCE((SELECT sum(pa.amount) FROM payment_allocations pa WHERE pa.invoice_document_id=d.id AND pa.reversed_at IS NULL),0),0)::float outstanding,
      GREATEST(($1::date+interval '1 month - 1 day')::date-COALESCE(d.due_date,($1::date+interval '1 month - 1 day')::date),0)::int age
    FROM business_documents d WHERE d.document_type='INVOICE' AND d.status NOT IN('DRAFT','REJECTED','CANCELLED','VOID','CLOSED')
      AND d.created_at<($1::date+interval '1 month') AND ($2::boolean OR d.branch_id=$3)`,args)).rows;
  const aging=[{key:'current',label:'Belum jatuh tempo',value:0,count:0},{key:'d1_30',label:'1–30 hari',value:0,count:0},{key:'d31_60',label:'31–60 hari',value:0,count:0},{key:'d61_90',label:'61–90 hari',value:0,count:0},{key:'d90_plus',label:'> 90 hari',value:0,count:0}];
  for(const r of agingRows){const i=r.age<=0?0:r.age<=30?1:r.age<=60?2:r.age<=90?3:4;aging[i].value=round(aging[i].value+r.outstanding);aging[i].count++;}
  const funnel=(await client.query(`SELECT document_type,count(*)::int count,COALESCE(sum(functional_amount),0)::float value
    FROM business_documents d WHERE document_type IN('CUSTOMER_INQUIRY','QUOTATION','SALES_ORDER','PROJECT','WORK_ORDER','INVOICE')
      AND status NOT IN('REJECTED','CANCELLED','VOID') AND created_at>=$1::date AND created_at<($1::date+interval '1 month')
      AND ($2::boolean OR branch_id=$3) GROUP BY document_type`,args)).rows.map(camel);
  const customers=(await client.query(`SELECT COALESCE(party_name,'Tanpa pelanggan') name,count(*)::int documents,
      COALESCE(sum(functional_amount),0)::float value FROM business_documents d
    WHERE document_type='INVOICE' AND status NOT IN('DRAFT','REJECTED','CANCELLED','VOID')
      AND created_at>=$1::date AND created_at<($1::date+interval '1 month') AND ($2::boolean OR branch_id=$3)
    GROUP BY party_name ORDER BY value DESC LIMIT 6`,args)).rows;
  const projects=(await client.query(`SELECT p.id,p.document_number,p.title,p.party_name,p.functional_amount::float contract_value,
      COALESCE(sum(CASE WHEN w.payload#>>'{production,costing,totalCost}' ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (w.payload#>>'{production,costing,totalCost}')::numeric ELSE 0 END),0)::float actual_cost
    FROM business_documents p LEFT JOIN document_relations r ON r.parent_document_id=p.id AND r.relation_type='PROJECT_TO_WORK_ORDER'
    LEFT JOIN business_documents w ON w.id=r.child_document_id
    WHERE p.document_type='PROJECT' AND p.status NOT IN('CANCELLED','VOID') AND ($1::boolean OR p.branch_id=$2)
    GROUP BY p.id ORDER BY p.updated_at DESC LIMIT 6`,[scope.global,scope.branchId])).rows.map((r)=>({...camel(r),margin:round(Number(r.contract_value)-Number(r.actual_cost))}));
  const actions=(await client.query(`SELECT * FROM (
      SELECT d.id,d.document_number,d.document_type,d.title,d.party_name,d.amount::float amount,d.due_date,
        'COLLECTION' kind,'CRITICAL' severity,'Invoice melewati jatuh tempo' detail,'#/finance/invoices' link
      FROM business_documents d WHERE d.document_type='INVOICE' AND d.status IN('APPROVED','PARTIALLY_PAID','OVERDUE') AND d.due_date<current_date AND ($1::boolean OR d.branch_id=$2)
      UNION ALL
      SELECT d.id,d.document_number,d.document_type,d.title,d.party_name,d.amount::float,d.due_date,
        'DELIVERY','WARNING','Pekerjaan aktif melewati target','#/production/work-orders'
      FROM business_documents d WHERE d.document_type IN('SALES_ORDER','WORK_ORDER') AND d.status IN('APPROVED','IN_PROCESS','PARTIALLY_COMPLETED') AND d.due_date<current_date AND ($1::boolean OR d.branch_id=$2)
      UNION ALL
      SELECT q.id,d.document_number,'QUALITY_CONTROL',COALESCE(q.defect_code,'Temuan kualitas'),d.party_name,0::float,q.inspected_at::date,
        'QUALITY','CRITICAL','NCR/CAPA membutuhkan tindak lanjut','#/production/quality'
      FROM qc_inspections q JOIN business_documents d ON d.id=q.qc_document_id WHERE q.result IN('FAIL','PARTIAL') AND q.corrective_action IS NULL AND ($1::boolean OR d.branch_id=$2)
    ) a ORDER BY CASE severity WHEN 'CRITICAL' THEN 0 ELSE 1 END,due_date NULLS LAST LIMIT 12`,[scope.global,scope.branchId])).rows.map(camel);
  const refresh=(await client.query(`SELECT status,started_at,finished_at,row_count FROM reporting_refresh_runs WHERE status='SUCCEEDED' ORDER BY finished_at DESC LIMIT 1`)).rows[0]||null;
  const branches=hasGlobalScope(user)?(await client.query('SELECT id,code,name FROM branches WHERE active ORDER BY code')).rows.map(camel):[];
  const revenue=Number(summary.revenue),gross=Number(summary.gross_margin),prevRevenue=Number(previous.revenue);
  const qcTotal=Number(summary.qc_passed_qty)+Number(summary.qc_failed_qty);
  const deliveryTotal=Number(summary.deliveries_completed);
  return{
    period:p,scope:{type:scope.global?'GLOBAL':'BRANCH',branchId:scope.branchId},branches,
    kpi:{revenue:round(revenue),revenueGrowthPct:prevRevenue?round((revenue-prevRevenue)/Math.abs(prevRevenue)*100):null,
      grossMargin:round(gross),grossMarginPct:revenue?round(gross/revenue*100):null,orderBook:round(live.order_book),activeOrders:Number(live.active_orders),
      cash:round(balances.cash),workingCapital:round(Number(balances.ar)+Number(balances.inventory)-Number(balances.ap)),
      ar:round(balances.ar),ap:round(balances.ap),inventory:round(balances.inventory),productionProgressPct:round(live.production_progress),
      activeWorkOrders:Number(live.active_work_orders),qualityYieldPct:qcTotal?round(Number(summary.qc_passed_qty)/qcTotal*100):null,
      onTimeDeliveryPct:deliveryTotal?round(Number(summary.deliveries_on_time)/deliveryTotal*100):null},
    trend:fillMonths(p,trends),aging,funnel,customers,projects,actions,
    freshness:{materializedAt:refresh?.finished_at||null,rowCount:Number(refresh?.row_count||0),generatedAt:new Date().toISOString(),stale:!refresh?.finished_at||Date.now()-new Date(refresh.finished_at).getTime()>15*60_000},
    definitions:[
      {key:'revenue',label:'Pendapatan',formula:'Kredit − debit akun kategori REVENUE pada GL periode.',source:'journal_lines + chart_of_accounts'},
      {key:'grossMargin',label:'Margin kotor',formula:'Pendapatan GL − COGS GL.',source:'journal_lines + chart_of_accounts'},
      {key:'cash',label:'Kas & bank',formula:'Saldo kumulatif debit − kredit akun 1100 hingga akhir periode.',source:'journal_lines'},
      {key:'workingCapital',label:'Modal kerja',formula:'AR outstanding + nilai persediaan − AP outstanding.',source:'subledger + inventory_balances'},
      {key:'qualityYield',label:'Quality yield',formula:'Qty lulus ÷ (qty lulus + qty gagal).',source:'qc_inspections'},
      {key:'onTimeDelivery',label:'On-time delivery',formula:'Delivery selesai sebelum/saat due date ÷ delivery selesai.',source:'business_documents'}
    ]
  };
}

function fillMonths(p,rows){const map=new Map(rows.map(r=>[String(r.periodStart).slice(0,10),r])),out=[];const [y,m]=p.split('-').map(Number);for(let i=11;i>=0;i--){const d=new Date(Date.UTC(y,m-1-i,1)),key=d.toISOString().slice(0,10),r=map.get(key)||{};out.push({period:key,revenue:round(r.revenue),grossMargin:round(r.grossMargin),orderIntake:round(r.orderIntake),collections:round(r.collections)});}return out;}

async function listSchedules(client,user){const global=hasGlobalScope(user);return(await client.query(`SELECT s.*,b.code branch_code,b.name branch_name,u.display_name created_by_name
  FROM report_schedules s LEFT JOIN branches b ON b.id=s.branch_id JOIN app_users u ON u.id=s.created_by
  WHERE $1::boolean OR s.created_by=$2 OR s.branch_id=$3 ORDER BY s.enabled DESC,s.next_run_at`,[global,user.id,user.branchId])).rows.map(camel);}
async function createSchedule(client,body,user){const item=report(body.reportKey),frequency=String(body.frequency||'').toUpperCase(),format=String(body.format||'XLSX').toUpperCase();if(!['DAILY','WEEKLY','MONTHLY'].includes(frequency)||!['XLSX','PDF'].includes(format))throw new AppError('VALIDATION_ERROR','Frekuensi atau format laporan tidak valid.');const next=new Date(body.firstRunAt);if(Number.isNaN(next.getTime())||next<=new Date()||next.getTime()>Date.now()+366*86400000)throw new AppError('VALIDATION_ERROR','Jadwal pertama harus di masa depan dan maksimal 366 hari.');const scope=scopeFor(user,body.branchId||null),id=randomUUID(),name=String(body.name||item.title).trim().slice(0,120);if(!name)throw new AppError('VALIDATION_ERROR','Nama jadwal wajib diisi.');const row=(await client.query(`INSERT INTO report_schedules(id,name,report_key,format,frequency,branch_id,filters,next_run_at,created_by,updated_by)
  VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) RETURNING *`,[id,name,item.key,format,frequency,scope.global?null:scope.branchId,body.filters||{},next,user.id])).rows[0];return camel(row);}
async function updateSchedule(client,id,body,user){const current=(await client.query('SELECT * FROM report_schedules WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!current)throw new AppError('RESOURCE_NOT_FOUND');if(current.created_by!==user.id&&!hasGlobalScope(user))throw new AppError('PERMISSION_DENIED');if(Number(body.version)!==Number(current.version))throw new AppError('DOCUMENT_CONFLICT','Jadwal telah berubah. Segarkan data.');let next=current.next_run_at;if(body.nextRunAt){next=new Date(body.nextRunAt);if(Number.isNaN(next.getTime())||next<=new Date())throw new AppError('VALIDATION_ERROR','Eksekusi berikutnya harus di masa depan.');}const row=(await client.query(`UPDATE report_schedules SET enabled=COALESCE($2,enabled),next_run_at=$3,version=version+1,updated_by=$4,updated_at=now() WHERE id=$1 RETURNING *`,[id,body.enabled??null,next,user.id])).rows[0];return camel(row);}
async function listFilters(client,user){return(await client.query(`SELECT * FROM report_saved_filters WHERE created_by=$1 AND report_key='executive_cockpit' ORDER BY created_at DESC`,[user.id])).rows.map(camel);}
async function saveFilter(client,body,user){const name=String(body.name||'').trim().slice(0,100);if(!name)throw new AppError('VALIDATION_ERROR','Nama tampilan wajib diisi.');const p=period(body.filters?.period);const scope=scopeFor(user,body.filters?.branchId||null);const row=(await client.query(`INSERT INTO report_saved_filters(id,report_key,name,filters,created_by) VALUES($1,'executive_cockpit',$2,$3,$4)
  ON CONFLICT(created_by,report_key,name) DO UPDATE SET filters=excluded.filters,created_at=now() RETURNING *`,[randomUUID(),name,{period:p,branchId:scope.global?null:scope.branchId},user.id])).rows[0];return camel(row);}
async function deleteFilter(client,id,user){const result=await client.query(`DELETE FROM report_saved_filters WHERE id=$1 AND created_by=$2 RETURNING id`,[id,user.id]);if(!result.rowCount)throw new AppError('RESOURCE_NOT_FOUND');return{ok:true};}
async function refresh(client){const row=(await client.query('SELECT refresh_executive_reporting()::int rows')).rows[0];return{rows:Number(row.rows),refreshedAt:new Date().toISOString()};}

module.exports={REPORTS,report,period,scopeFor,scopedUser,cockpit,listSchedules,createSchedule,updateSchedule,listFilters,saveFilter,deleteFilter,refresh};
