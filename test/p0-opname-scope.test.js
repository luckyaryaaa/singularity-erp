'use strict';
// P0-N — stock opname: cakupan gudang ditegakkan server, cakupan hitung
// (cycle counting), dan baris hitung tidak dapat menyeberang dokumen.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const runtime = require('../backend/infrastructure/database/repositories/runtime');
const posting = require('../backend/infrastructure/database/repositories/posting');
const inv = require('../backend/infrastructure/database/repositories/inventory');

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
let seq = 0;
async function product(client, category) {
  return (await client.query(
    `INSERT INTO products(id,code,name,product_type,category,uom,hpp,price,make_or_buy,active)
     VALUES($1,$2,$3,'PRODUCT',$4,'PCS',100,200,'BUY',true) RETURNING id,code,category`,
    [randomUUID(), `OPN${(seq += 1)}${Date.now().toString(36).toUpperCase().slice(-6)}`, `Barang opname ${seq}`, category])).rows[0];
}
async function stockIn(client, user, warehouseId, lines) {
  const doc = await runtime.createDocument(client, { type: 'GOODS_RECEIPT', user, title: 'Terima stok opname', amount: 0, requestId: randomUUID(), payload: { warehouseId, lines } });
  await client.query(`UPDATE business_documents SET status='COMPLETED' WHERE id=$1`, [doc.id]);
  await posting.postInventory(client, runtime.camel((await client.query('SELECT * FROM business_documents WHERE id=$1', [doc.id])).rows[0]), user);
  return doc;
}
// Gudang uji dibersihkan dari opname berjalan milik data dev (di dalam transaksi rollback).
async function clearRunning(client, warehouseId) {
  await client.query(`UPDATE business_documents SET status='CANCELLED' WHERE document_type='STOCK_OPNAME'
    AND payload->>'warehouseId'=$1 AND status IN('DRAFT','WAITING_APPROVAL','REVISION_REQUIRED')`, [warehouseId]);
}

dbTest('P0-N: opname hanya menghitung produk di dalam cakupan yang dipilih', async () => rollback(async (client) => {
  const user = await owner(client);
  const wh = user.branchId;
  const baja = await product(client, 'BAJA-P0N');
  const cat = await product(client, 'CAT-P0N');
  await stockIn(client, user, wh, [
    { productId: baja.id, description: baja.code, qty: 10, unitPrice: 100 },
    { productId: cat.id, description: cat.code, qty: 7, unitPrice: 100 }
  ]);
  await clearRunning(client, wh);

  const byCategory = await inv.createOpname(client, { user, warehouseId: wh, scope: 'CATEGORY', categories: ['BAJA-P0N'], requestId: randomUUID() });
  const lines = await inv.opnameLines(client, byCategory.id, user);
  const counted = new Set(lines.items.map((l) => l.productId));
  assert.ok(counted.has(baja.id), 'produk dalam kategori wajib masuk');
  assert.ok(!counted.has(cat.id), 'produk di luar kategori tidak boleh ikut terhitung');
  assert.equal(lines.document.payload.opnameScope.scope, 'CATEGORY');

  await client.query(`UPDATE business_documents SET status='CANCELLED' WHERE id=$1`, [byCategory.id]);
  const byProduct = await inv.createOpname(client, { user, warehouseId: wh, scope: 'PRODUCT', productIds: [cat.id], requestId: randomUUID() });
  const productLines = await inv.opnameLines(client, byProduct.id, user);
  assert.ok(productLines.items.every((l) => l.productId === cat.id), 'cakupan PRODUCT hanya berisi produk yang diminta');
}));

dbTest('P0-N: cakupan tidak valid dan cakupan kosong ditolak', async () => rollback(async (client) => {
  const user = await owner(client);
  const wh = user.branchId;
  await clearRunning(client, wh);

  await assert.rejects(() => inv.createOpname(client, { user, warehouseId: wh, scope: 'ABC', requestId: randomUUID() }),
    (e) => e.code === 'VALIDATION_ERROR' && /Cakupan opname harus/.test(String(e.detail || e.message)));
  await assert.rejects(() => inv.createOpname(client, { user, warehouseId: wh, scope: 'CATEGORY', categories: [], requestId: randomUUID() }),
    (e) => e.code === 'VALIDATION_ERROR' && /minimal satu kategori/.test(String(e.detail || e.message)));
  await assert.rejects(() => inv.createOpname(client, { user, warehouseId: wh, scope: 'PRODUCT', productIds: ['bukan-uuid'], requestId: randomUUID() }),
    (e) => e.code === 'VALIDATION_ERROR' && /id tidak valid/.test(String(e.detail || e.message)));
  // Cakupan sah tetapi tidak ada stok yang cocok → ditolak dengan pesan spesifik.
  await assert.rejects(() => inv.createOpname(client, { user, warehouseId: wh, scope: 'CATEGORY', categories: ['KATEGORI-TIDAK-ADA'], requestId: randomUUID() }),
    (e) => e.code === 'VALIDATION_ERROR' && /cakupan hitung/.test(String(e.detail || e.message)));
}));

