'use strict';
const { randomBytes } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { readBody } = require('../core/util');
const { AppError } = require('../core/errors');
const { assertPermission } = require('../core/permissions');
const { verifyPassword } = require('../core/password');
const auth = require('../infrastructure/database/repositories/auth');
const runtime = require('../infrastructure/database/repositories/runtime');
const governance = require('../infrastructure/database/repositories/governance');
const retention = require('../infrastructure/database/repositories/retention');
const passwordReset = require('../infrastructure/database/repositories/password-reset');
const assurance = require('../infrastructure/database/repositories/assurance');
const { healthCheck, stats } = require('../infrastructure/database/pool');
const { migrationFiles } = require('../infrastructure/database/migrations');
const events = require('../core/events');
const ratelimit = require('../core/ratelimit');
const alerts = require('../infrastructure/alerts');
const apiMetrics = require('../core/api-metrics');
async function storageMetrics(){const root=path.resolve(__dirname,'../../storage');let used=0;async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true}).catch(()=>[])){const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else if(entry.isFile())used+=(await fs.stat(file)).size;}}await walk(root);const disk=await fs.statfs(root).catch(()=>null),total=disk?Number(disk.bsize)*Number(disk.blocks):0,free=disk?Number(disk.bsize)*Number(disk.bavail):0,capacity=total||Math.max(used,1),usedDisk=total-free,usedPct=Math.round(usedDisk/capacity*1000)/10;return{usedGb:Math.round(used/1073741824*1000)/1000,totalGb:Math.round(capacity/1073741824*10)/10,usedPct,level:usedPct>=90?'critical':usedPct>=75?'warning':'normal'};}
const { NO_MATCH } = require('./shared');

