'use strict';
// Sprint 9 (R016) — O2C completion: revisi penawaran ber-versi, dunning/
// collection configuration-driven, dan RMA/garansi dengan posting profile.
// Semua tes ROLLBACK-terisolasi.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');

const enabled = !!process.env.DATABASE_URL;
const dbTest = enabled ? test : test.skip;

const runtime = require('../backend/infrastructure/database/repositories/runtime');
const posting = require('../backend/infrastructure/database/repositories/posting');
const o2c = require('../backend/infrastructure/database/repositories/sales-o2c');

async function withRollback(fn) {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try { await c.query('BEGIN'); await c.query("SELECT set_config('app.is_system','on',true),set_config('app.is_platform','on',true),set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true)"); await fn(c); } finally { await c.query('ROLLBACK').catch(() => {}); await c.end(); }
}
const owner = async (c) => runtime.camel((await c.query(`SELECT id,username,display_name "displayName",role,branch_id "branchId",branch_scope "branchScope" FROM app_users WHERE role='owner' LIMIT 1`)).rows[0]);

dbTest('revisi penawaran: snapshot immutable, revisionNo naik, approval di-reset', async () => {
  await withRollback(async (c) => {
    const u = await owner(c);
    const q = await runtime.createDocument(c, { type: 'QUOTATION', user: u, title: 'Q rev test', amount: 100_000_000, requestId: randomUUID(), payload: { lines: [{ description: 'Jasa', qty: 1, unitPrice: 100_000_000 }] } });
    await c.query(`UPDATE business_documents SET status='WAITING_APPROVAL' WHERE id=$1`, [q.id]);
    const r = await o2c.reviseQuotation(c, { docId: q.id, reason: 'Harga berubah', user: u, requestId: randomUUID() });
    assert.equal(r.revisionNo, 2);
    assert.equal(r.status, 'DRAFT');
    const doc = (await c.query('SELECT status,payload,approvals FROM business_documents WHERE id=$1', [q.id])).rows[0];
    assert.equal(doc.status, 'DRAFT');
    assert.equal(Number(doc.payload.revisionNo), 2);
    assert.deepEqual(doc.approvals, []);
    const revs = await o2c.listQuotationRevisions(c, q.id, u);
    assert.equal(revs.items.length, 1);
    assert.equal(Number(revs.items[0].amount), 100_000_000);
    assert.ok(Array.isArray(revs.items[0].lines) && revs.items[0].lines.length === 1, 'snapshot lines tersimpan');
  });
});

dbTest('revisi penawaran: draft ditolak (edit langsung), terkonversi ditolak (buat baru)', async () => {
  await withRollback(async (c) => {
    const u = await owner(c);
    const q = await runtime.createDocument(c, { type: 'QUOTATION', user: u, title: 'Q guard', amount: 1_000_000, requestId: randomUUID() });
    await assert.rejects(() => o2c.reviseQuotation(c, { docId: q.id, reason: 'x', user: u, requestId: randomUUID() }), (e) => e.code === 'STATUS_INVALID');
    await c.query(`UPDATE business_documents SET status='APPROVED' WHERE id=$1`, [q.id]);
    const so = await runtime.createDocument(c, { type: 'SALES_ORDER', user: u, title: 'SO', amount: 1, requestId: randomUUID() });
    await c.query(`INSERT INTO document_relations(parent_document_id,child_document_id,relation_type,created_by) VALUES($1,$2,'QUOTATION_TO_ORDER',$3)`, [q.id, so.id, u.id]);
    await assert.rejects(() => o2c.reviseQuotation(c, { docId: q.id, reason: 'x', user: u, requestId: randomUUID() }), (e) => e.code === 'DOCUMENT_CONFLICT');
  });
});

