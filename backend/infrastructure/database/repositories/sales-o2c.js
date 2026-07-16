'use strict';
// Sprint 9 (R016) — Order-to-Cash completion:
//   1. Revisi penawaran ber-versi: keadaan sebelum revisi dibekukan ke
//      quotation_revisions (immutable), dokumen kembali DRAFT dengan
//      revisionNo naik — nomor dokumen tetap, histori tidak pernah hilang.
//   2. Dunning/collection: jenjang dari dunning_policies (configuration-driven),
//      notice idempoten per invoice per level, level CREDIT_HOLD otomatis
//      menahan kredit pelanggan (terintegrasi credit control Wave 2).
//   3. RMA/garansi: validasi masa garansi dari products.warranty_months ×
//      tanggal kirim sumber; disposisi RESTOCK menghidupkan stok + lot baru;
//      nilai retur dijurnal via posting profile RMA-DEFAULT (kontra pendapatan).
const { randomUUID } = require('node:crypto');
const { AppError } = require('../../../core/errors');

const idr = (v) => Math.round(Number(v || 0) * 100) / 100;

// ── 1. Revisi penawaran ──────────────────────────────────────────────────────
async function reviseQuotation(client, { docId, reason, user, requestId }) {
  const doc = (await client.query(`SELECT * FROM business_documents WHERE id=$1 AND document_type='QUOTATION' FOR UPDATE`, [docId])).rows[0];
  if (!doc) throw new AppError('RESOURCE_NOT_FOUND', 'Penawaran tidak ditemukan.');
  if (!['WAITING_APPROVAL', 'APPROVED', 'REVISION_REQUIRED', 'SUBMITTED'].includes(doc.status)) {
    throw new AppError('STATUS_INVALID', `Revisi hanya untuk penawaran terkirim/disetujui (sekarang ${doc.status}). Draft cukup diedit langsung.`);
  }
  if (!reason) throw new AppError('REASON_REQUIRED', 'Alasan revisi wajib diisi.');
  const converted = (await client.query(`SELECT count(*)::int n FROM document_relations WHERE parent_document_id=$1 AND relation_type='QUOTATION_TO_ORDER'`, [docId])).rows[0];
  if (converted.n > 0) throw new AppError('DOCUMENT_CONFLICT', 'Penawaran sudah dikonversi menjadi Sales Order — buat penawaran baru, bukan revisi.');
  const lines = (await client.query('SELECT line_no,product_id,description,qty,uom,unit_price,discount_pct,tax_pct,line_total FROM document_lines WHERE document_id=$1 ORDER BY line_no', [docId])).rows;
  const revisionNo = Number(doc.payload?.revisionNo || 1);
  await client.query(`INSERT INTO quotation_revisions(id,quotation_id,revision_no,title,amount,status_at_revision,payload,lines,reason,revised_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [randomUUID(), docId, revisionNo, doc.title, doc.amount, doc.status, doc.payload, JSON.stringify(lines), String(reason).slice(0, 1000), user.id]);
  const updated = (await client.query(`UPDATE business_documents SET status='DRAFT',payload=payload||$2::jsonb,approvals='[]'::jsonb,required_approval_levels='{}',
      version=version+1,updated_at=now(),updated_by=$3 WHERE id=$1 RETURNING *`,
    [docId, JSON.stringify({ revisionNo: revisionNo + 1, lastRevisionReason: String(reason).slice(0, 500) }), user.id])).rows[0];
  const runtime = require('./runtime');
  await runtime.audit(client, { userId: user.id, action: 'REQUEST_REVISION', module: 'quotation', entityType: 'QUOTATION', entityId: docId, documentNumber: doc.document_number, oldValue: { status: doc.status, revisionNo }, newValue: { status: 'DRAFT', revisionNo: revisionNo + 1 }, reason, requestId });
  await runtime.outbox(client, 'quotation.updated', { entityId: doc.document_number, documentType: 'QUOTATION', branchId: doc.branch_id, version: updated.version });
  return { documentNumber: doc.document_number, revisionNo: revisionNo + 1, previousRevisionSaved: revisionNo, status: 'DRAFT' };
}

async function listQuotationRevisions(client, docId) {
  const runtime = require('./runtime');
  const doc = (await client.query(`SELECT id,document_number,amount,payload->>'revisionNo' revision_no FROM business_documents WHERE id=$1 AND document_type='QUOTATION'`, [docId])).rows[0];
  if (!doc) throw new AppError('RESOURCE_NOT_FOUND', 'Penawaran tidak ditemukan.');
  const rows = (await client.query(`SELECT r.*,u.display_name revised_by_name FROM quotation_revisions r
    LEFT JOIN app_users u ON u.id=r.revised_by WHERE r.quotation_id=$1 ORDER BY r.revision_no DESC`, [docId])).rows;
  // Delta nilai antar revisi agar pembaca langsung melihat pergerakan harga.
  const items = rows.map((r, i) => ({ ...runtime.camel(r), amountDelta: idr(Number((i === 0 ? doc.amount : rows[i - 1].amount)) - Number(r.amount)) }));
  return { current: { revisionNo: Number(doc.revision_no || 1), amount: Number(doc.amount) }, items };
}

// ── 2. Dunning / collection ──────────────────────────────────────────────────
async function activePolicies(client, onDate) {
  const rows = (await client.query(`SELECT DISTINCT ON (level) * FROM dunning_policies
    WHERE active AND effective_from<=$1 AND (effective_until IS NULL OR effective_until>=$1)
    ORDER BY level, effective_from DESC`, [onDate || new Date().toISOString().slice(0, 10)])).rows;
  if (!rows.length) throw new AppError('RESOURCE_NOT_FOUND', 'Kebijakan dunning belum dikonfigurasi.');
  return rows;
}

// Scan invoice jatuh tempo → terbitkan notice pada jenjang tertinggi yang
// terpenuhi (idempoten per invoice per level). Level CREDIT_HOLD menahan
// kredit pelanggan otomatis dengan alasan tercatat.
async function runDunning(client, { user, requestId }) {
  const policies = await activePolicies(client);
  const invoices = (await client.query(`SELECT d.id,d.document_number,d.amount,d.due_date,d.party_id,d.branch_id,
      GREATEST(0,(current_date-d.due_date))::int days_overdue,
      d.amount-COALESCE((SELECT SUM(a.amount) FROM payment_allocations a WHERE a.invoice_document_id=d.id),0) outstanding
    FROM business_documents d
    WHERE d.document_type='INVOICE' AND d.status IN ('APPROVED','PARTIALLY_PAID','OVERDUE')
      AND d.due_date IS NOT NULL AND d.due_date<current_date`)).rows;
  const runtime = require('./runtime');
  let issued = 0, held = 0;
  const results = [];
  for (const inv of invoices) {
    const outstanding = idr(inv.outstanding);
    if (outstanding <= 0) continue;
    const level = [...policies].reverse().find((p) => inv.days_overdue >= p.min_days_overdue);
    if (!level) continue;
    const exists = (await client.query('SELECT id FROM dunning_notices WHERE invoice_document_id=$1 AND level=$2', [inv.id, level.level])).rows[0];
    if (exists) continue;
    const seq = (await client.query(`SELECT count(*)::int n FROM dunning_notices WHERE created_at>=date_trunc('year',now())`)).rows[0];
    const noticeNumber = `DUN-${new Date().getFullYear()}-${String(seq.n + 1).padStart(4, '0')}`;
    await client.query(`INSERT INTO dunning_notices(id,notice_number,invoice_document_id,customer_id,level,days_overdue,outstanding,policy_snapshot,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [randomUUID(), noticeNumber, inv.id, inv.party_id, level.level, inv.days_overdue, outstanding,
      JSON.stringify({ level: level.level, name: level.name, action: level.action, minDaysOverdue: level.min_days_overdue }), user.id]);
    issued++;
    let creditHeld = false;
    if (level.action === 'CREDIT_HOLD' && inv.party_id) {
      const cust = (await client.query('SELECT id,credit_hold FROM customers WHERE id=$1 FOR UPDATE', [inv.party_id])).rows[0];
      if (cust && !cust.credit_hold) {
        await client.query(`UPDATE customers SET credit_hold=true,credit_hold_reason=$2,updated_at=now() WHERE id=$1`,
          [cust.id, `Dunning ${noticeNumber}: ${inv.document_number} menunggak ${inv.days_overdue} hari (${outstanding})`]);
        held++; creditHeld = true;
      }
    }
    await runtime.audit(client, { userId: user.id, action: 'POST', module: 'invoice', entityType: 'DUNNING_NOTICE', entityId: inv.id, documentNumber: noticeNumber, newValue: { level: level.level, daysOverdue: inv.days_overdue, outstanding, creditHeld }, requestId, branchId: inv.branch_id });
    if (inv.party_id) await runtime.outbox(client, 'invoice.updated', { entityId: inv.document_number, documentType: 'INVOICE', branchId: inv.branch_id });
    results.push({ invoice: inv.document_number, noticeNumber, level: level.level, outstanding, creditHeld });
  }
  return { scanned: invoices.length, issued, creditHolds: held, notices: results };
}

