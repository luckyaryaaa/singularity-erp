'use strict';
// P0-O — three-way match tingkat baris: kuantitas ditagih vs DITERIMA (bukan
// dipesan), tagihan terdahulu ikut dihitung, dan harga satuan dibandingkan.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const runtime = require('../backend/infrastructure/database/repositories/runtime');
const procurement = require('../backend/infrastructure/database/repositories/procurement');

const dbTest = process.env.DATABASE_URL ? test : test.skip;
async function rollback(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try { await client.query('BEGIN'); await client.query("SELECT set_config('app.is_system','on',true)"); await fn(client); }
  finally { await client.query('ROLLBACK').catch(() => {}); await client.end(); }
}
async function owner(client) {
  const r = (await client.query(`SELECT u.*,b.legal_entity_id FROM app_users u JOIN branches b ON b.id=u.branch_id WHERE u.role='owner' AND b.legal_entity_id IS NOT NULL LIMIT 1`)).rows[0];
  return { id: r.id, role: r.role, branchId: r.branch_id, branchScope: '*', displayName: r.display_name };
}
let seq = 0;
async function product(client) {
  return (await client.query(
    `INSERT INTO products(id,code,name,product_type,category,uom,hpp,price,make_or_buy,active)
     VALUES($1,$2,$3,'PRODUCT','3WM-P0O','PCS',1000,2000,'BUY',true) RETURNING id,code`,
    [randomUUID(), `TWM${(seq += 1)}${Date.now().toString(36).toUpperCase().slice(-6)}`, `Bahan 3WM ${seq}`])).rows[0];
}
async function supplier(client) {
  return (await client.query(
    `INSERT INTO suppliers(id,code,name,category,active) VALUES($1,$2,'Pemasok 3WM','MATERIAL',true) RETURNING id,name`,
    [randomUUID(), `SUP${(seq += 1)}${Date.now().toString(36).toUpperCase().slice(-6)}`])).rows[0];
}
// unitPrice dan qty dipakai apa adanya; total header diturunkan server (P0-I).
const doc = (client, user, type, sup, lines, extra = {}) => runtime.createDocument(client, {
  type, user, title: type, amount: 0, partyId: sup.id, partyName: sup.name, requestId: randomUUID(),
  payload: { lines, taxPct: 0, ...extra }
});
async function relate(client, user, parentId, childId, relationType) {
  await client.query(`INSERT INTO document_relations(parent_document_id,child_document_id,relation_type,created_by) VALUES($1,$2,$3,$4)`, [parentId, childId, relationType, user.id]);
}
const evaluate = (client, user, invoiceId) => procurement.evaluateThreeWayMatch(client, { supplierInvoiceId: invoiceId, user, requestId: randomUUID() });

dbTest('P0-O: tagihan melebihi kuantitas yang DITERIMA ditolak walau sesuai PO', async () => rollback(async (client) => {
  const user = await owner(client);
  const sup = await supplier(client);
  const prod = await product(client);

  // PO 100 unit, diterima baru 40, tetapi supplier menagih 100 penuh.
  const po = await doc(client, user, 'PURCHASE_ORDER', sup, [{ productId: prod.id, description: prod.code, qty: 100, unitPrice: 1000, taxPct: 0 }]);
  const gr = await doc(client, user, 'GOODS_RECEIPT', sup, [{ productId: prod.id, description: prod.code, qty: 40, unitPrice: 1000, taxPct: 0 }]);
  await relate(client, user, po.id, gr.id, 'ORDER_TO_RECEIPT');
  const inv = await doc(client, user, 'SUPPLIER_INVOICE', sup, [{ productId: prod.id, description: prod.code, qty: 100, unitPrice: 1000, taxPct: 0 }], { purchaseOrderNumber: po.documentNumber });
  await relate(client, user, po.id, inv.id, 'ORDER_TO_INVOICE');

  const match = await evaluate(client, user, inv.id);
  assert.equal(match.result, 'EXCEPTION');
  assert.ok(match.exceptions.some((e) => /melebihi yang diterima 40/.test(e)), `pesan kuantitas hilang: ${JSON.stringify(match.exceptions)}`);
  const line = match.lineVariances.find((l) => l.productId === prod.id);
  assert.equal(line.receivedQty, 40);
  assert.equal(line.invoicedQty, 100);
  assert.equal(line.orderedQty, 100);
}));

