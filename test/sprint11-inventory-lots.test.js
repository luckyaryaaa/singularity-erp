'use strict';
// Sprint 11 (R018) — lot/serial/heat-number traceability + stock opname.
// Membuktikan: lot lahir dari GR (heat/mill cert), konsumsi FIFO, lot terblokir
// dilewati, transfer mewarisi lineage, dan selisih opname dijurnal via posting
// profile OPNAME-DEFAULT (bukan hardcode). Semua tes ROLLBACK-terisolasi.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');

const enabled = !!process.env.DATABASE_URL;
const dbTest = enabled ? test : test.skip;

const runtime = require('../backend/infrastructure/database/repositories/runtime');
const posting = require('../backend/infrastructure/database/repositories/posting');
const inv = require('../backend/infrastructure/database/repositories/inventory');

async function withRollback(fn) {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try { await c.query('BEGIN'); await c.query("SELECT set_config('app.is_system','on',true)"); await fn(c); } finally { await c.query('ROLLBACK').catch(() => {}); await c.end(); }
}
const owner = async (c) => runtime.camel((await c.query(`SELECT id,username,display_name "displayName",role,branch_id "branchId",branch_scope "branchScope" FROM app_users WHERE role='owner' LIMIT 1`)).rows[0]);
const fixtures = async (c) => {
  const wh = (await c.query('SELECT id FROM branches WHERE active LIMIT 1')).rows[0];
  const wh2 = (await c.query('SELECT id FROM branches WHERE active AND id<>$1 LIMIT 1', [wh.id])).rows[0];
  const prod = (await c.query('SELECT id,hpp FROM products WHERE active LIMIT 1')).rows[0];
  return { wh, wh2, prod };
};
async function completedDoc(c, u, type, payload, amount = 0) {
  const doc = await runtime.createDocument(c, { type, user: u, title: `${type} lot test`, amount, requestId: randomUUID(), payload });
  await c.query(`UPDATE business_documents SET status='COMPLETED' WHERE id=$1`, [doc.id]);
  const row = runtime.camel((await c.query('SELECT * FROM business_documents WHERE id=$1', [doc.id])).rows[0]);
  await posting.postInventory(c, row, u);
  return row;
}

dbTest('lot: GR menciptakan lot per baris dengan heat number + mill certificate', async () => {
  await withRollback(async (c) => {
    const u = await owner(c), { wh, prod } = await fixtures(c);
    const gr = await completedDoc(c, u, 'GOODS_RECEIPT', { warehouseId: wh.id, lines: [
      { productId: prod.id, description: 'Plate A', qty: 10, unitPrice: 100, heatNumber: 'HT-001', millCertNo: 'MTC-01' },
      { productId: prod.id, description: 'Plate B', qty: 5, unitPrice: 100, heatNumber: 'HT-002', millCertNo: 'MTC-02' }
    ] });
    const lots = (await c.query('SELECT * FROM stock_lots WHERE source_document_id=$1 ORDER BY lot_number', [gr.id])).rows;
    assert.equal(lots.length, 2);
    assert.equal(lots[0].heat_number, 'HT-001');
    assert.equal(lots[1].mill_cert_no, 'MTC-02');
    assert.equal(Number(lots[0].qty_on_hand), 10);
    assert.equal(lots[0].lot_number, `${gr.documentNumber}/L1`);
    const mv = (await c.query(`SELECT count(*)::int n FROM stock_lot_movements WHERE document_id=$1 AND movement_type='RECEIPT'`, [gr.id])).rows[0];
    assert.equal(mv.n, 2);
  });
});

