'use strict';
// P0-N — MRP wajib sadar lokasi. Sebelum ini on-hand dijumlahkan lintas gudang
// sehingga kekurangan di satu cabang tertutup stok cabang lain.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const runtime = require('../backend/infrastructure/database/repositories/runtime');
const posting = require('../backend/infrastructure/database/repositories/posting');
const production = require('../backend/infrastructure/database/repositories/production');

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
async function product(client) {
  return (await client.query(
    `INSERT INTO products(id,code,name,product_type,category,uom,hpp,price,make_or_buy,active)
     VALUES($1,$2,$3,'PRODUCT','MRP-P0N','PCS',1000,2000,'BUY',true) RETURNING id,code`,
    [randomUUID(), `MRP${(seq += 1)}${Date.now().toString(36).toUpperCase().slice(-6)}`, `Bahan MRP ${seq}`])).rows[0];
}
async function stockIn(client, user, warehouseId, productId, qty) {
  const doc = await runtime.createDocument(client, { type: 'GOODS_RECEIPT', user, title: 'Terima stok MRP', amount: 0, requestId: randomUUID(), payload: { warehouseId, lines: [{ productId, description: 'MRP', qty, unitPrice: 1000 }] } });
  await client.query(`UPDATE business_documents SET status='COMPLETED' WHERE id=$1`, [doc.id]);
  await posting.postInventory(client, runtime.camel((await client.query('SELECT * FROM business_documents WHERE id=$1', [doc.id])).rows[0]), user);
}
// Saldo minimum menciptakan permintaan tanpa perlu Work Order penuh.
async function setMin(client, productId, warehouseId, minQty) {
  await client.query(`INSERT INTO inventory_balances(id,product_id,warehouse_id,min_qty) VALUES($1,$2,$3,$4)
    ON CONFLICT(product_id,warehouse_id) DO UPDATE SET min_qty=$4`, [randomUUID(), productId, warehouseId, minQty]);
}
const openFor = async (client, user, productId, warehouseId) => (await production.listMrp(client, user, { warehouseId }))
  .items.filter((i) => i.productId === productId);

dbTest('P0-N: kekurangan di satu gudang tidak tertutup stok gudang lain', async () => rollback(async (client) => {
  const user = await owner(client);
  const home = user.branchId;
  const other = (await client.query('SELECT id FROM branches WHERE id<>$1 AND active LIMIT 1', [home])).rows[0];
  assert.ok(other, 'butuh minimal dua cabang aktif');
  const prod = await product(client);

  // Gudang A butuh 20 tetapi kosong; gudang B menyimpan 50 — stok jauh yang
  // tidak dapat dipakai tanpa transfer.
  await setMin(client, prod.id, home, 20);
  await stockIn(client, user, other.id, prod.id, 50);

  const run = await production.runMrp(client, { user, requestId: randomUUID() });
  assert.ok(run.sites >= 2, 'run tanpa filter mencakup seluruh gudang dalam cakupan');

  const atHome = await openFor(client, user, prod.id, home);
  assert.equal(atHome.length, 1, 'gudang yang kekurangan wajib mendapat saran');
  assert.equal(Number(atHome[0].suggestedQty), 20);
  assert.equal(Number(atHome[0].onHand), 0, 'on-hand dihitung per gudang, bukan lintas gudang');

  const atOther = await openFor(client, user, prod.id, other.id);
  assert.equal(atOther.length, 0, 'gudang yang stoknya cukup tidak boleh mendapat saran');
}));

dbTest('P0-N: MRP dapat dijalankan untuk satu gudang tanpa menghapus saran gudang lain', async () => rollback(async (client) => {
  const user = await owner(client);
  const home = user.branchId;
  const other = (await client.query('SELECT id FROM branches WHERE id<>$1 AND active LIMIT 1', [home])).rows[0];
  const prod = await product(client);
  await setMin(client, prod.id, home, 15);
  await setMin(client, prod.id, other.id, 8);

  await production.runMrp(client, { user, requestId: randomUUID() });
  assert.equal((await openFor(client, user, prod.id, home)).length, 1);
  assert.equal((await openFor(client, user, prod.id, other.id)).length, 1);

  // Jalankan ulang HANYA untuk gudang lain — saran gudang home wajib bertahan.
  const single = await production.runMrp(client, { user, warehouseId: other.id, requestId: randomUUID() });
  assert.equal(single.sites, 1);
  const homeAfter = await openFor(client, user, prod.id, home);
  assert.equal(homeAfter.length, 1, 'run per gudang tidak boleh menutup saran gudang lain');
  assert.equal(Number(homeAfter[0].suggestedQty), 15);
  assert.equal((await openFor(client, user, prod.id, other.id)).length, 1);
}));

dbTest('P0-N: MRP menolak gudang di luar cakupan dan daftar saran ikut ter-scope', async () => rollback(async (client) => {
  const user = await owner(client);
  const home = user.branchId;
  const other = (await client.query('SELECT id FROM branches WHERE id<>$1 AND active LIMIT 1', [home])).rows[0];
  const prod = await product(client);
  await setMin(client, prod.id, other.id, 12);
  await production.runMrp(client, { user, warehouseId: other.id, requestId: randomUUID() });

  const insider = { id: user.id, role: 'production', branchId: home, branchScope: home, displayName: 'Produksi cabang' };
  await assert.rejects(() => production.runMrp(client, { user: insider, warehouseId: other.id, requestId: randomUUID() }),
    (e) => e.code === 'PERMISSION_DENIED', 'menjalankan MRP gudang lain wajib ditolak');

  const visible = await production.listMrp(client, insider);
  assert.ok(visible.items.every((i) => i.warehouseId === home), 'daftar saran hanya menampilkan gudang dalam cakupan pengguna');
}));