dbTest('P0-O: penerimaan parsial berganda dijumlahkan dan tagihan sesuai diterima lolos', async () => rollback(async (client) => {
  const user = await owner(client);
  const sup = await supplier(client);
  const prod = await product(client);

  const po = await doc(client, user, 'PURCHASE_ORDER', sup, [{ productId: prod.id, description: prod.code, qty: 100, unitPrice: 1000, taxPct: 0 }]);
  // Dua pengiriman parsial: 60 + 40. Dulu hanya satu GR yang diperhitungkan.
  for (const qty of [60, 40]) {
    const gr = await doc(client, user, 'GOODS_RECEIPT', sup, [{ productId: prod.id, description: prod.code, qty, unitPrice: 1000, taxPct: 0 }]);
    await relate(client, user, po.id, gr.id, 'ORDER_TO_RECEIPT');
  }
  const inv = await doc(client, user, 'SUPPLIER_INVOICE', sup, [{ productId: prod.id, description: prod.code, qty: 100, unitPrice: 1000, taxPct: 0 }], { purchaseOrderNumber: po.documentNumber });
  await relate(client, user, po.id, inv.id, 'ORDER_TO_INVOICE');

  const match = await evaluate(client, user, inv.id);
  assert.equal(match.result, 'MATCHED', `tidak seharusnya exception: ${JSON.stringify(match.exceptions)}`);
  assert.equal(match.lineVariances[0].receivedQty, 100);
  assert.equal(match.goodsReceiptIds.length, 2, 'seluruh GR wajib tercatat sebagai bukti');
}));

dbTest('P0-O: tagihan kedua atas PO yang sama tidak boleh menagih ulang', async () => rollback(async (client) => {
  const user = await owner(client);
  const sup = await supplier(client);
  const prod = await product(client);

  const po = await doc(client, user, 'PURCHASE_ORDER', sup, [{ productId: prod.id, description: prod.code, qty: 100, unitPrice: 1000, taxPct: 0 }]);
  const gr = await doc(client, user, 'GOODS_RECEIPT', sup, [{ productId: prod.id, description: prod.code, qty: 100, unitPrice: 1000, taxPct: 0 }]);
  await relate(client, user, po.id, gr.id, 'ORDER_TO_RECEIPT');

  const first = await doc(client, user, 'SUPPLIER_INVOICE', sup, [{ productId: prod.id, description: prod.code, qty: 70, unitPrice: 1000, taxPct: 0 }], { purchaseOrderNumber: po.documentNumber });
  await relate(client, user, po.id, first.id, 'ORDER_TO_INVOICE');
  await client.query(`UPDATE business_documents SET status='APPROVED' WHERE id=$1`, [first.id]);
  assert.equal((await evaluate(client, user, first.id)).result, 'MATCHED');

  // Sisa yang boleh ditagih 30; menagih 50 wajib ditolak.
  const second = await doc(client, user, 'SUPPLIER_INVOICE', sup, [{ productId: prod.id, description: prod.code, qty: 50, unitPrice: 1000, taxPct: 0 }], { purchaseOrderNumber: po.documentNumber });
  await relate(client, user, po.id, second.id, 'ORDER_TO_INVOICE');
  const match = await evaluate(client, user, second.id);
  assert.equal(match.result, 'EXCEPTION');
  assert.ok(match.exceptions.some((e) => /sudah ditagih 70/.test(e)), `tagihan terdahulu tidak diperhitungkan: ${JSON.stringify(match.exceptions)}`);
  assert.equal(match.lineVariances[0].previouslyInvoicedQty, 70);

  // Menagih tepat sisanya (30) lolos. Tagihan kedua di atas masih DRAFT dan
  // sengaja TIDAK ikut mengunci sisa PO — draf telantar tidak boleh memblokir
  // penagihan yang sah.
  const third = await doc(client, user, 'SUPPLIER_INVOICE', sup, [{ productId: prod.id, description: prod.code, qty: 30, unitPrice: 1000, taxPct: 0 }], { purchaseOrderNumber: po.documentNumber });
  await relate(client, user, po.id, third.id, 'ORDER_TO_INVOICE');
  assert.equal((await evaluate(client, user, third.id)).result, 'MATCHED');

  // Begitu tagihan kedua diajukan (bukan draf lagi), klaimnya dihitung.
  await client.query(`UPDATE business_documents SET status='WAITING_APPROVAL' WHERE id=$1`, [second.id]);
  const recheck = await evaluate(client, user, third.id);
  assert.equal(recheck.result, 'EXCEPTION');
  assert.equal(recheck.lineVariances[0].previouslyInvoicedQty, 120, 'tagihan 70 + 50 yang sudah diajukan wajib dihitung');
}));

