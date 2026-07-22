'use strict';
// Sprint 12 (R019) — mesin produksi, MRP & QC formal.
// Prinsip: WO adalah dokumen (approval/SoD dari mesin dokumen); engine ini
// menambah lapisan produksi — routing ber-snapshot rate, rencana material dari
// BOM EFFECTIVE, reservasi stok, konsumsi via MATERIAL_ISSUE (lot FIFO Sprint
// 11), job costing (material + tenaga kerja), penerimaan barang jadi ber-lot,
// QC yang mengkarantina lot gagal, dan MRP shortage → Purchase Request.
const { randomUUID } = require('node:crypto');
const { AppError } = require('../../../core/errors');
const permissions = require('../../../core/permissions');
const stockReservations = require('./stock-reservations');

const num = (v) => Math.round(Number(v || 0) * 10000) / 10000;
const idr = (v) => Math.round(Number(v || 0) * 100) / 100;

// Cakupan cabang memakai penjaga terpusat core/permissions supaya aturannya
// tunggal; sebelumnya modul ini punya salinan sendiri dengan daftar role yang
// lebih sempit (auditor/security_admin tidak diakui).
const assertBranchScope = (user, branchId) => permissions.assertBranchScope(user, branchId, 'Data produksi');

async function requireStockLocation(client, { warehouseId, branchId }) {
  if (!warehouseId) throw new AppError('VALIDATION_ERROR', 'Lokasi stok wajib dipilih untuk produksi.');
  const row = (await client.query(`SELECT b.id,b.code,b.name,
      ow.code org_warehouse_code,ow.name org_warehouse_name
    FROM branches b
    LEFT JOIN LATERAL (
      SELECT code,name FROM org_warehouses WHERE branch_id=b.id AND active ORDER BY code LIMIT 1
    ) ow ON true
    WHERE b.id=$1 AND b.active`, [warehouseId])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Lokasi stok produksi tidak ditemukan atau tidak aktif.');
  // Ledger inventory lama masih memakai branches sebagai warehouse_id. Sampai
  // migrasi warehouse mandiri selesai, produksi tidak boleh diam-diam memakai
  // branch lain: perpindahan antar lokasi harus melalui STOCK_TRANSFER.
  if (branchId && row.id !== branchId) throw new AppError('PERMISSION_DENIED', 'Lokasi stok produksi harus sama dengan cabang work order. Gunakan transfer stok untuk perpindahan antar cabang.');
  return row;
}

function storedWarehouseId(wo) {
  const id = wo.payload?.production?.warehouseId;
  if (!id) throw new AppError('DOCUMENT_CONFLICT', 'Work order belum memiliki lokasi stok produksi yang tervalidasi. Rencanakan ulang WO.');
  return id;
}

async function listStockLocations(client, user) {
  const all = ['owner', 'admin', 'system_admin'].includes(user.role) || user.branchScope === '*';
  const rows = (await client.query(`SELECT b.id,b.code,
      COALESCE(ow.name,b.name) name,b.name branch_name,ow.code org_warehouse_code
    FROM branches b
    LEFT JOIN LATERAL (
      SELECT code,name FROM org_warehouses WHERE branch_id=b.id AND active ORDER BY code LIMIT 1
    ) ow ON true
    WHERE b.active AND ($1::boolean OR b.id=$2)
    ORDER BY b.code`, [all, user.branchId])).rows;
  const runtime = require('./runtime');
  return { items: rows.map(runtime.camel) };
}

async function getWo(client, id, { forUpdate = false } = {}) {
  const row = (await client.query(`SELECT * FROM business_documents WHERE id=$1 AND document_type='WORK_ORDER'${forUpdate ? ' FOR UPDATE' : ''}`, [id])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Work order tidak ditemukan.');
  return row;
}

// ── Planning: routing + ledakan BOM + reservasi ──────────────────────────────
// operations = [{workCenterId,name,plannedHours}]. Material dari BOM
// MANUFACTURING EFFECTIVE produk payload.productId × payload.qty (+scrap%).
async function planWorkOrder(client, { docId, warehouseId, operations, user, requestId }) {
  const wo = await getWo(client, docId, { forUpdate: true });
  assertBranchScope(user, wo.branch_id);
  if (!['APPROVED', 'IN_PROCESS'].includes(wo.status)) throw new AppError('STATUS_INVALID', `Perencanaan produksi membutuhkan WO berstatus APPROVED/IN_PROCESS (sekarang ${wo.status}).`);
  const already = (await client.query('SELECT count(*)::int n FROM work_order_materials WHERE work_order_id=$1', [docId])).rows[0];
  if (already.n > 0) throw new AppError('DOCUMENT_CONFLICT', 'WO ini sudah direncanakan. Batalkan reservasi dulu untuk merencanakan ulang.');
  const productId = wo.payload?.productId, woQty = num(wo.payload?.qty || 1);
  if (!productId || !(woQty > 0)) throw new AppError('VALIDATION_ERROR', 'payload.productId dan payload.qty wajib untuk perencanaan produksi.');
  const stockLocation = await requireStockLocation(client, { warehouseId, branchId: wo.branch_id });

  // Routing — rate work center di-snapshot sekarang.
  if (!Array.isArray(operations) || !operations.length) throw new AppError('VALIDATION_ERROR', 'Minimal satu operasi routing wajib diisi.');
  const ops = [];
  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    const wc = (await client.query(`SELECT wc.id,wc.name,wc.hourly_rate FROM work_centers wc
      JOIN plants p ON p.id=wc.plant_id WHERE wc.id=$1 AND wc.active AND p.branch_id=$2`, [op.workCenterId, wo.branch_id])).rows[0];
    if (!wc) throw new AppError('RESOURCE_NOT_FOUND', `Work center operasi #${i + 1} tidak ditemukan.`);
    const row = (await client.query(`INSERT INTO work_order_operations(id,work_order_id,op_no,name,work_center_id,hourly_rate_snapshot,planned_hours)
      VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [randomUUID(), docId, i + 1, String(op.name || wc.name).slice(0, 160), wc.id, wc.hourly_rate, num(op.plannedHours)])).rows[0];
    ops.push(row);
  }

  // Ledakan BOM MANUFACTURING EFFECTIVE (fallback APPROVED terbaru).
  const bom = (await client.query(`SELECT id,revision_no,status FROM bom_headers WHERE product_id=$1 AND bom_type='MANUFACTURING' AND status IN ('EFFECTIVE','APPROVED')
    ORDER BY (status='EFFECTIVE') DESC, revision_no DESC LIMIT 1`, [productId])).rows[0];
  if (!bom) throw new AppError('RESOURCE_NOT_FOUND', 'Produk ini belum memiliki BOM manufacturing yang APPROVED/EFFECTIVE.');
  const lines = (await client.query(`SELECT bl.*,p.hpp,p.code FROM bom_lines bl JOIN products p ON p.id=bl.component_product_id WHERE bl.bom_id=$1 ORDER BY bl.line_no`, [bom.id])).rows;
  if (!lines.length) throw new AppError('VALIDATION_ERROR', 'BOM tidak memiliki baris komponen.');

  const materials = []; const shortage = [];
  for (const line of lines) {
    const planned = num(Number(line.qty) * woQty * (1 + Number(line.scrap_pct || 0) / 100));
    // Reservasi terhadap saldo tersedia (advisory lock pola posting.balance).
    // Reservasi lewat mesin tunggal stock-reservations: menghasilkan CATATAN
    // (siapa menahan, untuk WO mana), bukan sekadar menaikkan angka.
    // allowPartial: perencanaan produksi memang menerima kekurangan dan
    // mencatatnya sebagai shortage.
    const claim = await stockReservations.reserve(client, {
      productId: line.component_product_id, warehouseId: stockLocation.id, documentId: docId,
      qty: planned, allowPartial: true, user,
      reason: `Reservasi material work order untuk ${line.code || line.component_product_id}`
    });
    const reserve = claim.reserved;
    if (claim.shortQty > 0) shortage.push({ productId: line.component_product_id, code: line.code, shortQty: claim.shortQty });
    const row = (await client.query(`INSERT INTO work_order_materials(id,work_order_id,line_no,product_id,bom_line_id,planned_qty,reserved_qty,uom,unit_cost_snapshot)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [randomUUID(), docId, line.line_no, line.component_product_id, line.id, planned, reserve, line.uom, Number(line.hpp || 0)])).rows[0];
    materials.push(row);
  }

  const plannedLabor = idr(ops.reduce((n, o) => n + Number(o.planned_hours) * Number(o.hourly_rate_snapshot), 0));
  const plannedMaterial = idr(materials.reduce((n, m) => n + Number(m.planned_qty) * Number(m.unit_cost_snapshot), 0));
  await client.query(`UPDATE business_documents SET payload=payload||$2::jsonb,version=version+1,updated_at=now(),updated_by=$3 WHERE id=$1`,
    [docId, JSON.stringify({ production: { bomId: bom.id, bomRevision: bom.revision_no, warehouseId: stockLocation.id, warehouseCode: stockLocation.org_warehouse_code || stockLocation.code, plannedMaterial, plannedLabor, shortage } }), user.id]);
  const runtime = require('./runtime');
  await runtime.audit(client, { userId: user.id, action: 'POST', module: 'production', entityType: 'WORK_ORDER', entityId: docId, documentNumber: wo.document_number, newValue: { operations: ops.length, materials: materials.length, plannedMaterial, plannedLabor, shortage }, requestId });
  return { operations: ops.length, materials: materials.length, plannedMaterial, plannedLabor, shortage, bomRevision: bom.revision_no };
}

// Lepas seluruh sisa reservasi WO (dipanggil saat cancel/void, atau unplan).
async function releaseReservations(client, docId, user) {
  const wo = await getWo(client, docId);
  assertBranchScope(user, wo.branch_id);
  const rows = (await client.query('SELECT * FROM work_order_materials WHERE work_order_id=$1 AND reserved_qty>0 FOR UPDATE', [docId])).rows;
  if (!rows.length) return { released: 0 };
  const warehouseId = storedWarehouseId(wo);
  await requireStockLocation(client, { warehouseId, branchId: wo.branch_id });
  let released = 0;
  for (const m of rows) {
    // Pelepasan lewat mesin tunggal: catatan reservasinya ditutup dengan alasan,
    // bukan sekadar angkanya dikurangi dan diharap benar.
    await stockReservations.releaseDocument(client, { documentId: wo.id, productId: m.product_id,
      reason: 'Reservasi material dibatalkan — perencanaan work order dibatalkan.', user });
    await client.query('UPDATE work_order_materials SET reserved_qty=0 WHERE id=$1', [m.id]);
    released++;
  }
  return { released };
}

// ── Konsumsi material: draft MATERIAL_ISSUE dari rencana ────────────────────
// Dibuat DRAFT dan diproses lewat alur dokumen normal (submit→approve→…→
// COMPLETED). Saat COMPLETED, postInventory memanggil onMaterialIssued.
async function createIssueFromPlan(client, { docId, user, requestId }) {
  const wo = await getWo(client, docId);
  assertBranchScope(user, wo.branch_id);
  const existing = (await client.query(`SELECT c.* FROM document_relations r
    JOIN business_documents c ON c.id=r.child_document_id
    WHERE r.parent_document_id=$1 AND r.relation_type='WO_TO_ISSUE'
      AND c.status NOT IN ('COMPLETED','CLOSED','CANCELLED','VOID')
    ORDER BY c.created_at DESC LIMIT 1`, [docId])).rows[0];
  if (existing) return { ...require('./runtime').camel(existing), idempotentReplay: true };
  const mats = (await client.query(`SELECT m.*,p.code,p.name FROM work_order_materials m JOIN products p ON p.id=m.product_id
    WHERE m.work_order_id=$1 AND m.planned_qty>m.issued_qty ORDER BY m.line_no`, [docId])).rows;
  if (!mats.length) throw new AppError('VALIDATION_ERROR', 'Tidak ada sisa material untuk dikeluarkan (semua sudah diissue).');
  const warehouseId = storedWarehouseId(wo);
  await requireStockLocation(client, { warehouseId, branchId: wo.branch_id });
  const runtime = require('./runtime');
  const mi = await runtime.createDocument(client, {
    type: 'MATERIAL_ISSUE', user, title: `Pengeluaran material ${wo.document_number}`, amount: 0, requestId,
    payload: { workOrderId: docId, warehouseId, lines: mats.map((m) => ({ productId: m.product_id, description: `${m.code} · ${m.name}`, qty: num(m.planned_qty - m.issued_qty), uom: m.uom, unitPrice: 0 })) }
  });
  await client.query(`INSERT INTO document_relations(parent_document_id,child_document_id,relation_type,created_by) VALUES($1,$2,'WO_TO_ISSUE',$3)`, [docId, mi.id, user.id]);
  return mi;
}

// Hook dari posting.postInventory saat MATERIAL_ISSUE (payload.workOrderId)
// COMPLETED: catat issued_qty + lepas reservasi proporsional.
async function onMaterialIssued(client, doc, user) {
  const woId = doc.payload?.workOrderId;
  if (!woId) return null;
  const lines = (await client.query('SELECT product_id,qty FROM document_lines WHERE document_id=$1', [doc.id])).rows;
  const wo = (await client.query('SELECT payload,branch_id FROM business_documents WHERE id=$1', [woId])).rows[0];
  if (!wo) throw new AppError('RESOURCE_NOT_FOUND', 'Work order asal material issue tidak ditemukan.');
  const warehouseId = wo.payload?.production?.warehouseId || doc.payload?.warehouseId;
  await requireStockLocation(client, { warehouseId, branchId: wo.branch_id });
  for (const line of lines) {
    const materials = (await client.query(`SELECT * FROM work_order_materials WHERE work_order_id=$1 AND product_id=$2 ORDER BY line_no FOR UPDATE`, [woId, line.product_id])).rows;
    let remaining = num(line.qty), released = 0;
    for (const material of materials) {
      if (remaining <= 0) break;
      const outstanding = num(Number(material.planned_qty) - Number(material.issued_qty));
      if (outstanding <= 0) continue;
      const issued = num(Math.min(outstanding, remaining));
      const releaseQty = num(Math.min(Number(material.reserved_qty), issued));
      await client.query('UPDATE work_order_materials SET issued_qty=issued_qty+$2,reserved_qty=GREATEST(0,reserved_qty-$3) WHERE id=$1', [material.id, issued, releaseQty]);
      remaining = num(remaining - issued); released = num(released + releaseQty);
    }
    if (remaining > 0) throw new AppError('VALIDATION_ERROR', `Qty material issue melebihi sisa rencana WO untuk produk ${line.product_id}.`);
    // Material benar-benar keluar: reservasinya DIPAKAI (consume), bukan
    // dilepas. Bedanya penting untuk jejak — dilepas berarti batal, dipakai
    // berarti terpenuhi.
    if (released > 0) await stockReservations.consume(client, { documentId: woId,
      productId: line.product_id, warehouseId, qty: released, user });
  }
  return { workOrderId: woId, lines: lines.length };
}

// ── Waktu kerja & operasi ────────────────────────────────────────────────────
async function logTime(client, { operationId, hours, note, user }) {
  const op = (await client.query(`SELECT o.*,d.document_number,d.status doc_status,d.branch_id FROM work_order_operations o JOIN business_documents d ON d.id=o.work_order_id WHERE o.id=$1 FOR UPDATE OF o`, [operationId])).rows[0];
  if (!op) throw new AppError('RESOURCE_NOT_FOUND', 'Operasi tidak ditemukan.');
  assertBranchScope(user, op.branch_id);
  if (op.status === 'DONE') throw new AppError('STATUS_INVALID', 'Operasi sudah selesai — jam tidak dapat ditambah.');
  if (!['IN_PROCESS', 'APPROVED'].includes(op.doc_status)) throw new AppError('STATUS_INVALID', `WO berstatus ${op.doc_status} — catat jam hanya saat produksi berjalan.`);
  const h = Number(hours);
  if (!h || Math.abs(h) > 24) throw new AppError('VALIDATION_ERROR', 'Jam kerja harus ≠0 dan ≤24 per pencatatan (koreksi memakai nilai negatif).');
  if (h < 0 && !note) throw new AppError('REASON_REQUIRED', 'Koreksi jam (negatif) wajib disertai alasan.');
  await client.query(`INSERT INTO work_order_time_logs(operation_id,hours,note,logged_by) VALUES($1,$2,$3,$4)`, [operationId, h, note || null, user.id]);
  if (op.status === 'PENDING') await client.query(`UPDATE work_order_operations SET status='IN_PROGRESS',started_at=COALESCE(started_at,now()) WHERE id=$1`, [operationId]);
  const total = (await client.query('SELECT COALESCE(SUM(hours),0)::float t FROM work_order_time_logs WHERE operation_id=$1', [operationId])).rows[0].t;
  if (total < 0) throw new AppError('VALIDATION_ERROR', 'Total jam operasi tidak boleh negatif setelah koreksi.');
  return { operationId, totalHours: total, cost: idr(total * Number(op.hourly_rate_snapshot)) };
}

async function completeOperation(client, { operationId, user }) {
  const op = (await client.query(`SELECT o.*,d.status doc_status,d.branch_id FROM work_order_operations o
    JOIN business_documents d ON d.id=o.work_order_id WHERE o.id=$1 FOR UPDATE OF o`, [operationId])).rows[0];
  if (!op) throw new AppError('RESOURCE_NOT_FOUND', 'Operasi tidak ditemukan.');
  assertBranchScope(user, op.branch_id);
  if (op.status === 'DONE') return { replay: true };
  if (!['APPROVED', 'IN_PROCESS'].includes(op.doc_status)) throw new AppError('STATUS_INVALID', `WO berstatus ${op.doc_status} — operasi tidak dapat diselesaikan.`);
  // P0-M: urutan operasi ditegakkan — operasi bernomor lebih kecil wajib
  // selesai lebih dulu (SOP produksi menyatakan operasi berurutan, tetapi
  // sebelumnya hanya operasi terpilih yang divalidasi).
  const predecessor = (await client.query(
    `SELECT op_no,name FROM work_order_operations WHERE work_order_id=$1 AND op_no<$2 AND status<>'DONE' ORDER BY op_no LIMIT 1`,
    [op.work_order_id, op.op_no])).rows[0];
  if (predecessor) throw new AppError('STATUS_INVALID', `Operasi ${predecessor.op_no} (${predecessor.name}) belum selesai — operasi wajib berurutan.`, { blockingOperation: predecessor.op_no });
  const updated = (await client.query(`UPDATE work_order_operations SET status='DONE',started_at=COALESCE(started_at,now()),finished_at=now() WHERE id=$1 RETURNING *`, [operationId])).rows[0];
  return { opNo: updated.op_no, status: updated.status };
}

// ── Panel produksi (cockpit) ─────────────────────────────────────────────────
async function productionPanel(client, docId, user) {
  const wo = await getWo(client, docId);
  assertBranchScope(user, wo.branch_id);
  const runtime = require('./runtime');
  const operations = (await client.query(`SELECT o.*,wc.name work_center_name,wc.code work_center_code,
      COALESCE((SELECT SUM(t.hours) FROM work_order_time_logs t WHERE t.operation_id=o.id),0)::float actual_hours
    FROM work_order_operations o JOIN work_centers wc ON wc.id=o.work_center_id WHERE o.work_order_id=$1 ORDER BY o.op_no`, [docId])).rows;
  const materials = (await client.query(`SELECT m.*,p.code product_code,p.name product_name FROM work_order_materials m JOIN products p ON p.id=m.product_id WHERE m.work_order_id=$1 ORDER BY m.line_no`, [docId])).rows;
  const issues = (await client.query(`SELECT c.id,c.document_number,c.status FROM document_relations r JOIN business_documents c ON c.id=r.child_document_id WHERE r.parent_document_id=$1 AND r.relation_type='WO_TO_ISSUE' ORDER BY c.created_at`, [docId])).rows;
  const fg = (await client.query(`SELECT c.id,c.document_number,c.status FROM document_relations r JOIN business_documents c ON c.id=r.child_document_id WHERE r.parent_document_id=$1 AND r.relation_type='WO_TO_FG' ORDER BY c.created_at`, [docId])).rows;
  const laborCost = idr(operations.reduce((n, o) => n + o.actual_hours * Number(o.hourly_rate_snapshot), 0));
  const materialCost = idr(materials.reduce((n, m) => n + Number(m.issued_qty) * Number(m.unit_cost_snapshot), 0));
  const woQty = num(wo.payload?.qty || 1);
  return {
    document: runtime.camel(wo),
    operations: operations.map(runtime.camel),
    materials: materials.map(runtime.camel),
    issues: issues.map(runtime.camel),
    finishedReceipts: fg.map(runtime.camel),
    costing: { materialCost, laborCost, totalCost: idr(materialCost + laborCost), qty: woQty, costPerUnit: woQty > 0 ? idr((materialCost + laborCost) / woQty) : 0 }
  };
}

// ── Penyelesaian: job costing final + penerimaan barang jadi ber-lot ─────────
// Prasyarat: semua operasi DONE dan tidak ada MATERIAL_ISSUE WO yang masih
// berjalan. FG masuk lewat GOODS_RECEIPT draft (source=PRODUCTION, relation
// WO_TO_FG) — saat COMPLETED, lot barang jadi lahir dari jalur lot Sprint 11.
async function finishWorkOrder(client, { docId, fgWarehouseId, user, requestId }) {
  const wo = await getWo(client, docId, { forUpdate: true });
  assertBranchScope(user, wo.branch_id);
  if (wo.status !== 'IN_PROCESS') throw new AppError('STATUS_INVALID', `Penyelesaian produksi membutuhkan WO IN_PROCESS (sekarang ${wo.status}).`);
  const pendingOps = (await client.query(`SELECT count(*)::int n FROM work_order_operations WHERE work_order_id=$1 AND status<>'DONE'`, [docId])).rows[0];
  if (pendingOps.n > 0) throw new AppError('STATUS_INVALID', `${pendingOps.n} operasi belum selesai.`);
  const openIssue = (await client.query(`SELECT count(*)::int n FROM document_relations r JOIN business_documents c ON c.id=r.child_document_id
    WHERE r.parent_document_id=$1 AND r.relation_type='WO_TO_ISSUE' AND c.status NOT IN ('COMPLETED','CLOSED','CANCELLED','VOID')`, [docId])).rows[0];
  if (openIssue.n > 0) throw new AppError('STATUS_INVALID', 'Masih ada pengeluaran material yang belum selesai diproses.');
  const outstanding = (await client.query(`SELECT count(*)::int n FROM work_order_materials
    WHERE work_order_id=$1 AND issued_qty<planned_qty`, [docId])).rows[0];
  if (outstanding.n > 0) throw new AppError('STATUS_INVALID', `${outstanding.n} baris material belum dikeluarkan seluruhnya.`);
  const existing = (await client.query(`SELECT c.id,c.document_number FROM document_relations r JOIN business_documents c ON c.id=r.child_document_id WHERE r.parent_document_id=$1 AND r.relation_type='WO_TO_FG' LIMIT 1`, [docId])).rows[0];
  if (existing) return { replay: true, finishedReceipt: existing.document_number, costing: wo.payload?.production?.costing || null };

  const panel = await productionPanel(client, docId, user);
  const { costing } = panel;
  const productId = wo.payload?.productId, qty = num(wo.payload?.qty || 1);
  const product = (await client.query('SELECT code,name,uom,hpp FROM products WHERE id=$1', [productId])).rows[0];
  if (!product) throw new AppError('RESOURCE_NOT_FOUND', 'Produk barang jadi tidak ditemukan.');
  const warehouseId = fgWarehouseId || storedWarehouseId(wo);
  await requireStockLocation(client, { warehouseId, branchId: wo.branch_id });
  // Standard costing: nilai stok memakai HPP aktif; selisih biaya aktual = variance.
  const standardValue = idr(Number(product.hpp || 0) * qty);
  const variance = idr(costing.totalCost - standardValue);
  const runtime = require('./runtime');
  const gr = await runtime.createDocument(client, {
    type: 'GOODS_RECEIPT', user, title: `Penerimaan barang jadi ${wo.document_number}`, amount: costing.totalCost, requestId,
    payload: { source: 'PRODUCTION', workOrderId: docId, warehouseId,
      lines: [{ productId, description: `${product.code} · ${product.name} (hasil produksi)`, qty, uom: product.uom, unitPrice: costing.costPerUnit, heatNumber: wo.payload?.heatNumber || null, millCertNo: null }] }
  });
  await client.query(`INSERT INTO document_relations(parent_document_id,child_document_id,relation_type,created_by) VALUES($1,$2,'WO_TO_FG',$3)`, [docId, gr.id, user.id]);
  await releaseReservations(client, docId, user);
  await client.query(`UPDATE business_documents SET payload=payload||$2::jsonb,version=version+1,updated_at=now(),updated_by=$3 WHERE id=$1`,
    [docId, JSON.stringify({ production: { ...(wo.payload?.production || {}), costing: { ...costing, standardValue, variance, finishedAt: new Date().toISOString() } } }), user.id]);
  await runtime.audit(client, { userId: user.id, action: 'POST', module: 'production', entityType: 'WORK_ORDER', entityId: docId, documentNumber: wo.document_number, newValue: { costing: { ...costing, standardValue, variance }, finishedReceipt: gr.documentNumber }, requestId });
  return { finishedReceipt: gr.documentNumber, finishedReceiptId: gr.id, costing: { ...costing, standardValue, variance } };
}

async function assertReadyToComplete(client, docId) {
  const wo = await getWo(client, docId);
  const state = (await client.query(`SELECT
      (SELECT count(*)::int FROM work_order_operations WHERE work_order_id=$1) operations,
      (SELECT count(*)::int FROM work_order_operations WHERE work_order_id=$1 AND status<>'DONE') pending_operations,
      (SELECT count(*)::int FROM work_order_materials WHERE work_order_id=$1 AND issued_qty<planned_qty) pending_materials,
      (SELECT count(*)::int FROM document_relations r JOIN business_documents d ON d.id=r.child_document_id
        WHERE r.parent_document_id=$1 AND r.relation_type='WO_TO_ISSUE' AND d.status NOT IN ('COMPLETED','CLOSED','CANCELLED','VOID')) open_issues,
      (SELECT count(*)::int FROM document_relations r JOIN business_documents d ON d.id=r.child_document_id
        WHERE r.parent_document_id=$1 AND r.relation_type='WO_TO_FG' AND d.status IN ('COMPLETED','CLOSED')) completed_receipts`, [docId])).rows[0];
  if (!wo.payload?.production || state.operations < 1) throw new AppError('STATUS_INVALID', 'WO belum direncanakan.');
  if (state.pending_operations > 0) throw new AppError('STATUS_INVALID', `${state.pending_operations} operasi belum selesai.`);
  if (state.pending_materials > 0) throw new AppError('STATUS_INVALID', `${state.pending_materials} baris material belum selesai dikeluarkan.`);
  if (state.open_issues > 0) throw new AppError('STATUS_INVALID', 'Masih ada material issue yang belum selesai.');
  if (state.completed_receipts < 1) throw new AppError('STATUS_INVALID', 'Penerimaan barang jadi belum diselesaikan.');
  // P0-M: gerbang mutu — SOP mewajibkan QC final lulus dan NCR kritis tertutup
  // sebelum WO selesai. Sebelumnya WO bisa COMPLETED tanpa QC final sama sekali.
  const quality = (await client.query(`SELECT
      count(*) FILTER (WHERE inspection_type='FINAL')::int final_total,
      count(*) FILTER (WHERE inspection_type='FINAL' AND result='PASS')::int final_pass,
      count(*) FILTER (WHERE ncr_number IS NOT NULL AND result='FAIL')::int open_ncr
    FROM qc_inspections WHERE subject_document_id=$1`, [docId])).rows[0];
  if (Number(quality.final_total) < 1) throw new AppError('STATUS_INVALID', 'QC final belum dilakukan — Work Order tidak boleh diselesaikan tanpa inspeksi akhir.');
  if (Number(quality.final_pass) < 1) throw new AppError('STATUS_INVALID', 'QC final belum berstatus PASS.');
  if (Number(quality.open_ncr) > 0) throw new AppError('STATUS_INVALID', `${quality.open_ncr} NCR gagal masih terbuka — selesaikan sebelum menutup Work Order.`);
  return true;
}

// ── QC formal: inspeksi + karantina lot + NCR ────────────────────────────────
async function recordInspection(client, { qcDocId, inspection, user, requestId }) {
  const qc = (await client.query(`SELECT * FROM business_documents WHERE id=$1 AND document_type='QC_INSPECTION' FOR UPDATE`, [qcDocId])).rows[0];
  if (!qc) throw new AppError('RESOURCE_NOT_FOUND', 'Dokumen QC tidak ditemukan.');
  assertBranchScope(user, qc.branch_id);
  if (['CLOSED', 'CANCELLED', 'VOID', 'REJECTED'].includes(qc.status)) throw new AppError('STATUS_INVALID', `Dokumen QC berstatus ${qc.status}.`);
  const { inspectionType, lotId, productId, subjectDocumentId, sampledQty, passedQty, failedQty, defectCode, rootCause, correctiveAction, instrumentId } = inspection || {};
  // Alat ukur kedaluwarsa membuat hasil inspeksi tidak dapat dipertanggungjawabkan.
  const qualityCapa = require('./quality-capa');
  await qualityCapa.assertInstrumentUsable(client, instrumentId, { branchId: qc.branch_id });
  if (!['INCOMING', 'IN_PROCESS', 'FINAL'].includes(inspectionType)) throw new AppError('VALIDATION_ERROR', 'inspectionType harus INCOMING/IN_PROCESS/FINAL.');
  const sampled = num(sampledQty), passed = num(passedQty), failed = num(failedQty);
  if (!(sampled > 0) || passed < 0 || failed < 0 || passed + failed > sampled) throw new AppError('VALIDATION_ERROR', 'Qty sampel/lulus/gagal tidak konsisten.');
  const result = failed === 0 ? 'PASS' : passed === 0 ? 'FAIL' : 'PARTIAL';
  if (failed > 0 && (!defectCode || !rootCause)) throw new AppError('VALIDATION_ERROR', 'Kegagalan QC wajib mencantumkan kode defect dan root cause (NCR).');

  let lot = null, prodId = productId || null;
  if (lotId) {
    lot = (await client.query('SELECT * FROM stock_lots WHERE id=$1', [lotId])).rows[0];
    if (!lot) throw new AppError('RESOURCE_NOT_FOUND', 'Lot yang diinspeksi tidak ditemukan.');
    if (lot.warehouse_id !== qc.branch_id) throw new AppError('PERMISSION_DENIED', 'Lot dan dokumen QC harus berada pada cabang yang sama.');
    prodId = lot.product_id;
  }
  let ncrNumber = null;
  if (failed > 0) {
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`ncr:${new Date().getFullYear()}`]);
    const seq = (await client.query(`SELECT count(*)::int n FROM qc_inspections WHERE ncr_number IS NOT NULL AND inspected_at>=date_trunc('year',now())`)).rows[0];
    ncrNumber = `NCR-${new Date().getFullYear()}-${String(seq.n + 1).padStart(4, '0')}`;
  }
  const row = (await client.query(`INSERT INTO qc_inspections(id,ncr_number,qc_document_id,subject_document_id,inspection_type,lot_id,product_id,sampled_qty,passed_qty,failed_qty,result,defect_code,root_cause,corrective_action,inspected_by,instrument_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`, [
    randomUUID(), ncrNumber, qcDocId, subjectDocumentId || null, inspectionType, lotId || null, prodId,
    sampled, passed, failed, result, defectCode || null, rootCause || null, correctiveAction || null, user.id, instrumentId || null
  ])).rows[0];

  // Gagal pada lot → karantina otomatis (dilewati FIFO sampai dilepas QC).
  let quarantined = false;
  if (failed > 0 && lot && lot.status === 'ACTIVE') {
    const inv = require('./inventory');
    await inv.setLotStatus(client, { lotId, action: 'quarantine', reason: `${ncrNumber}: ${defectCode}`, user, requestId });
    quarantined = true;
  }
  const summary = (await client.query(`SELECT count(*)::int total,COALESCE(SUM(failed_qty),0)::float failed,COUNT(*) FILTER (WHERE result='FAIL')::int fails FROM qc_inspections WHERE qc_document_id=$1`, [qcDocId])).rows[0];
  await client.query(`UPDATE business_documents SET payload=payload||$2::jsonb,version=version+1,updated_at=now(),updated_by=$3 WHERE id=$1`,
    [qcDocId, JSON.stringify({ qcSummary: summary }), user.id]);
  const runtime = require('./runtime');
  await runtime.audit(client, { userId: user.id, action: failed > 0 ? 'REJECT' : 'APPROVE', module: 'quality', entityType: 'QC_INSPECTION', entityId: qcDocId, documentNumber: qc.document_number, newValue: { ncrNumber, result, sampled, passed, failed, lotId, quarantined }, reason: rootCause || null, requestId });
  // NCR yang terbit WAJIB melahirkan kasus CAPA. Temuan yang tidak wajib
  // ditutup bukan sistem mutu — sebelumnya NCR hanya sebuah nomor dengan dua
  // kolom teks bebas yang boleh dibiarkan kosong selamanya.
  let capaCase = null;
  if (ncrNumber) {
    capaCase = await qualityCapa.openCase(client, {
      inspectionId: row.id, branchId: qc.branch_id, source: 'NCR',
      severity: result === 'FAIL' ? 'CRITICAL' : 'MAJOR',
      title: `${ncrNumber} — ${defectCode}`,
      description: `Inspeksi ${inspectionType} menemukan ${failed} unit gagal. Akar masalah awal: ${rootCause}`,
      user, requestId
    });
  }
  return { ...runtime.camel(row), quarantined, capaCase };
}

