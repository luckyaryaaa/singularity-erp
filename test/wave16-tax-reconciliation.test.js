'use strict';
// Wave D.2 — rekonsiliasi GL ↔ subledger pajak (migrasi 068 + finance-reports).
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const financeReports = require('../backend/infrastructure/database/repositories/finance-reports');
const accountingConfig = require('../backend/infrastructure/database/repositories/accounting-config');

const dbTest = process.env.DATABASE_URL ? test : test.skip;
test.after(async () => { await require('../backend/infrastructure/database/pool').close(); });

async function withClient(fn) {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try { await c.query('BEGIN'); await c.query("SELECT set_config('app.is_system','on',true)"); await fn(c); }
  finally { await c.query('ROLLBACK').catch(() => {}); await c.end(); }
}
const OWNER = { id: 'owner-uat', role: 'owner', branchScope: '*' };
const round = (n) => Math.round(n * 100) / 100;

dbTest('D.2: migrasi 068 memetakan peran TAX_PAYABLE ke akun pajak konsolidasi 2300', async () => withClient(async (c) => {
  accountingConfig.invalidateConfigCache();
  assert.equal(await accountingConfig.accountCode(c, 'TAX_PAYABLE', '2026-07'), '2300');
}));

dbTest('D.2: rekonsiliasi pajak konsisten secara matematis', async () => withClient(async (c) => {
  const r = await financeReports.taxReconciliation(c, { period: '2026-07', user: OWNER });
  assert.equal(r.taxAccount, '2300');
  assert.equal(r.period, '2026-07');
  assert.ok(Array.isArray(r.byType));
  // subledgerTotal = jumlah seluruh byType.
  assert.equal(r.subledgerTotal, round(r.byType.reduce((n, x) => n + x.amount, 0)));
  // difference = subledger akrual − GL akrual (kredit).
  assert.equal(r.difference, round(r.subledgerTotal - r.glAccrued));
  // glNet = akrual (kredit) − setoran (debit).
  assert.equal(r.glNet, round(r.glAccrued - r.glSettled));
}));

dbTest('D.2: rekonsiliasi pajak menuntut scope global', async () => withClient(async (c) => {
  await assert.rejects(
    () => financeReports.taxReconciliation(c, { period: '2026-07', user: { role: 'sales', branchId: 'x' } }),
    (e) => e.code === 'PERMISSION_DENIED');
}));

dbTest('D.2: periode wajib berformat YYYY-MM', async () => withClient(async (c) => {
  await assert.rejects(
    () => financeReports.taxReconciliation(c, { period: '2026/07', user: OWNER }),
    (e) => e.code === 'VALIDATION_ERROR');
}));

dbTest('D.2: closing cockpit memakai rekonsiliasi pajak nyata (bukan sekadar cek ada tidaknya record)', async () => withClient(async (c) => {
  const cockpit = await financeReports.closingCockpit(c, '2026-07', OWNER);
  const tax = cockpit.checks.find((x) => x.id === 'tax_reconciliation');
  assert.ok(tax, 'check tax_reconciliation harus ada');
  assert.match(tax.name, /subledger vs GL 2300/);
  assert.match(tax.detail, /Subledger .+ vs GL akrual .+ \(selisih/);
}));
