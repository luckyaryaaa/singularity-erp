'use strict';
// Wave 11 — persediaan perpetual dan pengakuan Harga Pokok Penjualan.
//
// Buku besar TIDAK mencatat pergerakan persediaan sama sekali: pembelian
// langsung menjadi beban, penerimaan/pengeluaran barang tidak menyentuh GL, dan
// HPP tidak pernah diakui. Terbukti terukur sebelum perbaikan: satu penerimaan
// menaikkan persediaan operasional Rp65 juta sementara GL akun 1300 bergerak
// NOL. Neraca menyembunyikan nilai persediaan dan laba kotor tampak 100%.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const runtime = require('../backend/infrastructure/database/repositories/runtime');
const posting = require('../backend/infrastructure/database/repositories/posting');

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
const tag = (p) => `${p}${(seq += 1)}${Date.now().toString(36).toUpperCase().slice(-5)}`;

// Saldo GL sebuah akun, hanya dari jurnal yang benar-benar berlaku.
const balanceOf = async (client, code) => Number((await client.query(
  `SELECT COALESCE(SUM(l.debit-l.credit),0)::float v FROM journal_lines l
   JOIN chart_of_accounts a ON a.id=l.account_id JOIN business_documents d ON d.id=l.journal_document_id
   WHERE a.code=$1 AND d.status NOT IN('DRAFT','CANCELLED','VOID','REJECTED')`, [code])).rows[0].v);
const opsInventory = async (client) => Number((await client.query(
  'SELECT COALESCE(SUM(value_idr),0)::float v FROM inventory_balances')).rows[0].v);

async function product(client, hpp = 100000) {
  return (await client.query(
    `INSERT INTO products(id,code,name,product_type,category,uom,hpp,price,make_or_buy,active)
     VALUES($1,$2,'Baja perpetual','PRODUCT','PRP','KG',$3,$4,'BUY',true) RETURNING id,code,hpp`,
    [randomUUID(), tag('PP'), hpp, hpp * 2])).rows[0];
}
async function postDoc(client, user, type, lines, extra = {}) {
  const doc = await runtime.createDocument(client, { type, user, title: `Uji ${type}`, amount: 0,
    requestId: randomUUID(), payload: { warehouseId: user.branchId, taxPct: 0, lines, ...extra } });
  await client.query(`UPDATE business_documents SET status='COMPLETED' WHERE id=$1`, [doc.id]);
  const fresh = runtime.camel((await client.query('SELECT * FROM business_documents WHERE id=$1', [doc.id])).rows[0]);
  const result = await posting.postDocument(client, fresh, user);
  return { doc, result };
}

dbTest('Wave 11: penerimaan barang mengkapitalisasi persediaan ke buku besar', async () => rollback(async (client) => {
  const user = await owner(client);
  const p = await product(client, 100000);
  const glBefore = await balanceOf(client, '1300');
  const griBefore = await balanceOf(client, '2150');
  const opsBefore = await opsInventory(client);

  await postDoc(client, user, 'GOODS_RECEIPT', [{ productId: p.id, description: p.code, qty: 20, unitPrice: 100000, taxPct: 0 }]);

  const glAfter = await balanceOf(client, '1300');
  const opsAfter = await opsInventory(client);
  // Inti perbaikan: GL bergerak PERSIS mengikuti ledger persediaan.
  assert.equal(Math.round(glAfter - glBefore), Math.round(opsAfter - opsBefore),
    'pergerakan GL wajib sama dengan pergerakan persediaan operasional');
  assert.ok(glAfter > glBefore, 'penerimaan wajib menambah aset persediaan di GL');
  // Lawannya kliring GR/IR, bukan beban — pembelian belum tentu ditagih.
  assert.ok(await balanceOf(client, '2150') < griBefore, 'kliring GR/IR wajib bertambah (saldo kredit)');
}));

dbTest('Wave 11: pengeluaran material memindahkan persediaan ke barang dalam proses', async () => rollback(async (client) => {
  const user = await owner(client);
  const p = await product(client, 100000);
  await postDoc(client, user, 'GOODS_RECEIPT', [{ productId: p.id, description: p.code, qty: 30, unitPrice: 100000, taxPct: 0 }]);

  const invBefore = await balanceOf(client, '1300');
  const wipBefore = await balanceOf(client, '1310');
  await postDoc(client, user, 'MATERIAL_ISSUE', [{ productId: p.id, description: p.code, qty: 10, unitPrice: 100000, taxPct: 0 }]);

  const invAfter = await balanceOf(client, '1300');
  const wipAfter = await balanceOf(client, '1310');
  assert.ok(invAfter < invBefore, 'persediaan wajib berkurang');
  assert.ok(wipAfter > wipBefore, 'barang dalam proses wajib bertambah');
  // Nilai berpindah utuh: tidak ada yang menguap di antara keduanya.
  assert.equal(Math.round(wipAfter - wipBefore), Math.round(invBefore - invAfter),
    'nilai yang keluar dari persediaan wajib sama dengan yang masuk ke WIP');
}));

