'use strict';
// Wave 6 — reservasi stok sebagai CATATAN, bukan angka.
//
// Sebelumnya reservasi hanya kolom inventory_balances.qty_reserved: satu angka
// tanpa asal-usul. Tidak dapat dijawab siapa menahan stok dan untuk dokumen
// apa, dan tidak dapat dilepas satu per satu. Sejak v0.34 ATP/CTP menjanjikan
// tanggal ke pelanggan berdasarkan stok yang sama sekali tidak dilindungi.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const runtime = require('../backend/infrastructure/database/repositories/runtime');
const reservations = require('../backend/infrastructure/database/repositories/stock-reservations');
const commercial = require('../backend/infrastructure/database/repositories/sales-commercial');

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
async function stocked(client, warehouseId, qtyOnHand) {
  const p = (await client.query(
    `INSERT INTO products(id,code,name,product_type,category,uom,hpp,price,make_or_buy,active)
     VALUES($1,$2,'Barang reservasi','PRODUCT','RSV','PCS',100,250,'BUY',true) RETURNING id,code`,
    [randomUUID(), `RSV${(seq += 1)}${Date.now().toString(36).toUpperCase().slice(-6)}`])).rows[0];
  await client.query(`INSERT INTO inventory_balances(id,product_id,warehouse_id,qty_on_hand,qty_reserved) VALUES($1,$2,$3,$4,0)`,
    [randomUUID(), p.id, warehouseId, qtyOnHand]);
  return p;
}
const anyDoc = (client, user, title = 'Dokumen penahan') => runtime.createDocument(client,
  { type: 'SALES_ORDER', user, title, amount: 0, requestId: randomUUID() });

dbTest('Wave 6: reservasi mencatat SIAPA menahan stok dan untuk dokumen apa', async () => rollback(async (client) => {
  const user = await owner(client);
  const prod = await stocked(client, user.branchId, 100);
  const doc = await anyDoc(client, user);

  const before = await reservations.availability(client, prod.id, user.branchId);
  assert.equal(before.available, 100);

  await reservations.reserve(client, { productId: prod.id, warehouseId: user.branchId,
    documentId: doc.id, qty: 30, user, reason: 'Menahan untuk pesanan pelanggan.' });

  const after = await reservations.availability(client, prod.id, user.branchId);
  assert.equal(after.reserved, 30);
  assert.equal(after.available, 70, 'yang ditahan tidak lagi tersedia');

  // Pertanyaan yang dulu TIDAK BISA dijawab: siapa yang menahan stok ini?
  const holders = await reservations.listForStock(client, prod.id, user.branchId);
  assert.equal(holders.items.length, 1);
  assert.equal(holders.items[0].documentNumber, doc.documentNumber);
  assert.equal(holders.items[0].remainingQty, 30);
  assert.match(holders.items[0].reason, /pesanan pelanggan/);

  // Cache qty_reserved diselaraskan dari catatan, bukan sebaliknya.
  const cached = (await client.query('SELECT qty_reserved::float q FROM inventory_balances WHERE product_id=$1 AND warehouse_id=$2', [prod.id, user.branchId])).rows[0].q;
  assert.equal(cached, 30, 'cache wajib cocok dengan catatan');
}));

dbTest('Wave 6: stok tidak dapat direservasi melebihi yang tersedia', async () => rollback(async (client) => {
  const user = await owner(client);
  const prod = await stocked(client, user.branchId, 10);
  const first = await anyDoc(client, user, 'Penahan pertama');
  const second = await anyDoc(client, user, 'Penahan kedua');

  await reservations.reserve(client, { productId: prod.id, warehouseId: user.branchId, documentId: first.id, qty: 8, user, reason: 'Pesanan pertama.' });

  await assert.rejects(() => reservations.reserve(client, { productId: prod.id, warehouseId: user.branchId, documentId: second.id, qty: 5, user, reason: 'Pesanan kedua.' }),
    (e) => e.code === 'VALIDATION_ERROR' && e.extra.availableQty === 2 && e.extra.shortQty === 3,
    'reservasi melebihi sisa wajib ditolak');

  // allowPartial: perencanaan produksi menerima kekurangan dan mencatatnya.
  const partial = await reservations.reserve(client, { productId: prod.id, warehouseId: user.branchId, documentId: second.id, qty: 5, user, allowPartial: true, reason: 'Perencanaan produksi.' });
  assert.equal(partial.reserved, 2);
  assert.equal(partial.shortQty, 3, 'kekurangan dilaporkan, bukan disembunyikan');
  assert.equal((await reservations.availability(client, prod.id, user.branchId)).available, 0);
}));

