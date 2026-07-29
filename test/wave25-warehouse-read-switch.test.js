'use strict';
// Wave 25 — Canonical Warehouse Stage 2B: reconcile + reversible read-switch
// (migrasi 083). Membaca pada grain org_warehouse identik nilainya dengan grain
// cabang; flag read-grain reversibel dengan gate rekonsiliasi.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const cutover = require('../backend/infrastructure/database/repositories/warehouse-cutover');
const operations = require('../backend/infrastructure/database/repositories/operations');

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
async function makeBalance(client, branchId, qty = 42, value = 4200) {
  const p = (await client.query(
    `INSERT INTO products(id,code,name,product_type,category,uom,hpp,price,make_or_buy,active)
     VALUES($1,$2,'Produk uji read-switch','PRODUCT','RSWITCH','PCS',100,200,'BUY',true) RETURNING id,code`,
    [randomUUID(), tag('PR')])).rows[0];
  await client.query(
    `INSERT INTO inventory_balances(id,product_id,warehouse_id,qty_on_hand,value_idr) VALUES($1,$2,$3,$4,$5)`,
    [randomUUID(), p.id, branchId, qty, value]);
  return p;
}

dbTest('Wave 25: rekonsiliasi read-switch bersih dan default grain BRANCH', async () => rollback(async (client) => {
  const user = await owner(client);
  const rec = await cutover.reconciliation(client, user);
  assert.equal(rec.allClear, true, 'rekonsiliasi dimensi + saldo wajib bersih');
  assert.equal(rec.balanceGrainMismatch, 0);
  assert.equal(rec.dimensionIssues, 0);
  assert.equal(rec.readGrain, 'BRANCH', 'default read-grain adalah BRANCH');
}));

dbTest('Wave 25: read-switch value-preserving — grain kanonik = grain cabang, hanya label berbeda', async () => rollback(async (client) => {
  const user = await owner(client);
  const product = await makeBalance(client, user.branchId, 42, 4200);
  const branchView = await operations.listInventory(client, user, { q: product.code, readGrain: 'BRANCH' });
  const canonView = await operations.listInventory(client, user, { q: product.code, readGrain: 'CANONICAL' });
  const b = branchView.items.find((i) => i.productCode === product.code);
  const c = canonView.items.find((i) => i.productCode === product.code);
  assert.ok(b && c, 'produk muncul di kedua grain');
  assert.equal(b.qtyOnHand, c.qtyOnHand, 'qty identik antar grain (read-switch tidak mengubah angka)');
  assert.equal(branchView.readGrain, 'BRANCH');
  assert.equal(canonView.readGrain, 'CANONICAL');
  assert.notEqual(b.warehouseCode, c.warehouseCode, 'label gudang beralih dari cabang ke org_warehouse kanonik');
}));

dbTest('Wave 25: flag read-grain reversibel dengan gate; grain asing ditolak', async () => rollback(async (client) => {
  const user = await owner(client);
  assert.equal(await cutover.getReadGrain(client), 'BRANCH');

  const on = await cutover.setReadGrain(client, { grain: 'CANONICAL', note: 'Rehearsal cutover.' }, user, randomUUID());
  assert.equal(on.readGrain, 'CANONICAL');
  assert.equal(await cutover.getReadGrain(client), 'CANONICAL', 'switch tersimpan');

  const off = await cutover.setReadGrain(client, { grain: 'BRANCH', note: 'Rollback rehearsal.' }, user, randomUUID());
  assert.equal(off.readGrain, 'BRANCH');
  assert.equal(await cutover.getReadGrain(client), 'BRANCH', 'rollback ke BRANCH selalu boleh');

  await assert.rejects(() => cutover.setReadGrain(client, { grain: 'BOGUS' }, user, randomUUID()),
    (e) => e.code === 'VALIDATION_ERROR');
}));

dbTest('Wave 25: mengubah read-grain butuh settings.edit', async () => rollback(async (client) => {
  const user = await owner(client);
  const warehouseUser = { id: user.id, role: 'warehouse', branchId: user.branchId, branchScope: user.branchId };
  await assert.rejects(() => cutover.setReadGrain(client, { grain: 'CANONICAL' }, warehouseUser, randomUUID()),
    (e) => e.code === 'PERMISSION_DENIED', 'peran tanpa settings.edit tidak boleh mengaktifkan cutover');
}));

dbTest('Wave 25: pembacaan stok pada grain gudang kanonik ber-scope cabang', async () => rollback(async (client) => {
  const user = await owner(client);
  const product = await makeBalance(client, user.branchId, 15, 3000);
  const view = await cutover.stockByWarehouse(client, user, { branchId: user.branchId, productId: product.id });
  assert.equal(view.readGrain, 'CANONICAL');
  const item = view.items.find((i) => i.productCode === product.code);
  assert.ok(item, 'produk muncul pada grain gudang kanonik');
  assert.equal(item.qtyOnHand, 15);
  assert.ok(String(item.warehouseCode), 'membawa kode gudang kanonik');
}));

test('Wave 25: read-switch terhubung — migrasi, repo, dan rute merujuknya', () => {
  const fs = require('node:fs');
  const up = fs.readFileSync('data/migrations/083_warehouse_stage2b_read_switch.sql', 'utf8');
  const repo = fs.readFileSync('backend/infrastructure/database/repositories/warehouse-cutover.js', 'utf8');
  const route = fs.readFileSync('backend/routes/inventory.js', 'utf8');
  for (const token of ['warehouse_read_switch_reconciliation', 'warehouse_read_switch_health', 'warehouse.read_grain']) {
    assert.ok(up.includes(token), `migrasi wajib mendefinisikan ${token}`);
  }
  assert.match(up, /security_invoker = true/, 'view read-switch wajib security_invoker');
  assert.ok(repo.includes("assertPermission(user, 'settings.edit')"), 'switch cutover wajib dijaga settings.edit');
  assert.match(route, /warehouseCutover\.(reconciliation|setReadGrain|stockByWarehouse)/, 'rute wajib memakai read-switch');
});