async function listInspections(client, qcDocId, user) {
  const qc = (await client.query(`SELECT branch_id FROM business_documents WHERE id=$1 AND document_type='QC_INSPECTION'`, [qcDocId])).rows[0];
  if (!qc) throw new AppError('RESOURCE_NOT_FOUND', 'Dokumen QC tidak ditemukan.');
  assertBranchScope(user, qc.branch_id);
  const runtime = require('./runtime');
  const rows = (await client.query(`SELECT q.*,l.lot_number,l.heat_number,p.code product_code,p.name product_name,u.display_name inspector_name,s.document_number subject_number
    FROM qc_inspections q LEFT JOIN stock_lots l ON l.id=q.lot_id LEFT JOIN products p ON p.id=q.product_id
    LEFT JOIN app_users u ON u.id=q.inspected_by LEFT JOIN business_documents s ON s.id=q.subject_document_id
    WHERE q.qc_document_id=$1 ORDER BY q.inspected_at DESC`, [qcDocId])).rows;
  return { items: rows.map(runtime.camel) };
}

// ── MRP: kebutuhan (WO shortage + min stock) vs pasokan → saran beli ─────────
// P0-N: MRP dijalankan PER GUDANG. Menjumlahkan on-hand lintas cabang membuat
// kekurangan di satu lokasi tertutup oleh stok lokasi lain — stok tidak bisa
// dipakai dari jauh tanpa transfer, jadi netting lintas gudang menghasilkan
// saran yang salah. Kebutuhan WO dilekatkan pada lokasi stok WO tersebut.
async function runMrp(client, { user, requestId, warehouseId = null }) {
  const sites = [];
  if (warehouseId) {
    permissions.assertBranchScope(user, warehouseId, 'Gudang');
    const site = (await client.query('SELECT id FROM branches WHERE id=$1 AND active', [warehouseId])).rows[0];
    if (!site) throw new AppError('RESOURCE_NOT_FOUND', 'Gudang MRP tidak ditemukan.');
    sites.push(site.id);
  } else {
    const rows = (await client.query('SELECT id FROM branches WHERE active ORDER BY code')).rows;
    for (const row of rows) if (permissions.withinBranchScope(user, row.id)) sites.push(row.id);
    if (!sites.length) throw new AppError('PERMISSION_DENIED', 'Tidak ada gudang dalam cakupan Anda untuk dijalankan MRP.');
  }
  // Kunci per gudang — dua run paralel pada gudang berbeda tidak saling blokir.
  for (const site of sites) await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`mrp:${site}`]);

  const runId = randomUUID();
  let created = 0;
  for (const site of sites) {
    // Gross requirement WO pada lokasi stok WO. Reserved sudah bagian dari
    // on-hand sehingga tidak boleh dikurangkan dua kali saat netting.
    const woNeeds = (await client.query(`SELECT m.product_id,SUM(GREATEST(0,m.planned_qty-m.issued_qty))::float need,
        string_agg(DISTINCT d.document_number,', ') sources
      FROM work_order_materials m JOIN business_documents d ON d.id=m.work_order_id
      WHERE d.status IN ('APPROVED','IN_PROCESS')
        AND COALESCE((d.payload->'production'->>'warehouseId')::uuid,d.branch_id)=$1
      GROUP BY m.product_id HAVING SUM(GREATEST(0,m.planned_qty-m.issued_qty))>0`, [site])).rows;
    // Safety stock adalah target per gudang, bukan shortage bersih; netting
    // dilakukan sekali setelah kebutuhan WO + target minimum digabung.
    const minNeeds = (await client.query(`SELECT product_id,min_qty::float need
      FROM inventory_balances WHERE warehouse_id=$1 AND min_qty>0`, [site])).rows;
    const demand = new Map();
    for (const r of woNeeds) demand.set(r.product_id, { need: r.need, source: `WO: ${r.sources}` });
    for (const r of minNeeds) {
      const d = demand.get(r.product_id) || { need: 0, source: '' };
      d.need = num(d.need + r.need); d.source = [d.source, 'di bawah stok minimum'].filter(Boolean).join(' + ');
      demand.set(r.product_id, d);
    }
    for (const [productId, d] of demand) {
      const supply = (await client.query(`SELECT
          COALESCE((SELECT qty_on_hand FROM inventory_balances WHERE product_id=$1 AND warehouse_id=$2),0)::float on_hand,
          COALESCE((SELECT qty_reserved FROM inventory_balances WHERE product_id=$1 AND warehouse_id=$2),0)::float reserved,
          COALESCE((SELECT SUM(dl.qty) FROM document_lines dl JOIN business_documents po ON po.id=dl.document_id
            WHERE dl.product_id=$1 AND po.document_type='PURCHASE_ORDER' AND po.status IN ('APPROVED','IN_PROCESS')
              AND COALESCE((po.payload->>'warehouseId')::uuid,po.branch_id)=$2),0)::float on_order,
          COALESCE((SELECT min_qty FROM inventory_balances WHERE product_id=$1 AND warehouse_id=$2),0)::float min_qty`, [productId, site])).rows[0];
      const suggested = num(d.need - supply.on_hand - supply.on_order);
      if (suggested <= 0) continue;
      await client.query(`INSERT INTO mrp_suggestions(id,run_id,warehouse_id,product_id,demand_qty,on_hand,reserved,on_order,min_qty,suggested_qty,source,created_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [randomUUID(), runId, site, productId, d.need, supply.on_hand, supply.reserved, supply.on_order, supply.min_qty, suggested, d.source, user.id]);
      created++;
    }
    // Saran lama gudang INI yang masih OPEN ditutup (superseded). Gudang di luar
    // cakupan run ini tidak boleh ikut terhapus.
    await client.query(`UPDATE mrp_suggestions SET status='DISMISSED' WHERE status='OPEN' AND warehouse_id=$1 AND run_id<>$2`, [site, runId]);
  }
  const runtime = require('./runtime');
  await runtime.audit(client, { userId: user.id, action: 'POST', module: 'production', entityType: 'MRP_RUN', entityId: runId, newValue: { suggestions: created, sites: sites.length }, requestId });
  return { runId, suggestions: created, sites: sites.length };
}

async function listMrp(client, user, { warehouseId = null } = {}) {
  const runtime = require('./runtime');
  const params = []; let where = "s.status='OPEN'";
  if (warehouseId) { permissions.assertBranchScope(user, warehouseId, 'Gudang'); params.push(warehouseId); where += ` AND s.warehouse_id=$${params.length}`; }
  else if (user?.branchId && !permissions.CROSS_BRANCH_ROLES.includes(user.role) && user.branchScope !== '*') { params.push(user.branchId); where += ` AND s.warehouse_id=$${params.length}`; }
  const rows = (await client.query(`SELECT s.*,p.code product_code,p.name product_name,p.uom,b.name warehouse_name
    FROM mrp_suggestions s JOIN products p ON p.id=s.product_id LEFT JOIN branches b ON b.id=s.warehouse_id
    WHERE ${where} ORDER BY s.suggested_qty*COALESCE(p.hpp,0) DESC LIMIT 200`, params)).rows;
  return { items: rows.map(runtime.camel) };
}

// Konversi saran → draft Purchase Request (idempoten per saran).
async function convertMrp(client, { suggestionId, user, requestId }) {
  const s = (await client.query(`SELECT s.*,p.code,p.name,p.uom,p.hpp FROM mrp_suggestions s JOIN products p ON p.id=s.product_id WHERE s.id=$1 FOR UPDATE`, [suggestionId])).rows[0];
  if (!s) throw new AppError('RESOURCE_NOT_FOUND', 'Saran MRP tidak ditemukan.');
  if (s.status === 'CONVERTED') {
    const doc = (await client.query('SELECT document_number FROM business_documents WHERE id=$1', [s.converted_document_id])).rows[0];
    return { replay: true, documentNumber: doc?.document_number };
  }
  if (s.status !== 'OPEN') throw new AppError('STATUS_INVALID', `Saran berstatus ${s.status}.`);
  const runtime = require('./runtime');
  const pr = await runtime.createDocument(client, {
    type: 'PURCHASE_REQUEST', user, title: `MRP: ${s.code} ${s.name}`, amount: idr(Number(s.suggested_qty) * Number(s.hpp || 0)), requestId,
    payload: { mrpSuggestionId: s.id, lines: [{ productId: s.product_id, description: `${s.code} · ${s.name} (saran MRP: ${s.source || 'kebutuhan produksi'})`, qty: Number(s.suggested_qty), uom: s.uom, unitPrice: Number(s.hpp || 0) }] }
  });
  await client.query(`UPDATE mrp_suggestions SET status='CONVERTED',converted_document_id=$2 WHERE id=$1`, [suggestionId, pr.id]);
  return { documentNumber: pr.documentNumber, documentId: pr.id };
}

module.exports = { planWorkOrder, releaseReservations, createIssueFromPlan, onMaterialIssued, logTime, completeOperation, productionPanel, finishWorkOrder, assertReadyToComplete, recordInspection, listInspections, runMrp, listMrp, convertMrp, listStockLocations };
