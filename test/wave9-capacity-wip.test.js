'use strict';
// Wave 9 — kapasitas work center dan nilai barang dalam proses (WIP).
//
// capacity_hours_per_day ada sejak migrasi 012 tetapi TIDAK PERNAH diperiksa:
// work center 8 jam/hari dapat dijadwalkan 500 jam tanpa penolakan apa pun.
// Dan operasi sama sekali tidak punya TANGGAL, sehingga beban tidak dapat
// ditempatkan pada waktu — perencanaan kapasitas memang mustahil.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const runtime = require('../backend/infrastructure/database/repositories/runtime');
const capacity = require('../backend/infrastructure/database/repositories/capacity');
const businessDate = require('../backend/core/business-date');

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

async function workCenter(client, branchId, capacityHours = 8, rate = 150000) {
  const plant = (await client.query('SELECT id FROM plants WHERE branch_id=$1 AND active LIMIT 1', [branchId])).rows[0]
    || (await client.query(`INSERT INTO plants(id,branch_id,code,name,plant_type,active) VALUES($1,$2,$3,'Plant uji','WORKSHOP',true) RETURNING id`,
      [randomUUID(), branchId, tag('PL')])).rows[0];
  return (await client.query(
    `INSERT INTO work_centers(id,plant_id,code,name,work_center_type,capacity_hours_per_day,hourly_rate,active)
     VALUES($1,$2,$3,'Work center uji','WELDING',$4,$5,true) RETURNING id,code,capacity_hours_per_day`,
    [randomUUID(), plant.id, tag('WC'), capacityHours, rate])).rows[0];
}
async function workOrder(client, user, status = 'APPROVED') {
  const wo = await runtime.createDocument(client, { type: 'WORK_ORDER', user, title: 'WO kapasitas', amount: 0, requestId: randomUUID() });
  await client.query('UPDATE business_documents SET status=$2 WHERE id=$1', [wo.id, status]);
  return wo;
}
async function operation(client, woId, wc, plannedHours, opNo = 1) {
  return (await client.query(
    `INSERT INTO work_order_operations(id,work_order_id,op_no,name,work_center_id,hourly_rate_snapshot,planned_hours,status)
     VALUES($1,$2,$3,'Operasi uji',$4,$5,$6,'PENDING') RETURNING id`,
    [randomUUID(), woId, opNo, wc.id, 150000, plannedHours])).rows[0];
}
const today = () => businessDate.today();

dbTest('Wave 9: penjadwalan melebihi kapasitas ditolak, bukan lolos diam-diam', async () => rollback(async (client) => {
  const user = await owner(client);
  const wc = await workCenter(client, user.branchId, 8);
  const wo = await workOrder(client, user);
  const first = await operation(client, wo.id, wc, 6, 1);
  const second = await operation(client, wo.id, wc, 5, 2);

  const ok = await capacity.scheduleOperation(client, { operationId: first.id, scheduledDate: today(), user, requestId: randomUUID() });
  assert.equal(ok.projectedHours, 6);
  assert.equal(ok.overloaded, false);

  // 6 + 5 = 11 jam pada work center 8 jam/hari.
  await assert.rejects(() => capacity.scheduleOperation(client, { operationId: second.id, scheduledDate: today(), user, requestId: randomUUID() }),
    (e) => e.code === 'VALIDATION_ERROR' && e.extra.capacityHours === 8 && e.extra.projectedHours === 11 && e.extra.overloadHours === 3,
    'beban melebihi kapasitas wajib ditolak');

  // Hari berikutnya masih longgar.
  const next = await capacity.scheduleOperation(client, { operationId: second.id, scheduledDate: businessDate.addDays(today(), 1), user, requestId: randomUUID() });
  assert.equal(next.projectedHours, 5);
}));

