'use strict';
// P1-1 — read model dashboard. Yang diuji: angkanya tetap benar setelah
// agregasi pindah ke database, dan bebannya tidak lagi tumbuh mengikuti
// seluruh riwayat dokumen.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const workspace = require('../backend/routes/workspace');

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
const dashboard = (client, user) =>
  workspace.dispatch(client, { method: 'GET' }, new URL('http://x/api/dashboard'), { user, requestId: randomUUID() });

let seq = 0;
async function doc(client, user, { type, status, amount, branchId, payload = {} }) {
  return (await client.query(
    `INSERT INTO business_documents(id,document_number,document_type,branch_id,status,version,amount,payload,title,exchange_rate_date,functional_amount,reporting_amount,created_by,updated_by)
     VALUES($1,$2,$3,$4,$5,1,$6,$7,'Read model test',current_date,$6,$6,$8,$8) RETURNING id`,
    [randomUUID(), `RM${(seq += 1)}-${Date.now().toString(36).toUpperCase().slice(-7)}`, type, branchId || user.branchId, status, amount, payload, user.id])).rows[0].id;
}
// Isolasi: cabang uji dikosongkan lebih dulu supaya angka data dev tidak ikut.
async function isolate(client, branchId) {
  await client.query('UPDATE business_documents SET is_archived=true WHERE branch_id=$1', [branchId]);
}

dbTest('P1-1: agregat pendapatan, AR, AP, dan order book dihitung benar', async () => rollback(async (client) => {
  const user = await owner(client);
  await isolate(client, user.branchId);
  const thisMonth = (await client.query("SELECT to_char(current_date,'YYYY-MM-DD') d")).rows[0].d;
  const lastMonth = (await client.query("SELECT to_char(current_date-interval '1 month','YYYY-MM-DD') d")).rows[0].d;

  await doc(client, user, { type: 'INVOICE', status: 'APPROVED', amount: 10_000_000, payload: { invoiceDate: thisMonth } });
  await doc(client, user, { type: 'INVOICE', status: 'OVERDUE', amount: 4_000_000, payload: { invoiceDate: thisMonth, paid: 1_000_000 } });
  await doc(client, user, { type: 'INVOICE', status: 'APPROVED', amount: 8_000_000, payload: { invoiceDate: lastMonth } });
  await doc(client, user, { type: 'INVOICE', status: 'DRAFT', amount: 99_000_000, payload: { invoiceDate: thisMonth } });   // draft tidak dihitung
  await doc(client, user, { type: 'SUPPLIER_INVOICE', status: 'APPROVED', amount: 3_000_000 });
  await doc(client, user, { type: 'SUPPLIER_INVOICE', status: 'CLOSED', amount: 7_000_000 });                                // lunas, tidak dihitung
  await doc(client, user, { type: 'SALES_ORDER', status: 'APPROVED', amount: 20_000_000 });
  await doc(client, user, { type: 'WORK_ORDER', status: 'IN_PROCESS', amount: 5_000_000, payload: { progress: 40 } });
  await doc(client, user, { type: 'WORK_ORDER', status: 'IN_PROCESS', amount: 5_000_000, payload: { progress: 60 } });
  await doc(client, user, { type: 'WORK_ORDER', status: 'COMPLETED', amount: 1_000_000 });                                   // selesai, bukan aktif

  const data = await dashboard(client, user);
  assert.equal(data.kpi.revenueMonth, 14_000_000, 'omzet bulan ini = 10jt + 4jt, draft dikecualikan');
  assert.equal(data.kpi.revenuePrevMonth, 8_000_000);
  assert.equal(data.kpi.revenueGrowthPct, 75, '(14-8)/8 = 75%');
  assert.equal(data.kpi.arOverdue, 3_000_000, 'jatuh tempo dikurangi yang sudah dibayar');
  assert.equal(data.kpi.arOverdueCount, 1);
  // AR terbuka TIDAK dibatasi bulan — seluruh invoice yang belum CLOSED,
  // termasuk yang bulan lalu: 10jt + (4jt-1jt) + 8jt.
  assert.equal(data.health.arTotal, 21_000_000);
  assert.equal(data.health.arCount, 3);
  assert.equal(data.health.apCount, 1);
  assert.equal(data.health.apTotal, 3_000_000);
  assert.equal(data.kpi.activeOrders, 3, 'SO + dua WO berjalan');
  assert.equal(data.health.orderBook, 30_000_000);
  assert.equal(data.kpi.inProduction, 2);
  assert.equal(data.kpi.utilizationPct, 50, 'rata-rata progres 40 dan 60');
}));

