'use strict';
// Kontrak/blanket pembelian.
//
// Sisi penjualan punya kontrak kerangka sejak v0.34, tetapi sisi PEMBELIAN
// tidak punya sama sekali: setiap Purchase Order berdiri sendiri, harga
// dinegosiasikan ulang tiap kali, dan tidak ada yang mencegah pembelian
// melampaui pagu yang sudah disepakati dengan pemasok.
//
// Struktur dan aturannya sengaja MENCERMIN sales-commercial.js — nama, status,
// maker-checker, dan pola release yang sama. Dua konvensi berbeda untuk konsep
// yang sama hanya melahirkan aturan bisnis kembar.
const { randomUUID } = require('node:crypto');
const { AppError } = require('../../../core/errors');
const permissions = require('../../../core/permissions');
const runtime = require('./runtime');
const businessDate = require('../../../core/business-date');

const camel = runtime.camel;
const round = (n, scale = 2) => Math.round(Number(n) * (10 ** scale)) / (10 ** scale);
const requireReason = (reason) => {
  if (!String(reason || '').trim()) throw new AppError('REASON_REQUIRED');
  return String(reason).trim().slice(0, 1000);
};

async function getContract(client, id, user, { forUpdate = false } = {}) {
  const row = (await client.query(
    `SELECT * FROM purchase_contracts WHERE id=$1${forUpdate ? ' FOR UPDATE' : ''}`, [id])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Kontrak pembelian tidak ditemukan.');
  permissions.assertBranchScope(user, row.branch_id, 'Kontrak pembelian');
  return row;
}

async function createContract(client, input, user, requestId) {
  permissions.assertPermission(user, 'purchase_order.create');
  const supplier = (await client.query(
    'SELECT id,name,onboarding_status,performance_hold FROM suppliers WHERE id=$1 AND active', [input.supplierId])).rows[0];
  if (!supplier) throw new AppError('RESOURCE_NOT_FOUND', 'Pemasok kontrak tidak ditemukan atau non-aktif.');
  // Pemasok yang ditahan tidak boleh diikat kontrak jangka panjang — komitmen
  // volume kepada pemasok bermasalah justru memperbesar paparannya.
  if (supplier.performance_hold || ['SUSPENDED', 'BLOCKED'].includes(supplier.onboarding_status)) {
    throw new AppError('SUPPLIER_HOLD', `Pemasok ${supplier.name} sedang ditahan — kontrak tidak dapat dibuat.`);
  }
  const lines = Array.isArray(input.lines) ? input.lines : [];
  if (!lines.length) throw new AppError('VALIDATION_ERROR', 'Kontrak membutuhkan minimal satu baris komitmen.');
  const ceiling = round(input.ceilingAmount);
  if (!(ceiling > 0)) throw new AppError('VALIDATION_ERROR', 'Pagu kontrak harus lebih dari nol.');
  const validFrom = businessDate.toBusinessDate(input.validFrom);
  const validTo = businessDate.toBusinessDate(input.validTo);
  if (validTo < validFrom) throw new AppError('VALIDATION_ERROR', 'Masa berlaku kontrak tidak valid.');

  // Jumlah pagu baris tidak boleh melampaui pagu kontrak; kalau boleh, pagu
  // kontraknya kehilangan arti.
  const lineCeiling = round(lines.reduce((n, l) => n + Number(l.ceilingAmount || 0), 0));
  if (lineCeiling > ceiling) {
    throw new AppError('VALIDATION_ERROR',
      `Jumlah pagu baris (${lineCeiling}) melampaui pagu kontrak (${ceiling}).`,
      { lineCeiling, contractCeiling: ceiling });
  }

  const branchId = input.branchId || user.branchId;
  permissions.assertBranchScope(user, branchId, 'Kontrak pembelian');
  const legalEntityId = (await client.query('SELECT legal_entity_id FROM branches WHERE id=$1', [branchId])).rows[0]?.legal_entity_id;
  if (!legalEntityId) throw new AppError('VALIDATION_ERROR', 'Cabang kontrak belum tertaut legal entity.');

  const contract = (await client.query(
    `INSERT INTO purchase_contracts(id,contract_number,legal_entity_id,branch_id,supplier_id,title,contract_type,
       valid_from,valid_to,currency,ceiling_amount,terms,created_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [randomUUID(), await nextContractNumber(client, branchId), legalEntityId, branchId, supplier.id,
      String(input.title || `Kontrak ${supplier.name}`).slice(0, 200),
      String(input.contractType || 'BLANKET').toUpperCase(), validFrom, validTo,
      String(input.currency || 'IDR').toUpperCase(), ceiling, JSON.stringify(input.terms || {}), user.id])).rows[0];

  for (let i = 0; i < lines.length; i += 1) {
    const l = lines[i];
    await client.query(
      `INSERT INTO purchase_contract_lines(id,contract_id,line_no,product_id,description,committed_qty,ceiling_amount,uom,unit_price)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [randomUUID(), contract.id, i + 1, l.productId || null,
        String(l.description || `Baris ${i + 1}`).slice(0, 500),
        l.committedQty != null ? Number(l.committedQty) : null,
        round(l.ceilingAmount || 0), l.uom || null, l.unitPrice != null ? round(l.unitPrice) : null]);
  }
  await runtime.audit(client, { userId: user.id, action: 'CREATE', module: 'purchase_order',
    entityType: 'PURCHASE_CONTRACT', entityId: contract.id, documentNumber: contract.contract_number,
    newValue: { supplierId: supplier.id, ceiling, validFrom, validTo, lines: lines.length },
    requestId, branchId });
  return camel(contract);
}

async function nextContractNumber(client, branchId) {
  const branch = (await client.query('SELECT code FROM branches WHERE id=$1', [branchId])).rows[0];
  const period = businessDate.today().slice(2, 7).replace('-', '');
  const seq = (await client.query(
    `SELECT count(*)+1 n FROM purchase_contracts WHERE branch_id=$1 AND to_char(created_at,'YYYY-MM')=$2`,
    [branchId, businessDate.periodOf(businessDate.today())])).rows[0].n;
  return `PC-${(branch?.code || 'HO').replace(/[^A-Z0-9]/gi, '').toUpperCase()}-${period}-${String(seq).padStart(3, '0')}`;
}

// Maker-checker: kontrak baru berlaku setelah disetujui orang lain.
async function decideContract(client, { id, approve, reason, user, requestId }) {
  permissions.assertPermission(user, 'purchase_order.approve');
  reason = requireReason(reason);
  const contract = await getContract(client, id, user, { forUpdate: true });
  if (!['DRAFT', 'PENDING_APPROVAL'].includes(contract.status)) {
    throw new AppError('STATUS_INVALID', `Kontrak berstatus ${contract.status} tidak dapat diputuskan.`);
  }
  if (String(contract.created_by) === String(user.id)) {
    throw new AppError('SOD_CONFLICT', 'Penyusun kontrak tidak boleh menyetujui kontraknya sendiri.');
  }
  const status = approve ? 'ACTIVE' : 'REJECTED';
  const row = (await client.query(
    `UPDATE purchase_contracts SET status=$2,approved_at=now(),approved_by=$3,decision_reason=$4,
       version=version+1,updated_at=now() WHERE id=$1 RETURNING *`,
    [id, status, user.id, reason])).rows[0];
  await runtime.audit(client, { userId: user.id, action: approve ? 'APPROVE' : 'REJECT', module: 'purchase_order',
    entityType: 'PURCHASE_CONTRACT', entityId: id, documentNumber: contract.contract_number,
    oldValue: { status: contract.status }, newValue: { status }, reason, requestId, branchId: contract.branch_id });
  return camel(row);
}

// Menarik (release) dari kontrak ke sebuah Purchase Order. Inilah yang membuat
// kontrak berarti: tanpa penegakan di sini, pagu dan komitmen volume hanya
// catatan yang tidak pernah membatasi apa pun.
async function releaseContract(client, { id, purchaseOrderId, contractLineId, purchaseOrderLineId,
  releasedQty, releasedAmount, user, requestId }) {
  permissions.assertPermission(user, 'purchase_order.create');
  const contract = await getContract(client, id, user, { forUpdate: true });
  const today = businessDate.today();
  if (contract.status !== 'ACTIVE' || contract.valid_from > today || contract.valid_to < today) {
    throw new AppError('STATUS_INVALID',
      `Kontrak ${contract.contract_number} tidak aktif pada ${today} (status ${contract.status}, berlaku ${contract.valid_from}–${contract.valid_to}).`);
  }
  const po = (await client.query(
    `SELECT * FROM business_documents WHERE id=$1 AND document_type='PURCHASE_ORDER'`, [purchaseOrderId])).rows[0];
  if (!po) throw new AppError('RESOURCE_NOT_FOUND', 'Purchase Order tidak ditemukan.');
  permissions.assertBranchScope(user, po.branch_id, 'Purchase Order');
  if (String(po.party_id) !== String(contract.supplier_id)) {
    throw new AppError('VALIDATION_ERROR', 'Pemasok Purchase Order tidak cocok dengan kontrak.',
      { contractSupplierId: contract.supplier_id, poSupplierId: po.party_id });
  }

  const amount = round(releasedAmount);
  if (!(amount > 0)) throw new AppError('VALIDATION_ERROR', 'Nilai release harus lebih dari nol.');
  const remaining = round(Number(contract.ceiling_amount) - Number(contract.consumed_amount));
  if (amount > remaining) {
    throw new AppError('VALIDATION_ERROR',
      `Release ${amount} melampaui sisa pagu kontrak ${remaining}.`,
      { ceilingAmount: Number(contract.ceiling_amount), consumedAmount: Number(contract.consumed_amount), remainingAmount: remaining });
  }

  let line = null;
  if (contractLineId) {
    line = (await client.query(
      'SELECT * FROM purchase_contract_lines WHERE id=$1 AND contract_id=$2 FOR UPDATE', [contractLineId, id])).rows[0];
    if (!line) throw new AppError('RESOURCE_NOT_FOUND', 'Baris kontrak tidak ditemukan.');
    const qty = releasedQty == null ? null : Number(releasedQty);
    const lineRemaining = round(Number(line.ceiling_amount) - Number(line.released_amount));
    if (amount > lineRemaining) {
      throw new AppError('VALIDATION_ERROR', `Release ${amount} melampaui sisa pagu baris ${lineRemaining}.`,
        { lineRemainingAmount: lineRemaining });
    }
    if (qty != null && line.committed_qty != null) {
      const qtyRemaining = round(Number(line.committed_qty) - Number(line.released_qty), 4);
      if (qty > qtyRemaining) {
        throw new AppError('VALIDATION_ERROR',
          `Release ${qty} melampaui sisa komitmen volume ${qtyRemaining} pada baris kontrak.`,
          { committedQty: Number(line.committed_qty), releasedQty: Number(line.released_qty), remainingQty: qtyRemaining });
      }
    }
    await client.query(
      'UPDATE purchase_contract_lines SET released_amount=released_amount+$2,released_qty=released_qty+COALESCE($3,0) WHERE id=$1',
      [line.id, amount, qty]);
  }

  if (purchaseOrderLineId) {
    const poLine = (await client.query(
      'SELECT * FROM document_lines WHERE id=$1 AND document_id=$2', [purchaseOrderLineId, purchaseOrderId])).rows[0];
    if (!poLine) throw new AppError('VALIDATION_ERROR', 'Baris Purchase Order tidak berada pada PO release.');
    if (line?.product_id && poLine.product_id && String(line.product_id) !== String(poLine.product_id)) {
      throw new AppError('VALIDATION_ERROR', 'Produk baris kontrak tidak cocok dengan baris Purchase Order.');
    }
    // Harga kontrak adalah harga yang disepakati. Membayar di atasnya berarti
    // kontraknya tidak berlaku — ditolak, bukan sekadar diperingatkan.
    if (line?.unit_price != null && poLine.unit_price != null
        && round(Number(poLine.unit_price)) > round(Number(line.unit_price))) {
      throw new AppError('VALIDATION_ERROR',
        `Harga PO ${Number(poLine.unit_price)} melampaui harga kontrak ${Number(line.unit_price)}.`,
        { contractUnitPrice: Number(line.unit_price), poUnitPrice: Number(poLine.unit_price) });
    }
  }

  const row = (await client.query(
    `INSERT INTO purchase_contract_releases(id,contract_id,contract_line_id,purchase_order_id,purchase_order_line_id,released_qty,released_amount,released_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [randomUUID(), id, contractLineId || null, purchaseOrderId, purchaseOrderLineId || null,
      releasedQty == null ? null : Number(releasedQty), amount, user.id])).rows[0];
  await client.query(
    'UPDATE purchase_contracts SET consumed_amount=consumed_amount+$2,version=version+1,updated_at=now() WHERE id=$1',
    [id, amount]);
  await runtime.audit(client, { userId: user.id, action: 'RELEASE', module: 'purchase_order',
    entityType: 'PURCHASE_CONTRACT', entityId: id, documentNumber: contract.contract_number,
    newValue: { purchaseOrderId, contractLineId, releasedQty, releasedAmount: amount },
    requestId, branchId: contract.branch_id });
  return camel(row);
}

async function listContracts(client, user, { supplierId = null, status = null } = {}) {
  permissions.assertPermission(user, 'purchase_order.view');
  const params = []; let where = 'TRUE';
  if (supplierId) { params.push(supplierId); where += ` AND c.supplier_id=$${params.length}`; }
  if (status) { params.push(String(status).toUpperCase()); where += ` AND c.status=$${params.length}`; }
  const rows = (await client.query(
    `SELECT c.*,s.name supplier_name,
       (c.ceiling_amount-c.consumed_amount)::float remaining_amount,
       (SELECT count(*)::int FROM purchase_contract_lines l WHERE l.contract_id=c.id) line_count
     FROM purchase_contracts c JOIN suppliers s ON s.id=c.supplier_id
     WHERE ${where} ORDER BY c.created_at DESC LIMIT 200`, params)).rows;
  return { items: rows.map(camel) };
}

async function contractDetail(client, id, user) {
  permissions.assertPermission(user, 'purchase_order.view');
  const contract = await getContract(client, id, user);
  const lines = (await client.query(
    `SELECT l.*,p.code product_code,(l.ceiling_amount-l.released_amount)::float remaining_amount,
       CASE WHEN l.committed_qty IS NULL THEN NULL ELSE (l.committed_qty-l.released_qty)::float END remaining_qty
     FROM purchase_contract_lines l LEFT JOIN products p ON p.id=l.product_id
     WHERE l.contract_id=$1 ORDER BY l.line_no`, [id])).rows;
  const releases = (await client.query(
    `SELECT r.*,d.document_number purchase_order_number,d.status purchase_order_status
     FROM purchase_contract_releases r JOIN business_documents d ON d.id=r.purchase_order_id
     WHERE r.contract_id=$1 ORDER BY r.released_at DESC`, [id])).rows;
  return {
    ...camel(contract),
    remainingAmount: round(Number(contract.ceiling_amount) - Number(contract.consumed_amount)),
    lines: lines.map(camel),
    releases: releases.map(camel)
  };
}

module.exports = { createContract, decideContract, releaseContract, listContracts, contractDetail, getContract };