dbTest('lot: konsumsi FIFO menghabiskan lot tertua dulu; lot terblokir dilewati', async () => {
  await withRollback(async (c) => {
    const u = await owner(c), { wh, prod } = await fixtures(c);
    const gr = await completedDoc(c, u, 'GOODS_RECEIPT', { warehouseId: wh.id, lines: [
      { productId: prod.id, description: 'A', qty: 10, unitPrice: 100, heatNumber: 'HT-A' },
      { productId: prod.id, description: 'B', qty: 5, unitPrice: 100, heatNumber: 'HT-B' }
    ] });
    await completedDoc(c, u, 'MATERIAL_ISSUE', { warehouseId: wh.id, lines: [{ productId: prod.id, description: 'issue', qty: 12, unitPrice: 0 }] });
    const after = (await c.query('SELECT lot_number,qty_on_hand,status FROM stock_lots WHERE source_document_id=$1 ORDER BY lot_number', [gr.id])).rows;
    assert.equal(after[0].status, 'CONSUMED');
    assert.equal(Number(after[1].qty_on_hand), 3);
    // Blokir lot sisa → FIFO tidak boleh memakainya
    const lot2 = (await c.query(`SELECT id FROM stock_lots WHERE source_document_id=$1 AND status='ACTIVE'`, [gr.id])).rows[0];
    await inv.setLotStatus(c, { lotId: lot2.id, action: 'block', reason: 'QC hold', user: u, requestId: randomUUID() });
    const res = await inv.consumeLots(c, { productId: prod.id, warehouseId: wh.id, qty: 2, doc: { id: gr.id }, user: u, type: 'ISSUE' });
    assert.ok(!res.picks.some((x) => x.lot.id === lot2.id), 'lot terblokir tidak boleh dikonsumsi');
  });
});

dbTest('lot: transfer antar gudang mewarisi heat number + lineage parent', async () => {
  await withRollback(async (c) => {
    const u = await owner(c), { wh, wh2, prod } = await fixtures(c);
    assert.ok(wh2, 'butuh dua gudang aktif');
    await completedDoc(c, u, 'GOODS_RECEIPT', { warehouseId: wh.id, lines: [{ productId: prod.id, description: 'A', qty: 8, unitPrice: 100, heatNumber: 'HT-TRF', millCertNo: 'MTC-TRF' }] });
    const trf = await completedDoc(c, u, 'STOCK_TRANSFER', { fromWarehouseId: wh.id, toWarehouseId: wh2.id, lines: [{ productId: prod.id, description: 'pindah', qty: 3, unitPrice: 0 }] });
    const child = (await c.query('SELECT * FROM stock_lots WHERE source_document_id=$1', [trf.id])).rows[0];
    assert.equal(child.heat_number, 'HT-TRF');
    assert.equal(child.mill_cert_no, 'MTC-TRF');
    assert.equal(child.warehouse_id, wh2.id);
    assert.ok(child.parent_lot_id);
    const detail = await inv.lotDetail(c, child.id);
    assert.ok(detail.ancestry.length >= 1, 'silsilah harus menunjuk lot induk');
  });
});

