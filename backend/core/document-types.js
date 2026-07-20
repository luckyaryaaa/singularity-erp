'use strict';

const TYPE_MODULE = Object.freeze({
  CUSTOMER_INQUIRY: 'inquiry', QUOTATION: 'quotation', CUSTOMER_PO: 'customer_po', SALES_ORDER: 'sales_order',
  PROJECT: 'project', WORK_ORDER: 'work_order', PURCHASE_REQUEST: 'purchase_request', RFQ: 'rfq', PURCHASE_ORDER: 'purchase_order', PAYMENT_PROPOSAL: 'payment_proposal',
  GOODS_RECEIPT: 'goods_receipt', QC_INSPECTION: 'quality', MATERIAL_ISSUE: 'material_issue',
  STOCK_TRANSFER: 'stock_transfer', STOCK_ADJUSTMENT: 'stock_adjustment', STOCK_OPNAME: 'stock_opname', DELIVERY: 'delivery', RMA: 'rma',
  INVOICE: 'invoice', CUSTOMER_PAYMENT: 'payment', SUPPLIER_INVOICE: 'supplier_invoice',
  SUPPLIER_PAYMENT: 'supplier_payment', EXPENSE: 'expense', JOURNAL: 'journal', PAYROLL_RUN: 'payroll',
  TAX_DOCUMENT: 'tax', LEAVE_REQUEST: 'leave'
});

const TYPE_EVENT = Object.freeze({
  QUOTATION: 'quotation.updated', PURCHASE_ORDER: 'purchase_order.updated', GOODS_RECEIPT: 'goods_receipt.created',
  WORK_ORDER: 'work_order.updated', QC_INSPECTION: 'quality_control.updated', DELIVERY: 'delivery.updated',
  INVOICE: 'invoice.updated', CUSTOMER_PAYMENT: 'payment.posted', PAYROLL_RUN: 'payroll.updated'
});

function moduleOf(type) { return TYPE_MODULE[type] || 'document'; }
function eventOf(type) { return TYPE_EVENT[type] || 'document.updated'; }

module.exports = { TYPE_MODULE, TYPE_EVENT, moduleOf, eventOf };
