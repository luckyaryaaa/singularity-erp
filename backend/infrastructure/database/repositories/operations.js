'use strict';
const {randomUUID}=require('node:crypto');const {AppError}=require('../../../core/errors');const permissions=require('../../../core/permissions');const {hasPermission}=permissions;const dataScope=require('../../../core/data-scope');const {camel}=require('./runtime');const masterGovernance=require('./master-governance');
const CATEGORIES=new Set(['ACTION_REQUIRED','WARNING','INFORMATION','SUCCESS','SYSTEM_ALERT']);
const JOBS={
  FILE_SCAN:{priority:'high',label:'Pemindaian keamanan file',permission:'job.create',roles:['*'],limit:5,timeoutSeconds:120,maxAttempts:2,maxRows:1,retentionDays:30,internalOnly:true},
  GENERATE_PDF:{priority:'medium',label:'Pembuatan PDF',permission:'job.create',roles:['*'],limit:3,timeoutSeconds:180,maxAttempts:3,maxRows:5000,retentionDays:30},
  PAYROLL_SLIPS:{priority:'medium',label:'Slip gaji massal',permission:'payroll.export',roles:['owner','hrd'],limit:1,timeoutSeconds:600,maxAttempts:2,maxRows:2000,retentionDays:14},
  EXPORT_EXCEL:{priority:'low',label:'Ekspor Excel',permission:'job.create',roles:['*'],limit:2,timeoutSeconds:300,maxAttempts:3,maxRows:5000,retentionDays:30},
  IMPORT_CSV:{priority:'low',label:'Impor CSV',permission:'job.create',roles:['owner','system_admin','finance_manager','accounting','hrd','sales','procurement','warehouse'],limit:1,timeoutSeconds:900,maxAttempts:3,maxRows:10000,retentionDays:30},
  REPORT_GENERATE:{priority:'medium',label:'Pembuatan laporan',permission:'report.export',roles:['owner','finance_manager','accounting','tax','hrd','sales','procurement','warehouse','production','auditor'],limit:2,timeoutSeconds:600,maxAttempts:3,maxRows:5000,retentionDays:30},
  NOTIFICATION_SEND:{priority:'high',label:'Pengiriman notifikasi',permission:'notification.create',roles:['owner','system_admin'],limit:5,timeoutSeconds:120,maxAttempts:5,maxRows:1000,retentionDays:7},
  BACKUP_RUN:{priority:'low',label:'Backup terjadwal',permission:'backup.create',roles:['owner'],limit:1,timeoutSeconds:3600,maxAttempts:2,maxRows:1,retentionDays:90,requiresMfa:true,requiresPin:true},
  RECONCILIATION:{priority:'low',label:'Rekonsiliasi besar',permission:'ledger.edit',roles:['owner','finance_manager','accounting'],limit:1,timeoutSeconds:900,maxAttempts:3,maxRows:10000,retentionDays:90}
};
const activeStatuses=['QUEUED','CLAIMED','RUNNING'];
function policyFor(type){const spec=JOBS[type];if(!spec)throw new AppError('VALIDATION_ERROR',`Tipe job '${type}' tidak dikenal.`);return spec;}
function authorizeJob(type,user,{system=false}={}){const spec=policyFor(type);if(system)return spec;if(spec.internalOnly)throw new AppError('PERMISSION_DENIED','Job internal tidak dapat dibuat dari API.');if(!user||!(spec.roles.includes('*')||spec.roles.includes(user.role)))throw new AppError('PERMISSION_DENIED',`Role tidak diizinkan menjalankan ${type}.`);if(spec.permission&&!hasPermission(user,spec.permission))throw new AppError('PERMISSION_DENIED',`Izin '${spec.permission}' dibutuhkan untuk ${type}.`);if(spec.requiresMfa&&!user.mfaActive)throw new AppError('PERMISSION_DENIED','MFA aktif dibutuhkan untuk job sensitif ini.');return spec;}

