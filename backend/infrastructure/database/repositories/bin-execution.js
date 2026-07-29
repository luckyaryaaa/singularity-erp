'use strict';
// Eksekusi bin — penempatan (put-away), pemindahan, dan pengambilan barang
// sampai tingkat rak.
//
// storage_locations dan warehouse_bins ada sejak migrasi 012 tetapi tidak
// pernah dirujuk satu baris kode pun: skema mati yang terlihat seperti fitur.
// Penyebabnya struktural — bin menggantung pada org_warehouses sedangkan stok
// menggantung pada branches, sehingga lot memang tidak mungkin di-join ke bin.
//
// Modul ini memakai lapisan LOT yang sudah ada sebagai pembawa lokasi, bukan
// membuat tabel saldo kedua: saldo per bin diturunkan dari lot, jadi tidak ada
// angka paralel yang bisa menyimpang dari kenyataan.
const { AppError } = require('../../../core/errors');
const permissions = require('../../../core/permissions');

const num = (v) => Math.round(Number(v || 0) * 10000) / 10000;

// Bin wajib berada pada cabang yang sama dengan lotnya. Tanpa penjagaan ini
// barang bisa "ditempatkan" di rak milik cabang lain dan neraca gudang menjadi
// dusta yang tidak kelihatan.
async function resolveBin(client, binId, { branchId, user } = {}) {
  const bin = (await client.query('SELECT * FROM warehouse_bin_scope WHERE bin_id=$1', [binId])).rows[0];
  if (!bin) throw new AppError('RESOURCE_NOT_FOUND', 'Bin tidak ditemukan.');
  if (!bin.bin_active) throw new AppError('VALIDATION_ERROR', `Bin ${bin.bin_code} non-aktif.`);
  if (branchId && String(bin.branch_id) !== String(branchId)) {
    throw new AppError('VALIDATION_ERROR',
      `Bin ${bin.bin_code} berada di cabang lain — barang tidak dapat ditempatkan di sana.`,
      { binBranchId: bin.branch_id, stockBranchId: branchId });
  }
  if (user) permissions.assertBranchScope(user, bin.branch_id, 'Bin');
  return bin;
}

async function getLot(client, lotId, { forUpdate = false } = {}) {
  const lot = (await client.query(
    `SELECT l.*,p.code product_code,p.name product_name FROM stock_lots l JOIN products p ON p.id=l.product_id
     WHERE l.id=$1${forUpdate ? ' FOR UPDATE OF l' : ''}`, [lotId])).rows[0];
  if (!lot) throw new AppError('RESOURCE_NOT_FOUND', 'Lot tidak ditemukan.');
  return lot;
}

