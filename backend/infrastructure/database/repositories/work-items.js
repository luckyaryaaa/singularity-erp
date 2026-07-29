'use strict';
// Unified Work Item engine (§4.4 / §5.2) — backbone pekerjaan lintas modul.
//
// Approval, exception, review, correction, dan tugas operasional menjadi entitas
// bertipe dengan siklus hidup nyata: ditugaskan, diklaim, dikerjakan, diselesai-
// kan dengan evidence, dikembalikan untuk revisi, ditahan, didelegasikan, dan
// dieskalasi — semuanya optimistic-locked dan teraudit. Membaca notifikasi TIDAK
// menutup pekerjaan; hanya transisi eksplisit yang melakukannya.
//
// Cakupan/izin: rute menjaga 'dashboard.view' (autentikasi); kepemilikan nyata
// ditegakkan di sini (assignee/claimer/delegate/creator + scope cabang), pola
// OWN_RECORD. RLS work_items menjadi pertahanan kedua.
const { randomUUID } = require('node:crypto');
const { AppError } = require('../../../core/errors');
const permissions = require('../../../core/permissions');
const runtime = require('./runtime');

const ITEM_TYPES = ['APPROVAL', 'EXCEPTION', 'REVIEW', 'CORRECTION', 'TASK', 'FOLLOW_UP'];
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
const RISKS = ['LOW', 'MEDIUM', 'HIGH'];
const ACTIVE = ['OPEN', 'CLAIMED', 'IN_PROGRESS', 'RETURNED', 'ON_HOLD'];

const ENRICH = `SELECT w.*,
    ua.display_name assignee_name, uc.display_name created_by_name,
    ucl.display_name claimed_by_name, ud.display_name delegated_to_name,
    b.name branch_name
  FROM work_items w
  LEFT JOIN app_users ua ON ua.id = w.assignee_user_id
  LEFT JOIN app_users uc ON uc.id = w.created_by
  LEFT JOIN app_users ucl ON ucl.id = w.claimed_by
  LEFT JOIN app_users ud ON ud.id = w.delegated_to
  LEFT JOIN branches b ON b.id = w.branch_id`;

function mapRow(r) {
  const item = runtime.camel(r);
  const active = ACTIVE.includes(r.status);
  item.overdue = active && Boolean(r.due_at) && new Date(r.due_at) < new Date();
  return item;
}
const loadEnriched = async (client, id) => (await client.query(`${ENRICH} WHERE w.id = $1`, [id])).rows[0];

const crossBranch = (user) => permissions.CROSS_BRANCH_ROLES.includes(user.role) || user.branchScope === '*';
// Siapa boleh bertindak atas item: pemiliknya (assignee/claimer/delegate/creator)
// atau peran lintas cabang. Scope cabang dijaga terpisah.
function assertActor(user, row) {
  const mine = [row.assignee_user_id, row.claimed_by, row.delegated_to, row.created_by]
    .some((id) => id && String(id) === String(user.id));
  if (!mine && !crossBranch(user)) {
    throw new AppError('PERMISSION_DENIED', 'Work item ini bukan milik Anda dan Anda tidak berwenang mengubahnya.');
  }
}