dbTest('Wave 11: pengiriman mengakui HPP pada periode yang sama dengan pendapatannya', async () => rollback(async (client) => {
  const user = await owner(client);
  const p = await product(client, 100000);
  await postDoc(client, user, 'GOODS_RECEIPT', [{ productId: p.id, description: p.code, qty: 50, unitPrice: 100000, taxPct: 0 }]);

  const cogsBefore = await balanceOf(client, '5100');
  const invBefore = await balanceOf(client, '1300');
  await postDoc(client, user, 'DELIVERY', [{ productId: p.id, description: p.code, qty: 15, unitPrice: 250000, taxPct: 0 }]);

  const cogsAfter = await balanceOf(client, '5100');
  const invAfter = await balanceOf(client, '1300');
  assert.ok(cogsAfter > cogsBefore, 'HPP wajib diakui saat barang dikirim — sebelumnya NOL selamanya');
  assert.equal(Math.round(cogsAfter - cogsBefore), Math.round(invBefore - invAfter),
    'HPP wajib sama dengan nilai persediaan yang keluar');
}));

dbTest('Wave 11: tagihan supplier melunasi kliring GR/IR, bukan membebankan pembelian', async () => rollback(async (client) => {
  const user = await owner(client);
  const sup = (await client.query(
    `INSERT INTO suppliers(id,code,name,category,active) VALUES($1,$2,'Pemasok perpetual','MATERIAL',true) RETURNING id,name`,
    [randomUUID(), tag('SP')])).rows[0];
  const expenseBefore = await balanceOf(client, '6100');
  const griBefore = await balanceOf(client, '2150');
  const apBefore = await balanceOf(client, '2100');

  const inv = await runtime.createDocument(client, { type: 'SUPPLIER_INVOICE', user, title: 'Tagihan perpetual',
    amount: 5_000_000, partyId: sup.id, partyName: sup.name, requestId: randomUUID() });
  await client.query(`UPDATE business_documents SET status='APPROVED' WHERE id=$1`, [inv.id]);
  await posting.postAccounting(client, runtime.camel((await client.query('SELECT * FROM business_documents WHERE id=$1', [inv.id])).rows[0]), user);

  assert.equal(await balanceOf(client, '6100'), expenseBefore,
    'pembelian TIDAK boleh lagi langsung menjadi beban operasional');
  assert.ok(await balanceOf(client, '2150') > griBefore, 'kliring GR/IR wajib berkurang (didebit)');
  assert.ok(await balanceOf(client, '2100') < apBefore, 'utang usaha wajib bertambah (saldo kredit)');
}));

dbTest('Wave 11: nilai jurnal memakai nilai persediaan, bukan nilai header berpajak', async () => rollback(async (client) => {
  const user = await owner(client);
  const p = await product(client, 100000);
  const glBefore = await balanceOf(client, '1300');
  // Header memuat PPN 11%; jurnal persediaan hanya boleh mengambil nilai barang.
  const { doc } = await postDoc(client, user, 'GOODS_RECEIPT',
    [{ productId: p.id, description: p.code, qty: 10, unitPrice: 100000, taxPct: 11 }], { taxPct: 11 });
  const header = Number((await client.query('SELECT amount::float a FROM business_documents WHERE id=$1', [doc.id])).rows[0].a);
  const posted = Math.round((await balanceOf(client, '1300')) - glBefore);
  const movement = await posting.movementValue(client, doc.id);

  assert.ok(header > movement, 'nilai header memang lebih besar karena memuat pajak');
  assert.equal(posted, Math.round(movement), 'jurnal wajib memakai nilai persediaan, bukan nilai header');
}));

