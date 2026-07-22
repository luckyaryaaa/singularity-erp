'use strict';
require('../backend/core/env').loadEnv();
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {Client}=require('pg');
const {randomUUID}=require('node:crypto');
const operations=require('../backend/infrastructure/database/repositories/operations');
const partners=require('../backend/infrastructure/database/repositories/business-partners');

const dbTest=process.env.DATABASE_URL?test:test.skip;
async function rollback(fn){const client=new Client({connectionString:process.env.DATABASE_URL});await client.connect();try{await client.query('BEGIN');await client.query("SELECT set_config('app.is_system','on',true)");await fn(client);}finally{await client.query('ROLLBACK').catch(()=>{});await client.end();}}
async function owner(client){const row=(await client.query(`SELECT u.*,b.legal_entity_id FROM app_users u JOIN branches b ON b.id=u.branch_id WHERE u.role='owner' LIMIT 1`)).rows[0];return{id:row.id,role:'owner',branchId:row.branch_id,branchScope:'*',legalEntityId:row.legal_entity_id};}
const code=prefix=>`${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`.slice(0,20).toUpperCase();

test('Wave 3 MDM: migration reversible, RLS, lineage, dan staging tersedia',()=>{
  const root=path.join(__dirname,'..'),up=fs.readFileSync(path.join(root,'data/migrations/051_business_partner_mdm.sql'),'utf8'),down=fs.readFileSync(path.join(root,'data/migrations/051_business_partner_mdm.down.sql'),'utf8');
  for(const token of ['CREATE TABLE business_partners','business_partner_duplicate_candidates','business_partner_merge_lineage','master_import_batches','master_data_quality_rules','ENABLE ROW LEVEL SECURITY','ensure_legacy_business_partner'])assert.match(up,new RegExp(token));
  for(const token of ['DROP TABLE IF EXISTS business_partners','DROP FUNCTION IF EXISTS ensure_legacy_business_partner'])assert.match(down,new RegExp(token));
});

dbTest('Wave 3 MDM: Customer dan Supplier dengan NPWP sama memakai satu canonical party',async()=>rollback(async client=>{
  const user=await owner(client),npwp=`71${Date.now()}${Math.floor(Math.random()*1000)}`;
  const customer=await operations.createMaster(client,'customers',{code:code('CU'),name:'PT Unified Role',legalName:'PT Unified Role',customerType:'COMPANY',npwp,paymentTermDays:30,currency:'IDR',active:true},user);
  const supplier=await operations.createMaster(client,'suppliers',{code:code('SU'),name:'PT Unified Role Vendor',legalName:'PT Unified Role',supplierType:'COMPANY',npwp,category:'FABRICATION',active:true},user);
  assert.ok(customer.businessPartnerId);assert.equal(supplier.businessPartnerId,customer.businessPartnerId);
  const detail=await partners.detail(client,customer.businessPartnerId);assert.deepEqual(new Set(detail.roles.map(x=>x.roleType)),new Set(['CUSTOMER','SUPPLIER']));
}));

dbTest('Wave 3 MDM: duplicate workbench maker-checker menyimpan merge lineage tanpa menghapus sumber',async()=>rollback(async client=>{
  const checker=await owner(client);
  const makerId=randomUUID();await client.query(`INSERT INTO app_users(id,username,password_hash,display_name,branch_id,role,branch_scope,must_change_password) VALUES($1,$2,'x','MDM Maker',$3,'sales','*',false)`,[makerId,`mdm-maker-${Date.now()}`,checker.branchId]);
  const maker={id:makerId,role:'sales',branchId:checker.branchId,branchScope:'*'};
  const left=await partners.create(client,{displayName:'PT Golden Nusantara',legalName:'PT Golden Nusantara',partyType:'ORGANIZATION'},checker);
  const right=await partners.create(client,{displayName:'Golden Nusantara PT',legalName:'PT Golden Nusantara',partyType:'ORGANIZATION'},checker);
  await partners.detectDuplicates(client,maker);
  const queue=await partners.listDuplicates(client,{limit:100});const candidate=queue.items.find(x=>new Set([x.leftPartnerId,x.rightPartnerId]).has(left.id)&&new Set([x.leftPartnerId,x.rightPartnerId]).has(right.id));assert.ok(candidate);
  await assert.rejects(()=>partners.resolveDuplicate(client,{candidateId:candidate.id,decision:'MERGE',survivorPartnerId:left.id,reason:'Exact legal-name duplicate',user:maker}),error=>error.code==='SOD_CONFLICT');
  const result=await partners.resolveDuplicate(client,{candidateId:candidate.id,decision:'MERGE',survivorPartnerId:left.id,reason:'Exact legal-name duplicate',user:checker});assert.equal(result.status,'MERGED');
  const source=(await client.query('SELECT status,merged_into_id FROM business_partners WHERE id=$1',[right.id])).rows[0];assert.equal(source.status,'MERGED');assert.equal(source.merged_into_id,left.id);
  assert.equal(Number((await client.query('SELECT count(*) n FROM business_partner_merge_lineage WHERE merged_partner_id=$1',[right.id])).rows[0].n),1);
}));

dbTest('Wave 3 MDM: import staging tervalidasi, promoted, dan replay-safe',async()=>rollback(async client=>{
  const user=await owner(client),rows=[{partyType:'ORGANIZATION',displayName:`Import ${code('BP')}`,legalName:'PT Imported Golden Record'}];
  const batch=await partners.stageImport(client,{entityType:'BUSINESS_PARTNER',sourceName:'Wave 3 test',rows},user);assert.equal(batch.rowCount,1);
  const validation=await partners.validateImport(client,batch.id);assert.equal(validation.validCount,1);assert.equal(validation.invalidCount,0);
  const promoted=await partners.promoteImport(client,batch.id,user);assert.equal(promoted.status,'PROMOTED');assert.equal(promoted.promotedCount,1);
  const replay=await partners.stageImport(client,{entityType:'BUSINESS_PARTNER',sourceName:'Wave 3 replay',rows},user);assert.equal(replay.id,batch.id);assert.equal(replay.replayed,true);
}));

dbTest('Wave 3 MDM: configurable quality rule tidak menerima field/SQL arbitrer',async()=>rollback(async client=>{
  const user=await owner(client);
  await assert.rejects(()=>partners.createRule(client,{code:'UNSAFE',targetType:'BUSINESS_PARTNER',fieldName:'display_name; DROP TABLE customers',ruleType:'REQUIRED',description:'unsafe'},user),error=>error.code==='VALIDATION_ERROR');
  await partners.createRule(client,{code:code('DQ'),targetType:'BUSINESS_PARTNER',fieldName:'displayName',ruleType:'MIN_LENGTH',ruleConfig:{length:500},severity:'WARNING',description:'Nama uji harus sangat panjang'},user);
  const scan=await partners.scanRules(client,user);assert.ok(scan.recordsChecked>0);assert.ok(scan.findings>0);
}));
