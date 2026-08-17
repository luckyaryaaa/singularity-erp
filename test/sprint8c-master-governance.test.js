'use strict';
require('../backend/core/env').loadEnv();
const test=require('node:test');
const assert=require('node:assert/strict');
const {Client}=require('pg');
const {randomUUID}=require('node:crypto');
const runtime=require('../backend/infrastructure/database/repositories/runtime');
const operations=require('../backend/infrastructure/database/repositories/operations');
const masterData=require('../backend/infrastructure/database/repositories/master-data');
const governance=require('../backend/infrastructure/database/repositories/master-governance');

const dbTest=process.env.DATABASE_URL?test:test.skip;
async function rollback(fn){const client=new Client({connectionString:process.env.DATABASE_URL});await client.connect();try{await client.query('BEGIN'); await client.query("SELECT set_config('app.is_system','on',true),set_config('app.is_platform','on',true),set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true)");await fn(client);}finally{await client.query('ROLLBACK').catch(()=>{});await client.end();}}
async function owner(client){const row=(await client.query(`SELECT u.*,b.legal_entity_id FROM app_users u JOIN branches b ON b.id=u.branch_id WHERE u.role='owner' AND b.legal_entity_id IS NOT NULL LIMIT 1`)).rows[0];return{id:row.id,role:row.role,branchId:row.branch_id,branchScope:'*',legalEntityId:row.legal_entity_id};}
const code=(prefix)=>`${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2,5)}`.slice(0,20).toUpperCase();

dbTest('Sprint 8C: transaksi multi-currency menyimpan FX dan cost-center snapshot',async()=>rollback(async(client)=>{
  const user=await owner(client),today=new Date().toISOString().slice(0,10);
  // P0-G: kurs melewati maker-checker — usulan oleh maker, disetujui checker
  // yang BERBEDA. Kurs baru aktif setelah persetujuan.
  const maker=(await client.query(`INSERT INTO app_users(id,username,password_hash,display_name,branch_id,role,branch_scope,must_change_password) VALUES($1,$2,'x','FX Maker',$3,'accounting','*',false) RETURNING id`,[randomUUID(),`fxmaker-${Date.now()}`,user.branchId])).rows[0];
  const proposal=await governance.createExchangeRate(client,{fromCurrency:'USD',toCurrency:'IDR',effectiveDate:today,rate:16000,source:'SPRINT-8C-TEST'},{id:maker.id,role:'accounting',branchId:user.branchId,branchScope:'*'});
  assert.equal(proposal.status,'PENDING','kurs tidak boleh langsung ACTIVE');
  await assert.rejects(()=>governance.decideExchangeRate(client,{proposalId:proposal.id,decision:'approve',user:{id:maker.id}}),error=>error.code==='SOD_CONFLICT','pembuat tidak boleh menyetujui usulannya sendiri');
  const decided=await governance.decideExchangeRate(client,{proposalId:proposal.id,decision:'approve',user});
  assert.equal(decided.status,'APPROVED');assert.equal(decided.rate.status,'ACTIVE');
  const doc=await runtime.createDocument(client,{type:'INVOICE',user,title:'FX snapshot test',amount:10,transactionCurrency:'USD',currencyDate:today,requestId:randomUUID()});
  assert.equal(doc.transactionCurrency,'USD');assert.equal(doc.functionalCurrency,'IDR');assert.equal(Number(doc.exchangeRate),16000);assert.equal(Number(doc.functionalAmount),160000);
  assert.ok(doc.costCenterId,'financial document receives a valid cost center');assert.equal(doc.dimensionSnapshot.legalEntityId,user.legalEntityId);assert.equal(doc.currencySnapshot.source,'SPRINT-8C-TEST');
}));

dbTest('Sprint 8C: duplicate guard, quality score, dan normalized product variant',async()=>rollback(async(client)=>{
  const user=await owner(client),npwp=`99${Date.now()}`;
  const first=await operations.createMaster(client,'customers',{code:code('C8'),name:'Customer Governance',legalName:'PT Customer Governance',customerType:'COMPANY',npwp,ppnStatus:'PKP',currency:'IDR',paymentTermDays:30,active:true},user);
  assert.ok(first.dataQualityScore<100);assert.ok(first.qualityFlags.length>0);
  const contact=await masterData.createSub(client,'customers',first.id,'contacts',{name:'PIC Governance',email:'pic@example.test',isPrimary:true,active:true},user,randomUUID());
  await client.query('DELETE FROM customer_contacts WHERE id=$1',[contact.id]);
  await governance.refreshQuality(client,'customers',first.id);
  assert.equal(Number((await client.query(`SELECT count(*) n FROM master_data_quality_issues WHERE master_type='customers' AND master_id=$1 AND rule_code='CONTACT_MISSING' AND status='OPEN'`,[first.id])).rows[0].n),1,'resolved rule can reopen exactly once');
  await assert.rejects(()=>operations.createMaster(client,'customers',{code:code('C8D'),name:'Duplicate NPWP',legalName:'PT Duplicate',npwp,paymentTermDays:30,active:true},user),error=>error.code==='VALIDATION_ERROR');
  const product=await operations.createMaster(client,'products',{code:code('P8'),name:'Variant Parent',productType:'PRODUCT',category:'FABRICATION',uom:'PCS',hpp:100,price:150,makeOrBuy:'BUY',isStock:true,active:true},user);
  const variant=await masterData.createSub(client,'products',product.id,'variants',{variantCode:code('V8'),variantName:'Variant Zinc M',attributes:{finish:'ZINC',size:'M'},uom:'PCS',price:175,status:'ACTIVE',effectiveFrom:'2026-07-16'},user,randomUUID());
  assert.equal(variant.attributes.finish,'ZINC');
}));

dbTest('Sprint 8C: BOM cost trace menjelaskan sumber dan extended cost',async()=>rollback(async(client)=>{
  const user=await owner(client);
  const component=(await client.query(`INSERT INTO products(code,name,uom,hpp,price,product_type,category,specification) VALUES($1,'Trace Component','PCS',125,150,'RAW_MATERIAL','STEEL','Trace spec') RETURNING *`,[code('C8T')])).rows[0];
  const finished=(await client.query(`INSERT INTO products(code,name,uom,hpp,price,product_type,category,specification,make_or_buy) VALUES($1,'Trace Finished','PCS',0,500,'PRODUCT','ASSEMBLY','Trace spec','MAKE') RETURNING *`,[code('F8T')])).rows[0];
  await client.query(`INSERT INTO product_cost_revisions(product_id,revision_no,status,cost_raw_material,activated_at) VALUES($1,1,'ACTIVE',125,now())`,[component.id]);
  const bom=(await client.query(`INSERT INTO bom_headers(product_id,revision_no,status,effective_date,created_by) VALUES($1,1,'EFFECTIVE',current_date,$2) RETURNING id`,[finished.id,user.id])).rows[0];
  await client.query(`INSERT INTO bom_lines(bom_id,line_no,component_product_id,qty,uom,scrap_pct) VALUES($1,10,$2,2,'PCS',10)`,[bom.id,component.id]);
  const trace=await governance.productCostTrace(client,finished.id);
  assert.equal(trace.lines.length,1);assert.equal(trace.lines[0].cost_source,'ACTIVE_HPP');assert.equal(trace.materialCost,275);assert.equal(trace.uncostedComponents,0);
}));
