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

// ── Budget check pengadaan (§13 flow: PR → Budget Check; Sprint 10) ─────────
// Anggaran per periode (YYYY-MM) per cabang; baris branch NULL = global.
// Tanpa baris anggaran aktif = tidak ada pemeriksaan (belum dikonfigurasi).
async function budgetStatus(client, { period, branchId }) {
  const budget = (await client.query(`SELECT * FROM procurement_budgets WHERE active AND period=$1 AND (branch_id=$2 OR branch_id IS NULL)
    ORDER BY (branch_id IS NOT NULL) DESC LIMIT 1`, [period, branchId])).rows[0];
  if (!budget) return null;
  const scopeBranch = budget.branch_id ? ' AND branch_id=$2' : '';
  const committed = Number((await client.query(`SELECT COALESCE(SUM(amount),0) n FROM business_documents
    WHERE document_type='PURCHASE_ORDER' AND to_char(created_at,'YYYY-MM')=$1${scopeBranch}
    AND status NOT IN ('DRAFT','CANCELLED','VOID','REJECTED')`, budget.branch_id ? [period, budget.branch_id] : [period])).rows[0].n);
  return { budgetId: budget.id, period, branchId: budget.branch_id, amount: Number(budget.amount), committed, available: Number(budget.amount) - committed };
}

// Dipanggil saat submit PR/PO. Override finance ber-alasan lolos + teraudit.
async function assertBudgetOk(client, doc, { overrideReason, user, requestId } = {}) {
  if (!['PURCHASE_REQUEST', 'PURCHASE_ORDER'].includes(doc.document_type)) return;
  const period = new Date(doc.created_at).toISOString().slice(0, 7);
  const status = await budgetStatus(client, { period, branchId: doc.branch_id });
  if (!status) return; // anggaran belum dikonfigurasi untuk periode ini
  const projected = status.committed + Number(doc.amount);
  if (projected <= status.amount + 0.01) return;
  if (overrideReason && user) {
    assertPermission(user, 'budget.approve');
    await runtime.audit(client, { userId: user.id, action: 'APPROVE', module: 'budget', entityType: 'BUDGET_OVERRIDE', entityId: doc.id, documentNumber: doc.document_number, newValue: { period, budget: status.amount, committed: status.committed, requested: Number(doc.amount), projected }, reason: overrideReason, requestId, branchId: doc.branch_id });
    return;
  }
  throw new AppError('BUDGET_EXCEEDED', `Anggaran ${period} ${status.branchId ? 'cabang ini' : '(global)'} ${status.amount.toLocaleString('id-ID')} — terpakai ${status.committed.toLocaleString('id-ID')}, dokumen ini ${Number(doc.amount).toLocaleString('id-ID')} membuat proyeksi ${projected.toLocaleString('id-ID')}.`);
}

async function listBudgets(client, user, params = {}) {
  assertPermission(user, 'budget.view');
  const period = params.period || new Date().toISOString().slice(0, 7);
  const rows = (await client.query(`SELECT b.*,br.name branch_name,u.display_name created_by_name FROM procurement_budgets b
    LEFT JOIN branches br ON br.id=b.branch_id LEFT JOIN app_users u ON u.id=b.created_by
    WHERE b.active AND b.period=$1 ORDER BY br.name NULLS FIRST`, [period])).rows;
  const items = [];
  for (const b of rows) {
    const st = await budgetStatus(client, { period: b.period, branchId: b.branch_id });
    items.push({ ...runtime.camel(b), committed: st ? st.committed : 0, available: st ? st.available : Number(b.amount) });
  }
  return { period, items };
}

async function upsertBudget(client, { period, branchId, amount, notes, user, requestId }) {
  assertPermission(user, 'budget.edit');
  if (!/^\d{4}-\d{2}$/.test(String(period || ''))) throw new AppError('VALIDATION_ERROR', 'Periode anggaran wajib berformat YYYY-MM.');
  if (!(Number(amount) >= 0)) throw new AppError('VALIDATION_ERROR', 'Nilai anggaran tidak boleh negatif.');
  const existing = (await client.query(`SELECT id FROM procurement_budgets WHERE active AND period=$1 AND branch_id IS NOT DISTINCT FROM $2`, [period, branchId || null])).rows[0];
  const row = existing
    ? (await client.query(`UPDATE procurement_budgets SET amount=$2,notes=$3,updated_at=now() WHERE id=$1 RETURNING *`, [existing.id, Number(amount), notes || null])).rows[0]
    : (await client.query(`INSERT INTO procurement_budgets(period,branch_id,amount,notes,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *`, [period, branchId || null, Number(amount), notes || null, user.id])).rows[0];
  await runtime.audit(client, { userId: user.id, action: existing ? 'UPDATE' : 'CREATE', module: 'budget', entityType: 'PROCUREMENT_BUDGET', entityId: row.id, newValue: { period, branchId: branchId || null, amount: Number(amount) }, requestId });
  return runtime.camel(row);
}

