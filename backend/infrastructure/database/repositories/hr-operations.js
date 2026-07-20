'use strict';
// Sprint 14 (R021) — shift/roster, kalender kerja, koreksi absensi
// maker-checker, dan akrual cuti. Prinsip §35: jam standar, akhir pekan,
// hari libur, dan kebijakan cuti seluruhnya configuration-driven.
const { randomUUID } = require('node:crypto');
const { AppError } = require('../../../core/errors');
const { assertBranchAccess, hasGlobalScope, queryScope, resolveBranch } = require('../../../core/data-scope');

const d2 = (v) => Math.round(Number(v || 0) * 100) / 100;

// ── Shift & roster ───────────────────────────────────────────────────────────
function shiftHours(shift) {
  const [sh, sm] = String(shift.start_time).split(':').map(Number);
  const [eh, em] = String(shift.end_time).split(':').map(Number);
  let minutes = (eh * 60 + em) - (sh * 60 + sm);
  if (minutes <= 0) minutes += 24 * 60;                    // lintas hari
  return d2((minutes - Number(shift.break_minutes || 0)) / 60);
}

async function listShifts(client) {
  const runtime = require('./runtime');
  const rows = (await client.query('SELECT * FROM work_shifts WHERE active ORDER BY is_default DESC, code')).rows;
  return { items: rows.map((r) => ({ ...runtime.camel(r), effectiveHours: shiftHours(r) })) };
}

// Penetapan roster massal: [{employeeId, workDate, shiftId}] — upsert per hari.
async function assignRoster(client, { assignments, user, requestId }) {
  if (!Array.isArray(assignments) || !assignments.length) throw new AppError('VALIDATION_ERROR', 'Minimal satu baris roster wajib diisi.');
  if (assignments.length > 500) throw new AppError('VALIDATION_ERROR', 'Maksimal 500 baris per penetapan.');
  let applied = 0;
  for (const [i, a] of assignments.entries()) {
    if (!a.employeeId || !a.shiftId || !/^\d{4}-\d{2}-\d{2}$/.test(String(a.workDate || ''))) throw new AppError('VALIDATION_ERROR', `Baris roster #${i + 1} tidak lengkap (employeeId, workDate, shiftId).`);
    const shift = (await client.query('SELECT id FROM work_shifts WHERE id=$1 AND active', [a.shiftId])).rows[0];
    if (!shift) throw new AppError('RESOURCE_NOT_FOUND', `Shift baris #${i + 1} tidak ditemukan.`);
    const employee = (await client.query('SELECT id,branch_id FROM employees WHERE id=$1 AND active', [a.employeeId])).rows[0];
    if (!employee) throw new AppError('RESOURCE_NOT_FOUND', `Karyawan baris #${i + 1} tidak ditemukan.`);
    assertBranchAccess(user, employee.branch_id, `Karyawan baris #${i + 1} berada di cabang di luar cakupan Anda.`);
    await client.query(`INSERT INTO employee_rosters(id,employee_id,work_date,shift_id,assigned_by) VALUES($1,$2,$3,$4,$5)
      ON CONFLICT(employee_id,work_date) DO UPDATE SET shift_id=excluded.shift_id,assigned_by=excluded.assigned_by,created_at=now()`,
      [randomUUID(), a.employeeId, a.workDate, a.shiftId, user.id]);
    applied++;
  }
  const runtime = require('./runtime');
  await runtime.audit(client, { userId: user.id, action: 'UPDATE', module: 'attendance', entityType: 'EMPLOYEE_ROSTER', newValue: { applied }, requestId });
  return { applied };
}

