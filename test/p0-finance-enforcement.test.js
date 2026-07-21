'use strict';
// P0 Wave 2 — bukti enforcement keuangan (blueprint Phase 0 #18,19,20 + FIN-CRIT-01/02/03/08).
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const runtime = require('../backend/infrastructure/database/repositories/runtime');
const businessOps = require('../backend/infrastructure/database/repositories/business-operations');
const financeReports = require('../backend/infrastructure/database/repositories/finance-reports');
const accountingConfig = require('../backend/infrastructure/database/repositories/accounting-config');

const dbTest = process.env.DATABASE_URL ? test : test.skip;
async function rollback(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try { await client.query('BEGIN'); await fn(client); }
  finally { await client.query('ROLLBACK').catch(() => {}); await client.end(); }
}
async function owner(client) {
  const r = (await client.query(`SELECT u.*,b.legal_entity_id FROM app_users u JOIN branches b ON b.id=u.branch_id WHERE u.role='owner' AND b.legal_entity_id IS NOT NULL LIMIT 1`)).rows[0];
  return { id: r.id, role: r.role, branchId: r.branch_id, branchScope: '*', displayName: r.display_name, legalEntityId: r.legal_entity_id };
}

dbTest('P0-D: alokasi pembayaran idempoten — replay kunci sama tidak menggandakan nilai', async () => rollback(async (client) => {
  const user = await owner(client);
  const invoice = await runtime.createDocument(client, { type: 'INVOICE', user, title: 'Idempotency invoice', amount: 1_000_000, requestId: randomUUID() });
  const payment = await runtime.createDocument(client, { type: 'CUSTOMER_PAYMENT', user, title: 'Idempotency payment', amount: 1_000_000, requestId: randomUUID() });
  await client.query(`UPDATE business_documents SET status='APPROVED' WHERE id=ANY($1::uuid[])`, [[invoice.id, payment.id]]);

  const key = randomUUID();
  const call = () => runtime.withIdempotency(client, {
    userId: user.id, operation: 'payments.allocate', key,
    body: { paymentId: payment.id, invoiceId: invoice.id, amount: 400_000 }
  }, async () => ({ status: 200, body: await businessOps.allocatePayment(client, { paymentId: payment.id, invoiceId: invoice.id, amount: 400_000, user }) }));

  const first = await call();
  const replay = await call();                                // retry jaringan/browser
  assert.equal(first.body.paid, 400_000);
  assert.equal(replay.body.paid, 400_000, 'replay TIDAK boleh menambah alokasi');

  const total = Number((await client.query('SELECT COALESCE(sum(amount),0) n FROM payment_allocations WHERE invoice_document_id=$1 AND reversed_at IS NULL', [invoice.id])).rows[0].n);
  assert.equal(total, 400_000, 'total alokasi tersimpan hanya sekali');

  // Kunci sama + payload berbeda WAJIB ditolak (bukan diam-diam mengalokasi ulang).
  await assert.rejects(() => runtime.withIdempotency(client, {
    userId: user.id, operation: 'payments.allocate', key,
    body: { paymentId: payment.id, invoiceId: invoice.id, amount: 900_000 }
  }, async () => ({ status: 200, body: {} })), (error) => error.code === 'DUPLICATE_REQUEST', 'kunci dipakai ulang dengan payload berbeda wajib ditolak');

  // Tanpa idempotency (perilaku lama) alokasi memang bertambah — membuktikan kunci itu yang melindungi.
  await businessOps.allocatePayment(client, { paymentId: payment.id, invoiceId: invoice.id, amount: 100_000, user });
  const after = Number((await client.query('SELECT COALESCE(sum(amount),0) n FROM payment_allocations WHERE invoice_document_id=$1 AND reversed_at IS NULL', [invoice.id])).rows[0].n);
  assert.equal(after, 500_000, 'alokasi tanpa kunci memang bertambah — inilah risiko yang ditutup idempotency');
}));

