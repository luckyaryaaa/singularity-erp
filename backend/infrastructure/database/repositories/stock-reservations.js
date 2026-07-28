'use strict';
// Mesin reservasi stok — SATU-SATUNYA jalur yang boleh menahan stok.
//
// Sebelumnya reservasi hanya kolom angka `inventory_balances.qty_reserved` yang
// dinaikkan/diturunkan langsung di beberapa tempat pada production.js. Angka
// tanpa asal-usul: tidak dapat dijawab siapa yang menahan stok, untuk dokumen
// apa, dan tidak dapat dilepas satu per satu — hanya dikurangi dan diharap
// benar. Setiap kesalahan pengurangan langsung menjadi stok hantu yang
// tersandera selamanya.
//
// Modul ini menggantikan cara itu. qty_reserved TETAP dipelihara sebagai cache
// (dibaca banyak query lama dan pemeriksaan assurance), tetapi kini SELALU
// diturunkan dari catatan reservasi, bukan sebaliknya.
const { randomUUID } = require('node:crypto');
const { AppError } = require('../../../core/errors');
const permissions = require('../../../core/permissions');
const runtime = require('./runtime');

const num = (v) => Math.round(Number(v || 0) * 10000) / 10000;
const lock = (client, productId, warehouseId) =>
  client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`stock:${productId}:${warehouseId}`]);

// Cache qty_reserved diselaraskan dari catatan. Dipanggil setelah SETIAP
// perubahan reservasi supaya kedua sumber tidak pernah berbeda.
async function syncBalance(client, productId, warehouseId) {
  const reserved = Number((await client.query(
    `SELECT COALESCE(SUM(qty - consumed_qty),0)::float q FROM stock_reservations
     WHERE product_id=$1 AND warehouse_id=$2 AND status='ACTIVE'`, [productId, warehouseId])).rows[0].q);
  await client.query(
    `INSERT INTO inventory_balances(id,product_id,warehouse_id,qty_reserved) VALUES($1,$2,$3,$4)
     ON CONFLICT(product_id,warehouse_id) DO UPDATE SET qty_reserved=$4,version=inventory_balances.version+1,updated_at=now()`,
    [randomUUID(), productId, warehouseId, reserved]);
  return reserved;
}

// Ketersediaan sebenarnya: di tangan dikurangi yang sudah ditahan orang lain.
async function availability(client, productId, warehouseId, { excludeDocumentId = null } = {}) {
  const row = (await client.query(
    `SELECT COALESCE(b.qty_on_hand,0)::float on_hand,
       COALESCE((SELECT SUM(r.qty - r.consumed_qty) FROM stock_reservations r
         WHERE r.product_id=$1 AND r.warehouse_id=$2 AND r.status='ACTIVE'
           AND ($3::uuid IS NULL OR r.document_id <> $3)),0)::float reserved
     FROM inventory_balances b WHERE b.product_id=$1 AND b.warehouse_id=$2`,
    [productId, warehouseId, excludeDocumentId])).rows[0]
    || { on_hand: 0, reserved: 0 };
  const onHand = Number(row.on_hand), reserved = Number(row.reserved);
  return { onHand, reserved, available: num(Math.max(0, onHand - reserved)) };
}

