'use strict';
const { assertPermission, hasPermission } = require('../core/permissions');
const { readBody } = require('../core/util');
const runtime = require('../infrastructure/database/repositories/runtime');
const accountingConfig = require('../infrastructure/database/repositories/accounting-config');
const workItems = require('../infrastructure/database/repositories/work-items');
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

// P1-1 — read model dashboard.
//
// Sebelumnya dashboard menarik SELURUH baris business_documents yang terlihat
// (SELECT *, termasuk payload jsonb selebar ~2 KB per baris) lalu memfilter,
// menjumlah, dan mengurutkannya di memori Node. Biayanya tumbuh linear terhadap
// seluruh riwayat perusahaan — pada 100 ribu dokumen itu ratusan MB ditarik
// setiap kali halaman dibuka, hanya untuk menghasilkan belasan angka.
//
// Agregasi kini dikerjakan database. Kolom yang ditarik hanya yang dipakai, dan
// daftar pekerjaan aktif dibatasi LIMIT 8 di SQL, bukan slice setelah semuanya
// terlanjur ditarik. Bukan engine kedua — tetap query biasa lewat client yang
// sama, tanpa materialized view baru.

// Tanggal invoice yang dipakai bisnis: payload.invoiceDate bila ada, kalau
// tidak tanggal dibuatnya. Dinormalkan ke zona waktu bisnis (lihat
// core/business-date) supaya cocok dengan current_date database.
const INVOICE_DATE = `COALESCE(NULLIF(d.payload->>'invoiceDate','')::date, (d.created_at AT TIME ZONE current_setting('TimeZone'))::date)`;
const PAID = `COALESCE(NULLIF(d.payload->>'paid','')::numeric,0)`;
const ACTIVE_ORDER = `d.document_type IN('WORK_ORDER','SALES_ORDER','PROJECT')
  AND d.status IN('WAITING_APPROVAL','APPROVED','IN_PROCESS','PARTIALLY_COMPLETED')`;