dbTest('Wave 6: pelepasan menuntut alasan dan mengembalikan stok', async () => rollback(async (client) => {
  const user = await owner(client);
  const prod = await stocked(client, user.branchId, 50);
  const doc = await anyDoc(client, user);
  await reservations.reserve(client, { productId: prod.id, warehouseId: user.branchId, documentId: doc.id, qty: 20, user, reason: 'Pesanan pelanggan.' });

  await assert.rejects(() => reservations.releaseDocument(client, { documentId: doc.id, user, reason: '' }),
    (e) => e.code === 'REASON_REQUIRED', 'melepas stok tanpa alasan wajib ditolak');

  const released = await reservations.releaseDocument(client, { documentId: doc.id, user, reason: 'Pesanan dibatalkan pelanggan.' });
  assert.equal(released.released, 1);
  assert.equal((await reservations.availability(client, prod.id, user.branchId)).available, 50, 'stok wajib kembali tersedia');
  assert.equal((await reservations.listForStock(client, prod.id, user.branchId)).items.length, 0);

  // Jejaknya tetap ada — pelepasan dapat dipertanggungjawabkan.
  const trail = (await client.query(`SELECT status,release_reason FROM stock_reservations WHERE document_id=$1`, [doc.id])).rows[0];
  assert.equal(trail.status, 'RELEASED');
  assert.match(trail.release_reason, /dibatalkan pelanggan/);
}));

dbTest('Wave 6: pemakaian berbeda dari pelepasan — dipakai berarti terpenuhi', async () => rollback(async (client) => {
  const user = await owner(client);
  const prod = await stocked(client, user.branchId, 40);
  const doc = await anyDoc(client, user);
  await reservations.reserve(client, { productId: prod.id, warehouseId: user.branchId, documentId: doc.id, qty: 25, user, reason: 'Pesanan pelanggan.' });

  const partial = await reservations.consume(client, { documentId: doc.id, productId: prod.id, warehouseId: user.branchId, qty: 10, user });
  assert.equal(partial.consumed, 10);
  assert.equal((await reservations.availability(client, prod.id, user.branchId)).reserved, 15, 'sisa reservasi tetap ditahan');

  const rest = await reservations.consume(client, { documentId: doc.id, productId: prod.id, warehouseId: user.branchId, qty: 15, user });
  assert.equal(rest.consumed, 15);
  const closed = (await client.query(`SELECT status FROM stock_reservations WHERE document_id=$1`, [doc.id])).rows[0];
  assert.equal(closed.status, 'CONSUMED', 'reservasi yang habis terpakai ditutup sebagai CONSUMED, bukan RELEASED');

  // Barang boleh keluar tanpa pernah direservasi — angkanya tetap jujur.
  const extra = await reservations.consume(client, { documentId: doc.id, productId: prod.id, warehouseId: user.branchId, qty: 5, user });
  assert.equal(extra.consumed, 0);
  assert.equal(extra.unreserved, 5);
}));

dbTest('Wave 6: reservasi kedaluwarsa dilepas otomatis, stok tidak tersandera selamanya', async () => rollback(async (client) => {
  const user = await owner(client);
  const prod = await stocked(client, user.branchId, 30);
  const doc = await anyDoc(client, user);
  await reservations.reserve(client, { productId: prod.id, warehouseId: user.branchId, documentId: doc.id, qty: 12, user,
    reason: 'Janji sementara.', expiresAt: new Date(Date.now() - 60_000) });

  assert.equal((await reservations.availability(client, prod.id, user.branchId)).available, 18);
  const swept = await reservations.expireStale(client);
  assert.ok(swept.expired >= 1);
  assert.equal((await reservations.availability(client, prod.id, user.branchId)).available, 30, 'stok kedaluwarsa wajib kembali');
  const row = (await client.query(`SELECT status FROM stock_reservations WHERE document_id=$1`, [doc.id])).rows[0];
  assert.equal(row.status, 'EXPIRED');
}));

