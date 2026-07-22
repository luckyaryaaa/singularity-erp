'use strict';
// P1-3 — workbench struktur organisasi. Sebelumnya business unit, cabang,
// departemen, cost center, profit center, plant, dan gudang HANYA lahir dari
// seed migrasi: tidak ada satu pun jalur API untuk membuatnya, sehingga membuka
// cabang baru menuntut developer menjalankan SQL langsung ke produksi.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const orgStructure = require('../backend/infrastructure/database/repositories/org-structure');

const dbTest = process.env.DATABASE_URL ? test : test.skip;
async function rollback(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try { await client.query('BEGIN'); await client.query("SELECT set_config('app.is_system','on',true)"); await fn(client); }
  finally { await client.query('ROLLBACK').catch(() => {}); await client.end(); }
}
async function context(client) {
  const row = (await client.query(`SELECT u.id,u.branch_id,b.legal_entity_id FROM app_users u JOIN branches b ON b.id=u.branch_id
    WHERE u.role='owner' AND b.legal_entity_id IS NOT NULL LIMIT 1`)).rows[0];
  return {
    user: { id: row.id, role: 'owner', branchId: row.branch_id, branchScope: '*', displayName: 'Owner' },
    legalEntityId: row.legal_entity_id, branchId: row.branch_id
  };
}
let seq = 0;
const code = (prefix) => `${prefix}${(seq += 1)}${Date.now().toString(36).toUpperCase().slice(-4)}`;
const opts = (ctx) => ({ legalEntityId: ctx.legalEntityId, requestId: randomUUID() });

dbTest('P1-3: cabang baru dapat dibuat lewat aplikasi, bukan SQL langsung', async () => rollback(async (client) => {
  const ctx = await context(client);
  const created = await orgStructure.create(client, ctx.user, 'branches',
    { code: code('CAB'), name: 'Cabang Surabaya', reason: 'Pembukaan cabang baru sesuai keputusan direksi.' }, opts(ctx));
  assert.match(created.code, /^CAB/);
  assert.equal(created.active, true);

  const listed = await orgStructure.list(client, ctx.user, 'branches', { legalEntityId: ctx.legalEntityId });
  assert.ok(listed.items.some((b) => b.id === created.id), 'cabang baru wajib muncul di daftar');

  // Jejak audit wajib ada — struktur organisasi berdampak luas.
  const audit = (await client.query(
    `SELECT action,reason FROM audit_logs WHERE entity_id=$1 AND module='organization' ORDER BY occurred_at DESC LIMIT 1`, [created.id])).rows[0];
  assert.equal(audit.action, 'CREATE');
  assert.match(audit.reason, /direksi/);
}));

dbTest('P1-3: alasan wajib dan kode divalidasi', async () => rollback(async (client) => {
  const ctx = await context(client);
  for (const reason of [undefined, '', 'ok']) {
    await assert.rejects(() => orgStructure.create(client, ctx.user, 'departments',
      { code: code('DEP'), name: 'Departemen uji', reason }, opts(ctx)),
    (e) => e.code === 'REASON_REQUIRED', `alasan '${reason}' seharusnya ditolak`);
  }
  for (const bad of ['a', 'kode kecil', 'TERLALU-PANJANG-SEKALI-SAMPAI-LEBIH', 'X@Y']) {
    await assert.rejects(() => orgStructure.create(client, ctx.user, 'departments',
      { code: bad, name: 'Departemen uji', reason: 'Penataan struktur departemen baru.' }, opts(ctx)),
    (e) => e.code === 'VALIDATION_ERROR', `kode '${bad}' seharusnya ditolak`);
  }
  // Kode dinormalkan menjadi huruf besar.
  const ok = await orgStructure.create(client, ctx.user, 'profit-centers',
    { code: 'pc-uji1', name: 'Profit center uji', reason: 'Pemisahan pelaporan laba segmen.' }, opts(ctx));
  assert.equal(ok.code, 'PC-UJI1');
}));

dbTest('P1-3: induk wajib berada di legal entity yang sama', async () => rollback(async (client) => {
  const ctx = await context(client);
  await assert.rejects(() => orgStructure.create(client, ctx.user, 'plants',
    { code: code('PLT'), name: 'Plant uji', branchId: randomUUID(), reason: 'Penambahan plant produksi baru.' }, opts(ctx)),
  (e) => e.code === 'VALIDATION_ERROR' && /Induk/.test(String(e.detail || e.message)),
  'cabang yang tidak ada wajib ditolak');

  // Induk yang sah diterima.
  const plant = await orgStructure.create(client, ctx.user, 'plants',
    { code: code('PLT'), name: 'Plant Cikarang', branchId: ctx.branchId, plantType: 'FACTORY', reason: 'Penambahan plant produksi baru.' }, opts(ctx));
  assert.equal(plant.plantType, 'FACTORY');

  // Gudang boleh menggantung pada plant tersebut.
  const wh = await orgStructure.create(client, ctx.user, 'warehouses',
    { code: code('WH'), name: 'Gudang bahan baku', branchId: ctx.branchId, plantId: plant.id, warehouseType: 'RAW_MATERIAL', reason: 'Pemisahan gudang bahan baku.' }, opts(ctx));
  assert.equal(wh.plantId, plant.id);
}));