async function listDunning(client, params = {}) {
  const runtime = require('./runtime');
  const where = params.status ? 'n.status=$1' : `n.status='ISSUED'`;
  const args = params.status ? [params.status] : [];
  const rows = (await client.query(`SELECT n.*,d.document_number invoice_number,d.due_date,d.amount invoice_amount,c.name customer_name,u.display_name created_by_name
    FROM dunning_notices n JOIN business_documents d ON d.id=n.invoice_document_id
    LEFT JOIN customers c ON c.id=n.customer_id LEFT JOIN app_users u ON u.id=n.created_by
    WHERE ${where} ORDER BY n.level DESC,n.days_overdue DESC LIMIT 200`, args)).rows;
  const aging = (await client.query(`SELECT
      COUNT(*)::int open_count,COALESCE(SUM(outstanding),0)::float open_value,
      COUNT(*) FILTER (WHERE level>=3)::int critical
    FROM dunning_notices WHERE status='ISSUED'`)).rows[0];
  return { items: rows.map(runtime.camel), summary: runtime.camel(aging) };
}

async function resolveDunning(client, { noticeId, reason, user, requestId }) {
  if (!reason) throw new AppError('REASON_REQUIRED', 'Alasan penyelesaian (pembayaran/komitmen) wajib diisi.');
  const notice = (await client.query('SELECT * FROM dunning_notices WHERE id=$1 FOR UPDATE', [noticeId])).rows[0];
  if (!notice) throw new AppError('RESOURCE_NOT_FOUND', 'Notice dunning tidak ditemukan.');
  if (notice.status !== 'ISSUED') throw new AppError('STATUS_INVALID', `Notice berstatus ${notice.status}.`);
  const updated = (await client.query(`UPDATE dunning_notices SET status='RESOLVED',resolved_reason=$2,resolved_by=$3,resolved_at=now() WHERE id=$1 RETURNING *`,
    [noticeId, String(reason).slice(0, 500), user.id])).rows[0];
  const runtime = require('./runtime');
  await runtime.audit(client, { userId: user.id, action: 'UPDATE', module: 'invoice', entityType: 'DUNNING_NOTICE', entityId: noticeId, documentNumber: notice.notice_number, oldValue: { status: 'ISSUED' }, newValue: { status: 'RESOLVED' }, reason, requestId });
  return runtime.camel(updated);
}

