'use strict';
// B5 — Row Level Security tranche 1. Yang diuji BUKAN "policy terpasang",
// melainkan bahwa baris cabang lain benar-benar tidak terlihat dan tidak dapat
// ditulis oleh koneksi yang membawa konteks cabang berbeda.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');

const dbTest = process.env.DATABASE_URL ? test : test.skip;
const RLS_TABLES = ['business_documents', 'inventory_balances', 'stock_lots', 'notifications'];
// withTransaction memakai pool bersama; tanpa ditutup, proses uji tidak pernah keluar.
test.after(async () => { await require('../backend/infrastructure/database/pool').close(); });

async function session(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try { await client.query('BEGIN'); await fn(client); }
  finally { await client.query('ROLLBACK').catch(() => {}); await client.end(); }
}
const asSystem = (c) => c.query("SELECT set_config('app.is_system','on',true),set_config('app.is_platform','on',true),set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true)");
const asBranch = async (c, branchId) => {
  await c.query("SELECT set_config('app.is_system','off',true)");
  await c.query("SELECT set_config('app.cross_branch','off',true)");
  await c.query("SELECT set_config('app.branch_id',$1,true)", [branchId]);
  // Tenant tetap disetel (MAT #001): yang diuji di sini isolasi CABANG, bukan
  // tenant — tanpa tenant_id, RLS tenant (092) menutup semua baris & merusak
  // uji cabang. Same-tenant, beda cabang → branch_scope yang menyaring.
  await c.query("SELECT set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true)");
};
const asCrossBranch = async (c) => {
  await c.query("SELECT set_config('app.is_system','off',true)");
  await c.query("SELECT set_config('app.cross_branch','on',true)");
  await c.query("SELECT set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true)");
};

dbTest('B5: RLS aktif pada seluruh tabel tranche 1', async () => session(async (client) => {
  await asSystem(client);
  const rows = (await client.query(
    `SELECT c.relname,c.relrowsecurity,
       (SELECT count(*)::int FROM pg_policy p WHERE p.polrelid=c.oid) policies
     FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relname=ANY($1)`, [RLS_TABLES])).rows;
  assert.equal(rows.length, RLS_TABLES.length, 'seluruh tabel tranche 1 wajib ada');
  for (const r of rows) {
    assert.equal(r.relrowsecurity, true, `${r.relname} belum mengaktifkan RLS`);
    assert.ok(r.policies >= 1, `${r.relname} tanpa policy`);
  }
  // Runtime user BUKAN pemilik tabel — kalau pemilik, RLS otomatis dilewati
  // dan seluruh kendali ini tidak berarti apa-apa.
  const bypass = (await client.query(
    `SELECT bool_or(pg_get_userbyid(c.relowner)=current_user) owns, (SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user) bypass
     FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY($1)`, [RLS_TABLES])).rows[0];
  assert.equal(bypass.owns, false, 'runtime user tidak boleh menjadi pemilik tabel ber-RLS');
  assert.equal(bypass.bypass, false, 'runtime user tidak boleh punya BYPASSRLS');
}));