// ── RFQ & perbandingan supplier (§13.2; multi-baris Sprint 10) ───────────────
async function addQuote(client, { rfqId, body, user, requestId }) {
  assertPermission(user, 'rfq.edit');
  const rfq = (await client.query(`SELECT * FROM business_documents WHERE id=$1 AND document_type='RFQ'`, [rfqId])).rows[0];
  if (!rfq) throw new AppError('RESOURCE_NOT_FOUND', 'RFQ tidak ditemukan.');
  if (!body.supplierId) throw new AppError('VALIDATION_ERROR', 'Supplier wajib dipilih.');
  // Multi-baris: bila lines dikirim, total harga dihitung server dari baris.
  let lines = null, priceTotal = Number(body.priceTotal) || 0;
  if (Array.isArray(body.lines) && body.lines.length) {
    lines = body.lines.map((l, i) => {
      const qty = Number(l.qty), price = Number(l.unitPrice);
      if (!l.description || !(qty > 0) || !(price >= 0)) throw new AppError('VALIDATION_ERROR', `Baris kuota #${i + 1} tidak valid (deskripsi/qty/harga).`);
      return { lineNo: i + 1, description: String(l.description).slice(0, 300), qty, uom: l.uom || null, unitPrice: price };
    });
    priceTotal = Math.round(lines.reduce((n, l) => n + l.qty * l.unitPrice, 0) * 100) / 100;
  }
  const row = (await client.query(
    `INSERT INTO rfq_quotes(rfq_document_id,supplier_id,currency,price_total,tax_total,freight_total,lead_time_days,payment_terms,moq_note,quality_score,created_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT(rfq_document_id,supplier_id) DO UPDATE SET price_total=excluded.price_total,tax_total=excluded.tax_total,freight_total=excluded.freight_total,lead_time_days=excluded.lead_time_days,payment_terms=excluded.payment_terms,quality_score=excluded.quality_score,received_at=now()
     RETURNING *`,
    [rfqId, body.supplierId, body.currency || 'IDR', priceTotal, Number(body.taxTotal) || 0, Number(body.freightTotal) || 0,
     body.leadTimeDays || null, body.paymentTerms || null, body.moqNote || null, body.qualityScore || null, user.id])).rows[0];
  if (lines) {
    await client.query('DELETE FROM rfq_quote_lines WHERE quote_id=$1', [row.id]);
    for (const l of lines) await client.query(`INSERT INTO rfq_quote_lines(quote_id,line_no,description,qty,uom,unit_price) VALUES($1,$2,$3,$4,$5,$6)`, [row.id, l.lineNo, l.description, l.qty, l.uom, l.unitPrice]);
  }
  await runtime.audit(client, { userId: user.id, action: 'CREATE', module: 'rfq', entityType: 'RFQ_QUOTE', entityId: row.id, documentNumber: rfq.document_number, newValue: { supplierId: body.supplierId, landed: Number(row.landed_cost), lines: lines ? lines.length : 0 }, requestId, branchId: rfq.branch_id });
  return runtime.camel(row);
}