// Menahan stok. `allowPartial` untuk perencanaan produksi yang memang menerima
// kekurangan (dicatat sebagai shortage); penjualan memakai false supaya janji
// ke pelanggan tidak pernah setengah.
async function reserve(client, { productId, warehouseId, documentId, documentLineId = null,
  workOrderMaterialId = null, qty, reason, user, expiresAt = null, allowPartial = false }) {
  const want = num(qty);
  if (!(want > 0)) throw new AppError('VALIDATION_ERROR', 'Qty reservasi harus lebih dari nol.');
  if (!productId || !warehouseId || !documentId) throw new AppError('VALIDATION_ERROR', 'Produk, gudang, dan dokumen wajib untuk reservasi.');

  await lock(client, productId, warehouseId);
  const { available } = await availability(client, productId, warehouseId);
  const take = allowPartial ? num(Math.min(available, want)) : want;
  if (!allowPartial && want > available) {
    throw new AppError('VALIDATION_ERROR',
      `Stok tidak cukup untuk direservasi: diminta ${want}, tersedia ${available}.`,
      { requestedQty: want, availableQty: available, shortQty: num(want - available) });
  }
  if (take <= 0) return { reserved: 0, shortQty: num(want), reservationId: null };

  const row = (await client.query(
    `INSERT INTO stock_reservations(id,product_id,warehouse_id,document_id,document_line_id,work_order_material_id,qty,reason,expires_at,created_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [randomUUID(), productId, warehouseId, documentId, documentLineId, workOrderMaterialId, take, reason || null, expiresAt, user?.id || null])).rows[0];
  await syncBalance(client, productId, warehouseId);
  return { reserved: take, shortQty: num(want - take), reservationId: row.id };
}

// Memakai reservasi saat barang benar-benar keluar. Reservasi tertutup begitu
// habis terpakai, sehingga tidak ada sisa menggantung.
async function consume(client, { documentId, productId, warehouseId, qty, user }) {
  let remaining = num(qty);
  if (!(remaining > 0)) return { consumed: 0 };
  await lock(client, productId, warehouseId);
  const rows = (await client.query(
    `SELECT id,qty,consumed_qty FROM stock_reservations
     WHERE document_id=$1 AND product_id=$2 AND warehouse_id=$3 AND status='ACTIVE'
     ORDER BY created_at FOR UPDATE`, [documentId, productId, warehouseId])).rows;
  let consumed = 0;
  for (const r of rows) {
    if (remaining <= 0) break;
    const left = num(Number(r.qty) - Number(r.consumed_qty));
    const take = num(Math.min(left, remaining));
    const nowConsumed = num(Number(r.consumed_qty) + take);
    await client.query(
      `UPDATE stock_reservations SET consumed_qty=$2,
         status=CASE WHEN $2>=qty THEN 'CONSUMED' ELSE status END,
         released_at=CASE WHEN $2>=qty THEN now() ELSE released_at END,
         released_by=CASE WHEN $2>=qty THEN $3 ELSE released_by END,
         version=version+1
       WHERE id=$1`, [r.id, nowConsumed, user?.id || null]);
    remaining = num(remaining - take); consumed = num(consumed + take);
  }
  await syncBalance(client, productId, warehouseId);
  // Sisa yang tidak tertutup reservasi bukan error: barang boleh keluar tanpa
  // pernah direservasi (mis. penyesuaian). Yang penting angkanya jujur.
  return { consumed, unreserved: num(remaining) };
}

// Melepas reservasi sebuah dokumen — dipakai saat pembatalan, void, atau
// penutupan. Alasan wajib supaya pelepasan stok selalu dapat dipertanggungjawabkan.
async function releaseDocument(client, { documentId, reason, user, productId = null }) {
  const params = [documentId]; let where = "document_id=$1 AND status='ACTIVE'";
  if (productId) { params.push(productId); where += ` AND product_id=$${params.length}`; }
  const affected = (await client.query(
    `SELECT DISTINCT product_id,warehouse_id FROM stock_reservations WHERE ${where}`, params)).rows;
  if (!affected.length) return { released: 0, stocks: 0 };
  if (!String(reason || '').trim()) throw new AppError('REASON_REQUIRED', 'Alasan pelepasan reservasi wajib diisi.');

  const result = await client.query(
    `UPDATE stock_reservations SET status='RELEASED',released_at=now(),released_by=$${params.length + 1},
       release_reason=$${params.length + 2},version=version+1
     WHERE ${where}`, [...params, user?.id || null, String(reason).slice(0, 500)]);
  for (const s of affected) await syncBalance(client, s.product_id, s.warehouse_id);
  return { released: result.rowCount, stocks: affected.length };
}

// Reservasi kedaluwarsa dilepas otomatis — tanpa ini, stok yang ditahan
// pesanan yang tidak pernah berlanjut akan tersandera selamanya.
async function expireStale(client) {
  const affected = (await client.query(
    `SELECT DISTINCT product_id,warehouse_id FROM stock_reservations
     WHERE status='ACTIVE' AND expires_at IS NOT NULL AND expires_at<=now()`)).rows;
  if (!affected.length) return { expired: 0 };
  const result = await client.query(
    `UPDATE stock_reservations SET status='EXPIRED',released_at=now(),
       release_reason='Reservasi kedaluwarsa dilepas otomatis',version=version+1
     WHERE status='ACTIVE' AND expires_at IS NOT NULL AND expires_at<=now()`);
  for (const s of affected) await syncBalance(client, s.product_id, s.warehouse_id);
  return { expired: result.rowCount, stocks: affected.length };
}

// Siapa menahan stok ini, untuk dokumen apa — pertanyaan yang dulu tidak
// terjawab sama sekali.
async function listForStock(client, productId, warehouseId) {
  const rows = (await client.query(
    `SELECT r.id,r.qty::float,r.consumed_qty::float,r.status,r.reason,r.expires_at,r.created_at,
       d.document_number,d.document_type,d.status document_status,u.display_name created_by_name
     FROM stock_reservations r
     JOIN business_documents d ON d.id=r.document_id
     LEFT JOIN app_users u ON u.id=r.created_by
     WHERE r.product_id=$1 AND r.warehouse_id=$2 AND r.status='ACTIVE'
     ORDER BY r.created_at`, [productId, warehouseId])).rows;
  return { items: rows.map((r) => ({ id: r.id, qty: r.qty, consumedQty: r.consumed_qty, remainingQty: num(r.qty - r.consumed_qty),
    status: r.status, reason: r.reason, expiresAt: r.expires_at, createdAt: r.created_at,
    documentNumber: r.document_number, documentType: r.document_type, documentStatus: r.document_status, createdByName: r.created_by_name })) };
}

async function listForDocument(client, documentId) {
  const rows = (await client.query(
    `SELECT r.id,r.product_id,r.warehouse_id,r.qty::float,r.consumed_qty::float,r.status,p.code product_code,p.name product_name,b.name warehouse_name
     FROM stock_reservations r JOIN products p ON p.id=r.product_id LEFT JOIN branches b ON b.id=r.warehouse_id
     WHERE r.document_id=$1 ORDER BY r.created_at`, [documentId])).rows;
  return { items: rows.map((r) => ({ id: r.id, productId: r.product_id, productCode: r.product_code, productName: r.product_name,
    warehouseId: r.warehouse_id, warehouseName: r.warehouse_name, qty: r.qty, consumedQty: r.consumed_qty,
    remainingQty: num(r.qty - r.consumed_qty), status: r.status })) };
}

async function listReservations(client, user, { branchId = null, status = null,
  q = null, page = 1, limit = 25 } = {}) {
  permissions.assertPermission(user, 'inventory.view');
  const scope = branchId || user.branchId;
  permissions.assertBranchScope(user, scope, 'Reservasi stok');
  page = Math.max(Number(page) || 1, 1);
  limit = Math.min(Math.max(Number(limit) || 25, 1), 100);
  const params = [scope];
  let where = 'r.warehouse_id=$1';
  if (status && status !== 'ALL') {
    params.push(String(status).toUpperCase());
    where += ` AND r.status=$${params.length}`;
  }
  if (q) {
    params.push(`%${String(q).trim().slice(0, 120)}%`);
    where += ` AND (p.code ILIKE $${params.length} OR p.name ILIKE $${params.length}
      OR d.document_number ILIKE $${params.length} OR d.title ILIKE $${params.length})`;
  }
  const joins = `FROM stock_reservations r
    JOIN products p ON p.id=r.product_id
    JOIN business_documents d ON d.id=r.document_id
    LEFT JOIN branches b ON b.id=r.warehouse_id
    LEFT JOIN app_users u ON u.id=r.created_by`;
  const total = Number((await client.query(
    `SELECT count(*) n ${joins} WHERE ${where}`, params)).rows[0].n);
  params.push(limit, (page - 1) * limit);
  const rows = (await client.query(
    `SELECT r.*,p.code product_code,p.name product_name,d.document_number,
       d.document_type,d.title document_title,d.status document_status,
       b.name warehouse_name,u.display_name created_by_name,
       (r.qty-r.consumed_qty)::float remaining_qty
     ${joins} WHERE ${where}
     ORDER BY CASE WHEN r.status='ACTIVE' THEN 0 ELSE 1 END,r.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`, params)).rows;
  return { items: rows.map(runtime.camel), page, limit, total,
    totalPages: Math.max(Math.ceil(total / limit), 1) };
}

async function releaseReservation(client, { id, expectedVersion, reason, user, requestId }) {
  permissions.assertPermission(user, 'inventory.edit');
  const row = (await client.query(
    'SELECT * FROM stock_reservations WHERE id=$1 FOR UPDATE', [id])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Reservasi stok tidak ditemukan.');
  permissions.assertBranchScope(user, row.warehouse_id, 'Reservasi stok');
  if (Number(expectedVersion) !== Number(row.version)) {
    throw new AppError('DOCUMENT_CONFLICT',
      `Versi reservasi Anda ${expectedVersion}, versi terbaru ${row.version}.`,
      { currentVersion: Number(row.version) });
  }
  const explanation = String(reason || '').trim();
  if (explanation.length < 10) {
    throw new AppError('REASON_REQUIRED',
      'Alasan pelepasan reservasi minimal 10 karakter.');
  }
  if (row.status !== 'ACTIVE') {
    throw new AppError('STATUS_INVALID',
      `Reservasi berstatus ${row.status} tidak dapat dilepas.`);
  }
  const updated = (await client.query(
    `UPDATE stock_reservations
     SET status='RELEASED',released_at=now(),released_by=$2,
         release_reason=$3,version=version+1
     WHERE id=$1 AND version=$4 RETURNING *`,
    [id, user.id, explanation.slice(0, 500), row.version])).rows[0];
  if (!updated) throw new AppError('DOCUMENT_CONFLICT',
    'Reservasi berubah saat pelepasan diproses.');
  await syncBalance(client, row.product_id, row.warehouse_id);
  await runtime.audit(client, { userId: user.id, action: 'RELEASE',
    module: 'inventory', entityType: 'STOCK_RESERVATION', entityId: id,
    oldValue: { status: row.status, version: row.version },
    newValue: { status: updated.status, version: updated.version },
    reason: explanation, requestId, branchId: row.warehouse_id });
  return runtime.camel(updated);
}

module.exports = { reserve, consume, releaseDocument, expireStale, availability,
  syncBalance, listForStock, listForDocument, listReservations, releaseReservation };