dbTest('Wave 9: kelebihan beban boleh ditembus tetapi harus disengaja dan beralasan', async () => rollback(async (client) => {
  const user = await owner(client);
  const wc = await workCenter(client, user.branchId, 8);
  const wo = await workOrder(client, user);
  const a = await operation(client, wo.id, wc, 7, 1);
  const b = await operation(client, wo.id, wc, 4, 2);
  await capacity.scheduleOperation(client, { operationId: a.id, scheduledDate: today(), user, requestId: randomUUID() });

  // Menembus tanpa alasan tetap ditolak — override diam-diam sama saja dengan
  // tidak ada kendali.
  await assert.rejects(() => capacity.scheduleOperation(client, { operationId: b.id, scheduledDate: today(), allowOverload: true, user, requestId: randomUUID() }),
    (e) => e.code === 'REASON_REQUIRED');

  const forced = await capacity.scheduleOperation(client, { operationId: b.id, scheduledDate: today(),
    allowOverload: true, reason: 'Lembur disetujui manajer produksi untuk kejar kirim.', user, requestId: randomUUID() });
  assert.equal(forced.overloaded, true);
  assert.equal(forced.projectedHours, 11);

  // Jejaknya menyimpan fakta bahwa kapasitas ditembus.
  const audit = (await client.query(
    `SELECT new_value,reason FROM audit_logs WHERE entity_id=$1 ORDER BY occurred_at DESC LIMIT 1`, [b.id])).rows[0];
  assert.equal(audit.new_value.overloaded, true);
  assert.match(audit.reason, /Lembur disetujui/);
}));

dbTest('Wave 9: menjadwalkan ulang operasi yang sama tidak dihitung sebagai penambahan', async () => rollback(async (client) => {
  const user = await owner(client);
  const wc = await workCenter(client, user.branchId, 8);
  const wo = await workOrder(client, user);
  const op = await operation(client, wo.id, wc, 7, 1);

  await capacity.scheduleOperation(client, { operationId: op.id, scheduledDate: today(), user, requestId: randomUUID() });
  // Menjadwalkan ke tanggal yang sama lagi: bebannya tetap 7, bukan 14.
  const again = await capacity.scheduleOperation(client, { operationId: op.id, scheduledDate: today(), user, requestId: randomUUID() });
  assert.equal(again.projectedHours, 7, 'operasi tidak boleh bersaing dengan dirinya sendiri');
  assert.equal(await capacity.loadOn(client, wc.id, today()), 7);
}));

dbTest('Wave 9: papan kapasitas menampilkan beban, sisa, dan utilisasi per hari', async () => rollback(async (client) => {
  const user = await owner(client);
  const wc = await workCenter(client, user.branchId, 10);
  const wo = await workOrder(client, user);
  const a = await operation(client, wo.id, wc, 4, 1);
  const b = await operation(client, wo.id, wc, 3, 2);
  await capacity.scheduleOperation(client, { operationId: a.id, scheduledDate: today(), user, requestId: randomUUID() });
  await capacity.scheduleOperation(client, { operationId: b.id, scheduledDate: today(), user, requestId: randomUUID() });

  const board = await capacity.capacityBoard(client, { branchId: user.branchId, user });
  const day = board.items.find((i) => i.workCenterCode === wc.code && i.date === today());
  assert.ok(day, 'work center wajib muncul di papan kapasitas');
  assert.equal(day.plannedHours, 7);
  assert.equal(day.capacityHours, 10);
  assert.equal(day.availableHours, 3);
  assert.equal(day.utilizationPct, 70);
  assert.equal(day.overloaded, false);
  assert.equal(day.operationCount, 2);
}));

dbTest('Wave 9: operasi selesai dan WO batal tidak lagi membebani kapasitas', async () => rollback(async (client) => {
  const user = await owner(client);
  const wc = await workCenter(client, user.branchId, 8);
  const wo = await workOrder(client, user);
  const op = await operation(client, wo.id, wc, 6, 1);
  await capacity.scheduleOperation(client, { operationId: op.id, scheduledDate: today(), user, requestId: randomUUID() });
  assert.equal(await capacity.loadOn(client, wc.id, today()), 6);

  await client.query(`UPDATE work_order_operations SET status='DONE' WHERE id=$1`, [op.id]);
  assert.equal(await capacity.loadOn(client, wc.id, today()), 0, 'operasi selesai tidak lagi menuntut kapasitas');

  // WO yang dibatalkan juga membebaskan kapasitasnya.
  await client.query(`UPDATE work_order_operations SET status='PENDING' WHERE id=$1`, [op.id]);
  assert.equal(await capacity.loadOn(client, wc.id, today()), 6);
  await client.query(`UPDATE business_documents SET status='CANCELLED' WHERE id=$1`, [wo.id]);
  assert.equal(await capacity.loadOn(client, wc.id, today()), 0);
}));

