'use strict';
const { randomUUID, randomBytes, createHash } = require('node:crypto');
const { hashPassword, verifyPassword } = require('../../../core/auth');
const { AppError } = require('../../../core/errors');
const { grantsFor } = require('../../../core/permissions');
const totp = require('../../../core/totp');

const SESSION_IDLE_MS=60*60*1000,SESSION_ABSOLUTE_MS=8*60*60*1000,LOCK_THRESHOLD=5,LOCK_WINDOW_MS=15*60*1000;
const rawToken=(bytes=32)=>randomBytes(bytes).toString('hex');
const digest=(value)=>createHash('sha256').update(String(value)).digest('hex');
const cipherKey=()=>createHash('sha256').update(process.env.MAT_MFA_ENCRYPTION_KEY||process.env.DATABASE_URL||'mat-erp-v2-development').digest();
function encryptSecret(value){const crypto=require('node:crypto'),iv=randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',cipherKey(),iv),body=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${body.toString('base64url')}`;}
function decryptSecret(value){const crypto=require('node:crypto'),[iv,tag,body]=String(value||'').split('.'),decipher=crypto.createDecipheriv('aes-256-gcm',cipherKey(),Buffer.from(iv,'base64url'));decipher.setAuthTag(Buffer.from(tag,'base64url'));return Buffer.concat([decipher.update(Buffer.from(body,'base64url')),decipher.final()]).toString('utf8');}
async function createPending(client,kind,userId,payload={}){const token=rawToken(24);await client.query('DELETE FROM auth_pending WHERE user_id=$1 AND kind=$2',[userId,kind]);await client.query(`INSERT INTO auth_pending(id,kind,user_id,token_hash,expires_at,payload) VALUES($1,$2,$3,$4,now()+interval '5 minutes',$5)`,[randomUUID(),kind,userId,digest(token),payload]);return token;}
async function findPending(client,kind,token){const row=(await client.query('SELECT * FROM auth_pending WHERE kind=$1 AND token_hash=$2 FOR UPDATE',[kind,digest(token||'')])).rows[0];if(!row)return null;if(new Date(row.expires_at).getTime()<Date.now()){await client.query('DELETE FROM auth_pending WHERE id=$1',[row.id]);return null;}return row;}
function assertPasswordPolicy(value){if(typeof value!=='string'||value.length<12||!/[A-Z]/.test(value)||!/[a-z]/.test(value)||!/[0-9]/.test(value)||!/[\W_]/.test(value))throw new AppError('VALIDATION_ERROR','Kata sandi minimal 12 karakter dan memuat huruf besar, kecil, angka, serta simbol.');}

function publicUser(row){
  if(!row)return null;
  return {id:row.id,username:row.username,displayName:row.display_name,role:row.role,department:row.department,
    jobTitle:row.job_title,branchId:row.branch_id,branchName:row.branch_name,branchScope:row.branch_scope,employeeId:row.employee_id,
    active:row.active,mfaEnabled:row.mfa_enabled,mfaActive:!!(row.mfa_enabled&&row.totp_secret_ciphertext),
    mustChangePassword:row.must_change_password,lastLoginAt:row.last_login_at};
}

async function createSession(client,user,{ip,device}={}){
  const token=rawToken(32),csrfToken=rawToken(16),id=randomUUID();
  const expiresAt=new Date(Date.now()+SESSION_ABSOLUTE_MS);
  await client.query(`INSERT INTO user_sessions(id,user_id,token_hash,csrf_token_hash,expires_at,ip,device)
    VALUES($1,$2,$3,$4,$5,$6,$7)`,[id,user.id,digest(token),digest(csrfToken),expiresAt,ip||null,(device||'unknown').slice(0,160)]);
  return {id,token,csrfToken,userId:user.id,createdAt:new Date().toISOString(),lastSeenAt:new Date().toISOString(),expiresAt:expiresAt.toISOString(),ip:ip||null,device:device||'unknown',active:true};
}

async function login(client,{username,password,ip,device}){
  const result=await client.query(`SELECT u.*,b.name branch_name FROM app_users u LEFT JOIN branches b ON b.id=u.branch_id
    WHERE lower(u.username)=lower($1) FOR UPDATE OF u`,[username]);
  const row=result.rows[0];
  const fail=async(code='AUTH_FAILED',detail)=>{
    await client.query('INSERT INTO login_history(user_id,username_attempted,succeeded,ip,device) VALUES($1,$2,false,$3,$4)',[row?.id||null,username,ip||null,(device||'unknown').slice(0,160)]);
    throw new AppError(code,detail);
  };
  if(!row||!row.active)await fail();
  if(row.locked_until&&new Date(row.locked_until).getTime()>Date.now())await fail('ACCOUNT_LOCKED',`Akun terkunci hingga ${new Date(row.locked_until).toLocaleTimeString('id-ID')}.`);
  if(!verifyPassword(password,row.password_hash)){
    const count=Number(row.failed_login_count||0)+1;
    await client.query(`UPDATE app_users SET failed_login_count=$2,locked_until=$3,updated_at=now() WHERE id=$1`,
      [row.id,count>=LOCK_THRESHOLD?0:count,count>=LOCK_THRESHOLD?new Date(Date.now()+LOCK_WINDOW_MS):null]);
    await fail();
  }
  await client.query('UPDATE app_users SET failed_login_count=0,locked_until=NULL,last_login_at=now(),updated_at=now() WHERE id=$1',[row.id]);
  await client.query('INSERT INTO login_history(user_id,username_attempted,succeeded,ip,device) VALUES($1,$2,true,$3,$4)',[row.id,username,ip||null,(device||'unknown').slice(0,160)]);
  const user=publicUser(row);
  if(row.must_change_password) return {passwordChangeRequired:true,changeToken:await createPending(client,'password_change',row.id)};
  if(row.mfa_enabled&&row.totp_secret_ciphertext)return {mfaRequired:true,mfaToken:await createPending(client,'mfa',row.id)};
  const session=await createSession(client,user,{ip,device});
  return {session,user,permissions:[...grantsFor(user.role)]};
}

async function resolveSession(client,plainToken){
  if(!plainToken)return null;
  const result=await client.query(`SELECT s.*,u.id app_user_id,u.username,u.display_name,u.role,u.department,u.job_title,u.branch_id,u.branch_scope,
    u.active user_active,u.mfa_enabled,u.totp_secret_ciphertext,u.must_change_password,u.last_login_at,b.name branch_name
    FROM user_sessions s JOIN app_users u ON u.id=s.user_id LEFT JOIN branches b ON b.id=u.branch_id
    WHERE s.token_hash=$1 AND s.active=true FOR UPDATE OF s`,[digest(plainToken)]);
  const row=result.rows[0];if(!row||!row.user_active)return null;
  const now=Date.now();
  if(now>new Date(row.expires_at).getTime()||now>new Date(row.last_seen_at).getTime()+SESSION_IDLE_MS){
    await client.query("UPDATE user_sessions SET active=false,ended_at=now(),end_reason='expired' WHERE id=$1",[row.id]);return null;
  }
  await client.query('UPDATE user_sessions SET last_seen_at=now() WHERE id=$1',[row.id]);
  const user=publicUser({...row,id:row.app_user_id,active:row.user_active});
  return {session:{id:row.id,userId:row.user_id,csrfTokenHash:row.csrf_token_hash,createdAt:row.created_at,lastSeenAt:row.last_seen_at,expiresAt:row.expires_at,ip:row.ip,device:row.device,active:true},user};
}

async function verifyCsrf(client,sessionId,plainToken){
  const row=(await client.query('SELECT csrf_token_hash FROM user_sessions WHERE id=$1 AND active=true',[sessionId])).rows[0];
  return !!row&&row.csrf_token_hash===digest(plainToken||'');
}
async function rotateCsrf(client,sessionId){const csrfToken=rawToken(16);await client.query('UPDATE user_sessions SET csrf_token_hash=$2 WHERE id=$1 AND active=true',[sessionId,digest(csrfToken)]);return csrfToken;}
async function completeMfa(client,{mfaToken,code,ip,device}){const pending=await findPending(client,'mfa',mfaToken);if(!pending)throw new AppError('SESSION_EXPIRED','Sesi MFA kedaluwarsa. Masuk ulang.');const row=(await client.query(`SELECT u.*,b.name branch_name FROM app_users u LEFT JOIN branches b ON b.id=u.branch_id WHERE u.id=$1`,[pending.user_id])).rows[0];let valid=false;try{valid=!!row?.totp_secret_ciphertext&&totp.verify(decryptSecret(row.totp_secret_ciphertext),code);}catch{}if(!valid){const attempts=Number(pending.attempts)+1;if(attempts>=5)await client.query('DELETE FROM auth_pending WHERE id=$1',[pending.id]);else await client.query('UPDATE auth_pending SET attempts=$2 WHERE id=$1',[pending.id,attempts]);throw new AppError('AUTH_FAILED','Kode autentikator tidak valid.');}await client.query('DELETE FROM auth_pending WHERE id=$1',[pending.id]);const user=publicUser(row),session=await createSession(client,user,{ip,device});return{session,user,permissions:[...grantsFor(user.role)]};}
async function changePasswordWithToken(client,{changeToken,newPassword,ip,device}){const pending=await findPending(client,'password_change',changeToken);if(!pending)throw new AppError('SESSION_EXPIRED','Sesi ganti sandi kedaluwarsa. Masuk ulang.');assertPasswordPolicy(newPassword);await client.query('UPDATE app_users SET password_hash=$2,must_change_password=false,updated_at=now() WHERE id=$1',[pending.user_id,hashPassword(newPassword)]);await client.query('DELETE FROM auth_pending WHERE id=$1',[pending.id]);const row=(await client.query(`SELECT u.*,b.name branch_name FROM app_users u LEFT JOIN branches b ON b.id=u.branch_id WHERE u.id=$1`,[pending.user_id])).rows[0];if(row.mfa_enabled&&row.totp_secret_ciphertext)return{mfaRequired:true,mfaToken:await createPending(client,'mfa',row.id)};const user=publicUser(row),session=await createSession(client,user,{ip,device});return{session,user,permissions:[...grantsFor(user.role)]};}
async function changeOwnPassword(client,user,currentPassword,newPassword){const row=(await client.query('SELECT password_hash FROM app_users WHERE id=$1 FOR UPDATE',[user.id])).rows[0];if(!verifyPassword(currentPassword||'',row?.password_hash))throw new AppError('AUTH_FAILED','Kata sandi saat ini salah.');assertPasswordPolicy(newPassword);await client.query('UPDATE app_users SET password_hash=$2,updated_at=now() WHERE id=$1',[user.id,hashPassword(newPassword)]);}
async function startMfaSetup(client,user){const secret=totp.generateSecret();await createPending(client,'mfa_setup',user.id,{secretCiphertext:encryptSecret(secret)});return{secret,otpauthUrl:totp.otpauthUrl(secret,user.username)};}
async function enableMfa(client,user,code){const pending=(await client.query("SELECT * FROM auth_pending WHERE user_id=$1 AND kind='mfa_setup' AND expires_at>now() ORDER BY created_at DESC LIMIT 1 FOR UPDATE",[user.id])).rows[0];if(!pending)throw new AppError('VALIDATION_ERROR','Mulai pendaftaran MFA terlebih dahulu.');const secret=decryptSecret(pending.payload.secretCiphertext);if(!totp.verify(secret,code))throw new AppError('AUTH_FAILED','Kode autentikator tidak valid. Periksa jam perangkat.');await client.query('UPDATE app_users SET totp_secret_ciphertext=$2,mfa_enabled=true,updated_at=now() WHERE id=$1',[user.id,encryptSecret(secret)]);await client.query('DELETE FROM auth_pending WHERE id=$1',[pending.id]);}
async function disableMfa(client,user,password){const row=(await client.query('SELECT password_hash FROM app_users WHERE id=$1 FOR UPDATE',[user.id])).rows[0];if(!verifyPassword(password||'',row?.password_hash))throw new AppError('AUTH_FAILED','Kata sandi salah.');await client.query('UPDATE app_users SET totp_secret_ciphertext=NULL,mfa_enabled=false,updated_at=now() WHERE id=$1',[user.id]);await client.query("DELETE FROM auth_pending WHERE user_id=$1 AND kind IN('mfa','mfa_setup')",[user.id]);}
async function logout(client,sessionId){await client.query("UPDATE user_sessions SET active=false,ended_at=now(),end_reason='logout' WHERE id=$1",[sessionId]);}
async function logoutAll(client,userId){return client.query("UPDATE user_sessions SET active=false,ended_at=now(),end_reason='logout_all' WHERE user_id=$1 AND active=true",[userId]);}
async function devices(client,userId){return (await client.query(`SELECT id,created_at,last_seen_at,expires_at,ip,device,active,ended_at,end_reason
  FROM user_sessions WHERE user_id=$1 ORDER BY last_seen_at DESC LIMIT 20`,[userId])).rows;}

module.exports={SESSION_IDLE_MS,SESSION_ABSOLUTE_MS,digest,publicUser,createSession,login,resolveSession,verifyCsrf,rotateCsrf,completeMfa,changePasswordWithToken,changeOwnPassword,startMfaSetup,enableMfa,disableMfa,logout,logoutAll,devices,hashPassword};