async function notify(client,{userId,role,category,title,body,link,dedupeKey,branchId=null}){
  const id=randomUUID();const result=await client.query(`INSERT INTO notifications(id,user_id,target_role,category,title,body,link,dedupe_key,branch_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING RETURNING *`,[id,userId||null,role||null,CATEGORIES.has(category)?category:'INFORMATION',title,body||'',link||null,dedupeKey||null,branchId]);
  return camel(result.rows[0]);
}

// P0-R: keterlihatan + status baca notifikasi.
// - Notifikasi bertarget role terlihat oleh seluruh pemegang role itu, tetapi
//   status bacanya PER PENGGUNA (notification_receipts). Sebelumnya satu
//   read_at dipakai bersama sehingga pemberitahuan lenyap bagi rekan lain
//   begitu satu orang membukanya.
// - branch_id NULL berarti seluruh perusahaan; selain itu hanya pengguna dalam
//   cakupan cabang yang melihatnya.
const NOTIF_VISIBLE = `(n.user_id=$1 OR n.target_role IN($2,'*'))
  AND (n.branch_id IS NULL OR $3::boolean OR n.branch_id=$4)`;
const notifArgs=(user)=>[user.id,user.role,permissions.CROSS_BRANCH_ROLES.includes(user.role)||user.branchScope==='*',user.branchId||null];

