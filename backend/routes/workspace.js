'use strict';
const { assertPermission, hasPermission } = require('../core/permissions');
const runtime = require('../infrastructure/database/repositories/runtime');
const accountingConfig = require('../infrastructure/database/repositories/accounting-config');
const { NO_MATCH } = require('./shared');

// P0-P — entitlement per kartu. `dashboard.view` hanya membuka halamannya;
// setiap kelompok angka menuntut izin modul asalnya. Data yang tidak berhak
// DIHILANGKAN dari respons, bukan sekadar disembunyikan di frontend.
const DASHBOARD_CARDS = {
  revenue: 'invoice.view',      // omzet, seri pendapatan, AR
  payable: 'supplier_invoice.view',
  cash: 'ledger.view',
  inventory: 'inventory.view',
  orders: 'sales_order.view',
  approvals: 'approval.view'
};
const entitlementsFor = (user) => Object.fromEntries(Object.entries(DASHBOARD_CARDS).map(([card, code]) => [card, hasPermission(user, code)]));

async function dashboard(client, user) {
  assertPermission(user,'dashboard.view');
  const grants=entitlementsFor(user);
  const global=['owner','admin'].includes(user.role)||user.branchScope==='*';
  const docs=(await client.query(`SELECT * FROM business_documents WHERE is_archived=false AND ($1::boolean OR branch_id=$2) ORDER BY updated_at DESC`,[global,user.branchId])).rows.map(runtime.camel);
  const invoices=docs.filter(d=>d.documentType==='INVOICE'&&!['DRAFT','VOID','CANCELLED'].includes(d.status)),month=new Date().toISOString().slice(0,7);
  const monthOf=(d)=>String(d.payload?.invoiceDate||d.createdAt).slice(0,7);
  const monthInvoices=invoices.filter(d=>monthOf(d)===month),revenueMonth=monthInvoices.reduce((s,d)=>s+d.amount,0);
  // Pertumbuhan dibandingkan bulan kalender sebelumnya — dulu di-hardcode 0
  // sehingga kartu selalu menampilkan angka yang tidak pernah benar.
  const prevKey=(()=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-1);return d.toISOString().slice(0,7);})();
  const revenuePrevMonth=invoices.filter(d=>monthOf(d)===prevKey).reduce((s,d)=>s+d.amount,0);
  const revenueGrowthPct=revenuePrevMonth>0?Math.round((revenueMonth-revenuePrevMonth)/revenuePrevMonth*1000)/10:null;
  const overdue=invoices.filter(d=>d.status==='OVERDUE'),open=invoices.filter(d=>d.status!=='CLOSED'),supplier=docs.filter(d=>d.documentType==='SUPPLIER_INVOICE'&&!['CLOSED','VOID','CANCELLED'].includes(d.status));
  const active=docs.filter(d=>['WORK_ORDER','SALES_ORDER','PROJECT'].includes(d.documentType)&&['WAITING_APPROVAL','APPROVED','IN_PROCESS','PARTIALLY_COMPLETED'].includes(d.status)),inProduction=active.filter(d=>d.status==='IN_PROCESS');
  // Persediaan wajib ter-scope cabang seperti dokumen; sebelumnya agregat ini
  // tanpa filter sehingga pengguna cabang melihat nilai stok seluruh perusahaan.
  const inventory=grants.inventory
    ?(await client.query(`SELECT count(*)::int sku_count,COALESCE(sum(value_idr),0)::float value,count(*) FILTER(WHERE qty_on_hand<min_qty)::int critical
      FROM inventory_balances WHERE ($1::boolean OR warehouse_id=$2)`,[global,user.branchId])).rows[0]
    :null;
  const cashPosition=grants.cash?await cashOnHand(client,{global,branchId:user.branchId}):null;
  const pending=await runtime.pendingApprovals(client,user,{limit:100}),daily=new Map();for(const d of monthInvoices){const day=String(d.payload?.invoiceDate||d.createdAt).slice(8,10);daily.set(day,(daily.get(day)||0)+d.amount);}let cumulative=0;const revenueSeries=[...daily.entries()].sort().map(([day,value])=>({day,value:(cumulative+=value)}));if(!revenueSeries.length)revenueSeries.push({day:'01',value:0});
  const kpi={activeOrders:active.length,inProduction:inProduction.length,utilizationPct:inProduction.length?Math.round(inProduction.reduce((s,d)=>s+Number(d.payload?.progress||0),0)/inProduction.length):0,utilizationTarget:82};
  if(grants.revenue)Object.assign(kpi,{revenueMonth,revenuePrevMonth,revenueGrowthPct,arOverdue:overdue.reduce((s,d)=>s+d.amount-Number(d.payload?.paid||0),0),arOverdueCount:overdue.length});
  const health={orderCount:active.length,orderBook:active.reduce((s,d)=>s+d.amount,0)};
  if(grants.revenue)Object.assign(health,{arCount:open.length,arTotal:open.reduce((s,d)=>s+d.amount-Number(d.payload?.paid||0),0)});
  if(grants.payable)Object.assign(health,{apCount:supplier.length,apTotal:supplier.reduce((s,d)=>s+d.amount,0)});
  if(grants.inventory)Object.assign(health,{skuCount:inventory.sku_count,criticalStock:inventory.critical,inventoryValue:inventory.value});
  if(grants.cash)health.cashPosition=cashPosition;
  return {asOf:new Date().toISOString(),scope:global?'ALL':user.branchId,entitlements:grants,kpi,
    attention:{pendingApprovals:pending.total,pendingAmount:pending.items.reduce((s,d)=>s+d.amount,0),slaRisk:pending.items.filter(d=>d.risk==='high').length},
    health,revenueSeries:grants.revenue?revenueSeries:[],
    activeJobs:active.slice(0,8).map(d=>({id:d.id,documentNumber:d.documentNumber,title:d.title,party:d.partyName,progress:Number(d.payload?.progress||0),amount:d.amount,dueDate:d.dueDate,status:d.status,stage:d.payload?.stage||d.status}))};
}