dbTest('B5: dokumen cabang lain tidak terlihat oleh pengguna cabang', async () => session(async (client) => {
  await asSystem(client);
  const branches = (await client.query('SELECT id FROM branches WHERE active ORDER BY code LIMIT 2')).rows;
  assert.equal(branches.length, 2, 'butuh dua cabang');
  const [home, other] = branches.map((b) => b.id);
  const user = (await client.query(`SELECT id FROM app_users WHERE role='owner' LIMIT 1`)).rows[0];

  const mk = async (branchId, number) => (await client.query(
    `INSERT INTO business_documents(id,document_number,document_type,branch_id,status,version,amount,payload,title,exchange_rate_date,functional_amount,reporting_amount,created_by,updated_by)
     VALUES($1,$2,'QUOTATION',$3,'DRAFT',1,1000,'{}','RLS test',current_date,1000,1000,$4,$4) RETURNING id`,
    [randomUUID(), number, branchId, user.id])).rows[0].id;
  const mine = await mk(home, `RLS-H-${Date.now()}`);
  const theirs = await mk(other, `RLS-O-${Date.now()}`);

  await asBranch(client, home);
  const visible = (await client.query('SELECT id FROM business_documents WHERE id=ANY($1::uuid[])', [[mine, theirs]])).rows.map((r) => r.id);
  assert.deepEqual(visible, [mine], 'hanya dokumen cabang sendiri yang boleh terlihat');

  // UPDATE lintas cabang tidak menyentuh apa pun — barisnya memang tak terlihat.
  const touched = await client.query(`UPDATE business_documents SET title='diubah' WHERE id=$1`, [theirs]);
  assert.equal(touched.rowCount, 0, 'baris cabang lain tidak boleh dapat diubah');

  // INSERT ke cabang lain ditolak oleh WITH CHECK. Savepoint dipakai karena
  // statement gagal membatalkan seluruh transaksi di PostgreSQL.
  await client.query('SAVEPOINT rls_probe');
  await assert.rejects(() => client.query(
    `INSERT INTO business_documents(id,document_number,document_type,branch_id,status,version,amount,payload,title,exchange_rate_date,functional_amount,reporting_amount,created_by,updated_by)
     VALUES($1,$2,'QUOTATION',$3,'DRAFT',1,1000,'{}','Selundupan',current_date,1000,1000,$4,$4)`,
    [randomUUID(), `RLS-X-${Date.now()}`, other, user.id]),
  (e) => e.code === '42501', 'menulis ke cabang lain wajib ditolak database');
  await client.query('ROLLBACK TO SAVEPOINT rls_probe');

  // Peran lintas cabang tetap melihat keduanya.
  await asCrossBranch(client);
  const all = (await client.query('SELECT id FROM business_documents WHERE id=ANY($1::uuid[])', [[mine, theirs]])).rows.map((r) => r.id);
  assert.equal(all.length, 2, 'peran lintas cabang wajib melihat seluruh cabang');
}));

dbTest('B5: tanpa konteks sama sekali, policy menutup akses (gagal tertutup)', async () => session(async (client) => {
  // Sengaja TIDAK menyetel app.is_system / app.branch_id / app.cross_branch.
  // Koneksi mentah yang dicuri tidak boleh langsung melihat seluruh data.
  const rows = (await client.query('SELECT count(*)::int n FROM business_documents')).rows[0];
  assert.equal(rows.n, 0, 'tanpa konteks, tidak satu baris pun boleh terbaca');
  const balances = (await client.query('SELECT count(*)::int n FROM inventory_balances')).rows[0];
  assert.equal(balances.n, 0, 'saldo persediaan juga tertutup tanpa konteks');
}));

dbTest('B5: konteks tidak menempel pada koneksi setelah transaksi selesai', async () => {
  // SET LOCAL berarti nilainya hilang saat transaksi berakhir; kalau tidak,
  // koneksi yang kembali ke pool akan membawa cakupan pengguna sebelumnya.
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.is_system','on',true),set_config('app.is_platform','on',true),set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true)");
    assert.equal((await client.query("SELECT current_setting('app.is_system',true) v")).rows[0].v, 'on');
    await client.query('ROLLBACK');
    const after = (await client.query("SELECT current_setting('app.is_system',true) v")).rows[0].v;
    assert.ok(after === null || after === '' , `konteks bocor ke transaksi berikutnya: ${after}`);
  } finally { await client.end(); }
});

dbTest('B5: withTransaction memasang konteks dari pengguna pemanggil', async () => {
  const { withTransaction } = require('../backend/infrastructure/database/transaction');
  const branch = await withTransaction(async (c) => (await c.query('SELECT id FROM branches WHERE active LIMIT 1')).rows[0].id);

  const scoped = await withTransaction(async (c) => (await c.query(
    `SELECT current_setting('app.branch_id',true) branch,current_setting('app.cross_branch',true) cross,current_setting('app.is_system',true) system`)).rows[0],
  { user: { id: randomUUID(), role: 'sales', branchId: branch, branchScope: branch } });
  assert.equal(scoped.branch, branch);
  assert.equal(scoped.cross, 'off');
  assert.equal(scoped.system, 'off');

  const wide = await withTransaction(async (c) => (await c.query(`SELECT current_setting('app.cross_branch',true) cross`)).rows[0],
    { user: { id: randomUUID(), role: 'owner', branchId: branch, branchScope: '*' } });
  assert.equal(wide.cross, 'on', 'peran lintas cabang wajib ditandai');

  const system = await withTransaction(async (c) => (await c.query(`SELECT current_setting('app.is_system',true) system`)).rows[0]);
  assert.equal(system.system, 'on', 'transaksi tanpa pengguna berjalan sebagai sistem');
});