dbTest('P0-O: harga satuan di atas PO dan produk di luar PO ditandai', async () => rollback(async (client) => {
  const user = await owner(client);
  const sup = await supplier(client);
  const prod = await product(client);
  const seludupan = await product(client);

  const po = await doc(client, user, 'PURCHASE_ORDER', sup, [{ productId: prod.id, description: prod.code, qty: 10, unitPrice: 1000, taxPct: 0 }]);
  const gr = await doc(client, user, 'GOODS_RECEIPT', sup, [{ productId: prod.id, description: prod.code, qty: 10, unitPrice: 1000, taxPct: 0 }]);
  await relate(client, user, po.id, gr.id, 'ORDER_TO_RECEIPT');

  // Harga naik 50% dan ada satu produk yang tidak pernah dipesan.
  const inv = await doc(client, user, 'SUPPLIER_INVOICE', sup, [
    { productId: prod.id, description: prod.code, qty: 10, unitPrice: 1500, taxPct: 0 },
    { productId: seludupan.id, description: seludupan.code, qty: 5, unitPrice: 2000, taxPct: 0 }
  ], { purchaseOrderNumber: po.documentNumber });
  await relate(client, user, po.id, inv.id, 'ORDER_TO_INVOICE');

  const match = await evaluate(client, user, inv.id);
  assert.equal(match.result, 'EXCEPTION');
  assert.ok(match.exceptions.some((e) => /harga satuan 1500 melebihi harga PO 1000/.test(e)), `harga tidak diperiksa: ${JSON.stringify(match.exceptions)}`);
  assert.ok(match.exceptions.some((e) => /tidak ada pada/.test(e)), `produk luar PO tidak ditandai: ${JSON.stringify(match.exceptions)}`);
  assert.equal(match.lineVariances.length, 2);
}));

dbTest('P0-O: toleransi kuantitas dihormati — selisih kecil lolos, besar ditolak', async () => rollback(async (client) => {
  const user = await owner(client);
  const sup = await supplier(client);
  const prod = await product(client);
  const tol = (await client.query('SELECT qty_tolerance_pct FROM match_tolerance_config WHERE active ORDER BY effective_from DESC LIMIT 1')).rows[0];
  const pct = Number(tol.qty_tolerance_pct);
  assert.ok(pct > 0, 'butuh toleransi kuantitas aktif');

  const po = await doc(client, user, 'PURCHASE_ORDER', sup, [{ productId: prod.id, description: prod.code, qty: 1000, unitPrice: 1000, taxPct: 0 }]);
  const gr = await doc(client, user, 'GOODS_RECEIPT', sup, [{ productId: prod.id, description: prod.code, qty: 1000, unitPrice: 1000, taxPct: 0 }]);
  await relate(client, user, po.id, gr.id, 'ORDER_TO_RECEIPT');

  const within = 1000 + Math.floor(1000 * pct / 100) - 1;
  const inTol = await doc(client, user, 'SUPPLIER_INVOICE', sup, [{ productId: prod.id, description: prod.code, qty: within, unitPrice: 1000, taxPct: 0 }], { purchaseOrderNumber: po.documentNumber });
  await relate(client, user, po.id, inTol.id, 'ORDER_TO_INVOICE');
  const okMatch = await evaluate(client, user, inTol.id);
  assert.ok(!okMatch.exceptions.some((e) => /melebihi yang diterima/.test(e)), `selisih dalam toleransi tidak boleh jadi exception kuantitas: ${JSON.stringify(okMatch.exceptions)}`);
  await client.query(`UPDATE business_documents SET status='CANCELLED' WHERE id=$1`, [inTol.id]);

  const beyond = 1000 + Math.ceil(1000 * pct / 100) + 50;
  const outTol = await doc(client, user, 'SUPPLIER_INVOICE', sup, [{ productId: prod.id, description: prod.code, qty: beyond, unitPrice: 1000, taxPct: 0 }], { purchaseOrderNumber: po.documentNumber });
  await relate(client, user, po.id, outTol.id, 'ORDER_TO_INVOICE');
  const failMatch = await evaluate(client, user, outTol.id);
  assert.ok(failMatch.exceptions.some((e) => /melebihi yang diterima/.test(e)), 'selisih di luar toleransi wajib exception');
}));

