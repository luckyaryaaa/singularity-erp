'use strict';
// P0-Q / P0-R — izin per laporan dan status baca notifikasi per penerima.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const operations = require('../backend/infrastructure/database/repositories/operations');
const reporting = require('../backend/infrastructure/database/repositories/reporting');

const dbTest = process.env.DATABASE_URL ? test : test.skip;
async function rollback(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try { await client.query('BEGIN'); await client.query("SELECT set_config('app.is_system','on',true)"); await fn(client); }
  finally { await client.query('ROLLBACK').catch(() => {}); await client.end(); }
}
async function twoUsers(client, role) {
  const branch = (await client.query('SELECT id FROM branches WHERE active ORDER BY code LIMIT 1')).rows[0];
  const rows = (await client.query('SELECT id FROM app_users WHERE active ORDER BY created_at LIMIT 2')).rows;
  return rows.map((r) => ({ id: r.id, role, branchId: branch.id, branchScope: branch.id, displayName: role }));
}

test('P0-Q: laporan sensitif menuntut izin modulnya, bukan report.export generik', () => {
  const sales = { id: 'x', role: 'sales', branchId: 'b', branchScope: 'b' };
  const hrd = { id: 'y', role: 'hrd', branchId: 'b', branchScope: 'b' };
  const owner = { id: 'z', role: 'owner', branchId: 'b', branchScope: '*' };

  // Role sales memegang report.* — dulu itu cukup untuk mengekspor payroll.
  assert.throws(() => reporting.report('payroll_bpjs', sales),
    (e) => e.code === 'PERMISSION_DENIED' && /payroll\.view/.test(String(e.detail || e.message)),
    'sales tidak boleh mengekspor rekap gaji');
  assert.throws(() => reporting.report('financial_statement', sales),
    (e) => e.code === 'PERMISSION_DENIED', 'sales tidak boleh mengekspor laporan keuangan');

  // Yang memang wewenangnya tetap jalan.
  assert.equal(reporting.report('payroll_bpjs', hrd).key, 'payroll_bpjs');
  assert.equal(reporting.report('sales_customer', sales).key, 'sales_customer');
  assert.equal(reporting.report('financial_statement', owner).key, 'financial_statement');

  // Katalog hanya menawarkan yang boleh dijalankan.
  const salesCatalog = reporting.visibleReports(sales).map((r) => r.key);
  assert.ok(!salesCatalog.includes('payroll_bpjs'));
  assert.ok(salesCatalog.includes('sales_customer'));
  assert.equal(reporting.visibleReports(owner).length, reporting.REPORTS.length);

  // Setiap laporan wajib menyatakan izinnya — tidak boleh ada yang lolos diam-diam.
  for (const r of reporting.REPORTS) assert.ok(r.permission, `laporan ${r.key} tanpa permission`);
});

dbTest('P0-R: notifikasi peran punya status baca per pengguna', async () => rollback(async (client) => {
  const [a, b] = await twoUsers(client, 'finance_manager');
  assert.ok(b && a.id !== b.id, 'butuh dua pengguna berbeda');
  const notif = await operations.notify(client, { role: 'finance_manager', category: 'ACTION_REQUIRED', title: 'Approval pembayaran menunggu', dedupeKey: `p0r-${randomUUID()}` });
  assert.ok(notif.id);

  const before = await operations.unreadCount(client, b);
  assert.ok((await operations.listNotifications(client, a)).some((n) => n.id === notif.id));
  assert.ok((await operations.listNotifications(client, b)).some((n) => n.id === notif.id));

  // A membaca — B TIDAK boleh kehilangan notifikasinya.
  assert.equal(await operations.markRead(client, a, notif.id), true);
  const forA = (await operations.listNotifications(client, a)).find((n) => n.id === notif.id);
  const forB = (await operations.listNotifications(client, b)).find((n) => n.id === notif.id);
  assert.ok(forA.readByMe, 'A tercatat sudah membaca');
  assert.ok(forB && !forB.readByMe, 'B masih melihatnya sebagai belum dibaca');
  assert.equal((await operations.unreadCount(client, b)).unread, before.unread, 'hitungan B tidak boleh berubah karena A membaca');
  assert.ok((await operations.unreadCount(client, b)).actionRequired >= 1, 'ACTION_REQUIRED dihitung terpisah');
}));

dbTest('P0-R: notifikasi ber-cabang tidak bocor ke cabang lain', async () => rollback(async (client) => {
  const [user] = await twoUsers(client, 'warehouse');
  const foreign = (await client.query('SELECT id FROM branches WHERE id<>$1 AND active LIMIT 1', [user.branchId])).rows[0];
  assert.ok(foreign, 'butuh minimal dua cabang');

  const mine = await operations.notify(client, { role: 'warehouse', category: 'WARNING', title: 'Stok kritis cabang saya', branchId: user.branchId, dedupeKey: `p0r-mine-${randomUUID()}` });
  const theirs = await operations.notify(client, { role: 'warehouse', category: 'WARNING', title: 'Stok kritis cabang lain', branchId: foreign.id, dedupeKey: `p0r-theirs-${randomUUID()}` });
  const company = await operations.notify(client, { role: 'warehouse', category: 'INFORMATION', title: 'Pengumuman perusahaan', dedupeKey: `p0r-all-${randomUUID()}` });

  const visible = (await operations.listNotifications(client, user)).map((n) => n.id);
  assert.ok(visible.includes(mine.id), 'notifikasi cabang sendiri terlihat');
  assert.ok(visible.includes(company.id), 'pengumuman tanpa cabang terlihat semua');
  assert.ok(!visible.includes(theirs.id), 'notifikasi cabang lain TIDAK boleh terlihat');

  // Menandai baca notifikasi cabang lain juga ditolak.
  assert.equal(await operations.markRead(client, user, theirs.id), false);

  // Cakupan lintas cabang memperluas CABANG, bukan peran: pengguna warehouse
  // dengan branchScope '*' melihat notifikasi warehouse seluruh cabang.
  const supervisor = { ...user, branchScope: '*' };
  const all = (await operations.listNotifications(client, supervisor)).map((n) => n.id);
  assert.ok(all.includes(theirs.id), 'pengguna lintas cabang melihat seluruh cabang');

  // Peran lain tetap tidak melihat notifikasi yang bukan untuk perannya.
  const auditor = { ...user, role: 'auditor', branchScope: '*' };
  const otherRole = (await operations.listNotifications(client, auditor)).map((n) => n.id);
  assert.ok(!otherRole.includes(mine.id), 'notifikasi bertarget warehouse tidak bocor ke peran lain');
}));

dbTest('P0-R: tandai semua dibaca hanya menyentuh notifikasi milik pengguna itu', async () => rollback(async (client) => {
  const [a, b] = await twoUsers(client, 'finance_manager');
  const notif = await operations.notify(client, { role: 'finance_manager', category: 'ACTION_REQUIRED', title: 'Tagihan menunggu', dedupeKey: `p0r-all-${randomUUID()}` });
  await operations.markAllRead(client, a);
  assert.equal((await operations.unreadCount(client, a)).unread, 0);
  const forB = (await operations.listNotifications(client, b)).find((n) => n.id === notif.id);
  assert.ok(forB && !forB.readByMe, 'markAllRead milik A tidak boleh menghapus antrean B');
}));
