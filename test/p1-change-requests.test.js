'use strict';
// P1-2 — Change Request engine. Yang diuji: kolom berdampak uang/pajak TIDAK
// tersimpan langsung, pengusul tidak bisa memutus sendiri, dan persetujuan
// benar-benar menerapkan perubahannya.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const operations = require('../backend/infrastructure/database/repositories/operations');
const changeRequests = require('../backend/infrastructure/database/repositories/change-requests');

const dbTest = process.env.DATABASE_URL ? test : test.skip;
async function rollback(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try { await client.query('BEGIN'); await client.query("SELECT set_config('app.is_system','on',true)"); await fn(client); }
  finally { await client.query('ROLLBACK').catch(() => {}); await client.end(); }
}
async function actors(client) {
  const rows = (await client.query('SELECT id,branch_id FROM app_users WHERE active ORDER BY created_at LIMIT 2')).rows;
  assert.ok(rows.length === 2, 'butuh dua pengguna berbeda');
  return {
    maker: { id: rows[0].id, role: 'sales', branchId: rows[0].branch_id, branchScope: '*', displayName: 'Maker' },
    checker: { id: rows[1].id, role: 'owner', branchId: rows[1].branch_id, branchScope: '*', displayName: 'Checker' }
  };
}
let seq = 0;
async function customer(client) {
  return (await client.query(
    `INSERT INTO customers(id,code,name,legal_name,customer_type,ppn_status,payment_term_days,currency,risk_rating,collection_status,credit_limit_amount,active)
     VALUES($1,$2,'Pelanggan CR','PT CR','COMPANY','PKP',30,'IDR','LOW','NORMAL',10000000,true) RETURNING *`,
    [randomUUID(), `CR${(seq += 1)}${Date.now().toString(36).toUpperCase().slice(-6)}`])).rows[0];
}
const reload = (client, id) => client.query('SELECT * FROM customers WHERE id=$1', [id]).then((r) => r.rows[0]);

dbTest('P1-2: batas kredit tidak berubah sebelum disetujui orang lain', async () => rollback(async (client) => {
  const { maker, checker } = await actors(client);
  const cust = await customer(client);

  const saved = await operations.updateMaster(client, 'customers', cust.id, {
    creditLimitAmount: 900_000_000, city: 'Surabaya',
    changeReason: 'Kenaikan plafon sesuai hasil review kredit triwulan.'
  }, maker);

  // Kolom biasa langsung berlaku; kolom terkendali tertahan.
  assert.equal((await reload(client, cust.id)).city, 'Surabaya', 'kolom biasa tetap tersimpan seketika');
  assert.equal(Number((await reload(client, cust.id)).credit_limit_amount), 10_000_000, 'batas kredit BELUM boleh berubah');
  assert.deepEqual(saved.pendingChanges.fields, ['credit_limit_amount']);

  const queue = await changeRequests.list(client, checker);
  const request = queue.items.find((i) => i.id === saved.pendingChanges.requestId);
  assert.ok(request, 'usulan wajib muncul di antrean');
  assert.equal(request.changes.credit_limit_amount.from, '10000000.00');
  assert.equal(request.changes.credit_limit_amount.to, 900_000_000);

  // Pengusul tidak boleh memutuskan usulannya sendiri.
  await assert.rejects(() => changeRequests.decide(client, { requestId: request.id, decision: 'APPROVED', user: maker }),
    (e) => ['SOD_CONFLICT', 'PERMISSION_DENIED'].includes(e.code));

  const decided = await changeRequests.decide(client, { requestId: request.id, decision: 'APPROVED', reason: 'Disetujui direksi.', user: checker });
  assert.equal(decided.status, 'APPROVED');
  assert.deepEqual(decided.applied, ['credit_limit_amount']);
  assert.equal(Number((await reload(client, cust.id)).credit_limit_amount), 900_000_000, 'persetujuan wajib menerapkan perubahannya');
}));