// Posisi kas dihitung dari buku besar lewat peran akun CASH_BANK (bukan kode
// akun ter-hardcode). Bila peran belum dipetakan, nilainya null — "belum
// dikonfigurasi" jujur, bukan nol yang menyesatkan.
async function cashOnHand(client,{global,branchId}){
  let code;
  try{ ({CASH_BANK:code}=await accountingConfig.accountCodes(client,['CASH_BANK'])); }
  catch{ return null; }
  const row=(await client.query(`SELECT COALESCE(SUM(l.debit-l.credit),0)::float balance
    FROM journal_lines l
    JOIN chart_of_accounts a ON a.id=l.account_id
    JOIN business_documents j ON j.id=l.journal_document_id
    WHERE a.code LIKE $1||'%' AND j.status NOT IN('DRAFT','CANCELLED','VOID','REJECTED')
      AND ($2::boolean OR j.branch_id=$3)`,[code,global,branchId])).rows[0];
  return Math.round(Number(row.balance)*100)/100;
}

async function dispatch(client,req,url,ctx){const p=url.pathname,method=req.method;
  if(method==='GET'&&p==='/api/dashboard')return dashboard(client,ctx.user);
  if(method==='GET'&&p==='/api/my-work'){
    assertPermission(ctx.user,'dashboard.view');
    const scopeAll=['owner','admin','system_admin'].includes(ctx.user.role)||ctx.user.branchScope==='*';
    const approvals=await runtime.pendingApprovals(client,ctx.user,{limit:5});
    const q=async(sql,params)=>(await client.query(sql,params)).rows.map(runtime.camel);
    const mine=await q(`SELECT id,document_number,document_type,title,status,amount,due_date,updated_at FROM business_documents
      WHERE created_by=$1 AND status IN('DRAFT','WAITING_APPROVAL','SUBMITTED') AND NOT is_archived ORDER BY updated_at DESC LIMIT 5`,[ctx.user.id]);
    const revision=await q(`SELECT id,document_number,document_type,title,status,amount,updated_at FROM business_documents
      WHERE created_by=$1 AND status='REVISION_REQUIRED' AND NOT is_archived ORDER BY updated_at DESC LIMIT 5`,[ctx.user.id]);
    const overdue=await q(`SELECT id,document_number,document_type,title,status,amount,due_date FROM business_documents
      WHERE due_date<current_date AND status IN('APPROVED','IN_PROCESS','PARTIALLY_COMPLETED','PARTIALLY_PAID','OVERDUE')
      AND ($1 OR branch_id=$2) AND NOT is_archived ORDER BY due_date ASC LIMIT 5`,[scopeAll,ctx.user.branchId]);
    const failedJobs=await q(`SELECT id,job_type,label,status,error,created_at FROM background_jobs
      WHERE status IN('FAILED','DEAD_LETTER') AND ($1 OR requested_by=$2) ORDER BY created_at DESC LIMIT 5`,[scopeAll,ctx.user.id]);
    const actions=await q(`SELECT id,title,body,link,created_at FROM notifications
      WHERE category='ACTION_REQUIRED' AND read_at IS NULL AND (user_id=$1 OR target_role IN($2,'*')) ORDER BY created_at DESC LIMIT 5`,[ctx.user.id,ctx.user.role]);
    const count=async(sql,params)=>Number((await client.query(sql,params)).rows[0].n);
    return{
      waitingForMe:{items:approvals.items,total:approvals.total},
      createdByMe:{items:mine,total:await count(`SELECT count(*) n FROM business_documents WHERE created_by=$1 AND status IN('DRAFT','WAITING_APPROVAL','SUBMITTED') AND NOT is_archived`,[ctx.user.id])},
      returnedForRevision:{items:revision,total:revision.length},
      overdue:{items:overdue,total:await count(`SELECT count(*) n FROM business_documents WHERE due_date<current_date AND status IN('APPROVED','IN_PROCESS','PARTIALLY_COMPLETED','PARTIALLY_PAID','OVERDUE') AND ($1 OR branch_id=$2) AND NOT is_archived`,[scopeAll,ctx.user.branchId])},
      failedJobs:{items:failedJobs,total:failedJobs.length},
      actionRequired:{items:actions,total:actions.length},
      generatedAt:new Date().toISOString()
    };
  }
  if(method==='GET'&&p==='/api/approvals'){assertPermission(ctx.user,'approval.view');return runtime.pendingApprovals(client,ctx.user,Object.fromEntries(url.searchParams));}
return NO_MATCH;}
module.exports={dispatch};
