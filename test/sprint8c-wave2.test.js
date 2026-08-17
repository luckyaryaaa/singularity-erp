'use strict';
require('../backend/core/env').loadEnv();
const test=require('node:test');const assert=require('node:assert/strict');const {Client}=require('pg');const {randomUUID}=require('node:crypto');
const runtime=require('../backend/infrastructure/database/repositories/runtime');
const operations=require('../backend/infrastructure/database/repositories/operations');
const wizards=require('../backend/infrastructure/database/repositories/master-wizards');
const governance=require('../backend/infrastructure/database/repositories/master-governance');
const masterData=require('../backend/infrastructure/database/repositories/master-data');

const dbTest=process.env.DATABASE_URL?test:test.skip;
async function rollback(fn){const client=new Client({connectionString:process.env.DATABASE_URL});await client.connect();try{await client.query('BEGIN'); await client.query("SELECT set_config('app.is_system','on',true),set_config('app.is_platform','on',true),set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true)");await fn(client);}finally{await client.query('ROLLBACK').catch(()=>{});await client.end();}}
async function owner(client){const r=(await client.query(`SELECT u.*,b.legal_entity_id FROM app_users u JOIN branches b ON b.id=u.branch_id WHERE u.role='owner' AND b.legal_entity_id IS NOT NULL LIMIT 1`)).rows[0];return{id:r.id,role:r.role,branchId:r.branch_id,branchScope:'*',displayName:r.display_name};}
const code=(prefix)=>`${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2,5)}`.slice(0,20).toUpperCase();

dbTest('Sprint 8C Wave 2: Customer Link autosave, recovery, conflict, dan finalize atomic',async()=>rollback(async(client)=>{
  const user=await owner(client),source=await runtime.createDocument(client,{type:'CUSTOMER_INQUIRY',user,title:'Inquiry Customer Link',amount:0,requestId:randomUUID()});
  let draft=await wizards.start(client,user,{sourceDocumentId:source.id});assert.equal(draft.version,1);
  assert.equal((await wizards.recover(client,user)).id,draft.id,'draft dapat dipulihkan lintas sesi');
  draft=await wizards.save(client,user,draft.id,{expectedVersion:1,currentStep:1,payload:{source:{id:source.id,documentNumber:source.documentNumber},mode:'NEW',customer:{code:code('CL'),name:'Customer Link Test',legalName:'PT Customer Link Test',customerType:'COMPANY',npwp:`88${Date.now()}`,ppnStatus:'PKP'},contact:{name:'PIC Link',email:'link@example.test'},address:{addressType:'BILLING',address:'Jl. Integration 1',city:'Bekasi'},commercial:{}}});
  await assert.rejects(()=>wizards.save(client,user,draft.id,{expectedVersion:1,currentStep:2,payload:draft.payload}),error=>error.code==='DOCUMENT_CONFLICT');
  const customer=await wizards.finalize(client,user,draft.id,{expectedVersion:draft.version},randomUUID());
  const linked=runtime.camel((await client.query('SELECT * FROM business_documents WHERE id=$1',[source.id])).rows[0]);
  assert.equal(linked.partyId,customer.id);assert.equal(linked.partyName,customer.name);
  assert.equal(Number((await client.query('SELECT count(*) n FROM customer_contacts WHERE customer_id=$1',[customer.id])).rows[0].n),1);
  assert.equal((await wizards.finalize(client,user,draft.id,{expectedVersion:draft.version},randomUUID())).id,customer.id,'replay tidak membuat customer kedua');
}));

