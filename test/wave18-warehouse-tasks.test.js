'use strict';
// Wave 18 — mesin tugas eksekusi gudang (WMS minimal task flow), migrasi 075.
// Receiving→putaway→pick→pack→ship menjadi tugas bertipe yang dapat ditugaskan,
// diklaim, dikerjakan, dan diaudit. Tugas PUTAWAY menyelesaikan diri dengan
// memindahkan lot ke rak tujuan lewat penempatan lot yang sudah ada (058) —
// tidak ada jalur mutasi stok kedua.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const tasks = require('../backend/infrastructure/database/repositories/warehouse-tasks');
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

async function makeBin(client, branchId) {
  const wh = (await client.query(
    `INSERT INTO org_warehouses(id,branch_id,code,name,warehouse_type,active) VALUES($1,$2,$3,'Gudang uji tugas','GENERAL',true) RETURNING id`,
    [randomUUID(), branchId, tag('WH')])).rows[0];
  const loc = (await client.query(
    `INSERT INTO storage_locations(id,warehouse_id,code,name,active) VALUES($1,$2,$3,'Zona uji',true) RETURNING id`,
    [randomUUID(), wh.id, tag('ZN')])).rows[0];
  const bin = (await client.query(
    `INSERT INTO warehouse_bins(id,storage_location_id,code,bin_type,active) VALUES($1,$2,$3,'RACK',true) RETURNING id,code`,
    [randomUUID(), loc.id, tag('BIN')])).rows[0];
  return { warehouseId: wh.id, locationId: loc.id, binId: bin.id, binCode: bin.code };
}
async function makeLot(client, branchId, qty = 20) {
  const p = (await client.query(
    `INSERT INTO products(id,code,name,product_type,category,uom,hpp,price,make_or_buy,active)
     VALUES($1,$2,'Baja uji tugas','PRODUCT','WMS','PCS',1000,2000,'BUY',true) RETURNING id,code`,
    [randomUUID(), tag('PW')])).rows[0];
  const lot = (await client.query(
    `INSERT INTO stock_lots(id,product_id,warehouse_id,lot_number,heat_number,qty_received,qty_on_hand,unit_cost,status)
     VALUES($1,$2,$3,$4,'HT-WMS',$5,$5,1000,'ACTIVE') RETURNING id,lot_number`,
    [randomUUID(), p.id, branchId, tag('LOT'), qty])).rows[0];
  return { product: p, lot };
}

dbTest('Wave 18: tugas gudang punya siklus hidup penuh dan tercatat di papan kerja', async () => rollback(async (client) => {
  const user = await owner(client);
  const place = await makeBin(client, user.branchId);
  const { product, lot } = await makeLot(client, user.branchId, 20);

  const task = await tasks.createTask(client, {
    taskType: 'PUTAWAY', branchId: user.branchId, productId: product.id, lotId: lot.id,
    toBinId: place.binId, qty: 20, priority: 'HIGH', instructions: 'Tempatkan setelah penerimaan.'
  }, user, randomUUID());
  assert.equal(task.status, 'OPEN');
  assert.equal(task.taskType, 'PUTAWAY');
  assert.equal(task.version, 1);

  const board = await tasks.listTasks(client, user, { branchId: user.branchId });
  assert.ok(board.items.some((t) => t.id === task.id), 'tugas wajib muncul di papan kerja cabang');
  assert.equal(board.summary.open, 1);

  const claimed = await tasks.claimTask(client, { id: task.id, expectedVersion: 1, user, requestId: randomUUID() });
  assert.equal(claimed.status, 'CLAIMED');
  assert.equal(claimed.version, 2);

  const started = await tasks.startTask(client, { id: task.id, expectedVersion: 2, user, requestId: randomUUID() });
  assert.equal(started.status, 'IN_PROGRESS');

  const done = await tasks.completeTask(client, { id: task.id, expectedVersion: 3, note: 'Selesai ditempatkan.', user, requestId: randomUUID() });
  assert.equal(done.status, 'DONE');
  assert.ok(done.effect && done.effect.toBinId === place.binId, 'put-away benar-benar memindahkan lot ke rak');

  // Efek nyata: lot kini berada di rak tujuan — bukan sekadar status DONE.
  const where = await bins.locateProduct(client, { productId: product.id, branchId: user.branchId, user });
  assert.equal(where.placedQty, 20, 'lot tertempatkan setelah tugas put-away selesai');
  assert.equal((await bins.binContents(client, place.binId, user)).totalQty, 20);
}));

dbTest('Wave 18: transisi memakai optimistic lock — versi salah ditolak', async () => rollback(async (client) => {
  const user = await owner(client);
  const place = await makeBin(client, user.branchId);
  const { product, lot } = await makeLot(client, user.branchId, 5);
  const task = await tasks.createTask(client, { taskType: 'PUTAWAY', branchId: user.branchId,
    productId: product.id, lotId: lot.id, toBinId: place.binId, qty: 5 }, user, randomUUID());

  await assert.rejects(() => tasks.claimTask(client, { id: task.id, expectedVersion: 99, user, requestId: randomUUID() }),
    (e) => e.code === 'DOCUMENT_CONFLICT', 'versi usang wajib ditolak');
}));

