'use strict';
// Mesin dokumen tunggal: siklus status, optimistic locking, routing approval
// terpusat, dan publikasi event kecil. Semua modul transaksi memakai mesin ini.

const { store } = require('../infrastructure/database/store');
const { uid, nowIso } = require('./util');
const { AppError } = require('./errors');
const numbering = require('./numbering');
const audit = require('./audit');
const events = require('./events');
const { approvalLevelsFor } = require('./permissions');

const STATUSES = ['DRAFT','SUBMITTED','WAITING_APPROVAL','APPROVED','IN_PROCESS','COMPLETED','CLOSED','REVISION_REQUIRED','REJECTED','CANCELLED','VOID','ON_HOLD','EXPIRED','OVERDUE','PARTIALLY_COMPLETED','PARTIALLY_PAID','ARCHIVED'];

// Transisi yang diizinkan per aksi — vocabulary status konsisten lintas modul.
const TRANSITIONS = {
  submit:   { from: ['DRAFT','REVISION_REQUIRED'], to: 'WAITING_APPROVAL' },
  approve:  { from: ['WAITING_APPROVAL'], to: 'APPROVED' },
  reject:   { from: ['WAITING_APPROVAL'], to: 'REJECTED' },
  revise:   { from: ['WAITING_APPROVAL','SUBMITTED'], to: 'REVISION_REQUIRED' },
  start:    { from: ['APPROVED'], to: 'IN_PROCESS' },
  complete: { from: ['IN_PROCESS','PARTIALLY_COMPLETED'], to: 'COMPLETED' },
  close:    { from: ['COMPLETED','PARTIALLY_PAID'], to: 'CLOSED' },
  hold:     { from: ['APPROVED','IN_PROCESS'], to: 'ON_HOLD' },
  resume:   { from: ['ON_HOLD'], to: 'IN_PROCESS' },
  cancel:   { from: ['DRAFT','SUBMITTED','WAITING_APPROVAL','REVISION_REQUIRED','APPROVED'], to: 'CANCELLED' },
  void:     { from: ['APPROVED','IN_PROCESS','COMPLETED','CLOSED','PARTIALLY_PAID'], to: 'VOID' },
  archive:  { from: ['CLOSED','REJECTED','CANCELLED','VOID','COMPLETED'], to: 'ARCHIVED' }
};

// Peta tipe dokumen → modul permission (satu sumber untuk validasi izin).
const TYPE_MODULE = {
  CUSTOMER_INQUIRY: 'inquiry', QUOTATION: 'quotation', CUSTOMER_PO: 'customer_po', SALES_ORDER: 'sales_order',
  PROJECT: 'project', WORK_ORDER: 'work_order', PURCHASE_REQUEST: 'purchase_request', RFQ: 'rfq', PURCHASE_ORDER: 'purchase_order', PAYMENT_PROPOSAL: 'payment_proposal',
  GOODS_RECEIPT: 'goods_receipt', QC_INSPECTION: 'quality', MATERIAL_ISSUE: 'material_issue',
  STOCK_TRANSFER: 'stock_transfer', STOCK_ADJUSTMENT: 'stock_adjustment', STOCK_OPNAME: 'stock_opname', DELIVERY: 'delivery',
  INVOICE: 'invoice', CUSTOMER_PAYMENT: 'payment', SUPPLIER_INVOICE: 'supplier_invoice',
  SUPPLIER_PAYMENT: 'supplier_payment', EXPENSE: 'expense', JOURNAL: 'journal', PAYROLL_RUN: 'payroll',
  TAX_DOCUMENT: 'tax', LEAVE_REQUEST: 'leave'
};

// Event realtime per tipe (nama event dijaga sesuai kontrak README/master prompt).
const TYPE_EVENT = {
  QUOTATION: 'quotation.updated', PURCHASE_ORDER: 'purchase_order.updated', GOODS_RECEIPT: 'goods_receipt.created',
  WORK_ORDER: 'work_order.updated', QC_INSPECTION: 'quality_control.updated', DELIVERY: 'delivery.updated',
  INVOICE: 'invoice.updated', CUSTOMER_PAYMENT: 'payment.posted', PAYROLL_RUN: 'payroll.updated'
};