dbTest('Wave 11: posting tidak pernah ganda walau diulang', async () => rollback(async (client) => {
  const user = await owner(client);
  const p = await product(client, 100000);
  const { doc } = await postDoc(client, user, 'GOODS_RECEIPT', [{ productId: p.id, description: p.code, qty: 10, unitPrice: 100000, taxPct: 0 }]);
  const after = await balanceOf(client, '1300');

  const fresh = runtime.camel((await client.query('SELECT * FROM business_documents WHERE id=$1', [doc.id])).rows[0]);
  const replay = await posting.postPerpetualInventory(client, fresh, user);
  assert.equal(replay.replay, true, 'posting ulang wajib dikenali sebagai replay');
  assert.equal(await balanceOf(client, '1300'), after, 'saldo tidak boleh berubah karena replay');
}));

dbTest('Wave 11: seluruh jurnal persediaan seimbang', async () => rollback(async (client) => {
  const user = await owner(client);
  const p = await product(client, 100000);
  await postDoc(client, user, 'GOODS_RECEIPT', [{ productId: p.id, description: p.code, qty: 40, unitPrice: 100000, taxPct: 0 }]);
  await postDoc(client, user, 'MATERIAL_ISSUE', [{ productId: p.id, description: p.code, qty: 10, unitPrice: 100000, taxPct: 0 }]);
  await postDoc(client, user, 'DELIVERY', [{ productId: p.id, description: p.code, qty: 5, unitPrice: 250000, taxPct: 0 }]);

  const unbalanced = (await client.query(
    `SELECT journal_document_id,SUM(debit)::float d,SUM(credit)::float c FROM journal_lines
     GROUP BY journal_document_id HAVING ABS(SUM(debit)-SUM(credit))>0.01`)).rows;
  assert.deepEqual(unbalanced, [], 'tidak boleh ada jurnal yang tidak seimbang');
}));

dbTest('Wave 11: mengirim barang MENGURANGI stok — regresi cacat paling berat', async () => rollback(async (client) => {
  // Sebelum perbaikan: DELIVERY tidak ada di daftar tipe yang menggerakkan
  // persediaan. Mengirim 20 unit dari saldo 50 menyisakan 50 dan menghasilkan
  // NOL baris pergerakan. Stok tidak pernah habis walau barang terus dikirim.
  const user = await owner(client);
  const p = await product(client, 100000);
  await postDoc(client, user, 'GOODS_RECEIPT', [{ productId: p.id, description: p.code, qty: 50, unitPrice: 100000, taxPct: 0 }]);
  const qtyOf = async () => Number((await client.query(
    'SELECT qty_on_hand::float q FROM inventory_balances WHERE product_id=$1 AND warehouse_id=$2', [p.id, user.branchId])).rows[0].q);
  assert.equal(await qtyOf(), 50);

  const { doc } = await postDoc(client, user, 'DELIVERY', [{ productId: p.id, description: p.code, qty: 20, unitPrice: 250000, taxPct: 0 }]);
  assert.equal(await qtyOf(), 30, 'stok WAJIB berkurang setelah barang dikirim');

  const movements = Number((await client.query(
    "SELECT count(*)::int n FROM inventory_movements WHERE document_id=$1", [doc.id])).rows[0].n);
  assert.ok(movements > 0, 'pengiriman wajib meninggalkan jejak pergerakan persediaan');

  // Lot ikut terkonsumsi FIFO, sama seperti pengeluaran produksi — bukan jalur
  // kedua yang diam-diam berbeda.
  const lotMoves = Number((await client.query(
    "SELECT count(*)::int n FROM stock_lot_movements WHERE document_id=$1 AND movement_type='ISSUE'", [doc.id])).rows[0].n);
  assert.ok(lotMoves > 0, 'pengiriman wajib mengonsumsi lot secara FIFO');
}));

test('Wave 11: kode akun tidak di-hardcode, melainkan lewat peran akun', () => {
  const fs = require('node:fs');
  const up = fs.readFileSync('data/migrations/062_perpetual_inventory_cogs.sql', 'utf8');
  for (const role of ['WIP', 'FINISHED_GOODS', 'GRIR_CLEARING', 'COGS']) {
    assert.ok(up.includes(`'${role}'`), `peran akun ${role} wajib terdaftar`);
  }
  assert.match(up, /INSERT INTO account_roles/, 'akun wajib dipetakan lewat peran, bukan hardcode di kode');
  // Profil lama dinonaktifkan, bukan dihapus — dokumen lama tetap tertelusur.
  assert.match(up, /UPDATE posting_profiles SET active=false/, 'profil lama wajib dinonaktifkan, bukan dihapus');
  const down = fs.readFileSync('data/migrations/062_perpetual_inventory_cogs.down.sql', 'utf8');
  assert.ok(!/DELETE FROM journal_lines/.test(down), 'rollback tidak boleh menghapus jurnal yang sudah diposting');
});
