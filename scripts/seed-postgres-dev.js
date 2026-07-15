'use strict';
const env=require('../backend/core/env');env.loadEnv();env.assertSeedAllowed('development');
const {Client}=require('pg');
const {randomUUID}=require('node:crypto');
const {hashPassword}=require('../backend/core/auth');

(async()=>{
  const username=process.env.MAT_BOOTSTRAP_OWNER_USERNAME,password=process.env.MAT_BOOTSTRAP_OWNER_PASSWORD,pin=process.env.MAT_BOOTSTRAP_OWNER_PIN;
  if(!username||!password||password.length<16||!/^[0-9]{8,}$/.test(pin||''))throw new Error('Credential bootstrap owner tidak memenuhi kebijakan.');
  const client=new Client({connectionString:process.env.MIGRATION_DATABASE_URL});await client.connect();
  try{
    await client.query('BEGIN');
    let branch=(await client.query("SELECT id FROM branches WHERE code='HO'")).rows[0];
    if(!branch){branch={id:randomUUID()};await client.query('INSERT INTO branches(id,code,name,active) VALUES($1,$2,$3,true)',[branch.id,'HO','Head Office Bekasi']);}
    const exists=await client.query('SELECT id FROM app_users WHERE lower(username)=lower($1)',[username]);
    const ownerId=exists.rows[0]?.id||randomUUID();
    if(!exists.rowCount)await client.query(`INSERT INTO app_users(id,username,password_hash,display_name,branch_id,role,department,job_title,branch_scope,owner_pin_hash,mfa_enabled,must_change_password)
      VALUES($1,$2,$3,$4,$5,'owner','management','Owner & Direktur Utama','*',$6,false,false)`,
      [ownerId,username,hashPassword(password),'Andi Rahman',branch.id,hashPassword(pin)]);
    const assignment=await client.query(`SELECT id FROM user_role_assignments WHERE user_id=$1 AND status='ACTIVE' AND is_primary`,[ownerId]);
    if(!assignment.rowCount)await client.query(`INSERT INTO user_role_assignments(user_id,role_code,scope_type,status,is_primary,reason,requested_by,approved_by,approved_at) VALUES($1,'owner','GLOBAL','ACTIVE',true,'Development bootstrap owner',$1,$1,now())`,[ownerId]);
    await client.query('COMMIT');
    console.log(JSON.stringify({seeded:true,ownerCreated:!exists.rowCount,username,credentialsSource:'.env'}));
  }catch(error){await client.query('ROLLBACK');throw error;}finally{await client.end();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