async function dashboard(client, user) {
  assertPermission(user,'dashboard.view');
  const grants=entitlementsFor(user);
  const global=['owner','admin'].includes(user.role)||user.branchScope==='*';
  const scope=[global,user.branchId];                       // $1 global, $2 branch
  const SCOPE = `d.is_archived=false AND ($1::boolean OR d.branch_id=$2)`;

  // Satu lintasan untuk seluruh angka pesanan aktif — tidak perlu menarik baris.
  const orders=(await client.query(`SELECT
      count(*)::int active_orders,
      COALESCE(sum(d.amount),0)::float order_book,
      count(*) FILTER(WHERE d.status='IN_PROCESS')::int in_production,
      COALESCE(avg(COALESCE(NULLIF(d.payload->>'progress','')::numeric,0))
        FILTER(WHERE d.status='IN_PROCESS'),0)::float progress
    FROM business_documents d WHERE ${SCOPE} AND ${ACTIVE_ORDER}`,scope)).rows[0];

  const kpi={activeOrders:orders.active_orders,inProduction:orders.in_production,
    utilizationPct:Math.round(orders.progress),utilizationTarget:82};
  const health={orderCount:orders.active_orders,orderBook:orders.order_book};

  let revenueSeries=[];
  if(grants.revenue){
    // Bulan berjalan + bulan sebelumnya + AR terbuka/jatuh tempo sekaligus.
    const rev=(await client.query(`WITH inv AS (
        SELECT d.amount,d.status,${PAID} paid,${INVOICE_DATE} invoice_date
        FROM business_documents d
        WHERE ${SCOPE} AND d.document_type='INVOICE' AND d.status NOT IN('DRAFT','VOID','CANCELLED')
      ) SELECT
        COALESCE(sum(amount) FILTER(WHERE date_trunc('month',invoice_date)=date_trunc('month',current_date)),0)::float revenue_month,
        COALESCE(sum(amount) FILTER(WHERE date_trunc('month',invoice_date)=date_trunc('month',current_date-interval '1 month')),0)::float revenue_prev,
        COALESCE(sum(amount-paid) FILTER(WHERE status='OVERDUE'),0)::float ar_overdue,
        count(*) FILTER(WHERE status='OVERDUE')::int ar_overdue_count,
        COALESCE(sum(amount-paid) FILTER(WHERE status<>'CLOSED'),0)::float ar_total,
        count(*) FILTER(WHERE status<>'CLOSED')::int ar_count
      FROM inv`,scope)).rows[0];
    const prev=Number(rev.revenue_prev);
    Object.assign(kpi,{revenueMonth:rev.revenue_month,revenuePrevMonth:prev,
      revenueGrowthPct:prev>0?Math.round((rev.revenue_month-prev)/prev*1000)/10:null,
      arOverdue:rev.ar_overdue,arOverdueCount:rev.ar_overdue_count});
    Object.assign(health,{arCount:rev.ar_count,arTotal:rev.ar_total});

    // Seri kumulatif harian dihitung window function, bukan Map di Node.
    // "day" WAJIB pakai AS: tanpa itu parser membacanya sebagai kualifier
    // interval, bukan alias kolom, dan query gagal dengan syntax error.
    revenueSeries=(await client.query(`SELECT to_char(s.inv_day,'DD') AS day,
        sum(s.total) OVER(ORDER BY s.inv_day)::float AS value FROM (
        SELECT ${INVOICE_DATE} inv_day,sum(d.amount) total FROM business_documents d
        WHERE ${SCOPE} AND d.document_type='INVOICE' AND d.status NOT IN('DRAFT','VOID','CANCELLED')
          AND date_trunc('month',${INVOICE_DATE})=date_trunc('month',current_date)
        GROUP BY 1) s ORDER BY s.inv_day`,scope)).rows.map(r=>({day:r.day,value:r.value}));
    if(!revenueSeries.length)revenueSeries.push({day:'01',value:0});
  }

  if(grants.payable){
    const ap=(await client.query(`SELECT count(*)::int ap_count,COALESCE(sum(d.amount),0)::float ap_total
      FROM business_documents d WHERE ${SCOPE} AND d.document_type='SUPPLIER_INVOICE'
        AND d.status NOT IN('CLOSED','VOID','CANCELLED')`,scope)).rows[0];
    Object.assign(health,{apCount:ap.ap_count,apTotal:ap.ap_total});
  }

  // Persediaan wajib ter-scope cabang seperti dokumen; sebelumnya agregat ini
  // tanpa filter sehingga pengguna cabang melihat nilai stok seluruh perusahaan.
  if(grants.inventory){
    const inv=(await client.query(`SELECT count(*)::int sku_count,COALESCE(sum(value_idr),0)::float value,
        count(*) FILTER(WHERE qty_on_hand<min_qty)::int critical
      FROM inventory_balances WHERE ($1::boolean OR warehouse_id=$2)`,scope)).rows[0];
    Object.assign(health,{skuCount:inv.sku_count,criticalStock:inv.critical,inventoryValue:inv.value});
  }
  if(grants.cash)health.cashPosition=await cashOnHand(client,{global,branchId:user.branchId});

  // Daftar pekerjaan aktif dibatasi di SQL — dulu seluruh dokumen ditarik lalu
  // di-slice(0,8) di Node.
  const activeJobs=(await client.query(`SELECT d.id,d.document_number,d.title,d.party_name,d.amount,d.due_date,d.status,
      COALESCE(NULLIF(d.payload->>'progress','')::numeric,0)::float progress,
      COALESCE(NULLIF(d.payload->>'stage',''),d.status::text) AS stage
    FROM business_documents d WHERE ${SCOPE} AND ${ACTIVE_ORDER}
    ORDER BY d.updated_at DESC LIMIT 8`,scope)).rows;

  // Pipeline order-to-cash: dokumen aktif per tahap (data ERP nyata, ter-scope).
  const pm=Object.fromEntries((await client.query(`SELECT d.document_type dt, count(*)::int c
    FROM business_documents d WHERE ${SCOPE} AND d.status NOT IN('VOID','CANCELLED','CLOSED','REJECTED','DRAFT')
    GROUP BY d.document_type`,scope)).rows.map(r=>[r.dt,r.c]));
  const pipeline=[
    {stage:'quotation',label:'Penawaran',count:pm.QUOTATION||0},
    {stage:'sales_order',label:'Sales order',count:pm.SALES_ORDER||0},
    {stage:'work_order',label:'Work order',count:pm.WORK_ORDER||0},
    {stage:'production',label:'Produksi',count:kpi.inProduction||0},
    {stage:'delivery',label:'Pengiriman',count:(pm.DELIVERY_ORDER||0)+(pm.DELIVERY||0)},
    {stage:'invoice',label:'Invoice',count:pm.INVOICE||0},
    {stage:'payment',label:'Pembayaran',count:(pm.RECEIPT||0)+(pm.PAYMENT||0)}
  ];
  // Headcount tenaga kerja (data ERP nyata, ter-scope cabang).
  const wf=(await client.query(`SELECT count(*)::int total, count(*) FILTER(WHERE active)::int active
    FROM employees WHERE ($1::boolean OR branch_id=$2)`,scope)).rows[0];
  const workforce={total:wf.total,active:wf.active};

  // Aktivitas terbaru dari jejak audit — ter-scope tenant via RLS + cabang.
  const recentActivity=(await client.query(`SELECT a.occurred_at, a.action, a.module, a.entity_type, a.document_number,
      COALESCE(u.display_name,u.username,'Sistem') AS actor
    FROM audit_logs a LEFT JOIN app_users u ON u.id=a.user_id
    WHERE ($1::boolean OR a.branch_id=$2)
    ORDER BY a.occurred_at DESC LIMIT 6`,scope)).rows.map(r=>({actor:r.actor,action:r.action,
      module:r.module,entityType:r.entity_type,documentNumber:r.document_number,at:r.occurred_at}));

  const pending=await runtime.pendingApprovals(client,user,{limit:100});
  return {asOf:new Date().toISOString(),scope:global?'ALL':user.branchId,entitlements:grants,kpi,pipeline,workforce,recentActivity,
    attention:{pendingApprovals:pending.total,pendingAmount:pending.items.reduce((s,d)=>s+d.amount,0),slaRisk:pending.items.filter(d=>d.risk==='high').length},
    health,revenueSeries:grants.revenue?revenueSeries:[],
    activeJobs:activeJobs.map(d=>({id:d.id,documentNumber:d.document_number,title:d.title,party:d.party_name,
      progress:Number(d.progress),amount:Number(d.amount),dueDate:d.due_date,status:d.status,stage:d.stage}))};
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
    const workItemsInbox=await workItems.myWork(client,ctx.user);
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
      workItems:workItemsInbox,
      generatedAt:new Date().toISOString()
    };
  }
  if(method==='GET'&&p==='/api/approvals'){assertPermission(ctx.user,'approval.view');return runtime.pendingApprovals(client,ctx.user,Object.fromEntries(url.searchParams));}

  // Unified Work Item engine (migrasi 077) — §4.4/§5.2. Guard 'dashboard.view'
  // (autentikasi); kepemilikan dan scope cabang ditegakkan di repository.
  if(method==='GET'&&p==='/api/work-items'){assertPermission(ctx.user,'dashboard.view');
    return workItems.listWorkItems(client,ctx.user,Object.fromEntries(url.searchParams));}
  if(method==='POST'&&p==='/api/work-items'){assertPermission(ctx.user,'dashboard.view');const body=await readBody(req);
    const result=await runtime.withIdempotency(client,{userId:ctx.user.id,operation:'workspace.work-item.create',key:req.headers['idempotency-key'],body},
      async()=>({status:201,body:await workItems.createWorkItem(client,body,ctx.user,ctx.requestId)}));
    ctx.status=result.status;return result.body;}
  let m=p.match(/^\/api\/work-items\/([0-9a-f-]{36})\/(claim|start|return|hold|cancel|delegate|escalate)$/);
  if(method==='POST'&&m){assertPermission(ctx.user,'dashboard.view');const body=await readBody(req);
    const fn={claim:'claimItem',start:'startItem',return:'returnItem',hold:'holdItem',cancel:'cancelItem',delegate:'delegateItem',escalate:'escalateItem'}[m[2]];
    return workItems[fn](client,{id:m[1],expectedVersion:Number(body.version),reason:body.reason,toUserId:body.toUserId,user:ctx.user,requestId:ctx.requestId});}
  m=p.match(/^\/api\/work-items\/([0-9a-f-]{36})\/complete$/);
  if(method==='POST'&&m){assertPermission(ctx.user,'dashboard.view');const body=await readBody(req);
    const result=await runtime.withIdempotency(client,{userId:ctx.user.id,operation:`workspace.work-item.complete:${m[1]}`,key:req.headers['idempotency-key'],body},
      async()=>({status:200,body:await workItems.completeItem(client,{id:m[1],expectedVersion:Number(body.version),note:body.note,evidence:body.evidence,user:ctx.user,requestId:ctx.requestId})}));
    ctx.status=result.status;return result.body;}
return NO_MATCH;}
module.exports={dispatch};
