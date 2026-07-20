'use strict';
const { randomUUID } = require('node:crypto');
const { withTransaction } = require('../infrastructure/database/transaction');
const jobs = require('../infrastructure/database/repositories/operations');
const artifacts = require('../infrastructure/files/artifact-storage');
const backup = require('../infrastructure/database/backup');
const privateStorage = require('../infrastructure/files/private-storage');
const businessOps = require('../infrastructure/database/repositories/business-operations');
const reporting = require('../infrastructure/database/repositories/reporting');
const { hasGlobalScope } = require('../core/data-scope');
const {parse:parseCsv}=require('../core/csv');
async function scheduleBackup(client){if(process.env.MAT_BACKUP_SCHEDULE_ENABLED==='0')return false;const active=Number((await client.query(`SELECT count(*) n FROM background_jobs WHERE job_type='BACKUP_RUN' AND status=ANY($1::varchar[])`,[jobs.activeStatuses])).rows[0].n);if(active)return false;const latest=(await client.query(`SELECT finished_at FROM backup_runs WHERE status='COMPLETED' ORDER BY finished_at DESC LIMIT 1`)).rows[0],hours=Math.min(Math.max(Number(process.env.MAT_BACKUP_INTERVAL_HOURS)||24,1),168);if(latest&&Date.now()-new Date(latest.finished_at).getTime()<hours*3600000)return false;const owner=(await client.query(`SELECT id,role,mfa_enabled "mfaEnabled",(mfa_enabled AND totp_secret_ciphertext IS NOT NULL) "mfaActive" FROM app_users WHERE role='owner' AND active ORDER BY created_at LIMIT 1`)).rows[0];if(!owner)return false;await jobs.enqueue(client,{type:'BACKUP_RUN',user:owner,params:{scheduled:true},executionKey:`scheduled:${new Date().toISOString().slice(0,10)}`,system:true});return true;}

async function recordDelivery(client,{notificationId,channel,destination,status,error}){
  const target=destination?String(destination).slice(0,240):null;
  const current=(await client.query(`SELECT * FROM notification_deliveries WHERE notification_id=$1 AND channel=$2 AND COALESCE(destination,'')=COALESCE($3,'') FOR UPDATE`,[notificationId,channel,target])).rows[0];
  if(current?.status==='SENT')return{status:'SENT',attempts:Number(current.attempts),replayed:true};
  const attempts=Number(current?.attempts||0)+1,sentAt=status==='SENT'?new Date():null;
  if(current)await client.query(`UPDATE notification_deliveries SET status=$2,attempts=$3,last_error=$4,sent_at=$5 WHERE id=$1`,[current.id,status,attempts,error||null,sentAt]);
  else await client.query(`INSERT INTO notification_deliveries(notification_id,channel,destination,status,attempts,last_error,sent_at) VALUES($1,$2,$3,$4,$5,$6,$7)`,[notificationId,channel,target,status,attempts,error||null,sentAt]);
  return{status,attempts,replayed:false};
}

async function deliverNotification(client,job,params,title){
  const dedupeKey=params.dedupeKey||`job:${job.id}:notification`;
  const existed=(await client.query(`SELECT id FROM notifications WHERE dedupe_key=$1 AND read_at IS NULL LIMIT 1`,[dedupeKey])).rows[0];
  let notification=await jobs.notify(client,{userId:params.userId||job.requestedBy,role:params.role,category:params.category||'INFORMATION',title,body:params.body||'',link:params.link,dedupeKey});
  if(!notification)notification=(await client.query(`SELECT * FROM notifications WHERE dedupe_key=$1 AND read_at IS NULL ORDER BY created_at DESC LIMIT 1`,[dedupeKey])).rows[0];
  if(!notification)throw new Error('Notifikasi gagal dibuat atau ditemukan kembali.');
  await recordDelivery(client,{notificationId:notification.id,channel:'IN_APP',status:'SENT'});
  if(!params.email)return{ok:true,notificationId:notification.id,deduplicated:!!existed,channels:['IN_APP']};
  const destination=String(params.email).slice(0,240),sent=(await client.query(`SELECT status,attempts FROM notification_deliveries WHERE notification_id=$1 AND channel='EMAIL' AND COALESCE(destination,'')=$2 FOR UPDATE`,[notification.id,destination])).rows[0];
  if(sent?.status==='SENT')return{ok:true,notificationId:notification.id,deduplicated:true,channels:['IN_APP','EMAIL'],emailStatus:'SENT'};
  const smtp=require('../infrastructure/smtp'),result=await smtp.send({to:destination,subject:title,text:params.body||title});
  const delivery=await recordDelivery(client,{notificationId:notification.id,channel:'EMAIL',destination,status:result.status,error:result.error});
  return{ok:result.status!=='FAILED',notificationId:notification.id,deduplicated:!!existed,channels:['IN_APP','EMAIL'],emailStatus:result.status,deliveryAttempts:delivery.attempts,retryableError:result.status==='FAILED'?`Pengiriman email gagal: ${result.error}`:null};
}

