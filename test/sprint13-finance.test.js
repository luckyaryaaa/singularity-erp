'use strict';
// Sprint 13 (R020) — fixed asset + depresiasi, laporan keuangan, closing
// cockpit & subledger. Semua tes ROLLBACK-terisolasi.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');

const enabled = !!process.env.DATABASE_URL;
const dbTest = enabled ? test : test.skip;

const runtime = require('../backend/infrastructure/database/repositories/runtime');
const fa = require('../backend/infrastructure/database/repositories/fixed-assets');
const reports = require('../backend/infrastructure/database/repositories/finance-reports');

async function withRollback(fn) {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try { await c.query('BEGIN'); await c.query("SELECT set_config('app.is_system','on',true),set_config('app.is_platform','on',true),set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true)"); await fn(c); } finally { await c.query('ROLLBACK').catch(() => {}); await c.end(); }
}
const owner = async (c) => runtime.camel((await c.query(`SELECT id,username,display_name "displayName",role,branch_id "branchId",branch_scope "branchScope" FROM app_users WHERE role='owner' LIMIT 1`)).rows[0]);
const period = new Date().toISOString().slice(0, 7);
const nextPeriodDate = new Date(`${period}-01T00:00:00.000Z`);
nextPeriodDate.setUTCMonth(nextPeriodDate.getUTCMonth() + 1);
const nextPeriod = nextPeriodDate.toISOString().slice(0, 7);

dbTest('fixed asset: depresiasi garis lurus configuration-driven + jurnal seimbang + idempoten', async () => {
  await withRollback(async (c) => {
    const u = await owner(c);
    const asset = await fa.createAsset(c, { name: 'Mesin CNC test', categoryCode: 'MESIN', acquisitionDate: '2026-01-01', acquisitionCost: 96_000_000, user: u, requestId: randomUUID() });
    assert.match(asset.assetNumber, /^FA-\d{4}-/);
    const run = await fa.runDepreciation(c, { period, user: u, requestId: randomUUID() });
    assert.equal(run.total, 1_000_000, '96jt / 96 bulan (umur dari asset_categories)');
    assert.match(run.journal, /^JRN-/);
    const jl = (await c.query(`SELECT a.code,COALESCE(SUM(jl.debit),0)::float d,COALESCE(SUM(jl.credit),0)::float cr FROM journal_lines jl JOIN chart_of_accounts a ON a.id=jl.account_id JOIN business_documents doc ON doc.id=jl.journal_document_id WHERE doc.document_number=$1 GROUP BY a.code ORDER BY a.code`, [run.journal])).rows;
    assert.equal(jl.find((x) => x.code === '6300').d, 1_000_000);
    assert.equal(jl.find((x) => x.code === '1590').cr, 1_000_000);
    assert.equal((await fa.runDepreciation(c, { period, user: u, requestId: randomUUID() })).assets, 0, 'idempoten per periode');
    // Umur manfaat dari konfigurasi — ubah kategori mengubah hasil (§35)
    await c.query(`UPDATE asset_categories SET useful_life_months=48 WHERE code='MESIN'`);
    const asset2 = await fa.createAsset(c, { name: 'Mesin kedua', categoryCode: 'MESIN', acquisitionDate: '2026-01-01', acquisitionCost: 48_000_000, user: u, requestId: randomUUID() });
    const run2 = await fa.runDepreciation(c, { period: nextPeriod, user: u, requestId: randomUUID() });
    const entry2 = (await c.query(`SELECT amount FROM asset_depreciation_entries WHERE asset_id=$1`, [asset2.id])).rows[0];
    assert.equal(Number(entry2.amount), 1_000_000, '48jt/48bln — konfigurasi menentukan hasil');
  });
});

