'use strict';
// Wave D.1 — coding block dimensi pada journal_lines (migrasi 067).
// Menguji: skema + kebijakan ter-seed, dan resolver dimensi lintas mode
// OFF/SOFT/HARD untuk akun neraca vs P&L (valid/invalid/hilang).
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const posting = require('../backend/infrastructure/database/repositories/posting');

const dbTest = process.env.DATABASE_URL ? test : test.skip;
test.after(async () => { await require('../backend/infrastructure/database/pool').close(); });

async function withClient(fn) {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try { await c.query('BEGIN'); await c.query("SELECT set_config('app.is_system','on',true)"); await fn(c); }
  finally { await c.query('ROLLBACK').catch(() => {}); await c.end(); }
}

test('D.1/v0.39: mode enforcement default HARD dan hanya menerima OFF/SOFT/HARD', () => {
  const prev = process.env.MAT_JOURNAL_DIMENSION_ENFORCEMENT;
  delete process.env.MAT_JOURNAL_DIMENSION_ENFORCEMENT;
  assert.equal(posting.dimensionEnforcement(), 'HARD');
  process.env.MAT_JOURNAL_DIMENSION_ENFORCEMENT = 'hard';
  assert.equal(posting.dimensionEnforcement(), 'HARD');
  process.env.MAT_JOURNAL_DIMENSION_ENFORCEMENT = 'bogus';
  assert.equal(posting.dimensionEnforcement(), 'HARD');
  if (prev === undefined) delete process.env.MAT_JOURNAL_DIMENSION_ENFORCEMENT; else process.env.MAT_JOURNAL_DIMENSION_ENFORCEMENT = prev;
});

dbTest('D.1: migrasi 067 menambah coding block + men-seed kebijakan akun', async () => withClient(async (c) => {
  const cols = (await c.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name='journal_lines' AND column_name=ANY($1)`,
    [['cost_center_id', 'profit_center_id', 'project_wbs_id']])).rows.map(r => r.column_name).sort();
  assert.deepEqual(cols, ['cost_center_id', 'profit_center_id', 'project_wbs_id']);

  const policy = await posting.dimensionPolicy(c);
  for (const pl of ['REVENUE', 'EXPENSE', 'COGS']) {
    assert.equal(policy[pl].requires_cost_center, true, `${pl} wajib cost center`);
    assert.equal(policy[pl].requires_profit_center, true, `${pl} wajib profit center`);
  }
  for (const bs of ['ASSET', 'LIABILITY', 'EQUITY']) {
    assert.equal(policy[bs].requires_cost_center, false, `${bs} tidak wajib cost center`);
    assert.equal(policy[bs].requires_profit_center, false, `${bs} tidak wajib profit center`);
  }
}));

dbTest('D.1: resolver dimensi mematuhi mode dan kategori akun', async () => withClient(async (c) => {
  const policy = await posting.dimensionPolicy(c);
  const cc = (await c.query('SELECT id FROM cost_centers LIMIT 1')).rows[0];
  const pc = (await c.query('SELECT id FROM profit_centers LIMIT 1')).rows[0];
  assert.ok(cc && pc, 'butuh minimal satu cost center & profit center ter-seed');
  const validDims = { costCenterId: cc.id, profitCenterId: pc.id };
  const call = (category, dims, enforcement) =>
    posting.resolveLineDimensions(c, { category, dims, policy, enforcement, label: 'uji' });

  // OFF → selalu null walau P&L + dimensi dikirim.
  assert.deepEqual(await call('REVENUE', validDims, 'OFF'),
    { costCenterId: null, profitCenterId: null, projectWbsId: null });

  // Neraca → tidak pernah membawa dimensi (kebijakan tidak engaged).
  assert.deepEqual(await call('ASSET', validDims, 'HARD'),
    { costCenterId: null, profitCenterId: null, projectWbsId: null });

  // P&L SOFT + dimensi valid → tersimpan.
  assert.deepEqual(await call('EXPENSE', validDims, 'SOFT'),
    { costCenterId: cc.id, profitCenterId: pc.id, projectWbsId: null });

  // Custom AppError text ada di .detail; .message berasal dari katalog.
  const denied = (re) => (e) => e.code === 'VALIDATION_ERROR' && re.test(e.detail || '');

  // P&L + cost center tak dikenal → ditolak (validasi FK).
  await assert.rejects(() => call('EXPENSE', { costCenterId: randomUUID(), profitCenterId: pc.id }, 'SOFT'),
    denied(/Cost center tidak ditemukan/));

  // P&L SOFT + dimensi hilang → LOLOS (backward compatible, tidak dipaksa).
  assert.deepEqual(await call('COGS', {}, 'SOFT'),
    { costCenterId: null, profitCenterId: null, projectWbsId: null });

  // P&L HARD + cost center hilang → DITOLAK (wajib).
  await assert.rejects(() => call('COGS', { profitCenterId: pc.id }, 'HARD'), denied(/wajib cost center/));
  // P&L HARD + profit center hilang → DITOLAK (wajib).
  await assert.rejects(() => call('COGS', { costCenterId: cc.id }, 'HARD'), denied(/wajib profit center/));
  // P&L HARD + lengkap → LOLOS.
  assert.deepEqual(await call('COGS', validDims, 'HARD'),
    { costCenterId: cc.id, profitCenterId: pc.id, projectWbsId: null });
}));
