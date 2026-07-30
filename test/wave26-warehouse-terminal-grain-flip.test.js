'use strict';
// Wave 26 — Canonical Warehouse Terminal Grain-Flip (migrasi 084).
// Grain otoritatif TULIS saldo persediaan berpindah ke gudang kanonik
// (org_warehouse_id): posting.applyBalance dan syncBalance meng-key saldo pada
// (product, org_warehouse). Value-preserving pada 1:1; keunikan cabang
// dipertahankan sebagai kompatibilitas.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');

const dbTest = process.env.DATABASE_URL ? test : test.skip;
async function rollback(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try { await client.query('BEGIN'); await client.query("SELECT set_config('app.is_system','on',true)"); await fn(client); }
  finally { await client.query('ROLLBACK').catch(() => {}); await client.end(); }
}
async function owner(client) {
  const r = (await client.query(`SELECT u.branch_id FROM app_users u JOIN branches b ON b.id=u.branch_id WHERE u.role='owner' AND b.legal_entity_id IS NOT NULL LIMIT 1`)).rows[0];
  return { branchId: r.branch_id };
}
let seq = 0;
const tag = (p) => `${p}${(seq += 1)}${Date.now().toString(36).toUpperCase().slice(-5)}`;
async function makeProduct(client) {
  return (await client.query(
    `INSERT INTO products(id,code,name,product_type,category,uom,hpp,price,make_or_buy,active)
     VALUES($1,$2,'Produk uji grain-flip','PRODUCT','GFLIP','PCS',100,200,'BUY',true) RETURNING id,code`,
    [randomUUID(), tag('PG')])).rows[0];
}
const defaultWh = async (client, branchId) =>
  (await client.query('SELECT id FROM org_warehouses WHERE branch_id=$1 AND is_default LIMIT 1', [branchId])).rows[0]?.id;

dbTest('Wave 26: saldo persediaan ber-keunikan grain kanonik, kompatibilitas cabang dipertahankan', async () => rollback(async (client) => {
  const uq = (await client.query(
    `SELECT conname FROM pg_constraint WHERE conrelid='inventory_balances'::regclass AND contype='u'`)).rows.map((r) => r.conname);
  assert.ok(uq.includes('inventory_balances_product_id_org_warehouse_id_key'), 'keunikan grain gudang kanonik wajib ada');
  assert.ok(uq.includes('inventory_balances_product_id_warehouse_id_key'), 'keunikan grain cabang dipertahankan (kompatibilitas)');
}));

dbTest('Wave 26: saldo value-preserving — org_warehouse = gudang default cabang', async () => rollback(async (client) => {
  const user = await owner(client);
  const product = await makeProduct(client);
  await client.query(
    `INSERT INTO inventory_balances(id,product_id,warehouse_id,qty_on_hand,value_idr) VALUES($1,$2,$3,50,5000)`,
    [randomUUID(), product.id, user.branchId]);
  const b = (await client.query(
    'SELECT warehouse_id,org_warehouse_id,qty_on_hand::float qty FROM inventory_balances WHERE product_id=$1', [product.id])).rows[0];
  const def = await defaultWh(client, user.branchId);
  assert.equal(String(b.warehouse_id), String(user.branchId), 'kolom cabang dipertahankan');
  assert.equal(String(b.org_warehouse_id), String(def), 'org_warehouse di-resolve ke gudang default cabang (value-preserving)');
  assert.equal(b.qty, 50);
}));

dbTest('Wave 26: keunikan grain kanonik menegakkan satu saldo per (produk, gudang)', async () => rollback(async (client) => {
  const user = await owner(client);
  const product = await makeProduct(client);
  const def = await defaultWh(client, user.branchId);
  await client.query(
    `INSERT INTO inventory_balances(id,product_id,warehouse_id,org_warehouse_id,qty_on_hand) VALUES($1,$2,$3,$4,10)`,
    [randomUUID(), product.id, user.branchId, def]);
  // Saldo kedua untuk produk+gudang kanonik yang sama wajib ditolak.
  await assert.rejects(() => client.query(
    `INSERT INTO inventory_balances(id,product_id,warehouse_id,org_warehouse_id,qty_on_hand) VALUES($1,$2,$3,$4,20)`,
    [randomUUID(), product.id, user.branchId, def]),
  (e) => e.code === '23505', 'saldo duplikat pada grain gudang kanonik ditolak');
}));

test('Wave 26: grain-flip terhubung — migrasi dan write-path meng-key kanonik', () => {
  const fs = require('node:fs');
  const up = fs.readFileSync('data/migrations/084_warehouse_terminal_grain_flip.sql', 'utf8');
  const posting = fs.readFileSync('backend/infrastructure/database/repositories/posting.js', 'utf8');
  const reservations = fs.readFileSync('backend/infrastructure/database/repositories/stock-reservations.js', 'utf8');
  assert.match(up, /inventory_balances_product_id_org_warehouse_id_key/, 'migrasi wajib menambah keunikan grain kanonik');
  assert.ok(posting.includes('ON CONFLICT(product_id,org_warehouse_id)'), 'posting.applyBalance wajib meng-key saldo pada grain kanonik');
  assert.ok(reservations.includes('ON CONFLICT(product_id,org_warehouse_id)'), 'syncBalance wajib meng-key saldo pada grain kanonik');
});
