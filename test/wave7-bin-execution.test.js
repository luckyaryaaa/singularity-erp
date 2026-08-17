'use strict';
// Wave 7 — eksekusi bin. storage_locations dan warehouse_bins ada sejak migrasi
// 012 tetapi TIDAK PERNAH dirujuk satu baris kode pun: skema mati yang terlihat
// seperti fitur. Penyebabnya struktural — bin menggantung pada org_warehouses
// sedangkan stok menggantung pada branches, sehingga lot memang tidak mungkin
// di-join ke bin.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const bins = require('../backend/infrastructure/database/repositories/bin-execution');

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
const tag = (p) => `${p}${(seq += 1)}${Date.now().toString(36).toUpperCase().slice(-5)}`;

// Rantai lengkap cabang → org_warehouse → storage_location → bin.
async function makeBin(client, branchId) {
  const wh = (await client.query(
    `INSERT INTO org_warehouses(id,branch_id,code,name,warehouse_type,active) VALUES($1,$2,$3,'Gudang uji bin','GENERAL',true) RETURNING id`,
    [randomUUID(), branchId, tag('WH')])).rows[0];
  const loc = (await client.query(
    `INSERT INTO storage_locations(id,warehouse_id,code,name,active) VALUES($1,$2,$3,'Zona uji',true) RETURNING id`,
    [randomUUID(), wh.id, tag('ZN')])).rows[0];
  const bin = (await client.query(
    `INSERT INTO warehouse_bins(id,storage_location_id,code,bin_type,active) VALUES($1,$2,$3,'RACK',true) RETURNING id,code`,
    [randomUUID(), loc.id, tag('BIN')])).rows[0];
  return { warehouseId: wh.id, locationId: loc.id, binId: bin.id, binCode: bin.code };
}
async function makeLot(client, branchId, qty = 25) {
  const p = (await client.query(
    `INSERT INTO products(id,code,name,product_type,category,uom,hpp,price,make_or_buy,active)
     VALUES($1,$2,'Baja uji bin','PRODUCT','BIN','PCS',1000,2000,'BUY',true) RETURNING id,code`,
    [randomUUID(), tag('PB')])).rows[0];
  const lot = (await client.query(
    `INSERT INTO stock_lots(id,product_id,warehouse_id,lot_number,heat_number,qty_received,qty_on_hand,unit_cost,status)
     VALUES($1,$2,$3,$4,'HT-BIN',$5,$5,1000,'ACTIVE') RETURNING id,lot_number`,
    [randomUUID(), p.id, branchId, tag('LOT'), qty])).rows[0];
  return { product: p, lot };
}

dbTest('Wave 7: bin akhirnya terhubung ke stok — lot dapat ditempatkan di rak', async () => rollback(async (client) => {
  const user = await owner(client);
  const place = await makeBin(client, user.branchId);
  const { product, lot } = await makeLot(client, user.branchId, 25);

  // Sebelum ditempatkan: barang ada tetapi tidak diketahui raknya.
  let where = await bins.locateProduct(client, { productId: product.id, branchId: user.branchId, user });
  assert.equal(where.placedQty, 0);
  assert.equal(where.unplacedQty, 25, 'stok yang belum dirapikan ditampilkan jujur, bukan disembunyikan');

  const done = await bins.putaway(client, { lotId: lot.id, binId: place.binId, user, reason: 'Penempatan awal setelah penerimaan.', requestId: randomUUID() });
  assert.equal(done.binCode, place.binCode);
  assert.equal(done.fromBinId, null, 'penempatan pertama bukan pemindahan');

  // Pertanyaan operasional paling sering di gudang, dulu tidak terjawab.
  where = await bins.locateProduct(client, { productId: product.id, branchId: user.branchId, user });
  assert.equal(where.placedQty, 25);
  assert.equal(where.unplacedQty, 0);
  assert.equal(where.bins[0].binCode, place.binCode);

  const contents = await bins.binContents(client, place.binId, user);
  assert.equal(contents.totalQty, 25);
  assert.equal(contents.items[0].lotNumber, lot.lot_number);
  assert.equal(contents.items[0].heatNumber, 'HT-BIN', 'traceability heat number ikut sampai ke rak');
}));

dbTest('Wave 7: pemindahan antar bin tercatat sebagai gerakan, bukan diam-diam', async () => rollback(async (client) => {
  const user = await owner(client);
  const a = await makeBin(client, user.branchId), b = await makeBin(client, user.branchId);
  const { lot } = await makeLot(client, user.branchId, 10);

  await bins.putaway(client, { lotId: lot.id, binId: a.binId, user, reason: 'Penempatan awal.', requestId: randomUUID() });
  const moved = await bins.putaway(client, { lotId: lot.id, binId: b.binId, user, reason: 'Konsolidasi rak.', requestId: randomUUID() });
  assert.equal(moved.fromBinId, a.binId, 'asal perpindahan wajib tercatat');
  assert.equal(moved.toBinId, b.binId);

  assert.equal((await bins.binContents(client, a.binId, user)).totalQty, 0, 'rak asal wajib kosong');
  assert.equal((await bins.binContents(client, b.binId, user)).totalQty, 10);

  const movements = (await client.query(
    `SELECT movement_type,from_bin_id,to_bin_id,memo FROM stock_lot_movements WHERE lot_id=$1 ORDER BY occurred_at`, [lot.id])).rows;
  assert.equal(movements[0].movement_type, 'PUTAWAY');
  assert.equal(movements[1].movement_type, 'BIN_MOVE');
  assert.match(movements[1].memo, /Konsolidasi/);

  // Menempatkan ke bin yang sama ditolak — bukan gerakan yang berarti.
  await assert.rejects(() => bins.putaway(client, { lotId: lot.id, binId: b.binId, user, reason: 'Ulang.', requestId: randomUUID() }),
    (e) => e.code === 'VALIDATION_ERROR' && /sudah berada di bin/.test(String(e.detail || e.message)));
}));

