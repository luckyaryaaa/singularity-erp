'use strict';
// Sprint 11 (R018) — lapisan lot/serial/heat-number + stock opname.
// Menempel pada jalur posting inventori tunggal (posting.js postInventory);
// BUKAN engine paralel. Saldo agregat tetap dijaga inventory_balances;
// lapisan lot menambahkan traceability batch (heat number / mill certificate)
// yang wajib untuk fabrikasi baja. Konsumsi FIFO; stok lama tanpa lot
// (sebelum migrasi 020) boleh terpakai sebagai sisa "untracked".
const { randomUUID } = require('node:crypto');
const { AppError } = require('../../../core/errors');

async function lotMovement(client, { lotId, documentId, type, qty, fromWh, toWh, memo, userId }) {
  await client.query(`INSERT INTO stock_lot_movements(lot_id,document_id,movement_type,qty,from_warehouse_id,to_warehouse_id,memo,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [lotId, documentId || null, type, qty || 0, fromWh || null, toWh || null, memo || null, userId || null]);
}

// Lot baru dari baris dokumen (GR / penyesuaian masuk / transfer masuk).
// Heat number & mill certificate dibaca dari payload.lines[line_no-1].
async function receiveLotLine(client, doc, line, warehouseId, user, { movementType = 'RECEIPT', lotPrefix = 'L', unitCost, parentLotId = null, heat = null } = {}) {
  const meta = (Array.isArray(doc.payload?.lines) ? doc.payload.lines[line.line_no - 1] : null) || {};
  const cost = unitCost !== undefined ? Number(unitCost)
    : Number((await client.query('SELECT hpp FROM products WHERE id=$1', [line.product_id])).rows[0]?.hpp || 0);
  const supplier = doc.partyId ? (await client.query('SELECT id FROM suppliers WHERE id=$1', [doc.partyId])).rows[0] : null;
  const lot = (await client.query(`INSERT INTO stock_lots(id,lot_number,product_id,warehouse_id,heat_number,mill_cert_no,serial_number,supplier_id,source_document_id,parent_lot_id,qty_received,qty_on_hand,uom,unit_cost,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11,$12,$13,$14) RETURNING *`, [
    randomUUID(), `${doc.documentNumber}/${lotPrefix}${line.line_no}`, line.product_id, warehouseId,
    heat?.heatNumber ?? meta.heatNumber ?? null, heat?.millCertNo ?? meta.millCertNo ?? null, meta.serialNumber || null,
    supplier ? supplier.id : null, doc.id, parentLotId, Number(line.qty), line.uom || null, cost, user.id
  ])).rows[0];
  await lotMovement(client, { lotId: lot.id, documentId: doc.id, type: movementType, qty: Number(line.qty), toWh: warehouseId, userId: user.id, memo: lot.heat_number ? `heat ${lot.heat_number}` : null });
  return lot;
}

// Konsumsi FIFO (lot aktif tertua dulu). Lot BLOCKED/QUARANTINE dilewati.
// Sisa yang tidak tercakup lot = stok legacy tanpa lot — diizinkan; kecukupan
// saldo agregat sudah dijaga posting.balance().
async function consumeLots(client, { productId, warehouseId, qty, doc, user, type, toWarehouseId }) {
  let remaining = Number(qty);
  const picks = [];
  const rows = (await client.query(`SELECT * FROM stock_lots WHERE product_id=$1 AND warehouse_id=$2 AND status='ACTIVE' AND qty_on_hand>0
    ORDER BY received_at,created_at FOR UPDATE`, [productId, warehouseId])).rows;
  for (const lot of rows) {
    if (remaining <= 0) break;
    const take = Math.min(Number(lot.qty_on_hand), remaining);
    remaining = Math.round((remaining - take) * 10000) / 10000;
    const next = Math.round((Number(lot.qty_on_hand) - take) * 10000) / 10000;
    await client.query(`UPDATE stock_lots SET qty_on_hand=$2::numeric,status=CASE WHEN $2::numeric<=0 THEN 'CONSUMED' ELSE status END,version=version+1,updated_at=now() WHERE id=$1`, [lot.id, next]);
    await lotMovement(client, { lotId: lot.id, documentId: doc.id, type, qty: take, fromWh: warehouseId, toWh: toWarehouseId || null, userId: user.id });
    picks.push({ lot, take });
  }
  return { picks, untracked: remaining > 0 ? remaining : 0 };
}

// Transfer antar gudang: konsumsi FIFO di asal, lahirkan lot anak di tujuan
// dengan heat/cert/biaya/tanggal terima asli (lineage via parent_lot_id).
async function transferLots(client, { productId, fromWarehouseId, toWarehouseId, qty, doc, user }) {
  const { picks, untracked } = await consumeLots(client, { productId, warehouseId: fromWarehouseId, qty, doc, user, type: 'TRANSFER_OUT', toWarehouseId });
  let n = 0;
  for (const { lot, take } of picks) {
    n++;
    const child = (await client.query(`INSERT INTO stock_lots(id,lot_number,product_id,warehouse_id,heat_number,mill_cert_no,serial_number,supplier_id,source_document_id,parent_lot_id,received_at,qty_received,qty_on_hand,uom,unit_cost,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12,$13,$14,$15) RETURNING id`, [
      randomUUID(), `${doc.documentNumber}/T${n}`, productId, toWarehouseId, lot.heat_number, lot.mill_cert_no, lot.serial_number,
      lot.supplier_id, doc.id, lot.id, lot.received_at, take, lot.uom, lot.unit_cost, user.id
    ])).rows[0];
    await lotMovement(client, { lotId: child.id, documentId: doc.id, type: 'TRANSFER_IN', qty: take, fromWh: fromWarehouseId, toWh: toWarehouseId, userId: user.id, memo: `dari lot ${lot.lot_number}` });
  }
  return { moved: picks.length, untracked };
}

// Blokir / lepas lot (QC hold, karantina) — lot terblokir dilewati FIFO.
async function setLotStatus(client, { lotId, action, reason, user, requestId }) {
  const lot = (await client.query('SELECT * FROM stock_lots WHERE id=$1 FOR UPDATE', [lotId])).rows[0];
  if (!lot) throw new AppError('RESOURCE_NOT_FOUND', 'Lot tidak ditemukan.');
  let status;
  if (action === 'block' || action === 'quarantine') {
    if (lot.status !== 'ACTIVE') throw new AppError('STATUS_INVALID', `Lot berstatus ${lot.status} tidak dapat diblokir.`);
    if (!reason) throw new AppError('REASON_REQUIRED');
    status = action === 'block' ? 'BLOCKED' : 'QUARANTINE';
  } else if (action === 'release') {
    if (!['BLOCKED', 'QUARANTINE'].includes(lot.status)) throw new AppError('STATUS_INVALID', 'Hanya lot terblokir/karantina yang dapat dilepas.');
    status = 'ACTIVE';
  } else throw new AppError('VALIDATION_ERROR', `Aksi lot '${action}' tidak dikenal.`);
  const updated = (await client.query(`UPDATE stock_lots SET status=$2,block_reason=$3,version=version+1,updated_at=now() WHERE id=$1 RETURNING *`,
    [lotId, status, status === 'ACTIVE' ? null : reason])).rows[0];
  await lotMovement(client, { lotId, type: status === 'ACTIVE' ? 'RELEASE' : 'BLOCK', qty: 0, userId: user.id, memo: reason || null });
  const runtime = require('./runtime');
  await runtime.audit(client, { userId: user.id, action: status === 'ACTIVE' ? 'UPDATE' : 'BLOCK', module: 'inventory', entityType: 'STOCK_LOT', entityId: lotId, documentNumber: lot.lot_number, oldValue: { status: lot.status }, newValue: { status }, reason, requestId });
  return camelLot(updated);
}

function camelLot(row) { const runtime = require('./runtime'); return runtime.camel(row); }

async function listLots(client, user, params = {}) {
  const page = Math.max(1, Number(params.page) || 1), limit = Math.min(100, Math.max(1, Number(params.limit) || 25));
  const where = ['1=1']; const args = [];
  if (params.productId) { args.push(params.productId); where.push(`l.product_id=$${args.length}`); }
  if (params.warehouseId) { args.push(params.warehouseId); where.push(`l.warehouse_id=$${args.length}`); }
  if (params.status) { args.push(params.status); where.push(`l.status=$${args.length}`); }
  if (params.search) { args.push(`%${params.search}%`); where.push(`(l.lot_number ILIKE $${args.length} OR l.heat_number ILIKE $${args.length} OR l.mill_cert_no ILIKE $${args.length} OR p.code ILIKE $${args.length} OR p.name ILIKE $${args.length})`); }
  if (user && user.branchScope !== '*' && user.branchId && !['owner', 'system_admin', 'security_admin', 'auditor', 'admin'].includes(user.role)) {
    args.push(user.branchId); where.push(`l.warehouse_id=$${args.length}`);
  }
  const total = Number((await client.query(`SELECT count(*) n FROM stock_lots l JOIN products p ON p.id=l.product_id WHERE ${where.join(' AND ')}`, args)).rows[0].n);
  args.push(limit, (page - 1) * limit);
  const items = (await client.query(`SELECT l.*,p.code product_code,p.name product_name,b.name warehouse_name,s.name supplier_name,
      d.document_number source_document_number
    FROM stock_lots l JOIN products p ON p.id=l.product_id JOIN branches b ON b.id=l.warehouse_id
    LEFT JOIN suppliers s ON s.id=l.supplier_id LEFT JOIN business_documents d ON d.id=l.source_document_id
    WHERE ${where.join(' AND ')} ORDER BY l.received_at DESC,l.created_at DESC LIMIT $${args.length - 1} OFFSET $${args.length}`, args)).rows;
  return { items: items.map(camelLot), page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

// Detail + riwayat mutasi + silsilah (induk sampai akar & anak) — traceability
// dua arah: heat number → GR asal → supplier, dan ke mana lot terpakai.
async function lotDetail(client, id) {
  const lot = (await client.query(`SELECT l.*,p.code product_code,p.name product_name,b.name warehouse_name,s.name supplier_name,
      d.document_number source_document_number,d.document_type source_document_type
    FROM stock_lots l JOIN products p ON p.id=l.product_id JOIN branches b ON b.id=l.warehouse_id
    LEFT JOIN suppliers s ON s.id=l.supplier_id LEFT JOIN business_documents d ON d.id=l.source_document_id WHERE l.id=$1`, [id])).rows[0];
  if (!lot) throw new AppError('RESOURCE_NOT_FOUND', 'Lot tidak ditemukan.');
  const movements = (await client.query(`SELECT m.*,d.document_number,fb.name from_warehouse_name,tb.name to_warehouse_name
    FROM stock_lot_movements m LEFT JOIN business_documents d ON d.id=m.document_id
    LEFT JOIN branches fb ON fb.id=m.from_warehouse_id LEFT JOIN branches tb ON tb.id=m.to_warehouse_id
    WHERE m.lot_id=$1 ORDER BY m.occurred_at DESC LIMIT 100`, [id])).rows;
  const ancestry = (await client.query(`WITH RECURSIVE up AS (
      SELECT l.*,0 depth FROM stock_lots l WHERE l.id=$1
      UNION ALL SELECT pl.*,up.depth+1 FROM stock_lots pl JOIN up ON pl.id=up.parent_lot_id)
    SELECT u.id,u.lot_number,u.warehouse_id,u.depth,b.name warehouse_name,d.document_number source_document_number
    FROM up u JOIN branches b ON b.id=u.warehouse_id LEFT JOIN business_documents d ON d.id=u.source_document_id
    WHERE u.depth>0 ORDER BY u.depth`, [id])).rows;
  const children = (await client.query(`SELECT c.id,c.lot_number,c.qty_on_hand,c.status,b.name warehouse_name
    FROM stock_lots c JOIN branches b ON b.id=c.warehouse_id WHERE c.parent_lot_id=$1 ORDER BY c.created_at`, [id])).rows;
  const runtime = require('./runtime');
  return { ...camelLot(lot), movements: movements.map(runtime.camel), ancestry: ancestry.map(runtime.camel), children: children.map(runtime.camel) };
}

// Valuasi per produk×gudang: saldo agregat + lapisan lot (Σ qty×biaya lot).
async function valuation(client, user, params = {}) {
  const where = ['1=1']; const args = [];
  if (params.warehouseId) { args.push(params.warehouseId); where.push(`i.warehouse_id=$${args.length}`); }
  if (user && user.branchScope !== '*' && user.branchId && !['owner', 'system_admin', 'security_admin', 'auditor', 'admin'].includes(user.role)) {
    args.push(user.branchId); where.push(`i.warehouse_id=$${args.length}`);
  }
  const items = (await client.query(`SELECT p.code product_code,p.name product_name,b.name warehouse_name,
      i.qty_on_hand::float qty_on_hand,i.value_idr::float balance_value,p.hpp::float standard_cost,
      COALESCE(lt.lot_qty,0)::float lot_qty,COALESCE(lt.lot_value,0)::float lot_value,
      CASE WHEN i.qty_on_hand>0 THEN (i.value_idr/i.qty_on_hand)::float ELSE 0 END avg_cost
    FROM inventory_balances i JOIN products p ON p.id=i.product_id JOIN branches b ON b.id=i.warehouse_id
    LEFT JOIN LATERAL (SELECT SUM(l.qty_on_hand) lot_qty,SUM(l.qty_on_hand*l.unit_cost) lot_value
      FROM stock_lots l WHERE l.product_id=i.product_id AND l.warehouse_id=i.warehouse_id AND l.status<>'CONSUMED') lt ON true
    WHERE ${where.join(' AND ')} AND i.qty_on_hand<>0 ORDER BY p.code`, args)).rows;
  const runtime = require('./runtime');
  const totals = items.reduce((o, r) => ({ balanceValue: o.balanceValue + r.balance_value, lotValue: o.lotValue + r.lot_value }), { balanceValue: 0, lotValue: 0 });
  return { items: items.map(runtime.camel), totals };
}

// ── Stock opname ─────────────────────────────────────────────────────────────
// Header = business_documents STOCK_OPNAME (nomor OPN, approval + SoD dari
// mesin dokumen). Baris = snapshot qty sistem per lot + sisa tanpa lot.
async function createOpname(client, { user, warehouseId, title, requestId }) {
  const wh = (await client.query('SELECT id,name FROM branches WHERE id=$1', [warehouseId])).rows[0];
  if (!wh) throw new AppError('RESOURCE_NOT_FOUND', 'Gudang tidak ditemukan.');
  const open = (await client.query(`SELECT document_number FROM business_documents WHERE document_type='STOCK_OPNAME'
    AND payload->>'warehouseId'=$1 AND status IN('DRAFT','WAITING_APPROVAL','REVISION_REQUIRED') LIMIT 1`, [warehouseId])).rows[0];
  if (open) throw new AppError('DOCUMENT_CONFLICT', `Masih ada opname berjalan (${open.document_number}) untuk gudang ini.`);
  const runtime = require('./runtime');
  const doc = await runtime.createDocument(client, { type: 'STOCK_OPNAME', user, title: title || `Stock opname ${wh.name}`, amount: 0, payload: { warehouseId }, requestId });
  const lots = (await client.query(`SELECT l.* FROM stock_lots l JOIN products p ON p.id=l.product_id
    WHERE l.warehouse_id=$1 AND l.status<>'CONSUMED' AND l.qty_on_hand>0 ORDER BY p.code,l.received_at`, [warehouseId])).rows;
  const balances = (await client.query(`SELECT i.*,p.hpp FROM inventory_balances i JOIN products p ON p.id=i.product_id
    WHERE i.warehouse_id=$1 AND i.qty_on_hand<>0 ORDER BY p.code`, [warehouseId])).rows;
  let lineNo = 0; const lotSum = {};
  for (const lot of lots) {
    lineNo++; lotSum[lot.product_id] = (lotSum[lot.product_id] || 0) + Number(lot.qty_on_hand);
    await client.query(`INSERT INTO stock_opname_lines(id,document_id,line_no,product_id,lot_id,system_qty,unit_cost) VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [randomUUID(), doc.id, lineNo, lot.product_id, lot.id, lot.qty_on_hand, lot.unit_cost]);
  }
  for (const b of balances) {
    const rest = Math.round((Number(b.qty_on_hand) - (lotSum[b.product_id] || 0)) * 10000) / 10000;
    if (rest <= 0) continue;
    lineNo++;
    await client.query(`INSERT INTO stock_opname_lines(id,document_id,line_no,product_id,lot_id,system_qty,unit_cost) VALUES($1,$2,$3,$4,NULL,$5,$6)`,
      [randomUUID(), doc.id, lineNo, b.product_id, rest, Number(b.hpp || 0)]);
  }
  if (!lineNo) throw new AppError('VALIDATION_ERROR', 'Gudang ini tidak memiliki saldo stok untuk diopname.');
  return { ...doc, lineCount: lineNo };
}

