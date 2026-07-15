'use strict';
// Wave 2 — Source-to-Pay & credit control (R016/R017).
// RFQ + perbandingan supplier, three-way match ber-toleransi, payment proposal,
// dan enforcement kredit pelanggan. Semua mutasi lewat transaksi + audit.

const { AppError } = require('../../../core/errors');
const { assertPermission } = require('../../../core/permissions');
const runtime = require('./runtime');

// ── Kontrol kredit pelanggan (§12.5) ─────────────────────────────────────────
// Eksposur = total invoice belum lunas (approved/partially paid/overdue).
async function creditStatus(client, customerId) {
  const cust = (await client.query(
    `SELECT id, name, credit_hold, credit_hold_reason, credit_limit_amount, credit_term_days FROM customers WHERE id=$1`, [customerId])).rows[0];
  if (!cust) return null;
  const exposure = Number((await client.query(
    `SELECT COALESCE(sum(amount - COALESCE((payload->>'paid')::numeric,0)),0) e
     FROM business_documents WHERE document_type='INVOICE' AND party_id=$1
     AND status IN ('APPROVED','PARTIALLY_PAID','OVERDUE','IN_PROCESS')`, [customerId])).rows[0].e);
  const limit = Number(cust.credit_limit_amount);
  return {
    customerId, name: cust.name, creditHold: cust.credit_hold, creditHoldReason: cust.credit_hold_reason,
    creditLimit: limit, exposure, available: limit > 0 ? limit - exposure : null, termDays: cust.credit_term_days
  };
}

// Dipanggil saat submit SO/INVOICE: blokir bila hold atau melewati limit,
// kecuali ada credit override finance yang masih berlaku.
async function assertCreditOk(client, doc) {
  if (!['SALES_ORDER', 'INVOICE'].includes(doc.document_type) || !doc.party_id) return;
  const status = await creditStatus(client, doc.party_id);
  if (!status) return;
  const override = (await client.query(
    `SELECT id FROM credit_overrides WHERE document_id=$1 AND expires_at>now() LIMIT 1`, [doc.id])).rows[0];
  if (override) return; // sudah disetujui finance
  if (status.creditHold) {
    throw new AppError('CREDIT_HOLD', `Pelanggan ${status.name} dalam credit hold${status.creditHoldReason ? ': ' + status.creditHoldReason : ''}.`, { customerId: doc.party_id });
  }
  if (status.creditLimit > 0) {
    const projected = status.exposure + Number(doc.amount);
    if (projected > status.creditLimit) {
      throw new AppError('CREDIT_HOLD', `Eksposur ${projected.toLocaleString('id-ID')} melampaui batas kredit ${status.creditLimit.toLocaleString('id-ID')}.`,
        { customerId: doc.party_id, exposure: status.exposure, creditLimit: status.creditLimit, requested: Number(doc.amount) });
    }
  }
}