// ── 3. RMA & garansi ─────────────────────────────────────────────────────────
// Buat RMA dari dokumen sumber (DELIVERY/INVOICE). Klaim garansi divalidasi
// terhadap products.warranty_months dihitung dari tanggal dokumen sumber.
async function createRma(client, { user, sourceDocumentId, warrantyClaim, reasonCode, lines, requestId }) {
  if (!Array.isArray(lines) || !lines.length) throw new AppError('VALIDATION_ERROR', 'Minimal satu baris retur wajib diisi.');
  const source = sourceDocumentId ? (await client.query(`SELECT * FROM business_documents WHERE id=$1 AND document_type IN ('DELIVERY','INVOICE')`, [sourceDocumentId])).rows[0] : null;
  if (sourceDocumentId && !source) throw new AppError('RESOURCE_NOT_FOUND', 'Dokumen sumber retur (Delivery/Invoice) tidak ditemukan.');
  if (warrantyClaim && !source) throw new AppError('VALIDATION_ERROR', 'Klaim garansi wajib menunjuk dokumen sumber.');
  const runtime = require('./runtime');
  const checked = [];
  let amount = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const qty = Number(line.qty), price = Number(line.unitPrice || 0);
    const disposition = String(line.disposition || 'RESTOCK').toUpperCase();
    if (!line.productId || !(qty > 0)) throw new AppError('VALIDATION_ERROR', `Baris ${i + 1}: produk dan qty wajib.`);
    if (!['RESTOCK', 'SCRAP', 'REPAIR'].includes(disposition)) throw new AppError('VALIDATION_ERROR', `Baris ${i + 1}: disposisi harus RESTOCK/SCRAP/REPAIR.`);
    const product = (await client.query('SELECT id,code,name,uom,warranty_months FROM products WHERE id=$1', [line.productId])).rows[0];
    if (!product) throw new AppError('RESOURCE_NOT_FOUND', `Baris ${i + 1}: produk tidak ditemukan.`);
    let warrantyUntil = null;
    if (warrantyClaim) {
      const months = Number(product.warranty_months || 0);
      if (months <= 0) throw new AppError('VALIDATION_ERROR', `Baris ${i + 1}: ${product.code} tidak memiliki masa garansi — klaim garansi ditolak.`);
      const baseDate = new Date(source.created_at);
      const until = new Date(baseDate); until.setMonth(until.getMonth() + months);
      if (until < new Date()) throw new AppError('VALIDATION_ERROR', `Baris ${i + 1}: garansi ${product.code} berakhir ${until.toISOString().slice(0, 10)} — klaim kedaluwarsa.`);
      warrantyUntil = until.toISOString().slice(0, 10);
    }
    amount += qty * price;
    checked.push({ productId: product.id, description: `${product.code} · ${product.name}`, qty, uom: product.uom, unitPrice: price, disposition, warrantyUntil, note: line.note ? String(line.note).slice(0, 300) : null });
  }
  const doc = await runtime.createDocument(client, {
    type: 'RMA', user, title: warrantyClaim ? `Klaim garansi ${source.document_number}` : `Retur penjualan${source ? ' ' + source.document_number : ''}`,
    amount: idr(amount), partyId: source?.party_id || null, partyName: source?.party_name || null, requestId,
    payload: { sourceDocumentId: source?.id || null, sourceNumber: source?.document_number || null, warrantyClaim: !!warrantyClaim, reasonCode: reasonCode || 'RETURN', warehouseId: user.branchId, lines: checked }
  });
  if (source) await client.query(`INSERT INTO document_relations(parent_document_id,child_document_id,relation_type,created_by) VALUES($1,$2,'SOURCE_TO_RMA',$3)`, [source.id, doc.id, user.id]);
  return doc;
}

