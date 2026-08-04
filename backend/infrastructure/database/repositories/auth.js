'use strict';
const { randomUUID, randomBytes, createHash } = require('node:crypto');
const { hashPassword, verifyPassword, needsRehash } = require('../../../core/password');
const { AppError } = require('../../../core/errors');
const { grantsFor } = require('../../../core/permissions');
const totp = require('../../../core/totp');
const iamGrants = require('./iam-grants');

const SESSION_IDLE_MS=60*60*1000,SESSION_ABSOLUTE_MS=8*60*60*1000,SESSION_TOUCH_MS=Math.min(Math.max(Number(process.env.MAT_SESSION_TOUCH_MS)||5*60*1000,60*1000),10*60*1000),LOCK_THRESHOLD=5,LOCK_WINDOW_MS=15*60*1000;
const rawToken=(bytes=32)=>randomBytes(bytes).toString('hex');
const digest=(value)=>createHash('sha256').update(String(value)).digest('hex');
// B2 — sejak peran tambahan berlaku, kedaluwarsanya peran SEKUNDER tidak boleh
// mengusir pengguna dari sesinya: kewenangan tambahan hilang dengan sendirinya
// karena grant di-resolve ulang tiap request. Sesi hanya diakhiri bila pengguna
// kehilangan peran PRIMARY-nya — saat itu tidak ada lagi dasar akses.
async function expireAssignments(client){
  const rows=(await client.query(`UPDATE user_role_assignments SET status='EXPIRED',revoked_at=COALESCE(revoked_at,now()),
    revoke_reason=COALESCE(revoke_reason,'Masa berlaku assignment berakhir')
    WHERE status='ACTIVE' AND effective_until<=now() RETURNING user_id,is_primary`)).rows;
  const lostPrimary=[...new Set(rows.filter(r=>r.is_primary).map(r=>r.user_id))];
  if(lostPrimary.length)await client.query(`UPDATE user_sessions SET active=false,ended_at=now(),end_reason='access_expired'
    WHERE active AND user_id=ANY($1::uuid[])`,[lostPrimary]);
  return rows.length;
}
const cipherKey=()=>createHash('sha256').update(process.env.MAT_MFA_ENCRYPTION_KEY||process.env.DATABASE_URL||'mat-erp-v2-development').digest();
function encryptSecret(value){const crypto=require('node:crypto'),iv=randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',cipherKey(),iv),body=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${body.toString('base64url')}`;}
function decryptSecret(value){const crypto=require('node:crypto'),[iv,tag,body]=String(value||'').split('.'),decipher=crypto.createDecipheriv('aes-256-gcm',cipherKey(),Buffer.from(iv,'base64url'));decipher.setAuthTag(Buffer.from(tag,'base64url'));return Buffer.concat([decipher.update(Buffer.from(body,'base64url')),decipher.final()]).toString('utf8');}
async function createPending(client,kind,userId,payload={},ttlMinutes=5){const token=rawToken(24);await client.query('DELETE FROM auth_pending WHERE user_id=$1 AND kind=$2',[userId,kind]);await client.query(`INSERT INTO auth_pending(id,kind,user_id,token_hash,expires_at,payload) VALUES($1,$2,$3,$4,now()+($6::int*interval '1 minute'),$5)`,[randomUUID(),kind,userId,digest(token),payload,ttlMinutes]);return token;}
async function issuePasswordReset(client,userId){
  const resetToken=await createPending(client,'password_change',userId,{source:'admin_reset'},30);
  return{resetToken,expiresAt:new Date(Date.now()+30*60*1000).toISOString()};
}
async function findPending(client,kind,token){const row=(await client.query('SELECT * FROM auth_pending WHERE kind=$1 AND token_hash=$2 FOR UPDATE',[kind,digest(token||'')])).rows[0];if(!row)return null;if(new Date(row.expires_at).getTime()<Date.now()){await client.query('DELETE FROM auth_pending WHERE id=$1',[row.id]);return null;}return row;}
function assertPasswordPolicy(value){if(typeof value!=='string'||value.length<12||!/[A-Z]/.test(value)||!/[a-z]/.test(value)||!/[0-9]/.test(value)||!/[\W_]/.test(value))throw new AppError('VALIDATION_ERROR','Kata sandi minimal 12 karakter dan memuat huruf besar, kecil, angka, serta simbol.');}

function publicUser(row){
  if(!row)return null;
  return {id:row.id,username:row.username,displayName:row.display_name,role:row.role,department:row.department,
    jobTitle:row.job_title,branchId:row.branch_id,branchName:row.branch_name,branchScope:row.branch_scope,employeeId:row.employee_id,
    active:row.active,mfaEnabled:row.mfa_enabled,mfaActive:!!(row.mfa_enabled&&row.totp_secret_ciphertext),
    mustChangePassword:row.must_change_password,lastLoginAt:row.last_login_at};
}

async function createSession(client,user,{ip,device,mfaVerified=false}={}){
  const token=rawToken(32),csrfToken=rawToken(16),id=randomUUID();
  const expiresAt=new Date(Date.now()+SESSION_ABSOLUTE_MS);
  await client.query(`INSERT INTO user_sessions(id,user_id,token_hash,csrf_token_hash,expires_at,ip,device,last_ip,last_device,mfa_verified_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$6,$7,CASE WHEN $8 THEN now() END)`,[id,user.id,digest(token),digest(csrfToken),expiresAt,ip||null,(device||'unknown').slice(0,160),mfaVerified]);
  return {id,token,csrfToken,userId:user.id,createdAt:new Date().toISOString(),lastSeenAt:new Date().toISOString(),expiresAt:expiresAt.toISOString(),ip:ip||null,device:device||'unknown',active:true};
}

// Respons login harus memakai sumber grant yang sama dengan resolveSession.
// Tanpa ini UI menerima baseline single-role sementara request berikutnya sudah
// memakai union role aktif dari database.
async function delegatedGrantsForUser(client,userId){
  return (await client.query(`SELECT d.id,d.permission_code,d.scope_type,d.scope_id,d.effective_until,d.delegator_user_id
    FROM authority_delegations d JOIN app_users u ON u.id=d.delegator_user_id AND u.active
    WHERE d.delegate_user_id=$1 AND d.status='ACTIVE' AND d.effective_from<=now() AND d.effective_until>now()
      AND (u.role='owner' OR EXISTS(SELECT 1 FROM user_role_assignments a JOIN role_permissions p ON p.role=a.role_code AND p.active AND p.permission_code=d.permission_code
        WHERE a.user_id=d.delegator_user_id AND a.status='ACTIVE' AND a.effective_from<=now() AND (a.effective_until IS NULL OR a.effective_until>now())))`,[userId])).rows
    .map(g=>({id:g.id,code:g.permission_code,scopeType:g.scope_type,scopeId:g.scope_id,until:g.effective_until,delegatorUserId:g.delegator_user_id}));
}
async function permissionsForUser(client,user){
  const dbGrants=await iamGrants.grantsForUser(client,user.id);
  const base=dbGrants.length?dbGrants:[...grantsFor(user.role)],delegated=await delegatedGrantsForUser(client,user.id);
  return [...new Set([...base,...delegated.map(x=>x.code)])];
}

async function login(client,{username,password,ip,device}){
  await expireAssignments(client);
  const result=await client.query(`SELECT u.*,b.name branch_name,EXISTS(SELECT 1 FROM user_role_assignments a WHERE a.user_id=u.id AND a.role_code=u.role AND a.is_primary AND a.status='ACTIVE' AND a.effective_from<=now() AND (a.effective_until IS NULL OR a.effective_until>now())) access_valid FROM app_users u LEFT JOIN branches b ON b.id=u.branch_id
    WHERE lower(u.username)=lower($1) FOR UPDATE OF u`,[username]);
  const row=result.rows[0];
  const fail=async(code='AUTH_FAILED',detail)=>{
    await client.query('INSERT INTO login_history(user_id,username_attempted,succeeded,ip,device) VALUES($1,$2,false,$3,$4)',[row?.id||null,username,ip||null,(device||'unknown').slice(0,160)]);
    throw new AppError(code,detail);
  };
  if(!row||!row.active||!row.access_valid)await fail();
  if(row.locked_until&&new Date(row.locked_until).getTime()>Date.now())await fail('ACCOUNT_LOCKED',`Akun terkunci hingga ${new Date(row.locked_until).toLocaleTimeString('id-ID')}.`);
  if(!verifyPassword(password,row.password_hash)){
    const count=Number(row.failed_login_count||0)+1;
    await client.query(`UPDATE app_users SET failed_login_count=$2,locked_until=$3,updated_at=now() WHERE id=$1`,
      [row.id,count>=LOCK_THRESHOLD?0:count,count>=LOCK_THRESHOLD?new Date(Date.now()+LOCK_WINDOW_MS):null]);
    await fail();
  }
  await client.query('UPDATE app_users SET failed_login_count=0,locked_until=NULL,last_login_at=now(),updated_at=now() WHERE id=$1',[row.id]);
  // B6: login sukses adalah satu-satunya saat plaintext tersedia — pakai untuk
  // menaikkan hash lama ke parameter terkini tanpa mengganggu pengguna.
  if(needsRehash(row.password_hash))
    await client.query('UPDATE app_users SET password_hash=$2 WHERE id=$1',[row.id,hashPassword(password)]);
  await client.query('INSERT INTO login_history(user_id,username_attempted,succeeded,ip,device) VALUES($1,$2,true,$3,$4)',[row.id,username,ip||null,(device||'unknown').slice(0,160)]);
  const user=publicUser(row);
  if(row.must_change_password) return {passwordChangeRequired:true,changeToken:await createPending(client,'password_change',row.id)};
  if(row.mfa_enabled&&row.totp_secret_ciphertext)return {mfaRequired:true,mfaToken:await createPending(client,'mfa',row.id)};
  const session=await createSession(client,user,{ip,device});
  return {session,user,permissions:await permissionsForUser(client,user)};
}

async function resolveSession(client,plainToken,{ip,device}={}){
  if(!plainToken)return null;
  await expireAssignments(client);
  const result=await client.query(`SELECT s.*,u.id app_user_id,u.username,u.display_name,u.role,u.department,u.job_title,u.branch_id,u.branch_scope,
    u.active user_active,u.mfa_enabled,u.totp_secret_ciphertext,u.must_change_password,u.last_login_at,b.name branch_name,
    EXISTS(SELECT 1 FROM user_role_assignments a WHERE a.user_id=u.id AND a.role_code=u.role AND a.is_primary AND a.status='ACTIVE' AND a.effective_from<=now() AND (a.effective_until IS NULL OR a.effective_until>now())) access_valid
    FROM user_sessions s JOIN app_users u ON u.id=s.user_id LEFT JOIN branches b ON b.id=u.branch_id
    WHERE s.token_hash=$1 AND s.active=true`,[digest(plainToken)]);
  const row=result.rows[0];if(!row||!row.user_active||!row.access_valid){if(row)await client.query("UPDATE user_sessions SET active=false,ended_at=now(),end_reason='access_expired' WHERE id=$1",[row.id]);return null;}
  const now=Date.now();
  if(now>new Date(row.expires_at).getTime()||now>new Date(row.last_seen_at).getTime()+SESSION_IDLE_MS){
    await client.query("UPDATE user_sessions SET active=false,ended_at=now(),end_reason='expired' WHERE id=$1",[row.id]);return null;
  }
  const normalizedDevice=(device||'unknown').slice(0,160),risk=[];
  if(ip&&row.last_ip&&String(row.last_ip)!==String(ip))risk.push('IP_CHANGED');
  if(device&&row.last_device&&String(row.last_device)!==normalizedDevice)risk.push('USER_AGENT_CHANGED');
  if(now-new Date(row.last_seen_at).getTime()>=SESSION_TOUCH_MS||risk.length){
    await client.query(`UPDATE user_sessions SET last_seen_at=now(),last_ip=COALESCE($2,last_ip),last_device=COALESCE($3,last_device),
      risk_flags=CASE WHEN cardinality($4::text[])>0 THEN (SELECT COALESCE(jsonb_agg(DISTINCT value),'[]'::jsonb) FROM jsonb_array_elements_text(risk_flags||to_jsonb($4::text[])) AS x(value)) ELSE risk_flags END,
      risk_updated_at=CASE WHEN cardinality($4::text[])>0 THEN now() ELSE risk_updated_at END WHERE id=$1 AND active=true`,[row.id,ip||null,device?normalizedDevice:null,risk]);
  }
  const user=publicUser({...row,id:row.app_user_id,active:row.user_active});
  // B3 — emergency access dicatat di emergency_access_overrides tetapi tidak
  // pernah dibaca runtime: break-glass tampak berhasil di UI padahal izinnya
  // tidak pernah berlaku. Hibah aktif dimuat ke objek user di sini (tempat
  // role & branch scope juga berasal) sehingga hasPermission tetap sinkron
  // dan hibah kedaluwarsa hilang sendiri pada request berikutnya.
  // B1/B2 — kewenangan efektif dari DATABASE, union seluruh peran aktif.
  // Fallback ke ROLE_GRANTS hanya bila role_permissions belum ter-seed,
  // sehingga instalasi yang belum menjalankan sinkronisasi baseline tidak
  // tiba-tiba kehilangan seluruh akses.
  const dbGrants=await iamGrants.grantsForUser(client,row.app_user_id);
  user.grants=dbGrants.length?dbGrants:[...grantsFor(row.role)];
  user.grantSource=dbGrants.length?'DATABASE':'BASELINE';
  user.roles=await iamGrants.rolesForUser(client,row.app_user_id);
  user.emergencyGrants=(await client.query(`SELECT permission_code,scope_type,scope_id,effective_until
    FROM emergency_access_overrides WHERE user_id=$1 AND status='ACTIVE'
      AND effective_from<=now() AND effective_until>now()`,[row.app_user_id])).rows
    .map(g=>({code:g.permission_code,scopeType:g.scope_type,scopeId:g.scope_id,until:g.effective_until}));
  user.delegatedGrants=await delegatedGrantsForUser(client,row.app_user_id);
  return {session:{id:row.id,userId:row.user_id,csrfTokenHash:row.csrf_token_hash,createdAt:row.created_at,lastSeenAt:row.last_seen_at,expiresAt:row.expires_at,ip:row.ip,device:row.device,mfaVerifiedAt:row.mfa_verified_at,riskFlags:[...(row.risk_flags||[]),...risk],active:true},user};
}

async function verifyCsrf(client,sessionId,plainToken){
  const row=(await client.query('SELECT csrf_token_hash,previous_csrf_token_hash,previous_csrf_valid_until FROM user_sessions WHERE id=$1 AND active=true',[sessionId])).rows[0],value=digest(plainToken||'');
  return !!row&&(row.csrf_token_hash===value||(row.previous_csrf_token_hash===value&&row.previous_csrf_valid_until&&new Date(row.previous_csrf_valid_until)>new Date()));
}
async function rotateCsrf(client,sessionId){const csrfToken=rawToken(16);await client.query(`UPDATE user_sessions SET previous_csrf_token_hash=csrf_token_hash,previous_csrf_valid_until=now()+interval '10 minutes',csrf_token_hash=$2 WHERE id=$1 AND active=true`,[sessionId,digest(csrfToken)]);return csrfToken;}
const normalizeRecoveryCode=(value)=>String(value||'').trim().toUpperCase().replace(/\s+/g,'');
function createRecoveryCode(){
  const value=randomBytes(5).toString('hex').toUpperCase();
  return `MAT-${value.slice(0,5)}-${value.slice(5)}`;
}
async function replaceRecoveryCodes(client,userId){
  const batchId=randomUUID(),codes=Array.from({length:10},createRecoveryCode);
  await client.query('DELETE FROM mfa_recovery_codes WHERE user_id=$1',[userId]);
  for(const code of codes)await client.query(
    `INSERT INTO mfa_recovery_codes(id,user_id,batch_id,code_hash)
     VALUES($1,$2,$3,$4)`,[randomUUID(),userId,batchId,digest(normalizeRecoveryCode(code))]);
  return codes;
}
async function securityNotification(client,user,{title,body,dedupeKey}){
  const operations=require('./operations');
  return operations.notify(client,{userId:user.id,category:'SYSTEM_ALERT',title,body,
    link:'#/account/security',dedupeKey:`security:${user.id}:${dedupeKey}`});
}
async function verifyMfaOrRecovery(client,row,code,ip){
  let valid=false;
  try{valid=!!row?.totp_secret_ciphertext&&totp.verify(decryptSecret(row.totp_secret_ciphertext),String(code||''));}catch{}
  if(valid)return'TOTP';
  const normalized=normalizeRecoveryCode(code);
  if(!/^MAT-[A-F0-9]{5}-[A-F0-9]{5}$/.test(normalized))return null;
  const used=(await client.query(
    `UPDATE mfa_recovery_codes SET used_at=now(),used_ip=$3
     WHERE user_id=$1 AND code_hash=$2 AND used_at IS NULL RETURNING id`,
    [row.id,digest(normalized),ip||null])).rowCount;
  return used?'RECOVERY_CODE':null;
}
async function completeMfa(client,{mfaToken,code,ip,device}){
  const pending=await findPending(client,'mfa',mfaToken);
  if(!pending)throw new AppError('SESSION_EXPIRED','Sesi MFA kedaluwarsa. Masuk ulang.');
  const row=(await client.query(`SELECT u.*,b.name branch_name,
    EXISTS(SELECT 1 FROM user_role_assignments a WHERE a.user_id=u.id AND a.role_code=u.role
      AND a.is_primary AND a.status='ACTIVE' AND a.effective_from<=now()
      AND (a.effective_until IS NULL OR a.effective_until>now())) access_valid
    FROM app_users u LEFT JOIN branches b ON b.id=u.branch_id WHERE u.id=$1`,
  [pending.user_id])).rows[0];
  if(!row?.active||!row.access_valid)throw new AppError('SESSION_EXPIRED','Assignment akses sudah tidak aktif.');
  const method=await verifyMfaOrRecovery(client,row,code,ip);
  if(!method){
    const attempts=Number(pending.attempts)+1;
    if(attempts>=5)await client.query('DELETE FROM auth_pending WHERE id=$1',[pending.id]);
    else await client.query('UPDATE auth_pending SET attempts=$2 WHERE id=$1',[pending.id,attempts]);
    throw new AppError('AUTH_FAILED','Kode autentikator atau recovery code tidak valid.');
  }
  await client.query('DELETE FROM auth_pending WHERE id=$1',[pending.id]);
  const user=publicUser(row),session=await createSession(client,user,{ip,device,mfaVerified:true});
  if(method==='RECOVERY_CODE')await securityNotification(client,user,{
    title:'Recovery code MFA digunakan',
    body:'Satu recovery code telah dipakai untuk masuk. Periksa perangkat aktif dan buat set kode baru bila bukan Anda.',
    dedupeKey:`recovery-used:${Date.now()}`
  });
  return{session,user,permissions:await permissionsForUser(client,user),mfaMethod:method};
}
async function changePasswordWithToken(client,{changeToken,newPassword,ip,device}){const pending=await findPending(client,'password_change',changeToken);if(!pending)throw new AppError('SESSION_EXPIRED','Sesi ganti sandi kedaluwarsa. Masuk ulang.');const valid=(await client.query(`SELECT 1 FROM app_users u WHERE u.id=$1 AND u.active AND EXISTS(SELECT 1 FROM user_role_assignments a WHERE a.user_id=u.id AND a.role_code=u.role AND a.is_primary AND a.status='ACTIVE' AND a.effective_from<=now() AND (a.effective_until IS NULL OR a.effective_until>now()))`,[pending.user_id])).rowCount;if(!valid)throw new AppError('SESSION_EXPIRED','Assignment akses sudah tidak aktif.');assertPasswordPolicy(newPassword);await client.query('UPDATE app_users SET password_hash=$2,must_change_password=false,updated_at=now() WHERE id=$1',[pending.user_id,hashPassword(newPassword)]);await client.query('DELETE FROM auth_pending WHERE id=$1',[pending.id]);const row=(await client.query(`SELECT u.*,b.name branch_name FROM app_users u LEFT JOIN branches b ON b.id=u.branch_id WHERE u.id=$1`,[pending.user_id])).rows[0];if(row.mfa_enabled&&row.totp_secret_ciphertext)return{mfaRequired:true,mfaToken:await createPending(client,'mfa',row.id)};const user=publicUser(row),session=await createSession(client,user,{ip,device});return{session,user,permissions:await permissionsForUser(client,user)};}
async function changeOwnPassword(client,user,currentPassword,newPassword){const row=(await client.query('SELECT password_hash FROM app_users WHERE id=$1 FOR UPDATE',[user.id])).rows[0];if(!verifyPassword(currentPassword||'',row?.password_hash))throw new AppError('AUTH_FAILED','Kata sandi saat ini salah.');assertPasswordPolicy(newPassword);await client.query('UPDATE app_users SET password_hash=$2,updated_at=now() WHERE id=$1',[user.id,hashPassword(newPassword)]);await client.query("UPDATE user_sessions SET active=false,ended_at=now(),end_reason='password_changed' WHERE user_id=$1 AND active",[user.id]);}
// Self-service: pengguna boleh memperbarui nama tampilannya sendiri. Kolom
// sensitif (peran, cabang, akses) tetap dikendalikan admin/IAM, bukan di sini.
async function updateOwnProfile(client,user,body){
  const name=String((body&&body.displayName)||'').trim();
  if(name.length<2||name.length>80)throw new AppError('VALIDATION_ERROR','Nama tampilan harus 2–80 karakter.');
  const row=(await client.query('UPDATE app_users SET display_name=$2,updated_at=now() WHERE id=$1 RETURNING id,username,display_name,role,department,job_title,branch_id',[user.id,name])).rows[0];
  if(!row)throw new AppError('RESOURCE_NOT_FOUND');
  return {id:row.id,username:row.username,displayName:row.display_name,role:row.role,department:row.department,jobTitle:row.job_title,branchId:row.branch_id};
}
async function startMfaSetup(client,user,currentCode){
  const current=(await client.query(
    'SELECT mfa_enabled,totp_secret_ciphertext FROM app_users WHERE id=$1 FOR UPDATE',[user.id])).rows[0];
  if(current?.mfa_enabled&&current.totp_secret_ciphertext){
    let valid=false;
    try{valid=totp.verify(decryptSecret(current.totp_secret_ciphertext),String(currentCode||''));}catch{}
    if(!valid)throw new AppError('AUTH_FAILED','Kode MFA aktif wajib dimasukkan sebelum mengganti faktor.');
  }
  const secret=totp.generateSecret();
  await createPending(client,'mfa_setup',user.id,{secretCiphertext:encryptSecret(secret)});
  return{secret,otpauthUrl:totp.otpauthUrl(secret,user.username),replacing:!!current?.mfa_enabled};
}
async function enableMfa(client,user,code){
  const pending=(await client.query(
    "SELECT * FROM auth_pending WHERE user_id=$1 AND kind='mfa_setup' AND expires_at>now() ORDER BY created_at DESC LIMIT 1 FOR UPDATE",
    [user.id])).rows[0];
  if(!pending)throw new AppError('VALIDATION_ERROR','Mulai pendaftaran MFA terlebih dahulu.');
  const secret=decryptSecret(pending.payload.secretCiphertext);
  if(!totp.verify(secret,String(code||'')))throw new AppError('AUTH_FAILED','Kode autentikator tidak valid. Periksa jam perangkat.');
  await client.query(
    'UPDATE app_users SET totp_secret_ciphertext=$2,mfa_enabled=true,updated_at=now() WHERE id=$1',
    [user.id,encryptSecret(secret)]);
  await client.query('DELETE FROM auth_pending WHERE id=$1',[pending.id]);
  const recoveryCodes=await replaceRecoveryCodes(client,user.id);
  await securityNotification(client,user,{
    title:'MFA berhasil diaktifkan',
    body:'Faktor autentikasi berubah dan set recovery code baru diterbitkan. Simpan kode di tempat aman.',
    dedupeKey:`mfa-enabled:${Date.now()}`
  });
  return{ok:true,recoveryCodes,remaining:recoveryCodes.length};
}
async function recoveryCodeStatus(client,userId){
  const row=(await client.query(
    `SELECT count(*) FILTER(WHERE used_at IS NULL)::int remaining,
      count(*)::int total,max(created_at) generated_at
     FROM mfa_recovery_codes WHERE user_id=$1`,[userId])).rows[0];
  return{remaining:Number(row.remaining||0),total:Number(row.total||0),generatedAt:row.generated_at||null};
}
async function regenerateRecoveryCodes(client,user,code){
  const row=(await client.query(
    'SELECT id,totp_secret_ciphertext,mfa_enabled FROM app_users WHERE id=$1 FOR UPDATE',[user.id])).rows[0];
  let valid=false;
  try{valid=!!row?.mfa_enabled&&!!row.totp_secret_ciphertext&&totp.verify(decryptSecret(row.totp_secret_ciphertext),String(code||''));}catch{}
  if(!valid)throw new AppError('AUTH_FAILED','Kode MFA aktif wajib dimasukkan untuk membuat recovery code baru.');
  const recoveryCodes=await replaceRecoveryCodes(client,user.id);
  await securityNotification(client,user,{
    title:'Recovery code MFA diperbarui',
    body:'Set recovery code lama sudah dicabut dan set baru diterbitkan.',
    dedupeKey:`recovery-regenerated:${Date.now()}`
  });
  return{ok:true,recoveryCodes,remaining:recoveryCodes.length};
}
// B4 — MFA wajib untuk akun berkewenangan tinggi. Faktor kedua adalah kendali
// utama terhadap pengambilalihan akun; mematikannya hanya dengan kata sandi
// berarti pencuri sandi dapat sekaligus melucuti pertahanannya.
const PRIVILEGED_ROLES=Object.freeze(['owner','admin','system_admin','security_admin','finance_manager','accounting']);
const mfaMandatory=(role)=>PRIVILEGED_ROLES.includes(role);

async function disableMfa(client,user,password,code){
  if(mfaMandatory(user.role))throw new AppError('PERMISSION_DENIED',`MFA wajib untuk role ${user.role} dan tidak dapat dimatikan sendiri. Hubungi security admin untuk reset terkontrol.`);
  const row=(await client.query('SELECT password_hash,totp_secret_ciphertext FROM app_users WHERE id=$1 FOR UPDATE',[user.id])).rows[0];
  if(!verifyPassword(password||'',row?.password_hash))throw new AppError('AUTH_FAILED','Kata sandi salah.');
  // Kode TOTP berjalan membuktikan pemilik faktor kedua ADA saat ini —
  // kata sandi saja tidak cukup untuk melucuti MFA.
  if(row?.totp_secret_ciphertext){
    if(!totp.verify(decryptSecret(row.totp_secret_ciphertext),String(code||'')))throw new AppError('AUTH_FAILED','Kode MFA berjalan wajib dimasukkan untuk mematikan MFA.');
  }
  await client.query('UPDATE app_users SET totp_secret_ciphertext=NULL,mfa_enabled=false,updated_at=now() WHERE id=$1',[user.id]);
  await client.query("DELETE FROM auth_pending WHERE user_id=$1 AND kind IN('mfa','mfa_setup')",[user.id]);
  await client.query('DELETE FROM mfa_recovery_codes WHERE user_id=$1',[user.id]);
  await securityNotification(client,user,{
    title:'MFA dinonaktifkan',
    body:'Faktor autentikasi dan seluruh recovery code telah dicabut. Semua sesi aktif dihentikan.',
    dedupeKey:`mfa-disabled:${Date.now()}`
  });
  // Sesi lain dihentikan: perubahan postur keamanan tidak boleh menyisakan
  // sesi yang terbentuk di bawah jaminan lama.
  await client.query("UPDATE user_sessions SET active=false,ended_at=now(),end_reason='mfa_disabled' WHERE user_id=$1 AND active",[user.id]);
}

// Step-up: aksi sensitif menuntut verifikasi MFA yang MASIH BARU pada sesi ini.
// Sebelumnya mfa_verified_at hanya dicatat dan tidak pernah dibaca — selftest
// governance mengklaim "MFA step-up" hanya karena kolomnya ada.
const MFA_STEP_UP_MS=15*60*1000;
async function assertRecentMfa(client,{user,session,action='Aksi ini'}){
  const row=(await client.query('SELECT mfa_enabled FROM app_users WHERE id=$1',[user.id])).rows[0];
  if(!row?.mfa_enabled){
    if(mfaMandatory(user.role))throw new AppError('PERMISSION_DENIED',`${action} menuntut MFA aktif — role ${user.role} wajib mendaftarkan MFA terlebih dahulu.`);
    return true;                                  // akun non-privileged tanpa MFA: kendali lain berlaku
  }
  const verifiedAt=(await client.query('SELECT mfa_verified_at FROM user_sessions WHERE id=$1',[session?.id||null])).rows[0]?.mfa_verified_at;
  if(!verifiedAt||Date.now()-new Date(verifiedAt).getTime()>MFA_STEP_UP_MS)
    throw new AppError('MFA_REQUIRED',`${action} menuntut verifikasi MFA ulang (maksimal ${MFA_STEP_UP_MS/60000} menit terakhir).`);
  return true;
}
async function logout(client,sessionId){await client.query("UPDATE user_sessions SET active=false,ended_at=now(),end_reason='logout' WHERE id=$1",[sessionId]);}
async function logoutAll(client,userId){return client.query("UPDATE user_sessions SET active=false,ended_at=now(),end_reason='logout_all' WHERE user_id=$1 AND active=true",[userId]);}
async function devices(client,userId){return (await client.query(`SELECT id,created_at,last_seen_at,expires_at,ip,device,active,ended_at,end_reason
  FROM user_sessions WHERE user_id=$1 ORDER BY last_seen_at DESC LIMIT 20`,[userId])).rows;}

module.exports={SESSION_IDLE_MS,SESSION_ABSOLUTE_MS,SESSION_TOUCH_MS,digest,expireAssignments,publicUser,createSession,delegatedGrantsForUser,permissionsForUser,login,resolveSession,verifyCsrf,rotateCsrf,completeMfa,changePasswordWithToken,changeOwnPassword,updateOwnProfile,issuePasswordReset,startMfaSetup,enableMfa,recoveryCodeStatus,regenerateRecoveryCodes,disableMfa,assertRecentMfa,mfaMandatory,PRIVILEGED_ROLES,logout,logoutAll,devices,hashPassword};
