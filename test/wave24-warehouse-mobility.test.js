'use strict';
// Wave 24 — Canonical Warehouse Stage 2A + WMS mobile scan evidence.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const tasks = require('../backend/infrastructure/database/repositories/warehouse-tasks');
const mobility = require('../backend/infrastructure/database/repositories/warehouse-mobility');

const dbTest = process.env.DATABASE_URL ? test : test.skip;
async function rollback(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.is_system','on',true)");
    await fn(client);
  } finally {
    await client.query('ROLLBACK').catch(() => {});
    await client.end();
  }
}
async function owner(client) {
  const row = (await client.query(
    `SELECT * FROM app_users WHERE role='owner' AND branch_id IS NOT NULL AND active LIMIT 1`)).rows[0];
  return { id: row.id, role: row.role, branchId: row.branch_id, branchScope: '*', displayName: row.display_name };
}
let sequence = 0;
const tag = (prefix) => `${prefix}${++sequence}${Date.now().toString(36).toUpperCase().slice(-5)}`;

async function makePlace(client, branchId) {
  const warehouse = (await client.query(
    `INSERT INTO org_warehouses(id,branch_id,code,name,warehouse_type,active)
     VALUES($1,$2,$3,'Gudang mobility','GENERAL',true) RETURNING id,code`,
    [randomUUID(), branchId, tag('WM')])).rows[0];
  const location = (await client.query(
    `INSERT INTO storage_locations(id,warehouse_id,code,name,active)
     VALUES($1,$2,$3,'Zona mobility',true) RETURNING id,code`,
    [randomUUID(), warehouse.id, tag('ZM')])).rows[0];
  const bin = (await client.query(
    `INSERT INTO warehouse_bins(id,storage_location_id,code,bin_type,active)
     VALUES($1,$2,$3,'RACK',true) RETURNING id,code`,
    [randomUUID(), location.id, tag('BM')])).rows[0];
  return { warehouse, location, bin };
}
async function makeLot(client, branchId, orgWarehouseId, qty = 12) {
  const product = (await client.query(
    `INSERT INTO products(id,code,name,product_type,category,uom,hpp,price,make_or_buy,active)
     VALUES($1,$2,'Material mobility','PRODUCT','MOBILITY','PCS',1000,2000,'BUY',true)
     RETURNING id,code`, [randomUUID(), tag('PM')])).rows[0];
  const lot = (await client.query(
    `INSERT INTO stock_lots
       (id,product_id,warehouse_id,org_warehouse_id,lot_number,qty_received,qty_on_hand,unit_cost,status,expiry_date)
     VALUES($1,$2,$3,$4,$5,$6,$6,1000,'ACTIVE',current_date+30)
     RETURNING id,lot_number,org_warehouse_id`,
    [randomUUID(), product.id, branchId, orgWarehouseId, tag('LM'), qty])).rows[0];
  return { product, lot };
}

dbTest('Wave 24: canonical dimension health bernilai nol setelah backfill', async () => rollback(async (client) => {
  const user = await owner(client);
  const health = await mobility.dimensionHealth(client, user);
  assert.equal(health.healthy, true);
  for (const [key, value] of Object.entries(health)) {
    if (key !== 'healthy') assert.equal(Number(value), 0, `${key} wajib nol`);
  }
}));

dbTest('Wave 24: handling unit menjaga scope, qty, lifecycle, dan optimistic lock', async () => rollback(async (client) => {
  const user = await owner(client);
  const place = await makePlace(client, user.branchId);
  const { lot } = await makeLot(client, user.branchId, place.warehouse.id, 10);
  let hu = await mobility.createHandlingUnit(client, {
    branchId: user.branchId, orgWarehouseId: place.warehouse.id, binId: place.bin.id,
    handlingUnitType: 'PALLET', licensePlate: tag('HU')
  }, user, randomUUID());
  assert.equal(hu.status, 'OPEN');
  assert.equal(hu.orgWarehouseId, place.warehouse.id);

  hu = await mobility.addHandlingUnitItem(client,
    { id: hu.id, lotId: lot.id, qty: 8, user, requestId: randomUUID() });
  assert.equal(Number(hu.totalQty), 8);
  assert.equal(Number(hu.itemCount), 1);
  await assert.rejects(
    () => mobility.addHandlingUnitItem(client,
      { id: hu.id, lotId: lot.id, qty: 11, user, requestId: randomUUID() }),
    (error) => error.code === 'VALIDATION_ERROR');

  const sealed = await mobility.transitionHandlingUnit(client,
    { id: hu.id, action: 'SEAL', expectedVersion: hu.version, user, requestId: randomUUID() });
  assert.equal(sealed.status, 'SEALED');
  await assert.rejects(
    () => mobility.transitionHandlingUnit(client,
      { id: hu.id, action: 'STAGE', expectedVersion: hu.version, user, requestId: randomUUID() }),
    (error) => error.code === 'DOCUMENT_CONFLICT');
}));

