'use strict';
// Wave 22 — Advanced pricing condition engine (Stage 1), migrasi 079.
// Harga jual ditentukan dari condition records (base price/diskon/surcharge per
// pelanggan/produk/kategori, skala kuantitas, validity), server-authoritative.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const pricing = require('../backend/infrastructure/database/repositories/sales-pricing');

const dbTest = process.env.DATABASE_URL ? test : test.skip;
async function rollback(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try { await client.query('BEGIN'); await client.query("SELECT set_config('app.is_system','on',true),set_config('app.is_platform','on',true),set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true)"); await fn(client); }
  finally { await client.query('ROLLBACK').catch(() => {}); await client.end(); }
}
async function owner(client) {
  const r = (await client.query(`SELECT u.*,b.legal_entity_id FROM app_users u JOIN branches b ON b.id=u.branch_id WHERE u.role='owner' AND b.legal_entity_id IS NOT NULL LIMIT 1`)).rows[0];
  return { id: r.id, role: r.role, branchId: r.branch_id, branchScope: '*', displayName: r.display_name, legalEntityId: r.legal_entity_id };
}
let seq = 0;
const tag = (p) => `${p}${(seq += 1)}${Date.now().toString(36).toUpperCase().slice(-5)}`;
async function makeProduct(client, price = 1000, hpp = 600) {
  return (await client.query(
    `INSERT INTO products(id,code,name,product_type,category,uom,hpp,price,make_or_buy,active)
     VALUES($1,$2,'Produk uji harga','PRODUCT','PRICING','PCS',$3,$4,'BUY',true) RETURNING id,category`,
    [randomUUID(), tag('PP'), hpp, price])).rows[0];
}

dbTest('Wave 22: base price dari kondisi mengalahkan harga daftar produk', async () => rollback(async (client) => {
  const user = await owner(client);
  const p = await makeProduct(client, 1000, 600);
  let r = await pricing.resolvePrice(client, user, { productId: p.id, qty: 1 });
  assert.equal(r.basePrice, 1000);
  assert.equal(r.basePriceSource, 'PRODUCT_LIST');

  await pricing.createCondition(client, { conditionType: 'BASE_PRICE', productId: p.id, amount: 800 }, user, randomUUID());
  r = await pricing.resolvePrice(client, user, { productId: p.id, qty: 1 });
  assert.equal(r.basePrice, 800);
  assert.equal(r.basePriceSource, 'CONDITION');
}));

dbTest('Wave 22: kondisi pelanggan+produk lebih spesifik daripada produk saja', async () => rollback(async (client) => {
  const user = await owner(client);
  const p = await makeProduct(client, 1000);
  const party = randomUUID();
  await pricing.createCondition(client, { conditionType: 'BASE_PRICE', productId: p.id, amount: 800 }, user, randomUUID());
  await pricing.createCondition(client, { conditionType: 'BASE_PRICE', productId: p.id, partyId: party, amount: 750 }, user, randomUUID());

  assert.equal((await pricing.resolvePrice(client, user, { productId: p.id, partyId: party, qty: 1 })).basePrice, 750, 'pelanggan spesifik');
  assert.equal((await pricing.resolvePrice(client, user, { productId: p.id, qty: 1 })).basePrice, 800, 'tanpa pelanggan → produk saja');
}));

dbTest('Wave 22: skala kuantitas — harga grosir hanya di atas ambang', async () => rollback(async (client) => {
  const user = await owner(client);
  const p = await makeProduct(client, 1000);
  await pricing.createCondition(client, { conditionType: 'BASE_PRICE', productId: p.id, minQty: 0, amount: 900 }, user, randomUUID());
  await pricing.createCondition(client, { conditionType: 'BASE_PRICE', productId: p.id, minQty: 100, amount: 700 }, user, randomUUID());

  assert.equal((await pricing.resolvePrice(client, user, { productId: p.id, qty: 50 })).basePrice, 900, 'di bawah ambang: harga eceran');
  assert.equal((await pricing.resolvePrice(client, user, { productId: p.id, qty: 150 })).basePrice, 700, 'di atas ambang: harga grosir');
}));