// Penempatan awal: menaruh lot yang sudah diterima ke sebuah bin.
async function putaway(client, { lotId, binId, user, reason, requestId }) {
  permissions.assertPermission(user, 'inventory.edit');
  const lot = await getLot(client, lotId, { forUpdate: true });
  permissions.assertBranchScope(user, lot.warehouse_id, 'Lot');
  if (lot.status === 'CONSUMED' || Number(lot.qty_on_hand) <= 0) {
    throw new AppError('STATUS_INVALID', 'Lot sudah habis — tidak ada yang perlu ditempatkan.');
  }
  const bin = await resolveBin(client, binId, { branchId: lot.warehouse_id, user });
  if (lot.bin_id && String(lot.bin_id) === String(binId)) {
    throw new AppError('VALIDATION_ERROR', `Lot sudah berada di bin ${bin.bin_code}.`);
  }
  const previous = lot.bin_id;
  // Ledger kanonik mengikuti penempatan fisik: gudang lot diselaraskan ke gudang
  // rak tujuan (migrasi 076). resolveBin menjamin rak berada di cabang yang sama,
  // sehingga invariant "gudang stok selalu di cabangnya" tetap terpenuhi.
  await client.query('UPDATE stock_lots SET bin_id=$2,org_warehouse_id=$3,updated_at=now() WHERE id=$1',
    [lotId, binId, bin.org_warehouse_id]);
  await client.query(
    `INSERT INTO stock_lot_movements(lot_id,movement_type,qty,from_bin_id,to_bin_id,memo,created_by)
     VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [lotId, previous ? 'BIN_MOVE' : 'PUTAWAY', Number(lot.qty_on_hand), previous || null, binId,
      reason ? String(reason).slice(0, 500) : (previous ? 'Pemindahan antar bin' : 'Penempatan awal'), user.id]);

  const runtime = require('./runtime');
  await runtime.audit(client, { userId: user.id, action: previous ? 'BIN_MOVE' : 'PUTAWAY', module: 'inventory',
    entityType: 'STOCK_LOT', entityId: lotId, reason,
    oldValue: previous ? { binId: previous } : null,
    newValue: { binId, binCode: bin.bin_code, qty: Number(lot.qty_on_hand) },
    requestId, branchId: lot.warehouse_id });
  return { lotId, lotNumber: lot.lot_number, productCode: lot.product_code,
    fromBinId: previous || null, toBinId: binId, binCode: bin.bin_code, qty: Number(lot.qty_on_hand) };
}

// Isi sebuah bin — dipakai layar gudang dan penghitungan fisik.
async function binContents(client, binId, user) {
  permissions.assertPermission(user, 'inventory.view');
  const bin = await resolveBin(client, binId, { user });
  const rows = (await client.query(
    `SELECT l.id,l.lot_number,l.heat_number,l.qty_on_hand::float,l.status,p.code product_code,p.name product_name,p.uom
     FROM stock_lots l JOIN products p ON p.id=l.product_id
     WHERE l.bin_id=$1 AND l.qty_on_hand>0 AND l.status<>'CONSUMED' ORDER BY p.code,l.received_at`, [binId])).rows;
  return {
    bin: { id: bin.bin_id, code: bin.bin_code, type: bin.bin_type,
      storageLocation: bin.storage_location_code, warehouse: bin.org_warehouse_code, branchId: bin.branch_id },
    items: rows.map((r) => ({ lotId: r.id, lotNumber: r.lot_number, heatNumber: r.heat_number,
      productCode: r.product_code, productName: r.product_name, uom: r.uom, qtyOnHand: r.qty_on_hand, status: r.status })),
    totalQty: num(rows.reduce((s, r) => s + Number(r.qty_on_hand), 0))
  };
}

// Di rak mana sebuah produk berada — pertanyaan operasional paling sering di
// gudang, dan sebelumnya tidak terjawab sama sekali.
async function locateProduct(client, { productId, branchId, user }) {
  permissions.assertPermission(user, 'inventory.view');
  permissions.assertBranchScope(user, branchId, 'Gudang');
  const rows = (await client.query(
    `SELECT bin_id,bin_code,storage_location_code,org_warehouse_code,qty_on_hand,lot_count
     FROM stock_bin_balance WHERE product_id=$1 AND branch_id=$2 ORDER BY qty_on_hand DESC`,
    [productId, branchId])).rows;
  const placed = num(rows.reduce((s, r) => s + Number(r.qty_on_hand), 0));
  // Stok yang belum ditempatkan bukan kesalahan: bin bersifat bertahap, dan
  // angkanya ditampilkan jujur supaya orang tahu apa yang belum dirapikan.
  const unplaced = Number((await client.query(
    `SELECT COALESCE(SUM(qty_on_hand),0)::float q FROM stock_lots
     WHERE product_id=$1 AND warehouse_id=$2 AND bin_id IS NULL AND qty_on_hand>0 AND status<>'CONSUMED'`,
    [productId, branchId])).rows[0].q);
  return {
    productId,
    branchId,
    placedQty: placed,
    unplacedQty: num(unplaced),
    bins: rows.map((r) => ({ binId: r.bin_id, binCode: r.bin_code, storageLocation: r.storage_location_code,
      warehouse: r.org_warehouse_code, qtyOnHand: r.qty_on_hand, lotCount: r.lot_count }))
  };
}

// Daftar bin sebuah cabang beserta isinya — dasar layar gudang.
async function listBins(client, { branchId, user }) {
  permissions.assertPermission(user, 'inventory.view');
  permissions.assertBranchScope(user, branchId, 'Gudang');
  const rows = (await client.query(
    `SELECT sc.bin_id,sc.bin_code,sc.bin_type,sc.bin_active,sc.storage_location_code,sc.org_warehouse_code,
       COALESCE(SUM(b.qty_on_hand),0)::float qty_on_hand,
       COUNT(DISTINCT b.product_id)::int product_count
     FROM warehouse_bin_scope sc
     LEFT JOIN stock_bin_balance b ON b.bin_id=sc.bin_id
     WHERE sc.branch_id=$1
     GROUP BY sc.bin_id,sc.bin_code,sc.bin_type,sc.bin_active,sc.storage_location_code,sc.org_warehouse_code
     ORDER BY sc.org_warehouse_code,sc.storage_location_code,sc.bin_code`, [branchId])).rows;
  return { items: rows.map((r) => ({ binId: r.bin_id, code: r.bin_code, type: r.bin_type, active: r.bin_active,
    storageLocation: r.storage_location_code, warehouse: r.org_warehouse_code,
    qtyOnHand: r.qty_on_hand, productCount: r.product_count })) };
}

module.exports = { putaway, binContents, locateProduct, listBins, resolveBin };
