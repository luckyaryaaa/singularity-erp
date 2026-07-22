'use strict';
// P0-L / P0-M — retur kumulatif, gerbang QC final, dan urutan operasi.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const runtime = require('../backend/infrastructure/database/repositories/runtime');
const production = require('../backend/infrastructure/database/repositories/production');
const o2c = require('../backend/infrastructure/database/repositories/sales-o2c');

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
async function product(client, prefix) {
  return (await client.query(
    `INSERT INTO products(id,code,name,product_type,category,uom,hpp,price,make_or_buy,warranty_months,active)
     VALUES($1,$2,'Produk P0','PRODUCT','TEST','PCS',1000,2000,'BUY',24,true) RETURNING id,code,uom`,
    [randomUUID(), `${prefix}${Date.now().toString(36).toUpperCase().slice(-8)}`])).rows[0];
}

dbTest('P0-L: retur kumulatif tidak boleh melebihi jumlah terkirim', async () => rollback(async (client) => {
  const user = await owner(client);
  const prod = await product(client, 'RMA');
  const delivery = await runtime.createDocument(client, {
    type: 'DELIVERY', user, title: 'DO 10 pcs', amount: 20_000, requestId: randomUUID(),
    payload: { lines: [{ productId: prod.id, description: prod.code, qty: 10, unitPrice: 2000 }] }
  });
  await client.query(`UPDATE business_documents SET status='COMPLETED' WHERE id=$1`, [delivery.id]);

  // Retur pertama 6 dari 10 — boleh.
  await o2c.createRma(client, { user, sourceDocumentId: delivery.id, requestId: randomUUID(),
    lines: [{ productId: prod.id, qty: 6, unitPrice: 2000, disposition: 'RESTOCK' }] });

  // Retur kedua 5 → kumulatif 11 > 10 terkirim: WAJIB ditolak.
  await assert.rejects(
    () => o2c.createRma(client, { user, sourceDocumentId: delivery.id, requestId: randomUUID(),
      lines: [{ productId: prod.id, qty: 5, unitPrice: 2000, disposition: 'RESTOCK' }] }),
    (error) => error.code === 'VALIDATION_ERROR' && error.extra.availableQty === 4 && error.extra.previouslyReturned === 6,
    'retur melampaui sisa wajib ditolak'
  );

  // Sisa persis 4 → boleh.
  const ok = await o2c.createRma(client, { user, sourceDocumentId: delivery.id, requestId: randomUUID(),
    lines: [{ productId: prod.id, qty: 4, unitPrice: 2000, disposition: 'RESTOCK' }] });
  assert.match(ok.documentNumber, /^RMA-/);
}));

dbTest('P0-L: produk di luar dokumen sumber dan harga di atas sumber ditolak', async () => rollback(async (client) => {
  const user = await owner(client);
  const sold = await product(client, 'RMS');
  const other = await product(client, 'RMO');
  const delivery = await runtime.createDocument(client, {
    type: 'DELIVERY', user, title: 'DO', amount: 4000, requestId: randomUUID(),
    payload: { lines: [{ productId: sold.id, description: sold.code, qty: 2, unitPrice: 2000 }] }
  });
  await client.query(`UPDATE business_documents SET status='COMPLETED' WHERE id=$1`, [delivery.id]);

  await assert.rejects(
    () => o2c.createRma(client, { user, sourceDocumentId: delivery.id, requestId: randomUUID(),
      lines: [{ productId: other.id, qty: 1, unitPrice: 2000, disposition: 'RESTOCK' }] }),
    (error) => error.code === 'VALIDATION_ERROR' && /tidak terdapat pada/.test(String(error.detail || error.message)),
    'produk yang tidak pernah dikirim tidak boleh diretur'
  );

  await assert.rejects(
    () => o2c.createRma(client, { user, sourceDocumentId: delivery.id, requestId: randomUUID(),
      lines: [{ productId: sold.id, qty: 1, unitPrice: 9_000_000, disposition: 'RESTOCK' }] }),
    (error) => error.code === 'VALIDATION_ERROR' && error.extra.sourceUnitPrice === 2000,
    'nilai retur tidak boleh melebihi harga dokumen sumber'
  );
}));

