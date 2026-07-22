'use strict';
// CAPA (corrective & preventive action) dan kalibrasi alat ukur.
//
// NCR selama ini hanya sebuah NOMOR pada qc_inspections dengan dua kolom teks
// bebas yang boleh dibiarkan kosong selamanya: tidak ada penanggung jawab,
// tenggat, verifikasi efektivitas, maupun penutupan. Temuan mutu yang tidak
// wajib ditutup bukan sistem mutu — itu hanya catatan.
//
// Kalibrasi alat ukur tidak ada sama sekali. Untuk fabrikasi baja ini bukan
// pelengkap: hasil inspeksi yang diukur dengan alat kedaluwarsa tidak dapat
// dipertanggungjawabkan.
const { randomUUID } = require('node:crypto');
const { AppError } = require('../../../core/errors');
const permissions = require('../../../core/permissions');
const runtime = require('./runtime');
const businessDate = require('../../../core/business-date');

const camel = runtime.camel;
const requireText = (value, message, min = 10) => {
  const text = String(value || '').trim();
  if (text.length < min) throw new AppError('VALIDATION_ERROR', message);
  return text.slice(0, 4000);
};

// Urutan tahapan tidak boleh dilompati: temuan yang langsung "ditutup" tanpa
// analisis dan verifikasi adalah penutupan di atas kertas.
const FLOW = { OPEN: ['ANALYSIS', 'CANCELLED'], ANALYSIS: ['ACTION', 'CANCELLED'],
  ACTION: ['VERIFICATION', 'CANCELLED'], VERIFICATION: ['CLOSED', 'ACTION', 'CANCELLED'],
  CLOSED: [], CANCELLED: [] };

async function nextCaseNumber(client, branchId) {
  const branch = (await client.query('SELECT code FROM branches WHERE id=$1', [branchId])).rows[0];
  const period = businessDate.today().slice(2, 7).replace('-', '');
  const seq = (await client.query(
    `SELECT count(*)+1 n FROM capa_cases WHERE branch_id=$1 AND to_char(raised_at,'YYYY-MM')=$2`,
    [branchId, businessDate.periodOf(businessDate.today())])).rows[0].n;
  return `CAPA-${(branch?.code || 'HO').replace(/[^A-Z0-9]/gi, '').toUpperCase()}-${period}-${String(seq).padStart(3, '0')}`;
}

