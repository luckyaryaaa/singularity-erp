'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');
require('../backend/core/env').loadEnv();
const {hasPermission}=require('../backend/core/permissions');
const organization=require('../backend/infrastructure/database/repositories/organization');
const masterData=require('../backend/infrastructure/database/repositories/master-data');
const runtime=require('../backend/infrastructure/database/repositories/runtime');
const auth=require('../backend/infrastructure/database/repositories/auth');

test('Sprint 7 permission organisasi menerapkan least privilege',()=>{
  assert.equal(hasPermission({role:'owner'},'organization.approve'),true);
  assert.equal(hasPermission({role:'finance_manager'},'organization.edit'),true);
  assert.equal(hasPermission({role:'finance_manager'},'organization.approve'),false);
  assert.equal(hasPermission({role:'hrd'},'organization.view'),true);
  assert.equal(hasPermission({role:'employee'},'organization.view'),false);
});

const pgTest=process.env.DATABASE_URL?test:test.skip;
pgTest('Sprint 7 organization snapshot, MFA session, dan employee maker-checker atomic',async()=>{
  const {Client}=require('pg'),client=new Client({connectionString:process.env.DATABASE_URL});await client.connect();await client.query('BEGIN'); await client.query("SELECT set_config('app.is_system','on',true),set_config('app.is_platform','on',true),set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true)");
  try{
    const ownerRow=(await client.query("SELECT * FROM app_users WHERE role='owner' AND active LIMIT 1")).rows[0];
    const branch=(await client.query('SELECT id,legal_entity_id FROM branches WHERE legal_entity_id IS NOT NULL ORDER BY created_at LIMIT 1')).rows[0];
    const employee=(await client.query('SELECT id FROM employees ORDER BY created_at LIMIT 1')).rows[0];
    assert.ok(ownerRow&&branch&&employee,'fixture organisasi/owner/employee tersedia');
    const owner={id:ownerRow.id,role:'owner',branchId:branch.id,branchScope:'*',displayName:ownerRow.display_name};
    const makerId=randomUUID(),stamp=Date.now();
    await client.query(`INSERT INTO app_users(id,username,password_hash,display_name,branch_id,role,branch_scope,must_change_password) VALUES($1,$2,'x','Sprint 7 Maker',$3,'finance_manager','*',false)`,[makerId,`s7-maker-${stamp}`,branch.id]);
    const maker={id:makerId,role:'finance_manager',branchId:branch.id,branchScope:'*',displayName:'Sprint 7 Maker'};

    const org=await organization.overview(client,owner,branch.legal_entity_id);assert.ok(org.completeness);assert.ok(org.subCounts);
    const bank=await organization.createResource(client,maker,org.id,'bank-accounts',{bankName:'Bank Sprint 7',accountNumber:`77${stamp}`,accountHolder:org.legalName,currency:'IDR',usagePurpose:'OPERATING',effectiveFrom:'2026-07-15',isPrimary:false,changeReason:'Integration test controlled bank'},randomUUID());
    assert.equal(bank.verificationStatus,'PENDING_VERIFICATION');
    await assert.rejects(()=>organization.decideBank(client,maker,org.id,bank.id,'approve','self approval',randomUUID()),e=>e.code==='PERMISSION_DENIED'||e.code==='SOD_CONFLICT');
    const approvedBank=await organization.decideBank(client,owner,org.id,bank.id,'approve','Owner checker',randomUUID());assert.equal(approvedBank.verificationStatus,'VERIFIED');

    const hrMaker={...maker,role:'hrd'};
    const payroll=await masterData.createSub(client,'employees',employee.id,'bank-accounts',{bankName:'Bank Payroll S7',accountNumber:`88${stamp}`,accountHolder:'Employee Test',currency:'IDR',effectiveFrom:'2026-07-15',isPrimary:false,changeReason:'Payroll bank update'},hrMaker,randomUUID());
    assert.equal(payroll.verificationStatus,'PENDING_VERIFICATION');
    await assert.rejects(()=>masterData.decideEmployeeSensitive(client,{employeeId:employee.id,kind:'bank-accounts',rowId:payroll.id,decision:'approve',user:hrMaker,requestId:randomUUID()}),e=>e.code==='SOD_CONFLICT');
    const checked=await masterData.decideEmployeeSensitive(client,{employeeId:employee.id,kind:'bank-accounts',rowId:payroll.id,decision:'approve',reason:'Independent checker',user:owner,requestId:randomUUID()});assert.equal(checked.verificationStatus,'VERIFIED');

    const session=await auth.createSession(client,owner,{ip:'127.0.0.1',device:'sprint7-test',mfaVerified:true});
    const verified=(await client.query('SELECT mfa_verified_at FROM user_sessions WHERE id=$1',[session.id])).rows[0];assert.ok(verified.mfa_verified_at);

    const doc=await runtime.createDocument(client,{type:'QUOTATION',user:owner,title:'Organization Snapshot Test',amount:1000,requestId:randomUUID()});
    assert.equal(doc.legalEntityId,org.id);assert.equal(doc.organizationIdentitySnapshot.legal_name,org.legalName);assert.ok(doc.organizationIdentitySnapshot.bank,'rekening terverifikasi ikut snapshot');
    await client.query('ROLLBACK');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{await client.end();}
});
