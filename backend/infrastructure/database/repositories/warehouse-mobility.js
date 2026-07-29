'use strict';
// WMS Mobility Stage 2A — license plate/handling unit dan bukti scan berurutan.
// Seluruh keputusan lokasi memakai org_warehouse_id; branch_id tetap menjadi
// security scope selama compatibility cutover canonical warehouse berlangsung.
const { randomUUID } = require('node:crypto');
const { AppError } = require('../../../core/errors');
const permissions = require('../../../core/permissions');
const businessDate = require('../../../core/business-date');
const runtime = require('./runtime');
const binExecution = require('./bin-execution');

const HU_TYPES = ['PALLET', 'CRATE', 'BOX', 'BUNDLE', 'CONTAINER'];
const HU_TRANSITIONS = {
  SEAL: { from: ['OPEN'], to: 'SEALED' },
  STAGE: { from: ['SEALED'], to: 'STAGED' },
  LOAD: { from: ['STAGED'], to: 'LOADED' },
  SHIP: { from: ['LOADED'], to: 'SHIPPED' },
  VOID: { from: ['OPEN', 'SEALED'], to: 'VOID' }
};
const num = (v) => Math.round(Number(v || 0) * 10000) / 10000;
const codePart = (v) => String(v || '').trim().toUpperCase();

async function canonicalWarehouse(client, branchId, requestedId = null) {
  const row = (await client.query(
    `SELECT id,code,name FROM org_warehouses
     WHERE branch_id=$1 AND active AND ($2::uuid IS NULL OR id=$2)
     ORDER BY is_default DESC LIMIT 1`, [branchId, requestedId])).rows[0];
  if (!row) throw new AppError('VALIDATION_ERROR', 'Gudang kanonik aktif tidak ditemukan pada cabang.');
  return row;
}

