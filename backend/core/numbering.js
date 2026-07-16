'use strict';
// Mesin penomoran dokumen tunggal. Format existing dipertahankan:
// {PREFIX}-{MMYY}-{URUT 3 DIGIT}, contoh WO-0726-018. Urutan per prefix per periode.

const { store } = require('../infrastructure/database/store');

const PREFIXES = {
  CUSTOMER_INQUIRY: 'INQ', QUOTATION: 'QUO', CUSTOMER_PO: 'CPO', SALES_ORDER: 'SO', PROJECT: 'PRJ',
  WORK_ORDER: 'WO', PURCHASE_REQUEST: 'PR', PURCHASE_ORDER: 'PO', GOODS_RECEIPT: 'GR',
  QC_INSPECTION: 'QC', MATERIAL_ISSUE: 'MI', STOCK_TRANSFER: 'TRF', STOCK_ADJUSTMENT: 'ADJ', STOCK_OPNAME: 'OPN',
  DELIVERY: 'DO', INVOICE: 'INV', CUSTOMER_PAYMENT: 'PAY', SUPPLIER_INVOICE: 'SINV',
  SUPPLIER_PAYMENT: 'SPAY', EXPENSE: 'EXP', JOURNAL: 'JRN', PAYROLL_RUN: 'PRL',
  TAX_DOCUMENT: 'TAX', LEAVE_REQUEST: 'LVE', REPORT: 'RPT'
};

function next(documentType, date = new Date()) {
  const prefix = PREFIXES[documentType];
  if (!prefix) throw new Error(`Tipe dokumen tidak dikenal: ${documentType}`);
  const period = `${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getFullYear()).slice(-2)}`;
  const counters = store.collection('numbering_counters');
  const key = `${prefix}-${period}`;
  const row = counters.get(key) || counters.insert({ id: key, prefix, period, sequence: 0 });
  const sequence = row.sequence + 1;
  counters.update(key, { sequence });
  return `${prefix}-${period}-${String(sequence).padStart(3, '0')}`;
}

// Dipakai seed agar counter melanjutkan dari nomor tertinggi yang sudah ada.
function ensureCounter(documentType, period, sequence) {
  const prefix = PREFIXES[documentType];
  const counters = store.collection('numbering_counters');
  const key = `${prefix}-${period}`;
  const row = counters.get(key);
  if (!row) counters.insert({ id: key, prefix, period, sequence });
  else if (row.sequence < sequence) counters.update(key, { sequence });
}

module.exports = { next, ensureCounter, PREFIXES };