dbTest('Wave 22: diskon dan surcharge diterapkan ke net price', async () => rollback(async (client) => {
  const user = await owner(client);
  const p = await makeProduct(client, 1000);
  await pricing.createCondition(client, { conditionType: 'DISCOUNT_PCT', productId: p.id, amount: 10 }, user, randomUUID());
  const r = await pricing.resolvePrice(client, user, { productId: p.id, qty: 2 });
  assert.equal(r.netUnitPrice, 900, 'diskon 10% dari 1000');
  assert.equal(r.lineTotal, 1800, 'total baris = net × qty');
  assert.equal(r.appliedConditions.length, 1);
}));

dbTest('Wave 22: kondisi kedaluwarsa diabaikan resolver', async () => rollback(async (client) => {
  const user = await owner(client);
  const p = await makeProduct(client, 1000);
  await pricing.createCondition(client, { conditionType: 'BASE_PRICE', productId: p.id, amount: 500, effectiveFrom: '2020-01-01', effectiveTo: '2020-12-31' }, user, randomUUID());
  const r = await pricing.resolvePrice(client, user, { productId: p.id, qty: 1 });
  assert.equal(r.basePrice, 1000, 'kondisi kedaluwarsa tidak dipakai — jatuh ke harga daftar');
}));

dbTest('Wave 22: nonaktifkan kondisi memakai optimistic lock dan mengeluarkannya dari resolusi', async () => rollback(async (client) => {
  const user = await owner(client);
  const p = await makeProduct(client, 1000);
  const cond = await pricing.createCondition(client, { conditionType: 'BASE_PRICE', productId: p.id, amount: 800 }, user, randomUUID());
  assert.equal((await pricing.resolvePrice(client, user, { productId: p.id, qty: 1 })).basePrice, 800);

  await assert.rejects(() => pricing.deactivateCondition(client, { id: cond.id, expectedVersion: 99, user, requestId: randomUUID() }),
    (e) => e.code === 'DOCUMENT_CONFLICT');
  await pricing.deactivateCondition(client, { id: cond.id, expectedVersion: cond.version, user, requestId: randomUUID() });
  assert.equal((await pricing.resolvePrice(client, user, { productId: p.id, qty: 1 })).basePrice, 1000, 'kondisi nonaktif tak lagi dipakai');
}));

dbTest('Wave 22: legal entity lain ditolak untuk pengguna non-lintas-cabang', async () => rollback(async (client) => {
  const user = await owner(client);
  const p = await makeProduct(client, 1000);
  const otherLe = (await client.query('SELECT id FROM legal_entities WHERE id<>$1 LIMIT 1', [user.legalEntityId])).rows[0];
  const nonCross = { ...user, role: 'sales', branchScope: user.branchId };
  const target = otherLe ? otherLe.id : randomUUID();
  await assert.rejects(() => pricing.createCondition(client, { conditionType: 'BASE_PRICE', productId: p.id, amount: 800, legalEntityId: target }, nonCross, randomUUID()),
    (e) => e.code === 'PERMISSION_DENIED' || e.code === 'RESOURCE_NOT_FOUND');
}));

test('Wave 22: pricing engine terhubung — migrasi, repo, dan rute merujuknya', () => {
  const fs = require('node:fs');
  const up = fs.readFileSync('data/migrations/079_pricing_conditions.sql', 'utf8');
  const repo = fs.readFileSync('backend/infrastructure/database/repositories/sales-pricing.js', 'utf8');
  const route = fs.readFileSync('backend/routes/sales.js', 'utf8');
  for (const token of ['pricing_conditions', 'BASE_PRICE', 'condition_type']) assert.ok(up.includes(token), `migrasi wajib mendefinisikan ${token}`);
  assert.ok(repo.includes('resolvePrice'), 'repo wajib punya resolver harga');
  assert.match(route, /pricing\.(resolvePrice|createCondition|listConditions|deactivateCondition)/, 'rute wajib memakai pricing engine');
});