async function getCase(client, id, user, { forUpdate = false } = {}) {
  const row = (await client.query(
    `SELECT * FROM capa_cases WHERE id=$1${forUpdate ? ' FOR UPDATE' : ''}`, [id])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Kasus CAPA tidak ditemukan.');
  permissions.assertBranchScope(user, row.branch_id, 'Kasus CAPA');
  return row;
}

async function openCase(client, { inspectionId, branchId, title, description, severity, source,
  ownerId, dueDate, user, requestId }) {
  permissions.assertPermission(user, 'quality.create');
  const scope = branchId || user.branchId;
  permissions.assertBranchScope(user, scope, 'Kasus CAPA');
  const row = (await client.query(
    `INSERT INTO capa_cases(id,case_number,inspection_id,branch_id,source,severity,title,description,owner_id,due_date,raised_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [randomUUID(), await nextCaseNumber(client, scope), inspectionId || null, scope,
      String(source || 'NCR').toUpperCase(), String(severity || 'MAJOR').toUpperCase(),
      String(title || 'Temuan mutu').slice(0, 200),
      requireText(description, 'Uraian temuan wajib diisi minimal 10 karakter.'),
      ownerId || null, dueDate ? businessDate.toBusinessDate(dueDate) : null, user.id])).rows[0];
  await runtime.audit(client, { userId: user.id, action: 'CREATE', module: 'quality',
    entityType: 'CAPA_CASE', entityId: row.id, documentNumber: row.case_number,
    newValue: { severity: row.severity, source: row.source, inspectionId }, requestId, branchId: scope });
  return camel(row);
}

// Perpindahan tahapan. Setiap tahap menuntut isi yang relevan — tanpa itu
// siklusnya hanya label yang berpindah.
async function advanceCase(client, { id, toStatus, payload = {}, reason, user, requestId }) {
  permissions.assertPermission(user, 'quality.edit');
  const row = await getCase(client, id, user, { forUpdate: true });
  const target = String(toStatus || '').toUpperCase();
  if (!(FLOW[row.status] || []).includes(target)) {
    throw new AppError('STATUS_INVALID',
      `Kasus ${row.case_number} tidak dapat berpindah dari ${row.status} ke ${target}.`,
      { from: row.status, allowed: FLOW[row.status] || [] });
  }

  const set = { status: target };
  if (target === 'ANALYSIS') {
    set.containment_action = requireText(payload.containmentAction,
      'Tindakan penahanan wajib diisi sebelum masuk tahap analisis.');
  }
  if (target === 'ACTION') {
    set.root_cause = requireText(payload.rootCause, 'Akar masalah wajib diisi sebelum menetapkan tindakan.');
  }
  if (target === 'VERIFICATION') {
    set.corrective_action = requireText(payload.correctiveAction, 'Tindakan korektif wajib diisi.');
    // Tindakan preventif adalah inti CAPA: memperbaiki tanpa mencegah berulang
    // hanya menunda kejadian yang sama.
    set.preventive_action = requireText(payload.preventiveAction,
      'Tindakan preventif wajib diisi — memperbaiki tanpa mencegah berulang tidak menutup temuan.');
  }
  if (target === 'CLOSED') {
    if (String(row.raised_by) === String(user.id)) {
      throw new AppError('SOD_CONFLICT', 'Penerbit temuan tidak boleh menutup kasusnya sendiri.');
    }
    if (payload.effectivenessVerified !== true && payload.effectivenessVerified !== false) {
      throw new AppError('VALIDATION_ERROR', 'Hasil verifikasi efektivitas wajib dinyatakan sebelum penutupan.');
    }
    if (payload.effectivenessVerified === false) {
      throw new AppError('STATUS_INVALID',
        'Verifikasi menyatakan tindakan belum efektif — kasus kembali ke tahap tindakan, bukan ditutup.');
    }
    set.effectiveness_verified = true;
    set.effectiveness_note = requireText(payload.effectivenessNote, 'Catatan verifikasi efektivitas wajib diisi.');
    set.closed_by = user.id;
    set.closure_reason = requireText(reason, 'Alasan penutupan wajib diisi.');
  }
  if (target === 'CANCELLED') set.closure_reason = requireText(reason, 'Alasan pembatalan wajib diisi.');

  const columns = Object.keys(set), values = [id, ...columns.map((c) => set[c])];
  const assignments = columns.map((c, i) => `${c}=$${i + 2}`);
  if (target === 'CLOSED') assignments.push('closed_at=now()');
  assignments.push('updated_at=now()');
  const updated = (await client.query(
    `UPDATE capa_cases SET ${assignments.join(',')} WHERE id=$1 RETURNING *`, values)).rows[0];

  await runtime.audit(client, { userId: user.id, action: 'STATUS_CHANGE', module: 'quality',
    entityType: 'CAPA_CASE', entityId: id, documentNumber: row.case_number, reason,
    oldValue: { status: row.status }, newValue: { status: target }, requestId, branchId: row.branch_id });
  return camel(updated);
}

async function listCases(client, user, { branchId, status = 'OPEN_ONLY' } = {}) {
  permissions.assertPermission(user, 'quality.view');
  const scope = branchId || user.branchId;
  permissions.assertBranchScope(user, scope, 'Kasus CAPA');
  const params = [scope]; let where = 'c.branch_id=$1';
  if (status === 'OPEN_ONLY') where += ` AND c.status NOT IN('CLOSED','CANCELLED')`;
  else if (status && status !== 'ALL') { params.push(String(status).toUpperCase()); where += ` AND c.status=$${params.length}`; }
  const rows = (await client.query(
    `SELECT c.*,i.ncr_number,o.display_name owner_name,
       (c.due_date IS NOT NULL AND c.due_date < current_date AND c.status NOT IN('CLOSED','CANCELLED')) overdue
     FROM capa_cases c LEFT JOIN qc_inspections i ON i.id=c.inspection_id
     LEFT JOIN app_users o ON o.id=c.owner_id
     WHERE ${where} ORDER BY c.raised_at DESC LIMIT 200`, params)).rows;
  return { items: rows.map(camel), overdueCount: rows.filter((r) => r.overdue).length };
}

// ── Kalibrasi alat ukur ─────────────────────────────────────────────────────

async function registerInstrument(client, { code, name, instrumentType, branchId, serialNumber,
  calibrationIntervalDays, user, requestId }) {
  permissions.assertPermission(user, 'quality.create');
  const scope = branchId || user.branchId;
  permissions.assertBranchScope(user, scope, 'Alat ukur');
  const row = (await client.query(
    `INSERT INTO measuring_instruments(id,code,name,instrument_type,branch_id,serial_number,calibration_interval_days,created_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [randomUUID(), String(code || '').trim().toUpperCase(), String(name || '').slice(0, 160),
      String(instrumentType || 'CALIPER').toUpperCase(), scope, serialNumber || null,
      Number(calibrationIntervalDays) || 365, user.id])).rows[0];
  await runtime.audit(client, { userId: user.id, action: 'CREATE', module: 'quality',
    entityType: 'MEASURING_INSTRUMENT', entityId: row.id, documentNumber: row.code,
    newValue: { name: row.name, type: row.instrument_type }, requestId, branchId: scope });
  return camel(row);
}

async function recordCalibration(client, { instrumentId, calibratedOn, result, certificateNumber,
  performedBy, notes, user, requestId }) {
  permissions.assertPermission(user, 'quality.edit');
  const instrument = (await client.query(
    'SELECT * FROM measuring_instruments WHERE id=$1 FOR UPDATE', [instrumentId])).rows[0];
  if (!instrument) throw new AppError('RESOURCE_NOT_FOUND', 'Alat ukur tidak ditemukan.');
  permissions.assertBranchScope(user, instrument.branch_id, 'Alat ukur');
  const on = businessDate.toBusinessDate(calibratedOn || businessDate.today());
  const verdict = String(result || 'PASS').toUpperCase();
  const nextDue = businessDate.addDays(on, instrument.calibration_interval_days);

  const row = (await client.query(
    `INSERT INTO instrument_calibrations(id,instrument_id,calibrated_on,next_due_date,result,certificate_number,performed_by,notes,recorded_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [randomUUID(), instrumentId, on, nextDue, verdict, certificateNumber || null,
      performedBy || null, notes || null, user.id])).rows[0];

  // Kalibrasi yang GAGAL tidak memperpanjang masa berlaku — alatnya justru
  // ditarik dari layanan. Memperlakukannya seperti lulus akan menyembunyikan
  // alat rusak di lantai produksi.
  if (verdict === 'FAIL') {
    await client.query(
      `UPDATE measuring_instruments SET status='OUT_OF_SERVICE',last_calibrated_on=$2,calibration_due_date=$2 WHERE id=$1`,
      [instrumentId, on]);
  } else {
    await client.query(
      `UPDATE measuring_instruments SET status='ACTIVE',last_calibrated_on=$2,calibration_due_date=$3 WHERE id=$1`,
      [instrumentId, on, nextDue]);
  }
  await runtime.audit(client, { userId: user.id, action: 'CALIBRATE', module: 'quality',
    entityType: 'MEASURING_INSTRUMENT', entityId: instrumentId, documentNumber: instrument.code,
    newValue: { calibratedOn: on, nextDueDate: verdict === 'FAIL' ? null : nextDue, result: verdict, certificateNumber },
    requestId, branchId: instrument.branch_id });
  return camel(row);
}

// Dipanggil sebelum inspeksi memakai alat. Hasil ukur dari alat kedaluwarsa
// tidak dapat dipertanggungjawabkan, jadi ditolak — bukan diperingatkan.
async function assertInstrumentUsable(client, instrumentId, { branchId } = {}) {
  if (!instrumentId) return null;
  const row = (await client.query('SELECT * FROM measuring_instruments WHERE id=$1', [instrumentId])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Alat ukur tidak ditemukan.');
  if (branchId && String(row.branch_id) !== String(branchId)) {
    throw new AppError('VALIDATION_ERROR', `Alat ukur ${row.code} milik cabang lain.`);
  }
  if (!row.active || row.status !== 'ACTIVE') {
    throw new AppError('STATUS_INVALID', `Alat ukur ${row.code} berstatus ${row.status} — tidak dapat dipakai untuk inspeksi.`);
  }
  if (!row.calibration_due_date) {
    throw new AppError('STATUS_INVALID', `Alat ukur ${row.code} belum pernah dikalibrasi.`);
  }
  // pg mengembalikan kolom date sebagai objek Date, bukan string — dinormalkan
  // lewat business-date supaya perbandingannya benar dan memakai zona bisnis
  // yang sama dengan current_date database.
  const due = businessDate.toBusinessDate(row.calibration_due_date);
  const today = businessDate.today();
  if (due < today) {
    throw new AppError('STATUS_INVALID',
      `Kalibrasi alat ukur ${row.code} kedaluwarsa pada ${due} — hasil ukurnya tidak dapat dipertanggungjawabkan.`,
      { instrumentCode: row.code, calibrationDueDate: due });
  }
  return row;
}

async function listInstruments(client, user, { branchId } = {}) {
  permissions.assertPermission(user, 'quality.view');
  const scope = branchId || user.branchId;
  permissions.assertBranchScope(user, scope, 'Alat ukur');
  const rows = (await client.query(
    `SELECT i.*,(i.calibration_due_date IS NOT NULL AND i.calibration_due_date < current_date) overdue,
       (SELECT count(*)::int FROM instrument_calibrations c WHERE c.instrument_id=i.id) calibration_count
     FROM measuring_instruments i WHERE i.branch_id=$1 AND i.active ORDER BY i.calibration_due_date NULLS FIRST,i.code`,
    [scope])).rows;
  return { items: rows.map(camel), overdueCount: rows.filter((r) => r.overdue).length };
}

module.exports = { openCase, advanceCase, listCases, getCase, registerInstrument, recordCalibration,
  assertInstrumentUsable, listInstruments, FLOW };