dbTest('Wave 18: status guard — tugas tidak dapat diselesaikan sebelum diklaim', async () => rollback(async (client) => {
  const user = await owner(client);
  const place = await makeBin(client, user.branchId);
  const { product, lot } = await makeLot(client, user.branchId, 5);
  const task = await tasks.createTask(client, { taskType: 'PUTAWAY', branchId: user.branchId,
    productId: product.id, lotId: lot.id, toBinId: place.binId, qty: 5 }, user, randomUUID());

  await assert.rejects(() => tasks.completeTask(client, { id: task.id, expectedVersion: 1, user, requestId: randomUUID() }),
    (e) => e.code === 'STATUS_INVALID', 'tugas OPEN belum boleh diselesaikan');
  await assert.rejects(() => tasks.startTask(client, { id: task.id, expectedVersion: 1, user, requestId: randomUUID() }),
    (e) => e.code === 'STATUS_INVALID', 'tugas OPEN belum boleh dimulai (harus CLAIMED dulu)');
}));

dbTest('Wave 18: tugas put-away menolak lot/rak milik cabang lain', async () => rollback(async (client) => {
  const user = await owner(client);
  const other = (await client.query('SELECT id FROM branches WHERE id<>$1 AND active LIMIT 1', [user.branchId])).rows[0];
  assert.ok(other, 'butuh dua cabang');
  const foreignBin = await makeBin(client, other.id);
  const { product, lot } = await makeLot(client, user.branchId, 5);

  await assert.rejects(() => tasks.createTask(client, { taskType: 'PUTAWAY', branchId: user.branchId,
    productId: product.id, lotId: lot.id, toBinId: foreignBin.binId, qty: 5 }, user, randomUUID()),
  (e) => e.code === 'VALIDATION_ERROR', 'rak cabang lain wajib ditolak');

  const foreignLot = await makeLot(client, other.id, 5);
  const mine = await makeBin(client, user.branchId);
  await assert.rejects(() => tasks.createTask(client, { taskType: 'PUTAWAY', branchId: user.branchId,
    productId: foreignLot.product.id, lotId: foreignLot.lot.id, toBinId: mine.binId, qty: 5 }, user, randomUUID()),
  (e) => e.code === 'VALIDATION_ERROR', 'lot cabang lain wajib ditolak');
}));

dbTest('Wave 18: put-away tanpa rak tujuan ditolak, pembatalan wajib beralasan', async () => rollback(async (client) => {
  const user = await owner(client);
  const { product, lot } = await makeLot(client, user.branchId, 5);
  await assert.rejects(() => tasks.createTask(client, { taskType: 'PUTAWAY', branchId: user.branchId,
    productId: product.id, lotId: lot.id, qty: 5 }, user, randomUUID()),
  (e) => e.code === 'VALIDATION_ERROR', 'put-away tanpa rak tujuan tidak bermakna');

  const receive = await tasks.createTask(client, { taskType: 'RECEIVE', branchId: user.branchId,
    productId: product.id, qty: 5, reference: 'GR-UJI' }, user, randomUUID());
  await assert.rejects(() => tasks.cancelTask(client, { id: receive.id, expectedVersion: 1, reason: 'x', user, requestId: randomUUID() }),
    (e) => e.code === 'REASON_REQUIRED', 'alasan pembatalan terlalu singkat wajib ditolak');
  const cancelled = await tasks.cancelTask(client, { id: receive.id, expectedVersion: 1, reason: 'Dokumen sumber dibatalkan.', user, requestId: randomUUID() });
  assert.equal(cancelled.status, 'CANCELLED');
}));

dbTest('Wave 18: papan kerja tidak dapat diintip lintas cabang', async () => rollback(async (client) => {
  const user = await owner(client);
  const other = (await client.query('SELECT id FROM branches WHERE id<>$1 AND active LIMIT 1', [user.branchId])).rows[0];
  const outsider = { ...user, role: 'warehouse', branchScope: other.id, branchId: other.id };
  await assert.rejects(() => tasks.listTasks(client, outsider, { branchId: user.branchId }),
    (e) => e.code === 'PERMISSION_DENIED', 'pengguna cabang lain tidak boleh melihat papan kerja ini');
}));

test('Wave 18: mesin tugas gudang benar-benar terhubung — kode dan migrasi merujuknya', () => {
  const fs = require('node:fs');
  const repo = fs.readFileSync('backend/infrastructure/database/repositories/warehouse-tasks.js', 'utf8');
  const route = fs.readFileSync('backend/routes/inventory.js', 'utf8');
  const up = fs.readFileSync('data/migrations/075_warehouse_task_engine.sql', 'utf8');
  for (const token of ['warehouse_tasks', 'app_branch_visible', 'PUTAWAY']) {
    assert.ok(up.includes(token), `migrasi wajib mendefinisikan ${token}`);
  }
  assert.match(route, /warehouseTasks\.(listTasks|createTask|claimTask|startTask|completeTask|cancelTask)/, 'rute wajib memakai mesin tugas gudang');
  assert.match(up, /ENABLE ROW LEVEL SECURITY/, 'tabel tugas wajib memakai RLS sebagai pertahanan kedua');
  assert.ok(repo.includes('binExecution.putaway'), 'penyelesaian put-away wajib memakai penempatan lot yang sudah ada, bukan jalur mutasi kedua');
});
