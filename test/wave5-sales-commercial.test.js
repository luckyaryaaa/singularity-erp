'use strict';
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');
const runtime = require('../backend/infrastructure/database/repositories/runtime');
const commercial = require('../backend/infrastructure/database/repositories/sales-commercial');

const dbTest = process.env.DATABASE_URL ? test : test.skip;
async function rollback(fn) { const client = new Client({ connectionString: process.env.DATABASE_URL }); await client.connect(); try { await client.query('BEGIN'); await client.query("SELECT set_config('app.is_system','on',true),set_config('app.is_platform','on',true),set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true)"); await fn(client); } finally { await client.query('ROLLBACK').catch(() => {}); await client.end(); } }
async function actors(client) {
  const rows = (await client.query(`SELECT u.*,b.legal_entity_id FROM app_users u JOIN branches b ON b.id=u.branch_id WHERE u.active AND b.legal_entity_id IS NOT NULL ORDER BY CASE u.role WHEN 'sales' THEN 0 WHEN 'finance_manager' THEN 1 WHEN 'owner' THEN 2 ELSE 3 END`)).rows;
  const maker = rows.find((x) => x.role === 'sales') || rows[0], checker = rows.find((x) => x.id !== maker.id && ['finance_manager','owner','accounting'].includes(x.role)) || rows.find((x) => x.id !== maker.id);
  assert.ok(maker && checker, 'maker dan checker UAT wajib tersedia');
  const map = (x) => ({ id: x.id, role: x.role, branchId: maker.branch_id, branchScope: '*', displayName: x.display_name });
  return { maker: map(maker), checker: map(checker), legalEntityId: maker.legal_entity_id };
}
let sequence = 0;
async function fixtures(client, user, { hpp = 100, price = 200, makeOrBuy = 'BUY' } = {}) {
  sequence += 1; const suffix = `${Date.now().toString(36).toUpperCase().slice(-6)}${sequence}`;
  const customer = (await client.query(`INSERT INTO customers(id,code,name,legal_name,customer_type,ppn_status,payment_term_days,currency,risk_rating,collection_status,credit_limit_amount,active) VALUES($1,$2,$3,$3,'COMPANY','PKP',30,'IDR','LOW','NORMAL',1000000000,true) RETURNING *`, [randomUUID(), `W5C${suffix}`, `Customer Wave 5 ${suffix}`])).rows[0];
  const product = (await client.query(`INSERT INTO products(id,code,name,product_type,category,uom,hpp,price,make_or_buy,active) VALUES($1,$2,$3,'PRODUCT','WAVE5','PCS',$4,$5,$6,true) RETURNING *`, [randomUUID(), `W5P${suffix}`, `Product Wave 5 ${suffix}`, hpp, price, makeOrBuy])).rows[0];
  return { customer, product };
}
async function order(client, user, customer, product, qty = 10, price = 200) {
  return runtime.createDocument(client, { type: 'SALES_ORDER', user, title: 'Wave 5 SO', partyId: customer.id, partyName: customer.name, amount: qty * price, payload: { taxPct: 0, lines: [{ productId: product.id, description: product.name, qty, unitPrice: price, taxPct: 0 }] }, requestId: randomUUID() });
}

test('Wave 5 Sales: schema, RLS, rollback, repository, route, dan UI contract terpasang', () => {
  const root = path.join(__dirname, '..'), up = fs.readFileSync(path.join(root, 'data/migrations/056_sales_commercial_controls.sql'), 'utf8'), down = fs.readFileSync(path.join(root, 'data/migrations/056_sales_commercial_controls.down.sql'), 'utf8');
  for (const token of ['sales_margin_policies','sales_margin_assessments','sales_contracts','sales_contract_releases','sales_availability_promises','sales_milestone_schedules','sales_backorders','ENABLE ROW LEVEL SECURITY']) assert.match(up, new RegExp(token));
  assert.match(down, /DROP TABLE IF EXISTS sales_margin_policies/);
  const repository = fs.readFileSync(path.join(root, 'backend/infrastructure/database/repositories/sales-commercial.js'), 'utf8');
  for (const token of ['assertMarginRelease','assertAvailabilityRelease','createContract','invoiceMilestone','refreshBackorders']) assert.match(repository, new RegExp(token));
  assert.match(fs.readFileSync(path.join(root, 'src/modules/sales.js'), 'utf8'), /Commercial Control Center/);
});

dbTest('Wave 5 Sales: margin rendah memerlukan maker-checker dan melepas submit hanya setelah approval', async () => rollback(async (client) => {
  const { maker, checker } = await actors(client), { customer, product } = await fixtures(client, maker, { hpp: 95, price: 100 });
  const so = await order(client, maker, customer, product, 10, 100);
  await commercial.calculateAvailability(client, { salesOrderId: so.id, user: maker });
  const assessment = await commercial.assessMargin(client, { documentId: so.id, user: maker });
  assert.equal(assessment.status, 'PENDING_APPROVAL'); assert.equal(Number(assessment.marginPct), 5);
  await assert.rejects(() => runtime.transitionDocument(client, { id: so.id, action: 'submit', user: maker, requestId: randomUUID() }), (e) => e.code === 'STATUS_INVALID' && e.extra.assessmentId === assessment.id);
  await assert.rejects(() => commercial.decideMargin(client, { assessmentId: assessment.id, approve: true, reason: 'self', user: maker }), (e) => e.code === 'SOD_CONFLICT');
  await commercial.decideMargin(client, { assessmentId: assessment.id, approve: true, reason: 'Strategic approved exception', user: checker, requestId: randomUUID() });
  const submitted = await runtime.transitionDocument(client, { id: so.id, action: 'submit', user: maker, requestId: randomUUID() });
  assert.equal(submitted.status, 'WAITING_APPROVAL');
}));

