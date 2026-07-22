'use strict';
// P1-3 — workbench struktur organisasi.
//
// Sebelumnya business unit, cabang, departemen, cost center, profit center,
// plant, gudang, dan work location HANYA lahir dari seed migrasi: tidak ada
// satu pun jalur API untuk membuatnya. Membuka cabang baru atau menambah
// departemen menuntut developer menjalankan SQL langsung ke produksi — yang
// berarti tanpa validasi, tanpa jejak audit, dan tanpa persetujuan.
//
// Struktur organisasi bukan master data biasa: cabang menentukan penomoran
// dokumen, cakupan RLS, dan lokasi persediaan. Karena itu jalur ini menuntut
// izin organisasi, alasan tertulis, dan TIDAK PERNAH menghapus baris —
// penonaktifan saja, supaya dokumen historis tetap dapat ditelusuri.
const { randomUUID } = require('node:crypto');
const { AppError } = require('../../../core/errors');
const permissions = require('../../../core/permissions');
const { assertPermission } = permissions;
const { camel } = require('./runtime');

// Setiap tipe menyatakan kolomnya sendiri, induk yang wajib divalidasi, dan
// tabel mana yang merujuknya (untuk menolak penonaktifan yang memutus data).
const NODES = Object.freeze({
  'business-units': {
    table: 'business_units', scope: 'legal_entity',
    fields: ['code', 'name', 'active'], required: ['code', 'name'],
    references: [{ table: 'branches', column: 'business_unit_id', label: 'cabang' }]
  },
  branches: {
    table: 'branches', scope: 'legal_entity',
    fields: ['code', 'name', 'business_unit_id', 'active'], required: ['code', 'name'],
    parents: { business_unit_id: 'business_units' },
    references: [
      { table: 'business_documents', column: 'branch_id', label: 'dokumen' },
      { table: 'app_users', column: 'branch_id', label: 'pengguna' },
      { table: 'plants', column: 'branch_id', label: 'plant' },
      { table: 'org_warehouses', column: 'branch_id', label: 'gudang' }
    ]
  },
  departments: {
    table: 'departments', scope: 'legal_entity',
    fields: ['code', 'name', 'parent_id', 'head_employee_id', 'active'], required: ['code', 'name'],
    parents: { parent_id: 'departments', head_employee_id: 'employees' },
    references: [{ table: 'cost_centers', column: 'department_id', label: 'cost center' }]
  },
  'cost-centers': {
    table: 'cost_centers', scope: 'legal_entity',
    fields: ['code', 'name', 'department_id', 'branch_id', 'valid_from', 'valid_to', 'active'], required: ['code', 'name'],
    parents: { department_id: 'departments', branch_id: 'branches' },
    references: [{ table: 'business_documents', column: 'cost_center_id', label: 'dokumen' }]
  },
  'profit-centers': {
    table: 'profit_centers', scope: 'legal_entity',
    fields: ['code', 'name', 'active'], required: ['code', 'name'],
    references: [{ table: 'business_documents', column: 'profit_center_id', label: 'dokumen' }]
  },
  plants: {
    table: 'plants', scope: 'branch',
    fields: ['code', 'name', 'branch_id', 'plant_type', 'address', 'active'], required: ['code', 'name', 'branch_id'],
    parents: { branch_id: 'branches' },
    references: [{ table: 'work_centers', column: 'plant_id', label: 'work center' },
      { table: 'org_warehouses', column: 'plant_id', label: 'gudang' }]
  },
  warehouses: {
    table: 'org_warehouses', scope: 'branch',
    fields: ['code', 'name', 'branch_id', 'plant_id', 'warehouse_type', 'active'], required: ['code', 'name', 'branch_id'],
    parents: { branch_id: 'branches', plant_id: 'plants' },
    references: [{ table: 'storage_locations', column: 'warehouse_id', label: 'storage location' }]
  }
});

const snake = (key) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const specFor = (node) => {
  const spec = NODES[node];
  if (!spec) throw new AppError('RESOURCE_NOT_FOUND', `Tipe struktur '${node}' tidak dikenal.`);
  return spec;
};

async function list(client, user, node, { legalEntityId } = {}) {
  assertPermission(user, 'organization.view');
  await assertLegalEntityScope(client, user, legalEntityId);
  const spec = specFor(node);
  const where = spec.scope === 'legal_entity'
    ? 't.legal_entity_id=$1'
    : 't.branch_id IN (SELECT id FROM branches WHERE legal_entity_id=$1)';
  return {
    items: (await client.query(`SELECT t.* FROM ${spec.table} t WHERE ${where} ORDER BY t.code`, [legalEntityId])).rows.map(camel)
  };
}