async function opnameLines(client, docId) {
  const doc = (await client.query(`SELECT d.*,b.name warehouse_name FROM business_documents d
    LEFT JOIN branches b ON b.id=(d.payload->>'warehouseId')::uuid WHERE d.id=$1 AND d.document_type='STOCK_OPNAME'`, [docId])).rows[0];
  if (!doc) throw new AppError('RESOURCE_NOT_FOUND', 'Dokumen opname tidak ditemukan.');
  const lines = (await client.query(`SELECT ol.*,p.code product_code,p.name product_name,p.uom,l.lot_number,l.heat_number,
      CASE WHEN ol.counted_qty IS NULL THEN NULL ELSE ol.counted_qty-ol.system_qty END variance,
      CASE WHEN ol.counted_qty IS NULL THEN NULL ELSE (ol.counted_qty-ol.system_qty)*ol.unit_cost END variance_value
    FROM stock_opname_lines ol JOIN products p ON p.id=ol.product_id LEFT JOIN stock_lots l ON l.id=ol.lot_id
    WHERE ol.document_id=$1 ORDER BY ol.line_no`, [docId])).rows;
  const runtime = require('./runtime');
  return { document: runtime.camel(doc), items: lines.map(runtime.camel) };
}

// Isi hasil hitung fisik — hanya saat DRAFT/REVISION_REQUIRED, oleh maker.
// amount dokumen = total nilai selisih absolut → matriks approval eskalasi
// otomatis (selisih besar naik ke finance/owner).
async function enterOpnameCounts(client, { docId, counts, user, requestId }) {
  const doc = (await client.query(`SELECT * FROM business_documents WHERE id=$1 AND document_type='STOCK_OPNAME' FOR UPDATE`, [docId])).rows[0];
  if (!doc) throw new AppError('RESOURCE_NOT_FOUND', 'Dokumen opname tidak ditemukan.');
  if (!['DRAFT', 'REVISION_REQUIRED'].includes(doc.status)) throw new AppError('STATUS_INVALID', `Hasil hitung hanya dapat diisi saat draft/revisi (status sekarang ${doc.status}).`);
  if (!Array.isArray(counts) || !counts.length) throw new AppError('VALIDATION_ERROR', 'Daftar hasil hitung kosong.');
  let updated = 0;
  for (const row of counts) {
    const qty = Number(row.countedQty);
    if (!(qty >= 0)) throw new AppError('VALIDATION_ERROR', 'Qty hasil hitung tidak boleh negatif.');
    const res = await client.query(`UPDATE stock_opname_lines SET counted_qty=$3,note=$4,counted_by=$5,counted_at=now() WHERE id=$1 AND document_id=$2`,
      [row.lineId, docId, qty, row.note ? String(row.note).slice(0, 500) : null, user.id]);
    updated += res.rowCount;
  }
  const sums = (await client.query(`SELECT
      COALESCE(SUM(CASE WHEN counted_qty>system_qty THEN (counted_qty-system_qty)*unit_cost ELSE 0 END),0)::float gain,
      COALESCE(SUM(CASE WHEN counted_qty<system_qty THEN (system_qty-counted_qty)*unit_cost ELSE 0 END),0)::float loss,
      COUNT(*) FILTER(WHERE counted_qty IS NULL)::int uncounted,COUNT(*)::int total
    FROM stock_opname_lines WHERE document_id=$1`, [docId])).rows[0];
  await client.query(`UPDATE business_documents SET amount=$2,payload=payload||$3::jsonb,version=version+1,updated_at=now(),updated_by=$4 WHERE id=$1`,
    [docId, Math.round((sums.gain + sums.loss) * 100) / 100, JSON.stringify({ opname: sums }), user.id]);
  const runtime = require('./runtime');
  await runtime.audit(client, { userId: user.id, action: 'UPDATE', module: 'stock_opname', entityType: 'STOCK_OPNAME', entityId: docId, documentNumber: doc.document_number, newValue: { updated, ...sums }, requestId });
  return { updated, ...sums };
}

