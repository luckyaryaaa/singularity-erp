'use strict';
// Mesin tugas eksekusi gudang (WMS minimal task flow) — §9.8 blueprint.
//
// Receiving, put-away, pick, pack, ship, dan cycle count menjadi TUGAS bertipe
// yang dapat ditugaskan, diklaim, dikerjakan, dan diaudit — bukan mutasi stok
// yang terjadi diam-diam. Engine ini berdiri di atas model lot/bin yang sudah
// ada (migrasi 058); ledger stok tidak diubah. Tugas PUTAWAY menyelesaikan diri
// dengan memanggil penempatan lot yang sudah ada, sehingga tidak ada jalur
// mutasi kedua yang bisa menyimpang dari kenyataan.
const { randomUUID } = require('node:crypto');
const { AppError } = require('../../../core/errors');
const permissions = require('../../../core/permissions');
const runtime = require('./runtime');
const binExecution = require('./bin-execution');

const TASK_TYPES = ['RECEIVE', 'PUTAWAY', 'PICK', 'PACK', 'SHIP', 'COUNT'];
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
const OPEN_STATES = ['OPEN', 'CLAIMED', 'IN_PROGRESS'];
const num = (v) => Math.round(Number(v || 0) * 10000) / 10000;

const ENRICH = `SELECT t.*,
    p.code product_code, p.name product_name, p.uom,
    fb.bin_code from_bin_code, tb.bin_code to_bin_code,
    l.lot_number, l.heat_number,
    w.code org_warehouse_code, w.name org_warehouse_name,
    sl.code storage_location_code,
    (SELECT s.status FROM warehouse_scan_sessions s WHERE s.task_id=t.id
      ORDER BY s.started_at DESC LIMIT 1) scan_session_status,
    b.name branch_name,
    d.document_number source_document_number, d.document_type source_document_type,
    ua.display_name assigned_to_name, uc.display_name created_by_name,
    ucl.display_name claimed_by_name, ucm.display_name completed_by_name
  FROM warehouse_tasks t
  LEFT JOIN products p ON p.id = t.product_id
  LEFT JOIN stock_lots l ON l.id = t.lot_id
  LEFT JOIN org_warehouses w ON w.id = t.org_warehouse_id
  LEFT JOIN storage_locations sl ON sl.id = t.storage_location_id
  LEFT JOIN warehouse_bin_scope fb ON fb.bin_id = t.from_bin_id
  LEFT JOIN warehouse_bin_scope tb ON tb.bin_id = t.to_bin_id
  LEFT JOIN branches b ON b.id = t.branch_id
  LEFT JOIN business_documents d ON d.id = t.source_document_id
  LEFT JOIN app_users ua ON ua.id = t.assigned_to
  LEFT JOIN app_users uc ON uc.id = t.created_by
  LEFT JOIN app_users ucl ON ucl.id = t.claimed_by
  LEFT JOIN app_users ucm ON ucm.id = t.completed_by`;

function mapRow(r) {
  const task = runtime.camel(r);
  task.qty = r.qty === null ? null : num(r.qty);
  task.overdue = Boolean(r.due_at) && OPEN_STATES.includes(r.status) && new Date(r.due_at) < new Date();
  return task;
}

async function loadEnriched(client, id) {
  return (await client.query(`${ENRICH} WHERE t.id = $1`, [id])).rows[0];
}

// Rak wajib berada di cabang tugas — kalau tidak, put-away/pick menunjuk rak
// milik cabang lain dan neraca gudang menjadi dusta yang tidak kelihatan.
async function assertBinInBranch(client, binId, branchId, user, label) {
  if (!binId) return;
  await binExecution.resolveBin(client, binId, { branchId, user });
  void label;
}

