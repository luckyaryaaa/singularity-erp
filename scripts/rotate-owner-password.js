'use strict';
require('../backend/core/env').loadEnv();
const fs=require('node:fs');const path=require('node:path');const {randomBytes,randomUUID}=require('node:crypto');const {Client}=require('pg');const {hashPassword}=require('../backend/core/auth');

const envPath=path.join(__dirname,'..','.env');
const username=process.env.MAT_BOOTSTRAP_OWNER_USERNAME;
if(!username)throw new Error('MAT_BOOTSTRAP_OWNER_USERNAME tidak ditemukan.');
const password=`Mat!9_${randomBytes(24).toString('base64url')}`;
const original=fs.readFileSync(envPath,'utf8');
const updated=/^MAT_BOOTSTRAP_OWNER_PASSWORD=.*$/m.test(original)
  ?original.replace(/^MAT_BOOTSTRAP_OWNER_PASSWORD=.*$/m,`MAT_BOOTSTRAP_OWNER_PASSWORD=${password}`)
  :`${original.trimEnd()}\nMAT_BOOTSTRAP_OWNER_PASSWORD=${password}\n`;

(async()=>{const client=new Client({connectionString:process.env.DATABASE_URL});await client.connect();try{
  await client.query('BEGIN');
  const user=(await client.query("SELECT id,branch_id FROM app_users WHERE lower(username)=lower($1) AND role='owner' FOR UPDATE",[username])).rows[0];
  if(!user)throw new Error('Akun Owner bootstrap tidak ditemukan.');
  await client.query('UPDATE app_users SET password_hash=$2,must_change_password=false,failed_login_count=0,locked_until=NULL,updated_at=now() WHERE id=$1',[user.id,hashPassword(password)]);
  await client.query("UPDATE user_sessions SET active=false,ended_at=now(),end_reason='credential_rotation' WHERE user_id=$1 AND active",[user.id]);
  await client.query('DELETE FROM auth_pending WHERE user_id=$1',[user.id]);
  await client.query(`INSERT INTO audit_logs(user_id,action,module,entity_type,entity_id,reason,request_id,branch_id) VALUES($1,'SETTINGS_CHANGE','auth','USER',$1,'Rotasi credential Owner setelah secret terekspos',$2,$3)`,[user.id,randomUUID(),user.branch_id]);
  fs.writeFileSync(envPath,updated,{encoding:'utf8',mode:0o600});
  await client.query('COMMIT');
  console.log(JSON.stringify({rotated:true,username,passwordStoredOnlyIn:'.env',sessionsRevoked:true}));
}catch(error){try{await client.query('ROLLBACK');}catch{}try{fs.writeFileSync(envPath,original,{encoding:'utf8',mode:0o600});}catch{}throw error;}finally{await client.end();}})().catch(error=>{console.error(error.message);process.exitCode=1;});
