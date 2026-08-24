'use strict';
// Rekrutmen / ATS — lowongan (job_requisitions) + pelamar (candidates) dengan
// pipeline tahap (APPLIED→SCREENING→INTERVIEW→OFFER→HIRED/REJECTED). Tingkat-tenant,
// digerbang izin employee.view (baca) / employee.edit (tulis). Audit di modul employee.

const { AppError } = require('../../../core/errors');
const { assertPermission } = require('../../../core/permissions');
const runtime = require('./runtime');

const REQ_STATUS = ['DRAFT', 'OPEN', 'ON_HOLD', 'CLOSED', 'FILLED', 'CANCELLED'];
const CAND_STAGES = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN'];
const EMP_TYPES = ['PKWTT', 'PKWT', 'INTERN', 'CONTRACT', 'OUTSOURCE'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const SOURCES = ['JOB_PORTAL', 'REFERRAL', 'LINKEDIN', 'WALK_IN', 'AGENCY', 'CAMPUS', 'OTHER'];
const up = (v) => String(v || '').toUpperCase();

async function nextReqCode(client) {
  const year = new Date().getFullYear();
  const row = (await client.query(
    `SELECT COALESCE(max((regexp_replace(code, '^REQ-[0-9]{4}-', ''))::int), 0) + 1 AS n
     FROM job_requisitions WHERE code LIKE $1`, [`REQ-${year}-%`])).rows[0];
  return `REQ-${year}-${String(row.n).padStart(3, '0')}`;
}

async function listRequisitions(client, user, { status } = {}) {
  assertPermission(user, 'employee.view');
  const params = []; let where = '1=1';
  if (status && REQ_STATUS.includes(up(status))) { params.push(up(status)); where += ` AND r.status=$${params.length}`; }
  const rows = (await client.query(`SELECT r.*,
    (SELECT count(*)::int FROM candidates c WHERE c.requisition_id=r.id) applicant_count,
    (SELECT count(*)::int FROM candidates c WHERE c.requisition_id=r.id AND c.stage NOT IN ('HIRED','REJECTED','WITHDRAWN')) active_count,
    (SELECT count(*)::int FROM candidates c WHERE c.requisition_id=r.id AND c.stage='HIRED') hired_count
    FROM job_requisitions r WHERE ${where} ORDER BY
    CASE r.status WHEN 'OPEN' THEN 0 WHEN 'ON_HOLD' THEN 1 WHEN 'DRAFT' THEN 2 ELSE 3 END,
    CASE r.priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
    r.created_at DESC`, params)).rows.map(runtime.camel);
  return { items: rows };
}

async function getRequisition(client, id, user) {
  assertPermission(user, 'employee.view');
  const row = (await client.query('SELECT * FROM job_requisitions WHERE id=$1', [id])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND');
  return runtime.camel(row);
}

async function recruitmentOverview(client, user) {
  assertPermission(user, 'employee.view');
  const kpi = runtime.camel((await client.query(`SELECT
    count(*) FILTER (WHERE status='OPEN')::int open_reqs,
    count(*) FILTER (WHERE status IN ('OPEN','ON_HOLD'))::int active_reqs,
    COALESCE(sum(headcount) FILTER (WHERE status='OPEN'), 0)::int open_headcount FROM job_requisitions`)).rows[0]);
  const candidates = runtime.camel((await client.query(`SELECT
    count(*)::int total,
    count(*) FILTER (WHERE stage NOT IN ('HIRED','REJECTED','WITHDRAWN'))::int active,
    count(*) FILTER (WHERE stage='INTERVIEW')::int interviewing,
    count(*) FILTER (WHERE stage='OFFER')::int offers,
    count(*) FILTER (WHERE stage='HIRED')::int hired FROM candidates`)).rows[0]);
  return { kpi, candidates };
}

async function createRequisition(client, user, body, requestId) {
  assertPermission(user, 'employee.edit');
  const title = String(body.title || '').trim();
  if (!title) throw new AppError('VALIDATION_ERROR', 'Judul lowongan wajib diisi.');
  const code = String(body.code || '').trim() || await nextReqCode(client);
  const empType = EMP_TYPES.includes(up(body.employmentType)) ? up(body.employmentType) : 'PKWTT';
  const status = REQ_STATUS.includes(up(body.status)) ? up(body.status) : 'OPEN';
  const priority = PRIORITIES.includes(up(body.priority)) ? up(body.priority) : 'MEDIUM';
  const headcount = Math.max(1, Math.min(999, Math.round(Number(body.headcount)) || 1));
  const target = /^\d{4}-\d{2}-\d{2}$/.test(body.targetDate || '') ? body.targetDate : null;
  const row = (await client.query(`INSERT INTO job_requisitions
    (code,title,department,location,employment_type,headcount,status,priority,salary_range,hiring_manager,description,requirements,target_date,created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [code, title, body.department || null, body.location || null, empType, headcount, status, priority,
      body.salaryRange || null, body.hiringManager || null, body.description || null, body.requirements || null, target, user.id])).rows[0];
  await runtime.audit(client, { userId: user.id, action: 'REQ_CREATE', module: 'employee', entityType: 'JOB_REQUISITION', entityId: row.id, newValue: { code, title, status }, requestId, branchId: user.branchId });
  return runtime.camel(row);
}

async function updateRequisition(client, id, body, user, requestId) {
  assertPermission(user, 'employee.edit');
  const sets = [], vals = [id]; let n = 1;
  const map = { title: 'title', department: 'department', location: 'location', salaryRange: 'salary_range', hiringManager: 'hiring_manager', description: 'description', requirements: 'requirements' };
  for (const [k, col] of Object.entries(map)) if (body[k] !== undefined) { sets.push(`${col}=$${++n}`); vals.push(body[k] || null); }
  if (body.status !== undefined && REQ_STATUS.includes(up(body.status))) { sets.push(`status=$${++n}`); vals.push(up(body.status)); }
  if (body.priority !== undefined && PRIORITIES.includes(up(body.priority))) { sets.push(`priority=$${++n}`); vals.push(up(body.priority)); }
  if (body.employmentType !== undefined && EMP_TYPES.includes(up(body.employmentType))) { sets.push(`employment_type=$${++n}`); vals.push(up(body.employmentType)); }
  if (body.headcount !== undefined) { sets.push(`headcount=$${++n}`); vals.push(Math.max(1, Math.round(Number(body.headcount)) || 1)); }
  if (body.targetDate !== undefined) { sets.push(`target_date=$${++n}`); vals.push(/^\d{4}-\d{2}-\d{2}$/.test(body.targetDate || '') ? body.targetDate : null); }
  if (!sets.length) throw new AppError('VALIDATION_ERROR', 'Tidak ada perubahan.');
  const row = (await client.query(`UPDATE job_requisitions SET ${sets.join(',')}, updated_at=now() WHERE id=$1 RETURNING *`, vals)).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND');
  await runtime.audit(client, { userId: user.id, action: 'REQ_UPDATE', module: 'employee', entityType: 'JOB_REQUISITION', entityId: id, newValue: { status: row.status }, requestId, branchId: user.branchId });
  return runtime.camel(row);
}

async function listCandidates(client, user, { requisitionId, stage } = {}) {
  assertPermission(user, 'employee.view');
  const params = []; let where = '1=1';
  if (requisitionId) { params.push(requisitionId); where += ` AND requisition_id=$${params.length}`; }
  if (stage && CAND_STAGES.includes(up(stage))) { params.push(up(stage)); where += ` AND stage=$${params.length}`; }
  const rows = (await client.query(`SELECT * FROM candidates WHERE ${where} ORDER BY
    CASE stage WHEN 'OFFER' THEN 0 WHEN 'INTERVIEW' THEN 1 WHEN 'SCREENING' THEN 2 WHEN 'APPLIED' THEN 3 WHEN 'HIRED' THEN 4 ELSE 5 END,
    COALESCE(rating,0) DESC, created_at DESC`, params)).rows.map(runtime.camel);
  return { items: rows };
}

async function createCandidate(client, user, body, requestId) {
  assertPermission(user, 'employee.edit');
  const name = String(body.name || '').trim();
  if (!name) throw new AppError('VALIDATION_ERROR', 'Nama kandidat wajib diisi.');
  if (!body.requisitionId) throw new AppError('VALIDATION_ERROR', 'Lowongan wajib dipilih.');
  const source = SOURCES.includes(up(body.source)) ? up(body.source) : 'OTHER';
  const stage = CAND_STAGES.includes(up(body.stage)) ? up(body.stage) : 'APPLIED';
  const rating = (body.rating != null && body.rating !== '') ? Math.max(1, Math.min(5, Number(body.rating))) : null;
  const expected = (body.expectedSalary != null && body.expectedSalary !== '') ? Number(body.expectedSalary) : null;
  const row = (await client.query(`INSERT INTO candidates
    (requisition_id,name,email,phone,source,stage,rating,current_title,expected_salary,resume_file_id,notes,created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [body.requisitionId, name, body.email || null, body.phone || null, source, stage, rating,
      body.currentTitle || null, expected, body.resumeFileId || null, body.notes || null, user.id])).rows[0];
  await runtime.audit(client, { userId: user.id, action: 'CANDIDATE_ADD', module: 'employee', entityType: 'CANDIDATE', entityId: row.id, newValue: { name, stage }, requestId, branchId: user.branchId });
  return runtime.camel(row);
}

async function updateCandidate(client, id, body, user, requestId) {
  assertPermission(user, 'employee.edit');
  const sets = [], vals = [id]; let n = 1;
  if (body.stage !== undefined) { if (!CAND_STAGES.includes(up(body.stage))) throw new AppError('VALIDATION_ERROR', 'Tahap tidak valid.'); sets.push(`stage=$${++n}`); vals.push(up(body.stage)); }
  if (body.rating !== undefined) { sets.push(`rating=$${++n}`); vals.push((body.rating != null && body.rating !== '') ? Math.max(1, Math.min(5, Number(body.rating))) : null); }
  if (body.notes !== undefined) { sets.push(`notes=$${++n}`); vals.push(body.notes || null); }
  if (body.email !== undefined) { sets.push(`email=$${++n}`); vals.push(body.email || null); }
  if (body.phone !== undefined) { sets.push(`phone=$${++n}`); vals.push(body.phone || null); }
  if (body.currentTitle !== undefined) { sets.push(`current_title=$${++n}`); vals.push(body.currentTitle || null); }
  if (!sets.length) throw new AppError('VALIDATION_ERROR', 'Tidak ada perubahan.');
  const row = (await client.query(`UPDATE candidates SET ${sets.join(',')}, updated_at=now() WHERE id=$1 RETURNING *`, vals)).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND');
  await runtime.audit(client, { userId: user.id, action: 'CANDIDATE_UPDATE', module: 'employee', entityType: 'CANDIDATE', entityId: id, newValue: { stage: row.stage, rating: row.rating }, requestId, branchId: user.branchId });
  return runtime.camel(row);
}

module.exports = {
  listRequisitions, getRequisition, recruitmentOverview, createRequisition, updateRequisition,
  listCandidates, createCandidate, updateCandidate,
  REQ_STATUS, CAND_STAGES, EMP_TYPES, PRIORITIES, SOURCES
};