// ── G1 tranche: cakupan tambahan untuk perbaikan setRlsContext(resolved.user) ──
// Skenario g bersifat murni (tanpa DB) sehingga selalu berjalan; h/i/j menuntut
// DATABASE_URL (dbTest) karena menguji perilaku transaction-local sungguhan.

test('G1(g): pengguna cabang tidak dapat eskalasi lewat branchId cabang lain (app-layer)', () => {
  const { assertBranchAccess, resolveBranch, hasGlobalScope, queryScope } = require('../backend/core/data-scope');
  const branchUser = { id: 'u-a', role: 'sales', branchId: 'branch-A' };
  const globalUser = { id: 'u-g', role: 'owner', branchId: 'branch-A', branchScope: '*' };
  const denied = (e) => e.code === 'PERMISSION_DENIED';
  // Menembak cabang lain lewat request → ditolak, tidak boleh naik scope.
  assert.throws(() => assertBranchAccess(branchUser, 'branch-B'), denied, 'akses cabang lain wajib ditolak');
  assert.throws(() => resolveBranch(branchUser, 'branch-B'), denied, 'resolveBranch tidak boleh menaikkan scope dari request');
  assert.equal(resolveBranch(branchUser, undefined), 'branch-A', 'tanpa branchId jatuh ke cabang akun');
  assert.equal(queryScope(branchUser).global, false, 'pengguna cabang bukan global');
  assert.equal(queryScope(branchUser).branchId, 'branch-A');
  // Pengguna global sah boleh memilih cabang mana pun.
  assert.equal(hasGlobalScope(globalUser), true);
  assert.equal(resolveBranch(globalUser, 'branch-B'), 'branch-B', 'pengguna global boleh memilih cabang');
});

dbTest('G1(h): koneksi pool bekas pengguna sistem/global tidak bocor ke pengguna normal berikutnya', async () => {
  const { withTransaction } = require('../backend/infrastructure/database/transaction');
  const branch = await withTransaction(async (c) => (await c.query('SELECT id FROM branches WHERE active LIMIT 1')).rows[0].id);
  // Transaksi sistem lebih dulu memakai pool (is_system=on).
  const sys = await withTransaction(async (c) => (await c.query("SELECT current_setting('app.is_system',true) s")).rows[0].s);
  assert.equal(sys, 'on');
  // Transaksi pengguna cabang berikutnya (koneksi yang sama dari pool) WAJIB bersih.
  const scoped = await withTransaction(async (c) => (await c.query(
    "SELECT current_setting('app.is_system',true) sys,current_setting('app.cross_branch',true) x,current_setting('app.branch_id',true) b")).rows[0],
  { user: { id: randomUUID(), role: 'sales', branchId: branch, branchScope: branch } });
  assert.equal(scoped.sys, 'off', 'is_system bocor dari transaksi sistem sebelumnya');
  assert.equal(scoped.x, 'off', 'cross_branch bocor dari transaksi sistem sebelumnya');
  assert.equal(scoped.b, branch, 'branch_id wajib milik pengguna sekarang');
});

dbTest('G1(i): konteks RLS tidak bertahan setelah COMMIT', async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.is_system','on',true),set_config('app.is_platform','on',true),set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true)");
    await client.query('COMMIT');
    const after = (await client.query("SELECT current_setting('app.is_system',true) v")).rows[0].v;
    assert.ok(after === null || after === '', `konteks bertahan setelah commit: ${after}`);
  } finally { await client.end(); }
});

dbTest('G1(j): konteks RLS tidak bertahan setelah exception + rollback withTransaction', async () => {
  const { withTransaction } = require('../backend/infrastructure/database/transaction');
  const branch = await withTransaction(async (c) => (await c.query('SELECT id FROM branches WHERE active LIMIT 1')).rows[0].id);
  await assert.rejects(() => withTransaction(async () => { throw new Error('boom'); },
    { user: { id: randomUUID(), role: 'sales', branchId: branch, branchScope: branch } }), /boom/);
  // Transaksi berikutnya tanpa pengguna wajib kembali ke default sistem, bukan mewarisi cabang.
  const next = await withTransaction(async (c) => (await c.query(
    "SELECT current_setting('app.branch_id',true) b,current_setting('app.is_system',true) sys")).rows[0]);
  assert.ok(next.b === null || next.b === '', `branch_id bocor setelah exception: ${next.b}`);
  assert.equal(next.sys, 'on', 'transaksi tanpa pengguna kembali ke mode sistem');
});
