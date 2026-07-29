'use strict';
// Wave 19 — Canonical Warehouse Ledger (Stage 1), migrasi 076.
// Stok memperoleh identitas gudang kanonik (org_warehouse_id) di dalam cabangnya;
// konsistensi dijaga trigger self-healing; cabang tetap kunci scope. Put-away
// menyelaraskan gudang lot ke gudang rak tujuan.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const ledger = require('../backend/infrastructure/database/repositories/warehouse-ledger');
const bins = require('../backend/infrastructure/database/repositories/bin-execution');

const dbTest = process.env.DATABASE_URL ? test : test.skip;
async function rollback(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try { await client.query('BEGIN'); await client.query("SELECT set_config('app.is_system','on',true)"); await fn(client); }
  finally { await client.query('ROLLBACK').catch(() => {}); await client.end(); }
}
async function owner(client) {
  const r = (await client.query(`SELECT u.*,b.legal_entity_id FROM app_users u JOIN branches b ON b.id=u.branch_id WHERE u.role='owner' AND b.legal_entity_id IS NOT NULL LIMIT 1`)).rows[0];
  return { id: r.id, role: r.role, branchId: r.branch_id, branchScope: '*', displayName: r.display_name };
}
let seq = 0;
const tag = (p) => `${p}${(seq += 1)}${Date.now().toString(36).toUpperCase().slice(-5)}`;
const defaultWh = async (client, branchId) =>
  (await client.query('SELECT id FROM org_warehouses WHERE branch_id=$1 AND is_default LIMIT 1', [branchId])).rows[0]?.id;

async function makeBin(client, branchId) {
  const wh = (await client.query(
    `INSERT INTO org_warehouses(id,branch_id,code,name,warehouse_type,active) VALUES($1,$2,$3,'Gudang uji kanonik','GENERAL',true) RETURNING id`,
    [randomUUID(), branchId, tag('WH')])).rows[0];
  const loc = (await client.query(
    `INSERT INTO storage_locations(id,warehouse_id,code,name,active) VALUES($1,$2,$3,'Zona uji',true) RETURNING id`,
    [randomUUID(), wh.id, tag('ZN')])).rows[0];
  const bin = (await client.query(
    `INSERT INTO warehouse_bins(id,storage_location_id,code,bin_type,active) VALUES($1,$2,$3,'RACK',true) RETURNING id,code`,
    [randomUUID(), loc.id, tag('BIN')])).rows[0];
  return { warehouseId: wh.id, binId: bin.id, binCode: bin.code };
}
async function makeLot(client, branchId, orgWarehouseId = null, qty = 10) {
  const p = (await client.query(
    `INSERT INTO products(id,code,name,product_type,category,uom,hpp,price,make_or_buy,active)
     VALUES($1,$2,'Baja uji kanonik','PRODUCT','CANON','PCS',1000,2000,'BUY',true) RETURNING id`,
    [randomUUID(), tag('PC')])).rows[0];
  const lot = (await client.query(
    `INSERT INTO stock_lots(id,product_id,warehouse_id,org_warehouse_id,lot_number,heat_number,qty_received,qty_on_hand,unit_cost,status)
     VALUES($1,$2,$3,$4,$5,'HT-CANON',$6,$6,1000,'ACTIVE') RETURNING id,org_warehouse_id`,
    [randomUUID(), p.id, branchId, orgWarehouseId, tag('LOT'), qty])).rows[0];
  return { product: p, lot };
}

dbTest('Wave 19: setiap cabang aktif memiliki tepat satu gudang default', async () => rollback(async (client) => {
  const r = (await client.query(`SELECT
      (SELECT count(*) FROM branches WHERE active) branches,
      (SELECT count(DISTINCT branch_id) FROM org_warehouses WHERE is_default) with_default`)).rows[0];
  assert.equal(Number(r.branches), Number(r.with_default), 'jumlah cabang aktif = jumlah cabang ber-default');
  const dup = (await client.query(`SELECT branch_id FROM org_warehouses WHERE is_default GROUP BY branch_id HAVING count(*)>1`)).rows;
  assert.equal(dup.length, 0, 'tidak boleh ada cabang dengan lebih dari satu gudang default');
}));

