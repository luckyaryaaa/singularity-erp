'use strict';
// Wave 2 — R016 credit control & R017 source-to-pay. Setiap tes berjalan dalam
// satu transaksi yang di-ROLLBACK, sehingga tidak meninggalkan data.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');

const enabled = !!process.env.DATABASE_URL;
const dbTest = enabled ? test : test.skip;

const procurement = require('../backend/infrastructure/database/repositories/procurement');
const runtime = require('../backend/infrastructure/database/repositories/runtime');

async function withRollback(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try { await client.query('BEGIN'); await client.query("SELECT set_config('app.is_system','on',true)"); await fn(client); } finally { await client.query('ROLLBACK').catch(() => {}); await client.end(); }
}
async function owner(client) {
  return runtime.camel((await client.query(`SELECT id,username,display_name "displayName",role,branch_id "branchId",branch_scope "branchScope" FROM app_users WHERE role='owner' LIMIT 1`)).rows[0]);
}

dbTest('RFQ: perbandingan landed cost, pilih supplier, konversi ke PO', async () => {
  await withRollback(async (client) => {
    const user = await owner(client);
    const suppliers = (await client.query('SELECT id,name FROM suppliers LIMIT 2')).rows;
    const rfq = await runtime.createDocument(client, { type: 'RFQ', user, title: 'RFQ test', amount: 0, requestId: randomUUID() });
    await procurement.addQuote(client, { rfqId: rfq.id, body: { supplierId: suppliers[0].id, priceTotal: 40_000_000, freightTotal: 3_000_000 }, user, requestId: randomUUID() });
    await procurement.addQuote(client, { rfqId: rfq.id, body: { supplierId: suppliers[1].id, priceTotal: 39_000_000, freightTotal: 1_000_000 }, user, requestId: randomUUID() });
    const quotes = (await procurement.listQuotes(client, rfq.id, user)).items;
    assert.equal(quotes.length, 2);
    assert.ok(quotes[0].landedCost <= quotes[1].landedCost, 'diurutkan landed cost naik');
    assert.equal(quotes[0].recommended, true);
    await procurement.selectQuote(client, { rfqId: rfq.id, quoteId: quotes[0].id, reason: 'Landed cost terendah', user, requestId: randomUUID() });
    const po = await procurement.rfqToPurchaseOrder(client, { rfqId: rfq.id, user, requestId: randomUUID() });
    assert.match(po.child.documentNumber, /^PO-/);
    assert.equal(po.child.partyId, quotes[0].supplierId);
    // idempoten: konversi kedua mengembalikan PO yang sama.
    const again = await procurement.rfqToPurchaseOrder(client, { rfqId: rfq.id, user, requestId: randomUUID() });
    assert.equal(again.alreadyConverted, true);
    assert.equal(again.child.documentNumber, po.child.documentNumber);
  });
});

dbTest('Three-way match: EXCEPTION memblokir approve; override butuh alasan', async () => {
  await withRollback(async (client) => {
    const user = await owner(client);
    const supplier = (await client.query('SELECT id,name FROM suppliers LIMIT 1')).rows[0];
    const po = await runtime.createDocument(client, { type: 'PURCHASE_ORDER', user, title: 'PO', amount: 10_000_000, partyId: supplier.id, partyName: supplier.name, requestId: randomUUID() });
    const inv = await runtime.createDocument(client, { type: 'SUPPLIER_INVOICE', user, title: 'INV', amount: 13_000_000, partyId: supplier.id, partyName: supplier.name, payload: { purchaseOrderNumber: po.documentNumber }, requestId: randomUUID() });
    const match = await procurement.evaluateThreeWayMatch(client, { supplierInvoiceId: inv.id, user, requestId: randomUUID() });
    assert.equal(match.result, 'EXCEPTION');
    await assert.rejects(() => procurement.assertMatchOk(client, { id: inv.id, document_type: 'SUPPLIER_INVOICE' }, { user }), (e) => e.code === 'MATCH_FAILED');
    await procurement.assertMatchOk(client, { id: inv.id, document_type: 'SUPPLIER_INVOICE' }, { overrideReason: 'Disetujui manajemen', user });
    const after = await procurement.getMatch(client, inv.id, user);
    assert.equal(after.result, 'OVERRIDDEN');
  });
});