dbTest('Wave 5 Sales: ATP memakai stok, CTP menutup shortage, dan backorder mengikuti fulfilment', async () => rollback(async (client) => {
  const { maker } = await actors(client), { customer, product } = await fixtures(client, maker, { hpp: 100, price: 250, makeOrBuy: 'BUY' });
  await client.query(`INSERT INTO inventory_balances(id,product_id,warehouse_id,qty_on_hand,qty_reserved) VALUES($1,$2,$3,6,0)`, [randomUUID(), product.id, maker.branchId]);
  // 1 unit ditahan pesanan LAIN. Sejak migrasi 057 stok hanya dapat ditahan
  // lewat catatan reservasi; qty_reserved yang disetel langsung adalah
  // reservasi hantu tanpa pemilik dan sengaja tidak lagi diakui.
  const stockReservations = require('../backend/infrastructure/database/repositories/stock-reservations');
  const otherOrder = await order(client, maker, customer, product, 1, 250);
  await stockReservations.reserve(client, { productId: product.id, warehouseId: maker.branchId,
    documentId: otherOrder.id, qty: 1, user: maker, reason: 'Reservasi pesanan lain pada uji ATP' });

  const so = await order(client, maker, customer, product, 10, 250);
  const promise = await commercial.calculateAvailability(client, { salesOrderId: so.id, user: maker });
  assert.equal(Number(promise.items[0].atpQty), 5); assert.equal(Number(promise.items[0].ctpQty), 5); assert.equal(promise.items[0].promiseSource, 'CTP_BUY');
  await client.query(`UPDATE business_documents SET status='APPROVED' WHERE id=$1`, [so.id]);
  let rows = await commercial.refreshBackorders(client, so.id, maker);
  assert.equal(Number(rows[0].backorderQty), 10); assert.equal(Number(rows[0].allocatedQty), 5); assert.equal(rows[0].status, 'PARTIALLY_ALLOCATED');
  const line = (await client.query('SELECT id FROM document_lines WHERE document_id=$1', [so.id])).rows[0];
  const delivery = await runtime.createDocument(client, { type: 'DELIVERY', user: maker, title: 'Partial delivery', partyId: customer.id, partyName: customer.name, amount: 1000, payload: { taxPct: 0, lines: [{ productId: product.id, description: product.name, qty: 4, unitPrice: 250, taxPct: 0, sourceLineId: line.id }] }, requestId: randomUUID() });
  await client.query(`UPDATE business_documents SET status='COMPLETED' WHERE id=$1`, [delivery.id]);
  rows = await commercial.refreshBackorders(client, so.id, maker);
  assert.equal(Number(rows[0].backorderQty), 6);
}));

dbTest('Wave 5 Sales: kontrak tidak dapat over-release dan milestone menghasilkan invoice tepat sekali', async () => rollback(async (client) => {
  const { maker, checker } = await actors(client), { customer, product } = await fixtures(client, maker, { hpp: 100, price: 200 });
  const so = await order(client, maker, customer, product, 10, 200);
  const contract = await commercial.createContract(client, { contractNumber: `CTR-${Date.now()}`, customerId: customer.id, title: 'Blanket Wave 5', contractType: 'BLANKET', validFrom: '2026-01-01', validTo: '2027-12-31', ceilingAmount: 5000, lines: [{ productId: product.id, description: product.name, committedQty: 20, ceilingAmount: 5000 }] }, maker);
  await commercial.submitContract(client, contract.id, maker);
  await assert.rejects(() => commercial.decideContract(client, { id: contract.id, approve: true, reason: 'self', user: maker }), (e) => e.code === 'SOD_CONFLICT');
  await commercial.decideContract(client, { id: contract.id, approve: true, reason: 'Commercial terms verified', user: checker, requestId: randomUUID() });
  await commercial.releaseContract(client, { id: contract.id, salesOrderId: so.id, releasedAmount: 2000, user: maker, requestId: randomUUID() });
  await assert.rejects(() => commercial.releaseContract(client, { id: contract.id, salesOrderId: so.id, releasedAmount: 4000, user: maker }), (e) => ['VALIDATION_ERROR','VALIDATION_ERROR'].includes(e.code));

  const schedules = await commercial.createMilestones(client, { salesOrderId: so.id, milestones: [{ description: 'DP', billingPct: 30 }, { description: 'BAST', billingPct: 70, triggerType: 'ACCEPTANCE' }], user: maker });
  assert.equal(schedules.reduce((n, x) => n + Number(x.billingAmount), 0), Number(so.amount));
  await assert.rejects(() => commercial.markMilestoneReady(client, { milestoneId: schedules[0].id, user: maker }), (e) => e.code === 'SOD_CONFLICT');
  await commercial.markMilestoneReady(client, { milestoneId: schedules[0].id, user: checker });
  const first = await commercial.invoiceMilestone(client, { milestoneId: schedules[0].id, user: checker, requestId: randomUUID() });
  const replay = await commercial.invoiceMilestone(client, { milestoneId: schedules[0].id, user: checker, requestId: randomUUID() });
  assert.equal(first.invoice.documentType, 'INVOICE'); assert.equal(replay.invoice.id, first.invoice.id); assert.equal(replay.idempotentReplay, true);
}));
