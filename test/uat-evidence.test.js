'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const uat = require('../scripts/uat-evidence');
const dbGuard = require('../scripts/uat-database-guard');

function completePack() {
  const manifest = { version:'0.31.0', releaseSha256:'sha-release-valid', migrationLatest:'050_p0_5_transaction_correctness.sql' };
  const scenarios = uat.REQUIRED_ROLES.map((role, index) => ({
    id:`UAT-${String(index + 1).padStart(2,'0')}`, role, title:`Scenario ${role}`,
    steps:['Jalankan proses role'], expected:'Hasil sesuai kebijakan.'
  }));
  const runId='UAT-20260722-01';
  return {
    manifest,
    plan:{name:'Cross-functional UAT',scenarios},
    results:{runId,releaseVersion:manifest.version,releaseSha256:manifest.releaseSha256,migrationLatest:manifest.migrationLatest,
      executions:scenarios.map((s)=>({scenarioId:s.id,status:'PASS',executedBy:`Tester ${s.role}`,executedAt:'2026-07-22T10:00:00+07:00',evidenceRef:`evidence/${s.id}.png`}))},
    issues:{issues:[]},
    training:{sessions:uat.REQUIRED_ROLES.map((role)=>({role,status:'ATTENDED',attendee:`User ${role}`,evidenceRef:`attendance/${role}.pdf`}))},
    reconciliation:{checks:uat.REQUIRED_RECONCILIATIONS.map((code)=>({code,status:'PASS',evidenceRef:`recon/${code}.pdf`,approvedBy:'Finance Checker'}))},
    restore:{status:'PASS',actualRtoMinutes:12,actualRpoMinutes:5,evidenceRef:'dr/restore-01.log',executedBy:'System Administrator'},
    signoff:{approved:true,runId,releaseSha256:manifest.releaseSha256,owner:'Direktur Utama',approvedAt:'2026-07-22T17:00:00+07:00',statement:'Saya menyetujui hasil LAN-UAT dan evidence final ini.'}
  };
}

test('R025: evidence pack final lengkap dapat divalidasi deterministik', () => {
  const result=uat.validatePack(completePack(),{final:true});
  assert.equal(result.ok,true,result.errors.join('\n'));
  assert.equal(result.requiredRoles,13);
});

test('R025: unresolved high, stale release, missing execution, dan sign-off palsu diblokir', () => {
  const pack=completePack();
  pack.issues.issues.push({id:'UAT-BUG-1',severity:'HIGH',status:'OPEN'});
  pack.results.releaseSha256='stale';
  pack.results.executions.pop();
  pack.signoff.approved=false;
  const result=uat.validatePack(pack,{final:true});
  assert.equal(result.ok,false);
  assert.ok(result.errors.some((e)=>/HIGH belum CLOSED/.test(e)));
  assert.ok(result.errors.some((e)=>/SHA release/.test(e)));
  assert.ok(result.errors.some((e)=>/belum dieksekusi/.test(e)));
  assert.ok(result.errors.some((e)=>/sign-off/.test(e)));
});

test('R025: template repository lengkap tetapi final tetap fail-closed sebelum UAT manusia', () => {
  const result=uat.validateFiles(path.join(__dirname,'..','docs','uat'),{final:false});
  assert.equal(result.ok,true,result.errors.join('\n'));
  const final=uat.validateFiles(path.join(__dirname,'..','docs','uat'),{final:true});
  assert.equal(final.ok,false);
  assert.ok(final.errors.some((e)=>/FINAL_SIGNOFF/.test(e)));
});

test('R025: seed hanya menerima database khusus UAT', () => {
  assert.equal(dbGuard.databaseName({DATABASE_URL:'postgresql://app:x@127.0.0.1/mat_erp_v2_uat'}),'mat_erp_v2_uat');
  assert.equal(dbGuard.assertDedicatedUatDatabase({PGDATABASE:'mat_erp_v2_uat'}),'mat_erp_v2_uat');
  for(const name of ['mat_erp_v2_dev','mat_erp_v2','postgres','mat_erp_v2_uat_dev'])
    assert.throws(()=>dbGuard.assertDedicatedUatDatabase({PGDATABASE:name}),/UAT_DATABASE_BLOCKED/);
});