async function loadHu(client, id, { lock = false } = {}) {
  const row = (await client.query(
    `SELECT h.*,w.code warehouse_code,w.name warehouse_name,
       s.code storage_location_code,b.code bin_code,
       COALESCE((SELECT sum(i.qty) FROM warehouse_handling_unit_items i
                 WHERE i.handling_unit_id=h.id),0)::float total_qty,
       COALESCE((SELECT count(*) FROM warehouse_handling_unit_items i
                 WHERE i.handling_unit_id=h.id),0)::int item_count
     FROM warehouse_handling_units h
     JOIN org_warehouses w ON w.id=h.org_warehouse_id
     LEFT JOIN storage_locations s ON s.id=h.storage_location_id
     LEFT JOIN warehouse_bins b ON b.id=h.bin_id
     WHERE h.id=$1${lock ? ' FOR UPDATE OF h' : ''}`, [id])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Handling unit tidak ditemukan.');
  return runtime.camel(row);
}

async function listHandlingUnits(client, user, { branchId = null, status = null, limit = 50 } = {}) {
  permissions.assertPermission(user, 'inventory.view');
  const scope = branchId || user.branchId;
  permissions.assertBranchScope(user, scope, 'Handling unit');
  limit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const params = [scope];
  let where = 'h.branch_id=$1';
  if (status && codePart(status) !== 'ALL') {
    params.push(codePart(status)); where += ` AND h.status=$${params.length}`;
  }
  params.push(limit);
  const rows = (await client.query(
    `SELECT h.*,w.code warehouse_code,s.code storage_location_code,b.code bin_code,
       COALESCE(sum(i.qty),0)::float total_qty,count(i.id)::int item_count
     FROM warehouse_handling_units h
     JOIN org_warehouses w ON w.id=h.org_warehouse_id
     LEFT JOIN storage_locations s ON s.id=h.storage_location_id
     LEFT JOIN warehouse_bins b ON b.id=h.bin_id
     LEFT JOIN warehouse_handling_unit_items i ON i.handling_unit_id=h.id
     WHERE ${where}
     GROUP BY h.id,w.code,s.code,b.code
     ORDER BY h.updated_at DESC LIMIT $${params.length}`, params)).rows;
  return { items: rows.map(runtime.camel), total: rows.length };
}

async function createHandlingUnit(client, input, user, requestId) {
  permissions.assertPermission(user, 'inventory.edit');
  const branchId = input.branchId || user.branchId;
  permissions.assertBranchScope(user, branchId, 'Handling unit');
  const type = codePart(input.handlingUnitType || 'PALLET');
  if (!HU_TYPES.includes(type)) throw new AppError('VALIDATION_ERROR', 'Tipe handling unit tidak dikenal.');
  const warehouse = await canonicalWarehouse(client, branchId, input.orgWarehouseId || null);
  let bin = null;
  if (input.binId) {
    bin = await binExecution.resolveBin(client, input.binId, { branchId, user });
    if (String(bin.org_warehouse_id) !== String(warehouse.id)) {
      throw new AppError('VALIDATION_ERROR', 'Bin berada di gudang kanonik lain.');
    }
  }
  const id = randomUUID();
  const licensePlate = codePart(input.licensePlate ||
    `HU-${businessDate.today().replace(/-/g, '')}-${id.slice(0, 8)}`);
  if (!/^[A-Z0-9][A-Z0-9._/-]{4,79}$/.test(licensePlate)) {
    throw new AppError('VALIDATION_ERROR', 'License plate harus 5–80 karakter alfanumerik.');
  }
  try {
    await client.query(
      `INSERT INTO warehouse_handling_units
       (id,license_plate,branch_id,org_warehouse_id,storage_location_id,bin_id,
        handling_unit_type,gross_weight,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, licensePlate, branchId, warehouse.id, bin?.storage_location_id || input.storageLocationId || null,
        input.binId || null, type, input.grossWeight ?? null, user.id]);
  } catch (error) {
    if (error.code === '23505') throw new AppError('DUPLICATE_MASTER', 'License plate sudah digunakan.');
    throw error;
  }
  await runtime.audit(client, { userId: user.id, action: 'CREATE', module: 'inventory',
    entityType: 'HANDLING_UNIT', entityId: id, newValue: { licensePlate, type, orgWarehouseId: warehouse.id },
    requestId, branchId });
  return loadHu(client, id);
}

async function addHandlingUnitItem(client, { id, lotId, qty, user, requestId }) {
  permissions.assertPermission(user, 'inventory.edit');
  const hu = await loadHu(client, id, { lock: true });
  permissions.assertBranchScope(user, hu.branchId, 'Handling unit');
  if (hu.status !== 'OPEN') throw new AppError('STATUS_INVALID', 'Item hanya dapat diubah saat handling unit OPEN.');
  qty = num(qty);
  if (!(qty > 0)) throw new AppError('VALIDATION_ERROR', 'Qty handling unit harus lebih dari nol.');
  const lot = (await client.query('SELECT * FROM stock_lots WHERE id=$1 FOR UPDATE', [lotId])).rows[0];
  if (!lot) throw new AppError('RESOURCE_NOT_FOUND', 'Lot tidak ditemukan.');
  if (String(lot.warehouse_id) !== String(hu.branchId) ||
      String(lot.org_warehouse_id) !== String(hu.orgWarehouseId)) {
    throw new AppError('VALIDATION_ERROR', 'Lot berada di luar gudang handling unit.');
  }
  const allocated = Number((await client.query(
    `SELECT COALESCE(sum(i.qty),0) qty FROM warehouse_handling_unit_items i
     JOIN warehouse_handling_units h ON h.id=i.handling_unit_id
     WHERE i.lot_id=$1 AND h.status<>'VOID' AND h.id<>$2`, [lotId, id])).rows[0].qty);
  if (allocated + qty > Number(lot.qty_on_hand)) {
    throw new AppError('VALIDATION_ERROR', 'Qty handling unit melebihi saldo lot yang tersedia.',
      { qtyOnHand: Number(lot.qty_on_hand), alreadyAllocated: num(allocated) });
  }
  await client.query(
    `INSERT INTO warehouse_handling_unit_items
       (id,handling_unit_id,lot_id,branch_id,qty,created_by)
     VALUES($1,$2,$3,$4,$5,$6)
     ON CONFLICT(handling_unit_id,lot_id)
     DO UPDATE SET qty=EXCLUDED.qty`,
    [randomUUID(), id, lotId, hu.branchId, qty, user.id]);
  await client.query('UPDATE warehouse_handling_units SET version=version+1,updated_at=now() WHERE id=$1', [id]);
  await runtime.audit(client, { userId: user.id, action: 'UPDATE', module: 'inventory',
    entityType: 'HANDLING_UNIT', entityId: id, newValue: { lotId, qty },
    requestId, branchId: hu.branchId });
  return loadHu(client, id);
}

async function transitionHandlingUnit(client, { id, action, expectedVersion, reason, user, requestId }) {
  permissions.assertPermission(user, 'inventory.edit');
  const hu = await loadHu(client, id, { lock: true });
  permissions.assertBranchScope(user, hu.branchId, 'Handling unit');
  if (Number(expectedVersion) !== Number(hu.version)) {
    throw new AppError('DOCUMENT_CONFLICT', 'Versi handling unit sudah berubah.', { currentVersion: hu.version });
  }
  const rule = HU_TRANSITIONS[codePart(action)];
  if (!rule || !rule.from.includes(hu.status)) {
    throw new AppError('STATUS_INVALID', `Handling unit ${hu.status} tidak dapat menjalankan ${action}.`);
  }
  if (rule.to === 'SEALED' && Number(hu.itemCount) < 1) {
    throw new AppError('VALIDATION_ERROR', 'Handling unit kosong tidak dapat disegel.');
  }
  if (rule.to === 'VOID' && String(reason || '').trim().length < 10) {
    throw new AppError('REASON_REQUIRED', 'Void handling unit membutuhkan alasan minimal 10 karakter.');
  }
  const changed = (await client.query(
    `UPDATE warehouse_handling_units SET status=$3,version=version+1,updated_at=now()
     WHERE id=$1 AND version=$2 RETURNING version`, [id, expectedVersion, rule.to])).rows[0];
  if (!changed) throw new AppError('DOCUMENT_CONFLICT', 'Handling unit berubah saat diproses.');
  await runtime.audit(client, { userId: user.id, action: codePart(action), module: 'inventory',
    entityType: 'HANDLING_UNIT', entityId: id, reason,
    oldValue: { status: hu.status, version: hu.version },
    newValue: { status: rule.to, version: changed.version }, requestId, branchId: hu.branchId });
  return loadHu(client, id);
}

function requiredScans(task) {
  const policy = task.scan_policy || {};
  const step = (type, entityId, label) => ({ type, entityId, label });
  switch (task.task_type) {
    case 'PUTAWAY': return [step('LOT', task.lot_id, 'Pindai lot'), step('BIN', task.to_bin_id, 'Pindai bin tujuan')];
    case 'PICK': return [task.from_bin_id && step('BIN', task.from_bin_id, 'Pindai bin asal'),
      step('LOT', task.lot_id, 'Pindai lot'), policy.handlingUnitId && step('HU', policy.handlingUnitId, 'Pindai handling unit')].filter(Boolean);
    case 'PACK':
    case 'SHIP':
      if (!policy.handlingUnitId) throw new AppError('VALIDATION_ERROR', `${task.task_type} memerlukan handlingUnitId pada scan policy.`);
      return [step('HU', policy.handlingUnitId, 'Pindai handling unit')];
    case 'COUNT': {
      const binId = task.from_bin_id || task.to_bin_id;
      if (!binId) throw new AppError('VALIDATION_ERROR', 'COUNT memerlukan bin.');
      return [step('BIN', binId, 'Pindai bin hitung')];
    }
    case 'RECEIVE':
      if (!task.lot_id) throw new AppError('VALIDATION_ERROR', 'RECEIVE mobile memerlukan lot.');
      return [step('LOT', task.lot_id, 'Pindai lot diterima')];
    default: throw new AppError('VALIDATION_ERROR', 'Jenis tugas belum mendukung scan mobile.');
  }
}

async function startScanSession(client, { taskId, user, requestId }) {
  permissions.assertPermission(user, 'inventory.edit');
  const task = (await client.query('SELECT * FROM warehouse_tasks WHERE id=$1 FOR UPDATE', [taskId])).rows[0];
  if (!task) throw new AppError('RESOURCE_NOT_FOUND', 'Tugas gudang tidak ditemukan.');
  permissions.assertBranchScope(user, task.branch_id, 'Tugas gudang');
  if (!['CLAIMED', 'IN_PROGRESS'].includes(task.status)) {
    throw new AppError('STATUS_INVALID', 'Tugas harus diklaim atau dimulai sebelum scan.');
  }
  if (task.assigned_to && String(task.assigned_to) !== String(user.id) && user.role !== 'owner') {
    throw new AppError('PERMISSION_DENIED', 'Tugas ini ditugaskan kepada operator lain.');
  }
  const existing = (await client.query(
    `SELECT * FROM warehouse_scan_sessions WHERE task_id=$1 AND status IN ('ACTIVE','READY')`, [taskId])).rows[0];
  if (existing) return getScanSession(client, existing.id, user);
  const required = requiredScans(task);
  const id = randomUUID();
  await client.query(
    `INSERT INTO warehouse_scan_sessions
       (id,task_id,branch_id,org_warehouse_id,operator_id,required_scans)
     VALUES($1,$2,$3,$4,$5,$6)`,
    [id, taskId, task.branch_id, task.org_warehouse_id, user.id, JSON.stringify(required)]);
  await runtime.audit(client, { userId: user.id, action: 'START', module: 'inventory',
    entityType: 'WAREHOUSE_SCAN_SESSION', entityId: id,
    newValue: { taskId, requiredScans: required.length }, requestId, branchId: task.branch_id });
  return getScanSession(client, id, user);
}

async function resolveScan(client, type, rawCode) {
  const value = String(rawCode || '').trim();
  const stripped = value.includes(':') ? value.slice(value.indexOf(':') + 1).trim() : value;
  if (!stripped) throw new AppError('VALIDATION_ERROR', 'Kode scan kosong.');
  const sql = {
    LOT: ['SELECT id,warehouse_id branch_id,org_warehouse_id FROM stock_lots WHERE upper(lot_number)=upper($1)', stripped],
    BIN: [`SELECT bin_id id,branch_id,org_warehouse_id FROM warehouse_bin_scope
           WHERE upper(bin_code)=upper($1)`, stripped],
    HU: [`SELECT id,branch_id,org_warehouse_id FROM warehouse_handling_units
          WHERE upper(license_plate)=upper($1) AND status<>'VOID'`, stripped]
  }[type];
  if (!sql) throw new AppError('VALIDATION_ERROR', `Jenis scan ${type} belum didukung.`);
  const row = (await client.query(sql[0], [sql[1]])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', `${type} dengan kode tersebut tidak ditemukan.`);
  return row;
}

async function getScanSession(client, id, user) {
  permissions.assertPermission(user, 'inventory.view');
  const row = (await client.query(
    `SELECT s.*,t.task_type,t.reference,w.code warehouse_code
     FROM warehouse_scan_sessions s JOIN warehouse_tasks t ON t.id=s.task_id
     JOIN org_warehouses w ON w.id=s.org_warehouse_id WHERE s.id=$1`, [id])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Sesi scan tidak ditemukan.');
  permissions.assertBranchScope(user, row.branch_id, 'Sesi scan');
  const events = (await client.query(
    `SELECT sequence_no,scan_type,entity_id,scanned_code,device_label,scanned_at
     FROM warehouse_scan_events WHERE session_id=$1 ORDER BY sequence_no`, [id])).rows.map(runtime.camel);
  const result = runtime.camel(row);
  result.events = events;
  result.nextScan = result.requiredScans[result.scannedCount] || null;
  return result;
}

async function scan(client, { id, code, expectedVersion, deviceLabel, user, requestId }) {
  permissions.assertPermission(user, 'inventory.edit');
  const session = (await client.query(
    'SELECT * FROM warehouse_scan_sessions WHERE id=$1 FOR UPDATE', [id])).rows[0];
  if (!session) throw new AppError('RESOURCE_NOT_FOUND', 'Sesi scan tidak ditemukan.');
  permissions.assertBranchScope(user, session.branch_id, 'Sesi scan');
  if (String(session.operator_id) !== String(user.id) && user.role !== 'owner') {
    throw new AppError('PERMISSION_DENIED', 'Sesi scan dimiliki operator lain.');
  }
  if (Number(expectedVersion) !== Number(session.version)) {
    throw new AppError('DOCUMENT_CONFLICT', 'Versi sesi scan sudah berubah.', { currentVersion: Number(session.version) });
  }
  if (session.status !== 'ACTIVE') throw new AppError('STATUS_INVALID', 'Sesi scan tidak lagi menerima pemindaian.');
  const expected = session.required_scans[Number(session.scanned_count)];
  if (!expected) throw new AppError('STATUS_INVALID', 'Semua langkah scan sudah dipenuhi.');
  const prefix = String(code || '').includes(':') ? codePart(String(code).split(':', 1)[0]) : expected.type;
  if (prefix !== expected.type) {
    throw new AppError('VALIDATION_ERROR', `Urutan salah. Berikutnya wajib ${expected.type}.`,
      { expected: expected.type });
  }
  const entity = await resolveScan(client, expected.type, code);
  if (String(entity.id) !== String(expected.entityId) ||
      String(entity.branch_id) !== String(session.branch_id) ||
      String(entity.org_warehouse_id) !== String(session.org_warehouse_id)) {
    throw new AppError('VALIDATION_ERROR', 'Kode scan tidak cocok dengan tugas/gudang aktif.');
  }
  const nextCount = Number(session.scanned_count) + 1;
  await client.query(
    `INSERT INTO warehouse_scan_events
       (id,session_id,branch_id,sequence_no,scan_type,entity_id,scanned_code,device_label,scanned_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [randomUUID(), id, session.branch_id, nextCount, expected.type, entity.id,
      String(code).slice(0, 160), deviceLabel ? String(deviceLabel).slice(0, 120) : null, user.id]);
  const status = nextCount === session.required_scans.length ? 'READY' : 'ACTIVE';
  const changed = (await client.query(
    `UPDATE warehouse_scan_sessions SET scanned_count=$3,status=$4,version=version+1
     WHERE id=$1 AND version=$2 RETURNING version`, [id, session.version, nextCount, status])).rows[0];
  if (!changed) throw new AppError('DOCUMENT_CONFLICT', 'Sesi scan berubah saat diproses.');
  await runtime.audit(client, { userId: user.id, action: 'SCAN', module: 'inventory',
    entityType: 'WAREHOUSE_SCAN_SESSION', entityId: id,
    newValue: { sequence: nextCount, type: expected.type, status },
    requestId, branchId: session.branch_id });
  return getScanSession(client, id, user);
}

async function completeScanSession(client, { id, expectedVersion, user, requestId }) {
  permissions.assertPermission(user, 'inventory.edit');
  const row = (await client.query(
    'SELECT * FROM warehouse_scan_sessions WHERE id=$1 FOR UPDATE', [id])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Sesi scan tidak ditemukan.');
  permissions.assertBranchScope(user, row.branch_id, 'Sesi scan');
  if (Number(expectedVersion) !== Number(row.version)) {
    throw new AppError('DOCUMENT_CONFLICT', 'Versi sesi scan sudah berubah.', { currentVersion: Number(row.version) });
  }
  if (row.status !== 'READY') throw new AppError('STATUS_INVALID', 'Seluruh langkah scan harus dipenuhi terlebih dahulu.');
  await client.query(
    `UPDATE warehouse_scan_sessions SET status='COMPLETED',completed_at=now(),version=version+1
     WHERE id=$1 AND version=$2`, [id, row.version]);
  await runtime.audit(client, { userId: user.id, action: 'COMPLETE', module: 'inventory',
    entityType: 'WAREHOUSE_SCAN_SESSION', entityId: id,
    newValue: { status: 'COMPLETED', scannedCount: row.scanned_count },
    requestId, branchId: row.branch_id });
  return getScanSession(client, id, user);
}

async function dimensionHealth(client, user) {
  permissions.assertPermission(user, 'inventory.view');
  const row = (await client.query('SELECT * FROM warehouse_dimension_health')).rows[0];
  const result = runtime.camel(row);
  result.healthy = Object.values(row).every((value) => Number(value) === 0);
  return result;
}

module.exports = {
  listHandlingUnits, createHandlingUnit, addHandlingUnitItem, transitionHandlingUnit,
  startScanSession, getScanSession, scan, completeScanSession, dimensionHealth,
  HU_TYPES, HU_TRANSITIONS
};