dbTest('Wave 7: barang tidak dapat ditempatkan di rak milik cabang lain', async () => rollback(async (client) => {
  const user = await owner(client);
  const other = (await client.query('SELECT id FROM branches WHERE id<>$1 AND active LIMIT 1', [user.branchId])).rows[0];
  assert.ok(other, 'butuh dua cabang');
  const foreignBin = await makeBin(client, other.id);
  const { lot } = await makeLot(client, user.branchId, 5);

  // Tanpa penjagaan ini, neraca gudang menjadi dusta yang tidak kelihatan.
  await assert.rejects(() => bins.putaway(client, { lotId: lot.id, binId: foreignBin.binId, user, reason: 'Percobaan lintas cabang.', requestId: randomUUID() }),
    (e) => e.code === 'VALIDATION_ERROR' && e.extra.binBranchId === other.id,
    'bin cabang lain wajib ditolak');
}));

dbTest('Wave 7: bin non-aktif dan lot habis ditolak', async () => rollback(async (client) => {
  const user = await owner(client);
  const place = await makeBin(client, user.branchId);
  const { lot } = await makeLot(client, user.branchId, 8);

  await client.query('UPDATE warehouse_bins SET active=false WHERE id=$1', [place.binId]);
  await assert.rejects(() => bins.putaway(client, { lotId: lot.id, binId: place.binId, user, reason: 'Ke rak non-aktif.', requestId: randomUUID() }),
    (e) => e.code === 'VALIDATION_ERROR' && /non-aktif/.test(String(e.detail || e.message)));

  await client.query('UPDATE warehouse_bins SET active=true WHERE id=$1', [place.binId]);
  await client.query(`UPDATE stock_lots SET qty_on_hand=0,status='CONSUMED' WHERE id=$1`, [lot.id]);
  await assert.rejects(() => bins.putaway(client, { lotId: lot.id, binId: place.binId, user, reason: 'Lot habis.', requestId: randomUUID() }),
    (e) => e.code === 'STATUS_INVALID' && /habis/.test(String(e.detail || e.message)));
}));

dbTest('Wave 7: saldo bin diturunkan dari lot, bukan angka paralel', async () => rollback(async (client) => {
  const user = await owner(client);
  const place = await makeBin(client, user.branchId);
  const { product, lot } = await makeLot(client, user.branchId, 30);
  await bins.putaway(client, { lotId: lot.id, binId: place.binId, user, reason: 'Penempatan.', requestId: randomUUID() });

  // Konsumsi lot langsung — saldo bin WAJIB ikut turun tanpa pembaruan terpisah,
  // karena diturunkan dari lot dan tidak ada tabel saldo kedua.
  await client.query('UPDATE stock_lots SET qty_on_hand=12 WHERE id=$1', [lot.id]);
  const where = await bins.locateProduct(client, { productId: product.id, branchId: user.branchId, user });
  assert.equal(where.placedQty, 12, 'saldo bin mengikuti lot secara otomatis');

  await client.query(`UPDATE stock_lots SET qty_on_hand=0,status='CONSUMED' WHERE id=$1`, [lot.id]);
  assert.equal((await bins.binContents(client, place.binId, user)).totalQty, 0, 'lot habis hilang dari rak dengan sendirinya');
}));

dbTest('Wave 7: daftar bin per cabang menampilkan isi dan tidak bocor lintas cabang', async () => rollback(async (client) => {
  const user = await owner(client);
  const other = (await client.query('SELECT id FROM branches WHERE id<>$1 AND active LIMIT 1', [user.branchId])).rows[0];
  const mine = await makeBin(client, user.branchId);
  const theirs = await makeBin(client, other.id);
  const { lot } = await makeLot(client, user.branchId, 7);
  await bins.putaway(client, { lotId: lot.id, binId: mine.binId, user, reason: 'Penempatan.', requestId: randomUUID() });

  const listed = await bins.listBins(client, { branchId: user.branchId, user });
  const codes = listed.items.map((b) => b.binId);
  assert.ok(codes.includes(mine.binId), 'bin cabang sendiri wajib muncul');
  assert.ok(!codes.includes(theirs.binId), 'bin cabang lain tidak boleh muncul');
  assert.equal(listed.items.find((b) => b.binId === mine.binId).qtyOnHand, 7);

  // Pengguna cabang lain tidak boleh mengintip isi rak ini.
  const outsider = { ...user, role: 'warehouse', branchScope: other.id, branchId: other.id };
  await assert.rejects(() => bins.binContents(client, mine.binId, outsider),
    (e) => e.code === 'PERMISSION_DENIED');
}));

test('Wave 7: skema bin tidak lagi mati — kode benar-benar merujuknya', () => {
  const fs = require('node:fs');
  const repo = fs.readFileSync('backend/infrastructure/database/repositories/bin-execution.js', 'utf8');
  const route = fs.readFileSync('backend/routes/inventory.js', 'utf8');
  for (const token of ['warehouse_bin_scope', 'stock_bin_balance', 'stock_lots', 'bin_id']) {
    assert.ok(repo.includes(token), `repository wajib merujuk ${token}`);
  }
  assert.match(route, /binExecution\.(listBins|binContents|locateProduct|putaway)/, 'rute wajib memakai eksekusi bin');
  const up = fs.readFileSync('data/migrations/058_bin_execution.sql', 'utf8');
  assert.match(up, /PUTAWAY/, 'jenis gerakan baru didaftarkan di constraint, bukan dipaksakan lewat kode');
});
