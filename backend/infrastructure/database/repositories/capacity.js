'use strict';
// Perencanaan kapasitas work center dan nilai barang dalam proses (WIP).
//
// capacity_hours_per_day ada sejak migrasi 012 tetapi tidak pernah diperiksa:
// work center 8 jam/hari dapat dijadwalkan 500 jam tanpa penolakan. Dan karena
// operasi tidak punya tanggal sampai migrasi 060, beban memang tidak dapat
// ditempatkan pada waktu — perencanaan kapasitas mustahil, bukan sekadar belum
// dikerjakan.
const { AppError } = require('../../../core/errors');
const permissions = require('../../../core/permissions');
const runtime = require('./runtime');
const businessDate = require('../../../core/business-date');

const round = (n) => Math.round(Number(n || 0) * 100) / 100;

async function operationWithScope(client, operationId, { forUpdate = false } = {}) {
  const row = (await client.query(
    `SELECT o.*,wc.code work_center_code,wc.name work_center_name,wc.capacity_hours_per_day,
       p.branch_id,d.status work_order_status,d.document_number
     FROM work_order_operations o
     JOIN work_centers wc ON wc.id=o.work_center_id
     JOIN plants p ON p.id=wc.plant_id
     JOIN business_documents d ON d.id=o.work_order_id
     WHERE o.id=$1${forUpdate ? ' FOR UPDATE OF o' : ''}`, [operationId])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Operasi work order tidak ditemukan.');
  return row;
}

// Beban terjadwal sebuah work center pada satu hari, TIDAK termasuk operasi
// yang sedang dinilai ulang (supaya menjadwal ulang tidak dihitung sebagai
// penambahan terhadap dirinya sendiri).
async function loadOn(client, workCenterId, date, { excludeOperationId = null } = {}) {
  const row = (await client.query(
    `SELECT COALESCE(SUM(o.planned_hours),0)::float hours
     FROM work_order_operations o JOIN business_documents d ON d.id=o.work_order_id
     WHERE o.work_center_id=$1 AND o.scheduled_date=$2 AND o.status<>'DONE'
       AND d.status NOT IN('CANCELLED','VOID','REJECTED','COMPLETED','CLOSED')
       AND ($3::uuid IS NULL OR o.id<>$3)`, [workCenterId, date, excludeOperationId])).rows[0];
  return round(row.hours);
}

// Menjadwalkan operasi pada satu tanggal. Kapasitas ditegakkan di sini —
// menjadwalkan melebihi kapasitas berarti menjanjikan sesuatu yang tidak dapat
// dikerjakan, dan janji itu akan terlihat sebagai keterlambatan di kemudian hari.
async function scheduleOperation(client, { operationId, scheduledDate, user, reason, requestId, allowOverload = false }) {
  permissions.assertPermission(user, 'production.edit');
  const op = await operationWithScope(client, operationId, { forUpdate: true });
  permissions.assertBranchScope(user, op.branch_id, 'Operasi produksi');
  if (op.status === 'DONE') throw new AppError('STATUS_INVALID', 'Operasi yang sudah selesai tidak dapat dijadwalkan ulang.');
  if (['CANCELLED', 'VOID', 'REJECTED', 'COMPLETED', 'CLOSED'].includes(op.work_order_status)) {
    throw new AppError('STATUS_INVALID', `Work order ${op.document_number} berstatus ${op.work_order_status}.`);
  }
  const date = businessDate.toBusinessDate(scheduledDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new AppError('VALIDATION_ERROR', 'Tanggal jadwal tidak valid.');

  const capacity = round(op.capacity_hours_per_day);
  const planned = round(op.planned_hours);
  const existing = await loadOn(client, op.work_center_id, date, { excludeOperationId: operationId });
  const projected = round(existing + planned);

  if (projected > capacity) {
    // Kelebihan beban boleh ditembus, tetapi HARUS disengaja dan beralasan —
    // bukan lolos diam-diam seperti sebelumnya.
    if (!allowOverload) {
      throw new AppError('VALIDATION_ERROR',
        `Kapasitas ${op.work_center_code} pada ${date} terlampaui: beban ${projected} jam melebihi kapasitas ${capacity} jam.`,
        { workCenter: op.work_center_code, date, capacityHours: capacity, existingHours: existing,
          requestedHours: planned, projectedHours: projected, overloadHours: round(projected - capacity) });
    }
    if (!String(reason || '').trim()) {
      throw new AppError('REASON_REQUIRED', 'Penjadwalan melebihi kapasitas wajib disertai alasan tertulis.');
    }
  }

  await client.query('UPDATE work_order_operations SET scheduled_date=$2 WHERE id=$1', [operationId, date]);
  await runtime.audit(client, { userId: user.id, action: 'SCHEDULE', module: 'production',
    entityType: 'WORK_ORDER_OPERATION', entityId: operationId, documentNumber: op.document_number, reason,
    oldValue: op.scheduled_date ? { scheduledDate: op.scheduled_date } : null,
    newValue: { scheduledDate: date, workCenter: op.work_center_code, plannedHours: planned,
      projectedHours: projected, capacityHours: capacity, overloaded: projected > capacity },
    requestId, branchId: op.branch_id });
  return { operationId, scheduledDate: date, workCenter: op.work_center_code,
    capacityHours: capacity, projectedHours: projected, overloaded: projected > capacity };
}

// Papan kapasitas: beban vs kapasitas per hari untuk satu rentang.
async function capacityBoard(client, { branchId, from, to, user }) {
  permissions.assertPermission(user, 'production.view');
  permissions.assertBranchScope(user, branchId, 'Kapasitas produksi');
  const start = businessDate.toBusinessDate(from || businessDate.today());
  const end = businessDate.toBusinessDate(to || businessDate.addDays(start, 13));
  const rows = (await client.query(
    `SELECT work_center_id,work_center_code,work_center_name,scheduled_date,capacity_hours,planned_hours,operation_count
     FROM work_center_daily_load
     WHERE branch_id=$1 AND scheduled_date BETWEEN $2 AND $3
     ORDER BY work_center_code,scheduled_date`, [branchId, start, end])).rows;
  return {
    from: start, to: end,
    items: rows.map((r) => ({
      workCenterId: r.work_center_id, workCenterCode: r.work_center_code, workCenterName: r.work_center_name,
      date: businessDate.toBusinessDate(r.scheduled_date),
      capacityHours: round(r.capacity_hours), plannedHours: round(r.planned_hours),
      availableHours: round(Math.max(0, r.capacity_hours - r.planned_hours)),
      utilizationPct: r.capacity_hours > 0 ? Math.round(r.planned_hours / r.capacity_hours * 100) : 0,
      overloaded: round(r.planned_hours) > round(r.capacity_hours),
      operationCount: r.operation_count
    }))
  };
}

// Nilai yang sedang tertahan di lantai produksi. Sebelumnya job costing baru
// dihitung saat WO SELESAI, sehingga selama pekerjaan berjalan tidak ada yang
// tahu berapa uang yang sudah masuk ke dalamnya.
async function wipSummary(client, { branchId, user }) {
  permissions.assertPermission(user, 'production.view');
  permissions.assertBranchScope(user, branchId, 'WIP produksi');
  const rows = (await client.query(
    `SELECT * FROM work_order_wip WHERE branch_id=$1 ORDER BY wip_value DESC`, [branchId])).rows;
  const totals = rows.reduce((acc, r) => ({
    materialCost: acc.materialCost + Number(r.material_cost),
    laborCost: acc.laborCost + Number(r.labor_cost),
    wipValue: acc.wipValue + Number(r.wip_value)
  }), { materialCost: 0, laborCost: 0, wipValue: 0 });
  return {
    branchId,
    openWorkOrders: rows.length,
    totals: { materialCost: round(totals.materialCost), laborCost: round(totals.laborCost), wipValue: round(totals.wipValue) },
    items: rows.map((r) => ({
      workOrderId: r.work_order_id, documentNumber: r.document_number, title: r.title, status: r.status,
      materialCost: round(r.material_cost), laborCost: round(r.labor_cost), wipValue: round(r.wip_value),
      issuedLines: r.issued_lines, doneOperations: r.done_operations, totalOperations: r.total_operations,
      progressPct: r.total_operations > 0 ? Math.round(r.done_operations / r.total_operations * 100) : 0
    }))
  };
}

// Jam aktual dicatat saat operasi selesai; tanpa ini biaya tenaga kerja WIP
// selalu nol dan job costing hanya memakai angka rencana.
async function recordActualHours(client, { operationId, hours, user, requestId }) {
  permissions.assertPermission(user, 'production.edit');
  const op = await operationWithScope(client, operationId, { forUpdate: true });
  permissions.assertBranchScope(user, op.branch_id, 'Operasi produksi');
  const value = round(hours);
  if (!(value >= 0)) throw new AppError('VALIDATION_ERROR', 'Jam aktual tidak boleh negatif.');
  await client.query('UPDATE work_order_operations SET actual_hours=$2 WHERE id=$1', [operationId, value]);
  await runtime.audit(client, { userId: user.id, action: 'UPDATE', module: 'production',
    entityType: 'WORK_ORDER_OPERATION', entityId: operationId, documentNumber: op.document_number,
    oldValue: { actualHours: Number(op.actual_hours) }, newValue: { actualHours: value },
    requestId, branchId: op.branch_id });
  return { operationId, actualHours: value, laborCost: round(value * Number(op.hourly_rate_snapshot)) };
}

module.exports = { scheduleOperation, capacityBoard, wipSummary, recordActualHours, loadOn };
