'use strict';
// P1-4 — baris pemenuhan bertipe. Sebelumnya document_lines tidak menyimpan
// kaitan apa pun antara baris pengiriman/tagihan dengan baris pesanan, sehingga
// sistem tidak dapat menjawab berapa banyak tiap baris sales order sudah
// dikirim atau ditagih. Pemenuhan parsial tidak terlihat sama sekali.
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
  try { await client.query('BEGIN'); await client.query("SELECT set_config('app.is_system','on',true),set_config('app.is_platform','on',true),set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true)"); await fn(client); }
  finally { await client.query('ROLLBACK').catch(() => {}); await client.end(); }
}
async function owner(client) {
  const r = (await client.query(`SELECT u.*,b.legal_entity_id FROM app_users u JOIN branches b ON b.id=u.branch_id WHERE u.role='owner' AND b.legal_entity_id IS NOT NULL LIMIT 1`)).rows[0];
  return { id: r.id, role: r.role, branchId: r.branch_id, branchScope: '*', displayName: r.display_name };
}
let seq = 0;
async function product(client) {
  return (await client.query(
    `INSERT INTO products(id,code,name,product_type,category,uom,hpp,price,make_or_buy,active)
     VALUES($1,$2,'Barang pemenuhan','PRODUCT','FUL','PCS',1000,2000,'BUY',true) RETURNING id,code`,
    [randomUUID(), `FUL${(seq += 1)}${Date.now().toString(36).toUpperCase().slice(-6)}`])).rows[0];
}
async function customer(client) {
  return (await client.query(
    `INSERT INTO customers(id,code,name,legal_name,customer_type,ppn_status,payment_term_days,currency,risk_rating,collection_status,credit_limit_amount,active)
     VALUES($1,$2,'Pelanggan pemenuhan','PT Ful','COMPANY','PKP',30,'IDR','LOW','NORMAL',0,true) RETURNING id,name`,
    [randomUUID(), `FC${(seq += 1)}${Date.now().toString(36).toUpperCase().slice(-6)}`])).rows[0];
}
const doc = (client, user, type, cust, lines, extra = {}) => runtime.createDocument(client, {
  type, user, title: type, amount: 0, partyId: cust.id, partyName: cust.name,
  requestId: randomUUID(), payload: { lines, taxPct: 0, ...extra }
});
const approve = (client, id, status = 'APPROVED') => client.query(`UPDATE business_documents SET status=$2 WHERE id=$1`, [id, status]);
const lineIdsOf = (client, id) => client.query('SELECT id,line_no FROM document_lines WHERE document_id=$1 ORDER BY line_no', [id]).then((r) => r.rows);

dbTest('P1-4: pemenuhan parsial terlihat per baris', async () => rollback(async (client) => {
  const user = await owner(client);
  const cust = await customer(client);
  const a = await product(client), b = await product(client);

  const so = await doc(client, user, 'SALES_ORDER', cust, [
    { productId: a.id, description: a.code, qty: 10, unitPrice: 2000, taxPct: 0 },
    { productId: b.id, description: b.code, qty: 4, unitPrice: 5000, taxPct: 0 }
  ]);
  await approve(client, so.id);
  const lines = await lineIdsOf(client, so.id);

  // Sebelum ada pengiriman: seluruhnya terbuka.
  let status = await posting.orderFulfilment(client, so.id);
  assert.equal(status.status, 'OPEN');
  assert.equal(status.totals.ordered, 14);
  assert.equal(status.totals.delivered, 0);
  assert.equal(status.lines[0].remainingQty, 10);

  // Kirim sebagian baris pertama.
  const dn = await doc(client, user, 'DELIVERY', cust, [
    { productId: a.id, description: a.code, qty: 6, unitPrice: 2000, taxPct: 0, sourceLineId: lines[0].id }
  ]);
  await approve(client, dn.id, 'COMPLETED');

  status = await posting.orderFulfilment(client, so.id);
  assert.equal(status.status, 'PARTIAL', 'pemenuhan parsial wajib terlihat');
  assert.equal(status.lines[0].deliveredQty, 6);
  assert.equal(status.lines[0].remainingQty, 4);
  assert.equal(status.lines[1].deliveredQty, 0, 'baris lain tidak ikut terpengaruh');
  assert.equal(status.totals.remaining, 8);

  // Lunasi sisanya pada kedua baris.
  const dn2 = await doc(client, user, 'DELIVERY', cust, [
    { productId: a.id, description: a.code, qty: 4, unitPrice: 2000, taxPct: 0, sourceLineId: lines[0].id },
    { productId: b.id, description: b.code, qty: 4, unitPrice: 5000, taxPct: 0, sourceLineId: lines[1].id }
  ]);
  await approve(client, dn2.id, 'COMPLETED');
  status = await posting.orderFulfilment(client, so.id);
  assert.equal(status.status, 'FULFILLED');
  assert.equal(status.totals.remaining, 0);
}));

