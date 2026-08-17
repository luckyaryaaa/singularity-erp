'use strict';
require('../backend/core/env').loadEnv();
const test=require('node:test');const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const {Client}=require('pg');
const {randomUUID}=require('node:crypto');const {hashPassword}=require('../backend/core/auth');
const totp=require('../backend/core/totp');
const {loginHttp}=require('./helpers/mfa-login');
const enabled=!!process.env.DATABASE_URL&&!!process.env.MIGRATION_DATABASE_URL&&!!process.env.MAT_BOOTSTRAP_OWNER_PASSWORD&&!!process.env.MAT_BOOTSTRAP_OWNER_PIN;
const httpTest=enabled?test:test.skip;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function startServer(port){const env={...process.env,PORT:String(port),NODE_ENV:'development',MAT_DB_MODE:'postgres',MAT_EPHEMERAL:'0'};delete env.NODE_TEST_CONTEXT;const child=spawn(process.execPath,['server.js'],{cwd:require('node:path').join(__dirname,'..'),env,stdio:['ignore','pipe','pipe'],windowsHide:true});let errors='';child.stderr.on('data',x=>{errors+=x});return{child,getErrors:()=>errors};}
async function waitReady(base,proc){for(let i=0;i<40;i++){if(proc.child.exitCode!==null)throw new Error(`Server berhenti saat boot: ${proc.getErrors()}`);try{const r=await fetch(`${base}/api/runtime`);if(r.ok)return;}catch{}await delay(100);}throw new Error(`Server tidak ready: ${proc.getErrors()}`);}
async function stop(proc){if(proc.child.exitCode!==null)return;proc.child.kill('SIGTERM');await Promise.race([new Promise(r=>proc.child.once('exit',r)),delay(3000)]);if(proc.child.exitCode===null)proc.child.kill('SIGKILL');}
httpTest('PostgreSQL HTTP E2E: transaksi dan sesi bertahan setelah restart server',async()=>{
  const port=45000+Math.floor(Math.random()*1000),base=`http://127.0.0.1:${port}`;let proc=startServer(port),cookie,csrf,doc,child,customer;
  try{
    await waitReady(base,proc);
    // Sprint 8B: liveness terpisah dari readiness — tanpa auth, tanpa detail sensitif.
    let response=await fetch(`${base}/api/live`);assert.equal(response.status,200);let body=await response.json();assert.equal(body.ok,true);assert.deepEqual(Object.keys(body).sort(),['at','ok','uptimeSeconds']);
    // Owner kini ber-MFA (penegakan B4): login helper menyelesaikan langkah TOTP.
    {const dbc=new Client({connectionString:process.env.DATABASE_URL});await dbc.connect();await dbc.query("SELECT set_config('app.is_system','on',false),set_config('app.is_platform','on',false),set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',false)");
     try{const s=await loginHttp(base,process.env.MAT_BOOTSTRAP_OWNER_USERNAME,process.env.MAT_BOOTSTRAP_OWNER_PASSWORD,dbc);cookie=s.cookie;csrf=s.csrf;}finally{await dbc.end();}}
    const contracts=[
      ['/api/dashboard',x=>x.kpi&&x.health&&x.attention&&Array.isArray(x.activeJobs)],['/api/approvals',x=>Array.isArray(x.items)],['/api/notifications',x=>Array.isArray(x.items)],
      ['/api/my-work',x=>x.waitingForMe&&x.createdByMe&&x.returnedForRevision&&x.overdue&&x.failedJobs&&x.actionRequired&&Array.isArray(x.waitingForMe.items)],
      ['/api/customers',x=>Array.isArray(x.items)],['/api/suppliers',x=>Array.isArray(x.items)],['/api/products',x=>Array.isArray(x.items)],['/api/employees',x=>Array.isArray(x.items)],['/api/inventory',x=>Array.isArray(x.items)],
      ['/api/accounting/summary',x=>x.profitLoss&&Array.isArray(x.trialBalance)],['/api/tax/summary',x=>Array.isArray(x.deadlines)&&Array.isArray(x.documents)],['/api/audit',x=>Array.isArray(x.items)],['/api/jobs',x=>Array.isArray(x.items)],
      ['/api/system/users',x=>Array.isArray(x.items)],['/api/system/settings',x=>x.company?.bank&&Array.isArray(x.approvalMatrix)],['/api/system/monitoring',x=>x.api&&x.storage&&x.security&&x.jobs&&x.sse],['/api/system/self-test',x=>Array.isArray(x.results)&&typeof x.releaseBlocked==='boolean'],['/api/auth/devices',x=>Array.isArray(x.items)]
    ];
    for(const [endpoint,valid] of contracts){response=await fetch(`${base}${endpoint}`,{headers:{cookie}});assert.equal(response.status,200,endpoint);body=await response.json();assert.ok(valid(body),`Kontrak tidak cocok: ${endpoint}`);}
    response=await fetch(`${base}/api/documents`,{method:'POST',headers:{cookie,'content-type':'application/json','x-csrf-token':csrf,'idempotency-key':`http-e2e-${Date.now()}`},body:JSON.stringify({type:'QUOTATION',title:'HTTP persistence test',amount:125000,payload:{source:'automated-test'}})});assert.equal(response.status,201);doc=await response.json();assert.equal(doc.status,'DRAFT');
    response=await fetch(`${base}/api/documents/${doc.id}`,{method:'PATCH',headers:{cookie,'content-type':'application/json','x-csrf-token':csrf},body:JSON.stringify({version:doc.version,title:'HTTP persistence updated'})});assert.equal(response.status,200);doc=await response.json();
    for(const action of ['submit','approve','start','complete','close']){const actionBody=action==='approve'?{action,reason:'Controlled SoD override for HTTP persistence test',pin:process.env.MAT_BOOTSTRAP_OWNER_PIN}:{action};response=await fetch(`${base}/api/documents/${doc.id}/action`,{method:'POST',headers:{cookie,'content-type':'application/json','x-csrf-token':csrf,'idempotency-key':`http-e2e-${action}-${Date.now()}`},body:JSON.stringify(actionBody)});if(response.status!==200)throw new Error(`${action}: ${await response.text()}`);doc=await response.json();}
    assert.equal(doc.status,'CLOSED');
    response=await fetch(`${base}/api/documents/${doc.id}/convert`,{method:'POST',headers:{cookie,'content-type':'application/json','x-csrf-token':csrf,'idempotency-key':`http-convert-${Date.now()}`},body:'{}'});assert.equal(response.status,201);body=await response.json();child=body.child;assert.equal(child.documentType,'SALES_ORDER');
    response=await fetch(`${base}/api/documents/${doc.id}`,{headers:{cookie}});body=await response.json();assert.equal(response.status,200);assert.equal(body.relations.length,1);
    response=await fetch(`${base}/api/customers`,{method:'POST',headers:{cookie,'content-type':'application/json','x-csrf-token':csrf},body:JSON.stringify({code:`HTTP-${Date.now()}`,name:'HTTP Master Test',city:'Bekasi'})});assert.equal(response.status,201);customer=await response.json();response=await fetch(`${base}/api/customers/${customer.id}`,{method:'PATCH',headers:{cookie,'content-type':'application/json','x-csrf-token':csrf},body:JSON.stringify({city:'Jakarta'})});body=await response.json();assert.equal(response.status,200);assert.equal(body.city,'Jakarta');
    await stop(proc);proc=startServer(port);await waitReady(base,proc);
    response=await fetch(`${base}/api/auth/session`,{headers:{cookie}});assert.equal(response.status,200);body=await response.json();assert.ok(body.user);assert.ok(body.csrfToken);
    response=await fetch(`${base}/api/documents/${doc.id}`,{headers:{cookie}});assert.equal(response.status,200);body=await response.json();assert.equal(body.title,'HTTP persistence updated');assert.equal(body.status,'CLOSED');assert.equal(body.version,7);
  }finally{
    await stop(proc);if(doc){const admin=new Client({connectionString:process.env.MIGRATION_DATABASE_URL});await admin.connect();try{await admin.query(`DELETE FROM idempotency_records WHERE operation LIKE $1 OR response_body->>'id'=$2`,[`documents.convert:${doc.id}%`,doc.id]);if(child){await admin.query('DELETE FROM document_lines WHERE document_id=$1',[child.id]);await admin.query('DELETE FROM document_relations WHERE parent_document_id=$1 OR child_document_id=$1',[child.id]);await admin.query('DELETE FROM audit_logs WHERE entity_id=$1',[child.id]);await admin.query('DELETE FROM business_documents WHERE id=$1',[child.id]);}await admin.query('DELETE FROM document_lines WHERE document_id=$1',[doc.id]);await admin.query('DELETE FROM audit_logs WHERE entity_id=$1',[doc.id]);await admin.query('DELETE FROM business_documents WHERE id=$1',[doc.id]);await admin.query('DELETE FROM work_items WHERE source_event_id IN (SELECT id FROM domain_event_outbox WHERE payload->>\'entityId\'=$1)',[doc.documentNumber]);await admin.query('DELETE FROM domain_event_outbox WHERE payload->>\'entityId\'=$1',[doc.documentNumber]);if(customer){await admin.query('DELETE FROM audit_logs WHERE entity_id=$1',[customer.id]);await admin.query('DELETE FROM customers WHERE id=$1',[customer.id]);}}finally{await admin.end();}}
  }
});
httpTest('PostgreSQL HTTP auth: kegagalan login di-commit untuk lockout',async()=>{
  const admin=new Client({connectionString:process.env.MIGRATION_DATABASE_URL});await admin.connect();const id=randomUUID(),username=`lockout_${Date.now()}`,password='Valid!Password-For-Test-9281';let proc;
  try{const branch=(await admin.query('SELECT id FROM branches ORDER BY created_at LIMIT 1')).rows[0];await admin.query(`INSERT INTO app_users(id,username,password_hash,display_name,branch_id,role,branch_scope,must_change_password) VALUES($1,$2,$3,'Lockout Test',$4,'employee',NULL,false)`,[id,username,hashPassword(password),branch.id]);await admin.query(`INSERT INTO user_role_assignments(user_id,role_code,scope_type,scope_id,status,is_primary,reason,requested_by,approved_by,approved_at) VALUES($1,'employee','BRANCH',$2,'ACTIVE',true,'HTTP auth fixture',$1,$1,now())`,[id,branch.id]);const port=46000+Math.floor(Math.random()*1000),base=`http://127.0.0.1:${port}`;proc=startServer(port);await waitReady(base,proc);for(let i=0;i<2;i++){const r=await fetch(`${base}/api/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username,password:'wrong-password'})});assert.equal(r.status,401);}const row=(await admin.query('SELECT failed_login_count FROM app_users WHERE id=$1',[id])).rows[0];assert.equal(row.failed_login_count,2);
  }finally{if(proc)await stop(proc);await admin.query('DELETE FROM login_history WHERE user_id=$1',[id]).catch(()=>{});await admin.query('DELETE FROM user_role_assignments WHERE user_id=$1',[id]).catch(()=>{});await admin.query('DELETE FROM app_users WHERE id=$1',[id]).catch(()=>{});await admin.end();}
});
httpTest('SEC-UAT-001 HTTP: penolakan reset Owner tetap tersimpan di audit',async()=>{
  const admin=new Client({connectionString:process.env.MIGRATION_DATABASE_URL});await admin.connect();
  const id=randomUUID(),username=`reset_guard_${Date.now()}`,password='Valid!Reset-Guard-Password-9281';
  let proc;
  try{
    const branch=(await admin.query('SELECT id FROM branches ORDER BY created_at LIMIT 1')).rows[0];
    const owner=(await admin.query("SELECT id FROM app_users WHERE role='owner' AND active ORDER BY created_at LIMIT 1")).rows[0];
    await admin.query(`INSERT INTO app_users(id,username,password_hash,display_name,branch_id,role,branch_scope,must_change_password,mfa_enabled)
      VALUES($1,$2,$3,'Reset Guard HTTP',$4,'system_admin','*',false,false)`,[id,username,hashPassword(password),branch.id]);
    await admin.query(`INSERT INTO user_role_assignments(user_id,role_code,scope_type,status,is_primary,reason,requested_by,approved_by,approved_at)
      VALUES($1,'system_admin','GLOBAL','ACTIVE',true,'SEC-UAT-001 HTTP fixture',$1,$1,now())`,[id]);
    const port=46500+Math.floor(Math.random()*400),base=`http://127.0.0.1:${port}`;
    proc=startServer(port);await waitReady(base,proc);
    const session=await loginHttp(base,username,password,admin);
    const response=await fetch(`${base}/api/system/users/${owner.id}/reset-password`,{
      method:'POST',
      headers:{cookie:session.cookie,'content-type':'application/json','x-csrf-token':session.csrf},
      body:JSON.stringify({reason:'Uji penolakan reset Owner dari kontrak HTTP.'})
    });
    const body=await response.json();
    assert.equal(response.status,403);
    assert.equal(body.reasonCode,'OWNER_PASSWORD_RESET_SERVER_ONLY');
    const audit=(await admin.query(`SELECT new_value FROM audit_logs
      WHERE user_id=$1 AND entity_id=$2 AND action='PASSWORD_RESET_DENIED'
      ORDER BY occurred_at DESC LIMIT 1`,[id,owner.id])).rows[0];
    assert.equal(audit.new_value.reasonCode,'OWNER_PASSWORD_RESET_SERVER_ONLY');
  }finally{
    if(proc)await stop(proc);
    await admin.query('DELETE FROM audit_logs WHERE user_id=$1',[id]).catch(()=>{});
    await admin.query('DELETE FROM login_history WHERE user_id=$1',[id]).catch(()=>{});
    await admin.query('DELETE FROM user_sessions WHERE user_id=$1',[id]).catch(()=>{});
    await admin.query('DELETE FROM user_role_assignments WHERE user_id=$1',[id]).catch(()=>{});
    await admin.query('DELETE FROM app_users WHERE id=$1',[id]).catch(()=>{});
    await admin.end();
  }
});
httpTest('PostgreSQL HTTP auth: ganti sandi wajib dan MFA TOTP lengkap',async()=>{
  const admin=new Client({connectionString:process.env.MIGRATION_DATABASE_URL});await admin.connect();const id=randomUUID(),username=`mfa_${Date.now()}`,temporary='Temporary!Password-9281',fresh='Fresh!Password-For-MFA-9281';let proc;
  try{const branch=(await admin.query('SELECT id FROM branches ORDER BY created_at LIMIT 1')).rows[0];await admin.query(`INSERT INTO app_users(id,username,password_hash,display_name,branch_id,role,branch_scope,must_change_password) VALUES($1,$2,$3,'MFA Test',$4,'employee',NULL,true)`,[id,username,hashPassword(temporary),branch.id]);await admin.query(`INSERT INTO user_role_assignments(user_id,role_code,scope_type,scope_id,status,is_primary,reason,requested_by,approved_by,approved_at) VALUES($1,'employee','BRANCH',$2,'ACTIVE',true,'HTTP MFA fixture',$1,$1,now())`,[id,branch.id]);const port=47000+Math.floor(Math.random()*1000),base=`http://127.0.0.1:${port}`;proc=startServer(port);await waitReady(base,proc);
    let response=await fetch(`${base}/api/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username,password:temporary})}),body=await response.json();assert.equal(response.status,200);assert.equal(body.passwordChangeRequired,true);assert.ok(body.changeToken);
    response=await fetch(`${base}/api/auth/change-password-required`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({changeToken:body.changeToken,newPassword:fresh})});body=await response.json();assert.equal(response.status,200);assert.ok(body.user);let cookie=response.headers.get('set-cookie').split(';')[0],csrf=body.csrfToken;
    response=await fetch(`${base}/api/auth/mfa/setup`,{method:'POST',headers:{cookie,'x-csrf-token':csrf}});body=await response.json();assert.equal(response.status,200);assert.ok(body.secret);const secret=body.secret,code=totp.hotp(secret,Math.floor(Date.now()/1000/30));
    response=await fetch(`${base}/api/auth/mfa/enable`,{method:'POST',headers:{cookie,'content-type':'application/json','x-csrf-token':csrf},body:JSON.stringify({code})});body=await response.json();assert.equal(response.status,200);assert.equal(body.recoveryCodes.length,10);const recoveryCode=body.recoveryCodes[0];
    response=await fetch(`${base}/api/auth/mfa/recovery-codes`,{headers:{cookie}});body=await response.json();assert.equal(response.status,200);assert.equal(body.remaining,10);
    response=await fetch(`${base}/api/auth/logout`,{method:'POST',headers:{cookie,'x-csrf-token':csrf}});assert.equal(response.status,200);
    response=await fetch(`${base}/api/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username,password:fresh})});body=await response.json();assert.equal(body.mfaRequired,true);assert.ok(body.mfaToken);
    response=await fetch(`${base}/api/auth/mfa`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mfaToken:body.mfaToken,code:recoveryCode})});body=await response.json();assert.equal(response.status,200);assert.ok(body.user);cookie=response.headers.get('set-cookie').split(';')[0];csrf=body.csrfToken;
    response=await fetch(`${base}/api/auth/mfa/recovery-codes`,{headers:{cookie}});body=await response.json();assert.equal(body.remaining,9,'recovery code sekali pakai harus langsung dikonsumsi');
    response=await fetch(`${base}/api/auth/logout`,{method:'POST',headers:{cookie,'x-csrf-token':csrf}});assert.equal(response.status,200);
    response=await fetch(`${base}/api/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username,password:fresh})});body=await response.json();const reusedToken=body.mfaToken;
    response=await fetch(`${base}/api/auth/mfa`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mfaToken:reusedToken,code:recoveryCode})});assert.equal(response.status,401,'recovery code bekas wajib ditolak');
    response=await fetch(`${base}/api/auth/mfa`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mfaToken:reusedToken,code:totp.hotp(secret,Math.floor(Date.now()/1000/30))})});body=await response.json();assert.equal(response.status,200);assert.ok(body.user);assert.ok(response.headers.get('set-cookie'));
  }finally{if(proc)await stop(proc);await admin.query('DELETE FROM user_sessions WHERE user_id=$1',[id]).catch(()=>{});await admin.query('DELETE FROM auth_pending WHERE user_id=$1',[id]).catch(()=>{});await admin.query('DELETE FROM login_history WHERE user_id=$1',[id]).catch(()=>{});await admin.query('DELETE FROM user_role_assignments WHERE user_id=$1',[id]).catch(()=>{});await admin.query('DELETE FROM app_users WHERE id=$1',[id]).catch(()=>{});await admin.end();}
});
httpTest('PostgreSQL HTTP master data enterprise: sub-resource, maker-checker bank, aktivasi HPP, masking, lifecycle',async()=>{
  const port=48000+Math.floor(Math.random()*1000),base=`http://127.0.0.1:${port}`;let proc=startServer(port);
  const admin=new Client({connectionString:process.env.MIGRATION_DATABASE_URL});await admin.connect();
  let supplierId,productId,employeeId;
  try{
    await waitReady(base,proc);
    // MFA-aware: akun privileged (owner) menyelesaikan TOTP; akun tanpa MFA
    // (UAT standar) langsung mendapat sesi. Rahasia TOTP dibaca via admin client.
    const login=(u,p)=>loginHttp(base,u,p,admin);
    const owner=await login(process.env.MAT_BOOTSTRAP_OWNER_USERNAME,process.env.MAT_BOOTSTRAP_OWNER_PASSWORD);
    const call=(path,sess,method='GET',body)=>fetch(`${base}${path}`,{method,headers:{cookie:sess.cookie,'content-type':'application/json',...(method!=='GET'?{'x-csrf-token':sess.csrf,'idempotency-key':randomUUID()}:{})},body:body?JSON.stringify(body):undefined});

    supplierId=(await (await call('/api/suppliers',owner,'POST',{code:`SUP-${Date.now()}`,name:'Supplier Uji Enterprise',category:'Steel'})).json()).id;
    productId=(await (await call('/api/products',owner,'POST',{code:`PRD-${Date.now()}`,name:'Produk Uji Enterprise',uom:'unit',hpp:1000,price:2000})).json()).id;
    const emp=(await admin.query('SELECT id FROM employees LIMIT 1')).rows[0];employeeId=emp.id;

    // Overview memuat subCounts.
    let r=await call(`/api/masters/suppliers/${supplierId}`,owner);let b=await r.json();assert.equal(r.status,200);assert.ok(b.subCounts,'overview harus punya subCounts');

    // Bank supplier: maker-checker. Owner mengusulkan.
    r=await call(`/api/masters/suppliers/${supplierId}/bank-accounts`,owner,'POST',{bankName:'Bank Uji',accountNumber:'1234567890',accountHolder:'Supplier Uji',changeReason:'Rekening awal'});b=await r.json();assert.equal(r.status,201);const bankId=b.id;assert.equal(b.verificationStatus,'PENDING_VERIFICATION');assert.equal(b.paymentHold,true);
    // Maker == checker ditolak (SoD).
    r=await call(`/api/masters/suppliers/${supplierId}/bank-accounts/${bankId}/approve`,owner,'POST',{});assert.equal(r.status,403,'pengusul tidak boleh menyetujui sendiri');
    // Checker berbeda (finance) menyetujui.
    let finance;try{finance=await login('finance_uat',process.env.MAT_UAT_DEFAULT_PASSWORD||'x');}catch{finance=null;}
    if(finance){r=await call(`/api/masters/suppliers/${supplierId}/bank-accounts/${bankId}/approve`,finance,'POST',{});if(r.status===200){b=await r.json();assert.equal(b.verificationStatus,'VERIFIED');assert.equal(b.paymentHold,false);}}

    // Riwayat harga supplier append-only: revisi bertambah.
    await call(`/api/masters/suppliers/${supplierId}/price-history`,owner,'POST',{materialDesc:'Plat SS400',uom:'lembar',price:100000,effectiveFrom:'2026-07-01'});
    r=await call(`/api/masters/suppliers/${supplierId}/price-history`,owner,'POST',{materialDesc:'Plat SS400',uom:'lembar',price:110000,effectiveFrom:'2026-07-10'});b=await r.json();assert.equal(b.revisionNo,2,'revisi harga bertambah, tidak menimpa');
    r=await call(`/api/masters/suppliers/${supplierId}/price-history`,owner);b=await r.json();assert.equal(b.items.length,2);assert.equal(b.items.filter(x=>x.status==='ACTIVE').length,1,'hanya satu harga ACTIVE');

    // HPP versioning: buat revisi, ajukan→setujui→aktifkan, products.hpp jadi snapshot.
    r=await call(`/api/masters/products/${productId}/cost-revisions`,owner,'POST',{costRawMaterial:500,costLabor:300,costOverhead:200});b=await r.json();assert.equal(r.status,201);const revId=b.id;assert.equal(Number(b.totalCost),1000,'total HPP = jumlah komponen');
    await call(`/api/masters/products/${productId}/cost-revisions/${revId}/review`,owner,'POST',{});
    await call(`/api/masters/products/${productId}/cost-revisions/${revId}/approve`,owner,'POST',{});
    r=await call(`/api/masters/products/${productId}/cost-revisions/${revId}/activate`,owner,'POST',{});b=await r.json();assert.equal(r.status,200);assert.equal(b.status,'ACTIVE');
    const prod=(await admin.query('SELECT hpp FROM products WHERE id=$1',[productId])).rows[0];assert.equal(Number(prod.hpp),1000,'Active HPP menjadi snapshot products.hpp');

    // Masking gaji: employee tanpa izin payroll melihat kompensasi tertutup.
    let production;try{production=await login('production_uat',process.env.MAT_UAT_DEFAULT_PASSWORD||'x');}catch{production=null;}
    if(production){r=await call(`/api/masters/employees/${employeeId}/compensation`,production);assert.equal(r.status,403,'kompensasi butuh izin payroll');}

    // Lifecycle MDM: ACTIVE→suspend butuh alasan.
    r=await call(`/api/masters/suppliers/${supplierId}/lifecycle`,owner,'POST',{action:'suspend'});assert.equal(r.status,422,'suspend butuh alasan');
    r=await call(`/api/masters/suppliers/${supplierId}/lifecycle`,owner,'POST',{action:'suspend',reason:'Uji lifecycle'});b=await r.json();assert.equal(r.status,200);assert.equal(b.lifecycleStatus,'SUSPENDED');
  }finally{
    await stop(proc);
    if(supplierId){await admin.query('DELETE FROM supplier_price_history WHERE supplier_id=$1',[supplierId]).catch(()=>{});await admin.query('DELETE FROM supplier_bank_accounts WHERE supplier_id=$1',[supplierId]).catch(()=>{});await admin.query('DELETE FROM audit_logs WHERE entity_id=$1',[supplierId]).catch(()=>{});await admin.query('DELETE FROM suppliers WHERE id=$1',[supplierId]).catch(()=>{});}
    if(productId){await admin.query('DELETE FROM product_cost_revisions WHERE product_id=$1',[productId]).catch(()=>{});await admin.query('DELETE FROM audit_logs WHERE entity_id=$1',[productId]).catch(()=>{});await admin.query('DELETE FROM products WHERE id=$1',[productId]).catch(()=>{});}
    await admin.end();
  }
});