dbTest('Three-way match: dalam toleransi menghasilkan MATCHED dan lolos approve', async () => {
  await withRollback(async (client) => {
    const user = await owner(client);
    const supplier = (await client.query('SELECT id,name FROM suppliers LIMIT 1')).rows[0];
    const po = await runtime.createDocument(client, { type: 'PURCHASE_ORDER', user, title: 'PO', amount: 10_000_000, partyId: supplier.id, partyName: supplier.name, requestId: randomUUID() });
    const gr = await runtime.createDocument(client, { type: 'GOODS_RECEIPT', user, title: 'GR', amount: 10_000_000, partyId: supplier.id, partyName: supplier.name, requestId: randomUUID() });
    await client.query(`INSERT INTO document_relations(parent_document_id,child_document_id,relation_type,created_by) VALUES($1,$2,'ORDER_TO_RECEIPT',$3)`, [po.id, gr.id, user.id]);
    const inv = await runtime.createDocument(client, { type: 'SUPPLIER_INVOICE', user, title: 'INV', amount: 10_010_000, partyId: supplier.id, partyName: supplier.name, payload: { purchaseOrderNumber: po.documentNumber }, requestId: randomUUID() });
    const match = await procurement.evaluateThreeWayMatch(client, { supplierInvoiceId: inv.id, user, requestId: randomUUID() });
    assert.equal(match.result, 'MATCHED');
    await procurement.assertMatchOk(client, { id: inv.id, document_type: 'SUPPLIER_INVOICE' }, { user }); // tidak melempar
  });
});

dbTest('Credit control: hold memblokir invoice, override finance melepas', async () => {
  await withRollback(async (client) => {
    const user = await owner(client);
    const cust = (await client.query('SELECT id,name FROM customers LIMIT 1')).rows[0];
    await client.query(`UPDATE customers SET credit_hold=true, credit_limit_amount=0 WHERE id=$1`, [cust.id]);
    const inv = await runtime.createDocument(client, { type: 'INVOICE', user, title: 'INV', amount: 5_000_000, partyId: cust.id, partyName: cust.name, requestId: randomUUID() });
    const raw = (await client.query('SELECT * FROM business_documents WHERE id=$1', [inv.id])).rows[0];
    await assert.rejects(() => procurement.assertCreditOk(client, raw), (e) => e.code === 'CREDIT_HOLD');
    await procurement.grantCreditOverride(client, { documentId: inv.id, reason: 'Disetujui finance', user, requestId: randomUUID() });
    await procurement.assertCreditOk(client, raw); // tidak melempar
  });
});

dbTest('Credit control: eksposur melampaui limit diblokir', async () => {
  await withRollback(async (client) => {
    const user = await owner(client);
    const cust = (await client.query('SELECT id,name FROM customers LIMIT 1')).rows[0];
    await client.query(`UPDATE customers SET credit_hold=false, credit_limit_amount=1000000 WHERE id=$1`, [cust.id]);
    const inv = await runtime.createDocument(client, { type: 'INVOICE', user, title: 'INV besar', amount: 9_000_000, partyId: cust.id, partyName: cust.name, requestId: randomUUID() });
    const raw = (await client.query('SELECT * FROM business_documents WHERE id=$1', [inv.id])).rows[0];
    await assert.rejects(() => procurement.assertCreditOk(client, raw), (e) => e.code === 'CREDIT_HOLD');
  });
});

dbTest('Payment proposal: kumpulkan tagihan disetujui, tahan rekening belum verifikasi', async () => {
  await withRollback(async (client) => {
    const user = await owner(client);
    const supplier = (await client.query('SELECT id,name FROM suppliers LIMIT 1')).rows[0];
    const inv = await runtime.createDocument(client, { type: 'SUPPLIER_INVOICE', user, title: 'INV PP', amount: 7_000_000, partyId: supplier.id, partyName: supplier.name, dueDate: '2026-07-31', requestId: randomUUID() });
    await client.query(`UPDATE business_documents SET status='APPROVED' WHERE id=$1`, [inv.id]);
    const proposal = await procurement.generatePaymentProposal(client, { user, requestId: randomUUID(), dueBefore: '2026-12-31' });
    assert.match(proposal.documentNumber, /^PP-/);
    assert.ok(proposal.lineCount >= 1);
    const lines = await procurement.proposalLines(client, proposal.id, user);
    assert.ok(lines.some((l) => l.supplierInvoiceId === inv.id));
  });
});
