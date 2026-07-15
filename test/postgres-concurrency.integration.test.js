'use strict';
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const runtime = require('../backend/infrastructure/database/repositories/runtime');

test('PostgreSQL numbering concurrency: 24 transaksi menghasilkan nomor unik', async () => {
  const admin=new Client({connectionString:process.env.MIGRATION_DATABASE_URL}); await admin.connect();
  const branchId=randomUUID();
  await admin.query('INSERT INTO branches(id,code,name) VALUES($1,$2,$3)',[branchId,`IT${Date.now()}`,'Concurrency Branch']);
  try {
    const numbers=await Promise.all(Array.from({length:24},async()=>{
      const client=new Client({connectionString:process.env.DATABASE_URL}); await client.connect();
      try { await client.query('BEGIN'); const n=await runtime.nextNumber(client,{documentType:'INVOICE',branchId}); await client.query('COMMIT'); return n; }
      catch(error){await client.query('ROLLBACK');throw error;} finally{await client.end();}
    }));
    assert.equal(new Set(numbers).size,24);
    const seq=numbers.map((n)=>Number(n.split('-').pop())).sort((a,b)=>a-b);
    assert.deepEqual(seq,Array.from({length:24},(_,i)=>i+1));
  } finally {
    await admin.query('DELETE FROM document_sequences WHERE branch_id=$1',[branchId]);
    await admin.query('DELETE FROM branches WHERE id=$1',[branchId]); await admin.end();
  }
});

test('PostgreSQL document transaction: audit+outbox atomic dan stale version ditolak', async()=>{
  const admin=new Client({connectionString:process.env.MIGRATION_DATABASE_URL}); await admin.connect();
  const branchId=randomUUID(),userId=randomUUID();
  await admin.query('INSERT INTO branches(id,code,name) VALUES($1,$2,$3)',[branchId,`DT${Date.now()}`,'Document Test']);
  await admin.query(`INSERT INTO app_users(id,username,password_hash,display_name,branch_id,role,must_change_password)
    VALUES($1,$2,'test','Integration User',$3,'system_admin',false)`,[userId,`it-${Date.now()}`,branchId]);
  const user={id:userId,branchId,displayName:'Integration User'}; let doc;
  try {
    const client=new Client({connectionString:process.env.DATABASE_URL}); await client.connect();
    try {
      await client.query('BEGIN'); doc=await runtime.createDocument(client,{type:'INVOICE',user,title:'Atomic Invoice',amount:1000}); await client.query('COMMIT');
      const [aud,out]=await Promise.all([
        admin.query('SELECT count(*)::int n FROM audit_logs WHERE entity_id=$1',[doc.id]),
        admin.query('SELECT count(*)::int n FROM domain_event_outbox WHERE entity_id=$1',[doc.documentNumber])
      ]);
      assert.equal(aud.rows[0].n,1);assert.equal(out.rows[0].n,1);

      await client.query('BEGIN'); const updated=await runtime.updateDocument(client,{id:doc.id,expectedVersion:1,patch:{title:'v2'},user}); await client.query('COMMIT');
      assert.equal(updated.version,2);
      await client.query('BEGIN');
      await assert.rejects(()=>runtime.updateDocument(client,{id:doc.id,expectedVersion:1,patch:{title:'stale'},user}),e=>e.code==='DOCUMENT_CONFLICT');
      await client.query('ROLLBACK');
    } finally {await client.end();}
  } finally {
    if(doc){await admin.query('DELETE FROM audit_logs WHERE entity_id=$1',[doc.id]);await admin.query('DELETE FROM domain_event_outbox WHERE entity_id=$1',[doc.documentNumber]);await admin.query('DELETE FROM business_documents WHERE id=$1',[doc.id]);}
    await admin.query('DELETE FROM document_sequences WHERE branch_id=$1',[branchId]);await admin.query('DELETE FROM app_users WHERE id=$1',[userId]);await admin.query('DELETE FROM branches WHERE id=$1',[branchId]);await admin.end();
  }
});