dbTest('Wave 19: lot tanpa gudang di-resolve otomatis ke gudang default cabangnya', async () => rollback(async (client) => {
  const user = await owner(client);
  const { lot } = await makeLot(client, user.branchId, null, 10);
  const def = await defaultWh(client, user.branchId);
  assert.ok(def, 'cabang wajib punya default');
  assert.equal(lot.org_warehouse_id, def, 'org_warehouse_id di-resolve ke gudang default cabang');
}));

dbTest('Wave 19: gudang milik cabang lain tidak dapat menampung stok — di-heal ke default', async () => rollback(async (client) => {
  const user = await owner(client);
  const other = (await client.query('SELECT id FROM branches WHERE id<>$1 AND active LIMIT 1', [user.branchId])).rows[0];
  const foreignDefault = await defaultWh(client, other.id);
  assert.ok(foreignDefault, 'cabang lain wajib punya default');

  // Menyisipkan lot cabang sendiri tetapi menunjuk gudang cabang lain: invariant
  // memaksa kembali ke gudang di dalam cabangnya sendiri.
  const { lot } = await makeLot(client, user.branchId, foreignDefault, 5);
  const ownDefault = await defaultWh(client, user.branchId);
  assert.equal(lot.org_warehouse_id, ownDefault, 'gudang lintas cabang di-heal ke default cabang sendiri');
  assert.notEqual(lot.org_warehouse_id, foreignDefault);
}));

dbTest('Wave 19: put-away menyelaraskan gudang lot ke gudang rak tujuan', async () => rollback(async (client) => {
  const user = await owner(client);
  const place = await makeBin(client, user.branchId); // gudang non-default milik cabang
  const { lot } = await makeLot(client, user.branchId, null, 10);
  const def = await defaultWh(client, user.branchId);
  assert.equal(lot.org_warehouse_id, def, 'awalnya di gudang default');

  await bins.putaway(client, { lotId: lot.id, binId: place.binId, user, reason: 'Penempatan awal kanonik.', requestId: randomUUID() });
  const after = (await client.query('SELECT org_warehouse_id FROM stock_lots WHERE id=$1', [lot.id])).rows[0];
  assert.equal(after.org_warehouse_id, place.warehouseId, 'gudang lot mengikuti gudang rak tujuan setelah put-away');
}));

dbTest('Wave 19: ledger gudang kanonik ber-scope cabang dan menolak lintas cabang', async () => rollback(async (client) => {
  const user = await owner(client);
  const view = await ledger.listWarehouses(client, user, { branchId: user.branchId });
  assert.ok(view.items.length >= 1, 'minimal gudang default muncul');
  assert.ok(view.items.some((w) => w.isDefault), 'gudang default wajib ada di ledger');
  assert.ok(view.items.every((w) => String(w.branchCode)), 'setiap baris membawa jalur hierarki cabang');

  const other = (await client.query('SELECT id FROM branches WHERE id<>$1 AND active LIMIT 1', [user.branchId])).rows[0];
  const outsider = { ...user, role: 'warehouse', branchScope: other.id, branchId: other.id };
  await assert.rejects(() => ledger.listWarehouses(client, outsider, { branchId: user.branchId }),
    (e) => e.code === 'PERMISSION_DENIED', 'ledger gudang cabang lain tidak boleh diintip');
}));

test('Wave 19: model kanonik benar-benar terhubung — migrasi, view, dan kode merujuknya', () => {
  const fs = require('node:fs');
  const up = fs.readFileSync('data/migrations/076_canonical_warehouse_ledger.sql', 'utf8');
  const repo = fs.readFileSync('backend/infrastructure/database/repositories/warehouse-ledger.js', 'utf8');
  const route = fs.readFileSync('backend/routes/inventory.js', 'utf8');
  const bin = fs.readFileSync('backend/infrastructure/database/repositories/bin-execution.js', 'utf8');
  for (const token of ['stock_warehouse_ledger', 'resolve_stock_lot_warehouse', 'is_default', 'org_warehouse_id']) {
    assert.ok(up.includes(token), `migrasi wajib mendefinisikan ${token}`);
  }
  assert.match(up, /security_invoker = true/, 'view kanonik wajib security_invoker (RLS pemanggil)');
  assert.ok(repo.includes('stock_warehouse_ledger'), 'repo wajib membaca ledger kanonik');
  assert.match(route, /warehouseLedger\.listWarehouses/, 'rute wajib mengekspos ledger gudang');
  assert.ok(bin.includes('org_warehouse_id'), 'put-away wajib menyelaraskan gudang kanonik lot');
});