// Posting hasil opname — dipanggil posting.postInventory saat APPROVED:
// penyesuaian saldo per produk + penyesuaian lot + jurnal selisih via
// posting profile OPNAME-DEFAULT (GAIN/LOSS) — akun tidak hardcoded.
async function postOpname(client, doc, user) {
  const posting = require('./posting'); // lazy: hindari require melingkar
  const warehouseId = doc.payload?.warehouseId || doc.branchId;
  const lines = (await client.query(`SELECT * FROM stock_opname_lines WHERE document_id=$1 AND counted_qty IS NOT NULL ORDER BY line_no`, [doc.id])).rows;
  if (!lines.length) throw new AppError('VALIDATION_ERROR', 'Opname belum memiliki hasil hitung — tidak ada yang diposting.');
  let gain = 0, loss = 0; const perProduct = {};
  for (const line of lines) {
    const variance = Math.round((Number(line.counted_qty) - Number(line.system_qty)) * 10000) / 10000;
    if (!variance) continue;
    perProduct[line.product_id] = Math.round(((perProduct[line.product_id] || 0) + variance) * 10000) / 10000;
    const value = Math.abs(variance) * Number(line.unit_cost || 0);
    if (variance > 0) gain += value; else loss += value;
    if (line.lot_id) {
      const lot = (await client.query('SELECT * FROM stock_lots WHERE id=$1 FOR UPDATE', [line.lot_id])).rows[0];
      const next = Math.max(0, Math.round((Number(lot.qty_on_hand) + variance) * 10000) / 10000);
      await client.query(`UPDATE stock_lots SET qty_on_hand=$2::numeric,status=CASE WHEN $2::numeric<=0 THEN 'CONSUMED' WHEN status='CONSUMED' THEN 'ACTIVE' ELSE status END,version=version+1,updated_at=now() WHERE id=$1`, [line.lot_id, next]);
      await lotMovement(client, { lotId: line.lot_id, documentId: doc.id, type: variance > 0 ? 'ADJUST_IN' : 'ADJUST_OUT', qty: Math.abs(variance), userId: user.id, memo: 'stock opname' });
    }
  }
  const adjustments = [];
  for (const [productId, delta] of Object.entries(perProduct)) {
    if (!delta) continue;
    adjustments.push(await posting.applyBalance(client, productId, warehouseId, delta, user, doc, 'ADJUSTMENT'));
  }
  gain = Math.round(gain * 100) / 100; loss = Math.round(loss * 100) / 100;
  let journal = null;
  if (gain > 0 || loss > 0) {
    if (await posting.claimPosting(client, doc, user, 'ACCOUNTING')) {
      const period = await posting.ensureOpenPeriod(client, doc);
      journal = await posting.postFromProfile(client, doc, user, { transactionType: 'STOCK_OPNAME', amounts: { GAIN: gain, LOSS: loss }, memoBase: 'selisih opname' });
      await posting.finishPosting(client, doc, 'ACCOUNTING', { period, gain, loss, ...journal });
    }
  }
  return { adjusted: adjustments.length, gain, loss, journal };
}

module.exports = { receiveLotLine, consumeLots, transferLots, setLotStatus, listLots, lotDetail, valuation, createOpname, opnameLines, enterOpnameCounts, postOpname };
