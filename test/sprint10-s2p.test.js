'use strict';
// Sprint 10 (R017) — S2P completion: budget check, RFQ multi-baris,
// PO change order maker-checker, service receipt, payment reversal.
// Semua tes ROLLBACK-terisolasi; angka anggaran memakai delta baseline
// (database dev boleh berisi PO existing).
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');

const enabled = !!process.env.DATABASE_URL;
const dbTest = enabled ? test : test.skip;

const runtime = require('../backend/infrastructure/database/repositories/runtime');
const posting = require('../backend/infrastructure/database/repositories/posting');
const procurement = require('../backend/infrastructure/database/repositories/procurement');
const businessOps = require('../backend/infrastructure/database/repositories/business-operations');

async function withRollback(fn) {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try { await c.query('BEGIN'); await c.query("SELECT set_config('app.is_system','on',true),set_config('app.is_platform','on',true),set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true)"); await fn(c); } finally { await c.query('ROLLBACK').catch(() => {}); await c.end(); }
}
const getUser = async (c, role) => runtime.camel((await c.query(`SELECT id,username,display_name "displayName",role,branch_id "branchId",branch_scope "branchScope" FROM app_users WHERE role=$1 AND active LIMIT 1`, [role])).rows[0]);

dbTest('budget: over diblokir 409, override finance ber-alasan lolos, DRAFT tidak terhitung committed', async () => {
  await withRollback(async (c) => {
    const u = await getUser(c, 'owner');
    const period = new Date().toISOString().slice(0, 7);
    const baseline = Number((await c.query(`SELECT COALESCE(SUM(amount),0) n FROM business_documents
      WHERE document_type='PURCHASE_ORDER' AND to_char(created_at,'YYYY-MM')=$1
      AND status NOT IN ('DRAFT','CANCELLED','VOID','REJECTED')`, [period])).rows[0].n);
    await procurement.upsertBudget(c, { period, branchId: null, amount: baseline + 1_000_000, user: u, requestId: randomUUID() });
    const po = await runtime.createDocument(c, { type: 'PURCHASE_ORDER', user: u, title: 'PO budget test', amount: 5_000_000, requestId: randomUUID() });
    const raw = (await c.query('SELECT * FROM business_documents WHERE id=$1', [po.id])).rows[0];
    await assert.rejects(() => procurement.assertBudgetOk(c, raw), (e) => e.code === 'BUDGET_EXCEEDED');
    await procurement.assertBudgetOk(c, raw, { overrideReason: 'Urgent — persetujuan finance', user: u, requestId: randomUUID() });
    const st = await procurement.budgetStatus(c, { period, branchId: u.branchId });
    assert.equal(st.committed, baseline, 'PO DRAFT tidak menambah committed');
    await c.query(`UPDATE business_documents SET status='APPROVED' WHERE id=$1`, [po.id]);
    const st2 = await procurement.budgetStatus(c, { period, branchId: u.branchId });
    assert.equal(st2.committed, baseline + 5_000_000);
  });
});

dbTest('budget: tanpa baris anggaran periode → tidak ada pemeriksaan', async () => {
  await withRollback(async (c) => {
    const u = await getUser(c, 'owner');
    await c.query(`UPDATE procurement_budgets SET active=false`);
    const po = await runtime.createDocument(c, { type: 'PURCHASE_ORDER', user: u, title: 'PO tanpa budget', amount: 999_000_000_000, requestId: randomUUID() });
    const raw = (await c.query('SELECT * FROM business_documents WHERE id=$1', [po.id])).rows[0];
    await procurement.assertBudgetOk(c, raw); // tidak boleh melempar
  });
});

