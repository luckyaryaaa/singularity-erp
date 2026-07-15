'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');
const env=require('../backend/core/env');env.loadEnv();
const {grantsFor,hasPermission,APPROVAL_LEVEL_BY_ROLE}=require('../backend/core/permissions');
const governance=require('../backend/infrastructure/database/repositories/governance');
const runtime=require('../backend/infrastructure/database/repositories/runtime');
const postgresAuth=require('../backend/infrastructure/database/repositories/auth');

test('Sprint 6 role enterprise memisahkan platform, security, finance, auditor, dan self-service',()=>{
  assert.equal(hasPermission({role:'system_admin'},'user.edit'),true);
  assert.equal(hasPermission({role:'system_admin'},'payroll.approve'),false);
  assert.equal(hasPermission({role:'security_admin'},'iam.approve'),true);
  assert.equal(hasPermission({role:'security_admin'},'journal.post'),false);
  assert.equal(hasPermission({role:'auditor'},'audit.view'),true);
  assert.equal(hasPermission({role:'auditor'},'invoice.edit'),false);
  assert.equal(APPROVAL_LEVEL_BY_ROLE.finance_manager,'finance');
  assert.ok(grantsFor('employee').has('payroll.view_self'));
});

test('Sprint 6 approval steps menolak duplikat dan level liar',()=>{
  assert.deepEqual(governance.normalizeSteps(['supervisor','finance','owner']).map(x=>x.sequence),[1,2,3]);
  assert.throws(()=>governance.normalizeSteps(['owner','owner']),error=>error.code==='VALIDATION_ERROR'&&/duplikat/.test(error.detail));
  assert.throws(()=>governance.normalizeSteps(['root']),error=>error.code==='VALIDATION_ERROR'&&/tidak valid/.test(error.detail));
});

const pgTest=process.env.DATABASE_URL?test:test.skip;
pgTest('Sprint 6 IAM maker-checker, SoD conflict, session revoke, dan policy snapshot atomic',async()=>{
  const {Client}=require('pg'),client=new Client({connectionString:process.env.DATABASE_URL});await client.connect();
  await client.query('BEGIN');
  try{
    const branch=(await client.query('SELECT id FROM branches ORDER BY created_at LIMIT 1')).rows[0],ownerRow=(await client.query("SELECT * FROM app_users WHERE role='owner' AND active LIMIT 1")).rows[0];
    const owner={id:ownerRow.id,role:'owner',branchId:branch.id,branchScope:'*',displayName:ownerRow.display_name};
    const requesterId=randomUUID(),targetId=randomUUID(),stamp=Date.now();
    await client.query(`INSERT INTO app_users(id,username,password_hash,display_name,branch_id,role,must_change_password) VALUES($1,$2,'x','Security Checker',$3,'security_admin',false),($4,$5,'x','IAM Target',$3,'employee',false)`,[requesterId,`sec-${stamp}`,branch.id,targetId,`target-${stamp}`]);
    const requester={id:requesterId,role:'security_admin',branchId:branch.id,displayName:'Security Checker'};
    await client.query(`INSERT INTO user_sessions(id,user_id,token_hash,csrf_token_hash,expires_at) VALUES($1,$2,$3,$4,now()+interval '1 hour')`,[randomUUID(),targetId,'a'.repeat(64),'b'.repeat(64)]);
    const pending=await governance.requestAssignment(client,{targetUserId:targetId,roleCode:'system_admin',scopeType:'GLOBAL',reason:'Platform administration duty',user:requester});
    await assert.rejects(()=>governance.decideAssignment(client,pending.id,{approve:true,reason:'Self approval',user:requester}),e=>e.code==='SOD_CONFLICT');
    const approved=await governance.decideAssignment(client,pending.id,{approve:true,reason:'Owner checker approval',user:owner});assert.equal(approved.status,'ACTIVE');
    assert.equal((await client.query('SELECT role FROM app_users WHERE id=$1',[targetId])).rows[0].role,'system_admin');
    assert.equal((await client.query('SELECT active FROM user_sessions WHERE user_id=$1',[targetId])).rows[0].active,false);
    const conflictPending=await governance.requestAssignment(client,{targetUserId:targetId,roleCode:'security_admin',scopeType:'GLOBAL',reason:'Conflicting control duty',user:requester});
    const blocked=await governance.decideAssignment(client,conflictPending.id,{approve:true,reason:'Conflict validation',user:owner});assert.equal(blocked.blocked,true);assert.equal(blocked.conflicts[0].code,'ROLE-SYS-SEC');
    assert.equal(Number((await client.query("SELECT count(*) n FROM sod_conflict_events WHERE assignment_id=$1 AND status='BLOCKED'",[conflictPending.id])).rows[0].n),1);
    let doc=await runtime.createDocument(client,{type:'QUOTATION',user:owner,title:'Policy Snapshot Test',amount:8_000_000,requestId:randomUUID()});doc=await runtime.transitionDocument(client,{id:doc.id,action:'submit',user:owner,requestId:randomUUID(),allowOwnerOverride:true});assert.ok(doc.approvalPolicyVersionId);assert.equal(doc.approvalPolicySnapshot.policyKey,'DEFAULT-2');assert.deepEqual(doc.requiredApprovalLevels,['supervisor','finance']);
    const review=await governance.createReview(client,{title:'Sprint 6 Test Review',scopeType:'GLOBAL',dueAt:new Date(Date.now()+86400000),user:owner});const detail=await governance.reviewDetail(client,review.id);assert.ok(detail.items.length>=1);
    const expiringSession=await postgresAuth.createSession(client,{id:targetId},{ip:'127.0.0.1',device:'expiry-test'});assert.ok(await postgresAuth.resolveSession(client,expiringSession.token,{ip:'127.0.0.1',device:'expiry-test'}));await client.query(`UPDATE user_role_assignments SET effective_from=now()-interval '2 hours',effective_until=now()-interval '1 second' WHERE id=$1`,[approved.id]);assert.equal(await postgresAuth.resolveSession(client,expiringSession.token,{ip:'127.0.0.1',device:'expiry-test'}),null);assert.equal((await client.query('SELECT end_reason FROM user_sessions WHERE id=$1',[expiringSession.id])).rows[0].end_reason,'access_expired');
    await client.query('ROLLBACK');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{await client.end();}
});
