'use strict';
// P0-K — eksposur kredit lengkap (Sales Critical 2 / blueprint §8.6).
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const runtime = require('../backend/infrastructure/database/repositories/runtime');
const procurement = require('../backend/infrastructure/database/repositories/procurement');

const dbTest = process.env.DATABASE_URL ? test : test.skip;
async function rollback(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try { await client.query('BEGIN'); await fn(client); }
  finally { await client.query('ROLLBACK').catch(() => {}); await client.end(); }
}
async function owner(client) {
  const r = (await client.query(`SELECT u.*,b.legal_entity_id FROM app_users u JOIN branches b ON b.id=u.branch_id WHERE u.role='owner' AND b.legal_entity_id IS NOT NULL LIMIT 1`)).rows[0];
  return { id: r.id, role: r.role, branchId: r.branch_id, branchScope: '*', displayName: r.display_name };
}
async function customerWithLimit(client, limit) {
  const c = (await client.query(
    `INSERT INTO customers(id,code,name,legal_name,customer_type,ppn_status,payment_term_days,currency,risk_rating,collection_status,credit_limit_amount,active)
     VALUES($1,$2,'Kredit Test','PT Kredit Test','COMPANY','PKP',30,'IDR','LOW','NORMAL',$3,true) RETURNING id,name`,
    [randomUUID(), `CRD${Date.now().toString(36).toUpperCase().slice(-8)}`, limit])).rows[0];
  return c;
}
const raw = (client, id) => client.query('SELECT * FROM business_documents WHERE id=$1', [id]).then((r) => r.rows[0]);

dbTest('P0-K: Sales Order terbuka ikut menghabiskan batas kredit', async () => rollback(async (client) => {
  const user = await owner(client);
  const cust = await customerWithLimit(client, 100_000_000);

  // SO pertama 80 juta — disetujui dan masih terbuka (belum ditagih).
  const so1 = await runtime.createDocument(client, { type: 'SALES_ORDER', user, title: 'SO A', amount: 80_000_000, partyId: cust.id, partyName: cust.name, requestId: randomUUID() });
  await procurement.assertCreditOk(client, await raw(client, so1.id));   // lolos: eksposur 0 + 80 jt
  await client.query(`UPDATE business_documents SET status='APPROVED' WHERE id=$1`, [so1.id]);

  const status = await procurement.creditStatus(client, cust.id);
  assert.equal(status.breakdown.openSalesOrders, 80_000_000, 'SO terbuka wajib masuk eksposur');
  assert.equal(status.breakdown.openAr, 0, 'belum ada invoice');
  assert.equal(status.exposure, 80_000_000);

  // SO kedua 80 juta — DULU lolos karena AR masih nol; kini wajib ditolak.
  const so2 = await runtime.createDocument(client, { type: 'SALES_ORDER', user, title: 'SO B', amount: 80_000_000, partyId: cust.id, partyName: cust.name, requestId: randomUUID() });
  const so2Raw = await raw(client, so2.id);
  await assert.rejects(
    () => procurement.assertCreditOk(client, so2Raw),
    (error) => error.code === 'CREDIT_HOLD' && error.extra.exposure === 80_000_000,
    'dua SO yang bersama-sama melampaui limit wajib diblokir'
  );
}));

dbTest('P0-K: pengiriman belum ditagih menambah eksposur dan dicek saat pelepasan', async () => rollback(async (client) => {
  const user = await owner(client);
  const cust = await customerWithLimit(client, 10_000_000);

  const delivery = await runtime.createDocument(client, { type: 'DELIVERY', user, title: 'DO besar', amount: 9_000_000, partyId: cust.id, partyName: cust.name, requestId: randomUUID() });
  await client.query(`UPDATE business_documents SET status='COMPLETED' WHERE id=$1`, [delivery.id]);

  const status = await procurement.creditStatus(client, cust.id);
  assert.equal(status.breakdown.unbilledDeliveries, 9_000_000, 'pengiriman belum ditagih masuk eksposur');

  // DELIVERY kini termasuk jenis dokumen yang dicek kredit.
  const another = await runtime.createDocument(client, { type: 'DELIVERY', user, title: 'DO kedua', amount: 5_000_000, partyId: cust.id, partyName: cust.name, requestId: randomUUID() });
  const anotherRaw = await raw(client, another.id);
  await assert.rejects(
    () => procurement.assertCreditOk(client, anotherRaw),
    (error) => error.code === 'CREDIT_HOLD',
    'pelepasan pengiriman wajib melewati checkpoint kredit'
  );
}));

dbTest('P0-K: SO yang sudah ditagih tidak dihitung ganda dengan invoice-nya', async () => rollback(async (client) => {
  const user = await owner(client);
  const cust = await customerWithLimit(client, 100_000_000);

  const so = await runtime.createDocument(client, { type: 'SALES_ORDER', user, title: 'SO ditagih', amount: 30_000_000, partyId: cust.id, partyName: cust.name, requestId: randomUUID() });
  await client.query(`UPDATE business_documents SET status='APPROVED' WHERE id=$1`, [so.id]);
  const inv = await runtime.createDocument(client, { type: 'INVOICE', user, title: 'INV dari SO', amount: 30_000_000, partyId: cust.id, partyName: cust.name, requestId: randomUUID() });
  await client.query(`UPDATE business_documents SET status='APPROVED' WHERE id=$1`, [inv.id]);
  await client.query(`INSERT INTO document_relations(parent_document_id,child_document_id,relation_type,created_by) VALUES($1,$2,'ORDER_TO_INVOICE',$3)`, [so.id, inv.id, user.id]);

  const status = await procurement.creditStatus(client, cust.id);
  assert.equal(status.breakdown.openAr, 30_000_000, 'invoice terbuka dihitung');
  assert.equal(status.breakdown.openSalesOrders, 0, 'SO yang sudah punya invoice TIDAK dihitung lagi');
  assert.equal(status.exposure, 30_000_000, 'eksposur tidak boleh menjadi 60 juta');
}));
