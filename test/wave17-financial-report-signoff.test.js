'use strict';
// Wave D.3 — laporan keuangan ber-versi: prepare → review → sign-off (migrasi 069).
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const fr = require('../backend/infrastructure/database/repositories/finance-reports');

const dbTest = process.env.DATABASE_URL ? test : test.skip;
test.after(async () => { await require('../backend/infrastructure/database/pool').close(); });
async function withClient(fn) {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try { await c.query('BEGIN'); await c.query("SELECT set_config('app.is_system','on',true)"); await fn(c); }
  finally { await c.query('ROLLBACK').catch(() => {}); await c.end(); }
}
const glob = (id) => ({ id, role: 'owner', branchScope: '*' });
const PERIOD = '2026-06';
async function threeUsers(c) {
  const rows = (await c.query('SELECT id FROM app_users WHERE active LIMIT 3')).rows;
  assert.ok(rows.length >= 3, 'butuh minimal 3 app_users ter-seed');
  return rows.map((r) => r.id);
}

dbTest('D.3: migrasi 069 membuat financial_reports dengan kolom SoD', async () => withClient(async (c) => {
  const cols = (await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name='financial_reports'`)).rows.map((r) => r.column_name);
  for (const col of ['snapshot_sha256', 'prepared_by', 'reviewed_by', 'signed_off_by', 'version', 'status']) assert.ok(cols.includes(col), `kolom ${col} ada`);
}));

dbTest('D.3: alur prepare → review → sign-off dengan SoD dan versioning', async () => withClient(async (c) => {
  const [a, b, d] = await threeUsers(c);
  const r1 = await fr.prepareFinancialReport(c, { period: PERIOD, user: glob(a), requestId: randomUUID() });
  assert.equal(r1.status, 'PREPARED');
  assert.equal(r1.version, 1);
  assert.match(r1.sha256, /^[0-9a-f]{64}$/);
  assert.equal(r1.preparedBy, a);

  // Reviewer tidak boleh preparer.
  await assert.rejects(() => fr.decideFinancialReport(c, { id: r1.id, action: 'review', user: glob(a) }), (e) => e.code === 'SOD_CONFLICT');
  // Sign-off sebelum review → status invalid.
  await assert.rejects(() => fr.decideFinancialReport(c, { id: r1.id, action: 'signoff', user: glob(b) }), (e) => e.code === 'STATUS_INVALID');

  const r2 = await fr.decideFinancialReport(c, { id: r1.id, action: 'review', user: glob(b), requestId: randomUUID() });
  assert.equal(r2.status, 'REVIEWED');
  assert.equal(r2.reviewedBy, b);

  // Penandatangan tidak boleh reviewer.
  await assert.rejects(() => fr.decideFinancialReport(c, { id: r1.id, action: 'signoff', user: glob(b) }), (e) => e.code === 'SOD_CONFLICT');

  const r3 = await fr.decideFinancialReport(c, { id: r1.id, action: 'signoff', user: glob(d), requestId: randomUUID() });
  assert.equal(r3.status, 'SIGNED_OFF');
  assert.equal(r3.signedOffBy, d);

  // Snapshot berikutnya = versi 2.
  const v2 = await fr.prepareFinancialReport(c, { period: PERIOD, user: glob(a), requestId: randomUUID() });
  assert.equal(v2.version, 2);
}));

dbTest('D.3: reject membutuhkan alasan', async () => withClient(async (c) => {
  const [a, b] = await threeUsers(c);
  const r = await fr.prepareFinancialReport(c, { period: PERIOD, user: glob(a) });
  await assert.rejects(() => fr.decideFinancialReport(c, { id: r.id, action: 'reject', user: glob(b) }), (e) => e.code === 'REASON_REQUIRED');
  const rej = await fr.decideFinancialReport(c, { id: r.id, action: 'reject', reason: 'Angka belum final', user: glob(b) });
  assert.equal(rej.status, 'REJECTED');
  assert.equal(rej.decisionReason, 'Angka belum final');
}));

dbTest('D.3: non-global ditolak; detail memuat snapshot', async () => withClient(async (c) => {
  const [a] = await threeUsers(c);
  await assert.rejects(() => fr.listFinancialReports(c, { user: { role: 'sales', branchId: 'x' } }), (e) => e.code === 'PERMISSION_DENIED');
  const r = await fr.prepareFinancialReport(c, { period: PERIOD, user: glob(a) });
  const detail = await fr.financialReportDetail(c, r.id, glob(a));
  assert.ok(detail.snapshot && detail.snapshot.balanceSheet, 'detail memuat snapshot laporan');
}));
