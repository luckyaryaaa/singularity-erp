'use strict';
// v0.39 — Finance End-to-End Closure: HARD coding block, reconciliation
// evidence maker-checker, immutable close package, and canonical report hashes.
require('../backend/core/env').loadEnv();
const test=require('node:test');
const assert=require('node:assert/strict');
const {Client}=require('pg');
const {randomUUID}=require('node:crypto');
const posting=require('../backend/infrastructure/database/repositories/posting');
const finance=require('../backend/infrastructure/database/repositories/finance-reports');

const dbTest=process.env.DATABASE_URL?test:test.skip;
test.after(async()=>{await require('../backend/infrastructure/database/pool').close();});
async function rollback(fn){
  const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();
  try{await c.query('BEGIN');await c.query("SELECT set_config('app.is_system','on',true)");await fn(c);}
  finally{await c.query('ROLLBACK').catch(()=>{});await c.end();}
}
async function users(c){
  const rows=(await c.query(`SELECT id FROM app_users WHERE active ORDER BY created_at LIMIT 3`)).rows;
  assert.ok(rows.length>=3,'butuh tiga user untuk SoD');
  return rows.map(x=>({id:x.id,role:'owner',branchScope:'*'}));
}

test('v0.39: coding block default fail-closed HARD',()=>{
  const before=process.env.MAT_JOURNAL_DIMENSION_ENFORCEMENT;
  delete process.env.MAT_JOURNAL_DIMENSION_ENFORCEMENT;
  assert.equal(posting.dimensionEnforcement(),'HARD');
  if(before===undefined)delete process.env.MAT_JOURNAL_DIMENSION_ENFORCEMENT;else process.env.MAT_JOURNAL_DIMENSION_ENFORCEMENT=before;
});

dbTest('v0.39: migration 074 menyediakan evidence, RLS, dan metadata policy',()=>rollback(async c=>{
  const tables=(await c.query(`SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename=ANY($1)`,
    [['finance_reconciliation_evidence','accounting_period_close_runs']])).rows;
  assert.equal(tables.length,2);
  assert.ok(tables.every(x=>x.rowsecurity),'kedua tabel evidence wajib RLS');
  const cols=(await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name='account_dimension_policy' AND column_name=ANY($1)`,
    [['version','updated_by']])).rows.map(x=>x.column_name).sort();
  assert.deepEqual(cols,['updated_by','version']);
}));

dbTest('v0.39: tax reconciliation evidence prepare → approve menegakkan SoD dan immutability',()=>rollback(async c=>{
  const [maker,approver]=await users(c),period='2026-07';
  const prepared=await finance.prepareReconciliationEvidence(c,{type:'TAX',period,user:maker,requestId:randomUUID()});
  assert.equal(prepared.status,'PREPARED');
  assert.match(prepared.sha256,/^[0-9a-f]{64}$/);
  await assert.rejects(()=>finance.decideReconciliationEvidence(c,{id:prepared.id,action:'approve',user:maker}),e=>e.code==='SOD_CONFLICT');
  const approved=await finance.decideReconciliationEvidence(c,{id:prepared.id,action:'approve',reason:'Reviewed by independent checker',user:approver,requestId:randomUUID()});
  assert.equal(approved.status,'APPROVED');
  await assert.rejects(()=>c.query(`UPDATE finance_reconciliation_evidence SET snapshot='{}'::jsonb WHERE id=$1`,[prepared.id]),e=>e.code==='23514');
}));

dbTest('v0.39: close package evidence tidak dapat diubah',()=>rollback(async c=>{
  const [maker,approver]=await users(c);
  const entity=(await c.query('SELECT id FROM legal_entities ORDER BY created_at LIMIT 1')).rows[0];
  const id=randomUUID(),snapshot={period:'2026-07',checks:[{id:'trial_balance',status:'PASS'}]};
  await c.query(`INSERT INTO accounting_period_close_runs(id,legal_entity_id,period,evidence,evidence_sha256,close_reason,closed_by)
    VALUES($1,$2,'2026-07',$3,$4,'Test close evidence',$5)`,[id,entity.id,JSON.stringify(snapshot),'a'.repeat(64),maker.id]);
  await c.query('SAVEPOINT immutable_probe');
  await assert.rejects(()=>c.query(`UPDATE accounting_period_close_runs SET evidence='{}'::jsonb WHERE id=$1`,[id]),e=>e.code==='23514');
  await c.query('ROLLBACK TO SAVEPOINT immutable_probe');
  const reopened=(await c.query(`UPDATE accounting_period_close_runs SET status='REOPENED',reopened_by=$2,reopened_at=now(),reopen_reason='test'
    WHERE id=$1 RETURNING status`,[id,maker.id])).rows[0];
  assert.equal(reopened.status,'REOPENED','lifecycle boleh berubah tanpa mengubah evidence');
  for(const type of ['BANK','INVENTORY']){
    await c.query(`INSERT INTO finance_reconciliation_evidence
      (legal_entity_id,period,reconciliation_type,version,status,result_status,difference,snapshot,snapshot_sha256,prepared_by,approved_by,approved_at)
      VALUES($1,'2098-12',$2,1,'APPROVED',$3,0,$4,$5,$6,$7,now())`,
      [entity.id,type,type==='INVENTORY'?'NOT_RUN':'MATCHED',JSON.stringify({type,period:'2098-12'}),'f'.repeat(64),maker.id,approver.id]);
  }
  const gate=await finance.validateReconciliationEvidenceForClose(c,'2098-12');
  assert.equal(gate.ready,false);
  assert.ok(gate.issues.some(x=>/BANK: SHA-256/i.test(x)),'hash evidence wajib diverifikasi ulang saat close');
  assert.ok(gate.issues.some(x=>/INVENTORY: rekonsiliasi belum dijalankan/i.test(x)),'NOT_RUN wajib memblokir close');
  assert.ok(gate.issues.some(x=>/TAX: evidence belum disiapkan/i.test(x)),'evidence yang hilang wajib memblokir close');
}));