dbTest('dunning: jenjang policy, idempoten per level, level 3 memasang credit hold', async () => {
  await withRollback(async (c) => {
    const u = await owner(c);
    const cust = (await c.query(`INSERT INTO customers(id,code,name,city,active,credit_hold) VALUES($1,$2,'Cust Dunning','Bekasi',true,false) RETURNING id`, [randomUUID(), `CD-${Date.now()}`])).rows[0];
    const mkInv = async (days, amount) => {
      const inv = await runtime.createDocument(c, { type: 'INVOICE', user: u, title: `INV ${days}d`, amount, partyId: cust.id, requestId: randomUUID() });
      await c.query(`UPDATE business_documents SET status='APPROVED',due_date=current_date-$2::int WHERE id=$1`, [inv.id, days]);
      return inv;
    };
    const inv8 = await mkInv(8, 5_000_000);
    const inv35 = await mkInv(35, 20_000_000);
    const run = await o2c.runDunning(c, { user: u, requestId: randomUUID() });
    const n8 = run.notices.find((x) => x.invoice === inv8.documentNumber);
    const n35 = run.notices.find((x) => x.invoice === inv35.documentNumber);
    assert.equal(n8.level, 1);
    assert.equal(n35.level, 3);
    assert.equal(n35.creditHeld, true);
    const held = (await c.query('SELECT credit_hold,credit_hold_reason FROM customers WHERE id=$1', [cust.id])).rows[0];
    assert.equal(held.credit_hold, true);
    assert.match(held.credit_hold_reason, /DUN-/);
    // Idempoten per invoice per level
    const run2 = await o2c.runDunning(c, { user: u, requestId: randomUUID() });
    assert.ok(!run2.notices.some((x) => x.invoice === inv8.documentNumber && x.level === 1));
    // Lunas → tidak ditagih lagi
    await c.query(`INSERT INTO payment_allocations(id,payment_document_id,invoice_document_id,amount) VALUES($1,$2,$3,$4)`, [randomUUID(), inv8.id, inv8.id, 5_000_000]);
    const run3 = await o2c.runDunning(c, { user: u, requestId: randomUUID() });
    assert.ok(!run3.notices.some((x) => x.invoice === inv8.documentNumber));
    // Resolve wajib alasan
    const list = await o2c.listDunning(c, u, {});
    await assert.rejects(() => o2c.resolveDunning(c, { noticeId: list.items[0].id, reason: '', user: u, requestId: randomUUID() }), (e) => e.code === 'REASON_REQUIRED');
    const res = await o2c.resolveDunning(c, { noticeId: list.items[0].id, reason: 'Pembayaran diterima', user: u, requestId: randomUUID() });
    assert.equal(res.status, 'RESOLVED');
  });
});

dbTest('dunning: kebijakan configuration-driven — ubah ambang hari mengubah jenjang', async () => {
  await withRollback(async (c) => {
    const u = await owner(c);
    await c.query(`UPDATE dunning_policies SET min_days_overdue=3 WHERE level=3`);
    const cust = (await c.query(`INSERT INTO customers(id,code,name,active) VALUES($1,$2,'Cust Cfg',true) RETURNING id`, [randomUUID(), `CC-${Date.now()}`])).rows[0];
    const inv = await runtime.createDocument(c, { type: 'INVOICE', user: u, title: 'INV cfg', amount: 1_000_000, partyId: cust.id, requestId: randomUUID() });
    await c.query(`UPDATE business_documents SET status='APPROVED',due_date=current_date-5 WHERE id=$1`, [inv.id]);
    const run = await o2c.runDunning(c, { user: u, requestId: randomUUID() });
    const n = run.notices.find((x) => x.invoice === inv.documentNumber);
    assert.equal(n.level, 3, 'telat 5 hari langsung L3 setelah ambang diubah ke 3 — bukti tidak hardcoded');
  });
});