dbTest('Wave 6: janji ATP benar-benar menahan stoknya — inti perbaikan', async () => rollback(async (client) => {
  const user = await owner(client);
  const prod = await stocked(client, user.branchId, 20);
  const cust = (await client.query(
    `INSERT INTO customers(id,code,name,legal_name,customer_type,ppn_status,payment_term_days,currency,risk_rating,collection_status,credit_limit_amount,active)
     VALUES($1,$2,'Pelanggan ATP','PT ATP','COMPANY','PKP',30,'IDR','LOW','NORMAL',0,true) RETURNING id,name`,
    [randomUUID(), `RC${(seq += 1)}${Date.now().toString(36).toUpperCase().slice(-6)}`])).rows[0];
  const so = await runtime.createDocument(client, { type: 'SALES_ORDER', user, title: 'SO janji ATP',
    amount: 0, partyId: cust.id, partyName: cust.name, requestId: randomUUID(),
    payload: { taxPct: 0, lines: [{ productId: prod.id, description: prod.code, qty: 15, unitPrice: 250, taxPct: 0 }] } });

  const promise = await commercial.calculateAvailability(client, { salesOrderId: so.id, user });
  assert.equal(Number(promise.items[0].atpQty), 15, 'seluruh permintaan tersedia');

  // Dulu: janji dicatat tetapi stoknya bebas diambil. Sekarang ditahan.
  const held = await reservations.listForStock(client, prod.id, user.branchId);
  assert.equal(held.items.length, 1, 'janji ATP wajib menahan stok');
  assert.equal(held.items[0].remainingQty, 15);
  assert.equal(held.items[0].documentNumber, so.documentNumber);
  assert.equal((await reservations.availability(client, prod.id, user.branchId)).available, 5,
    'sisa 5 saja yang boleh dijanjikan ke pihak lain');

  // Menghitung ulang ATP tidak boleh menahan dua kali.
  await commercial.calculateAvailability(client, { salesOrderId: so.id, user });
  assert.equal((await reservations.availability(client, prod.id, user.branchId)).available, 5,
    'perhitungan ulang tidak boleh menggandakan tahanan');
  assert.equal((await reservations.listForStock(client, prod.id, user.branchId)).items.length, 1);
}));

dbTest('Wave 6: dokumen yang dibatalkan melepas stoknya sendiri', async () => rollback(async (client) => {
  const user = await owner(client);
  const prod = await stocked(client, user.branchId, 60);
  const doc = await anyDoc(client, user, 'SO akan dibatalkan');
  await reservations.reserve(client, { productId: prod.id, warehouseId: user.branchId, documentId: doc.id, qty: 25, user, reason: 'Pesanan pelanggan.' });
  assert.equal((await reservations.availability(client, prod.id, user.branchId)).available, 35);

  // Tanpa pelepasan otomatis, pesanan yang dibatalkan menyandera stoknya
  // selamanya dan tidak ada yang tahu penyebabnya.
  await runtime.transitionDocument(client, { id: doc.id, action: 'cancel', user,
    reason: 'Pelanggan membatalkan pesanan.', requestId: randomUUID() });

  assert.equal((await reservations.availability(client, prod.id, user.branchId)).available, 60, 'stok wajib kembali setelah pembatalan');
  const row = (await client.query(`SELECT status,release_reason FROM stock_reservations WHERE document_id=$1`, [doc.id])).rows[0];
  assert.equal(row.status, 'RELEASED');
  assert.match(row.release_reason, /CANCELLED/, 'alasan pelepasan menyebut status dokumennya');
}));

dbTest('Wave 6: produksi memakai mesin reservasi yang sama, bukan jalur sendiri', async () => rollback(async (client) => {
  const fs = require('node:fs');
  const source = fs.readFileSync('backend/infrastructure/database/repositories/production.js', 'utf8');
  assert.ok(!/qty_reserved\s*=\s*qty_reserved/.test(source) && !/SET qty_reserved=/.test(source),
    'production.js tidak boleh lagi menulis qty_reserved langsung');
  assert.match(source, /stockReservations\.(reserve|consume|releaseDocument)/,
    'produksi wajib memakai mesin reservasi tunggal');

  // Dan buktikan perilakunya: reservasi produksi terlihat sebagai catatan.
  const user = await owner(client);
  const prod = await stocked(client, user.branchId, 100);
  const wo = await runtime.createDocument(client, { type: 'WORK_ORDER', user, title: 'WO reservasi', amount: 0, requestId: randomUUID() });
  await reservations.reserve(client, { productId: prod.id, warehouseId: user.branchId, documentId: wo.id, qty: 40, user, reason: 'Reservasi material work order.' });
  const holders = await reservations.listForStock(client, prod.id, user.branchId);
  assert.equal(holders.items[0].documentType, 'WORK_ORDER');
  assert.equal((await reservations.availability(client, prod.id, user.branchId)).available, 60);
}));