async function listRoster(client, user, { period, employeeId }) {
  const p = period || new Date().toISOString().slice(0, 7);
  const runtime = require('./runtime');
  const scope = queryScope(user);
  if (user.role === 'employee') employeeId = user.employeeId;
  if (user.role === 'employee' && !employeeId) return { period: p, items: [] };
  const args = [p, scope.global, scope.branchId]; let filter = ' AND ($2::boolean OR e.branch_id=$3)';
  if (employeeId) { args.push(employeeId); filter += ` AND r.employee_id=$${args.length}`; }
  const rows = (await client.query(`SELECT r.*,e.nik,e.name employee_name,s.code shift_code,s.name shift_name,s.start_time,s.end_time,s.break_minutes
    FROM employee_rosters r JOIN employees e ON e.id=r.employee_id JOIN work_shifts s ON s.id=r.shift_id
    WHERE to_char(r.work_date,'YYYY-MM')=$1${filter} ORDER BY r.work_date,e.name LIMIT 1000`, args)).rows;
  return { period: p, items: rows.map((r) => ({ ...runtime.camel(r), effectiveHours: shiftHours(r) })) };
}

// ── Kalender kerja ───────────────────────────────────────────────────────────
async function weekendDays(client) {
  const row = (await client.query('SELECT weekend_days FROM hr_calendar_config WHERE active LIMIT 1')).rows[0];
  return row ? row.weekend_days.map(Number) : [0, 6];
}

async function listHolidays(client, user, { year }) {
  const runtime = require('./runtime');
  const y = Number(year) || new Date().getFullYear();
  const scope = queryScope(user);
  const rows = (await client.query(`SELECT c.*,b.name branch_name FROM work_calendar c LEFT JOIN branches b ON b.id=c.branch_id
    WHERE c.active AND EXTRACT(YEAR FROM c.holiday_date)=$1 AND ($2::boolean OR c.branch_id IS NULL OR c.branch_id=$3) ORDER BY c.holiday_date`, [y, scope.global, scope.branchId])).rows;
  return { year: y, weekendDays: await weekendDays(client), items: rows.map(runtime.camel) };
}

async function upsertHoliday(client, { holidayDate, name, branchId, user, requestId }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(holidayDate || ''))) throw new AppError('VALIDATION_ERROR', 'Tanggal libur wajib berformat YYYY-MM-DD.');
  if (!name) throw new AppError('VALIDATION_ERROR', 'Nama hari libur wajib diisi.');
  const targetBranchId = hasGlobalScope(user) && !branchId ? null : resolveBranch(user, branchId);
  const row = (await client.query(`INSERT INTO work_calendar(id,holiday_date,name,branch_id,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *`,
    [randomUUID(), holidayDate, String(name).slice(0, 160), targetBranchId, user.id])).rows[0];
  const runtime = require('./runtime');
  await runtime.audit(client, { userId: user.id, action: 'CREATE', module: 'attendance', entityType: 'WORK_CALENDAR', entityId: row.id, newValue: { holidayDate, name }, requestId });
  return runtime.camel(row);
}

// Hitung hari KERJA inklusif (akhir pekan + libur dilewati) — dipakai durasi cuti.
async function countWorkingDays(client, { from, to, branchId }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(from || '')) || !/^\d{4}-\d{2}-\d{2}$/.test(String(to || ''))) throw new AppError('VALIDATION_ERROR', 'Rentang tanggal wajib berformat YYYY-MM-DD.');
  if (to < from) throw new AppError('VALIDATION_ERROR', 'Tanggal akhir tidak boleh sebelum tanggal mulai.');
  const wk = await weekendDays(client);
  const row = (await client.query(`SELECT count(*)::int n FROM generate_series($1::date,$2::date,'1 day') g(day)
    WHERE NOT (EXTRACT(DOW FROM g.day)::int = ANY($3::int[]))
      AND NOT EXISTS (SELECT 1 FROM work_calendar c WHERE c.active AND c.holiday_date=g.day AND (c.branch_id IS NULL OR c.branch_id=$4))`,
    [from, to, wk, branchId || null])).rows[0];
  return row.n;
}