dbTest('Wave 24: scan harus berurutan dan task scan-required tidak dapat bypass', async () => rollback(async (client) => {
  const user = await owner(client);
  const place = await makePlace(client, user.branchId);
  const { product, lot } = await makeLot(client, user.branchId, place.warehouse.id, 10);
  const created = await tasks.createTask(client, {
    taskType: 'PUTAWAY', branchId: user.branchId, productId: product.id, lotId: lot.id,
    toBinId: place.bin.id, qty: 10, scanRequired: true
  }, user, randomUUID());
  await tasks.claimTask(client, { id: created.id, expectedVersion: 1, user, requestId: randomUUID() });
  const started = await tasks.startTask(client, { id: created.id, expectedVersion: 2, user, requestId: randomUUID() });

  let session = await mobility.startScanSession(client, { taskId: created.id, user, requestId: randomUUID() });
  assert.equal(session.nextScan.type, 'LOT');
  await assert.rejects(
    () => mobility.scan(client, { id: session.id, code: `BIN:${place.bin.code}`,
      expectedVersion: session.version, user, requestId: randomUUID() }),
    (error) => error.code === 'VALIDATION_ERROR');

  session = await mobility.scan(client, { id: session.id, code: `LOT:${lot.lot_number}`,
    expectedVersion: session.version, deviceLabel: 'node-test', user, requestId: randomUUID() });
  assert.equal(session.nextScan.type, 'BIN');
  session = await mobility.scan(client, { id: session.id, code: `BIN:${place.bin.code}`,
    expectedVersion: session.version, deviceLabel: 'node-test', user, requestId: randomUUID() });
  assert.equal(session.status, 'READY');

  await assert.rejects(
    () => tasks.completeTask(client, { id: created.id, expectedVersion: started.version,
      user, requestId: randomUUID() }),
    (error) => error.code === 'STATUS_INVALID', 'task tidak boleh bypass bukti scan');

  session = await mobility.completeScanSession(client,
    { id: session.id, expectedVersion: session.version, user, requestId: randomUUID() });
  assert.equal(session.status, 'COMPLETED');
  const done = await tasks.completeTask(client, { id: created.id, expectedVersion: started.version,
    user, requestId: randomUUID(), note: 'Scan fisik lengkap.' });
  assert.equal(done.status, 'DONE');
  assert.equal(done.effect.toBinId, place.bin.id);

  await assert.rejects(
    () => client.query('UPDATE warehouse_scan_events SET scanned_code=$1 WHERE session_id=$2',
      ['TAMPERED', session.id]),
    /append-only/i);
}));

dbTest('Wave 24: database menolak dimensi gudang lintas cabang', async () => rollback(async (client) => {
  const user = await owner(client);
  const other = (await client.query(
    'SELECT id FROM branches WHERE active AND id<>$1 LIMIT 1', [user.branchId])).rows[0];
  assert.ok(other);
  const foreign = (await client.query(
    'SELECT id FROM org_warehouses WHERE branch_id=$1 AND active LIMIT 1', [other.id])).rows[0];
  const balance = (await client.query(
    'SELECT product_id,warehouse_id FROM inventory_balances WHERE warehouse_id=$1 LIMIT 1',
    [user.branchId])).rows[0];
  if (balance) {
    await assert.rejects(
      () => client.query(
        'UPDATE inventory_balances SET org_warehouse_id=$1 WHERE product_id=$2 AND warehouse_id=$3',
        [foreign.id, balance.product_id, balance.warehouse_id]),
      /must belong to branch|outside branch/i);
  }
}));

test('Wave 24: migration, repository, route, UI, dan OpenAPI terhubung', () => {
  const files = [
    ['data/migrations/082_warehouse_stage2a_mobility.sql', ['warehouse_handling_units', 'warehouse_scan_events', 'warehouse_dimension_health', 'expiry_date']],
    ['backend/infrastructure/database/repositories/warehouse-mobility.js', ['startScanSession', 'transitionHandlingUnit', 'dimensionHealth']],
    ['backend/routes/inventory.js', ['/api/inventory/mobility/sessions', '/api/inventory/handling-units']],
    ['src/modules/inventory.js', ['mobile-scan-workbench', 'WMS Mobile']],
    ['backend/core/openapi.js', ['/api/inventory/warehouse-health', '/api/inventory/mobility/sessions/{id}/scan']]
  ];
  for (const [file, tokens] of files) {
    const source = fs.readFileSync(file, 'utf8');
    for (const token of tokens) assert.ok(source.includes(token), `${file} wajib memuat ${token}`);
  }
});