dbTest('P0-N: gudang di luar cakupan cabang ditolak untuk buat, baca, dan isi hitung', async () => rollback(async (client) => {
  const admin = await owner(client);
  const wh = admin.branchId;
  const foreign = (await client.query('SELECT id FROM branches WHERE id<>$1 LIMIT 1', [wh])).rows[0];
  assert.ok(foreign, 'butuh minimal dua cabang');

  const prod = await product(client, 'SCOPE-P0N');
  await stockIn(client, admin, wh, [{ productId: prod.id, description: prod.code, qty: 5, unitPrice: 100 }]);
  await clearRunning(client, wh);
  const op = await inv.createOpname(client, { user: admin, warehouseId: wh, scope: 'PRODUCT', productIds: [prod.id], requestId: randomUUID() });

  // Gudang milik cabang lain: role warehouse dengan cakupan cabang sendiri.
  const outsider = { id: admin.id, role: 'warehouse', branchId: foreign.id, branchScope: foreign.id, displayName: 'Gudang lain' };
  await assert.rejects(() => inv.createOpname(client, { user: outsider, warehouseId: wh, requestId: randomUUID() }),
    (e) => e.code === 'PERMISSION_DENIED', 'membuat opname gudang lain wajib ditolak');
  await assert.rejects(() => inv.opnameLines(client, op.id, outsider),
    (e) => e.code === 'PERMISSION_DENIED', 'membaca opname gudang lain wajib ditolak');

  const lines = await inv.opnameLines(client, op.id, admin);
  await assert.rejects(() => inv.enterOpnameCounts(client, { docId: op.id, counts: [{ lineId: lines.items[0].id, countedQty: 4 }], user: outsider, requestId: randomUUID() }),
    (e) => e.code === 'PERMISSION_DENIED', 'mengisi hitung gudang lain wajib ditolak');
}));

dbTest('P0-N: daftar produk memuat faset kategori untuk pemilih cakupan opname', async () => rollback(async (client) => {
  const operations = require('../backend/infrastructure/database/repositories/operations');
  const prod = await product(client, 'FASET-P0N');
  const list = await operations.listMaster(client, 'products', { limit: 1 });
  assert.ok(Array.isArray(list.facets?.categories), 'daftar produk wajib membawa faset kategori');
  assert.ok(list.facets.categories.includes(prod.category), 'kategori tidak boleh terpotong paginasi');
  // Master lain tidak ikut membawa faset — payload tetap ramping.
  assert.equal((await operations.listMaster(client, 'customers', { limit: 1 })).facets, undefined);
}));

dbTest('P0-N: baris hitung dari dokumen lain ditolak, bukan diabaikan diam-diam', async () => rollback(async (client) => {
  const user = await owner(client);
  const wh = user.branchId;
  const prod = await product(client, 'LINE-P0N');
  await stockIn(client, user, wh, [{ productId: prod.id, description: prod.code, qty: 6, unitPrice: 100 }]);
  await clearRunning(client, wh);
  const op = await inv.createOpname(client, { user, warehouseId: wh, scope: 'PRODUCT', productIds: [prod.id], requestId: randomUUID() });
  const lines = await inv.opnameLines(client, op.id, user);

  await assert.rejects(
    () => inv.enterOpnameCounts(client, { docId: op.id, counts: [{ lineId: randomUUID(), countedQty: 3 }], user, requestId: randomUUID() }),
    (e) => e.code === 'RESOURCE_NOT_FOUND' && /bukan bagian dari opname/.test(String(e.detail || e.message))
  );

  const ok = await inv.enterOpnameCounts(client, { docId: op.id, counts: [{ lineId: lines.items[0].id, countedQty: 4 }], user, requestId: randomUUID() });
  assert.equal(ok.updated, 1);
  assert.equal(ok.loss, 200, 'selisih kurang 2 unit × HPP 100 wajib tercatat sebagai loss');
}));