dbTest('P0-F: akun berkategori tidak dikenal muncul sebagai UNMAPPED dan memblokir publikasi', async () => rollback(async (client) => {
  const user = await owner(client);
  const period = new Date().toLocaleDateString('sv-SE').slice(0, 7);
  const clean = await financeReports.financialStatements(client, period, user);
  assert.equal(clean.balanceSheet.publishBlocked, false, 'bagan akun sehat tidak memblokir publikasi');

  // Akun dengan kategori di luar 6 standar + jurnal bersaldo.
  const acc = (await client.query(`INSERT INTO chart_of_accounts(id,code,name,normal_side,category,active) VALUES($1,'9999','Akun Salah Klasifikasi','D','SUSPENSE',true) RETURNING id`, [randomUUID()])).rows[0];
  const doc = await runtime.createDocument(client, { type: 'JOURNAL', user, title: 'Unmapped probe', amount: 5000, payload: { period }, requestId: randomUUID() });
  await client.query(`INSERT INTO journal_lines(id,journal_document_id,account_id,debit,credit,memo) VALUES($1,$2,$3,5000,0,'probe')`, [randomUUID(), doc.id, acc.id]);

  const blocked = await financeReports.financialStatements(client, period, user);
  assert.equal(blocked.balanceSheet.publishBlocked, true, 'akun tak terpetakan WAJIB memblokir publikasi');
  assert.equal(blocked.balanceSheet.balanced, false, 'laporan tidak boleh diklaim seimbang saat ada UNMAPPED');
  assert.ok(blocked.balanceSheet.unmappedLines.some((r) => r.code === '9999'), 'baris UNMAPPED tampil eksplisit');
  assert.ok(!blocked.balanceSheet.equity.some((r) => r.code === '9999'), 'TIDAK boleh diam-diam masuk ekuitas');
}));

dbTest('P0-H: periode akuntansi ter-scope per Legal Entity', async () => rollback(async (client) => {
  const user = await owner(client);
  const entityId = await accountingConfig.defaultLegalEntityId(client);
  assert.equal(entityId, user.legalEntityId, 'entitas default = entitas milik owner');

  const columns = (await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='accounting_periods'`)).rows.map((r) => r.column_name);
  assert.ok(columns.includes('legal_entity_id'), 'kolom legal_entity_id wajib ada');

  const idx = (await client.query(`SELECT indexdef FROM pg_indexes WHERE tablename='accounting_periods' AND indexname='ux_accounting_periods_entity_period'`)).rows[0];
  assert.ok(idx && /legal_entity_id/.test(idx.indexdef) && /period/.test(idx.indexdef), 'keunikan periode wajib per (legal_entity_id, period)');

  const globalUnique = (await client.query(`SELECT conname FROM pg_constraint WHERE conrelid='accounting_periods'::regclass AND contype='u' AND conname='accounting_periods_period_key'`)).rows[0];
  assert.equal(globalUnique, undefined, 'keunikan period global lama wajib dihapus');

  // Seluruh baris ter-backfill (tidak ada periode tanpa entitas).
  const orphan = Number((await client.query('SELECT count(*)::int n FROM accounting_periods WHERE legal_entity_id IS NULL')).rows[0].n);
  assert.equal(orphan, 0, 'backfill periode lama wajib lengkap');
}));

dbTest('P0-J: nomor PO pelanggan unik per pelanggan', async () => rollback(async (client) => {
  const user = await owner(client);
  const customer = (await client.query('SELECT id,name FROM customers WHERE active LIMIT 1')).rows[0];
  assert.ok(customer, 'butuh minimal satu pelanggan aktif');
  const poNumber = `PO-UNIQ-${Date.now()}`;
  const first = await runtime.createDocument(client, { type: 'CUSTOMER_PO', user, title: 'CPO pertama', amount: 1000, partyId: customer.id, partyName: customer.name, payload: { customerPoNumber: poNumber }, requestId: randomUUID() });

  // Lapisan 1 — aplikasi menolak lebih dulu dengan pesan yang bisa ditindaklanjuti.
  await assert.rejects(
    () => runtime.createDocument(client, { type: 'CUSTOMER_PO', user, title: 'CPO duplikat', amount: 2000, partyId: customer.id, partyName: customer.name, payload: { customerPoNumber: poNumber }, requestId: randomUUID() }),
    (error) => error.code === 'DOCUMENT_CONFLICT' && error.extra.existingDocument === first.documentNumber,
    'nomor PO pelanggan yang sama pada pelanggan yang sama wajib ditolak'
  );

  // Lapisan 2 — indeks unik adalah benteng terakhir terhadap balapan transaksi.
  // Diuji lewat UPDATE langsung yang tidak melewati validasi aplikasi sama sekali.
  const second = await runtime.createDocument(client, { type: 'CUSTOMER_PO', user, title: 'CPO kedua', amount: 2000, partyId: customer.id, partyName: customer.name, payload: { customerPoNumber: `${poNumber}-LAIN` }, requestId: randomUUID() });
  await assert.rejects(
    () => client.query(`UPDATE business_documents SET payload=jsonb_set(payload,'{customerPoNumber}',to_jsonb($1::text)) WHERE id=$2`, [poNumber, second.id]),
    (error) => error.code === '23505',
    'indeks unik database wajib menolak duplikat walau validasi aplikasi dilewati'
  );
}));