async function listQuotes(client, rfqId, user) {
  assertPermission(user, 'rfq.view');
  const rows = (await client.query(
    `SELECT q.*, s.name supplier_name, s.code supplier_code,
       (SELECT overall_score FROM supplier_evaluations e WHERE e.supplier_id=q.supplier_id ORDER BY period DESC LIMIT 1) supplier_score,
       COALESCE((SELECT json_agg(json_build_object('lineNo',l.line_no,'description',l.description,'qty',l.qty,'uom',l.uom,'unitPrice',l.unit_price,'lineTotal',l.line_total) ORDER BY l.line_no)
         FROM rfq_quote_lines l WHERE l.quote_id=q.id),'[]'::json) lines
     FROM rfq_quotes q JOIN suppliers s ON s.id=q.supplier_id WHERE q.rfq_document_id=$1
     ORDER BY q.landed_cost ASC`, [rfqId])).rows.map(runtime.camel);
  // Tandai rekomendasi: landed cost terendah + skor supplier bila ada.
  if (rows.length) rows[0].recommended = true;
  // Perbandingan per baris (Sprint 10): supplier termurah untuk tiap item.
  const byLine = {};
  for (const q of rows) for (const l of (q.lines || [])) {
    const key = l.description;
    if (!byLine[key] || Number(l.unitPrice) < byLine[key].unitPrice) byLine[key] = { description: key, unitPrice: Number(l.unitPrice), supplierName: q.supplierName, supplierId: q.supplierId };
  }
  const lineComparison = Object.values(byLine);
  return { items: rows, lineComparison };
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
  // Sprint 10: baris kuota terpilih ikut tersalin ke PO (document_lines).
  const quoteLines = (await client.query(`SELECT line_no,description,qty,uom,unit_price FROM rfq_quote_lines WHERE quote_id=$1 ORDER BY line_no`, [selected.id])).rows
    .map((l) => ({ description: l.description, qty: Number(l.qty), uom: l.uom, unitPrice: Number(l.unit_price) }));
  const po = await runtime.createDocument(client, {
    type: 'PURCHASE_ORDER', user: { ...user, branchId: rfq.branch_id },
    title: `PO dari ${rfq.document_number} — ${selected.supplier_name}`, amount: Number(selected.landed_cost),
    partyId: selected.supplier_id, partyName: selected.supplier_name,
    payload: { ...(rfq.payload || {}), sourceRfqId: rfq.id, sourceRfqNumber: rfq.document_number, supplierId: selected.supplier_id, leadTimeDays: selected.lead_time_days, ...(quoteLines.length ? { lines: quoteLines } : {}) }, requestId
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

// ── PO change order (Sprint 10) — amendemen ber-versi maker-checker ─────────
// PO APPROVED/IN_PROCESS dapat diamendemen; setelah ada GR COMPLETED,
// amendemen diblokir demi integritas three-way match. Pemohon ≠ pemutus
// (ditegakkan juga oleh CHECK constraint database).
async function createChangeOrder(client, { poId, newAmount, newLines, reason, user, requestId }) {
  assertPermission(user, 'purchase_order.edit');
  if (!reason) throw new AppError('REASON_REQUIRED', 'Alasan amendemen PO wajib diisi.');
  const po = (await client.query(`SELECT * FROM business_documents WHERE id=$1 AND document_type='PURCHASE_ORDER' FOR UPDATE`, [poId])).rows[0];
  if (!po) throw new AppError('RESOURCE_NOT_FOUND', 'PO tidak ditemukan.');
  if (!['APPROVED', 'IN_PROCESS'].includes(po.status)) throw new AppError('STATUS_INVALID', `Amendemen membutuhkan PO APPROVED/IN_PROCESS (sekarang ${po.status}).`);
  const gr = (await client.query(`SELECT count(*)::int n FROM document_relations r JOIN business_documents c ON c.id=r.child_document_id
    WHERE r.parent_document_id=$1 AND r.relation_type='ORDER_TO_RECEIPT' AND c.status IN ('COMPLETED','CLOSED')`, [poId])).rows[0];
  if (gr.n > 0) throw new AppError('DOCUMENT_CONFLICT', 'PO sudah memiliki penerimaan selesai — amendemen diblokir demi integritas three-way match.');
  const amount = Number(newAmount);
  if (!(amount >= 0)) throw new AppError('VALIDATION_ERROR', 'Nilai baru PO tidak boleh negatif.');
  const oldLines = (await client.query('SELECT line_no,product_id,description,qty,uom,unit_price FROM document_lines WHERE document_id=$1 ORDER BY line_no', [poId])).rows;
  const seq = (await client.query('SELECT COALESCE(MAX(change_no),0)+1 n FROM po_change_orders WHERE po_document_id=$1', [poId])).rows[0].n;
  const row = (await client.query(`INSERT INTO po_change_orders(id,po_document_id,change_no,reason,old_amount,new_amount,old_lines,new_lines,requested_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [
    require('node:crypto').randomUUID(), poId, seq, String(reason).slice(0, 1000), Number(po.amount), amount,
    JSON.stringify(oldLines), JSON.stringify(Array.isArray(newLines) ? newLines : []), user.id])).rows[0];
  await runtime.audit(client, { userId: user.id, action: 'CREATE', module: 'purchase_order', entityType: 'PO_CHANGE_ORDER', entityId: row.id, documentNumber: `${po.document_number}/CO${seq}`, newValue: { oldAmount: Number(po.amount), newAmount: amount }, reason, requestId, branchId: po.branch_id });
  return runtime.camel(row);
}

async function decideChangeOrder(client, { changeOrderId, decision, reason, user, requestId }) {
  assertPermission(user, 'purchase_order.approve');
  if (!['APPROVED', 'REJECTED'].includes(decision)) throw new AppError('VALIDATION_ERROR', 'Keputusan harus APPROVED/REJECTED.');
  if (!reason) throw new AppError('REASON_REQUIRED', 'Alasan keputusan wajib diisi.');
  const co = (await client.query('SELECT * FROM po_change_orders WHERE id=$1 FOR UPDATE', [changeOrderId])).rows[0];
  if (!co) throw new AppError('RESOURCE_NOT_FOUND', 'Change order tidak ditemukan.');
  if (co.status !== 'PENDING') throw new AppError('STATUS_INVALID', `Change order berstatus ${co.status}.`);
  if (co.requested_by === user.id) throw new AppError('SOD_CONFLICT', 'Pemohon amendemen tidak boleh menjadi pemutus (SoD).');
  const updated = (await client.query(`UPDATE po_change_orders SET status=$2,decided_by=$3,decided_at=now(),decide_reason=$4 WHERE id=$1 RETURNING *`,
    [changeOrderId, decision, user.id, String(reason).slice(0, 500)])).rows[0];
  const po = (await client.query('SELECT * FROM business_documents WHERE id=$1 FOR UPDATE', [co.po_document_id])).rows[0];
  if (decision === 'APPROVED') {
    const newLines = Array.isArray(co.new_lines) ? co.new_lines : [];
    await client.query(`UPDATE business_documents SET amount=$2,payload=payload||$3::jsonb,version=version+1,updated_at=now(),updated_by=$4 WHERE id=$1`,
      [po.id, Number(co.new_amount), JSON.stringify({ changeOrderNo: co.change_no, ...(newLines.length ? { lines: newLines } : {}) }), user.id]);
    if (newLines.length) { const posting = require('./posting'); await posting.syncDocumentLines(client, po.id, newLines); }
  }
  await runtime.audit(client, { userId: user.id, action: decision === 'APPROVED' ? 'APPROVE' : 'REJECT', module: 'purchase_order', entityType: 'PO_CHANGE_ORDER', entityId: changeOrderId, documentNumber: `${po.document_number}/CO${co.change_no}`, oldValue: { amount: Number(co.old_amount) }, newValue: { amount: Number(co.new_amount), decision }, reason, requestId, branchId: po.branch_id });
  await runtime.outbox(client, 'purchase_order.updated', { entityId: po.document_number, documentType: 'PURCHASE_ORDER', branchId: po.branch_id });
  return runtime.camel(updated);
}

async function listChangeOrders(client, poId, user) {
  assertPermission(user, 'purchase_order.view');
  return { items: (await client.query(`SELECT co.*,ru.display_name requested_by_name,du.display_name decided_by_name
    FROM po_change_orders co LEFT JOIN app_users ru ON ru.id=co.requested_by LEFT JOIN app_users du ON du.id=co.decided_by
    WHERE co.po_document_id=$1 ORDER BY co.change_no DESC`, [poId])).rows.map(runtime.camel) };
}

module.exports = {
  creditStatus, assertCreditOk, grantCreditOverride,
  budgetStatus, assertBudgetOk, listBudgets, upsertBudget,
  addQuote, listQuotes, selectQuote, rfqToPurchaseOrder,
  createChangeOrder, decideChangeOrder, listChangeOrders,
  evaluateThreeWayMatch, assertMatchOk, getMatch,
  generatePaymentProposal, proposalLines
};