dbTest('P1-2: penolakan tidak mengubah apa pun dan wajib beralasan', async () => rollback(async (client) => {
  const { maker, checker } = await actors(client);
  const cust = await customer(client);
  const saved = await operations.updateMaster(client, 'customers', cust.id,
    { paymentTermDays: 180, changeReason: 'Permintaan perpanjangan termin dari pelanggan.' }, maker);
  const id = saved.pendingChanges.requestId;

  await assert.rejects(() => changeRequests.decide(client, { requestId: id, decision: 'REJECTED', user: checker }),
    (e) => e.code === 'REASON_REQUIRED', 'penolakan tanpa alasan wajib ditolak');

  const decided = await changeRequests.decide(client, { requestId: id, decision: 'REJECTED', reason: 'Termin 180 hari melampaui kebijakan.', user: checker });
  assert.equal(decided.status, 'REJECTED');
  assert.equal(decided.applied, null);
  assert.equal(Number((await reload(client, cust.id)).payment_term_days), 30, 'termin wajib tetap seperti semula');

  // Usulan yang sudah diputus tidak dapat diputus ulang.
  await assert.rejects(() => changeRequests.decide(client, { requestId: id, decision: 'APPROVED', user: checker }),
    (e) => e.code === 'STATUS_INVALID');
}));

dbTest('P1-2: usulan baru menggantikan usulan lama, bukan menumpuk', async () => rollback(async (client) => {
  const { maker, checker } = await actors(client);
  const cust = await customer(client);
  const first = await operations.updateMaster(client, 'customers', cust.id,
    { creditLimitAmount: 50_000_000, changeReason: 'Usulan pertama dari tim sales.' }, maker);
  const second = await operations.updateMaster(client, 'customers', cust.id,
    { creditLimitAmount: 75_000_000, changeReason: 'Koreksi angka setelah verifikasi ulang.' }, maker);
  assert.equal(second.pendingChanges.supersededCount, 1, 'usulan sebelumnya wajib ditandai superseded');

  const pending = (await changeRequests.list(client, checker)).items.filter((i) => i.entityId === cust.id);
  assert.equal(pending.length, 1, 'hanya satu usulan terbuka per entitas');
  assert.equal(pending[0].id, second.pendingChanges.requestId);

  // Usulan yang sudah superseded tidak dapat disetujui diam-diam.
  await assert.rejects(() => changeRequests.decide(client, { requestId: first.pendingChanges.requestId, decision: 'APPROVED', user: checker }),
    (e) => e.code === 'STATUS_INVALID');
}));

dbTest('P1-2: perubahan tanpa selisih nilai tidak melahirkan usulan kosong', async () => rollback(async (client) => {
  const { maker } = await actors(client);
  const cust = await customer(client);
  // Menyimpan ulang nilai yang sama persis — tidak ada yang perlu disetujui.
  const saved = await operations.updateMaster(client, 'customers', cust.id,
    { creditLimitAmount: cust.credit_limit_amount, city: 'Bandung' }, maker);
  assert.equal(saved.pendingChanges, undefined, 'nilai yang tidak berubah tidak boleh menjadi usulan');
  assert.equal((await reload(client, cust.id)).city, 'Bandung');
}));

dbTest('P1-2: alasan wajib dan cukup panjang saat kolom terkendali diubah', async () => rollback(async (client) => {
  const { maker } = await actors(client);
  const cust = await customer(client);
  for (const reason of [undefined, '', 'ok']) {
    await assert.rejects(
      () => operations.updateMaster(client, 'customers', cust.id, { creditLimitAmount: 123_456_789, changeReason: reason }, maker),
      (e) => e.code === 'REASON_REQUIRED', `alasan '${reason}' seharusnya ditolak`);
  }
  assert.equal(Number((await reload(client, cust.id)).credit_limit_amount), 10_000_000);
}));

