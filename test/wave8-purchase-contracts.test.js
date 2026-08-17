'use strict';
// Wave 8 — kontrak/blanket pembelian. Sisi penjualan punya kontrak kerangka
// sejak v0.34, tetapi sisi PEMBELIAN tidak punya sama sekali: setiap Purchase
// Order berdiri sendiri, harga dinegosiasikan ulang tiap kali, dan tidak ada
// yang mencegah pembelian melampaui pagu yang disepakati dengan pemasok.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const runtime = require('../backend/infrastructure/database/repositories/runtime');
const contracts = require('../backend/infrastructure/database/repositories/purchase-contracts');

const dbTest = process.env.DATABASE_URL ? test : test.skip;
async function rollback(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try { await client.query('BEGIN'); await client.query("SELECT set_config('app.is_system','on',true),set_config('app.is_platform','on',true),set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true)"); await fn(client); }
  finally { await client.query('ROLLBACK').catch(() => {}); await client.end(); }
}
async function actors(client) {
  const rows = (await client.query(`SELECT u.id,u.branch_id FROM app_users u JOIN branches b ON b.id=u.branch_id
    WHERE u.active AND b.legal_entity_id IS NOT NULL ORDER BY u.created_at LIMIT 2`)).rows;
  assert.equal(rows.length, 2, 'butuh dua pengguna berbeda');
  return {
    maker: { id: rows[0].id, role: 'procurement', branchId: rows[0].branch_id, branchScope: '*', displayName: 'Maker' },
    checker: { id: rows[1].id, role: 'owner', branchId: rows[0].branch_id, branchScope: '*', displayName: 'Checker' }
  };
}
let seq = 0;
const tag = (p) => `${p}${(seq += 1)}${Date.now().toString(36).toUpperCase().slice(-5)}`;
async function supplier(client, extra = {}) {
  return (await client.query(
    `INSERT INTO suppliers(id,code,name,category,active,onboarding_status,performance_hold)
     VALUES($1,$2,'Pemasok kontrak','MATERIAL',true,$3,$4) RETURNING id,name`,
    [randomUUID(), tag('SUP'), extra.onboarding || 'APPROVED', extra.hold || false])).rows[0];
}
async function product(client) {
  return (await client.query(
    `INSERT INTO products(id,code,name,product_type,category,uom,hpp,price,make_or_buy,active)
     VALUES($1,$2,'Baja kontrak','PRODUCT','KTR','KG',9000,12000,'BUY',true) RETURNING id,code`,
    [randomUUID(), tag('PK')])).rows[0];
}
const today = () => require('../backend/core/business-date').today();
const plusDays = (n) => require('../backend/core/business-date').addDays(today(), n);

async function activeContract(client, { maker, checker }, sup, prod, opts = {}) {
  const c = await contracts.createContract(client, {
    supplierId: sup.id, title: 'Kontrak baja tahunan',
    validFrom: today(), validTo: plusDays(365),
    ceilingAmount: opts.ceiling ?? 100_000_000,
    lines: [{ productId: prod.id, description: prod.code, committedQty: opts.committedQty ?? 1000,
      ceilingAmount: opts.lineCeiling ?? 90_000_000, uom: 'KG', unitPrice: opts.unitPrice ?? 9000 }]
  }, maker, randomUUID());
  await contracts.decideContract(client, { id: c.id, approve: true, reason: 'Disetujui direksi pengadaan.', user: checker, requestId: randomUUID() });
  const detail = await contracts.contractDetail(client, c.id, maker);
  return detail;
}
const po = (client, user, sup, lines) => runtime.createDocument(client, {
  type: 'PURCHASE_ORDER', user, title: 'PO release kontrak', amount: 0,
  partyId: sup.id, partyName: sup.name, requestId: randomUUID(), payload: { taxPct: 0, lines }
});

dbTest('Wave 8: kontrak menuntut persetujuan orang lain sebelum dapat ditarik', async () => rollback(async (client) => {
  const { maker, checker } = await actors(client);
  const sup = await supplier(client), prod = await product(client);
  const draft = await contracts.createContract(client, {
    supplierId: sup.id, title: 'Kontrak baja', validFrom: today(), validTo: plusDays(180),
    ceilingAmount: 50_000_000,
    lines: [{ productId: prod.id, description: prod.code, committedQty: 500, ceilingAmount: 45_000_000, uom: 'KG', unitPrice: 9000 }]
  }, maker, randomUUID());
  assert.equal(draft.status, 'DRAFT');
  assert.match(draft.contractNumber, /^PC-/);

  const order = await po(client, maker, sup, [{ productId: prod.id, description: prod.code, qty: 10, unitPrice: 9000, taxPct: 0 }]);
  await assert.rejects(() => contracts.releaseContract(client, { id: draft.id, purchaseOrderId: order.id, releasedAmount: 90_000, user: maker, requestId: randomUUID() }),
    (e) => e.code === 'STATUS_INVALID' && /tidak aktif/.test(String(e.detail || e.message)),
    'kontrak DRAFT tidak boleh ditarik');

  // Penyusun tidak boleh menyetujui kontraknya sendiri.
  await assert.rejects(() => contracts.decideContract(client, { id: draft.id, approve: true, reason: 'Setuju sendiri.', user: maker, requestId: randomUUID() }),
    (e) => ['SOD_CONFLICT', 'PERMISSION_DENIED'].includes(e.code));

  const approved = await contracts.decideContract(client, { id: draft.id, approve: true, reason: 'Disetujui manajemen.', user: checker, requestId: randomUUID() });
  assert.equal(approved.status, 'ACTIVE');
}));

