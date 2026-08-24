'use strict';
// Learning & Development (LMS) — katalog program pelatihan (training_programs,
// tingkat-tenant) + pendaftaran/riwayat per karyawan (training_enrollments,
// employee-scope). Digerbang employee.view (baca) / employee.edit (tulis).

const { AppError } = require('../../../core/errors');
const { assertPermission } = require('../../../core/permissions');
const runtime = require('./runtime');

const PROG_STATUS = ['DRAFT', 'ACTIVE', 'ARCHIVED'];
const CATEGORIES = ['TECHNICAL', 'LEADERSHIP', 'COMPLIANCE', 'SOFT_SKILL', 'SAFETY', 'ONBOARDING', 'PRODUCT', 'OTHER'];
const MODES = ['IN_HOUSE', 'EXTERNAL', 'ONLINE', 'BLENDED'];
const ENROLL_STATUS = ['ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'FAILED'];
const up = (v) => String(v || '').toUpperCase();

async function nextProgCode(client) {
  const year = new Date().getFullYear();
  const row = (await client.query(
    `SELECT COALESCE(max((regexp_replace(code, '^TRN-[0-9]{4}-', ''))::int), 0) + 1 AS n
     FROM training_programs WHERE code LIKE $1`, [`TRN-${year}-%`])).rows[0];
  return `TRN-${year}-${String(row.n).padStart(3, '0')}`;
}

async function listPrograms(client, user, { status, category } = {}) {
  assertPermission(user, 'employee.view');
  const params = []; let where = '1=1';
  if (status && PROG_STATUS.includes(up(status))) { params.push(up(status)); where += ` AND p.status=$${params.length}`; }
  if (category && CATEGORIES.includes(up(category))) { params.push(up(category)); where += ` AND p.category=$${params.length}`; }
  const rows = (await client.query(`SELECT p.*,
    (SELECT count(*)::int FROM training_enrollments e WHERE e.program_id=p.id) enrollment_count,
    (SELECT count(*)::int FROM training_enrollments e WHERE e.program_id=p.id AND e.status='COMPLETED') completed_count
    FROM training_programs p WHERE ${where} ORDER BY
    CASE p.status WHEN 'ACTIVE' THEN 0 WHEN 'DRAFT' THEN 1 ELSE 2 END, p.created_at DESC`, params)).rows.map(runtime.camel);
  return { items: rows };
}

async function learningOverview(client, user) {
  assertPermission(user, 'employee.view');
  const programs = runtime.camel((await client.query(`SELECT
    count(*) FILTER (WHERE status='ACTIVE')::int active,
    count(*)::int total FROM training_programs`)).rows[0]);
  const enrollments = runtime.camel((await client.query(`SELECT
    count(*)::int total,
    count(*) FILTER (WHERE status IN ('ENROLLED','IN_PROGRESS'))::int active,
    count(*) FILTER (WHERE status='COMPLETED')::int completed,
    COALESCE(round(avg(score) FILTER (WHERE status='COMPLETED' AND score IS NOT NULL), 1), 0)::numeric avg_score,
    COALESCE(count(DISTINCT employee_id), 0)::int employees_trained FROM training_enrollments`)).rows[0]);
  enrollments.avgScore = Number(enrollments.avgScore) || 0;
  return { programs, enrollments };
}

async function createProgram(client, user, body, requestId) {
  assertPermission(user, 'employee.edit');
  const title = String(body.title || '').trim();
  if (!title) throw new AppError('VALIDATION_ERROR', 'Judul program wajib diisi.');
  const code = String(body.code || '').trim() || await nextProgCode(client);
  const category = CATEGORIES.includes(up(body.category)) ? up(body.category) : 'TECHNICAL';
  const mode = MODES.includes(up(body.deliveryMode)) ? up(body.deliveryMode) : 'IN_HOUSE';
  const status = PROG_STATUS.includes(up(body.status)) ? up(body.status) : 'ACTIVE';
  const duration = (body.durationHours != null && body.durationHours !== '') ? Number(body.durationHours) : null;
  const cost = (body.cost != null && body.cost !== '') ? Number(body.cost) : null;
  const row = (await client.query(`INSERT INTO training_programs
    (code,title,category,provider,delivery_mode,duration_hours,cost,status,description,created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [code, title, category, body.provider || null, mode, duration, cost, status, body.description || null, user.id])).rows[0];
  await runtime.audit(client, { userId: user.id, action: 'TRAINING_CREATE', module: 'employee', entityType: 'TRAINING_PROGRAM', entityId: row.id, newValue: { code, title, status }, requestId, branchId: user.branchId });
  return runtime.camel(row);
}

async function updateProgram(client, id, body, user, requestId) {
  assertPermission(user, 'employee.edit');
  const sets = [], vals = [id]; let n = 1;
  const map = { title: 'title', provider: 'provider', description: 'description' };
  for (const [k, col] of Object.entries(map)) if (body[k] !== undefined) { sets.push(`${col}=$${++n}`); vals.push(body[k] || null); }
  if (body.status !== undefined && PROG_STATUS.includes(up(body.status))) { sets.push(`status=$${++n}`); vals.push(up(body.status)); }
  if (body.category !== undefined && CATEGORIES.includes(up(body.category))) { sets.push(`category=$${++n}`); vals.push(up(body.category)); }
  if (body.deliveryMode !== undefined && MODES.includes(up(body.deliveryMode))) { sets.push(`delivery_mode=$${++n}`); vals.push(up(body.deliveryMode)); }
  if (body.durationHours !== undefined) { sets.push(`duration_hours=$${++n}`); vals.push((body.durationHours != null && body.durationHours !== '') ? Number(body.durationHours) : null); }
  if (body.cost !== undefined) { sets.push(`cost=$${++n}`); vals.push((body.cost != null && body.cost !== '') ? Number(body.cost) : null); }
  if (!sets.length) throw new AppError('VALIDATION_ERROR', 'Tidak ada perubahan.');
  const row = (await client.query(`UPDATE training_programs SET ${sets.join(',')}, updated_at=now() WHERE id=$1 RETURNING *`, vals)).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND');
  await runtime.audit(client, { userId: user.id, action: 'TRAINING_UPDATE', module: 'employee', entityType: 'TRAINING_PROGRAM', entityId: id, newValue: { status: row.status }, requestId, branchId: user.branchId });
  return runtime.camel(row);
}

async function listEnrollments(client, user, { programId, employeeId, status } = {}) {
  assertPermission(user, 'employee.view');
  const params = []; let where = '1=1';
  if (programId) { params.push(programId); where += ` AND e.program_id=$${params.length}`; }
  if (employeeId) { params.push(employeeId); where += ` AND e.employee_id=$${params.length}`; }
  if (status && ENROLL_STATUS.includes(up(status))) { params.push(up(status)); where += ` AND e.status=$${params.length}`; }
  const rows = (await client.query(`SELECT e.*, emp.name employee_name, emp.department employee_department, p.title program_title, p.code program_code, p.category program_category
    FROM training_enrollments e
    JOIN employees emp ON emp.id=e.employee_id
    JOIN training_programs p ON p.id=e.program_id
    WHERE ${where} ORDER BY
    CASE e.status WHEN 'IN_PROGRESS' THEN 0 WHEN 'ENROLLED' THEN 1 WHEN 'COMPLETED' THEN 2 ELSE 3 END, e.enrolled_at DESC`, params)).rows.map(runtime.camel);
  return { items: rows };
}

async function createEnrollment(client, user, body, requestId) {
  assertPermission(user, 'employee.edit');
  if (!body.employeeId) throw new AppError('VALIDATION_ERROR', 'Karyawan wajib dipilih.');
  if (!body.programId) throw new AppError('VALIDATION_ERROR', 'Program wajib dipilih.');
  const status = ENROLL_STATUS.includes(up(body.status)) ? up(body.status) : 'ENROLLED';
  const score = (body.score != null && body.score !== '') ? Math.max(0, Math.min(100, Number(body.score))) : null;
  const completed = /^\d{4}-\d{2}-\d{2}$/.test(body.completedAt || '') ? body.completedAt : (status === 'COMPLETED' ? new Date().toISOString().slice(0, 10) : null);
  const row = (await client.query(`INSERT INTO training_enrollments
    (employee_id,program_id,status,score,completed_at,notes,created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [body.employeeId, body.programId, status, score, completed, body.notes || null, user.id])).rows[0];
  await runtime.audit(client, { userId: user.id, action: 'ENROLLMENT_ADD', module: 'employee', entityType: 'TRAINING_ENROLLMENT', entityId: row.id, newValue: { status }, requestId, branchId: user.branchId });
  return runtime.camel(row);
}

async function updateEnrollment(client, id, body, user, requestId) {
  assertPermission(user, 'employee.edit');
  const sets = [], vals = [id]; let n = 1;
  let newStatus = null;
  if (body.status !== undefined) { if (!ENROLL_STATUS.includes(up(body.status))) throw new AppError('VALIDATION_ERROR', 'Status tidak valid.'); newStatus = up(body.status); sets.push(`status=$${++n}`); vals.push(newStatus); }
  if (body.score !== undefined) { sets.push(`score=$${++n}`); vals.push((body.score != null && body.score !== '') ? Math.max(0, Math.min(100, Number(body.score))) : null); }
  if (body.notes !== undefined) { sets.push(`notes=$${++n}`); vals.push(body.notes || null); }
  if (body.completedAt !== undefined) { sets.push(`completed_at=$${++n}`); vals.push(/^\d{4}-\d{2}-\d{2}$/.test(body.completedAt || '') ? body.completedAt : null); }
  else if (newStatus === 'COMPLETED') { sets.push('completed_at=COALESCE(completed_at, current_date)'); }
  if (newStatus === 'IN_PROGRESS') { sets.push('started_at=COALESCE(started_at, current_date)'); }
  if (!sets.length) throw new AppError('VALIDATION_ERROR', 'Tidak ada perubahan.');
  const row = (await client.query(`UPDATE training_enrollments SET ${sets.join(',')}, updated_at=now() WHERE id=$1 RETURNING *`, vals)).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND');
  await runtime.audit(client, { userId: user.id, action: 'ENROLLMENT_UPDATE', module: 'employee', entityType: 'TRAINING_ENROLLMENT', entityId: id, newValue: { status: row.status, score: row.score }, requestId, branchId: user.branchId });
  return runtime.camel(row);
}

module.exports = {
  listPrograms, learningOverview, createProgram, updateProgram,
  listEnrollments, createEnrollment, updateEnrollment,
  PROG_STATUS, CATEGORIES, MODES, ENROLL_STATUS
};