// Permission modul saja tidak cukup: UUID legal entity berasal dari URL dan
// tidak boleh menjadi jalan pintas untuk membaca/mengubah struktur perusahaan
// lain. Sampai assignment berdimensi legal-entity tersedia, pengguna cabang
// hanya boleh memakai entitas dari cabangnya; peran lintas cabang eksplisit
// tetap dapat mengelola seluruh entitas.
async function assertLegalEntityScope(client, user, legalEntityId) {
  if (!legalEntityId) throw new AppError('VALIDATION_ERROR', 'Legal entity wajib dipilih.');
  if (permissions.CROSS_BRANCH_ROLES.includes(user?.role) || user?.branchScope === '*') return true;
  if (!user?.branchId) throw new AppError('PERMISSION_DENIED', 'Pengguna tidak memiliki cakupan organisasi.');
  const allowed = (await client.query(
    'SELECT 1 FROM branches WHERE id=$1 AND legal_entity_id=$2 AND active',
    [user.branchId, legalEntityId])).rowCount;
  if (!allowed) throw new AppError('PERMISSION_DENIED', 'Legal entity berada di luar cakupan Anda.');
  return true;
}

// Induk wajib berada di legal entity yang sama — struktur silang entitas
// membuat konsolidasi keuangan tidak dapat dipercaya.
async function assertParents(client, spec, body, legalEntityId) {
  for (const [column, parentNode] of Object.entries(spec.parents || {})) {
    const value = body[column];
    if (!value) continue;
    const parentTable = NODES[parentNode]?.table || parentNode;
    const scoped = parentNode === 'employees'
      ? `SELECT p.id FROM employees p JOIN branches b ON b.id=p.branch_id WHERE p.id=$1 AND b.legal_entity_id=$2`
      : NODES[parentNode]?.scope === 'branch'
      ? `SELECT p.id FROM ${parentTable} p JOIN branches b ON b.id=p.branch_id WHERE p.id=$1 AND b.legal_entity_id=$2`
      : `SELECT p.id FROM ${parentTable} p WHERE p.id=$1 AND p.legal_entity_id=$2`;
    const row = (await client.query(scoped, [value, legalEntityId])).rows[0];
    if (!row) throw new AppError('VALIDATION_ERROR', `Induk ${column} tidak ditemukan pada legal entity ini.`);
  }
  if (spec.table === 'org_warehouses' && body.plant_id && body.branch_id) {
    const sameBranch = (await client.query(
      'SELECT 1 FROM plants WHERE id=$1 AND branch_id=$2 AND active',
      [body.plant_id, body.branch_id])).rowCount;
    if (!sameBranch) throw new AppError('VALIDATION_ERROR', 'Plant gudang wajib berada pada cabang yang sama.');
  }
}

async function create(client, user, node, body, { legalEntityId, requestId }) {
  assertPermission(user, 'organization.create');
  await assertLegalEntityScope(client, user, legalEntityId);
  const spec = specFor(node);
  const reason = String(body.reason || '').trim();
  if (reason.length < 10) throw new AppError('REASON_REQUIRED', 'Alasan perubahan struktur wajib diisi minimal 10 karakter.');

  const payload = {};
  for (const field of spec.fields) {
    const value = body[field] !== undefined ? body[field] : body[field.replace(/_([a-z])/g, (_, c) => c.toUpperCase())];
    if (value !== undefined && value !== '') payload[field] = value;
  }
  for (const field of spec.required) {
    if (payload[field] === undefined) throw new AppError('VALIDATION_ERROR', `Kolom '${field}' wajib diisi.`);
  }
  payload.code = String(payload.code).trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9-]{1,19}$/.test(payload.code)) {
    throw new AppError('VALIDATION_ERROR', 'Kode struktur harus 2–20 karakter huruf besar, angka, atau tanda hubung.');
  }
  await assertParents(client, spec, payload, legalEntityId);
  if (spec.scope === 'legal_entity') payload.legal_entity_id = legalEntityId;

  const columns = Object.keys(payload), values = columns.map((c) => payload[c]);
  const row = (await client.query(
    `INSERT INTO ${spec.table}(id,${columns.join(',')}) VALUES($1,${columns.map((_, i) => `$${i + 2}`).join(',')}) RETURNING *`,
    [randomUUID(), ...values])).rows[0];

  const runtime = require('./runtime');
  await runtime.audit(client, { userId: user.id, action: 'CREATE', module: 'organization',
    entityType: spec.table.toUpperCase(), entityId: row.id, reason,
    newValue: payload, requestId, branchId: user.branchId });
  return camel(row);
}

