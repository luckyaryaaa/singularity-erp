'use strict';
// Wave 10 — CAPA dan kalibrasi alat ukur.
//
// NCR selama ini hanya sebuah NOMOR pada qc_inspections dengan dua kolom teks
// bebas yang boleh dibiarkan kosong selamanya: tidak ada penanggung jawab,
// tenggat, verifikasi efektivitas, maupun penutupan. Kalibrasi alat ukur tidak
// ada sama sekali — untuk fabrikasi baja itu temuan audit ISO 9001 tersendiri.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const runtime = require('../backend/infrastructure/database/repositories/runtime');
const production = require('../backend/infrastructure/database/repositories/production');
const capa = require('../backend/infrastructure/database/repositories/quality-capa');
const businessDate = require('../backend/core/business-date');

const dbTest = process.env.DATABASE_URL ? test : test.skip;
async function rollback(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try { await client.query('BEGIN'); await client.query("SELECT set_config('app.is_system','on',true)"); await fn(client); }
  finally { await client.query('ROLLBACK').catch(() => {}); await client.end(); }
}
async function actors(client) {
  const rows = (await client.query(`SELECT u.id,u.branch_id FROM app_users u JOIN branches b ON b.id=u.branch_id
    WHERE u.active AND b.legal_entity_id IS NOT NULL ORDER BY u.created_at LIMIT 2`)).rows;
  assert.equal(rows.length, 2, 'butuh dua pengguna berbeda');
  return {
    inspector: { id: rows[0].id, role: 'production', branchId: rows[0].branch_id, branchScope: '*', displayName: 'Inspektor' },
    manager: { id: rows[1].id, role: 'owner', branchId: rows[0].branch_id, branchScope: '*', displayName: 'Manajer' }
  };
}
let seq = 0;
const tag = (p) => `${p}${(seq += 1)}${Date.now().toString(36).toUpperCase().slice(-5)}`;
const today = () => businessDate.today();

async function instrument(client, user, intervalDays = 365) {
  return capa.registerInstrument(client, { code: tag('ALT'), name: 'Caliper digital',
    instrumentType: 'CALIPER', calibrationIntervalDays: intervalDays, user, requestId: randomUUID() });
}
async function qcDoc(client, user) {
  return runtime.createDocument(client, { type: 'QC_INSPECTION', user, title: 'QC uji', amount: 0, requestId: randomUUID() });
}

dbTest('Wave 10: alat ukur kedaluwarsa memblokir inspeksi', async () => rollback(async (client) => {
  const { inspector } = await actors(client);
  const alat = await instrument(client, inspector, 30);

  // Belum pernah dikalibrasi — hasil ukurnya tidak dapat dipertanggungjawabkan.
  await assert.rejects(() => capa.assertInstrumentUsable(client, alat.id, { branchId: inspector.branchId }),
    (e) => e.code === 'STATUS_INVALID' && /belum pernah dikalibrasi/.test(String(e.detail || e.message)));

  // Kalibrasi kedaluwarsa (dilakukan 60 hari lalu, interval 30 hari).
  await capa.recordCalibration(client, { instrumentId: alat.id, calibratedOn: businessDate.addDays(today(), -60),
    result: 'PASS', certificateNumber: 'CAL-001', user: inspector, requestId: randomUUID() });
  await assert.rejects(() => capa.assertInstrumentUsable(client, alat.id, { branchId: inspector.branchId }),
    (e) => e.code === 'STATUS_INVALID' && /kedaluwarsa/.test(String(e.detail || e.message)) && e.extra.instrumentCode === alat.code);

  // Setelah dikalibrasi ulang hari ini, alatnya sah dipakai.
  await capa.recordCalibration(client, { instrumentId: alat.id, calibratedOn: today(),
    result: 'PASS', certificateNumber: 'CAL-002', user: inspector, requestId: randomUUID() });
  const usable = await capa.assertInstrumentUsable(client, alat.id, { branchId: inspector.branchId });
  assert.equal(usable.code, alat.code);
}));

dbTest('Wave 10: kalibrasi GAGAL menarik alat dari layanan, bukan memperpanjang masa berlaku', async () => rollback(async (client) => {
  const { inspector } = await actors(client);
  const alat = await instrument(client, inspector, 365);
  await capa.recordCalibration(client, { instrumentId: alat.id, calibratedOn: today(), result: 'PASS', user: inspector, requestId: randomUUID() });
  assert.ok((await capa.assertInstrumentUsable(client, alat.id, {})));

  // Memperlakukan kalibrasi gagal seperti lulus akan menyembunyikan alat rusak
  // di lantai produksi.
  await capa.recordCalibration(client, { instrumentId: alat.id, calibratedOn: today(), result: 'FAIL',
    notes: 'Penyimpangan di luar toleransi.', user: inspector, requestId: randomUUID() });
  await assert.rejects(() => capa.assertInstrumentUsable(client, alat.id, {}),
    (e) => e.code === 'STATUS_INVALID' && /OUT_OF_SERVICE/.test(String(e.detail || e.message)));
}));