dbTest('P1-3: kode tidak dapat diubah karena nomor dokumen memuatnya', async () => rollback(async (client) => {
  const ctx = await context(client);
  const dept = await orgStructure.create(client, ctx.user, 'departments',
    { code: code('DEP'), name: 'Departemen awal', reason: 'Pembentukan departemen baru.' }, opts(ctx));

  await assert.rejects(() => orgStructure.update(client, ctx.user, 'departments', dept.id,
    { code: 'DEP-BARU', reason: 'Percobaan mengubah kode.' }, opts(ctx)),
  (e) => e.code === 'VALIDATION_ERROR' && /tidak dapat diubah/.test(String(e.detail || e.message)));

  // Nama tetap boleh diubah.
  const renamed = await orgStructure.update(client, ctx.user, 'departments', dept.id,
    { name: 'Departemen Teknik', reason: 'Penyesuaian nama sesuai SK organisasi.' }, opts(ctx));
  assert.equal(renamed.name, 'Departemen Teknik');
  assert.equal(renamed.code, dept.code);
}));

dbTest('P1-3: unit yang masih dipakai tidak dapat dinonaktifkan', async () => rollback(async (client) => {
  const ctx = await context(client);
  // Cabang milik pengguna pasti dirujuk app_users, jadi tidak boleh dimatikan.
  await assert.rejects(() => orgStructure.update(client, ctx.user, 'branches', ctx.branchId,
    { active: false, reason: 'Percobaan menutup cabang yang masih dipakai.' }, opts(ctx)),
  (e) => e.code === 'DOCUMENT_CONFLICT' && e.extra.count > 0,
  'menonaktifkan cabang yang masih dirujuk wajib ditolak');

  // Unit yang belum dirujuk siapa pun boleh dinonaktifkan.
  const pc = await orgStructure.create(client, ctx.user, 'profit-centers',
    { code: code('PC'), name: 'Profit center sementara', reason: 'Uji coba segmen pelaporan.' }, opts(ctx));
  const closed = await orgStructure.update(client, ctx.user, 'profit-centers', pc.id,
    { active: false, reason: 'Segmen tidak jadi dipakai.' }, opts(ctx));
  assert.equal(closed.active, false);
}));

dbTest('P1-3: struktur tidak dapat dibuat atau diubah tanpa izin organisasi', async () => rollback(async (client) => {
  const ctx = await context(client);
  const outsider = { ...ctx.user, role: 'warehouse' };   // tidak punya organization.create/edit
  await assert.rejects(() => orgStructure.create(client, outsider, 'branches',
    { code: code('CAB'), name: 'Cabang liar', reason: 'Percobaan tanpa kewenangan.' }, opts(ctx)),
  (e) => e.code === 'PERMISSION_DENIED');

  const pc = await orgStructure.create(client, ctx.user, 'profit-centers',
    { code: code('PC'), name: 'Profit center uji izin', reason: 'Persiapan pengujian kewenangan.' }, opts(ctx));
  await assert.rejects(() => orgStructure.update(client, outsider, 'profit-centers', pc.id,
    { name: 'Diubah tanpa izin', reason: 'Percobaan tanpa kewenangan.' }, opts(ctx)),
  (e) => e.code === 'PERMISSION_DENIED');
}));

test('P1-3: setiap tipe struktur menyatakan rujukan yang menghalangi penonaktifan', () => {
  for (const [node, spec] of Object.entries(orgStructure.NODES)) {
    assert.ok(spec.table && spec.fields.length && spec.required.length, `${node} wajib lengkap`);
    assert.ok(Array.isArray(spec.references) && spec.references.length,
      `${node} wajib menyatakan tabel perujuk supaya penonaktifan tidak menggantung data`);
    for (const ref of spec.references) assert.ok(ref.table && ref.column && ref.label, `${node}: rujukan tidak lengkap`);
  }
  assert.throws(() => orgStructure.specFor('tidak-ada'), (e) => e.code === 'RESOURCE_NOT_FOUND');
});