function moduleOf(type) { return TYPE_MODULE[type] || 'document'; }
function eventOf(type) { return TYPE_EVENT[type] || 'document.updated'; }

function create({ type, user, branchId, workLocationId, amount = 0, payload = {}, title, partyId, partyName, dueDate, requestId }) {
  if (!TYPE_MODULE[type]) throw new AppError('VALIDATION_ERROR', `Tipe dokumen '${type}' tidak dikenal.`);
  if (!(amount >= 0)) throw new AppError('VALIDATION_ERROR', 'Nilai dokumen tidak boleh negatif.');
  const now = nowIso();
  const doc = {
    id: uid(),
    documentNumber: numbering.next(type),
    documentType: type,
    title: title || type,
    branchId: branchId || user.branchId,
    workLocationId: workLocationId || null,
    partyId: partyId || null,
    partyName: partyName || null,
    status: 'DRAFT',
    version: 1,
    amount,
    dueDate: dueDate || null,
    payload,
    approvals: [],
    requiredApprovalLevels: [],
    createdAt: now, createdBy: user.id, createdByName: user.displayName,
    updatedAt: now, updatedBy: user.id, updatedByName: user.displayName,
    approvedAt: null, approvedBy: null, cancelledAt: null, cancelledBy: null,
    voidedAt: null, voidedBy: null, isArchived: false
  };
  store.collection('documents').insert(doc);
  audit.record({ user, action: 'CREATE', module: moduleOf(type), entityType: type, entityId: doc.id, documentNumber: doc.documentNumber, newValue: { title: doc.title, amount }, requestId, branchId: doc.branchId });
  events.publish(`${eventOf(type).split('.')[0]}.created`, { entityId: doc.documentNumber, documentType: type, branchId: doc.branchId });
  return doc;
}

// Update dengan optimistic locking: versi wajib cocok, tidak ada silent overwrite.
function update({ id, expectedVersion, patch, user, requestId }) {
  const docs = store.collection('documents');
  const doc = docs.get(id);
  if (!doc) throw new AppError('RESOURCE_NOT_FOUND', 'Dokumen tidak ditemukan.');
  if (!Number.isInteger(expectedVersion)) throw new AppError('VALIDATION_ERROR', 'Field "version" wajib dikirim untuk penyimpanan.');
  if (doc.version !== expectedVersion) {
    throw new AppError('DOCUMENT_CONFLICT', `Versi Anda ${expectedVersion}, versi terbaru ${doc.version} (diubah oleh ${doc.updatedByName}).`, { currentVersion: doc.version });
  }
  if (!['DRAFT','REVISION_REQUIRED'].includes(doc.status)) {
    throw new AppError('STATUS_INVALID', `Dokumen berstatus ${doc.status} tidak dapat diedit langsung.`);
  }
  const allowed = ['title','amount','dueDate','payload','partyId','partyName','workLocationId'];
  const oldValue = {};
  const applied = {};
  for (const key of allowed) {
    if (patch[key] !== undefined) { oldValue[key] = doc[key]; applied[key] = patch[key]; }
  }
  if (applied.amount !== undefined && !(applied.amount >= 0)) throw new AppError('VALIDATION_ERROR', 'Nilai dokumen tidak boleh negatif.');
  const updated = docs.update(id, { ...applied, version: doc.version + 1, updatedAt: nowIso(), updatedBy: user.id, updatedByName: user.displayName });
  audit.record({ user, action: 'UPDATE', module: moduleOf(doc.documentType), entityType: doc.documentType, entityId: id, documentNumber: doc.documentNumber, oldValue, newValue: applied, requestId, branchId: doc.branchId });
  events.publish(eventOf(doc.documentType), { entityId: doc.documentNumber, documentType: doc.documentType, version: updated.version, branchId: doc.branchId });
  return updated;
}

const ACTION_AUDIT = { submit: 'SUBMIT', approve: 'APPROVE', reject: 'REJECT', revise: 'REQUEST_REVISION', cancel: 'CANCEL', void: 'VOID', start: 'POST', complete: 'POST', close: 'POST', hold: 'UPDATE', resume: 'UPDATE', archive: 'ARCHIVE' };