// ── Koreksi absensi maker-checker ────────────────────────────────────────────
async function requestCorrection(client, { employeeId, workDate, proposed, reason, user, requestId }) {
  if (!reason) throw new AppError('REASON_REQUIRED', 'Alasan koreksi wajib diisi.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(workDate || ''))) throw new AppError('VALIDATION_ERROR', 'Tanggal kerja wajib berformat YYYY-MM-DD.');
  if (!proposed || (!proposed.checkIn && !proposed.checkOut && !proposed.status)) throw new AppError('VALIDATION_ERROR', 'Usulan koreksi kosong.');
  if (proposed.status && !['PRESENT', 'LATE', 'ABSENT', 'LEAVE', 'SICK', 'REMOTE'].includes(proposed.status)) throw new AppError('VALIDATION_ERROR', 'Status usulan tidak dikenal.');
  // Karyawan hanya boleh mengoreksi absensinya sendiri.
  if (user.role === 'employee') {
    if (!user.employeeId || user.employeeId !== employeeId) throw new AppError('PERMISSION_DENIED', 'Karyawan hanya dapat mengajukan koreksi absensinya sendiri.');
  }
  const employee = (await client.query('SELECT id,branch_id FROM employees WHERE id=$1 AND active', [employeeId])).rows[0];
  if (!employee) throw new AppError('RESOURCE_NOT_FOUND', 'Karyawan tidak ditemukan.');
  assertBranchAccess(user, employee.branch_id, 'Karyawan berada di cabang di luar cakupan Anda.');
  const existing = (await client.query('SELECT * FROM attendance_records WHERE employee_id=$1 AND work_date=$2', [employeeId, workDate])).rows[0];
  const runtime = require('./runtime');
  const row = (await client.query(`INSERT INTO attendance_corrections(id,employee_id,work_date,old_value,proposed,reason,requested_by)
    VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [
    randomUUID(), employeeId, workDate,
    existing ? JSON.stringify({ checkIn: existing.check_in, checkOut: existing.check_out, status: existing.status, notes: existing.notes }) : '{}',
    JSON.stringify({ checkIn: proposed.checkIn || null, checkOut: proposed.checkOut || null, status: proposed.status || null, notes: proposed.notes ? String(proposed.notes).slice(0, 300) : null }),
    String(reason).slice(0, 500), user.id])).rows[0];
  await runtime.audit(client, { userId: user.id, action: 'CREATE', module: 'attendance', entityType: 'ATTENDANCE_CORRECTION', entityId: row.id, newValue: { employeeId, workDate }, reason, requestId });
  return runtime.camel(row);
}

async function decideCorrection(client, { correctionId, decision, reason, user, requestId }) {
  if (!['APPROVED', 'REJECTED'].includes(decision)) throw new AppError('VALIDATION_ERROR', 'Keputusan harus APPROVED/REJECTED.');
  if (!reason) throw new AppError('REASON_REQUIRED', 'Alasan keputusan wajib diisi.');
  const co = (await client.query(`SELECT c.*,e.branch_id FROM attendance_corrections c JOIN employees e ON e.id=c.employee_id WHERE c.id=$1 FOR UPDATE OF c`, [correctionId])).rows[0];
  if (!co) throw new AppError('RESOURCE_NOT_FOUND', 'Koreksi tidak ditemukan.');
  assertBranchAccess(user, co.branch_id, 'Koreksi absensi berada di cabang di luar cakupan Anda.');
  if (co.status !== 'PENDING') throw new AppError('STATUS_INVALID', `Koreksi berstatus ${co.status}.`);
  if (co.requested_by === user.id) throw new AppError('SOD_CONFLICT', 'Pemohon koreksi tidak boleh menjadi pemutus (SoD).');
  const updated = (await client.query(`UPDATE attendance_corrections SET status=$2,decided_by=$3,decided_at=now(),decide_reason=$4 WHERE id=$1 RETURNING *`,
    [correctionId, decision, user.id, String(reason).slice(0, 500)])).rows[0];
  if (decision === 'APPROVED') {
    const pr = co.proposed || {};
    await client.query(`INSERT INTO attendance_records(id,employee_id,work_date,check_in,check_out,status,source,notes,created_by)
      VALUES($1,$2,$3,$4,$5,COALESCE($6,'PRESENT'),'CORRECTION',$7,$8)
      ON CONFLICT(employee_id,work_date) DO UPDATE SET
        check_in=COALESCE(excluded.check_in,attendance_records.check_in),
        check_out=COALESCE(excluded.check_out,attendance_records.check_out),
        status=COALESCE($6,attendance_records.status),
        source='CORRECTION',notes=COALESCE(excluded.notes,attendance_records.notes),updated_at=now()`,
      [randomUUID(), co.employee_id, co.work_date, pr.checkIn || null, pr.checkOut || null, pr.status || null, pr.notes || null, user.id]);
  }
  const runtime = require('./runtime');
  await runtime.audit(client, { userId: user.id, action: decision === 'APPROVED' ? 'APPROVE' : 'REJECT', module: 'attendance', entityType: 'ATTENDANCE_CORRECTION', entityId: correctionId, oldValue: co.old_value, newValue: { decision, proposed: co.proposed }, reason, requestId });
  return runtime.camel(updated);
}

async function listCorrections(client, user, params = {}) {
  const runtime = require('./runtime');
  const args = []; const where = [];
  where.push(params.status ? `c.status=$${args.push(params.status)}` : `c.status='PENDING'`);
  if (user.role === 'employee') { if (!user.employeeId) return { items: [] }; where.push(`c.employee_id=$${args.push(user.employeeId)}`); }
  else if (!hasGlobalScope(user)) where.push(`e.branch_id=$${args.push(user.branchId)}`);
  const rows = (await client.query(`SELECT c.*,e.nik,e.name employee_name,ru.display_name requested_by_name,du.display_name decided_by_name
    FROM attendance_corrections c JOIN employees e ON e.id=c.employee_id
    LEFT JOIN app_users ru ON ru.id=c.requested_by LEFT JOIN app_users du ON du.id=c.decided_by
    WHERE ${where.join(' AND ')} ORDER BY c.requested_at DESC LIMIT 200`, args)).rows;
  return { items: rows.map(runtime.camel) };
}

// ── Akrual cuti ──────────────────────────────────────────────────────────────
async function activeLeavePolicy(client, onDate) {
  const row = (await client.query(`SELECT * FROM leave_policies WHERE active AND code='ANNUAL'
    AND effective_from<=$1 AND (effective_until IS NULL OR effective_until>=$1)
    ORDER BY effective_from DESC LIMIT 1`, [onDate])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Kebijakan cuti ANNUAL belum dikonfigurasi.');
  return row;
}

// Akrual bulanan: karyawan aktif dengan masa kerja >= min_service_months
// mendapat days_per_year/12; idempoten per karyawan per periode.
async function runLeaveAccrual(client, { period, branchId, user, requestId }) {
  if (!/^\d{4}-\d{2}$/.test(String(period || ''))) throw new AppError('VALIDATION_ERROR', 'Periode wajib berformat YYYY-MM.');
  const targetBranchId = resolveBranch(user, branchId);
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`leave-accrual:${targetBranchId}:${period}`]);
  const policy = await activeLeavePolicy(client, `${period}-01`);
  if (!policy.accrue_monthly) return { period, accrued: 0, message: 'Kebijakan tidak memakai akrual bulanan.' };
  const monthly = d2(Number(policy.days_per_year) / 12);
  const year = Number(period.slice(0, 4));
  const employees = (await client.query(`SELECT e.id,e.join_date FROM employees e
    WHERE e.active AND e.branch_id=$3 AND e.join_date IS NOT NULL
      AND e.join_date + ($2||' months')::interval <= ($1||'-01')::date + interval '1 month' - interval '1 day'
      AND NOT EXISTS (SELECT 1 FROM leave_accrual_entries a WHERE a.employee_id=e.id AND a.period=$1)`,
    [period, Number(policy.min_service_months), targetBranchId])).rows;
  const snapshot = { code: policy.code, daysPerYear: Number(policy.days_per_year), minServiceMonths: Number(policy.min_service_months), monthly };
  let accrued = 0;
  for (const emp of employees) {
    await client.query(`INSERT INTO leave_balances(employee_id,year) VALUES($1,$2) ON CONFLICT DO NOTHING`, [emp.id, year]);
    await client.query(`UPDATE leave_balances SET entitlement=entitlement+$3,updated_at=now(),updated_by=$4 WHERE employee_id=$1 AND year=$2`, [emp.id, year, monthly, user.id]);
    await client.query(`INSERT INTO leave_accrual_entries(id,employee_id,period,days,policy_snapshot,created_by) VALUES($1,$2,$3,$4,$5,$6)`,
      [randomUUID(), emp.id, period, monthly, JSON.stringify(snapshot), user.id]);
    accrued++;
  }
  const runtime = require('./runtime');
  await runtime.audit(client, { userId: user.id, action: 'POST', module: 'leave', entityType: 'LEAVE_ACCRUAL_RUN', entityId: null, newValue: { period, accrued, monthly }, requestId, branchId: targetBranchId });
  return { period, accrued, monthlyDays: monthly };
}

// ── Integrasi LEAVE_REQUEST dengan saldo & kalender ──────────────────────────
// Saat submit: payload {employeeId?, startDate, endDate} wajib; durasi = hari
// kerja; saldo harus cukup. Saat approve: used bertambah (idempoten via flag).
async function leaveDuration(client, doc) {
  const p = doc.payload || {};
  if (!p.startDate || !p.endDate) throw new AppError('VALIDATION_ERROR', 'Pengajuan cuti wajib memiliki payload.startDate dan payload.endDate (YYYY-MM-DD).');
  const days = await countWorkingDays(client, { from: p.startDate, to: p.endDate, branchId: doc.branch_id || doc.branchId });
  if (days <= 0) throw new AppError('VALIDATION_ERROR', 'Rentang cuti tidak mengandung hari kerja.');
  return days;
}

async function resolveLeaveEmployee(client, doc) {
  if (doc.payload?.employeeId) return doc.payload.employeeId;
  const row = (await client.query('SELECT employee_id FROM app_users WHERE id=$1', [doc.created_by || doc.createdBy])).rows[0];
  if (!row?.employee_id) throw new AppError('VALIDATION_ERROR', 'Pengajuan cuti tidak tertaut ke karyawan (payload.employeeId atau akun pembuat).');
  return row.employee_id;
}

async function assertLeaveOk(client, doc) {
  const days = await leaveDuration(client, doc);
  const employeeId = await resolveLeaveEmployee(client, doc);
  const year = Number(String(doc.payload.startDate).slice(0, 4));
  await client.query(`INSERT INTO leave_balances(employee_id,year) VALUES($1,$2) ON CONFLICT DO NOTHING`, [employeeId, year]);
  const bal = (await client.query('SELECT entitlement,used FROM leave_balances WHERE employee_id=$1 AND year=$2', [employeeId, year])).rows[0];
  const remaining = d2(Number(bal.entitlement) - Number(bal.used));
  if (days > remaining) throw new AppError('VALIDATION_ERROR', `Saldo cuti tidak cukup: butuh ${days} hari kerja, sisa ${remaining}.`);
  return { days, employeeId, remaining };
}

async function onLeaveApproved(client, doc, user) {
  if (doc.payload?.leaveApplied) return { replay: true };
  const days = await leaveDuration(client, doc);
  const employeeId = await resolveLeaveEmployee(client, doc);
  const year = Number(String(doc.payload.startDate).slice(0, 4));
  await client.query(`UPDATE leave_balances SET used=used+$3,updated_at=now(),updated_by=$4 WHERE employee_id=$1 AND year=$2`, [employeeId, year, days, user.id]);
  await client.query(`UPDATE business_documents SET payload=payload||$2::jsonb WHERE id=$1`, [doc.id, JSON.stringify({ leaveApplied: { days, employeeId, at: new Date().toISOString() } })]);
  return { days, employeeId };
}

module.exports = { shiftHours, listShifts, assignRoster, listRoster, listHolidays, upsertHoliday, countWorkingDays, requestCorrection, decideCorrection, listCorrections, runLeaveAccrual, assertLeaveOk, onLeaveApproved };
