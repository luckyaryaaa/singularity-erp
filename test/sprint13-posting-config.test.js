'use strict';
// Sprint 13/14 — posting profile configurable & payroll rule engine ber-versi.
// Membuktikan account determination & tarif TIDAK hardcoded (§35/§18.2/§19.5).
// Setiap tes berjalan dalam transaksi yang di-ROLLBACK.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');

const enabled = !!process.env.DATABASE_URL;
const dbTest = enabled ? test : test.skip;

const runtime = require('../backend/infrastructure/database/repositories/runtime');
const posting = require('../backend/infrastructure/database/repositories/posting');
const config = require('../backend/infrastructure/database/repositories/accounting-config');

async function withRollback(fn) {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try { await c.query('BEGIN'); await c.query("SELECT set_config('app.is_system','on',true)"); await fn(c); } finally { await c.query('ROLLBACK').catch(() => {}); await c.end(); }
}
const owner = async (c) => runtime.camel((await c.query(`SELECT id,username,display_name "displayName",role,branch_id "branchId",branch_scope "branchScope" FROM app_users WHERE role='owner' LIMIT 1`)).rows[0]);

dbTest('posting profile: jurnal invoice memakai akun dari profil + snapshot immutable', async () => {
  await withRollback(async (c) => {
    const u = await owner(c);
    const inv = await runtime.createDocument(c, { type: 'INVOICE', user: u, title: 'INV cfg', amount: 8_000_000, requestId: require('crypto').randomUUID() });
    await c.query(`UPDATE business_documents SET status='APPROVED' WHERE id=$1`, [inv.id]);
    const doc = runtime.camel((await c.query('SELECT * FROM business_documents WHERE id=$1', [inv.id])).rows[0]);
    const res = await posting.postAccounting(c, doc, u);
    assert.equal(res.profileCode, 'INVOICE-DEFAULT');
    const legs = (await c.query(`SELECT a.code, jl.debit, jl.credit FROM journal_lines jl JOIN chart_of_accounts a ON a.id=jl.account_id WHERE jl.journal_document_id=$1`, [inv.id])).rows;
    const debit = legs.find((l) => Number(l.debit) > 0), credit = legs.find((l) => Number(l.credit) > 0);
    assert.equal(debit.code, '1200'); assert.equal(credit.code, '4100');
    assert.equal(Number(debit.debit), 8_000_000);
    const snap = (await c.query('SELECT posting_profile_snapshot FROM business_documents WHERE id=$1', [inv.id])).rows[0].posting_profile_snapshot;
    assert.equal(snap.code, 'INVOICE-DEFAULT'); assert.ok(Array.isArray(snap.legs));
  });
});

dbTest('posting profile: mengubah akun profil mengubah jurnal (bukan hardcoded)', async () => {
  await withRollback(async (c) => {
    const u = await owner(c);
    // Alihkan kredit INVOICE dari 4100 ke 4100 alternatif via akun lain yang ada di COA.
    const alt = (await c.query(`SELECT code FROM chart_of_accounts WHERE active AND code<>'4100' AND code LIKE '4%' LIMIT 1`)).rows[0]
      || (await c.query(`SELECT code FROM chart_of_accounts WHERE active AND code<>'1200' AND code<>'4100' LIMIT 1`)).rows[0];
    await c.query(`UPDATE posting_profile_legs SET account_code=$1 WHERE leg_no=2 AND profile_id=(SELECT id FROM posting_profiles WHERE code='INVOICE-DEFAULT')`, [alt.code]);
    const inv = await runtime.createDocument(c, { type: 'INVOICE', user: u, title: 'INV alt', amount: 5_000_000, requestId: require('crypto').randomUUID() });
    await c.query(`UPDATE business_documents SET status='APPROVED' WHERE id=$1`, [inv.id]);
    const doc = runtime.camel((await c.query('SELECT * FROM business_documents WHERE id=$1', [inv.id])).rows[0]);
    await posting.postAccounting(c, doc, u);
    const credit = (await c.query(`SELECT a.code FROM journal_lines jl JOIN chart_of_accounts a ON a.id=jl.account_id WHERE jl.journal_document_id=$1 AND jl.credit>0`, [inv.id])).rows[0];
    assert.equal(credit.code, alt.code, 'kredit mengikuti akun profil yang diubah');
  });
});

dbTest('payroll rule engine: resolusi effective-dated + snapshot + parity nilai lama', async () => {
  await withRollback(async (c) => {
    const r = await config.resolvePayrollRules(c, '2026-07-01');
    assert.equal(r.rules.BPJS.employeePct, 0.01);
    assert.equal(r.rules.BPJS.companyPct, 0.04);
    assert.equal(r.rules.PTKP.annualExempt, 4_500_000);
    assert.equal(r.rules.PPH21.flatRate, 0.05);
    assert.ok(r.snapshot.BPJS.version >= 1);
    // Parity: base 10jt → bpjsEmp 100k, taxable 5,4jt, pph 270k
    const base = 10_000_000, bpjsEmp = Math.round(base * r.rules.BPJS.employeePct);
    const taxable = base - bpjsEmp - r.rules.PTKP.annualExempt;
    assert.equal(bpjsEmp, 100_000);
    assert.equal(Math.round(taxable * r.rules.PPH21.flatRate), 270_000);
  });
});

dbTest('payroll rule engine: ubah tarif PPh menghasilkan angka berbeda', async () => {
  await withRollback(async (c) => {
    await c.query(`UPDATE payroll_rule_versions SET config='{"flatRate":0.15}' WHERE rule_type='PPH21'`);
    const r = await config.resolvePayrollRules(c, '2026-07-01');
    assert.equal(r.rules.PPH21.flatRate, 0.15);
    const taxable = 10_000_000 - 100_000 - 4_500_000;
    assert.equal(Math.round(taxable * r.rules.PPH21.flatRate), 810_000);
  });
});

dbTest('payroll rule engine: aturan hilang untuk periode → error jelas', async () => {
  await withRollback(async (c) => {
    await c.query(`UPDATE payroll_rule_versions SET active=false WHERE rule_type='BPJS'`);
    await assert.rejects(() => config.resolvePayrollRules(c, '2026-07-01'), (e) => e.code === 'RESOURCE_NOT_FOUND');
  });
});