async function update(client, user, node, id, body, { legalEntityId, requestId }) {
  assertPermission(user, 'organization.edit');
  await assertLegalEntityScope(client, user, legalEntityId);
  const spec = specFor(node);
  const reason = String(body.reason || '').trim();
  if (reason.length < 10) throw new AppError('REASON_REQUIRED', 'Alasan perubahan struktur wajib diisi minimal 10 karakter.');

  const targetSql = spec.scope === 'legal_entity'
    ? `SELECT t.* FROM ${spec.table} t WHERE t.id=$1 AND t.legal_entity_id=$2`
    : `SELECT t.* FROM ${spec.table} t JOIN branches b ON b.id=t.branch_id WHERE t.id=$1 AND b.legal_entity_id=$2`;
  const before = (await client.query(targetSql, [id, legalEntityId])).rows[0];
  if (!before) throw new AppError('RESOURCE_NOT_FOUND');
  // Kode tidak dapat diubah: nomor dokumen yang sudah terbit memuatnya, dan
  // mengubahnya membuat riwayat penomoran tidak lagi dapat ditelusuri.
  if (body.code !== undefined && String(body.code).toUpperCase() !== String(before.code).toUpperCase()) {
    throw new AppError('VALIDATION_ERROR', 'Kode struktur tidak dapat diubah — nomor dokumen yang sudah terbit memuatnya.');
  }
  const changes = {};
  for (const field of spec.fields) {
    if (field === 'code') continue;
    const value = body[field] !== undefined ? body[field] : body[field.replace(/_([a-z])/g, (_, c) => c.toUpperCase())];
    if (value === undefined) continue;
    if (String(before[field] ?? '') === String(value ?? '')) continue;
    changes[field] = value === '' ? null : value;
  }
  if (!Object.keys(changes).length) throw new AppError('VALIDATION_ERROR', 'Tidak ada perubahan.');
  const proposed = { ...before, ...changes };
  await assertParents(client, spec, proposed, legalEntityId);
  if (spec.table === 'departments' && changes.parent_id) {
    if (String(changes.parent_id) === String(id)) throw new AppError('VALIDATION_ERROR', 'Departemen tidak boleh menjadi induk dirinya sendiri.');
    const cycle = (await client.query(`WITH RECURSIVE ancestors AS (
      SELECT id,parent_id FROM departments WHERE id=$1 AND legal_entity_id=$3
      UNION ALL
      SELECT d.id,d.parent_id FROM departments d JOIN ancestors a ON d.id=a.parent_id
      WHERE d.legal_entity_id=$3
    ) SELECT 1 FROM ancestors WHERE id=$2 LIMIT 1`, [changes.parent_id, id, legalEntityId])).rowCount;
    if (cycle) throw new AppError('VALIDATION_ERROR', 'Perubahan induk akan membentuk siklus departemen.');
  }

  // Menonaktifkan struktur yang masih dipakai akan menggantung data yang
  // merujuknya — ditolak dengan menyebut apa yang menghalangi.
  if (changes.active === false) await assertNotReferenced(client, spec, id);

  const values = [id], sets = Object.entries(changes).map(([column, value]) => { values.push(value); return `${column}=$${values.length}`; });
  const row = (await client.query(`UPDATE ${spec.table} SET ${sets.join(',')} WHERE id=$1 RETURNING *`, values)).rows[0];

  const runtime = require('./runtime');
  await runtime.audit(client, { userId: user.id, action: 'UPDATE', module: 'organization',
    entityType: spec.table.toUpperCase(), entityId: id, reason,
    oldValue: Object.fromEntries(Object.keys(changes).map((k) => [k, before[k]])), newValue: changes,
    requestId, branchId: user.branchId });
  return camel(row);
}

async function assertNotReferenced(client, spec, id) {
  for (const ref of spec.references || []) {
    const used = (await client.query(`SELECT count(*)::int n FROM ${ref.table} WHERE ${ref.column}=$1`, [id])).rows[0].n;
    if (used > 0) {
      throw new AppError('DOCUMENT_CONFLICT',
        `Masih dipakai ${used} ${ref.label} — nonaktifkan atau pindahkan dulu sebelum struktur ini dinonaktifkan.`,
        { blockedBy: ref.table, count: used });
    }
  }
  return true;
}

module.exports = { NODES, list, create, update, assertNotReferenced, assertLegalEntityScope, specFor };
