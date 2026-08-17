'use strict';
// P0-J — Customer PO: keabsahan pelanggan, keunikan nomor PO, dan keterkaitan
// ke penawaran ditegakkan di server (Sales audit — Critical 1).
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const runtime = require('../backend/infrastructure/database/repositories/runtime');

const dbTest = process.env.DATABASE_URL ? test : test.skip;
async function rollback(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try { await client.query('BEGIN'); await client.query("SELECT set_config('app.is_system','on',true),set_config('app.is_platform','on',true),set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true)"); await fn(client); }
  finally { await client.query('ROLLBACK').catch(() => {}); await client.end(); }
}
async function owner(client) {
  const r = (await client.query(`SELECT u.*,b.legal_entity_id FROM app_users u JOIN branches b ON b.id=u.branch_id WHERE u.role='owner' AND b.legal_entity_id IS NOT NULL LIMIT 1`)).rows[0];
  return { id: r.id, role: r.role, branchId: r.branch_id, branchScope: '*', displayName: r.display_name };
}
let seq = 0;
async function customer(client, { active = true, collection = 'NORMAL' } = {}) {
  return (await client.query(
    `INSERT INTO customers(id,code,name,legal_name,customer_type,ppn_status,payment_term_days,currency,risk_rating,collection_status,credit_limit_amount,active)
     VALUES($1,$2,$3,'PT Uji CPO','COMPANY','PKP',30,'IDR','LOW',$4,500000000,$5) RETURNING id,name`,
    [randomUUID(), `CPO${(seq += 1)}${Date.now().toString(36).toUpperCase().slice(-6)}`, `Pelanggan CPO ${seq}`, collection, active])).rows[0];
}
const cpo = (client, user, cust, payload, amount = 1_000_000) => runtime.createDocument(client, {
  type: 'CUSTOMER_PO', user, title: 'PO pelanggan', amount,
  partyId: cust.id, partyName: cust.name, requestId: randomUUID(), payload
});

dbTest('P0-J: nomor PO wajib dan unik per pelanggan', async () => rollback(async (client) => {
  const user = await owner(client);
  const a = await customer(client), b = await customer(client);

  await assert.rejects(() => cpo(client, user, a, {}),
    (e) => e.code === 'VALIDATION_ERROR' && /Nomor PO pelanggan wajib/.test(String(e.detail || e.message)),
    'Customer PO tanpa nomor PO wajib ditolak');

  const first = await cpo(client, user, a, { customerPoNumber: 'PO-2026-777' });
  assert.match(first.documentNumber, /^CPO-/);

  await assert.rejects(() => cpo(client, user, a, { customerPoNumber: 'PO-2026-777' }),
    (e) => e.code === 'DOCUMENT_CONFLICT' && e.extra.existingDocument === first.documentNumber,
    'nomor PO ganda dari pelanggan yang sama wajib ditolak');

  // Nomor sama dari pelanggan BERBEDA tetap sah — keunikan bersifat per pelanggan.
  const other = await cpo(client, user, b, { customerPoNumber: 'PO-2026-777' });
  assert.match(other.documentNumber, /^CPO-/);
}));

dbTest('P0-J: pelanggan non-aktif atau tidak dikenal ditolak', async () => rollback(async (client) => {
  const user = await owner(client);
  const inactive = await customer(client, { active: false });

  await assert.rejects(() => cpo(client, user, inactive, { customerPoNumber: 'PO-A' }),
    (e) => e.code === 'VALIDATION_ERROR' && /non-aktif/.test(String(e.detail || e.message)));
  await assert.rejects(() => cpo(client, user, { id: randomUUID(), name: 'Hantu' }, { customerPoNumber: 'PO-B' }),
    (e) => e.code === 'RESOURCE_NOT_FOUND');

  // Pelanggan dalam penagihan hukum tetap boleh DICATAT PO-nya — gerbang kredit
  // berada di pelepasan Sales Order/Delivery, bukan di pencatatan PO.
  const legal = await customer(client, { collection: 'LEGAL' });
  const recorded = await cpo(client, user, legal, { customerPoNumber: 'PO-LEGAL' });
  assert.match(recorded.documentNumber, /^CPO-/);
}));

dbTest('P0-J: penawaran rujukan wajib milik pelanggan yang sama dan sudah disetujui', async () => rollback(async (client) => {
  const user = await owner(client);
  const buyer = await customer(client), stranger = await customer(client);

  const quote = await runtime.createDocument(client, { type: 'QUOTATION', user, title: 'Penawaran', amount: 5_000_000, partyId: buyer.id, partyName: buyer.name, requestId: randomUUID() });

  // Masih DRAFT — belum boleh menjadi dasar Customer PO.
  await assert.rejects(() => cpo(client, user, buyer, { customerPoNumber: 'PO-C', quotationId: quote.id }, 5_000_000),
    (e) => e.code === 'STATUS_INVALID' && e.extra.quotationStatus === 'DRAFT');

  await client.query(`UPDATE business_documents SET status='APPROVED' WHERE id=$1`, [quote.id]);

  // Pelanggan berbeda dari pemilik penawaran.
  await assert.rejects(() => cpo(client, user, stranger, { customerPoNumber: 'PO-D', quotationId: quote.id }, 5_000_000),
    (e) => e.code === 'VALIDATION_ERROR' && /tidak cocok dengan pelanggan/.test(String(e.detail || e.message)));

  // Nilai PO melebihi penawaran.
  await assert.rejects(() => cpo(client, user, buyer, { customerPoNumber: 'PO-E', quotationId: quote.id }, 7_500_000),
    (e) => e.code === 'VALIDATION_ERROR' && e.extra.quotedAmount === 5_000_000 && e.extra.orderedAmount === 7_500_000);

  // Sesuai penawaran → diterima.
  const ok = await cpo(client, user, buyer, { customerPoNumber: 'PO-F', quotationId: quote.id }, 5_000_000);
  assert.equal(Number(ok.amount), 5_000_000);
}));

dbTest('P0-J: penawaran kedaluwarsa dan tanggal PO masa depan ditolak', async () => rollback(async (client) => {
  const user = await owner(client);
  const buyer = await customer(client);

  await assert.rejects(() => cpo(client, user, buyer, { customerPoNumber: 'PO-G', poDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) }),
    (e) => e.code === 'VALIDATION_ERROR' && /masa depan/.test(String(e.detail || e.message)));

  const expired = await runtime.createDocument(client, {
    type: 'QUOTATION', user, title: 'Penawaran lama', amount: 2_000_000, partyId: buyer.id, partyName: buyer.name,
    dueDate: new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10), requestId: randomUUID()
  });
  await client.query(`UPDATE business_documents SET status='APPROVED' WHERE id=$1`, [expired.id]);

  await assert.rejects(() => cpo(client, user, buyer, { customerPoNumber: 'PO-H', quotationId: expired.id }, 2_000_000),
    (e) => e.code === 'VALIDATION_ERROR' && /kedaluwarsa/.test(String(e.detail || e.message)));
}));