dbTest('Sprint 8C Wave 2: supplier score memakai PO/GR/QC/doc dan risk hold memblokir PO',async()=>rollback(async(client)=>{
  const user=await owner(client),period=new Date().toISOString().slice(0,7),future='2030-12-31';
  const makerId=randomUUID();await client.query(`INSERT INTO app_users(id,username,password_hash,display_name,branch_id,role,branch_scope,must_change_password) VALUES($1,$2,'x','Supplier Document Maker',$3,'procurement','*',false)`,[makerId,`s8doc-${Date.now()}`,user.branchId]);
  const supplier=await operations.createMaster(client,'suppliers',{code:code('S8'),name:'Supplier Score Test',legalName:'PT Supplier Score Test',supplierType:'COMPANY',category:'STEEL',ppnTreatment:'EXCLUDE',onboardingStatus:'APPROVED',riskLevel:'LOW',active:true},user);
  const maker={id:makerId,role:'procurement',branchId:user.branchId,branchScope:'*'};
  const pending=await masterData.createSub(client,'suppliers',supplier.id,'documents',{documentType:'COI',title:'COI Declaration',expiryDate:future,required:false},maker,randomUUID());
  assert.equal(pending.verificationStatus,'PENDING');assert.equal((await masterData.decideSupplierDocument(client,supplier.id,pending.id,'verify',user,randomUUID())).verificationStatus,'VERIFIED');
  const doc=(await client.query(`INSERT INTO supplier_documents(supplier_id,document_type,title,expiry_date,required,verification_status,verified_by,verified_at,created_by) VALUES($1,'NIB','NIB Supplier Score',$2,true,'VERIFIED',$3,now(),$4) RETURNING id`,[supplier.id,future,user.id,makerId])).rows[0];
  for(let i=0;i<3;i++){
    // Due date +2 hari: toISOString() memakai UTC sedangkan Postgres membandingkan
    // tanggal lokal — memakai "hari ini" membuat test flaky pada jam 00:00–07:00 WIB.
    const po=await runtime.createDocument(client,{type:'PURCHASE_ORDER',user,title:`PO score ${i}`,amount:1000,partyId:supplier.id,partyName:supplier.name,dueDate:new Date(Date.now()+2*86400000).toISOString().slice(0,10),requestId:randomUUID()});
    const gr=await runtime.createDocument(client,{type:'GOODS_RECEIPT',user,title:`GR score ${i}`,amount:1000,partyId:supplier.id,partyName:supplier.name,requestId:randomUUID()});
    await client.query(`INSERT INTO document_relations(parent_document_id,child_document_id,relation_type,created_by) VALUES($1,$2,'ORDER_TO_RECEIPT',$3)`,[po.id,gr.id,user.id]);
    const qc=await runtime.createDocument(client,{type:'QC_INSPECTION',user,title:`QC score ${i}`,amount:0,partyId:supplier.id,partyName:supplier.name,requestId:randomUUID()});
    await client.query(`INSERT INTO qc_inspections(qc_document_id,subject_document_id,inspection_type,sampled_qty,passed_qty,failed_qty,result,inspected_by) VALUES($1,$2,'INCOMING',10,5,5,'PARTIAL',$3)`,[qc.id,gr.id,user.id]);
  }
  let score=runtime.camel(await governance.calculateSupplierPerformance(client,supplier.id,period,user));
  assert.equal(score.orderCount,3);assert.equal(score.receiptCount,3);assert.equal(score.inspectionCount,3);assert.equal(Number(score.qualityAcceptancePct),50);assert.equal(score.calculationSource,'AUTOMATIC');
  let state=(await governance.supplierPerformance(client,supplier.id)).supplier;assert.equal(state.performance_hold,false);
  await client.query(`UPDATE supplier_documents SET expiry_date='2020-01-01' WHERE id=$1`,[doc.id]);
  score=runtime.camel(await governance.calculateSupplierPerformance(client,supplier.id,period,user));state=(await governance.supplierPerformance(client,supplier.id)).supplier;
  assert.equal(state.performance_hold,true);assert.equal(score.approvedVendor,false);
  await assert.rejects(()=>runtime.createDocument(client,{type:'PURCHASE_ORDER',user,title:'Blocked PO',amount:1,partyId:supplier.id,partyName:supplier.name}),error=>error.code==='SUPPLIER_HOLD'&&/Supplier/.test(error.detail));
}));