async function createTask(client, input, user, requestId) {
  permissions.assertPermission(user, 'inventory.edit');
  const taskType = String(input.taskType || '').toUpperCase();
  if (!TASK_TYPES.includes(taskType)) {
    throw new AppError('VALIDATION_ERROR', `Jenis tugas tidak dikenal: ${input.taskType}.`,
      { allowed: TASK_TYPES });
  }
  const priority = input.priority ? String(input.priority).toUpperCase() : 'NORMAL';
  if (!PRIORITIES.includes(priority)) {
    throw new AppError('VALIDATION_ERROR', `Prioritas tidak dikenal: ${input.priority}.`);
  }
  const branchId = input.branchId || user.branchId;
  if (!branchId) throw new AppError('VALIDATION_ERROR', 'Cabang gudang wajib diisi.');
  permissions.assertBranchScope(user, branchId, 'Tugas gudang');

  const qty = input.qty === undefined || input.qty === null || input.qty === '' ? null : num(input.qty);
  if (qty !== null && !(qty > 0)) throw new AppError('VALIDATION_ERROR', 'Qty tugas harus lebih dari nol.');

  // Konsistensi struktural dijaga sebelum menyentuh baris apa pun.
  if (taskType === 'PUTAWAY' && (!input.lotId || !input.toBinId)) {
    throw new AppError('VALIDATION_ERROR', 'Tugas put-away wajib menyertakan lot dan rak tujuan.');
  }
  if (taskType === 'PICK' && !input.lotId) {
    throw new AppError('VALIDATION_ERROR', 'Tugas pick wajib menyertakan lot.');
  }
  if (input.lotId) {
    const lot = (await client.query(
      'SELECT id, warehouse_id FROM stock_lots WHERE id = $1', [input.lotId])).rows[0];
    if (!lot) throw new AppError('RESOURCE_NOT_FOUND', 'Lot tidak ditemukan.');
    if (String(lot.warehouse_id) !== String(branchId)) {
      throw new AppError('VALIDATION_ERROR', 'Lot berada di cabang lain dari tugas ini.');
    }
  }
  await assertBinInBranch(client, input.fromBinId, branchId, user, 'Rak asal');
  await assertBinInBranch(client, input.toBinId, branchId, user, 'Rak tujuan');

  const scanPolicy = input.scanPolicy && typeof input.scanPolicy === 'object' && !Array.isArray(input.scanPolicy)
    ? input.scanPolicy : {};
  if (['PACK', 'SHIP'].includes(taskType) && input.scanRequired && !scanPolicy.handlingUnitId) {
    throw new AppError('VALIDATION_ERROR', `${taskType} dengan scan wajib memerlukan handlingUnitId.`);
  }

  let assignedTo = null;
  if (input.assignedTo) {
    const target = (await client.query(
      'SELECT id FROM app_users WHERE id = $1 AND active', [input.assignedTo])).rows[0];
    if (!target) throw new AppError('VALIDATION_ERROR', 'Petugas tujuan tidak ditemukan/aktif.');
    assignedTo = target.id;
  }

  const id = randomUUID();
  await client.query(
    `INSERT INTO warehouse_tasks
       (id, task_type, priority, branch_id, product_id, lot_id, from_bin_id, to_bin_id, qty,
        source_module, source_document_id, reference, instructions, due_at, assigned_to, created_by,
        org_warehouse_id,storage_location_id,scan_required,scan_policy)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
    [id, taskType, priority, branchId, input.productId || null, input.lotId || null,
      input.fromBinId || null, input.toBinId || null, qty,
      input.sourceModule ? String(input.sourceModule).slice(0, 30) : null,
      input.sourceDocumentId || null,
      input.reference ? String(input.reference).slice(0, 500) : null,
      input.instructions ? String(input.instructions).slice(0, 1000) : null,
      input.dueAt || null, assignedTo, user.id,
      input.orgWarehouseId || null, input.storageLocationId || null,
      Boolean(input.scanRequired), JSON.stringify(scanPolicy)]);

  await runtime.audit(client, { userId: user.id, action: 'CREATE', module: 'inventory',
    entityType: 'WAREHOUSE_TASK', entityId: id, reason: input.reference || null,
    newValue: { taskType, priority, branchId, lotId: input.lotId || null,
      toBinId: input.toBinId || null, qty, scanRequired: Boolean(input.scanRequired) },
    requestId, branchId });
  await runtime.actionRequired(client, {
    actionKey: `warehouse-task:${id}`, actorUserId: user.id, branchId,
    itemType: 'TASK', title: `Tugas gudang ${taskType}`,
    description: input.instructions || input.reference || `Eksekusi tugas ${taskType} di gudang.`,
    sourceModule: 'inventory', sourceEntityType: 'WAREHOUSE_TASK', sourceEntityId: id,
    assigneeUserId: assignedTo, assigneeRole: assignedTo ? null : 'warehouse',
    priority, risk: ['URGENT', 'HIGH'].includes(priority) ? 'HIGH' : 'MEDIUM',
    requiredAction: `Klaim, mulai, dan selesaikan tugas gudang ${taskType}.`,
    completionCondition: 'Warehouse task berstatus DONE atau CANCELLED.',
    dueAt: input.dueAt || null, slaMinutes: input.dueAt ? null : 480,
    link: '#/warehouse/inventory?tab=tugas'
  });
  return mapRow(await loadEnriched(client, id));
}

async function listTasks(client, user, { branchId = null, status = null, taskType = null,
  assignee = null, page = 1, limit = 25 } = {}) {
  permissions.assertPermission(user, 'inventory.view');
  const scope = branchId || user.branchId;
  permissions.assertBranchScope(user, scope, 'Tugas gudang');
  page = Math.max(Number(page) || 1, 1);
  limit = Math.min(Math.max(Number(limit) || 25, 1), 100);

  const params = [scope];
  let where = 't.branch_id = $1';
  if (status && String(status).toUpperCase() !== 'ALL') {
    params.push(String(status).toUpperCase()); where += ` AND t.status = $${params.length}`;
  }
  if (taskType && String(taskType).toUpperCase() !== 'ALL') {
    params.push(String(taskType).toUpperCase()); where += ` AND t.task_type = $${params.length}`;
  }
  if (assignee === 'me') { params.push(user.id); where += ` AND t.assigned_to = $${params.length}`; }

  const total = Number((await client.query(
    `SELECT count(*) n FROM warehouse_tasks t WHERE ${where}`, params)).rows[0].n);
  // Ringkasan papan kerja dihitung dari cabang penuh, bukan halaman aktif.
  const sum = (await client.query(
    `SELECT
       count(*) FILTER (WHERE status='OPEN')::int open,
       count(*) FILTER (WHERE status='CLAIMED')::int claimed,
       count(*) FILTER (WHERE status='IN_PROGRESS')::int in_progress,
       count(*) FILTER (WHERE status='DONE')::int done,
       count(*) FILTER (WHERE status IN ('OPEN','CLAIMED','IN_PROGRESS')
                        AND due_at IS NOT NULL AND due_at < now())::int overdue
     FROM warehouse_tasks WHERE branch_id = $1`, [scope])).rows[0];

  params.push(limit, (page - 1) * limit);
  const rows = (await client.query(
    `${ENRICH} WHERE ${where}
     ORDER BY CASE t.status WHEN 'IN_PROGRESS' THEN 0 WHEN 'CLAIMED' THEN 1 WHEN 'OPEN' THEN 2 ELSE 3 END,
       CASE t.priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'NORMAL' THEN 2 ELSE 3 END,
       t.due_at NULLS LAST, t.created_at
     LIMIT $${params.length - 1} OFFSET $${params.length}`, params)).rows;

  return {
    items: rows.map(mapRow),
    summary: { open: sum.open, claimed: sum.claimed, inProgress: sum.in_progress, done: sum.done, overdue: sum.overdue },
    page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1)
  };
}

// Ambil tugas terkunci + jaga cakupan cabang + optimistic version dalam satu
// tempat, supaya setiap transisi memakai penjagaan yang sama.
async function lockForTransition(client, id, expectedVersion, user) {
  const row = (await client.query('SELECT * FROM warehouse_tasks WHERE id = $1 FOR UPDATE', [id])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Tugas gudang tidak ditemukan.');
  permissions.assertBranchScope(user, row.branch_id, 'Tugas gudang');
  if (Number(expectedVersion) !== Number(row.version)) {
    throw new AppError('DOCUMENT_CONFLICT',
      `Versi tugas Anda ${expectedVersion}, versi terbaru ${row.version}.`,
      { currentVersion: Number(row.version) });
  }
  return row;
}

async function transition(client, { id, expectedVersion, user, requestId, action, from, set, reason }) {
  permissions.assertPermission(user, 'inventory.edit');
  const row = await lockForTransition(client, id, expectedVersion, user);
  if (from && !from.includes(row.status)) {
    throw new AppError('STATUS_INVALID',
      `Tugas berstatus ${row.status} tidak dapat ${action.toLowerCase()}.`,
      { currentStatus: row.status, allowedFrom: from });
  }
  const cols = Object.keys(set);
  const assignments = cols.map((c, i) => `${c} = $${i + 3}`).join(', ');
  const updated = (await client.query(
    `UPDATE warehouse_tasks SET ${assignments}, version = version + 1
     WHERE id = $1 AND version = $2 RETURNING *`,
    [id, row.version, ...cols.map((c) => set[c])])).rows[0];
  if (!updated) throw new AppError('DOCUMENT_CONFLICT', 'Tugas berubah saat transisi diproses.');
  await runtime.audit(client, { userId: user.id, action, module: 'inventory',
    entityType: 'WAREHOUSE_TASK', entityId: id, reason: reason || null,
    oldValue: { status: row.status, version: row.version },
    newValue: { status: updated.status, version: updated.version },
    requestId, branchId: row.branch_id });
  return { row, updated };
}

async function claimTask(client, { id, expectedVersion, user, requestId }) {
  await transition(client, { id, expectedVersion, user, requestId, action: 'CLAIM',
    from: ['OPEN'], set: { status: 'CLAIMED', claimed_by: user.id, claimed_at: new Date(), assigned_to: user.id } });
  return mapRow(await loadEnriched(client, id));
}

async function startTask(client, { id, expectedVersion, user, requestId }) {
  await transition(client, { id, expectedVersion, user, requestId, action: 'START',
    from: ['CLAIMED'], set: { status: 'IN_PROGRESS', started_at: new Date() } });
  return mapRow(await loadEnriched(client, id));
}

async function cancelTask(client, { id, expectedVersion, reason, user, requestId }) {
  const explanation = String(reason || '').trim();
  if (explanation.length < 10) {
    throw new AppError('REASON_REQUIRED', 'Alasan pembatalan tugas minimal 10 karakter.');
  }
  const result = await transition(client, { id, expectedVersion, user, requestId, action: 'CANCEL', reason: explanation,
    from: OPEN_STATES,
    set: { status: 'CANCELLED', cancelled_by: user.id, cancelled_at: new Date(), cancel_reason: explanation.slice(0, 500) } });
  await runtime.actionResolved(client, {
    actionKey: `warehouse-task:${id}`, actorUserId: user.id, branchId: result.row.branch_id,
    sourceEntityType: 'WAREHOUSE_TASK', sourceEntityId: id,
    resolutionNote: `Tugas gudang dibatalkan: ${explanation}`
  });
  return mapRow(await loadEnriched(client, id));
}

// Menyelesaikan tugas. Untuk PUTAWAY, penyelesaian BENAR-BENAR memindahkan lot
// ke rak tujuan lewat penempatan lot yang sudah ada — bukan sekadar menandai
// selesai. Tipe lain menutup tugas sebagai bukti eksekusi; mutasi stoknya
// mengalir lewat dokumen sumbernya (GR/issue/delivery/opname).
async function completeTask(client, { id, expectedVersion, note, user, requestId }) {
  permissions.assertPermission(user, 'inventory.edit');
  const row = await lockForTransition(client, id, expectedVersion, user);
  if (!['CLAIMED', 'IN_PROGRESS'].includes(row.status)) {
    throw new AppError('STATUS_INVALID',
      `Tugas berstatus ${row.status} tidak dapat diselesaikan.`, { currentStatus: row.status });
  }
  if (row.scan_required) {
    const evidence = (await client.query(
      `SELECT id FROM warehouse_scan_sessions
       WHERE task_id=$1 AND status='COMPLETED' ORDER BY completed_at DESC LIMIT 1`, [id])).rows[0];
    if (!evidence) {
      throw new AppError('STATUS_INVALID',
        'Tugas ini mewajibkan sesi scan mobile yang lengkap sebelum dapat diselesaikan.');
    }
  }

  let effect = null;
  if (row.task_type === 'PUTAWAY') {
    // Delegasi ke penempatan lot yang sudah ada: ia mengunci lot, memvalidasi
    // rak & cabang, mencatat gerakan lot, dan mengaudit sendiri.
    effect = await binExecution.putaway(client, { lotId: row.lot_id, binId: row.to_bin_id,
      user, reason: `Penyelesaian tugas put-away gudang${note ? ` — ${String(note).slice(0, 200)}` : ''}`, requestId });
  }

  const updated = (await client.query(
    `UPDATE warehouse_tasks SET status='DONE', completed_by=$3, completed_at=now(),
       completion_note=$4, version=version+1
     WHERE id=$1 AND version=$2 RETURNING *`,
    [id, row.version, user.id, note ? String(note).slice(0, 1000) : null])).rows[0];
  if (!updated) throw new AppError('DOCUMENT_CONFLICT', 'Tugas berubah saat penyelesaian diproses.');
  await runtime.audit(client, { userId: user.id, action: 'COMPLETE', module: 'inventory',
    entityType: 'WAREHOUSE_TASK', entityId: id, reason: note || null,
    oldValue: { status: row.status, version: row.version },
    newValue: { status: 'DONE', version: updated.version, effect: effect ? 'lot moved' : 'closed' },
    requestId, branchId: row.branch_id });
  await runtime.actionResolved(client, {
    actionKey: `warehouse-task:${id}`, actorUserId: user.id, branchId: row.branch_id,
    sourceEntityType: 'WAREHOUSE_TASK', sourceEntityId: id,
    resolutionNote: note || `Tugas gudang ${row.task_type} selesai.`
  });
  const task = mapRow(await loadEnriched(client, id));
  task.effect = effect;
  return task;
}

module.exports = { createTask, listTasks, claimTask, startTask, completeTask, cancelTask,
  TASK_TYPES, PRIORITIES };