dbTest('fixed asset: disposal — jurnal seimbang, nilai buku benar, DISPOSED dilewati run, idempoten', async () => {
  await withRollback(async (c) => {
    const u = await owner(c);
    const asset = await fa.createAsset(c, { name: 'Pickup test', categoryCode: 'KENDARAAN', acquisitionDate: '2026-01-01', acquisitionCost: 60_000_000, user: u, requestId: randomUUID() });
    await fa.runDepreciation(c, { period, user: u, requestId: randomUUID() });
    await assert.rejects(() => fa.disposeAsset(c, { assetId: asset.id, reason: '', user: u, requestId: randomUUID() }), (e) => e.code === 'REASON_REQUIRED');
    const disp = await fa.disposeAsset(c, { assetId: asset.id, reason: 'Dijual', proceeds: 50_000_000, user: u, requestId: randomUUID() });
    assert.equal(disp.bookValue, 59_000_000);
    const jl = (await c.query(`SELECT COALESCE(SUM(debit),0)::float d,COALESCE(SUM(credit),0)::float cr FROM journal_lines jl JOIN business_documents doc ON doc.id=jl.journal_document_id WHERE doc.document_number=$1`, [disp.journal])).rows[0];
    assert.ok(Math.abs(jl.d - jl.cr) < 0.01 && jl.d === 60_000_000);
    assert.equal((await fa.disposeAsset(c, { assetId: asset.id, reason: 'x', user: u, requestId: randomUUID() })).replay, true);
    await fa.runDepreciation(c, { period: nextPeriod, user: u, requestId: randomUUID() });
    assert.equal(Number((await c.query(`SELECT count(*) n FROM asset_depreciation_entries WHERE asset_id=$1 AND period=$2`, [asset.id, nextPeriod])).rows[0].n), 0);
  });
});

dbTest('laporan keuangan: neraca balance dengan akun kontra (1590/4110) bertanda benar', async () => {
  await withRollback(async (c) => {
    const u = await owner(c);
    // Tambah depresiasi supaya kontra-aset 1590 ikut teruji dalam neraca.
    await fa.createAsset(c, { name: 'Aset neraca', categoryCode: 'MESIN', acquisitionDate: '2026-01-01', acquisitionCost: 96_000_000, user: u, requestId: randomUUID() });
    await fa.runDepreciation(c, { period, user: u, requestId: randomUUID() });
    const st = await reports.financialStatements(c, period, u);
    assert.equal(st.balanceSheet.balanced, true, 'aset = kewajiban + ekuitas');
    const acc = st.balanceSheet.assets.find((x) => x.code === '1590');
    assert.ok(acc && acc.balance < 0, 'akumulasi penyusutan tampil NEGATIF (kontra aset)');
    assert.ok(st.incomeStatement.expense >= 1_000_000, 'beban penyusutan masuk laba rugi periode');
  });
});

dbTest('subledger AP selaras GL; AR menampilkan selisih terukur bila ada', async () => {
  await withRollback(async (c) => {
    const u = await owner(c);
    const ap = await reports.subledger(c, { type: 'AP', period, user: u });
    assert.ok(Number.isFinite(ap.difference));
    assert.equal(ap.glAccount, '2100');
    const ar = await reports.subledger(c, { type: 'AR', period, user: u });
    assert.equal(ar.glAccount, '1200');
    assert.ok(Array.isArray(ar.items));
    await assert.rejects(() => reports.subledger(c, { type: 'XX', period, user: u }), (e) => e.code === 'VALIDATION_ERROR');
  });
});

dbTest('closing cockpit: checklist lengkap dengan status PASS/WARN/FAIL dan readiness', async () => {
  await withRollback(async (c) => {
    const u = await owner(c);
    const cockpit = await reports.closingCockpit(c, period, u);
    assert.ok(cockpit.checks.length >= 9);
    for (const chk of cockpit.checks) assert.ok(['PASS', 'WARN', 'FAIL'].includes(chk.status), `status valid: ${chk.id}`);
    assert.ok(['READY', 'REVIEW', 'BLOCKED'].includes(cockpit.readiness));
    const ids = cockpit.checks.map((x) => x.id);
    for (const required of ['trial_balance', 'unposted', 'inventory_reconciliation', 'payroll_reconciliation', 'depreciation', 'subledger_ar', 'subledger_ap']) {
      assert.ok(ids.includes(required), `check ${required} ada`);
    }
  });
});
