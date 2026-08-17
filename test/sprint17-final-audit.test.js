'use strict';
require('../backend/core/env').loadEnv();
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {Client}=require('pg');
const assurance=require('../backend/infrastructure/database/repositories/assurance');
const governanceRoutes=require('../backend/routes/governance');

test('R024 contract: partition maintenance dan assurance taxonomy terpasang',()=>{
  const migration=fs.readFileSync(path.join(__dirname,'../data/migrations/035_final_assurance_partition_maintenance.sql'),'utf8');
  assert.match(migration,/inventory_partition_maintenance/);
  assert.match(migration,/SECURITY DEFINER/);
  assert.match(migration,/REVOKE ALL .* FROM PUBLIC/);
  const checks=assurance.checks({
    financial:{posted:1,unbalanced:1,incomplete:0},
    inventory:{invalid_qty:0,negative_value:0,lot_exceeds_balance:0,subledger_value:100,gl_value:80,difference:20},
    payroll:{runs:1,mismatched:0},orphans:{files:0,documents:0,jobs:0,lots:0,relations:0},
    partitions:{missing:['inventory_movements_2099_01']}
  });
  assert.equal(checks.find(x=>x.name==='Financial reconciliation').status,'fail');
  assert.equal(checks.find(x=>x.name==='Inventory reconciliation').status,'warning');
  assert.equal(checks.find(x=>x.name==='Partition health').status,'blocked');
});

test('katalog 18 SOP lengkap, unik, dan tanpa placeholder',()=>{
  const dir=path.join(__dirname,'../docs/sop'),catalog=JSON.parse(fs.readFileSync(path.join(dir,'catalog.json'),'utf8'));
  assert.equal(catalog.length,18);assert.equal(new Set(catalog.map(x=>x.id)).size,18);assert.equal(new Set(catalog.map(x=>x.file)).size,18);
  for(const item of catalog){
    assert.ok(item.owner&&item.frequency&&typeof item.critical==='boolean',`${item.id}: metadata tidak lengkap`);
    const source=fs.readFileSync(path.join(dir,item.file),'utf8');
    for(const heading of ['## Tujuan','## Pemilik dan frekuensi','## Prosedur','## Evidence','## Eskalasi dan rollback'])assert.match(source,new RegExp(heading),`${item.id}: ${heading}`);
    assert.ok(source.length>=900,`${item.id}: prosedur terlalu dangkal`);
    assert.doesNotMatch(source,/\b(?:TODO|TBD|COMING SOON)\b/i,`${item.id}: placeholder dilarang`);
  }
});

const enabled=!!process.env.DATABASE_URL,dbTest=enabled?test:test.skip;
async function rollback(fn){const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();try{await c.query('BEGIN'); await c.query("SELECT set_config('app.is_system','on',true),set_config('app.is_platform','on',true),set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true)");await fn(c);}finally{await c.query('ROLLBACK').catch(()=>{});await c.end();}}
async function owner(c){return(await c.query(`SELECT id,username,display_name "displayName",role,branch_id "branchId",branch_scope "branchScope",employee_id "employeeId" FROM app_users WHERE role='owner' AND active LIMIT 1`)).rows[0];}

dbTest('final assurance membaca rekonsiliasi, partition health, dan orphan aktual',async()=>rollback(async c=>{
  const result=await assurance.evaluate(c),byName=new Map(result.checks.map(x=>[x.name,x]));
  assert.equal(byName.get('Financial reconciliation').status,'pass');
  assert.equal(byName.get('Payroll reconciliation').status,'pass');
  assert.equal(byName.get('Partition health').status,'pass');
  assert.equal(byName.get('Critical orphan detection').status,'pass');
  assert.ok(['pass','warning'].includes(byName.get('Inventory reconciliation').status));
  assert.equal(result.checks.filter(x=>x.critical&&['fail','blocked'].includes(x.status)).length,0);
}));

dbTest('runtime hanya dapat membuat rolling partition melalui fungsi terkontrol',async()=>rollback(async c=>{
  await c.query('SELECT inventory_partition_maintenance(2)');
  const now=new Date();
  for(let offset=0;offset<=2;offset++){
    const d=new Date(now.getFullYear(),now.getMonth()+offset,1),name=`inventory_movements_${d.getFullYear()}_${String(d.getMonth()+1).padStart(2,'0')}`;
    const exists=(await c.query('SELECT to_regclass($1) IS NOT NULL ok',[`public.${name}`])).rows[0].ok;
    assert.equal(exists,true,name);
  }
  const privilege=(await c.query(`SELECT has_schema_privilege(current_user,'public','CREATE') create_schema`)).rows[0];
  assert.equal(privilege.create_schema,false);
}));

dbTest('endpoint self-test mengembalikan PASS/WARNING/FAIL/BLOCKED dan tidak menutup warning sebagai PASS',async()=>rollback(async c=>{
  const user=await owner(c),result=await governanceRoutes.dispatch(c,{method:'GET'},new URL('http://localhost/api/system/self-test'),{user,session:{},requestId:'r024-test'});
  assert.ok(result.total>=20);assert.equal(result.passed+result.warnings+result.failed+result.blocked,result.total);
  assert.equal(result.criticalFailed,0);assert.equal(result.releaseBlocked,false);
  assert.ok(result.results.every(x=>['pass','warning','fail','blocked'].includes(x.status)));
  assert.ok(result.assurance?.partitions&&result.assurance?.orphans);
}));