test('PostgreSQL idempotency: 12 request paralel mengeksekusi handler tepat sekali',async()=>{
  const admin=new Client({connectionString:process.env.MIGRATION_DATABASE_URL});await admin.connect();
  const branchId=randomUUID(),userId=randomUUID(),key=`idem-${Date.now()}`;let executions=0;
  await admin.query('INSERT INTO branches(id,code,name) VALUES($1,$2,$3)',[branchId,`ID${Date.now()}`,'Idempotency Test']);
  await admin.query("INSERT INTO app_users(id,username,password_hash,display_name,branch_id,role,must_change_password) VALUES($1,$2,'x','Idem User',$3,'system_admin',false)",[userId,`idem-${Date.now()}`,branchId]);
  try{
    const results=await Promise.all(Array.from({length:12},async()=>{
      const client=new Client({connectionString:process.env.DATABASE_URL});await client.connect();
      try{await client.query('BEGIN');const result=await runtime.withIdempotency(client,{userId,operation:'invoice.issue',key,body:{amount:5000}},async()=>{executions++;return{status:201,body:{documentId:'one'}};});await client.query('COMMIT');return result;}
      catch(error){await client.query('ROLLBACK');throw error;}finally{await client.end();}
    }));
    assert.equal(executions,1);assert.equal(results.filter(r=>r.body.idempotentReplay).length,11);
    const client=new Client({connectionString:process.env.DATABASE_URL});await client.connect();await client.query('BEGIN');
    await assert.rejects(()=>runtime.withIdempotency(client,{userId,operation:'invoice.issue',key,body:{amount:9999}},async()=>({status:201,body:{}})),e=>e.code==='DUPLICATE_REQUEST');
    await client.query('ROLLBACK');await client.end();
  }finally{await admin.query('DELETE FROM idempotency_records WHERE user_id=$1',[userId]);await admin.query('DELETE FROM app_users WHERE id=$1',[userId]);await admin.query('DELETE FROM branches WHERE id=$1',[branchId]);await admin.end();}
});

test('PostgreSQL approval: jenjang supervisor → finance → owner tidak dapat dilompati',async()=>{
  const adminDb=new Client({connectionString:process.env.MIGRATION_DATABASE_URL});await adminDb.connect();
  const branchId=randomUUID();const users={};let doc;
  await adminDb.query('INSERT INTO branches(id,code,name) VALUES($1,$2,$3)',[branchId,`AP${Date.now()}`,'Approval Test']);
  for(const role of ['sales','hrd','finance_manager','owner']){users[role]={id:randomUUID(),role,branchId,displayName:role};await adminDb.query("INSERT INTO app_users(id,username,password_hash,display_name,branch_id,role,must_change_password) VALUES($1,$2,'x',$3,$4,$5,false)",[users[role].id,`${role}-${Date.now()}`,role,branchId,role]);}
  const client=new Client({connectionString:process.env.DATABASE_URL});await client.connect();
  try{
    await client.query('BEGIN');doc=await runtime.createDocument(client,{type:'PURCHASE_ORDER',user:users.sales,title:'PO besar',amount:75_000_000});await runtime.transitionDocument(client,{id:doc.id,action:'submit',user:users.sales});await client.query('COMMIT');
    await client.query('BEGIN');await assert.rejects(()=>runtime.transitionDocument(client,{id:doc.id,action:'approve',user:users.owner}),e=>e.code==='PERMISSION_DENIED');await client.query('ROLLBACK');
    for(const role of ['hrd','finance_manager','owner']){await client.query('BEGIN');doc=await runtime.transitionDocument(client,{id:doc.id,action:'approve',user:users[role]});await client.query('COMMIT');}
    assert.equal(doc.status,'APPROVED');assert.equal(doc.approvals.length,3);
  }finally{
    await client.end();if(doc){await adminDb.query('DELETE FROM audit_logs WHERE entity_id=$1',[doc.id]);await adminDb.query('DELETE FROM domain_event_outbox WHERE entity_id=$1',[doc.documentNumber]);await adminDb.query('DELETE FROM business_documents WHERE id=$1',[doc.id]);}
    await adminDb.query('DELETE FROM document_sequences WHERE branch_id=$1',[branchId]);await adminDb.query('DELETE FROM app_users WHERE branch_id=$1',[branchId]);await adminDb.query('DELETE FROM branches WHERE id=$1',[branchId]);await adminDb.end();
  }
});