function transition({ id, action, user, reason, requestId }) {
  const docs = store.collection('documents');
  const doc = docs.get(id);
  if (!doc) throw new AppError('RESOURCE_NOT_FOUND', 'Dokumen tidak ditemukan.');
  const rule = TRANSITIONS[action];
  if (!rule) throw new AppError('VALIDATION_ERROR', `Aksi '${action}' tidak dikenal.`);
  if (!rule.from.includes(doc.status)) {
    throw new AppError('STATUS_INVALID', `Aksi '${action}' tidak diizinkan dari status ${doc.status}.`);
  }
  if (['void','cancel','reject','revise'].includes(action) && !reason) {
    throw new AppError('REASON_REQUIRED');
  }

  const now = nowIso();
  const patch = { status: rule.to, version: doc.version + 1, updatedAt: now, updatedBy: user.id, updatedByName: user.displayName };

  if (action === 'submit') {
    patch.requiredApprovalLevels = approvalLevelsFor(doc.amount);
    patch.approvals = [];
    patch.submittedAt = now;
  }
  if (action === 'approve') {
    const levels = doc.requiredApprovalLevels.length ? doc.requiredApprovalLevels : approvalLevelsFor(doc.amount);
    const done = doc.approvals.map((a) => a.level);
    const nextLevel = levels.find((level) => !done.includes(level));
    patch.approvals = [...doc.approvals, { level: nextLevel, userId: user.id, userName: user.displayName, at: now, comment: reason || null }];
    const remaining = levels.filter((level) => ![...done, nextLevel].includes(level));
    if (remaining.length) { patch.status = 'WAITING_APPROVAL'; } // masih ada jenjang berikutnya
    else { patch.approvedAt = now; patch.approvedBy = user.id; }
  }
  if (action === 'cancel') { patch.cancelledAt = now; patch.cancelledBy = user.id; }
  if (action === 'void') { patch.voidedAt = now; patch.voidedBy = user.id; }
  if (action === 'archive') { patch.isArchived = true; }

  const updated = docs.update(id, patch);
  audit.record({ user, action: ACTION_AUDIT[action], module: moduleOf(doc.documentType), entityType: doc.documentType, entityId: id, documentNumber: doc.documentNumber, oldValue: { status: doc.status }, newValue: { status: patch.status }, reason, requestId, branchId: doc.branchId });
  const eventName = action === 'approve' || action === 'reject' || action === 'submit' || action === 'revise' ? 'approval.updated' : eventOf(doc.documentType);
  events.publish(eventName, { entityId: doc.documentNumber, documentType: doc.documentType, version: updated.version, status: patch.status, branchId: doc.branchId });
  if (patch.status !== doc.status) events.publish(eventOf(doc.documentType), { entityId: doc.documentNumber, documentType: doc.documentType, version: updated.version, status: patch.status, branchId: doc.branchId });
  return updated;
}

// Antrean approval untuk user: dokumen WAITING_APPROVAL yang jenjang berikutnya
// sesuai peran user (supervisor/finance/owner) — matriks terpusat, bukan per halaman.
function pendingApprovalsFor(user) {
  const roleLevel = { owner: 'owner', finance: 'finance', accounting: 'finance', admin: 'supervisor', hrd: 'supervisor', sales: 'supervisor', procurement: 'supervisor', warehouse: 'supervisor', production: 'supervisor' }[user.role];
  return store.collection('documents').find((doc) => {
    if (doc.status !== 'WAITING_APPROVAL') return false;
    const levels = doc.requiredApprovalLevels.length ? doc.requiredApprovalLevels : approvalLevelsFor(doc.amount);
    const done = doc.approvals.map((a) => a.level);
    const nextLevel = levels.find((level) => !done.includes(level));
    if (user.role === 'owner' || user.role === 'admin') return true;
    return nextLevel === roleLevel;
  });
}

module.exports = { STATUSES, TRANSITIONS, TYPE_MODULE, moduleOf, eventOf, create, update, transition, pendingApprovalsFor };