dbTest('opname: nomor OPN, snapshot baris, selisih → saldo + jurnal profil OPNAME-DEFAULT', async () => {
  await withRollback(async (c) => {
    const u = await owner(c), { wh, prod } = await fixtures(c);
    await completedDoc(c, u, 'GOODS_RECEIPT', { warehouseId: wh.id, lines: [{ productId: prod.id, description: 'A', qty: 10, unitPrice: 100, heatNumber: 'HT-OPN' }] });
    // Defensif terhadap data dev: batalkan opname berjalan pada gudang uji
    // (dalam transaksi rollback — tidak menyentuh data asli).
    await c.query(`UPDATE business_documents SET status='CANCELLED' WHERE document_type='STOCK_OPNAME' AND payload->>'warehouseId'=$1 AND status IN ('DRAFT','WAITING_APPROVAL','REVISION_REQUIRED')`, [wh.id]);
    const op = await inv.createOpname(c, { user: u, warehouseId: wh.id, requestId: randomUUID() });
    assert.match(op.documentNumber, /^OPN-/);
    const lines = await inv.opnameLines(c, op.id, u);
    assert.ok(lines.items.length >= 1);
    // Hitung: satu lot selisih -2, sisanya sesuai sistem
    const target = lines.items.find((l) => l.heatNumber === 'HT-OPN');
    const counts = lines.items.map((l) => ({ lineId: l.id, countedQty: l.id === target.id ? Number(l.systemQty) - 2 : Number(l.systemQty) }));
    const sum = await inv.enterOpnameCounts(c, { docId: op.id, counts, user: u, requestId: randomUUID() });
    assert.ok(sum.loss > 0, 'nilai selisih kurang harus terhitung');
    const amount = Number((await c.query('SELECT amount FROM business_documents WHERE id=$1', [op.id])).rows[0].amount);
    assert.equal(amount, sum.loss, 'amount dokumen = nilai selisih (eskalasi approval otomatis)');
    // APPROVED → posting
    await c.query(`UPDATE business_documents SET status='APPROVED' WHERE id=$1`, [op.id]);
    const before = Number((await c.query('SELECT qty_on_hand FROM inventory_balances WHERE product_id=$1 AND warehouse_id=$2', [prod.id, wh.id])).rows[0].qty_on_hand);
    const opDoc = runtime.camel((await c.query('SELECT * FROM business_documents WHERE id=$1', [op.id])).rows[0]);
    const result = await posting.postInventory(c, opDoc, u);
    assert.equal(result.journal.profileCode, 'OPNAME-DEFAULT');
    const after = Number((await c.query('SELECT qty_on_hand FROM inventory_balances WHERE product_id=$1 AND warehouse_id=$2', [prod.id, wh.id])).rows[0].qty_on_hand);
    assert.equal(after, before - 2);
    const jl = (await c.query(`SELECT COALESCE(SUM(debit),0)::float d,COALESCE(SUM(credit),0)::float cr FROM journal_lines WHERE journal_document_id=$1`, [op.id])).rows[0];
    assert.ok(jl.d > 0 && Math.abs(jl.d - jl.cr) < 0.01, 'jurnal selisih harus seimbang');
    // Idempoten: posting ulang = replay, tidak dobel
    const again = await posting.postInventory(c, opDoc, u);
    assert.equal(again.replay, true);
    // Lot ikut turun
    const lot = (await c.query('SELECT qty_on_hand FROM stock_lots WHERE id=$1', [target.lotId])).rows[0];
    assert.equal(Number(lot.qty_on_hand), Number(target.systemQty) - 2);
  });
});

dbTest('opname: hitung hanya boleh saat DRAFT/REVISION; gudang dengan opname berjalan ditolak', async () => {
  await withRollback(async (c) => {
    const u = await owner(c), { wh, prod } = await fixtures(c);
    await completedDoc(c, u, 'GOODS_RECEIPT', { warehouseId: wh.id, lines: [{ productId: prod.id, description: 'A', qty: 4, unitPrice: 100 }] });
    await c.query(`UPDATE business_documents SET status='CANCELLED' WHERE document_type='STOCK_OPNAME' AND payload->>'warehouseId'=$1 AND status IN ('DRAFT','WAITING_APPROVAL','REVISION_REQUIRED')`, [wh.id]);
    const op = await inv.createOpname(c, { user: u, warehouseId: wh.id, requestId: randomUUID() });
    await assert.rejects(() => inv.createOpname(c, { user: u, warehouseId: wh.id, requestId: randomUUID() }), (e) => e.code === 'DOCUMENT_CONFLICT');
    await c.query(`UPDATE business_documents SET status='WAITING_APPROVAL' WHERE id=$1`, [op.id]);
    const lines = await inv.opnameLines(c, op.id, u);
    await assert.rejects(() => inv.enterOpnameCounts(c, { docId: op.id, counts: [{ lineId: lines.items[0].id, countedQty: 1 }], user: u, requestId: randomUUID() }), (e) => e.code === 'STATUS_INVALID');
  });
});