dbTest('P1-2: batas kredit yang diedit adalah batas yang DITEGAKKAN, bukan kolom bayangan', async () => rollback(async (client) => {
  // Dulu ada dua kolom: credit_limit (diisi seed, ditampilkan UI, diedit lewat
  // API master) dan credit_limit_amount (satu-satunya yang dibaca mesin kredit,
  // dan 0 berarti TANPA batas). Semua pelanggan nyata punya _amount = 0,
  // sehingga kontrol kredit tidak pernah aktif walau layar memperlihatkan
  // batas satu miliar.
  const procurement = require('../backend/infrastructure/database/repositories/procurement');
  const { maker, checker } = await actors(client);
  const cust = await customer(client);

  const columns = (await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='customers' AND column_name LIKE 'credit_limit%'`)).rows.map((r) => r.column_name);
  assert.deepEqual(columns, ['credit_limit_amount'], 'hanya boleh ada SATU kolom batas kredit');

  // Yang disetujui lewat change request langsung menjadi batas yang ditegakkan.
  const saved = await operations.updateMaster(client, 'customers', cust.id,
    { creditLimitAmount: 25_000_000, changeReason: 'Penetapan plafon awal setelah verifikasi.' }, maker);
  await changeRequests.decide(client, { requestId: saved.pendingChanges.requestId, decision: 'APPROVED', reason: 'Sesuai kebijakan.', user: checker });

  const status = await procurement.creditStatus(client, cust.id);
  assert.equal(status.creditLimit, 25_000_000, 'mesin kredit wajib membaca batas yang baru disetujui');
}));

dbTest('P0.5: payload Change Request yang dimanipulasi tidak dapat menulis kolom arbitrer', async () => rollback(async (client) => {
  const { maker, checker } = await actors(client);
  const cust = await customer(client);
  const saved = await operations.updateMaster(client, 'customers', cust.id,
    { creditLimitAmount: 20_000_000, changeReason: 'Pengujian allowlist perubahan sensitif.' }, maker);
  await client.query(`UPDATE change_requests SET changes=$2 WHERE id=$1`, [saved.pendingChanges.requestId,
    { name: { from: cust.name, to: 'Nama hasil injeksi' } }]);
  await assert.rejects(() => changeRequests.decide(client, { requestId: saved.pendingChanges.requestId, decision: 'APPROVED', user: checker }),
    (e) => e.code === 'VALIDATION_ERROR' && /tidak diizinkan/.test(String(e.detail || e.message)));
  assert.equal((await reload(client, cust.id)).name, cust.name);
}));

dbTest('P0.5: persetujuan stale ditolak agar tidak menimpa perubahan yang lebih baru', async () => rollback(async (client) => {
  const { maker, checker } = await actors(client);
  const cust = await customer(client);
  const saved = await operations.updateMaster(client, 'customers', cust.id,
    { creditLimitAmount: 30_000_000, changeReason: 'Pengujian baseline perubahan master.' }, maker);
  await client.query('UPDATE customers SET credit_limit_amount=15000000 WHERE id=$1', [cust.id]);
  await assert.rejects(() => changeRequests.decide(client, { requestId: saved.pendingChanges.requestId, decision: 'APPROVED', user: checker }),
    (e) => e.code === 'DOCUMENT_CONFLICT' && e.extra.staleFields.includes('credit_limit_amount'));
  assert.equal(Number((await reload(client, cust.id)).credit_limit_amount), 15_000_000);
}));

test('P0.5: entity dan kolom Change Request memakai allowlist eksplisit', () => {
  assert.throws(() => changeRequests.assertValidChangeSet('app_users', { role: { from: 'sales', to: 'owner' } }),
    (e) => e.code === 'VALIDATION_ERROR');
  assert.throws(() => changeRequests.assertValidChangeSet('customers', { name: { from: 'A', to: 'B' } }),
    (e) => e.code === 'VALIDATION_ERROR');
});

test('P1-2: daftar kolom terkendali sempit dan setiap kolom menyertakan alasannya', () => {
  const controlled = changeRequests.CONTROLLED_FIELDS;
  assert.ok(controlled.customers.credit_limit_amount, 'batas kredit wajib terkendali');
  assert.ok(controlled.employees.base_salary, 'gaji pokok wajib terkendali');
  assert.ok(controlled.products.hpp && controlled.products.price, 'HPP dan harga jual wajib terkendali');
  assert.ok(controlled.suppliers.npwp, 'NPWP supplier wajib terkendali');

  // Sengaja SEMPIT: menggovernansi semua kolom akan melumpuhkan kerja harian.
  assert.ok(!changeRequests.isControlled('customers', 'city'), 'alamat tidak perlu persetujuan');
  assert.ok(!changeRequests.isControlled('customers', 'name'), 'nama tidak perlu persetujuan');
  assert.ok(!changeRequests.isControlled('products', 'specification'));

  for (const [entity, fields] of Object.entries(controlled)) {
    for (const [column, why] of Object.entries(fields)) {
      assert.ok(String(why).length > 20, `${entity}.${column} wajib menjelaskan alasan dikendalikan`);
    }
  }
});