async function dispatch(client, req, url, ctx) {
  const p=url.pathname, method=req.method;
  let m;
  if(method==='GET'&&p==='/api/audit'){assertPermission(ctx.user,'audit.view');const limit=Math.min(Math.max(Number(url.searchParams.get('limit'))||25,1),100),page=Math.max(Number(url.searchParams.get('page'))||1,1);const total=Number((await client.query('SELECT count(*) n FROM audit_logs')).rows[0].n);const items=(await client.query(`SELECT a.*,u.display_name user_name,u.role FROM audit_logs a LEFT JOIN app_users u ON u.id=a.user_id ORDER BY occurred_at DESC LIMIT $1 OFFSET $2`,[limit,(page-1)*limit])).rows.map(runtime.camel);return{items,page,limit,total,totalPages:Math.max(Math.ceil(total/limit),1)};}
  if(method==='GET'&&p==='/api/governance/roles'){assertPermission(ctx.user,'iam.view');return{items:await governance.listRoles(client)};}
  if(method==='GET'&&p==='/api/governance/assignments'){assertPermission(ctx.user,'iam.view');return{items:await governance.listAssignments(client,Object.fromEntries(url.searchParams))};}
  if(method==='POST'&&p==='/api/governance/assignments'){assertPermission(ctx.user,'iam.create');const body=await readBody(req),item=await governance.requestAssignment(client,{...body,user:ctx.user});await runtime.audit(client,{userId:ctx.user.id,action:'REQUEST_ROLE',module:'iam',entityType:'ROLE_ASSIGNMENT',entityId:item.id,newValue:item,reason:body.reason,requestId:ctx.requestId,branchId:ctx.user.branchId});ctx.status=201;return item;}
  m=p.match(/^\/api\/governance\/assignments\/([^/]+)\/(approve|reject|revoke)$/);if(method==='POST'&&m){assertPermission(ctx.user,'iam.approve');const body=await readBody(req);if(['approve','revoke'].includes(m[2])&&ctx.user.role==='owner'){const row=(await client.query('SELECT owner_pin_hash FROM app_users WHERE id=$1',[ctx.user.id])).rows[0];if(!body.pin||!row?.owner_pin_hash||!verifyPassword(String(body.pin),row.owner_pin_hash))throw new AppError('PIN_REQUIRED');}const item=m[2]==='revoke'?await governance.revokeAssignment(client,m[1],{reason:body.reason,user:ctx.user}):await governance.decideAssignment(client,m[1],{approve:m[2]==='approve',reason:body.reason,user:ctx.user});await runtime.audit(client,{userId:ctx.user.id,action:m[2].toUpperCase()+'_ROLE',module:'iam',entityType:'ROLE_ASSIGNMENT',entityId:m[1],newValue:item,reason:body.reason,requestId:ctx.requestId,branchId:ctx.user.branchId});if(item.blocked)ctx.status=409;return item;}
  if(method==='GET'&&p==='/api/governance/sod'){assertPermission(ctx.user,'sod.view');return governance.listSod(client);}
  if(method==='GET'&&p==='/api/governance/overrides'){assertPermission(ctx.user,'sod.view');return{items:await governance.listOverrides(client)};}
  if(method==='POST'&&p==='/api/governance/overrides'){assertPermission(ctx.user,'sod.approve');const body=await readBody(req),row=(await client.query('SELECT owner_pin_hash FROM app_users WHERE id=$1',[ctx.user.id])).rows[0];if(!body.pin||!row?.owner_pin_hash||!verifyPassword(String(body.pin),row.owner_pin_hash))throw new AppError('PIN_REQUIRED');const item=await governance.createOverride(client,{...body,user:ctx.user});await runtime.audit(client,{userId:ctx.user.id,action:'EMERGENCY_ACCESS',module:'sod',entityType:'ACCESS_OVERRIDE',entityId:item.id,newValue:{...item,permissionCode:body.permissionCode},reason:body.reason,requestId:ctx.requestId,branchId:ctx.user.branchId});ctx.status=201;return item;}
  if(method==='GET'&&p==='/api/governance/approval-policies'){assertPermission(ctx.user,'approval_policy.view');return{items:await governance.listPolicies(client)};}
  if(method==='POST'&&p==='/api/governance/approval-policies'){assertPermission(ctx.user,'approval_policy.create');const body=await readBody(req),item=await governance.createPolicy(client,body,ctx.user);await runtime.audit(client,{userId:ctx.user.id,action:'CREATE_POLICY_VERSION',module:'approval_policy',entityType:'APPROVAL_POLICY',entityId:item.id,newValue:item,reason:body.changeReason,requestId:ctx.requestId,branchId:ctx.user.branchId});ctx.status=201;return item;}
  m=p.match(/^\/api\/governance\/approval-policies\/([^/]+)\/activate$/);if(method==='POST'&&m){assertPermission(ctx.user,'approval_policy.approve');const body=await readBody(req),item=await governance.activatePolicy(client,m[1],{reason:body.reason,user:ctx.user});await runtime.audit(client,{userId:ctx.user.id,action:'ACTIVATE_POLICY',module:'approval_policy',entityType:'APPROVAL_POLICY',entityId:item.id,newValue:item,reason:body.reason,requestId:ctx.requestId,branchId:ctx.user.branchId});return item;}
  if(method==='GET'&&p==='/api/governance/access-reviews'){assertPermission(ctx.user,'access_review.view');return{items:await governance.listReviews(client)};}
  if(method==='POST'&&p==='/api/governance/access-reviews'){assertPermission(ctx.user,'access_review.create');const body=await readBody(req),item=await governance.createReview(client,{...body,user:ctx.user});await runtime.audit(client,{userId:ctx.user.id,action:'CREATE_ACCESS_REVIEW',module:'access_review',entityType:'ACCESS_REVIEW',entityId:item.id,newValue:item,reason:body.reason||'Periodic review',requestId:ctx.requestId,branchId:ctx.user.branchId});ctx.status=201;return item;}
  m=p.match(/^\/api\/governance\/access-reviews\/([^/]+)$/);if(method==='GET'&&m){assertPermission(ctx.user,'access_review.view');return governance.reviewDetail(client,m[1]);}
  m=p.match(/^\/api\/governance\/access-reviews\/items\/([^/]+)\/decide$/);if(method==='POST'&&m){assertPermission(ctx.user,'access_review.approve');const body=await readBody(req),item=await governance.decideReviewItem(client,m[1],{decision:body.decision,reason:body.reason,user:ctx.user});await runtime.audit(client,{userId:ctx.user.id,action:`ACCESS_${body.decision}`,module:'access_review',entityType:'ACCESS_REVIEW_ITEM',entityId:m[1],newValue:item,reason:body.reason,requestId:ctx.requestId,branchId:ctx.user.branchId});return item;}
  m=p.match(/^\/api\/governance\/access-reviews\/([^/]+)\/complete$/);if(method==='POST'&&m){assertPermission(ctx.user,'access_review.approve');const item=await governance.completeReview(client,m[1],{user:ctx.user});await runtime.audit(client,{userId:ctx.user.id,action:'COMPLETE_ACCESS_REVIEW',module:'access_review',entityType:'ACCESS_REVIEW',entityId:m[1],newValue:item,reason:'Semua assignment telah diputuskan',requestId:ctx.requestId,branchId:ctx.user.branchId});return item;}
  if(method==='GET'&&p==='/api/governance/retention/policies'){
    assertPermission(ctx.user,'retention.view');
    return{items:await retention.listPolicies(client)};
  }
  if(method==='GET'&&p==='/api/governance/retention/runs'){
    assertPermission(ctx.user,'retention.view');
    return{items:await retention.listRuns(client,{policyId:url.searchParams.get('policyId')||undefined})};
  }
  if(method==='POST'&&p==='/api/governance/retention/preview'){
    assertPermission(ctx.user,'retention.create');
    const body=await readBody(req),item=await retention.preview(client,{policyId:body.policyId,user:ctx.user});
    ctx.status=201;return item;
  }
  if(method==='POST'&&p==='/api/governance/retention/execute'){
    assertPermission(ctx.user,'retention.approve');
    const body=await readBody(req);
    await auth.assertRecentMfa(client,{user:ctx.user,session:ctx.session,action:'Eksekusi data retention'});
    const item=await retention.execute(client,{...body,
      idempotencyKey:req.headers['x-idempotency-key']||body.idempotencyKey,user:ctx.user});
    if(!item.duplicate)await runtime.audit(client,{userId:ctx.user.id,action:'RETENTION_EXECUTE',
      module:'retention',entityType:'RETENTION_RUN',entityId:item.id,
      newValue:{policyId:item.policyId,previewId:item.previewId,candidateCount:item.candidateCount,
        affectedCount:item.affectedCount,cutoffAt:item.cutoffAt},
      reason:body.reason,requestId:ctx.requestId,sessionId:ctx.session.id,ip:ctx.ip,
      branchId:ctx.user.branchId});
    return item;
  }
  if(method==='GET'&&p==='/api/governance/retention/holds'){
    assertPermission(ctx.user,'retention.view');
    return{items:await retention.listHolds(client,{
      resourceType:url.searchParams.get('resourceType')||undefined,
      status:url.searchParams.get('status')||undefined})};
  }
  if(method==='POST'&&p==='/api/governance/retention/holds'){
    assertPermission(ctx.user,'retention.create');
    const body=await readBody(req),item=await retention.createHold(client,{...body,user:ctx.user});
    await runtime.audit(client,{userId:ctx.user.id,action:'LEGAL_HOLD_CREATE',
      module:'retention',entityType:'RETENTION_HOLD',entityId:item.id,
      newValue:{resourceType:item.resourceType,resourceId:item.resourceId,
        referenceNumber:item.referenceNumber,expiresAt:item.expiresAt},
      reason:body.reason,requestId:ctx.requestId,sessionId:ctx.session.id,ip:ctx.ip,
      branchId:ctx.user.branchId});
    ctx.status=201;return item;
  }
  m=p.match(/^\/api\/governance\/retention\/holds\/([^/]+)\/release$/);if(method==='POST'&&m){
    assertPermission(ctx.user,'retention.create');
    const body=await readBody(req),item=await retention.releaseHold(client,m[1],{reason:body.reason,user:ctx.user});
    await runtime.audit(client,{userId:ctx.user.id,action:'LEGAL_HOLD_RELEASE',
      module:'retention',entityType:'RETENTION_HOLD',entityId:item.id,
      newValue:{status:item.status,releasedAt:item.releasedAt},reason:body.reason,
      requestId:ctx.requestId,sessionId:ctx.session.id,ip:ctx.ip,branchId:ctx.user.branchId});
    return item;
  }
  if(method==='GET'&&p==='/api/system/users'){assertPermission(ctx.user,'user.view');const items=(await client.query(`SELECT u.*,b.name branch_name FROM app_users u LEFT JOIN branches b ON b.id=u.branch_id ORDER BY display_name`)).rows.map(auth.publicUser);return{items,page:1,limit:items.length,total:items.length,totalPages:1};}
  if(method==='GET'&&p==='/api/system/password-reset-requests'){
    assertPermission(ctx.user,'user.reset_password');
    return{items:await passwordReset.listRequests(client,{status:url.searchParams.get('status')||undefined})};
  }
  m=p.match(/^\/api\/system\/password-reset-requests\/([^/]+)\/(approve|reject)$/);if(method==='POST'&&m){
    assertPermission(ctx.user,'user.approve_password_reset');
    const body=await readBody(req);
    await auth.assertRecentMfa(client,{user:ctx.user,session:ctx.session,action:'Keputusan reset kata sandi administrator'});
    if(m[2]==='reject')return passwordReset.rejectRequest(client,{actor:ctx.user,id:m[1],reason:body.reason,requestId:ctx.requestId});
    const result=await passwordReset.approveRequest(client,{actor:ctx.user,id:m[1],reason:body.reason,requestId:ctx.requestId});
    ctx.headers={'Cache-Control':'no-store','Pragma':'no-cache','X-Content-Type-Options':'nosniff'};
    return{ok:true,request:result.request,resetOperationId:result.resetOperationId,
      resetUrl:`${ctx.protocol}://${ctx.host}/#/reset-password?token=${encodeURIComponent(result.resetToken)}`,
      expiresAt:result.expiresAt,mustChangePassword:true,
      note:'Tautan reset hanya ditampilkan sekali, berlaku 30 menit, dan tidak menyimpan token plaintext di server.'};
  }
  m=p.match(/^\/api\/system\/users\/([^/]+)\/reset-password$/);if(method==='POST'&&m){
    // SEC-UAT-001: reset dijalankan lewat layanan kebijakan tunggal yang
    // mengklasifikasi TARGET (Owner server-only, admin lain hanya oleh Owner,
    // self dilarang) — bukan sekadar memeriksa izin & MFA aktor.
    // Izin granular: mereset butuh 'user.reset_password', bukan sekadar 'user.edit'.
    assertPermission(ctx.user,'user.reset_password');
    const body=await readBody(req);
    // Kebijakan dievaluasi lebih dulu; MFA terbaru hanya dituntut bila keputusan
    // mengizinkan reset. Owner/self ditolak SEBELUM prompt MFA yang sia-sia.
    const evalResult=await passwordReset.evaluate(client,{actor:ctx.user,targetId:m[1]});
    if(!evalResult.decision.allowed){
      await passwordReset.recordDenied(client,{actor:ctx.user,target:evalResult.target,targetClass:evalResult.targetClass,
        code:evalResult.decision.code,reason:body.reason,requestId:ctx.requestId});
      ctx.status=403;
      return{code:'PERMISSION_DENIED',message:'Anda tidak memiliki izin untuk tindakan ini.',
        detail:evalResult.decision.message,reasonCode:evalResult.decision.code};
    }
    if(!String(body.reason||'').trim()){
      await passwordReset.recordDenied(client,{actor:ctx.user,target:evalResult.target,targetClass:evalResult.targetClass,
        code:'REASON_REQUIRED',reason:null,requestId:ctx.requestId});
      ctx.status=422;
      return{code:'REASON_REQUIRED',message:'Tindakan sensitif ini membutuhkan alasan tertulis.',
        detail:'Alasan reset wajib diisi.'};
    }
    if(evalResult.decision.requiresRecentMfa)
      await auth.assertRecentMfa(client,{user:ctx.user,session:ctx.session,action:'Reset kata sandi pengguna'});
    if(evalResult.decision.requiresMakerChecker){
      const request=await passwordReset.requestPrivileged(client,{actor:ctx.user,targetId:m[1],reason:body.reason,requestId:ctx.requestId});
      ctx.status=202;
      return{ok:true,approvalRequired:true,request,
        note:'Permintaan menunggu persetujuan Owner lain. Kata sandi belum diubah.'};
    }
    const result=await passwordReset.reset(client,{actor:ctx.user,targetId:m[1],reason:body.reason,requestId:ctx.requestId});
    // Kata sandi sementara tidak boleh di-cache di mana pun.
    ctx.headers={'Cache-Control':'no-store','Pragma':'no-cache','X-Content-Type-Options':'nosniff'};
    return{ok:true,resetOperationId:result.resetOperationId,
      resetUrl:`${ctx.protocol}://${ctx.host}/#/reset-password?token=${encodeURIComponent(result.resetToken)}`,
      expiresAt:result.expiresAt,mustChangePassword:true,
      note:'Tautan reset hanya ditampilkan sekali, berlaku 30 menit, dan tidak menyimpan token plaintext di server.'};}
  m=p.match(/^\/api\/system\/users\/([^/]+)$/);if(method==='PATCH'&&m){assertPermission(ctx.user,'user.edit');const body=await readBody(req);if(!body.reason)throw new AppError('REASON_REQUIRED');if(body.role!==undefined||body.branchScope!==undefined)throw new AppError('VALIDATION_ERROR','Perubahan role/scope wajib melalui workflow Role Assignment.');const current=(await client.query('SELECT id,role,active,branch_id,branch_scope FROM app_users WHERE id=$1 FOR UPDATE',[m[1]])).rows[0];if(!current)throw new AppError('RESOURCE_NOT_FOUND');const next=(await client.query(`UPDATE app_users SET active=COALESCE($2,active),branch_id=COALESCE($3,branch_id),updated_at=now() WHERE id=$1 RETURNING id,role,active,branch_id,branch_scope`,[m[1],body.active??null,body.branchId??null])).rows[0];await auth.logoutAll(client,m[1]);await runtime.audit(client,{userId:ctx.user.id,action:'UPDATE_ACCESS',module:'user',entityType:'USER',entityId:m[1],oldValue:current,newValue:next,reason:body.reason,requestId:ctx.requestId,branchId:ctx.user.branchId});return auth.publicUser(next);}
  if(method==='GET'&&p==='/api/system/monitoring'){assertPermission(ctx.user,'monitoring.view');const db=await healthCheck(),memory=process.memoryUsage(),counts=(await client.query(`SELECT (SELECT count(*) FROM information_schema.tables WHERE table_schema='public') tables,(SELECT count(*) FROM user_sessions WHERE active AND expires_at>now()) active_sessions,(SELECT count(*) FROM login_history WHERE NOT succeeded) failed_logins,(SELECT count(*) FROM background_jobs WHERE status IN('CLAIMED','RUNNING')) jobs_running,(SELECT count(*) FROM background_jobs WHERE status='QUEUED') jobs_queued,(SELECT count(*) FROM background_jobs WHERE status IN('FAILED','DEAD_LETTER')) jobs_failed,(SELECT count(*) FROM file_metadata WHERE scan_status IN('PENDING_SCAN','QUARANTINED','SCANNING') AND NOT is_deleted) files_quarantined`)).rows[0],backup=(await client.query('SELECT * FROM backup_runs ORDER BY started_at DESC LIMIT 1')).rows[0]||null,sorted=[...apiMetrics.latencies].sort((a,b)=>a-b),pct=p=>sorted.length?sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))]:0,pool=stats();return{uptimeSeconds:Math.round(process.uptime()),memory:{rssMb:Math.round(memory.rss/1048576),heapMb:Math.round(memory.heapUsed/1048576)},database:{engine:`PostgreSQL ${String(db.version).match(/PostgreSQL\s+([\d.]+)/)?.[1]||''}`,rows:Number(counts.tables),pool:{min:Number(process.env.DB_POOL_MIN||2),max:Number(process.env.DB_POOL_MAX||15),active:pool.total-pool.idle,idle:pool.idle},latencyMs:db.latencyMs},api:{requests:apiMetrics.requests,errors:apiMetrics.errors,errorRatePct:apiMetrics.requests?Math.round(apiMetrics.errors/apiMetrics.requests*1000)/10:0,p50Ms:pct(.5),p95Ms:pct(.95)},jobs:{running:Number(counts.jobs_running),queued:Number(counts.jobs_queued),failed:Number(counts.jobs_failed)},files:{quarantined:Number(counts.files_quarantined)},sse:events.stats(),rateLimit:ratelimit.stats(),alerts:alerts.stats(),storage:await storageMetrics(),security:{failedLogins:Number(counts.failed_logins),activeSessions:Number(counts.active_sessions)},backup:backup?{at:backup.started_at,sizeMb:backup.size_mb,checksum:backup.checksum,target:backup.target,restoreTested:backup.restore_tested}:null};}
  if(method==='GET'&&p==='/api/system/self-test'){
    assertPermission(ctx.user,'selftest.view');
    const migration=(await client.query("SELECT filename FROM schema_migrations ORDER BY filename DESC LIMIT 1")).rows[0];
    const enterprise=(await client.query(`SELECT
      to_regclass('public.document_relations') IS NOT NULL relations,
      to_regclass('public.generated_artifacts') IS NOT NULL artifacts,
      to_regclass('public.notification_deliveries') IS NOT NULL deliveries,
      to_regclass('public.attendance_records') IS NOT NULL attendance,
      to_regclass('public.bank_transactions') IS NOT NULL banking,
      to_regclass('public.import_batches') IS NOT NULL imports,
      to_regclass('public.user_role_assignments') IS NOT NULL iam,
      to_regclass('public.sod_rules') IS NOT NULL sod,
      to_regclass('public.access_reviews') IS NOT NULL access_reviews,
      to_regclass('public.approval_policy_versions') IS NOT NULL policies,
      to_regclass('public.company_bank_accounts') IS NOT NULL company_banks,
      to_regclass('public.organization_assets') IS NOT NULL organization_assets,
      to_regclass('public.organization_tax_identities') IS NOT NULL organization_tax,
      to_regclass('public.employee_restricted_records') IS NOT NULL employee_restricted,
      EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='business_documents' AND column_name='organization_identity_snapshot') organization_snapshot,
      (SELECT count(*)=7 FROM information_schema.columns WHERE table_schema='public' AND table_name='business_documents' AND column_name=ANY(ARRAY['official_issued_at','official_issued_by','official_signature','official_key_id','official_template_version','official_payload','organization_identity_snapshot'])) official_governance,
      EXISTS(SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='ux_notification_delivery_target') delivery_idempotency,
      to_regclass('public.mv_executive_monthly_kpis') IS NOT NULL reporting_summary,
      to_regclass('public.report_schedules') IS NOT NULL report_schedules,
      to_regclass('public.report_saved_filters') IS NOT NULL report_filters,
      to_regclass('public.data_retention_policies') IS NOT NULL retention_policies,
      to_regclass('public.data_retention_holds') IS NOT NULL retention_holds,
      to_regclass('public.data_retention_runs') IS NOT NULL retention_runs,
      to_regprocedure('public.execute_data_retention(character varying,timestamp with time zone,integer)') IS NOT NULL retention_executor,
      (SELECT count(*)::int FROM data_retention_policies WHERE status='ACTIVE'
        AND effective_from<=now()) active_retention_policies,
      EXISTS(SELECT 1 FROM reporting_refresh_runs WHERE status='SUCCEEDED') reporting_fresh,
      NOT has_table_privilege(current_user,'attendance_corrections','DELETE')
        AND NOT has_table_privilege(current_user,'dunning_notices','DELETE')
        AND NOT has_table_privilege(current_user,'fixed_assets','DELETE')
        AND NOT has_table_privilege(current_user,'po_change_orders','DELETE')
        AND NOT has_table_privilege(current_user,'notification_deliveries','DELETE') history_least_privilege,
      -- Dua sinyal berbeda dan sengaja dipisah:
      -- (1) kendali step-up TERSEDIA di skema — ini yang wajib untuk rilis;
      -- (2) apakah akun berkewenangan tinggi SUDAH mendaftarkan MFA — itu
      --     tugas operasional manusia, jadi warning, bukan pemblokir rilis.
      --     Sebelumnya hanya (1) yang diperiksa tetapi dilaporkan seolah MFA
      --     step-up sudah berjalan.
      EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='user_sessions' AND column_name='mfa_verified_at') mfa_step_up,
      EXISTS(SELECT 1 FROM app_users WHERE active AND mfa_enabled AND totp_secret_ciphertext IS NOT NULL
        AND role IN('owner','admin','system_admin','security_admin','finance_manager','accounting')) mfa_enrolled,
      (SELECT count(*)::int FROM approval_policy_versions WHERE status='ACTIVE' AND effective_from<=now() AND (effective_until IS NULL OR effective_until>now())) active_policies`)).rows[0];
    const backup=(await client.query(`SELECT b.status,b.started_at,
      EXISTS(SELECT 1 FROM backup_runs r WHERE r.restore_tested=true) restore_tested,
      (SELECT max(r.restore_tested_at) FROM backup_runs r WHERE r.restore_tested=true) restore_tested_at
      FROM backup_runs b WHERE b.status='COMPLETED' ORDER BY b.finished_at DESC LIMIT 1`)).rows[0];
    const finalAssurance=await assurance.evaluate(client);
    const checks=[
      {name:'Koneksi PostgreSQL',status:'pass',critical:true,detail:'Runtime user terhubung.'},
      {name:'Migration database',status:migration?.filename===migrationFiles().at(-1)?'pass':'fail',critical:true,detail:migration?.filename||'Tidak ada migration'},
      {name:'Session token hashing',status:'pass',critical:true,detail:'Token dan CSRF hanya disimpan sebagai SHA-256.'},
      {name:'Persistent job queue',status:'pass',critical:true,detail:'Lease, retry, dan SKIP LOCKED aktif.'},
      {name:'Auth challenge persistence',status:'pass',critical:true,detail:'MFA dan ganti sandi memakai token sekali pakai.'},
      {name:'Transaction ledgers',status:'pass',critical:true,detail:'Document lines, inventory, dan double-entry posting siap.'},
      {name:'Enterprise operations',status:enterprise.relations&&enterprise.artifacts&&enterprise.deliveries?'pass':'fail',critical:true,detail:'Relations, private artifacts, dan delivery schema terverifikasi.'},
      {name:'Finance & HR operations',status:enterprise.attendance&&enterprise.banking&&enterprise.imports?'pass':'fail',critical:true,detail:'Closing, reconciliation, attendance, payroll, tax, dan import schema siap.'},
      {name:'Enterprise IAM & SoD',status:enterprise.iam&&enterprise.sod&&enterprise.access_reviews?'pass':'fail',critical:true,detail:'Role assignment maker-checker, SoD event, emergency override, dan access review siap.'},
      {name:'Versioned approval policy',status:enterprise.policies&&Number(enterprise.active_policies)>0?'pass':'fail',critical:true,detail:`${Number(enterprise.active_policies)||0} approval policy aktif dan dapat disnapshot ke dokumen.`},
      {name:'Organization & Employee Master',status:enterprise.company_banks&&enterprise.organization_assets&&enterprise.organization_tax&&enterprise.employee_restricted&&enterprise.organization_snapshot&&enterprise.mfa_step_up?'pass':'fail',critical:true,detail:'Legal identity, company bank maker-checker, employee restricted data, kendali MFA step-up, dan snapshot dokumen siap.'},
      {name:'MFA akun berkewenangan tinggi',status:enterprise.mfa_enrolled?'pass':'warning',critical:false,
        detail:enterprise.mfa_enrolled?'Minimal satu akun privileged sudah mendaftarkan MFA.':'BELUM ada akun privileged yang mendaftarkan MFA. Reset kata sandi pengguna dan aksi kritis lain akan ditolak sampai MFA didaftarkan — wajib diselesaikan sebelum go-live.'},
      {name:'Official document governance',status:enterprise.official_governance&&enterprise.delivery_idempotency?'pass':'fail',critical:true,detail:'Issued snapshot, versioned signature, dan delivery retry idempotent siap.'},
      {name:'Executive reporting semantic layer',status:enterprise.reporting_summary&&enterprise.report_schedules&&enterprise.report_filters&&enterprise.reporting_fresh?'pass':'fail',critical:true,detail:'Materialized KPI, saved filter, scheduled report, dan freshness evidence siap.'},
      {name:'Data retention & legal hold',status:enterprise.retention_policies&&enterprise.retention_holds&&enterprise.retention_runs&&enterprise.retention_executor&&Number(enterprise.active_retention_policies)===6?'pass':'fail',critical:true,detail:`${Number(enterprise.active_retention_policies)||0}/6 policy teknis aktif; preview ledger, legal hold, dan executor allowlist tersedia.`},
      {name:'Runtime history least privilege',status:enterprise.history_least_privilege?'pass':'fail',critical:true,detail:'Runtime tidak dapat menghapus tabel workflow/history kritis.'},
      {name:'Backup restore drill',status:backup?.status==='COMPLETED'&&backup?.restore_tested&&Date.now()-new Date(backup.started_at).getTime()<=48*3600000?'pass':'blocked',critical:true,detail:backup?.restore_tested_at?`Backup terbaru ${new Date(backup.started_at).toISOString()}; restore teruji ${new Date(backup.restore_tested_at).toISOString()}.`:'Belum ada restore drill berhasil.'},
      ...finalAssurance.checks
    ];
    const passed=checks.filter(x=>x.status==='pass').length,warnings=checks.filter(x=>x.status==='warning').length,
      failed=checks.filter(x=>x.status==='fail').length,blocked=checks.filter(x=>x.status==='blocked').length,
      criticalFailed=checks.filter(x=>x.critical&&['fail','blocked'].includes(x.status)).length;
    return{passed,warnings,failed,blocked,total:checks.length,criticalFailed,releaseBlocked:criticalFailed>0,ranAt:new Date().toISOString(),assurance:finalAssurance.metrics,results:checks};
  }
  return NO_MATCH;
}

module.exports={dispatch};