async function listNotifications(client,user,{limit=60}={}){
  return (await client.query(`SELECT n.*,(r.read_at IS NOT NULL) read_by_me,r.read_at read_at_me
    FROM notifications n LEFT JOIN notification_receipts r ON r.notification_id=n.id AND r.user_id=$1
    WHERE ${NOTIF_VISIBLE} ORDER BY n.created_at DESC LIMIT $5`,
  [...notifArgs(user),Math.min(limit,100)])).rows.map((row)=>({...camel(row),readAt:row.read_at_me}));
}
// Belum terbaca dan "menuntut tindakan" adalah dua hal berbeda: yang pertama
// sekadar belum dibuka, yang kedua adalah pekerjaan yang belum dikerjakan.
async function unreadCount(client,user){
  const row=(await client.query(`SELECT count(*)::int unread,
      count(*) FILTER(WHERE n.category='ACTION_REQUIRED')::int action_required
    FROM notifications n LEFT JOIN notification_receipts r ON r.notification_id=n.id AND r.user_id=$1
    WHERE r.notification_id IS NULL AND ${NOTIF_VISIBLE}`,notifArgs(user))).rows[0];
  return {unread:row.unread,actionRequired:row.action_required};
}
async function markRead(client,user,id){
  const visible=(await client.query(`SELECT n.id FROM notifications n WHERE n.id=$5 AND ${NOTIF_VISIBLE}`,[...notifArgs(user),id])).rows[0];
  if(!visible)return false;
  await client.query(`INSERT INTO notification_receipts(notification_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,[id,user.id]);
  return true;
}
async function markAllRead(client,user){
  return (await client.query(`INSERT INTO notification_receipts(notification_id,user_id)
    SELECT n.id,$1 FROM notifications n LEFT JOIN notification_receipts r ON r.notification_id=n.id AND r.user_id=$1
    WHERE r.notification_id IS NULL AND ${NOTIF_VISIBLE} ON CONFLICT DO NOTHING`,notifArgs(user))).rowCount;
}

async function enqueue(client,{type,user,params={},executionKey,system=false,pinVerified=false}){
  const spec=authorizeJob(type,user,{system});if(spec.requiresPin&&!system&&!pinVerified)throw new AppError('PIN_REQUIRED');
  if(type==='NOTIFICATION_SEND'&&params.webhook)throw new AppError('VALIDATION_ERROR','Kanal webhook outbound belum diaktifkan. Gunakan kanal in-app atau email.');
  const rows=Array.isArray(params.rows)?params.rows.length:Number(params.rowCount||0);if(rows>spec.maxRows)throw new AppError('VALIDATION_ERROR',`Maksimum ${spec.maxRows} baris untuk ${type}.`);
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`job:${user.id}:${type}`]);
  if(spec.limit){const active=Number((await client.query(`SELECT count(*) n FROM background_jobs WHERE requested_by=$1 AND job_type=$2 AND status=ANY($3::varchar[])`,[user.id,type,activeStatuses])).rows[0].n);if(active>=spec.limit)throw new AppError('JOB_LIMIT',`Maksimal ${spec.limit} job '${spec.label}' aktif.`);}
  const key=executionKey||params.executionKey||null,policy={permission:spec.permission,roles:spec.roles,maxRows:spec.maxRows,timeoutSeconds:spec.timeoutSeconds,retentionDays:spec.retentionDays,requiresMfa:!!spec.requiresMfa,requiresPin:!!spec.requiresPin,dataScope:dataScope.snapshot(user,params.dataScope)};
  const result=await client.query(`INSERT INTO background_jobs(id,job_type,label,priority,params,status,requested_by,execution_key,timeout_seconds,max_attempts,policy_snapshot,artifact_retention_days)
    VALUES($1,$2,$3,$4,$5,'QUEUED',$6,$7,$8,$9,$10,$11) ON CONFLICT(requested_by,job_type,execution_key) WHERE execution_key IS NOT NULL AND status NOT IN('FAILED','CANCELLED','DEAD_LETTER') DO NOTHING RETURNING *`,[randomUUID(),type,spec.label,spec.priority,params,user.id,key,spec.timeoutSeconds,spec.maxAttempts,policy,spec.retentionDays]);
  if(result.rows[0])return camel(result.rows[0]);
  return camel((await client.query(`SELECT * FROM background_jobs WHERE requested_by=$1 AND job_type=$2 AND execution_key=$3 AND status NOT IN('FAILED','CANCELLED','DEAD_LETTER') ORDER BY created_at DESC LIMIT 1`,[user.id,type,key])).rows[0]);
}
async function claim(client,workerId,{leaseSeconds=60}={}){
  const result=await client.query(`WITH candidate AS (SELECT id FROM background_jobs WHERE status='QUEUED' AND available_at<=now()
    ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,created_at FOR UPDATE SKIP LOCKED LIMIT 1)
    UPDATE background_jobs j SET status='CLAIMED',started_at=COALESCE(started_at,now()),attempts=attempts+1,
    lease_until=now()+($2||' seconds')::interval,worker_id=$1,heartbeat_at=now(),progress=GREATEST(progress,5)
    FROM candidate WHERE j.id=candidate.id RETURNING j.*`,[workerId,String(leaseSeconds)]);
  return camel(result.rows[0]);
}
async function startRunning(client,id,workerId){const row=(await client.query(`UPDATE background_jobs SET status='RUNNING',deadline_at=now()+(timeout_seconds||' seconds')::interval,progress=GREATEST(progress,10) WHERE id=$1 AND worker_id=$2 AND status='CLAIMED' RETURNING *`,[id,workerId])).rows[0];if(!row)throw new AppError('DOCUMENT_CONFLICT','Job tidak lagi dapat dimulai.');return camel(row);}
async function heartbeat(client,id,workerId,leaseSeconds=60){return (await client.query(`UPDATE background_jobs SET heartbeat_at=now(),lease_until=now()+($3||' seconds')::interval WHERE id=$1 AND worker_id=$2 AND status='RUNNING' AND cancel_requested_at IS NULL AND (deadline_at IS NULL OR deadline_at>now())`,[id,workerId,String(leaseSeconds)])).rowCount>0;}
async function complete(client,id,workerId,result){const row=(await client.query(`UPDATE background_jobs SET status='SUCCEEDED',progress=100,finished_at=now(),result=$3,lease_until=NULL,worker_id=NULL WHERE id=$1 AND worker_id=$2 AND status='RUNNING' AND cancel_requested_at IS NULL RETURNING *`,[id,workerId,result])).rows[0];if(!row)throw new AppError('DOCUMENT_CONFLICT','Job dibatalkan, timeout, atau tidak lagi dimiliki worker ini.');return camel(row);}
async function fail(client,id,workerId,error){const row=(await client.query(`UPDATE background_jobs SET status=CASE WHEN cancel_requested_at IS NOT NULL THEN 'CANCELLED' WHEN attempts<max_attempts THEN 'QUEUED' ELSE 'DEAD_LETTER' END,error=$3,
    available_at=CASE WHEN cancel_requested_at IS NULL AND attempts<max_attempts THEN now()+(power(2,attempts)*interval '10 seconds') ELSE available_at END,
    finished_at=CASE WHEN cancel_requested_at IS NOT NULL OR attempts>=max_attempts THEN now() ELSE NULL END,lease_until=NULL,worker_id=NULL WHERE id=$1 AND worker_id=$2 RETURNING *`,[id,workerId,String(error).slice(0,2000)])).rows[0];return camel(row);}
async function recoverExpired(client){return (await client.query(`UPDATE background_jobs SET status=CASE WHEN attempts<max_attempts THEN 'QUEUED' ELSE 'DEAD_LETTER' END,worker_id=NULL,lease_until=NULL,error=CASE WHEN deadline_at<=now() THEN 'Job timeout' ELSE 'Worker lease expired' END,finished_at=CASE WHEN attempts>=max_attempts THEN now() ELSE NULL END WHERE status IN('CLAIMED','RUNNING') AND (lease_until<now() OR deadline_at<=now())`)).rowCount;}
async function requestCancel(client,id,user,reason){if(!reason)throw new AppError('REASON_REQUIRED');const elevated=['owner','system_admin'].includes(user.role),row=(await client.query(`UPDATE background_jobs SET cancel_requested_at=now(),cancel_reason=$4,status=CASE WHEN status='QUEUED' THEN 'CANCELLED' ELSE status END,finished_at=CASE WHEN status='QUEUED' THEN now() ELSE finished_at END WHERE id=$1 AND ($2::boolean OR requested_by=$3) AND status IN('QUEUED','CLAIMED','RUNNING') RETURNING *`,[id,elevated,user.id,String(reason).slice(0,500)])).rows[0];if(!row)throw new AppError('RESOURCE_NOT_FOUND','Job tidak ditemukan atau sudah final.');return camel(row);}
async function retry(client,id,user,reason){if(!reason)throw new AppError('REASON_REQUIRED');const elevated=['owner','system_admin'].includes(user.role),row=(await client.query(`UPDATE background_jobs SET status='QUEUED',available_at=now(),finished_at=NULL,error=NULL,cancel_requested_at=NULL,cancel_reason=NULL,worker_id=NULL,lease_until=NULL,progress=0 WHERE id=$1 AND ($2::boolean OR requested_by=$3) AND status IN('FAILED','DEAD_LETTER','CANCELLED') RETURNING *`,[id,elevated,user.id])).rows[0];if(!row)throw new AppError('RESOURCE_NOT_FOUND','Job gagal/cancel tidak ditemukan.');return camel(row);}
async function cancellationRequested(client,id,workerId){const row=(await client.query(`SELECT cancel_requested_at,deadline_at FROM background_jobs WHERE id=$1 AND worker_id=$2`,[id,workerId])).rows[0];return !row||!!row.cancel_requested_at||(row.deadline_at&&new Date(row.deadline_at)<=new Date());}
async function listJobs(client,user,{page=1,limit=25}={}){limit=Math.min(Math.max(Number(limit)||25,1),100);page=Math.max(Number(page)||1,1);const owner=['owner','system_admin'].includes(user.role),params=[];let scope='TRUE';if(!owner){params.push(user.id);scope=`j.requested_by=$${params.length}`;}const total=Number((await client.query(`SELECT count(*) n FROM background_jobs j WHERE ${scope}`,params)).rows[0].n);params.push(limit,(page-1)*limit);const items=(await client.query(`SELECT j.*,j.job_type type,u.display_name requested_by_name FROM background_jobs j JOIN app_users u ON u.id=j.requested_by WHERE ${scope} ORDER BY j.created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`,params)).rows.map(camel);return{items,page,limit,total,totalPages:Math.max(Math.ceil(total/limit),1)};}

const MASTER={customers:{table:'customers',search:['code','name','city'],sort:new Set(['code','name','city','created_at'])},suppliers:{table:'suppliers',search:['code','name','category'],sort:new Set(['code','name','category','created_at'])},products:{table:'products',search:['code','name','uom'],sort:new Set(['code','name','created_at'])},employees:{table:'employees',search:['nik','name','department','job_title'],sort:new Set(['nik','name','department','join_date'])}};
const MASTER_FIELDS={
  customers:['code','name','customer_type','legal_name','npwp','ppn_status','business_category','city','address','website','payment_term_days','credit_limit','risk_rating','customer_since','assigned_sales','currency','credit_hold','collection_status','tax_treatment','effective_from','effective_to','active'],
  suppliers:['code','name','supplier_type','legal_name','npwp','category','rating','ppn_treatment','pph_treatment','withholding_eligible','onboarding_status','risk_level','coi_declared','effective_from','effective_to','active'],
  products:['code','name','product_type','category','material_type','grade','specification','dimensions','weight_kg','drawing_number','drawing_revision','uom','hpp','price','make_or_buy','is_stock','serial_required','lot_required','inspection_required','parent_product_id','variant_attributes','effective_from','effective_to','active'],
  employees:['nik','name','department','job_title','base_salary','branch_id','bpjs','join_date','effective_from','effective_to','active']
};
const snake=value=>value.replace(/[A-Z]/g,c=>`_${c.toLowerCase()}`);
async function createMaster(client,name,body,user){const fields=MASTER_FIELDS[name];if(!fields)throw new AppError('RESOURCE_NOT_FOUND');await masterGovernance.validateMaster(client,name,body);const entries=Object.entries(body||{}).map(([k,v])=>[snake(k),v]).filter(([k,v])=>fields.includes(k)&&v!==undefined&&v!=='');if(!entries.length)throw new AppError('VALIDATION_ERROR','Data master kosong.');const columns=['id',...entries.map(x=>x[0])],values=[randomUUID(),...entries.map(x=>x[1])];if(['customers','suppliers'].includes(name)){columns.push('created_by','updated_by');values.push(user.id,user.id);}const params=values.map((_,i)=>`$${i+1}`);const row=(await client.query(`INSERT INTO ${name}(${columns.join(',')}) VALUES(${params.join(',')}) RETURNING *`,values)).rows[0];await masterGovernance.refreshQuality(client,name,row.id);return camel((await client.query(`SELECT * FROM ${name} WHERE id=$1`,[row.id])).rows[0]);}
async function updateMaster(client,name,id,body,user){const fields=MASTER_FIELDS[name];if(!fields)throw new AppError('RESOURCE_NOT_FOUND');await masterGovernance.validateMaster(client,name,body,id);const entries=Object.entries(body||{}).map(([k,v])=>[snake(k),v]).filter(([k,v])=>fields.includes(k)&&v!==undefined);if(!entries.length)throw new AppError('VALIDATION_ERROR','Tidak ada perubahan valid.');const values=[id],sets=entries.map(([k,v])=>{values.push(v===''?null:v);return`${k}=$${values.length}`;});sets.push('updated_at=now()');if(['customers','suppliers'].includes(name)){values.push(user.id);sets.push(`updated_by=$${values.length}`);}const row=(await client.query(`UPDATE ${name} SET ${sets.join(',')} WHERE id=$1 RETURNING *`,values)).rows[0];if(!row)throw new AppError('RESOURCE_NOT_FOUND');await masterGovernance.refreshQuality(client,name,id);return camel((await client.query(`SELECT * FROM ${name} WHERE id=$1`,[id])).rows[0]);}
async function listMaster(client,name,query={}){const cfg=MASTER[name];if(!cfg)throw new AppError('RESOURCE_NOT_FOUND');const limit=Math.min(Math.max(Number(query.limit)||25,1),100),page=Math.max(Number(query.page)||1,1),params=[];let where='TRUE';if(query.q){params.push(`%${String(query.q).slice(0,120)}%`);where='('+cfg.search.map(c=>`${c} ILIKE $1`).join(' OR ')+')';}const sort=cfg.sort.has(query.sortKey)?query.sortKey:name==='employees'?'name':'code',dir=query.sortDir==='desc'?'DESC':'ASC';params.push(limit,(page-1)*limit);const li=params.length-1,off=params.length;const from=name==='employees'?'employees m LEFT JOIN branches b ON b.id=m.branch_id':`${cfg.table} m`;const select=name==='employees'?'m.*,b.name branch_name':'m.*';const qualifiedWhere=where.replace(/\b(code|name|city|category|uom|nik|department|job_title)\b/g,'m.$1');const items=(await client.query(`SELECT ${select} FROM ${from} WHERE ${qualifiedWhere} ORDER BY m.${sort} ${dir} LIMIT $${li} OFFSET $${off}`,params)).rows.map(camel);const total=Number((await client.query(`SELECT count(*) n FROM ${from} WHERE ${qualifiedWhere}`,query.q?[params[0]]:[])).rows[0].n);
  // Faset kategori dilampirkan pada daftar produk (dipakai pemilih cakupan
  // stock opname) supaya tidak perlu endpoint terpisah dan tidak terpotong
  // paginasi.
  const facets=name==='products'?{categories:(await client.query(`SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category<>'' ORDER BY category LIMIT 200`)).rows.map(r=>r.category)}:undefined;
  return{items,page,limit,total,totalPages:Math.max(Math.ceil(total/limit),1),...(facets?{facets}:{})};}
async function listInventory(client,user,{page=1,limit=25,q}={}){limit=Math.min(Math.max(Number(limit)||25,1),100);page=Math.max(Number(page)||1,1);const params=[];let where='TRUE';if(!['owner','admin'].includes(user.role)&&user.branchScope!=='*'){params.push(user.branchId);where+=` AND i.warehouse_id=$${params.length}`;}if(q){params.push(`%${String(q).slice(0,120)}%`);where+=` AND (p.code ILIKE $${params.length} OR p.name ILIKE $${params.length})`;}const total=Number((await client.query(`SELECT count(*) n FROM inventory_balances i JOIN products p ON p.id=i.product_id WHERE ${where}`,params)).rows[0].n);params.push(limit,(page-1)*limit);const items=(await client.query(`SELECT i.*,p.code product_code,p.name product_name,p.uom,b.code warehouse_code,b.name warehouse_name FROM inventory_balances i JOIN products p ON p.id=i.product_id JOIN branches b ON b.id=i.warehouse_id WHERE ${where} ORDER BY p.code LIMIT $${params.length-1} OFFSET $${params.length}`,params)).rows.map(camel);return{items,page,limit,total,totalPages:Math.max(Math.ceil(total/limit),1)};}

module.exports={notify,listNotifications,unreadCount,markRead,markAllRead,enqueue,claim,startRunning,heartbeat,complete,fail,recoverExpired,requestCancel,retry,cancellationRequested,listJobs,listMaster,createMaster,updateMaster,listInventory,JOBS,policyFor,authorizeJob,activeStatuses};