dbTest('RFQ multi-baris: total dihitung server dari baris; PO menyalin baris kuota terpilih', async () => {
  await withRollback(async (c) => {
    const u = await getUser(c, 'owner');
    const sup = (await c.query('SELECT id FROM suppliers WHERE active LIMIT 1')).rows[0];
    const rfq = await runtime.createDocument(c, { type: 'RFQ', user: u, title: 'RFQ multi', amount: 0, requestId: randomUUID() });
    await procurement.addQuote(c, { rfqId: rfq.id, body: { supplierId: sup.id, priceTotal: 1, freightTotal: 250_000, lines: [
      { description: 'Item A', qty: 4, uom: 'PCS', unitPrice: 1_000_000 },
      { description: 'Item B', qty: 2, uom: 'PCS', unitPrice: 500_000 }
    ] }, user: u, requestId: randomUUID() });
    const quotes = await procurement.listQuotes(c, rfq.id, u);
    assert.equal(Number(quotes.items[0].priceTotal), 5_000_000, 'total server-side, angka klien diabaikan');
    assert.equal(quotes.items[0].lines.length, 2);
    assert.equal(quotes.lineComparison.length, 2);
    await procurement.selectQuote(c, { rfqId: rfq.id, quoteId: quotes.items[0].id, reason: 'ok', user: u, requestId: randomUUID() });
    const po = await procurement.rfqToPurchaseOrder(c, { rfqId: rfq.id, user: u, requestId: randomUUID() });
    const lines = (await c.query('SELECT count(*)::int n FROM document_lines WHERE document_id=$1', [po.child.id])).rows[0];
    assert.equal(lines.n, 2, 'baris kuota tersalin ke PO');
  });
});

dbTest('PO change order: SoD pemohon≠pemutus, apply saat approve, blokir setelah GR selesai', async () => {
  await withRollback(async (c) => {
    const u = await getUser(c, 'owner');
    const u2 = await getUser(c, 'procurement');
    const po = await runtime.createDocument(c, { type: 'PURCHASE_ORDER', user: u, title: 'PO amend', amount: 10_000_000, requestId: randomUUID() });
    await c.query(`UPDATE business_documents SET status='APPROVED' WHERE id=$1`, [po.id]);
    const co = await procurement.createChangeOrder(c, { poId: po.id, newAmount: 12_000_000, newLines: [{ description: 'Item', qty: 1, unitPrice: 12_000_000 }], reason: 'Harga naik', user: u2, requestId: randomUUID() });
    assert.equal(co.status, 'PENDING');
    await assert.rejects(() => procurement.decideChangeOrder(c, { changeOrderId: co.id, decision: 'APPROVED', reason: 'x', user: u2, requestId: randomUUID() }), (e) => e.code === 'SOD_CONFLICT');
    await procurement.decideChangeOrder(c, { changeOrderId: co.id, decision: 'APPROVED', reason: 'Wajar', user: u, requestId: randomUUID() });
    const after = (await c.query('SELECT amount FROM business_documents WHERE id=$1', [po.id])).rows[0];
    assert.equal(Number(after.amount), 12_000_000);
    // Setelah GR selesai → amendemen baru ditolak
    const gr = await runtime.createDocument(c, { type: 'GOODS_RECEIPT', user: u, title: 'GR', amount: 0, requestId: randomUUID() });
    await c.query(`INSERT INTO document_relations(parent_document_id,child_document_id,relation_type,created_by) VALUES($1,$2,'ORDER_TO_RECEIPT',$3)`, [po.id, gr.id, u.id]);
    await c.query(`UPDATE business_documents SET status='COMPLETED' WHERE id=$1`, [gr.id]);
    await assert.rejects(() => procurement.createChangeOrder(c, { poId: po.id, newAmount: 1, reason: 'x', user: u2, requestId: randomUUID() }), (e) => e.code === 'DOCUMENT_CONFLICT');
  });
});

