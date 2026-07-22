'use strict';
// P0-I — total dokumen server-authoritative (Sales Critical 1 / blueprint §8.2).
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const runtime = require('../backend/infrastructure/database/repositories/runtime');
const posting = require('../backend/infrastructure/database/repositories/posting');

const dbTest = process.env.DATABASE_URL ? test : test.skip;
async function rollback(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try { await client.query('BEGIN'); await client.query("SELECT set_config('app.is_system','on',true)"); await fn(client); }
  finally { await client.query('ROLLBACK').catch(() => {}); await client.end(); }
}
async function owner(client) {
  const r = (await client.query(`SELECT u.*,b.legal_entity_id FROM app_users u JOIN branches b ON b.id=u.branch_id WHERE u.role='owner' AND b.legal_entity_id IS NOT NULL LIMIT 1`)).rows[0];
  return { id: r.id, role: r.role, branchId: r.branch_id, branchScope: '*', displayName: r.display_name, legalEntityId: r.legal_entity_id };
}

test('P0-I: rumus total otoritatif = baris − diskon + pajak + freight (murni)', () => {
  const lines = posting.normalizeLines([{ qty: 4, unitPrice: 1_000_000 }, { qty: 2, unitPrice: 500_000 }]);
  const subtotal = posting.lineSubtotalOf(lines);
  assert.equal(subtotal, 5_000_000);
  assert.equal(posting.authoritativeTotal(subtotal, {}), 5_000_000);
  assert.equal(posting.authoritativeTotal(subtotal, { discountPct: 10 }), 4_500_000);
  assert.equal(posting.authoritativeTotal(subtotal, { discountPct: 10, taxPct: 11 }), 4_995_000);
  assert.equal(posting.authoritativeTotal(subtotal, { freightTotal: 250_000 }), 5_250_000, 'landed cost header ikut dihitung');
  // Diskon/pajak/freight di luar batas wajar ditolak.
  assert.throws(() => posting.authoritativeTotal(subtotal, { discountPct: 150 }), (e) => e.code === 'VALIDATION_ERROR');
  assert.throws(() => posting.authoritativeTotal(subtotal, { freightTotal: -1 }), (e) => e.code === 'VALIDATION_ERROR');
});

test('P0-I: kontrak amount — kosong diturunkan server, terisi wajib cocok', () => {
  assert.equal(posting.assertAmountMatchesLines(0, 5_000_000), 5_000_000, 'amount kosong → server menurunkan total');
  assert.equal(posting.assertAmountMatchesLines(5_000_000, 5_000_000), 5_000_000);
  assert.equal(posting.assertAmountMatchesLines(5_000_000.005, 5_000_000), 5_000_000, 'toleransi pembulatan 1 sen');
  assert.throws(() => posting.assertAmountMatchesLines(10_000_000, 100_000_000, { documentType: 'QUOTATION' }),
    (e) => e.code === 'VALIDATION_ERROR' && e.extra.expectedAmount === 100_000_000 && e.extra.submittedAmount === 10_000_000);
});

dbTest('P0-I: header dipalsukan ditolak; header kosong diisi server', async () => rollback(async (client) => {
  const user = await owner(client);
  const lines = [{ description: 'Jasa fabrikasi', qty: 10, unitPrice: 10_000_000 }];   // 100 juta

  // Skenario serangan: header Rp10 juta padahal baris Rp100 juta (menembus ambang approval).
  await assert.rejects(
    () => runtime.createDocument(client, { type: 'QUOTATION', user, title: 'Tamper', amount: 10_000_000, payload: { lines }, requestId: randomUUID() }),
    (error) => error.code === 'VALIDATION_ERROR' && error.extra.expectedAmount === 100_000_000,
    'header yang tidak cocok dengan baris WAJIB ditolak'
  );

  // Header dikosongkan → server menurunkan total sebenarnya (bukan 0).
  const derived = await runtime.createDocument(client, { type: 'QUOTATION', user, title: 'Derived', amount: 0, payload: { lines }, requestId: randomUUID() });
  assert.equal(Number(derived.amount), 100_000_000, 'amount 0 tidak boleh lolos sebagai nol');

  // Diskon/pajak header direplikasi server persis seperti wizard penawaran.
  const withHeader = await runtime.createDocument(client, {
    type: 'QUOTATION', user, title: 'Diskon+pajak', amount: 99_900_000,
    payload: { lines, discountPct: 10, taxPct: 11 }, requestId: randomUUID()
  });
  assert.equal(Number(withHeader.amount), 99_900_000);

  // Baris tersimpan tetap dihitung server (bukan nilai kiriman klien).
  const stored = (await client.query('SELECT line_total FROM document_lines WHERE document_id=$1', [derived.id])).rows;
  assert.equal(Number(stored[0].line_total), 100_000_000);
}));

dbTest('P0-I: revisi baris pada dokumen DRAFT juga direkonsiliasi', async () => rollback(async (client) => {
  const user = await owner(client);
  const doc = await runtime.createDocument(client, { type: 'QUOTATION', user, title: 'Edit', amount: 0, payload: { lines: [{ description: 'A', qty: 1, unitPrice: 1000 }] }, requestId: randomUUID() });
  assert.equal(Number(doc.amount), 1000);
  await assert.rejects(
    () => runtime.updateDocument(client, { id: doc.id, expectedVersion: doc.version, patch: { amount: 1000, payload: { lines: [{ description: 'A', qty: 5, unitPrice: 1000 }] } }, user, requestId: randomUUID() }),
    (error) => error.code === 'VALIDATION_ERROR' && error.extra.expectedAmount === 5000,
    'menaikkan qty tanpa menaikkan header wajib ditolak'
  );
  const ok = await runtime.updateDocument(client, { id: doc.id, expectedVersion: doc.version, patch: { amount: 5000, payload: { lines: [{ description: 'A', qty: 5, unitPrice: 1000 }] } }, user, requestId: randomUUID() });
  assert.equal(Number(ok.amount), 5000);
}));