dbTest('P1-4: pengiriman melebihi sisa pesanan ditolak', async () => rollback(async (client) => {
  const user = await owner(client);
  const cust = await customer(client);
  const prod = await product(client);
  const so = await doc(client, user, 'SALES_ORDER', cust, [{ productId: prod.id, description: prod.code, qty: 10, unitPrice: 2000, taxPct: 0 }]);
  await approve(client, so.id);
  const [line] = await lineIdsOf(client, so.id);

  await assert.rejects(() => doc(client, user, 'DELIVERY', cust,
    [{ productId: prod.id, description: prod.code, qty: 11, unitPrice: 2000, taxPct: 0, sourceLineId: line.id }]),
  (e) => e.code === 'VALIDATION_ERROR' && e.extra.availableQty === 10 && e.extra.orderedQty === 10,
  'kirim 11 atas pesanan 10 wajib ditolak');

  // Kirim 7 dulu, lalu 4 (kumulatif 11) juga ditolak.
  const dn = await doc(client, user, 'DELIVERY', cust, [{ productId: prod.id, description: prod.code, qty: 7, unitPrice: 2000, taxPct: 0, sourceLineId: line.id }]);
  await approve(client, dn.id, 'COMPLETED');
  await assert.rejects(() => doc(client, user, 'DELIVERY', cust,
    [{ productId: prod.id, description: prod.code, qty: 4, unitPrice: 2000, taxPct: 0, sourceLineId: line.id }]),
  (e) => e.code === 'VALIDATION_ERROR' && e.extra.alreadyFulfilled === 7 && e.extra.availableQty === 3,
  'pengiriman terdahulu wajib diperhitungkan');

  // Tepat sisanya diterima.
  const ok = await doc(client, user, 'DELIVERY', cust, [{ productId: prod.id, description: prod.code, qty: 3, unitPrice: 2000, taxPct: 0, sourceLineId: line.id }]);
  assert.match(ok.documentNumber, /^DO-/);
}));

dbTest('P1-4: tagihan tidak boleh melampaui yang sudah dikirim', async () => rollback(async (client) => {
  const user = await owner(client);
  const cust = await customer(client);
  const prod = await product(client);
  const so = await doc(client, user, 'SALES_ORDER', cust, [{ productId: prod.id, description: prod.code, qty: 10, unitPrice: 2000, taxPct: 0 }]);
  await approve(client, so.id);
  const [line] = await lineIdsOf(client, so.id);
  const dn = await doc(client, user, 'DELIVERY', cust, [{ productId: prod.id, description: prod.code, qty: 4, unitPrice: 2000, taxPct: 0, sourceLineId: line.id }]);
  await approve(client, dn.id, 'COMPLETED');

  await assert.rejects(() => doc(client, user, 'INVOICE', cust,
    [{ productId: prod.id, description: prod.code, qty: 6, unitPrice: 2000, taxPct: 0, sourceLineId: line.id }]),
  (e) => e.code === 'VALIDATION_ERROR' && /melebihi yang sudah dikirim/.test(String(e.detail || e.message)),
  'menagih lebih banyak daripada yang dikirim wajib ditolak');

  const ok = await doc(client, user, 'INVOICE', cust, [{ productId: prod.id, description: prod.code, qty: 4, unitPrice: 2000, taxPct: 0, sourceLineId: line.id }]);
  await approve(client, ok.id);
  const status = await posting.orderFulfilment(client, so.id);
  assert.equal(status.lines[0].invoicedQty, 4);
}));