dbTest('Wave 9: nilai WIP terlihat selama pekerjaan berjalan, bukan hanya saat selesai', async () => rollback(async (client) => {
  const user = await owner(client);
  const wc = await workCenter(client, user.branchId, 8, 200_000);
  const wo = await workOrder(client, user, 'IN_PROCESS');
  const prod = (await client.query(
    `INSERT INTO products(id,code,name,product_type,category,uom,hpp,price,make_or_buy,active)
     VALUES($1,$2,'Bahan WIP','PRODUCT','WIP','KG',50000,80000,'BUY',true) RETURNING id`,
    [randomUUID(), tag('WP')])).rows[0];
  await client.query(
    `INSERT INTO work_order_materials(id,work_order_id,line_no,product_id,planned_qty,issued_qty,uom,unit_cost_snapshot)
     VALUES($1,$2,1,$3,10,6,'KG',50000)`, [randomUUID(), wo.id, prod.id]);
  const op = await operation(client, wo.id, wc, 8, 1);
  await client.query('UPDATE work_order_operations SET hourly_rate_snapshot=200000 WHERE id=$1', [op.id]);

  // Sebelum jam aktual dicatat, biaya tenaga kerja WIP nol — jujur, bukan
  // memakai angka rencana seolah pekerjaan sudah dilakukan.
  let wip = await capacity.wipSummary(client, { branchId: user.branchId, user });
  let mine = wip.items.find((i) => i.workOrderId === wo.id);
  assert.ok(mine, 'WO berjalan wajib muncul di WIP');
  assert.equal(mine.materialCost, 300_000, 'material dikeluarkan 6 × 50.000');
  assert.equal(mine.laborCost, 0);

  await capacity.recordActualHours(client, { operationId: op.id, hours: 5, user, requestId: randomUUID() });
  wip = await capacity.wipSummary(client, { branchId: user.branchId, user });
  mine = wip.items.find((i) => i.workOrderId === wo.id);
  assert.equal(mine.laborCost, 1_000_000, '5 jam × 200.000');
  assert.equal(mine.wipValue, 1_300_000, 'nilai tertahan di lantai produksi');
  assert.ok(wip.totals.wipValue >= 1_300_000);

  // WO yang sudah selesai keluar dari WIP — nilainya sudah pindah ke barang jadi.
  await client.query(`UPDATE business_documents SET status='COMPLETED' WHERE id=$1`, [wo.id]);
  wip = await capacity.wipSummary(client, { branchId: user.branchId, user });
  assert.ok(!wip.items.some((i) => i.workOrderId === wo.id), 'WO selesai tidak lagi dihitung sebagai WIP');
}));

dbTest('Wave 9: kapasitas dan WIP tidak bocor lintas cabang', async () => rollback(async (client) => {
  const user = await owner(client);
  const other = (await client.query('SELECT id FROM branches WHERE id<>$1 AND active LIMIT 1', [user.branchId])).rows[0];
  assert.ok(other, 'butuh dua cabang');
  const outsider = { ...user, role: 'production', branchScope: other.id, branchId: other.id };

  await assert.rejects(() => capacity.capacityBoard(client, { branchId: user.branchId, user: outsider }),
    (e) => e.code === 'PERMISSION_DENIED');
  await assert.rejects(() => capacity.wipSummary(client, { branchId: user.branchId, user: outsider }),
    (e) => e.code === 'PERMISSION_DENIED');
}));

test('Wave 9: beban dan WIP diturunkan dari fakta, bukan angka yang dipelihara terpisah', () => {
  const fs = require('node:fs');
  const up = fs.readFileSync('data/migrations/060_capacity_wip.sql', 'utf8');
  assert.match(up, /CREATE VIEW work_center_daily_load/, 'beban wajib berupa view turunan');
  assert.match(up, /CREATE VIEW work_order_wip/, 'WIP wajib berupa view turunan');
  // View, bukan tabel: tidak ada saldo paralel yang bisa menyimpang dari fakta.
  assert.ok(!/CREATE TABLE work_center_daily_load/.test(up));
  assert.ok(!/CREATE TABLE work_order_wip/.test(up));
  assert.match(up, /status <> 'DONE'/, 'operasi selesai tidak boleh membebani kapasitas');
});
