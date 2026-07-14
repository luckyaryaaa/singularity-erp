'use strict';
require('../backend/core/env').loadEnv();
const {Client}=require('pg');
const {randomUUID}=require('node:crypto');
const {hashPassword}=require('../backend/core/auth');

(async()=>{
  if(process.env.NODE_ENV==='production')throw new Error('Seed development dilarang di production.');
  const username=process.env.MAT_BOOTSTRAP_OWNER_USERNAME,password=process.env.MAT_BOOTSTRAP_OWNER_PASSWORD,pin=process.env.MAT_BOOTSTRAP_OWNER_PIN;
  if(!username||!password||password.length<16||!/^[0-9]{8,}$/.test(pin||''))throw new Error('Credential bootstrap owner tidak memenuhi kebijakan.');
  const client=new Client({connectionString:process.env.MIGRATION_DATABASE_URL});await client.connect();
  try{
    await client.query('BEGIN');
    let branch=(await client.query("SELECT id FROM branches WHERE code='HO'")).rows[0];
    if(!branch){branch={id:randomUUID()};await client.query('INSERT INTO branches(id,code,name,active) VALUES($1,$2,$3,true)',[branch.id,'HO','Head Office Bekasi']);}
    const exists=await client.query('SELECT id FROM app_users WHERE lower(username)=lower($1)',[username]);
    if(!exists.rowCount)await client.query(`INSERT INTO app_users(id,username,password_hash,display_name,branch_id,role,department,job_title,branch_scope,owner_pin_hash,mfa_enabled,must_change_password)
      VALUES($1,$2,$3,$4,$5,'owner','management','Owner & Direktur Utama','*',$6,false,false)`,
      [randomUUID(),username,hashPassword(password),'Andi Rahman',branch.id,hashPassword(pin)]);
    await client.query('COMMIT');
    console.log(JSON.stringify({seeded:true,ownerCreated:!exists.rowCount,username,credentialsSource:'.env'}));
  }catch(error){await client.query('ROLLBACK');throw error;}finally{await client.end();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
