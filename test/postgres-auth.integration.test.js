'use strict';
require('../backend/core/env').loadEnv();
const test=require('node:test');const assert=require('node:assert/strict');const {Client}=require('pg');
const auth=require('../backend/infrastructure/database/repositories/auth');
const {currentTotp}=require('./helpers/mfa-login');

test('PostgreSQL auth: hashed session bertahan lintas koneksi dan dapat dicabut',async()=>{
  const app=()=>new Client({connectionString:process.env.DATABASE_URL});
  const first=app();await first.connect();let login;
  try{await first.query('BEGIN');
    login=await auth.login(first,{username:process.env.MAT_BOOTSTRAP_OWNER_USERNAME,password:process.env.MAT_BOOTSTRAP_OWNER_PASSWORD,ip:'127.0.0.1',device:'integration'});
    // Owner ber-MFA (penegakan B4): selesaikan langkah TOTP untuk memperoleh sesi.
    if(login.mfaRequired){const code=await currentTotp(first,process.env.MAT_BOOTSTRAP_OWNER_USERNAME);
      login=await auth.completeMfa(first,{mfaToken:login.mfaToken,code,ip:'127.0.0.1',device:'integration'});}
    await first.query('COMMIT');}
  catch(error){await first.query('ROLLBACK');throw error;}finally{await first.end();}
  assert.ok(login.session.token);assert.ok(login.session.csrfToken);assert.equal(login.user.role,'owner');

  const second=app();await second.connect();
  try{
    await second.query('BEGIN');const resolved=await auth.resolveSession(second,login.session.token);await second.query('COMMIT');
    assert.equal(resolved.user.id,login.user.id);
    assert.equal(await auth.verifyCsrf(second,resolved.session.id,login.session.csrfToken),true);
    const stored=(await second.query('SELECT token_hash,csrf_token_hash FROM user_sessions WHERE id=$1',[resolved.session.id])).rows[0];
    assert.notEqual(stored.token_hash,login.session.token);assert.notEqual(stored.csrf_token_hash,login.session.csrfToken);
    await auth.logout(second,resolved.session.id);
    await second.query('BEGIN');const gone=await auth.resolveSession(second,login.session.token);await second.query('COMMIT');assert.equal(gone,null);
  }finally{await second.end();}
});