dbTest('service receipt: tanpa mutasi stok/lot, claim posting tercatat, idempoten', async () => {
  await withRollback(async (c) => {
    const u = await getUser(c, 'owner');
    const gr = await runtime.createDocument(c, { type: 'GOODS_RECEIPT', user: u, title: 'Jasa instalasi', amount: 3_000_000, requestId: randomUUID(), payload: { receiptType: 'SERVICE', lines: [{ description: 'Instalasi mesin', qty: 1, unitPrice: 3_000_000 }] } });
    await c.query(`UPDATE business_documents SET status='COMPLETED' WHERE id=$1`, [gr.id]);
    const doc = runtime.camel((await c.query('SELECT * FROM business_documents WHERE id=$1', [gr.id])).rows[0]);
    const res = await posting.postInventory(c, doc, u);
    assert.equal(res.service, true);
    assert.equal(Number((await c.query('SELECT count(*) n FROM inventory_movements WHERE document_id=$1', [gr.id])).rows[0].n), 0);
    assert.equal(Number((await c.query('SELECT count(*) n FROM stock_lots WHERE source_document_id=$1', [gr.id])).rows[0].n), 0);
    assert.equal((await posting.postInventory(c, doc, u)).replay, true);
  });
});

dbTest('payment reversal: jurnal pembalik seimbang, alokasi reversed, invoice pulih, payment VOID, idempoten', async () => {
  await withRollback(async (c) => {
    const u = await getUser(c, 'owner');
    const cust = (await c.query('SELECT id FROM customers WHERE active LIMIT 1')).rows[0];
    const inv = await runtime.createDocument(c, { type: 'INVOICE', user: u, title: 'INV rev', amount: 4_000_000, partyId: cust.id, requestId: randomUUID() });
    await c.query(`UPDATE business_documents SET status='APPROVED' WHERE id=$1`, [inv.id]);
    await posting.postAccounting(c, runtime.camel((await c.query('SELECT * FROM business_documents WHERE id=$1', [inv.id])).rows[0]), u);
    const pay = await runtime.createDocument(c, { type: 'CUSTOMER_PAYMENT', user: u, title: 'PAY rev', amount: 4_000_000, partyId: cust.id, requestId: randomUUID() });
    await c.query(`UPDATE business_documents SET status='APPROVED' WHERE id=$1`, [pay.id]);
    await businessOps.allocatePayment(c, { paymentId: pay.id, invoiceId: inv.id, amount: 4_000_000, user: u });
    await c.query(`UPDATE business_documents SET status='CLOSED' WHERE id=$1`, [pay.id]);
    await posting.postAccounting(c, runtime.camel((await c.query('SELECT * FROM business_documents WHERE id=$1', [pay.id])).rows[0]), u);
    const rev = await businessOps.reversePayment(c, { paymentId: pay.id, reason: 'Salah transfer', user: u, requestId: randomUUID() });
    assert.equal(rev.reversedLines, 2);
    const jl = (await c.query(`SELECT COALESCE(SUM(debit),0)::float d,COALESCE(SUM(credit),0)::float cr FROM journal_lines WHERE journal_document_id=$1`, [pay.id])).rows[0];
    assert.ok(Math.abs(jl.d - jl.cr) < 0.01 && jl.d === 8_000_000, 'jurnal asli + pembalik seimbang');
    const invAfter = (await c.query('SELECT status,payload FROM business_documents WHERE id=$1', [inv.id])).rows[0];
    assert.equal(invAfter.status, 'APPROVED');
    assert.equal(Number(invAfter.payload.paid), 0);
    assert.equal((await c.query('SELECT status FROM business_documents WHERE id=$1', [pay.id])).rows[0].status, 'VOID');
    assert.equal(Number((await c.query('SELECT count(*) n FROM payment_allocations WHERE payment_document_id=$1 AND reversed_at IS NULL', [pay.id])).rows[0].n), 0);
    assert.equal((await businessOps.reversePayment(c, { paymentId: pay.id, reason: 'x', user: u, requestId: randomUUID() })).replay, true);
    // Reason wajib
    const pay2 = await runtime.createDocument(c, { type: 'CUSTOMER_PAYMENT', user: u, title: 'PAY2', amount: 1, requestId: randomUUID() });
    await assert.rejects(() => businessOps.reversePayment(c, { paymentId: pay2.id, reason: '', user: u, requestId: randomUUID() }), (e) => e.code === 'REASON_REQUIRED');
  });
});