// Posting RMA saat COMPLETED (dipanggil posting.postInventory):
// disposisi RESTOCK → saldo naik + lot retur (prefix R, telusur ke RMA);
// nilai retur (amount>0) → jurnal kontra pendapatan via profile RMA-DEFAULT.
async function postRma(client, doc, user) {
  const posting = require('./posting'); // lazy anti-siklus
  const inv = require('./inventory');
  const warehouseId = doc.payload?.warehouseId || doc.branchId;
  const lines = Array.isArray(doc.payload?.lines) ? doc.payload.lines : [];
  if (!lines.length) throw new AppError('VALIDATION_ERROR', 'RMA tidak memiliki baris retur.');
  const restocked = [];
  let n = 0;
  for (const line of lines) {
    n++;
    if (String(line.disposition).toUpperCase() !== 'RESTOCK') continue;
    const result = await posting.applyBalance(client, line.productId, warehouseId, Number(line.qty), user, doc, 'RETURN');
    await inv.receiveLotLine(client, doc, { line_no: n, product_id: line.productId, qty: Number(line.qty), uom: line.uom || null }, warehouseId, user, { movementType: 'RECEIPT', lotPrefix: 'R' });
    restocked.push({ productId: line.productId, qty: Number(line.qty), qtyOnHand: result.qtyOnHand });
  }
  let journal = null;
  const amount = idr(doc.amount);
  if (amount > 0 && await posting.claimPosting(client, doc, user, 'ACCOUNTING')) {
    const period = await posting.ensureOpenPeriod(client, doc);
    journal = await posting.postFromProfile(client, doc, user, { transactionType: 'RMA', amounts: { AMOUNT: amount }, memoBase: doc.payload?.warrantyClaim ? 'klaim garansi' : 'retur penjualan' });
    await posting.finishPosting(client, doc, 'ACCOUNTING', { period, amount, ...journal });
  }
  return { restocked: restocked.length, scrapOrRepair: lines.length - restocked.length, journal };
}

module.exports = { reviseQuotation, listQuotationRevisions, runDunning, listDunning, resolveDunning, createRma, postRma };