dbTest('Wave 8: release tidak boleh melampaui pagu kontrak maupun pagu baris', async () => rollback(async (client) => {
  const a = await actors(client);
  const sup = await supplier(client), prod = await product(client);
  const c = await activeContract(client, a, sup, prod, { ceiling: 10_000_000, lineCeiling: 9_000_000 });
  const order = await po(client, a.maker, sup, [{ productId: prod.id, description: prod.code, qty: 100, unitPrice: 9000, taxPct: 0 }]);

  await assert.rejects(() => contracts.releaseContract(client, { id: c.id, purchaseOrderId: order.id, releasedAmount: 12_000_000, user: a.maker, requestId: randomUUID() }),
    (e) => e.code === 'VALIDATION_ERROR' && e.extra.remainingAmount === 10_000_000,
    'melampaui pagu kontrak wajib ditolak');

  await assert.rejects(() => contracts.releaseContract(client, { id: c.id, purchaseOrderId: order.id, contractLineId: c.lines[0].id, releasedAmount: 9_500_000, user: a.maker, requestId: randomUUID() }),
    (e) => e.code === 'VALIDATION_ERROR' && e.extra.lineRemainingAmount === 9_000_000,
    'melampaui pagu baris wajib ditolak');

  const ok = await contracts.releaseContract(client, { id: c.id, purchaseOrderId: order.id, contractLineId: c.lines[0].id, releasedQty: 100, releasedAmount: 900_000, user: a.maker, requestId: randomUUID() });
  assert.equal(Number(ok.releasedAmount), 900_000);
  const after = await contracts.contractDetail(client, c.id, a.maker);
  assert.equal(after.remainingAmount, 9_100_000, 'sisa pagu berkurang sesuai release');
  assert.equal(after.lines[0].remainingQty, 900, 'sisa komitmen volume ikut berkurang');
}));

dbTest('Wave 8: komitmen volume ditegakkan secara kumulatif', async () => rollback(async (client) => {
  const a = await actors(client);
  const sup = await supplier(client), prod = await product(client);
  const c = await activeContract(client, a, sup, prod, { committedQty: 100 });

  const first = await po(client, a.maker, sup, [{ productId: prod.id, description: prod.code, qty: 70, unitPrice: 9000, taxPct: 0 }]);
  await contracts.releaseContract(client, { id: c.id, purchaseOrderId: first.id, contractLineId: c.lines[0].id, releasedQty: 70, releasedAmount: 630_000, user: a.maker, requestId: randomUUID() });

  const second = await po(client, a.maker, sup, [{ productId: prod.id, description: prod.code, qty: 40, unitPrice: 9000, taxPct: 0 }]);
  await assert.rejects(() => contracts.releaseContract(client, { id: c.id, purchaseOrderId: second.id, contractLineId: c.lines[0].id, releasedQty: 40, releasedAmount: 360_000, user: a.maker, requestId: randomUUID() }),
    (e) => e.code === 'VALIDATION_ERROR' && e.extra.remainingQty === 30,
    'release terdahulu wajib diperhitungkan');

  const ok = await contracts.releaseContract(client, { id: c.id, purchaseOrderId: second.id, contractLineId: c.lines[0].id, releasedQty: 30, releasedAmount: 270_000, user: a.maker, requestId: randomUUID() });
  assert.equal(Number(ok.releasedQty), 30);
}));