dbTest('P1-4: tautan lintas pelanggan, produk berbeda, dan pesanan draf ditolak', async () => rollback(async (client) => {
  const user = await owner(client);
  const buyer = await customer(client), stranger = await customer(client);
  const a = await product(client), b = await product(client);

  const so = await doc(client, user, 'SALES_ORDER', buyer, [{ productId: a.id, description: a.code, qty: 5, unitPrice: 2000, taxPct: 0 }]);
  const [line] = await lineIdsOf(client, so.id);

  // Pesanan masih DRAFT — belum boleh dipenuhi.
  await assert.rejects(() => doc(client, user, 'DELIVERY', buyer,
    [{ productId: a.id, description: a.code, qty: 1, unitPrice: 2000, taxPct: 0, sourceLineId: line.id }]),
  (e) => e.code === 'STATUS_INVALID' && /DRAFT/.test(String(e.detail || e.message)));

  await approve(client, so.id);
  // Pelanggan berbeda.
  await assert.rejects(() => doc(client, user, 'DELIVERY', stranger,
    [{ productId: a.id, description: a.code, qty: 1, unitPrice: 2000, taxPct: 0, sourceLineId: line.id }]),
  (e) => e.code === 'VALIDATION_ERROR' && /milik pelanggan lain/.test(String(e.detail || e.message)));
  // Produk berbeda.
  await assert.rejects(() => doc(client, user, 'DELIVERY', buyer,
    [{ productId: b.id, description: b.code, qty: 1, unitPrice: 2000, taxPct: 0, sourceLineId: line.id }]),
  (e) => e.code === 'VALIDATION_ERROR' && /tidak cocok dengan baris pesanan/.test(String(e.detail || e.message)));
  // Baris pesanan yang tidak ada.
  await assert.rejects(() => doc(client, user, 'DELIVERY', buyer,
    [{ productId: a.id, description: a.code, qty: 1, unitPrice: 2000, taxPct: 0, sourceLineId: randomUUID() }]),
  (e) => e.code === 'RESOURCE_NOT_FOUND');
}));

dbTest('P1-4: pengiriman draf tidak mengunci sisa pesanan', async () => rollback(async (client) => {
  const user = await owner(client);
  const cust = await customer(client);
  const prod = await product(client);
  const so = await doc(client, user, 'SALES_ORDER', cust, [{ productId: prod.id, description: prod.code, qty: 10, unitPrice: 2000, taxPct: 0 }]);
  await approve(client, so.id);
  const [line] = await lineIdsOf(client, so.id);

  // Pengiriman dibuat lalu dibiarkan DRAFT — sesuai aturan yang sama dengan
  // three-way match, draf telantar tidak boleh mengunci sisa selamanya.
  await doc(client, user, 'DELIVERY', cust, [{ productId: prod.id, description: prod.code, qty: 10, unitPrice: 2000, taxPct: 0, sourceLineId: line.id }]);
  const status = await posting.orderFulfilment(client, so.id);
  assert.equal(status.lines[0].deliveredQty, 0, 'draf tidak dihitung sebagai terkirim');
  assert.equal(status.lines[0].remainingQty, 10);

  // Karena itu pengiriman penuh yang sah tetap bisa dibuat.
  const real = await doc(client, user, 'DELIVERY', cust, [{ productId: prod.id, description: prod.code, qty: 10, unitPrice: 2000, taxPct: 0, sourceLineId: line.id }]);
  assert.match(real.documentNumber, /^DO-/);
}));