dbTest('Wave 10: inspeksi dengan alat kedaluwarsa ditolak di jalur nyata', async () => rollback(async (client) => {
  const { inspector } = await actors(client);
  const alat = await instrument(client, inspector, 30);
  await capa.recordCalibration(client, { instrumentId: alat.id, calibratedOn: businessDate.addDays(today(), -90),
    result: 'PASS', user: inspector, requestId: randomUUID() });
  const qc = await qcDoc(client, inspector);

  await assert.rejects(() => production.recordInspection(client, { qcDocId: qc.id, user: inspector, requestId: randomUUID(),
    inspection: { inspectionType: 'FINAL', sampledQty: 5, passedQty: 5, failedQty: 0, instrumentId: alat.id } }),
  (e) => e.code === 'STATUS_INVALID' && /kedaluwarsa/.test(String(e.detail || e.message)));

  // Tanpa alat, inspeksi tetap boleh dicatat (bertahap, tidak memaksa retrofit).
  const ok = await production.recordInspection(client, { qcDocId: qc.id, user: inspector, requestId: randomUUID(),
    inspection: { inspectionType: 'FINAL', sampledQty: 5, passedQty: 5, failedQty: 0 } });
  assert.equal(ok.result, 'PASS');
}));

dbTest('Wave 10: NCR otomatis melahirkan kasus CAPA yang wajib ditutup', async () => rollback(async (client) => {
  const { inspector, manager } = await actors(client);
  const qc = await qcDoc(client, inspector);

  const failed = await production.recordInspection(client, { qcDocId: qc.id, user: inspector, requestId: randomUUID(),
    inspection: { inspectionType: 'IN_PROCESS', sampledQty: 10, passedQty: 6, failedQty: 4,
      defectCode: 'WELD-POROSITY', rootCause: 'Arus las terlalu tinggi pada stasiun 3.' } });
  assert.ok(failed.ncrNumber, 'kegagalan wajib menerbitkan NCR');
  assert.ok(failed.capaCase, 'NCR wajib melahirkan kasus CAPA');
  assert.equal(failed.capaCase.status, 'OPEN');
  assert.match(failed.capaCase.caseNumber, /^CAPA-/);

  const open = await capa.listCases(client, inspector, { branchId: inspector.branchId });
  assert.ok(open.items.some((c) => c.id === failed.capaCase.id), 'kasus wajib muncul di antrean terbuka');
}));