dbTest('Wave 8: harga PO di atas harga kontrak ditolak, bukan diperingatkan', async () => rollback(async (client) => {
  const a = await actors(client);
  const sup = await supplier(client), prod = await product(client);
  const c = await activeContract(client, a, sup, prod, { unitPrice: 9000 });
  // Harga kontrak adalah harga yang disepakati; membayar di atasnya berarti
  // kontraknya tidak berlaku.
  const order = await po(client, a.maker, sup, [{ productId: prod.id, description: prod.code, qty: 10, unitPrice: 11_000, taxPct: 0 }]);
  const line = (await client.query('SELECT id FROM document_lines WHERE document_id=$1', [order.id])).rows[0];

  await assert.rejects(() => contracts.releaseContract(client, { id: c.id, purchaseOrderId: order.id,
    contractLineId: c.lines[0].id, purchaseOrderLineId: line.id, releasedQty: 10, releasedAmount: 110_000, user: a.maker, requestId: randomUUID() }),
  (e) => e.code === 'VALIDATION_ERROR' && e.extra.contractUnitPrice === 9000 && e.extra.poUnitPrice === 11_000);

  // Harga sama atau lebih murah diterima.
  const cheaper = await po(client, a.maker, sup, [{ productId: prod.id, description: prod.code, qty: 10, unitPrice: 8500, taxPct: 0 }]);
  const cheapLine = (await client.query('SELECT id FROM document_lines WHERE document_id=$1', [cheaper.id])).rows[0];
  const ok = await contracts.releaseContract(client, { id: c.id, purchaseOrderId: cheaper.id,
    contractLineId: c.lines[0].id, purchaseOrderLineId: cheapLine.id, releasedQty: 10, releasedAmount: 85_000, user: a.maker, requestId: randomUUID() });
  assert.ok(ok.id);
}));

dbTest('Wave 8: pemasok PO wajib sama dengan kontrak, dan pemasok ditahan tidak dapat dikontrak', async () => rollback(async (client) => {
  const a = await actors(client);
  const sup = await supplier(client), other = await supplier(client), prod = await product(client);
  const c = await activeContract(client, a, sup, prod);

  const wrongPo = await po(client, a.maker, other, [{ productId: prod.id, description: prod.code, qty: 5, unitPrice: 9000, taxPct: 0 }]);
  await assert.rejects(() => contracts.releaseContract(client, { id: c.id, purchaseOrderId: wrongPo.id, releasedAmount: 45_000, user: a.maker, requestId: randomUUID() }),
    (e) => e.code === 'VALIDATION_ERROR' && /tidak cocok dengan kontrak/.test(String(e.detail || e.message)));

  // Komitmen volume kepada pemasok bermasalah justru memperbesar paparannya.
  const held = await supplier(client, { hold: true });
  await assert.rejects(() => contracts.createContract(client, {
    supplierId: held.id, title: 'Kontrak pemasok ditahan', validFrom: today(), validTo: plusDays(90),
    ceilingAmount: 1_000_000, lines: [{ description: 'X', ceilingAmount: 1_000_000 }]
  }, a.maker, randomUUID()), (e) => e.code === 'SUPPLIER_HOLD');
}));

dbTest('Wave 8: jumlah pagu baris tidak boleh melampaui pagu kontrak', async () => rollback(async (client) => {
  const a = await actors(client);
  const sup = await supplier(client), prod = await product(client);
  // Kalau boleh, pagu kontraknya kehilangan arti.
  await assert.rejects(() => contracts.createContract(client, {
    supplierId: sup.id, title: 'Kontrak tidak konsisten', validFrom: today(), validTo: plusDays(90),
    ceilingAmount: 10_000_000,
    lines: [{ productId: prod.id, description: prod.code, ceilingAmount: 7_000_000 },
      { productId: prod.id, description: prod.code, ceilingAmount: 6_000_000 }]
  }, a.maker, randomUUID()),
  (e) => e.code === 'VALIDATION_ERROR' && e.extra.lineCeiling === 13_000_000 && e.extra.contractCeiling === 10_000_000);

  // Masa berlaku terbalik juga ditolak.
  await assert.rejects(() => contracts.createContract(client, {
    supplierId: sup.id, title: 'Masa berlaku terbalik', validFrom: plusDays(30), validTo: today(),
    ceilingAmount: 1_000_000, lines: [{ description: 'X', ceilingAmount: 1_000_000 }]
  }, a.maker, randomUUID()), (e) => e.code === 'VALIDATION_ERROR');
}));

test('Wave 8: kontrak pembelian mencerminkan pola kontrak penjualan, bukan konvensi kedua', () => {
  const fs = require('node:fs');
  const up = fs.readFileSync('data/migrations/059_purchase_contracts.sql', 'utf8');
  const down = fs.readFileSync('data/migrations/059_purchase_contracts.down.sql', 'utf8');
  for (const t of ['purchase_contracts', 'purchase_contract_lines', 'purchase_contract_releases']) {
    assert.ok(up.includes(`CREATE TABLE ${t}`), `${t} wajib ada`);
    assert.match(down, new RegExp(`DROP TABLE IF EXISTS ${t}`));
  }
  // Aturan yang sama dengan sisi penjualan: maker-checker, pagu, dan RLS.
  assert.match(up, /approved_by <> created_by/, 'maker-checker wajib ditegakkan database');
  assert.match(up, /consumed_amount <= ceiling_amount/, 'pagu wajib ditegakkan database');
  assert.match(up, /ENABLE ROW LEVEL SECURITY/, 'kontrak wajib ter-scope cabang di database');
  assert.match(up, /released_qty <= committed_qty/, 'komitmen volume wajib ditegakkan database');
});
