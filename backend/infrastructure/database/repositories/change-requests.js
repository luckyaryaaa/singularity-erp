'use strict';
// P1-2 — Change Request engine.
//
// Perubahan master yang berdampak uang, pajak, atau kepatuhan tidak boleh
// tersimpan hanya karena satu orang menekan simpan. Kolom yang terdaftar di
// CONTROLLED_FIELDS dialihkan menjadi usulan; kolom lain tetap tersimpan
// langsung supaya operasi harian tidak tersendat.
//
// Memakai pola maker-checker yang sama dengan usulan kurs: pengusul tidak boleh
// menjadi pemutus. Ini BUKAN approval engine kedua — perubahan master bukan
// dokumen bisnis dan tidak melewati siklus dokumen (submit/approve/post).
const { randomUUID } = require('node:crypto');
const { AppError } = require('../../../core/errors');
const permissions = require('../../../core/permissions');
const { camel } = require('./runtime');

// Kolom terkendali per master, beserta alasan singkat mengapa dikendalikan.
// Sengaja SEMPIT: menggovernansi semua kolom akan melumpuhkan pekerjaan harian
// dan membuat orang mencari jalan pintas.
const CONTROLLED_FIELDS = Object.freeze({
  customers: {
    credit_limit_amount: 'Batas kredit menentukan eksposur yang boleh ditanggung perusahaan.',
    credit_hold: 'Melepas credit hold membuka pengiriman kepada pelanggan bermasalah.',
    payment_term_days: 'Termin pembayaran menentukan arus kas.',
    credit_term_days: 'Termin kredit menentukan arus kas.',
    npwp: 'Identitas pajak menentukan keabsahan Faktur Pajak.',
    ppn_status: 'Status PPN menentukan perlakuan pajak seluruh transaksi.',
    tax_treatment: 'Perlakuan pajak menentukan nilai yang dipungut.'
  },
  suppliers: {
    npwp: 'Identitas pajak menentukan pemotongan PPh dan kredit pajak masukan.',
    ppn_treatment: 'Perlakuan PPN menentukan nilai yang dibayarkan.',
    pph_treatment: 'Perlakuan PPh menentukan pemotongan pajak.',
    withholding_eligible: 'Kelayakan pemotongan menentukan kewajiban pajak.',
    onboarding_status: 'Status onboarding menentukan boleh-tidaknya bertransaksi.',
    risk_level: 'Tingkat risiko memengaruhi kelayakan pembayaran.'
  },
  products: {
    hpp: 'HPP menjadi dasar penilaian persediaan dan harga pokok penjualan.',
    price: 'Harga jual menentukan pendapatan yang diakui.'
  },
  employees: {
    base_salary: 'Gaji pokok menentukan payroll, BPJS, dan PPh 21.',
    bpjs: 'Data BPJS menentukan iuran dan kewajiban.'
  }
});

const controlledFor = (entityType) => CONTROLLED_FIELDS[entityType] || {};
const isControlled = (entityType, column) => Boolean(controlledFor(entityType)[column]);

// Izin memutuskan usulan: sengaja lebih tinggi daripada izin mengedit master.
// Kalau sama, pemisahan tugasnya hanya formalitas.
const DECIDER_PERMISSION = Object.freeze({
  customers: 'credit.approve', suppliers: 'supplier.approve',
  products: 'product.approve', employees: 'payroll.approve'
});

function assertCanDecide(user, entityType) {
  const code = DECIDER_PERMISSION[entityType];
  if (!code || !permissions.hasPermission(user, code)) {
    throw new AppError('PERMISSION_DENIED', `Izin '${code || 'khusus'}' dibutuhkan untuk memutuskan perubahan ${entityType}.`);
  }
}

// Bagi perubahan menjadi yang boleh langsung dan yang wajib diusulkan.
// Nilai yang TIDAK berubah dibuang lebih dulu supaya menyimpan ulang formulir
// tanpa mengubah apa pun tidak melahirkan usulan kosong.
function split(entityType, entries, current) {
  const direct = [], controlled = {};
  for (const [column, value] of entries) {
    const before = current?.[column];
    if (String(before ?? '') === String(value ?? '')) continue;      // tidak berubah
    if (isControlled(entityType, column)) controlled[column] = { from: before ?? null, to: value ?? null };
    else direct.push([column, value]);
  }
  return { direct, controlled };
}