async function grantCreditOverride(client, { documentId, reason, user, requestId }) {
  assertPermission(user, 'credit.approve');
  if (!reason) throw new AppError('REASON_REQUIRED');
  const doc = (await client.query(`SELECT * FROM business_documents WHERE id=$1`, [documentId])).rows[0];
  if (!doc || !doc.party_id) throw new AppError('RESOURCE_NOT_FOUND', 'Dokumen atau pelanggan tidak ditemukan.');
  const status = await creditStatus(client, doc.party_id);
  const row = (await client.query(
    `INSERT INTO credit_overrides(customer_id,document_id,requested_amount,exposure_before,credit_limit,reason,approved_by)
     VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [doc.party_id, documentId, doc.amount, status.exposure, status.creditLimit, reason, user.id])).rows[0];
  await runtime.audit(client, { userId: user.id, action: 'APPROVE', module: 'credit', entityType: 'CREDIT_OVERRIDE', entityId: row.id, documentNumber: doc.document_number, newValue: { requested: Number(doc.amount), limit: status.creditLimit }, reason, requestId, branchId: doc.branch_id });
  return runtime.camel(row);
}

// ── RFQ & perbandingan supplier (§13.2) ──────────────────────────────────────
async function addQuote(client, { rfqId, body, user, requestId }) {
  assertPermission(user, 'rfq.edit');
  const rfq = (await client.query(`SELECT * FROM business_documents WHERE id=$1 AND document_type='RFQ'`, [rfqId])).rows[0];
  if (!rfq) throw new AppError('RESOURCE_NOT_FOUND', 'RFQ tidak ditemukan.');
  if (!body.supplierId) throw new AppError('VALIDATION_ERROR', 'Supplier wajib dipilih.');
  const row = (await client.query(
    `INSERT INTO rfq_quotes(rfq_document_id,supplier_id,currency,price_total,tax_total,freight_total,lead_time_days,payment_terms,moq_note,quality_score,created_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT(rfq_document_id,supplier_id) DO UPDATE SET price_total=excluded.price_total,tax_total=excluded.tax_total,freight_total=excluded.freight_total,lead_time_days=excluded.lead_time_days,payment_terms=excluded.payment_terms,quality_score=excluded.quality_score,received_at=now()
     RETURNING *`,
    [rfqId, body.supplierId, body.currency || 'IDR', Number(body.priceTotal) || 0, Number(body.taxTotal) || 0, Number(body.freightTotal) || 0,
     body.leadTimeDays || null, body.paymentTerms || null, body.moqNote || null, body.qualityScore || null, user.id])).rows[0];
  await runtime.audit(client, { userId: user.id, action: 'CREATE', module: 'rfq', entityType: 'RFQ_QUOTE', entityId: row.id, documentNumber: rfq.document_number, newValue: { supplierId: body.supplierId, landed: Number(row.landed_cost) }, requestId, branchId: rfq.branch_id });
  return runtime.camel(row);
}

async function listQuotes(client, rfqId, user) {
  assertPermission(user, 'rfq.view');
  const rows = (await client.query(
    `SELECT q.*, s.name supplier_name, s.code supplier_code,
       (SELECT overall_score FROM supplier_evaluations e WHERE e.supplier_id=q.supplier_id ORDER BY period DESC LIMIT 1) supplier_score
     FROM rfq_quotes q JOIN suppliers s ON s.id=q.supplier_id WHERE q.rfq_document_id=$1
     ORDER BY q.landed_cost ASC`, [rfqId])).rows.map(runtime.camel);
  // Tandai rekomendasi: landed cost terendah + skor supplier bila ada.
  if (rows.length) rows[0].recommended = true;
  return rows;
}

async function selectQuote(client, { rfqId, quoteId, reason, user, requestId }) {
  assertPermission(user, 'rfq.approve');
  if (!reason) throw new AppError('REASON_REQUIRED');
  const rfq = (await client.query(`SELECT * FROM business_documents WHERE id=$1 AND document_type='RFQ' FOR UPDATE`, [rfqId])).rows[0];
  if (!rfq) throw new AppError('RESOURCE_NOT_FOUND', 'RFQ tidak ditemukan.');
  const quote = (await client.query(`SELECT * FROM rfq_quotes WHERE id=$1 AND rfq_document_id=$2`, [quoteId, rfqId])).rows[0];
  if (!quote) throw new AppError('RESOURCE_NOT_FOUND', 'Kuota supplier tidak ditemukan.');
  await client.query(`UPDATE rfq_quotes SET is_selected=false, selection_reason=NULL WHERE rfq_document_id=$1`, [rfqId]);
  await client.query(`UPDATE rfq_quotes SET is_selected=true, selection_reason=$3 WHERE id=$1 AND rfq_document_id=$2`, [quoteId, rfqId, reason]);
  await client.query(`UPDATE business_documents SET payload=payload||jsonb_build_object('selectedSupplierId',$2::text,'selectedLandedCost',$3::numeric), updated_at=now() WHERE id=$1`, [rfqId, quote.supplier_id, Number(quote.landed_cost)]);
  await runtime.audit(client, { userId: user.id, action: 'APPROVE', module: 'rfq', entityType: 'RFQ_SELECTION', entityId: quoteId, documentNumber: rfq.document_number, newValue: { supplierId: quote.supplier_id, landed: Number(quote.landed_cost) }, reason, requestId, branchId: rfq.branch_id });
  return { ok: true, selectedSupplierId: quote.supplier_id, landedCost: Number(quote.landed_cost) };
}

// Konversi RFQ terpilih → Purchase Order (menyalin supplier + landed cost).
async function rfqToPurchaseOrder(client, { rfqId, user, requestId }) {
  assertPermission(user, 'purchase_order.create');
  const rfq = (await client.query(`SELECT * FROM business_documents WHERE id=$1 AND document_type='RFQ' FOR UPDATE`, [rfqId])).rows[0];
  if (!rfq) throw new AppError('RESOURCE_NOT_FOUND', 'RFQ tidak ditemukan.');
  const selected = (await client.query(`SELECT q.*, s.name supplier_name FROM rfq_quotes q JOIN suppliers s ON s.id=q.supplier_id WHERE q.rfq_document_id=$1 AND q.is_selected LIMIT 1`, [rfqId])).rows[0];
  if (!selected) throw new AppError('STATUS_INVALID', 'Pilih kuota supplier terlebih dahulu sebelum membuat PO.');
  const existing = (await client.query(`SELECT c.* FROM document_relations r JOIN business_documents c ON c.id=r.child_document_id WHERE r.parent_document_id=$1 AND r.relation_type='RFQ_TO_PO' LIMIT 1`, [rfqId])).rows[0];
  if (existing) return { alreadyConverted: true, child: runtime.camel(existing) };
  const po = await runtime.createDocument(client, {
    type: 'PURCHASE_ORDER', user: { ...user, branchId: rfq.branch_id },
    title: `PO dari ${rfq.document_number} — ${selected.supplier_name}`, amount: Number(selected.landed_cost),
    partyId: selected.supplier_id, partyName: selected.supplier_name,
    payload: { ...(rfq.payload || {}), sourceRfqId: rfq.id, sourceRfqNumber: rfq.document_number, supplierId: selected.supplier_id, leadTimeDays: selected.lead_time_days }, requestId
  });
  await client.query(`INSERT INTO document_relations(parent_document_id,child_document_id,relation_type,created_by) VALUES($1,$2,'RFQ_TO_PO',$3)`, [rfq.id, po.id, user.id]);
  return { alreadyConverted: false, child: po };
}

// ── Three-way match (§13.5) ──────────────────────────────────────────────────
// Bandingkan Supplier Invoice dengan PO & GR terkait dalam toleransi aktif.
async function evaluateThreeWayMatch(client, { supplierInvoiceId, user, requestId }) {
  const inv = (await client.query(`SELECT * FROM business_documents WHERE id=$1 AND document_type='SUPPLIER_INVOICE'`, [supplierInvoiceId])).rows[0];
  if (!inv) throw new AppError('RESOURCE_NOT_FOUND', 'Tagihan supplier tidak ditemukan.');
  // Telusuri PO & GR melalui payload/relasi dokumen.
  const poNumber = inv.payload?.purchaseOrderNumber || inv.payload?.sourceDocumentNumber;
  const po = poNumber ? (await client.query(`SELECT * FROM business_documents WHERE document_number=$1 AND document_type='PURCHASE_ORDER'`, [poNumber])).rows[0] : null;
  const gr = po ? (await client.query(`SELECT c.* FROM document_relations r JOIN business_documents c ON c.id=r.child_document_id WHERE r.parent_document_id=$1 AND c.document_type='GOODS_RECEIPT' LIMIT 1`, [po.id])).rows[0] : null;
  const tol = (await client.query(`SELECT * FROM match_tolerance_config WHERE active ORDER BY effective_from DESC LIMIT 1`)).rows[0] || { price_tolerance_pct: 2, amount_tolerance_abs: 50000, qty_tolerance_pct: 5 };

  const poAmt = po ? Number(po.amount) : null, grAmt = gr ? Number(gr.amount) : null, invAmt = Number(inv.amount);
  const exceptions = [];
  if (!po) exceptions.push('PO referensi tidak ditemukan pada tagihan.');
  if (po && !gr) exceptions.push('Penerimaan barang (GR) belum tercatat untuk PO ini.');
  let amountVar = null, priceVarPct = null;
  if (po) {
    amountVar = Math.abs(invAmt - poAmt);
    priceVarPct = poAmt ? Math.abs(invAmt - poAmt) / poAmt * 100 : 0;
    if (amountVar > Number(tol.amount_tolerance_abs) && priceVarPct > Number(tol.price_tolerance_pct)) {
      exceptions.push(`Selisih nilai ${amountVar.toLocaleString('id-ID')} (${priceVarPct.toFixed(1)}%) melebihi toleransi ${tol.price_tolerance_pct}%.`);
    }
  }
  const result = exceptions.length ? 'EXCEPTION' : 'MATCHED';
  const row = (await client.query(
    `INSERT INTO three_way_matches(supplier_invoice_id,purchase_order_id,goods_receipt_id,po_amount,gr_amount,invoice_amount,price_variance_pct,amount_variance,result,exceptions,evaluated_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT(supplier_invoice_id) DO UPDATE SET purchase_order_id=excluded.purchase_order_id,goods_receipt_id=excluded.goods_receipt_id,po_amount=excluded.po_amount,gr_amount=excluded.gr_amount,invoice_amount=excluded.invoice_amount,price_variance_pct=excluded.price_variance_pct,amount_variance=excluded.amount_variance,result=excluded.result,exceptions=excluded.exceptions,evaluated_at=now(),evaluated_by=excluded.evaluated_by
     RETURNING *`,
    [supplierInvoiceId, po?.id || null, gr?.id || null, poAmt, grAmt, invAmt, priceVarPct, amountVar, result, JSON.stringify(exceptions), user.id])).rows[0];
  await runtime.audit(client, { userId: user.id, action: 'POST', module: 'supplier_invoice', entityType: 'THREE_WAY_MATCH', entityId: supplierInvoiceId, documentNumber: inv.document_number, newValue: { result, exceptions }, requestId, branchId: inv.branch_id });
  return runtime.camel(row);
}

// Dipanggil saat approve Supplier Invoice: blokir bila match EXCEPTION tanpa override.
async function assertMatchOk(client, doc, { overrideReason, user } = {}) {
  if (doc.document_type !== 'SUPPLIER_INVOICE') return;
  const match = (await client.query(`SELECT * FROM three_way_matches WHERE supplier_invoice_id=$1`, [doc.id])).rows[0]
    || await evaluateThreeWayMatch(client, { supplierInvoiceId: doc.id, user });
  if (match.result === 'EXCEPTION') {
    if (!overrideReason) {
      throw new AppError('MATCH_FAILED', `Three-way match gagal: ${(match.exceptions || []).join(' ')}`.trim(), { exceptions: match.exceptions });
    }
    await client.query(`UPDATE three_way_matches SET result='OVERRIDDEN', override_reason=$2, override_by=$3 WHERE supplier_invoice_id=$1`, [doc.id, overrideReason, user.id]);
  }
}

async function getMatch(client, supplierInvoiceId, user) {
  assertPermission(user, 'supplier_invoice.view');
  const row = (await client.query(`SELECT * FROM three_way_matches WHERE supplier_invoice_id=$1`, [supplierInvoiceId])).rows[0];
  return row ? runtime.camel(row) : null;
}

// ── Payment proposal batch (§13.6) ───────────────────────────────────────────
// Kumpulkan tagihan supplier APPROVED jatuh tempo → proposal untuk approval finance.
async function generatePaymentProposal(client, { user, requestId, branchId, dueBefore }) {
  assertPermission(user, 'payment_proposal.create');
  const scope = branchId || user.branchId;
  const invoices = (await client.query(
    `SELECT d.*, s.id supplier_id, s.name supplier_name,
       (SELECT b.id FROM supplier_bank_accounts b WHERE b.supplier_id=s.id AND b.is_primary AND NOT b.payment_hold AND b.verification_status='VERIFIED' LIMIT 1) bank_id,
       (SELECT b.payment_hold FROM supplier_bank_accounts b WHERE b.supplier_id=s.id AND b.is_primary LIMIT 1) hold
     FROM business_documents d LEFT JOIN suppliers s ON s.id=d.party_id
     WHERE d.document_type='SUPPLIER_INVOICE' AND d.status='APPROVED'
       AND ($1::uuid IS NULL OR d.branch_id=$1)
       AND (d.due_date IS NULL OR d.due_date<=$2)
       AND NOT EXISTS (SELECT 1 FROM payment_proposal_lines l WHERE l.supplier_invoice_id=d.id)
     ORDER BY d.due_date NULLS LAST`,
    [scope || null, dueBefore || '2099-12-31'])).rows;
  if (!invoices.length) throw new AppError('VALIDATION_ERROR', 'Tidak ada tagihan supplier disetujui yang perlu diproposalkan.');
  const total = invoices.reduce((s, r) => s + Number(r.amount), 0);
  const proposal = await runtime.createDocument(client, {
    type: 'PAYMENT_PROPOSAL', user, title: `Usulan pembayaran ${invoices.length} tagihan`, amount: total,
    payload: { count: invoices.length, generatedAt: new Date().toISOString() }, requestId
  });
  for (const inv of invoices) {
    const hold = inv.hold || !inv.bank_id;
    await client.query(
      `INSERT INTO payment_proposal_lines(proposal_document_id,supplier_invoice_id,supplier_id,amount,supplier_bank_id,payment_hold,hold_reason)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [proposal.id, inv.id, inv.supplier_id, inv.amount, inv.bank_id, hold, hold ? 'Rekening supplier belum terverifikasi / payment hold aktif' : null]);
  }
  await runtime.audit(client, { userId: user.id, action: 'CREATE', module: 'payment_proposal', entityType: 'PAYMENT_PROPOSAL', entityId: proposal.id, documentNumber: proposal.documentNumber, newValue: { count: invoices.length, total }, requestId, branchId: proposal.branchId });
  return { ...proposal, lineCount: invoices.length, holdCount: invoices.filter((r) => r.hold || !r.bank_id).length };
}

async function proposalLines(client, proposalId, user) {
  assertPermission(user, 'payment_proposal.view');
  return (await client.query(
    `SELECT l.*, d.document_number invoice_number, d.due_date, s.name supplier_name
     FROM payment_proposal_lines l JOIN business_documents d ON d.id=l.supplier_invoice_id
     LEFT JOIN suppliers s ON s.id=l.supplier_id WHERE l.proposal_document_id=$1 ORDER BY d.due_date NULLS LAST`, [proposalId])).rows.map(runtime.camel);
}

module.exports = {
  creditStatus, assertCreditOk, grantCreditOverride,
  addQuote, listQuotes, selectQuote, rfqToPurchaseOrder,
  evaluateThreeWayMatch, assertMatchOk, getMatch,
  generatePaymentProposal, proposalLines
};