dbTest('P0-M: operasi produksi wajib berurutan', async () => rollback(async (client) => {
  const user = await owner(client);
  const wo = await runtime.createDocument(client, { type: 'WORK_ORDER', user, title: 'WO urutan', amount: 0, requestId: randomUUID() });
  await client.query(`UPDATE business_documents SET status='APPROVED' WHERE id=$1`, [wo.id]);
  const wc = (await client.query('SELECT id,hourly_rate FROM work_centers WHERE active LIMIT 1')).rows[0];
  assert.ok(wc, 'seed work center wajib tersedia');
  const ops = [];
  for (const [no, name] of [[1, 'Cutting'], [2, 'Welding'], [3, 'Finishing']]) {
    ops.push((await client.query(
      `INSERT INTO work_order_operations(id,work_order_id,op_no,name,work_center_id,hourly_rate_snapshot,planned_hours,status)
       VALUES($1,$2,$3,$4,$5,$6,1,'PENDING') RETURNING id,op_no`,
      [randomUUID(), wo.id, no, name, wc.id, wc.hourly_rate])).rows[0]);
  }
  // Melompat ke operasi 3 sebelum 1 & 2 selesai wajib ditolak.
  await assert.rejects(
    () => production.completeOperation(client, { operationId: ops[2].id, user }),
    (error) => error.code === 'STATUS_INVALID' && error.extra.blockingOperation === 1,
    'operasi tidak boleh dilompati'
  );
  // Berurutan: 1 → 2 → 3 berhasil.
  assert.equal((await production.completeOperation(client, { operationId: ops[0].id, user })).status, 'DONE');
  await assert.rejects(() => production.completeOperation(client, { operationId: ops[2].id, user }),
    (error) => error.extra.blockingOperation === 2, 'operasi 2 masih menghalangi');
  assert.equal((await production.completeOperation(client, { operationId: ops[1].id, user })).status, 'DONE');
  assert.equal((await production.completeOperation(client, { operationId: ops[2].id, user })).status, 'DONE');
}));

dbTest('P0-M: NCR gagal yang masih terbuka memblokir penyelesaian Work Order', async () => rollback(async (client) => {
  const user = await owner(client);
  const wo = await runtime.createDocument(client, { type: 'WORK_ORDER', user, title: 'WO NCR', amount: 0, requestId: randomUUID() });
  const qc = await runtime.createDocument(client, { type: 'QC_INSPECTION', user, title: 'QC', amount: 0, requestId: randomUUID() });
  // QC final PASS + satu NCR gagal terbuka.
  await client.query(`INSERT INTO qc_inspections(qc_document_id,subject_document_id,inspection_type,sampled_qty,passed_qty,failed_qty,result,inspected_by)
    VALUES($1,$2,'FINAL',5,5,0,'PASS',$3)`, [qc.id, wo.id, user.id]);
  const qc2 = await runtime.createDocument(client, { type: 'QC_INSPECTION', user, title: 'QC NCR', amount: 0, requestId: randomUUID() });
  await client.query(`INSERT INTO qc_inspections(qc_document_id,subject_document_id,inspection_type,sampled_qty,passed_qty,failed_qty,result,ncr_number,inspected_by)
    VALUES($1,$2,'IN_PROCESS',5,3,2,'FAIL',$3,$4)`, [qc2.id, wo.id, `NCR-P0-${Date.now()}`, user.id]);

  await assert.rejects(() => production.assertReadyToComplete(client, wo.id),
    (error) => error.code === 'STATUS_INVALID',
    'WO dengan NCR gagal terbuka tidak boleh diselesaikan');
}));