async function submit(client, { entityType, entityId, changes, reason, user, label, branchId }) {
  if (!Object.keys(changes || {}).length) throw new AppError('VALIDATION_ERROR', 'Tidak ada perubahan terkendali untuk diusulkan.');
  const text = String(reason || '').trim();
  if (text.length < 10) throw new AppError('REASON_REQUIRED', 'Alasan perubahan wajib diisi minimal 10 karakter.');

  // Usulan lama atas entitas yang sama ditandai SUPERSEDED, bukan ditumpuk:
  // dua usulan terbuka atas kolom yang sama membuat pemutus tidak tahu mana
  // keadaan akhir yang sebenarnya diminta.
  const superseded = await client.query(
    `UPDATE change_requests SET status='SUPERSEDED' WHERE entity_type=$1 AND entity_id=$2 AND status='PENDING'`,
    [entityType, entityId]);
  const row = (await client.query(
    `INSERT INTO change_requests(id,entity_type,entity_id,entity_label,changes,reason,requested_by,branch_id)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [randomUUID(), entityType, entityId, label || null, JSON.stringify(changes), text, user.id, branchId || user.branchId || null])).rows[0];
  return { ...camel(row), supersededCount: superseded.rowCount };
}

async function list(client, user, { status = 'PENDING', entityType = null, limit = 50 } = {}) {
  const params = [status]; let where = 'c.status=$1';
  if (entityType) { params.push(entityType); where += ` AND c.entity_type=$${params.length}`; }
  if (user?.branchId && !permissions.CROSS_BRANCH_ROLES.includes(user.role) && user.branchScope !== '*') {
    params.push(user.branchId); where += ` AND (c.branch_id IS NULL OR c.branch_id=$${params.length})`;
  }
  params.push(Math.min(Math.max(Number(limit) || 50, 1), 200));
  const rows = (await client.query(`SELECT c.*,r.display_name requested_by_name,d.display_name decided_by_name
    FROM change_requests c
    JOIN app_users r ON r.id=c.requested_by
    LEFT JOIN app_users d ON d.id=c.decided_by
    WHERE ${where} ORDER BY c.requested_at DESC LIMIT $${params.length}`, params)).rows;
  return { items: rows.map(camel) };
}

// Menyetujui usulan MENERAPKAN perubahannya dalam transaksi yang sama, supaya
// keputusan dan penerapannya tidak pernah terpisah.
async function decide(client, { requestId, decision, reason, user }) {
  const verdict = String(decision || '').toUpperCase();
  if (!['APPROVED', 'REJECTED'].includes(verdict)) throw new AppError('VALIDATION_ERROR', 'Keputusan harus APPROVED atau REJECTED.');
  const request = (await client.query('SELECT * FROM change_requests WHERE id=$1 FOR UPDATE', [requestId])).rows[0];
  if (!request) throw new AppError('RESOURCE_NOT_FOUND', 'Usulan perubahan tidak ditemukan.');
  if (request.status !== 'PENDING') throw new AppError('STATUS_INVALID', `Usulan sudah berstatus ${request.status}.`);
  assertCanDecide(user, request.entity_type);
  permissions.assertBranchScope(user, request.branch_id, 'Usulan perubahan');
  if (String(request.requested_by) === String(user.id)) {
    throw new AppError('SOD_CONFLICT', 'Pengusul tidak boleh memutuskan usulannya sendiri.');
  }
  if (verdict === 'REJECTED' && !String(reason || '').trim()) {
    throw new AppError('REASON_REQUIRED', 'Alasan penolakan wajib diisi.');
  }

  let applied = null;
  if (verdict === 'APPROVED') {
    const columns = Object.keys(request.changes);
    const values = [request.entity_id];
    const sets = columns.map((column) => { values.push(request.changes[column].to); return `${column}=$${values.length}`; });
    sets.push('updated_at=now()');
    const result = await client.query(`UPDATE ${request.entity_type} SET ${sets.join(',')} WHERE id=$1 RETURNING id`, values);
    if (!result.rowCount) throw new AppError('RESOURCE_NOT_FOUND', `${request.entity_type} tujuan usulan sudah tidak ada.`);
    applied = columns;
  }
  const row = (await client.query(
    `UPDATE change_requests SET status=$2,decided_by=$3,decided_at=now(),decision_reason=$4 WHERE id=$1 RETURNING *`,
    [requestId, verdict, user.id, reason ? String(reason).slice(0, 1000) : null])).rows[0];
  return { ...camel(row), applied };
}

module.exports = { CONTROLLED_FIELDS, controlledFor, isControlled, split, submit, list, decide, assertCanDecide };