dbTest('P0-O: tagihan parsial dinilai terhadap baris yang ditagih, bukan total PO', async () => rollback(async (client) => {
  const user = await owner(client);
  const sup = await supplier(client);
  const prod = await product(client);

  // PO besar 1.000.000; hanya 10% yang diterima dan ditagih dengan harga benar.
  const po = await doc(client, user, 'PURCHASE_ORDER', sup, [{ productId: prod.id, description: prod.code, qty: 1000, unitPrice: 1000, taxPct: 0 }]);
  const gr = await doc(client, user, 'GOODS_RECEIPT', sup, [{ productId: prod.id, description: prod.code, qty: 100, unitPrice: 1000, taxPct: 0 }]);
  await relate(client, user, po.id, gr.id, 'ORDER_TO_RECEIPT');
  const inv = await doc(client, user, 'SUPPLIER_INVOICE', sup, [{ productId: prod.id, description: prod.code, qty: 100, unitPrice: 1000, taxPct: 0 }], { purchaseOrderNumber: po.documentNumber });
  await relate(client, user, po.id, inv.id, 'ORDER_TO_INVOICE');

  const match = await evaluate(client, user, inv.id);
  assert.equal(match.result, 'MATCHED', `tagihan parsial yang benar tidak boleh exception: ${JSON.stringify(match.exceptions)}`);
  assert.equal(Number(match.amountVariance), 0, 'selisih diukur terhadap nilai baris pada harga PO (100.000), bukan total PO (1.000.000)');
  assert.equal(Number(match.invoiceAmount), 100_000);
  assert.equal(Number(match.poAmount), 1_000_000);
}));

dbTest('P0-O: approve tagihan diblokir saat match EXCEPTION tanpa alasan override', async () => rollback(async (client) => {
  const user = await owner(client);
  const sup = await supplier(client);
  const prod = await product(client);

  const po = await doc(client, user, 'PURCHASE_ORDER', sup, [{ productId: prod.id, description: prod.code, qty: 10, unitPrice: 1000, taxPct: 0 }]);
  const gr = await doc(client, user, 'GOODS_RECEIPT', sup, [{ productId: prod.id, description: prod.code, qty: 2, unitPrice: 1000, taxPct: 0 }]);
  await relate(client, user, po.id, gr.id, 'ORDER_TO_RECEIPT');
  const inv = await doc(client, user, 'SUPPLIER_INVOICE', sup, [{ productId: prod.id, description: prod.code, qty: 10, unitPrice: 1000, taxPct: 0 }], { purchaseOrderNumber: po.documentNumber });
  await relate(client, user, po.id, inv.id, 'ORDER_TO_INVOICE');
  const raw = (await client.query('SELECT * FROM business_documents WHERE id=$1', [inv.id])).rows[0];

  await assert.rejects(() => procurement.assertMatchOk(client, raw, { user }),
    (e) => e.code === 'MATCH_FAILED' && e.extra.exceptions.some((x) => /melebihi yang diterima 2/.test(x)));

  // Dengan alasan override, tagihan lolos dan jejaknya tercatat.
  await procurement.assertMatchOk(client, raw, { user, overrideReason: 'Kekurangan diterima susulan, disetujui manajer pembelian.' });
  const after = (await client.query('SELECT result,override_reason FROM three_way_matches WHERE supplier_invoice_id=$1', [inv.id])).rows[0];
  assert.equal(after.result, 'OVERRIDDEN');
  assert.match(after.override_reason, /manajer pembelian/);
}));