dbTest('P1-4: baris pesanan yang sudah dipenuhi tidak dapat dihapus diam-diam', async () => rollback(async (client) => {
  const user = await owner(client);
  const cust = await customer(client);
  const prod = await product(client);
  const so = await doc(client, user, 'SALES_ORDER', cust, [{ productId: prod.id, description: prod.code, qty: 5, unitPrice: 2000, taxPct: 0 }]);
  await approve(client, so.id);
  const [line] = await lineIdsOf(client, so.id);
  const dn = await doc(client, user, 'DELIVERY', cust, [{ productId: prod.id, description: prod.code, qty: 2, unitPrice: 2000, taxPct: 0, sourceLineId: line.id }]);
  await approve(client, dn.id, 'COMPLETED');

  // FK RESTRICT: riwayat pemenuhan tidak boleh lenyap bersama barisnya.
  await assert.rejects(() => client.query('DELETE FROM document_lines WHERE id=$1', [line.id]),
    (e) => e.code === '23503', 'menghapus baris pesanan yang sudah dipenuhi wajib gagal');
}));

dbTest('P0.5: duplikasi source line dan tautan parsial tidak dapat melewati batas', async () => rollback(async (client) => {
  const user = await owner(client), cust = await customer(client), prod = await product(client);
  const so = await doc(client, user, 'SALES_ORDER', cust, [{ productId: prod.id, description: prod.code, qty: 10, unitPrice: 2000, taxPct: 0 }]);
  await approve(client, so.id); const [line] = await lineIdsOf(client, so.id);
  await assert.rejects(() => doc(client, user, 'DELIVERY', cust, [
    { productId: prod.id, description: 'A', qty: 6, unitPrice: 2000, sourceLineId: line.id },
    { productId: prod.id, description: 'B', qty: 6, unitPrice: 2000, sourceLineId: line.id }
  ]), (e) => e.code === 'VALIDATION_ERROR' && e.extra.requestedQty === undefined && /12/.test(String(e.detail || e.message)));
  await assert.rejects(() => doc(client, user, 'DELIVERY', cust, [
    { productId: prod.id, description: 'Linked', qty: 1, unitPrice: 2000, sourceLineId: line.id },
    { productId: prod.id, description: 'Unlinked', qty: 1, unitPrice: 2000 }
  ]), (e) => e.code === 'VALIDATION_ERROR' && /Seluruh baris/.test(String(e.detail || e.message)));
}));

dbTest('P0.5: dua draf tidak dapat sama-sama submit melampaui sisa order', async () => rollback(async (client) => {
  const user = await owner(client), cust = await customer(client), prod = await product(client);
  const so = await doc(client, user, 'SALES_ORDER', cust, [{ productId: prod.id, description: prod.code, qty: 10, unitPrice: 2000, taxPct: 0 }]);
  await approve(client, so.id); const [line] = await lineIdsOf(client, so.id);
  const first = await doc(client, user, 'DELIVERY', cust, [{ productId: prod.id, description: 'D1', qty: 7, unitPrice: 2000, sourceLineId: line.id }]);
  const second = await doc(client, user, 'DELIVERY', cust, [{ productId: prod.id, description: 'D2', qty: 7, unitPrice: 2000, sourceLineId: line.id }]);
  await runtime.transitionDocument(client, { id: first.id, action: 'submit', user, requestId: randomUUID(), allowOwnerOverride: true });
  await assert.rejects(() => runtime.transitionDocument(client, { id: second.id, action: 'submit', user, requestId: randomUUID(), allowOwnerOverride: true }),
    (e) => e.code === 'VALIDATION_ERROR' && e.extra.availableQty === 3);
}));