dbTest('Wave 10: siklus CAPA tidak dapat dilompati dan penutupan menuntut bukti', async () => rollback(async (client) => {
  const { inspector, manager } = await actors(client);
  const kasus = await capa.openCase(client, { branchId: inspector.branchId, title: 'Cacat las berulang',
    description: 'Porositas ditemukan pada tiga batch berturut-turut.', severity: 'CRITICAL',
    user: inspector, requestId: randomUUID() });

  // Melompat langsung ke CLOSED adalah penutupan di atas kertas.
  await assert.rejects(() => capa.advanceCase(client, { id: kasus.id, toStatus: 'CLOSED', user: manager, requestId: randomUUID() }),
    (e) => e.code === 'STATUS_INVALID' && e.extra.from === 'OPEN');

  await capa.advanceCase(client, { id: kasus.id, toStatus: 'ANALYSIS', user: inspector, requestId: randomUUID(),
    payload: { containmentAction: 'Batch terdampak dikarantina dan dipisahkan dari stok siap kirim.' } });

  // Tiap tahap menuntut isi yang relevan.
  await assert.rejects(() => capa.advanceCase(client, { id: kasus.id, toStatus: 'ACTION', user: inspector, requestId: randomUUID(), payload: {} }),
    (e) => e.code === 'VALIDATION_ERROR' && /Akar masalah/.test(String(e.detail || e.message)));
  await capa.advanceCase(client, { id: kasus.id, toStatus: 'ACTION', user: inspector, requestId: randomUUID(),
    payload: { rootCause: 'Parameter arus mesin las tidak diverifikasi setelah perawatan.' } });

  // Tindakan preventif adalah inti CAPA — tanpa itu temuan hanya ditambal.
  await assert.rejects(() => capa.advanceCase(client, { id: kasus.id, toStatus: 'VERIFICATION', user: inspector, requestId: randomUUID(),
    payload: { correctiveAction: 'Ulang pengelasan pada batch terdampak.' } }),
  (e) => e.code === 'VALIDATION_ERROR' && /preventif/.test(String(e.detail || e.message)));
  await capa.advanceCase(client, { id: kasus.id, toStatus: 'VERIFICATION', user: inspector, requestId: randomUUID(),
    payload: { correctiveAction: 'Ulang pengelasan pada batch terdampak.',
      preventiveAction: 'Verifikasi parameter las wajib masuk checklist setelah setiap perawatan mesin.' } });

  // Penerbit tidak boleh menutup kasusnya sendiri.
  await assert.rejects(() => capa.advanceCase(client, { id: kasus.id, toStatus: 'CLOSED', user: inspector, requestId: randomUUID(),
    payload: { effectivenessVerified: true, effectivenessNote: 'Tiga batch berikutnya bersih.' }, reason: 'Selesai.' }),
  (e) => e.code === 'SOD_CONFLICT');

  // Verifikasi yang menyatakan BELUM efektif tidak boleh menutup kasus.
  await assert.rejects(() => capa.advanceCase(client, { id: kasus.id, toStatus: 'CLOSED', user: manager, requestId: randomUUID(),
    payload: { effectivenessVerified: false, effectivenessNote: 'Masih ditemukan porositas.' }, reason: 'Tutup saja.' }),
  (e) => e.code === 'STATUS_INVALID' && /belum efektif/.test(String(e.detail || e.message)));

  const closed = await capa.advanceCase(client, { id: kasus.id, toStatus: 'CLOSED', user: manager, requestId: randomUUID(),
    payload: { effectivenessVerified: true, effectivenessNote: 'Tiga batch berikutnya bersih dari porositas.' },
    reason: 'Tindakan terbukti efektif pada verifikasi lapangan.' });
  assert.equal(closed.status, 'CLOSED');
  assert.equal(closed.effectivenessVerified, true);
  assert.ok(closed.closedAt);

  // Kasus tertutup tidak dapat diputar ulang.
  await assert.rejects(() => capa.advanceCase(client, { id: kasus.id, toStatus: 'ACTION', user: manager, requestId: randomUUID(), payload: {} }),
    (e) => e.code === 'STATUS_INVALID');
}));

dbTest('Wave 10: kasus lewat tenggat ditandai, dan cakupan cabang ditegakkan', async () => rollback(async (client) => {
  const { inspector } = await actors(client);
  const other = (await client.query('SELECT id FROM branches WHERE id<>$1 AND active LIMIT 1', [inspector.branchId])).rows[0];
  await capa.openCase(client, { branchId: inspector.branchId, title: 'Temuan lewat tenggat',
    description: 'Tindakan korektif melewati tanggal yang dijanjikan.',
    dueDate: businessDate.addDays(today(), -5), user: inspector, requestId: randomUUID() });

  const list = await capa.listCases(client, inspector, { branchId: inspector.branchId });
  assert.ok(list.overdueCount >= 1, 'kasus lewat tenggat wajib terhitung');

  const outsider = { ...inspector, branchScope: other.id, branchId: other.id };
  await assert.rejects(() => capa.listCases(client, outsider, { branchId: inspector.branchId }),
    (e) => e.code === 'PERMISSION_DENIED');
  await assert.rejects(() => capa.listInstruments(client, outsider, { branchId: inspector.branchId }),
    (e) => e.code === 'PERMISSION_DENIED');
}));

test('Wave 10: penutupan CAPA ditegakkan database, bukan hanya aplikasi', () => {
  const fs = require('node:fs');
  const up = fs.readFileSync('data/migrations/061_capa_calibration.sql', 'utf8');
  assert.match(up, /closed_by <> raised_by/, 'penerbit tidak boleh menutup sendiri — ditegakkan database');
  assert.match(up, /capa_closure_complete/, 'penutupan wajib membawa akar masalah, tindakan, dan verifikasi');
  assert.match(up, /effectiveness_verified IS NOT NULL/, 'verifikasi efektivitas wajib dinyatakan');
  assert.match(up, /next_due_date > calibrated_on/, 'masa berlaku kalibrasi wajib maju');
  // Siklus lengkap, bukan sekadar buka-tutup.
  for (const s of ['OPEN', 'ANALYSIS', 'ACTION', 'VERIFICATION', 'CLOSED']) assert.ok(up.includes(`'${s}'`), `tahap ${s} wajib ada`);
  assert.deepEqual(capa.FLOW.OPEN, ['ANALYSIS', 'CANCELLED'], 'dari OPEN tidak boleh langsung menutup');
  assert.deepEqual(capa.FLOW.CLOSED, [], 'kasus tertutup tidak dapat diputar ulang');
});