async function createWorkItem(client, input, user, requestId) {
  permissions.assertPermission(user, 'dashboard.view');
  const itemType = String(input.itemType || '').toUpperCase();
  if (!ITEM_TYPES.includes(itemType)) throw new AppError('VALIDATION_ERROR', `Jenis work item tidak dikenal: ${input.itemType}.`, { allowed: ITEM_TYPES });
  const title = String(input.title || '').trim();
  if (!title) throw new AppError('VALIDATION_ERROR', 'Judul work item wajib diisi.');
  const priority = input.priority ? String(input.priority).toUpperCase() : 'NORMAL';
  if (!PRIORITIES.includes(priority)) throw new AppError('VALIDATION_ERROR', `Prioritas tidak dikenal: ${input.priority}.`);
  const risk = input.risk ? String(input.risk).toUpperCase() : 'LOW';
  if (!RISKS.includes(risk)) throw new AppError('VALIDATION_ERROR', `Tingkat risiko tidak dikenal: ${input.risk}.`);
  const branchId = input.branchId || user.branchId;
  if (!branchId) throw new AppError('VALIDATION_ERROR', 'Cabang work item wajib diisi.');
  permissions.assertBranchScope(user, branchId, 'Work item');

  let assigneeUserId = null;
  if (input.assigneeUserId) {
    const target = (await client.query('SELECT id FROM app_users WHERE id=$1 AND active', [input.assigneeUserId])).rows[0];
    if (!target) throw new AppError('VALIDATION_ERROR', 'Penerima tugas tidak ditemukan/aktif.');
    assigneeUserId = target.id;
  }
  const slaMinutes = input.slaMinutes ? Math.max(1, Math.floor(Number(input.slaMinutes))) : null;
  // Due date = eksplisit, atau diturunkan dari SLA menit sejak sekarang.
  const dueAt = input.dueAt || (slaMinutes ? new Date(Date.now() + slaMinutes * 60000).toISOString() : null);

  const id = randomUUID();
  await client.query(
    `INSERT INTO work_items
       (id,item_type,title,description,source_module,source_entity_type,source_entity_id,branch_id,
        assignee_user_id,assignee_role,priority,risk,required_action,completion_condition,due_at,sla_minutes,evidence,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
    [id, itemType, title.slice(0, 300), input.description ? String(input.description).slice(0, 2000) : null,
      input.sourceModule ? String(input.sourceModule).slice(0, 30) : null,
      input.sourceEntityType ? String(input.sourceEntityType).slice(0, 40) : null,
      input.sourceEntityId || null, branchId, assigneeUserId,
      input.assigneeRole ? String(input.assigneeRole).slice(0, 40) : null,
      priority, risk,
      input.requiredAction ? String(input.requiredAction).slice(0, 1000) : null,
      input.completionCondition ? String(input.completionCondition).slice(0, 1000) : null,
      dueAt, slaMinutes, input.evidence ? JSON.stringify(input.evidence) : null, user.id]);

  await runtime.audit(client, { userId: user.id, action: 'CREATE', module: 'workspace',
    entityType: 'WORK_ITEM', entityId: id, reason: input.requiredAction || null,
    newValue: { itemType, title, priority, risk, branchId, assigneeUserId, dueAt }, requestId, branchId });
  return mapRow(await loadEnriched(client, id));
}

async function listWorkItems(client, user, { branchId = null, status = null, itemType = null,
  assignee = null, page = 1, limit = 25 } = {}) {
  permissions.assertPermission(user, 'dashboard.view');
  const scope = branchId || user.branchId;
  permissions.assertBranchScope(user, scope, 'Work item');
  page = Math.max(Number(page) || 1, 1);
  limit = Math.min(Math.max(Number(limit) || 25, 1), 100);
  const params = [scope];
  let where = 'w.branch_id = $1';
  if (status && String(status).toUpperCase() !== 'ALL') { params.push(String(status).toUpperCase()); where += ` AND w.status = $${params.length}`; }
  if (itemType && String(itemType).toUpperCase() !== 'ALL') { params.push(String(itemType).toUpperCase()); where += ` AND w.item_type = $${params.length}`; }
  if (assignee === 'me') { params.push(user.id); where += ` AND (w.assignee_user_id = $${params.length} OR w.claimed_by = $${params.length} OR w.delegated_to = $${params.length})`; }

  const total = Number((await client.query(`SELECT count(*) n FROM work_items w WHERE ${where}`, params)).rows[0].n);
  const sum = (await client.query(
    `SELECT count(*) FILTER (WHERE status='OPEN')::int open,
       count(*) FILTER (WHERE status IN ('CLAIMED','IN_PROGRESS'))::int active,
       count(*) FILTER (WHERE status='RETURNED')::int returned,
       count(*) FILTER (WHERE status IN ('OPEN','CLAIMED','IN_PROGRESS','RETURNED','ON_HOLD')
                        AND due_at IS NOT NULL AND due_at < now())::int overdue
     FROM work_items WHERE branch_id = $1`, [scope])).rows[0];

  params.push(limit, (page - 1) * limit);
  const rows = (await client.query(
    `${ENRICH} WHERE ${where}
     ORDER BY CASE w.status WHEN 'IN_PROGRESS' THEN 0 WHEN 'CLAIMED' THEN 1 WHEN 'RETURNED' THEN 2 WHEN 'OPEN' THEN 3 ELSE 4 END,
       CASE w.priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'NORMAL' THEN 2 ELSE 3 END,
       w.due_at NULLS LAST, w.created_at
     LIMIT $${params.length - 1} OFFSET $${params.length}`, params)).rows;
  return { items: rows.map(mapRow),
    summary: { open: sum.open, active: sum.active, returned: sum.returned, overdue: sum.overdue },
    page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) };
}

// Inbox personal — pengganti agregasi lama, kini berbasis work item nyata.
async function myWork(client, user) {
  permissions.assertPermission(user, 'dashboard.view');
  const q = async (where, params) => (await client.query(
    `${ENRICH} WHERE ${where} ORDER BY w.due_at NULLS LAST, w.created_at DESC LIMIT 20`, params)).rows.map(mapRow);
  const assignedToMe = await q(
    `w.status='OPEN' AND (w.assignee_user_id=$1 OR (w.assignee_user_id IS NULL AND w.assignee_role=$2))`,
    [user.id, user.role]);
  const claimedByMe = await q(`w.claimed_by=$1 AND w.status IN ('CLAIMED','IN_PROGRESS')`, [user.id]);
  const delegatedToMe = await q(`w.delegated_to=$1 AND w.status IN ('OPEN','CLAIMED','IN_PROGRESS')`, [user.id]);
  const createdByMe = await q(`w.created_by=$1 AND w.status IN ('OPEN','CLAIMED','IN_PROGRESS','ON_HOLD')`, [user.id]);
  const returnedToMe = await q(`w.created_by=$1 AND w.status='RETURNED'`, [user.id]);
  return { assignedToMe, claimedByMe, delegatedToMe, createdByMe, returnedToMe, generatedAt: new Date().toISOString() };
}

async function lockForTransition(client, id, expectedVersion, user) {
  const row = (await client.query('SELECT * FROM work_items WHERE id=$1 FOR UPDATE', [id])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Work item tidak ditemukan.');
  permissions.assertBranchScope(user, row.branch_id, 'Work item');
  if (Number(expectedVersion) !== Number(row.version)) {
    throw new AppError('DOCUMENT_CONFLICT', `Versi work item Anda ${expectedVersion}, versi terbaru ${row.version}.`, { currentVersion: Number(row.version) });
  }
  return row;
}

async function transition(client, { id, expectedVersion, user, requestId, action, from, set, reason, requireActor = true }) {
  permissions.assertPermission(user, 'dashboard.view');
  const row = await lockForTransition(client, id, expectedVersion, user);
  if (requireActor && action !== 'CLAIM') assertActor(user, row);
  if (from && !from.includes(row.status)) {
    throw new AppError('STATUS_INVALID', `Work item berstatus ${row.status} tidak dapat ${action.toLowerCase()}.`, { currentStatus: row.status, allowedFrom: from });
  }
  const cols = Object.keys(set);
  const assignments = cols.map((c, i) => `${c}=$${i + 3}`).join(', ');
  const updated = (await client.query(
    `UPDATE work_items SET ${assignments}, version=version+1 WHERE id=$1 AND version=$2 RETURNING status,version`,
    [id, row.version, ...cols.map((c) => set[c])])).rows[0];
  if (!updated) throw new AppError('DOCUMENT_CONFLICT', 'Work item berubah saat transisi diproses.');
  await runtime.audit(client, { userId: user.id, action, module: 'workspace', entityType: 'WORK_ITEM', entityId: id,
    reason: reason || null, oldValue: { status: row.status, version: row.version },
    newValue: { status: updated.status, version: updated.version }, requestId, branchId: row.branch_id });
  return mapRow(await loadEnriched(client, id));
}

// Klaim: item OPEN yang ditujukan ke saya (langsung/peran) atau ke pool.
async function claimItem(client, { id, expectedVersion, user, requestId }) {
  const row = await lockForTransition(client, id, expectedVersion, user);
  if (row.status !== 'OPEN') throw new AppError('STATUS_INVALID', `Work item berstatus ${row.status} tidak dapat diklaim.`);
  // Pool (bebas diklaim) hanya bila TIDAK ditargetkan ke pengguna maupun peran.
  // Item ber-peran menuntut peran yang cocok — bukan free-for-all.
  const pool = !row.assignee_user_id && !row.assignee_role;
  const targeted = pool
    || (row.assignee_user_id && String(row.assignee_user_id) === String(user.id))
    || (row.assignee_role && row.assignee_role === user.role);
  if (!targeted && !crossBranch(user)) throw new AppError('PERMISSION_DENIED', 'Work item ini ditujukan untuk orang lain.');
  return transition(client, { id, expectedVersion, user, requestId, action: 'CLAIM', from: ['OPEN'], requireActor: false,
    set: { status: 'CLAIMED', claimed_by: user.id, claimed_at: new Date(), assignee_user_id: user.id } });
}
const startItem = (client, { id, expectedVersion, user, requestId }) =>
  transition(client, { id, expectedVersion, user, requestId, action: 'START', from: ['CLAIMED', 'RETURNED', 'ON_HOLD'], set: { status: 'IN_PROGRESS', started_at: new Date() } });

async function completeItem(client, { id, expectedVersion, note, evidence, user, requestId }) {
  return transition(client, { id, expectedVersion, user, requestId, action: 'COMPLETE', reason: note || null,
    from: ['CLAIMED', 'IN_PROGRESS'],
    set: { status: 'DONE', completed_by: user.id, completed_at: new Date(),
      completion_note: note ? String(note).slice(0, 1000) : null,
      evidence: evidence ? JSON.stringify(evidence) : null } });
}
async function returnItem(client, { id, expectedVersion, reason, user, requestId }) {
  const explanation = String(reason || '').trim();
  if (explanation.length < 10) throw new AppError('REASON_REQUIRED', 'Alasan pengembalian revisi minimal 10 karakter.');
  return transition(client, { id, expectedVersion, user, requestId, action: 'RETURN', reason: explanation, from: ['CLAIMED', 'IN_PROGRESS'],
    set: { status: 'RETURNED', returned_reason: explanation.slice(0, 500) } });
}
async function holdItem(client, { id, expectedVersion, reason, user, requestId }) {
  const explanation = String(reason || '').trim();
  if (explanation.length < 5) throw new AppError('REASON_REQUIRED', 'Alasan penahanan minimal 5 karakter.');
  return transition(client, { id, expectedVersion, user, requestId, action: 'HOLD', reason: explanation, from: ['OPEN', 'CLAIMED', 'IN_PROGRESS'],
    set: { status: 'ON_HOLD', on_hold_reason: explanation.slice(0, 500) } });
}
async function cancelItem(client, { id, expectedVersion, reason, user, requestId }) {
  const explanation = String(reason || '').trim();
  if (explanation.length < 10) throw new AppError('REASON_REQUIRED', 'Alasan pembatalan minimal 10 karakter.');
  return transition(client, { id, expectedVersion, user, requestId, action: 'CANCEL', reason: explanation, from: ACTIVE,
    set: { status: 'CANCELLED', cancelled_by: user.id, cancelled_at: new Date(), cancel_reason: explanation.slice(0, 500) } });
}
async function delegateItem(client, { id, expectedVersion, toUserId, reason, user, requestId }) {
  const target = (await client.query('SELECT id FROM app_users WHERE id=$1 AND active', [toUserId])).rows[0];
  if (!target) throw new AppError('VALIDATION_ERROR', 'Penerima delegasi tidak ditemukan/aktif.');
  return transition(client, { id, expectedVersion, user, requestId, action: 'DELEGATE', reason: reason || null, from: ['OPEN', 'CLAIMED', 'IN_PROGRESS'],
    set: { delegated_to: target.id, delegated_by: user.id, delegated_at: new Date(),
      delegation_reason: reason ? String(reason).slice(0, 500) : null } });
}
async function escalateItem(client, { id, expectedVersion, toUserId = null, reason, user, requestId }) {
  let escalatedTo = null;
  if (toUserId) {
    const t = (await client.query('SELECT id FROM app_users WHERE id=$1 AND active', [toUserId])).rows[0];
    if (!t) throw new AppError('VALIDATION_ERROR', 'Penerima eskalasi tidak ditemukan/aktif.');
    escalatedTo = t.id;
  }
  return transition(client, { id, expectedVersion, user, requestId, action: 'ESCALATE', reason: reason || null, from: ['OPEN', 'CLAIMED', 'IN_PROGRESS', 'RETURNED', 'ON_HOLD'],
    set: { escalated: true, escalated_at: new Date(), escalated_to: escalatedTo, priority: 'HIGH' } });
}

module.exports = { createWorkItem, listWorkItems, myWork, claimItem, startItem, completeItem,
  returnItem, holdItem, cancelItem, delegateItem, escalateItem, ITEM_TYPES, PRIORITIES, RISKS };