async function execute(client,job){
  const params=job.params||{};let title=String(params.title||job.label||'MAT ERP').slice(0,120),rows=Array.isArray(params.rows)?params.rows:[];
  if(job.jobType==='FILE_SCAN'){if(!params.fileId)throw new Error('fileId wajib untuk pemindaian.');const item=await privateStorage.scan(client,params.fileId);return{ok:item.scanStatus==='CLEAN',fileId:item.id,scanStatus:item.scanStatus,scanEngine:item.scanEngine};}
  const requestUser=await workerUser(client,job.requestedBy),selected=reporting.scopeFor(requestUser,params.branchId||null),user=selected.global?requestUser:{...requestUser,branchId:selected.branchId},global=selected.global,scope=[global,selected.branchId];
  if(params.documentNumber){const document=(await client.query(`SELECT document_number,title,document_type,status,amount,party_name,due_date FROM business_documents WHERE document_number=$1 AND ($2::boolean OR branch_id=$3)`,[params.documentNumber,...scope])).rows[0];if(document){title=`${document.document_number} - ${document.title}`;rows=[document,...(await client.query(`SELECT l.line_no,l.description,l.qty,l.uom,l.unit_price,l.line_total FROM document_lines l JOIN business_documents d ON d.id=l.document_id WHERE d.document_number=$1 AND ($2::boolean OR d.branch_id=$3) ORDER BY l.line_no`,[params.documentNumber,...scope])).rows];}}
  if(params.type&&!rows.length){rows=(await client.query(`SELECT document_number,title,status,amount,party_name,due_date,updated_at FROM business_documents WHERE document_type=$1 AND NOT is_archived AND ($2::boolean OR branch_id=$3) ORDER BY updated_at DESC LIMIT 5000`,[params.type,...scope])).rows;title=`Ekspor ${params.type}`;}
  if(params.report&&!rows.length){rows=await reportRows(client,params.report,user,{...selected,period:params.period});title=params.report;}
  if(job.jobType==='GENERATE_PDF'){const artifact=await artifacts.create(client,{job,kind:'pdf',title,rows});return{ok:true,artifactId:artifact.id,fileName:artifact.fileName,sizeBytes:artifact.sizeBytes};}
  if(job.jobType==='PAYROLL_SLIPS'){if(!params.documentId)throw new Error('documentId wajib untuk slip payroll.');const items=await businessOps.payrollItems(client,params.documentId,user),doc=(await client.query('SELECT document_number,title FROM business_documents WHERE id=$1 AND ($2::boolean OR branch_id=$3)',[params.documentId,...scope])).rows[0];if(!doc)throw new Error('Dokumen payroll tidak tersedia dalam scope pemohon.');const artifact=await artifacts.create(client,{job,kind:'pdf',title:`Slip-${doc.document_number}`,rows:items.map(x=>({Karyawan:x.employeeName,GajiPokok:Number(x.baseSalary),Tunjangan:Number(x.allowances),Lembur:Number(x.overtime),Potongan:Number(x.deductions),BPJS:Number(x.bpjsEmployee),PPh21:Number(x.pph21),GajiBersih:Number(x.netPay)}))});return{ok:true,artifactId:artifact.id,fileName:artifact.fileName,sizeBytes:artifact.sizeBytes,slips:items.length};}
  if(['EXPORT_EXCEL','REPORT_GENERATE'].includes(job.jobType)){const artifact=await artifacts.create(client,{job,kind:'excel',title,rows});return{ok:true,artifactId:artifact.id,fileName:artifact.fileName,sizeBytes:artifact.sizeBytes};}
  if(job.jobType==='NOTIFICATION_SEND')return deliverNotification(client,job,params,title);
  if(job.jobType==='BACKUP_RUN'){const result=await backup.runBackup(client,{requestedBy:job.requestedBy});return{ok:true,backupId:result.id,sizeBytes:result.sizeBytes,checksum:result.checksum};}
  if(job.jobType==='IMPORT_CSV')return importCsv(client,job,params);
  if(job.jobType==='RECONCILIATION'){const user=await workerUser(client,job.requestedBy),result=await businessOps.reconcile(client,{period:params.period,branchId:params.branchId,user});return{ok:true,reconciliationId:result.id,matchedCount:result.matchedCount,difference:Number(result.difference)};}
  throw new Error(`Executor job '${job.jobType}' belum tersedia.`);
}
async function reportRows(client,name,user,scopeOverride){
  const params=[scopeOverride?scopeOverride.global:hasGlobalScope(user),scopeOverride?scopeOverride.branchId:user.branchId],branch=`($1::boolean OR d.branch_id=$2)`,p=scopeOverride?.period;
  if(p&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(p)))throw new Error('Periode laporan wajib YYYY-MM.');if(p)params.push(`${p}-01`);const docPeriod=p?`AND d.created_at>=$3::date AND d.created_at<($3::date+interval '1 month')`:'';
  if(name==='Penjualan per pelanggan')return(await client.query(`SELECT COALESCE(d.party_name,'Tanpa pelanggan') pelanggan,count(*)::int dokumen,sum(d.functional_amount)::float nilai FROM business_documents d WHERE d.document_type IN('QUOTATION','SALES_ORDER','INVOICE') AND d.status NOT IN('CANCELLED','VOID','REJECTED') AND ${branch} ${docPeriod} GROUP BY d.party_name ORDER BY nilai DESC`,params)).rows;
  if(name==='AR & AP aging')return(await client.query(`SELECT d.document_number dokumen,d.document_type jenis,d.party_name relasi,d.amount::float nilai,d.due_date jatuh_tempo,GREATEST(current_date-COALESCE(d.due_date,current_date),0)::int umur_hari,d.status FROM business_documents d WHERE d.document_type IN('INVOICE','SUPPLIER_INVOICE') AND d.status NOT IN('CLOSED','CANCELLED','VOID','REJECTED') AND ${branch} ${docPeriod} ORDER BY d.due_date NULLS LAST`,params)).rows;
  if(name==='Profitabilitas proyek')return(await client.query(`SELECT d.document_number proyek,d.title,d.party_name pelanggan,d.functional_amount::float nilai_kontrak,
    COALESCE(sum(CASE WHEN w.payload#>>'{production,costing,totalCost}' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (w.payload#>>'{production,costing,totalCost}')::numeric ELSE 0 END),0)::float biaya_aktual,
    (d.functional_amount-COALESCE(sum(CASE WHEN w.payload#>>'{production,costing,totalCost}' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (w.payload#>>'{production,costing,totalCost}')::numeric ELSE 0 END),0))::float margin_aktual,d.status
    FROM business_documents d LEFT JOIN document_relations r ON r.parent_document_id=d.id AND r.relation_type='PROJECT_TO_WORK_ORDER' LEFT JOIN business_documents w ON w.id=r.child_document_id
    WHERE d.document_type='PROJECT' AND d.status NOT IN('CANCELLED','VOID') AND ${branch} ${docPeriod} GROUP BY d.id ORDER BY d.updated_at DESC`,params)).rows;
  if(name==='Kinerja produksi')return(await client.query(`SELECT d.document_number work_order,d.title,d.party_name pelanggan,
    CASE WHEN d.payload->>'progress' ~ '^[0-9]+(\\.[0-9]+)?$' THEN (d.payload->>'progress')::numeric ELSE 0 END::float progres,
    COALESCE(d.payload->>'stage','Belum ditentukan') tahap,COALESCE((SELECT sum(t.hours) FROM work_order_operations o JOIN work_order_time_logs t ON t.operation_id=o.id WHERE o.work_order_id=d.id),0)::float jam_aktual,
    CASE WHEN d.payload#>>'{production,costing,totalCost}' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (d.payload#>>'{production,costing,totalCost}')::numeric ELSE 0 END::float biaya_aktual,d.due_date jatuh_tempo,d.status
    FROM business_documents d WHERE d.document_type='WORK_ORDER' AND d.status NOT IN('CANCELLED','VOID') AND ${branch} ${docPeriod} ORDER BY d.updated_at DESC`,params)).rows;
  if(name==='Mutasi persediaan')return(await client.query(`SELECT m.occurred_at waktu,p.code sku,p.name produk,b.name gudang,m.movement_type jenis,m.qty::float qty,m.unit_cost::float harga_pokok,d.document_number dokumen FROM inventory_movements m JOIN products p ON p.id=m.product_id JOIN branches b ON b.id=m.warehouse_id JOIN business_documents d ON d.id=m.document_id WHERE ${branch} ${p?`AND m.occurred_at>=$3::date AND m.occurred_at<($3::date+interval '1 month')`:''} ORDER BY m.occurred_at DESC LIMIT 5000`,params)).rows;
  if(name==='Rekap payroll & BPJS')return(await client.query(`SELECT d.document_number payroll,d.payload->>'period' periode,e.nik,e.name karyawan,p.base_salary::float gaji_pokok,p.allowances::float tunjangan,p.overtime::float lembur,p.deductions::float potongan,(p.bpjs_company+p.bpjs_employee)::float bpjs,p.pph21::float pph21,p.net_pay::float gaji_bersih,d.status FROM payroll_items p JOIN business_documents d ON d.id=p.payroll_document_id JOIN employees e ON e.id=p.employee_id WHERE ${branch} ${p?`AND d.payload->>'period'=$4`:''} ORDER BY d.payload->>'period' DESC,e.name`,p?[...params,p]:params)).rows;
  if(name==='Neraca & laba rugi')return(await client.query(`SELECT a.code kode_akun,a.name nama_akun,a.category kategori,
    COALESCE(sum(j.debit),0)::float debit,COALESCE(sum(j.credit),0)::float kredit,
    CASE WHEN a.category IN('ASSET','EXPENSE','COGS') THEN COALESCE(sum(j.debit-j.credit),0) ELSE COALESCE(sum(j.credit-j.debit),0) END::float saldo
    FROM chart_of_accounts a LEFT JOIN journal_lines j ON j.account_id=a.id LEFT JOIN business_documents d ON d.id=j.journal_document_id
    WHERE a.active AND (d.id IS NULL OR (${branch} ${docPeriod})) GROUP BY a.id ORDER BY a.code`,params)).rows;
  if(name==='Quality analytics')return(await client.query(`SELECT d.document_number dokumen_qc,q.inspection_type jenis,q.inspected_at waktu,p.code sku,p.name produk,
    q.sampled_qty::float sampel,q.passed_qty::float lulus,q.failed_qty::float gagal,q.result hasil,q.ncr_number ncr,q.defect_code kode_cacat,q.root_cause akar_masalah,q.corrective_action tindakan_korektif
    FROM qc_inspections q JOIN business_documents d ON d.id=q.qc_document_id LEFT JOIN products p ON p.id=q.product_id WHERE ${branch} ${p?`AND q.inspected_at>=$3::date AND q.inspected_at<($3::date+interval '1 month')`:''} ORDER BY q.inspected_at DESC LIMIT 5000`,params)).rows;
  return[];
}
async function workerUser(client,id){const row=(await client.query(`SELECT id,username,display_name "displayName",role,branch_id "branchId",branch_scope "branchScope",employee_id "employeeId",(mfa_enabled AND totp_secret_ciphertext IS NOT NULL) "mfaActive" FROM app_users WHERE id=$1 AND active`,[id])).rows[0];if(!row)throw new Error('Pemohon job tidak aktif.');return row;}
async function importCsv(client,job,params){const user=await workerUser(client,job.requestedBy),module=String(params.module||''),allowed=new Set(['attendance','customers','suppliers','products','employees','bank']);if(!allowed.has(module))throw new Error('Modul import tidak didukung.');let text=params.csvText,fileName=params.fileName||'import.csv';if(params.fileId){if(!await privateStorage.scopedMetadata(client,params.fileId,user))throw new Error('File impor tidak tersedia dalam scope pemohon.');const file=await privateStorage.download(client,params.fileId);text=file.buffer.toString('utf8');fileName=file.item.originalFilename;}const rows=parseCsv(text),errors=[];let success=0;for(const row of rows){try{if(module==='attendance'){const employee=(await client.query('SELECT id FROM employees WHERE nik=$1',[row.nik])).rows[0];if(!employee)throw new Error(`NIK ${row.nik} tidak ditemukan`);await businessOps.upsertAttendance(client,{employeeId:employee.id,workDate:row.work_date,checkIn:row.check_in||null,checkOut:row.check_out||null,status:row.status||'PRESENT',notes:row.notes,user,source:'CSV'});}else if(module==='bank'){const direction=String(row.direction||'').toUpperCase();await client.query(`INSERT INTO bank_transactions(id,branch_id,transaction_date,reference,description,direction,amount,imported_by) VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7) ON CONFLICT(branch_id,reference,direction) DO NOTHING`,[user.branchId,row.transaction_date,row.reference,row.description||null,direction,Number(row.amount),user.id]);}else{const ops=require('../infrastructure/database/repositories/operations'),key={customers:'code',suppliers:'code',products:'code',employees:'nik'}[module],existing=(await client.query(`SELECT id FROM ${module} WHERE ${key}=$1`,[row[key]])).rows[0],body={...row};delete body.line;if(existing)await ops.updateMaster(client,module,existing.id,body,user);else await ops.createMaster(client,module,body,user);}success++;}catch(error){errors.push({line:row.line,message:String(error.message).slice(0,240)});}}const batch=(await client.query(`INSERT INTO import_batches(job_id,module,file_name,total_rows,success_rows,error_rows,errors,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,[job.id,module,fileName,rows.length,success,errors.length,JSON.stringify(errors.slice(0,100)),user.id])).rows[0];if(!success&&errors.length)throw new Error(`Seluruh ${errors.length} baris gagal diimpor.`);return{ok:true,batchId:batch.id,totalRows:rows.length,successRows:success,errorRows:errors.length,errors:errors.slice(0,10)};}
// Maintenance partisi audit: pastikan partisi tahun berjalan + 1 selalu ada
// (fungsi SECURITY DEFINER dari migrasi 011). Dipanggil maksimal 2×/hari.
async function auditPartitionMaintenance(client){
  const audit=(await client.query('SELECT audit_partition_maintenance() AS created')).rows[0].created||[];
  const inventory=(await client.query('SELECT inventory_partition_maintenance(2) AS created')).rows[0].created||[];
  const created=[...audit,...inventory];
  if(created&&created.length)console.log(JSON.stringify({level:'info',service:'job-worker',message:`Partisi audit dibuat: ${created.join(', ')}`,at:new Date().toISOString()}));
  return created;
}
async function scheduleReports(client){
  const due=(await client.query(`SELECT * FROM report_schedules WHERE enabled AND next_run_at<=now() ORDER BY next_run_at FOR UPDATE SKIP LOCKED LIMIT 10`)).rows;let queued=0;
  for(const schedule of due){
    const user=await workerUser(client,schedule.created_by).catch(()=>null);
    if(!user){await client.query(`UPDATE report_schedules SET enabled=false,version=version+1,updated_at=now() WHERE id=$1`,[schedule.id]);continue;}
    const item=reporting.report(schedule.report_key),type=schedule.format==='PDF'?'GENERATE_PDF':'REPORT_GENERATE',runAt=new Date(schedule.next_run_at).toISOString();
    const job=await jobs.enqueue(client,{type,user,params:{...(schedule.filters||{}),report:item.title,reportKey:item.key,branchId:schedule.branch_id,scheduled:true,scheduleId:schedule.id},executionKey:`report-schedule:${schedule.id}:${runAt}`,system:true});
    await client.query(`UPDATE report_schedules SET last_enqueued_at=now(),last_job_id=$2,next_run_at=GREATEST(next_run_at,now())+CASE frequency WHEN 'DAILY' THEN interval '1 day' WHEN 'WEEKLY' THEN interval '1 week' ELSE interval '1 month' END,version=version+1,updated_at=now() WHERE id=$1`,[schedule.id,job.id]);queued++;
  }
  return queued;
}
async function refreshReporting(client){
  const minutes=Math.min(Math.max(Number(process.env.MAT_REPORT_REFRESH_MINUTES)||5,1),60),last=(await client.query(`SELECT finished_at FROM reporting_refresh_runs WHERE status='SUCCEEDED' ORDER BY finished_at DESC LIMIT 1`)).rows[0];
  if(last&&Date.now()-new Date(last.finished_at).getTime()<minutes*60000)return false;
  await reporting.refresh(client);return true;
}
function start({pollMs=1000}={}) {
  const workerId=`mat-worker-${process.pid}-${randomUUID().slice(0,8)}`;let stopped=false,running=false,timer,lastSchedule=0,lastReporting=0,lastMaintenance=0;
  const schedule=()=>{if(!stopped)timer=setTimeout(tick,pollMs).unref();};
  const tick=async()=>{if(running||stopped)return schedule();running=true;try{
    await withTransaction(c=>jobs.recoverExpired(c));if(Date.now()-lastSchedule>60000){await withTransaction(scheduleBackup);await withTransaction(scheduleReports);lastSchedule=Date.now();}
    if(Date.now()-lastReporting>60000){await withTransaction(refreshReporting);lastReporting=Date.now();}
    if(Date.now()-lastMaintenance>12*3600000){await withTransaction(auditPartitionMaintenance).catch(error=>{console.error(JSON.stringify({level:'error',service:'job-worker',message:`Maintenance partisi gagal: ${error.message}`,at:new Date().toISOString()}));require('../infrastructure/alerts').send('Maintenance partisi gagal',error.message).catch(()=>{});});lastMaintenance=Date.now();}
    const claimed=await withTransaction(c=>jobs.claim(c,workerId,{leaseSeconds:60}));
    if(claimed){const job=await withTransaction(c=>jobs.startRunning(c,claimed.id,workerId)),heartbeat=setInterval(()=>withTransaction(c=>jobs.heartbeat(c,job.id,workerId,60)).catch(()=>{}),15000);heartbeat.unref();try{const result=await withTransaction(async c=>{await c.query(`SET LOCAL statement_timeout = '${Math.max(10000,Number(job.timeoutSeconds||300)*1000)}ms'`);return execute(c,job);});if(result?.retryableError)throw new Error(result.retryableError);if(await withTransaction(c=>jobs.cancellationRequested(c,job.id,workerId)))throw new Error('Job dibatalkan atau melewati timeout.');await withTransaction(async c=>{await jobs.complete(c,job.id,workerId,result);await jobs.notify(c,{userId:job.requestedBy,category:'SUCCESS',title:`${job.label} selesai`,body:result.fileName?`${result.fileName} siap diunduh.`:'Proses latar belakang selesai.',link:'#/system/jobs',dedupeKey:`job:${job.id}:succeeded`});});}catch(error){await withTransaction(async c=>{await jobs.fail(c,job.id,workerId,error.message);await jobs.notify(c,{userId:job.requestedBy,category:'WARNING',title:`${job.label} gagal`,body:String(error.message).slice(0,500),link:'#/system/jobs',dedupeKey:`job:${job.id}:failed:${job.attempts}`});});if(job.jobType==='BACKUP_RUN')require('../infrastructure/alerts').send('Job backup terjadwal GAGAL',error.message,{key:'backup-job'}).catch(()=>{});}finally{clearInterval(heartbeat);}}
  }catch(error){console.error(JSON.stringify({level:'error',service:'job-worker',workerId,error:error.message,at:new Date().toISOString()}));}finally{running=false;schedule();}};
  tick();return{workerId,stop(){stopped=true;if(timer)clearTimeout(timer);}};
}
module.exports={start,execute,scheduleBackup,scheduleReports,refreshReporting,reportRows,recordDelivery,deliverNotification};