dbTest('P1-1: seri pendapatan harian bersifat kumulatif dan hanya bulan berjalan', async () => rollback(async (client) => {
  const user = await owner(client);
  await isolate(client, user.branchId);
  const days = (await client.query(`SELECT to_char(date_trunc('month',current_date),'YYYY-MM-DD') d1,
    to_char(date_trunc('month',current_date)+interval '1 day','YYYY-MM-DD') d2,
    to_char(current_date-interval '1 month','YYYY-MM-DD') prev`)).rows[0];

  await doc(client, user, { type: 'INVOICE', status: 'APPROVED', amount: 1_000_000, payload: { invoiceDate: days.d1 } });
  await doc(client, user, { type: 'INVOICE', status: 'APPROVED', amount: 2_000_000, payload: { invoiceDate: days.d2 } });
  await doc(client, user, { type: 'INVOICE', status: 'APPROVED', amount: 500_000, payload: { invoiceDate: days.prev } });

  const { revenueSeries } = await dashboard(client, user);
  assert.equal(revenueSeries.length, 2, 'hanya hari di bulan berjalan yang muncul');
  assert.equal(revenueSeries[0].value, 1_000_000);
  assert.equal(revenueSeries[1].value, 3_000_000, 'nilai kedua wajib kumulatif, bukan harian');
  assert.ok(revenueSeries.every((p) => /^\d{2}$/.test(p.day)));
}));

dbTest('P1-1: daftar pekerjaan aktif dibatasi di SQL, bukan setelah semuanya ditarik', async () => rollback(async (client) => {
  const user = await owner(client);
  await isolate(client, user.branchId);
  for (let i = 0; i < 14; i += 1) {
    await doc(client, user, { type: 'SALES_ORDER', status: 'APPROVED', amount: 1_000_000 * (i + 1) });
  }
  const data = await dashboard(client, user);
  assert.equal(data.activeJobs.length, 8, 'daftar dibatasi delapan');
  assert.equal(data.kpi.activeOrders, 14, 'tetapi hitungannya tetap seluruh pesanan aktif');
  assert.equal(data.health.orderBook, 105_000_000, 'order book menjumlah semuanya, bukan hanya delapan yang tampil');
  for (const job of data.activeJobs) {
    assert.ok(job.documentNumber && job.status, 'bentuk baris tetap sama seperti sebelumnya');
    assert.equal(typeof job.progress, 'number');
  }
}));

dbTest('P1-1: cakupan cabang tetap ditegakkan setelah agregasi pindah ke SQL', async () => rollback(async (client) => {
  const user = await owner(client);
  const other = (await client.query('SELECT id FROM branches WHERE id<>$1 AND active LIMIT 1', [user.branchId])).rows[0];
  assert.ok(other, 'butuh dua cabang');
  await isolate(client, user.branchId);
  await isolate(client, other.id);

  await doc(client, user, { type: 'SALES_ORDER', status: 'APPROVED', amount: 1_000_000 });
  await doc(client, user, { type: 'SALES_ORDER', status: 'APPROVED', amount: 9_000_000, branchId: other.id });

  const branchUser = { ...user, role: 'sales', branchScope: user.branchId };
  const scoped = await dashboard(client, branchUser);
  assert.equal(scoped.health.orderBook, 1_000_000, 'pengguna cabang tidak boleh melihat order book cabang lain');
  const globalView = await dashboard(client, user);
  assert.equal(globalView.health.orderBook, 10_000_000, 'peran lintas cabang melihat keduanya');
}));

test('P1-1: dashboard tidak lagi menarik seluruh baris dokumen', () => {
  // Penjaga regresi: pola lama `SELECT * FROM business_documents` menarik
  // payload jsonb setiap dokumen hanya untuk menghasilkan belasan angka.
  const source = require('node:fs').readFileSync('backend/routes/workspace.js', 'utf8');
  assert.ok(!/SELECT \* FROM business_documents/.test(source),
    'dashboard wajib mengagregasi di database, bukan menarik seluruh baris');
  assert.ok(/LIMIT 8/.test(source), 'daftar pekerjaan aktif wajib dibatasi di SQL');
});

dbTest('P1-1: indeks parsial pendukung dashboard terpasang', async () => rollback(async (client) => {
  const rows = (await client.query(`SELECT indexname,indexdef FROM pg_indexes
    WHERE tablename='business_documents' AND indexname LIKE 'ix_documents_dashboard%' ORDER BY indexname`)).rows;
  assert.equal(rows.length, 3, 'tiga indeks dashboard wajib ada');
  for (const r of rows) {
    assert.match(r.indexdef, /WHERE /, `${r.indexname} wajib parsial agar tetap kecil saat tabel tumbuh`);
    assert.match(r.indexdef, /is_archived = false/);
  }
}));