dbTest('RMA: garansi valid → posting RESTOCK + lot retur + jurnal RMA-DEFAULT; kedaluwarsa ditolak', async () => {
  await withRollback(async (c) => {
    const u = await owner(c);
    const prod = (await c.query(`INSERT INTO products(id,code,name,uom,hpp,price,active,warranty_months) VALUES($1,$2,'Produk garansi','PCS',1000,2000,true,12) RETURNING id`, [randomUUID(), `WT-${Date.now()}`])).rows[0];
    // P0-I: header WAJIB konsisten dengan baris (2 × 2000 = 4000).
    const delivery = await runtime.createDocument(c, { type: 'DELIVERY', user: u, title: 'DO', amount: 4000, requestId: randomUUID(), payload: { lines: [{ productId: prod.id, description: 'x', qty: 2, unitPrice: 2000 }] } });
    await c.query(`UPDATE business_documents SET status='COMPLETED',created_at=now()-interval '2 months' WHERE id=$1`, [delivery.id]);
    const rma = await o2c.createRma(c, { user: u, sourceDocumentId: delivery.id, warrantyClaim: true, requestId: randomUUID(),
      lines: [{ productId: prod.id, qty: 1, unitPrice: 2000, disposition: 'RESTOCK' }, { productId: prod.id, qty: 1, unitPrice: 0, disposition: 'SCRAP' }] });
    assert.match(rma.documentNumber, /^RMA-/);
    await c.query(`UPDATE business_documents SET status='COMPLETED' WHERE id=$1`, [rma.id]);
    const doc = runtime.camel((await c.query('SELECT * FROM business_documents WHERE id=$1', [rma.id])).rows[0]);
    const before = Number((await c.query('SELECT COALESCE(SUM(qty_on_hand),0) q FROM inventory_balances WHERE product_id=$1', [prod.id])).rows[0].q);
    const post = await posting.postInventory(c, doc, u);
    const after = Number((await c.query('SELECT COALESCE(SUM(qty_on_hand),0) q FROM inventory_balances WHERE product_id=$1', [prod.id])).rows[0].q);
    assert.equal(after, before + 1, 'hanya baris RESTOCK yang menambah stok');
    assert.equal(post.journal.profileCode, 'RMA-DEFAULT');
    const lot = (await c.query('SELECT lot_number FROM stock_lots WHERE source_document_id=$1', [rma.id])).rows[0];
    assert.match(lot.lot_number, /\/R\d+$/);
    const jl = (await c.query(`SELECT a.code,jl.debit,jl.credit FROM journal_lines jl JOIN chart_of_accounts a ON a.id=jl.account_id WHERE jl.journal_document_id=$1`, [rma.id])).rows;
    const d = jl.find((x) => Number(x.debit) > 0), cr = jl.find((x) => Number(x.credit) > 0);
    assert.equal(d.code, '4110'); assert.equal(cr.code, '1200');
    assert.equal((await posting.postInventory(c, doc, u)).replay, true, 'posting RMA idempoten');
    // Garansi kedaluwarsa
    await c.query('UPDATE products SET warranty_months=1 WHERE id=$1', [prod.id]);
    await assert.rejects(
      () => o2c.createRma(c, { user: u, sourceDocumentId: delivery.id, warrantyClaim: true, requestId: randomUUID(), lines: [{ productId: prod.id, qty: 1, unitPrice: 1, disposition: 'RESTOCK' }] }),
      (e) => e.code === 'VALIDATION_ERROR' && /kedaluwarsa/.test(String(e.detail || e.message)));
  });
});

dbTest('RMA: produk tanpa garansi menolak klaim; disposisi tak dikenal ditolak', async () => {
  await withRollback(async (c) => {
    const u = await owner(c);
    const prod = (await c.query(`INSERT INTO products(id,code,name,uom,hpp,price,active,warranty_months) VALUES($1,$2,'Tanpa garansi','PCS',1000,2000,true,0) RETURNING id`, [randomUUID(), `NW-${Date.now()}`])).rows[0];
    const delivery = await runtime.createDocument(c, { type: 'DELIVERY', user: u, title: 'DO', amount: 0, requestId: randomUUID() });
    await c.query(`UPDATE business_documents SET status='COMPLETED' WHERE id=$1`, [delivery.id]);
    await assert.rejects(
      () => o2c.createRma(c, { user: u, sourceDocumentId: delivery.id, warrantyClaim: true, requestId: randomUUID(), lines: [{ productId: prod.id, qty: 1, unitPrice: 1, disposition: 'RESTOCK' }] }),
      (e) => e.code === 'VALIDATION_ERROR' && /tidak memiliki masa garansi/.test(String(e.detail || e.message)));
    await assert.rejects(
      () => o2c.createRma(c, { user: u, requestId: randomUUID(), lines: [{ productId: prod.id, qty: 1, unitPrice: 1, disposition: 'MELT' }] }),
      (e) => e.code === 'VALIDATION_ERROR');
  });
});
