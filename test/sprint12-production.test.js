'use strict';
// Sprint 12 (R019) — production, quality, and MRP integration proof.
// Every scenario is isolated by ROLLBACK so the development database remains
// clean while exercising real PostgreSQL constraints, posting, FIFO, and ACLs.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');

const runtime = require('../backend/infrastructure/database/repositories/runtime');
const posting = require('../backend/infrastructure/database/repositories/posting');
const production = require('../backend/infrastructure/database/repositories/production');
const inventory = require('../backend/infrastructure/database/repositories/inventory');
const { hasPermission } = require('../backend/core/permissions');

const dbTest = process.env.DATABASE_URL ? test : test.skip;

async function withRollback(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try { await client.query('BEGIN'); await fn(client); }
  finally { await client.query('ROLLBACK').catch(() => {}); await client.end(); }
}

const owner = async (client) => runtime.camel((await client.query(`SELECT id,username,display_name "displayName",role,branch_id "branchId",branch_scope "branchScope" FROM app_users WHERE role='owner' LIMIT 1`)).rows[0]);
const code = (prefix) => `${prefix}${Date.now().toString(36).slice(-7)}${Math.random().toString(36).slice(2, 5)}`.slice(0, 20).toUpperCase();

async function product(client, prefix, hpp = 100) {
  return (await client.query(`INSERT INTO products(code,name,uom,hpp,price) VALUES($1,$2,'PCS',$3,$4) RETURNING *`, [code(prefix), `${prefix} Sprint 12`, hpp, hpp * 1.5])).rows[0];
}

async function completedInventoryDocument(client, user, type, payload) {
  const doc = await runtime.createDocument(client, { type, user, title: `${type} Sprint 12`, amount: 0, requestId: randomUUID(), payload });
  await client.query(`UPDATE business_documents SET status='COMPLETED' WHERE id=$1`, [doc.id]);
  const stored = runtime.camel((await client.query('SELECT * FROM business_documents WHERE id=$1', [doc.id])).rows[0]);
  await posting.postInventory(client, stored, user);
  return stored;
}

dbTest('production: WO → reservasi → FIFO issue → costing → finished goods', async () => {
  await withRollback(async (client) => {
    const user = await owner(client);
    const component = await product(client, 'P12C', 125000);
    const finished = await product(client, 'P12F', 500000);
    const wc = (await client.query(`SELECT wc.id FROM work_centers wc JOIN plants p ON p.id=wc.plant_id WHERE wc.active AND p.branch_id=$1 LIMIT 1`, [user.branchId])).rows[0];
    assert.ok(wc, 'work center aktif untuk cabang owner wajib tersedia');

    const bomId = randomUUID();
    await client.query(`INSERT INTO bom_headers(id,product_id,revision_no,bom_type,status,effective_date,created_by) VALUES($1,$2,1,'MANUFACTURING','EFFECTIVE',current_date,$3)`, [bomId, finished.id, user.id]);
    await client.query(`INSERT INTO bom_lines(id,bom_id,line_no,component_product_id,qty,uom) VALUES($1,$2,1,$3,3,'PCS')`, [randomUUID(), bomId, component.id]);
    await completedInventoryDocument(client, user, 'GOODS_RECEIPT', { warehouseId: user.branchId, lines: [{ productId: component.id, description: 'Raw material', qty: 12, unitPrice: 125000, heatNumber: 'P12-RAW' }] });

    const wo = await runtime.createDocument(client, { type: 'WORK_ORDER', user, title: 'WO integration Sprint 12', amount: 1000000, requestId: randomUUID(), payload: { productId: finished.id, qty: 2 } });
    await client.query(`UPDATE business_documents SET status='APPROVED' WHERE id=$1`, [wo.id]);
    await assert.rejects(() => production.planWorkOrder(client, { docId: wo.id, operations: [{ workCenterId: wc.id, name: 'Fabrication', plannedHours: 2 }], user, requestId: randomUUID() }), (error) => error.code === 'VALIDATION_ERROR');

    const planned = await production.planWorkOrder(client, { docId: wo.id, warehouseId: user.branchId, operations: [{ workCenterId: wc.id, name: 'Fabrication', plannedHours: 2 }], user, requestId: randomUUID() });
    assert.equal(planned.materials, 1);
    const reserved = (await client.query('SELECT planned_qty,reserved_qty FROM work_order_materials WHERE work_order_id=$1', [wo.id])).rows[0];
    assert.equal(Number(reserved.planned_qty), 6);
    assert.equal(Number(reserved.reserved_qty), 6);

    const issue = await production.createIssueFromPlan(client, { docId: wo.id, user, requestId: randomUUID() });
    const issueReplay = await production.createIssueFromPlan(client, { docId: wo.id, user, requestId: randomUUID() });
    assert.equal(issueReplay.id, issue.id);
    assert.equal(issueReplay.idempotentReplay, true);
    await client.query(`UPDATE business_documents SET status='COMPLETED' WHERE id=$1`, [issue.id]);
    const issueDoc = runtime.camel((await client.query('SELECT * FROM business_documents WHERE id=$1', [issue.id])).rows[0]);
    await posting.postInventory(client, issueDoc, user);
    const consumed = (await client.query('SELECT issued_qty,reserved_qty FROM work_order_materials WHERE work_order_id=$1', [wo.id])).rows[0];
    assert.equal(Number(consumed.issued_qty), 6);
    assert.equal(Number(consumed.reserved_qty), 0);

    await client.query(`UPDATE business_documents SET status='IN_PROCESS' WHERE id=$1`, [wo.id]);
    const operation = (await client.query('SELECT id FROM work_order_operations WHERE work_order_id=$1', [wo.id])).rows[0];
    await production.logTime(client, { operationId: operation.id, hours: 2, note: 'Actual production', user });
    const corrected = await production.logTime(client, { operationId: operation.id, hours: -0.5, note: 'Koreksi clock-out', user });
    assert.equal(corrected.totalHours, 1.5);
    await production.completeOperation(client, { operationId: operation.id, user });

    const result = await production.finishWorkOrder(client, { docId: wo.id, user, requestId: randomUUID() });
    assert.ok(result.finishedReceiptId);
    assert.equal(result.costing.materialCost, 750000);
    await assert.rejects(() => production.assertReadyToComplete(client, wo.id), (error) => error.code === 'STATUS_INVALID');
    await client.query(`UPDATE business_documents SET status='COMPLETED' WHERE id=$1`, [result.finishedReceiptId]);
    const receipt = runtime.camel((await client.query('SELECT * FROM business_documents WHERE id=$1', [result.finishedReceiptId])).rows[0]);
    await posting.postInventory(client, receipt, user);
    assert.equal(await production.assertReadyToComplete(client, wo.id), true);
    const fgLot = (await client.query('SELECT qty_on_hand FROM stock_lots WHERE source_document_id=$1', [result.finishedReceiptId])).rows[0];
    assert.equal(Number(fgLot.qty_on_hand), 2);
  });
});

dbTest('quality: failed inspection issues NCR and quarantines the lot', async () => {
  await withRollback(async (client) => {
    const user = await owner(client), inspected = await product(client, 'P12Q', 80000);
    const gr = await completedInventoryDocument(client, user, 'GOODS_RECEIPT', { warehouseId: user.branchId, lines: [{ productId: inspected.id, description: 'QC lot', qty: 5, unitPrice: 80000, heatNumber: 'P12-QC' }] });
    const lot = (await client.query('SELECT id FROM stock_lots WHERE source_document_id=$1', [gr.id])).rows[0];
    const otherBranch = (await client.query('SELECT id FROM branches WHERE active AND id<>$1 LIMIT 1', [user.branchId])).rows[0];
    if (otherBranch) {
      const scoped = { ...user, role: 'production', branchScope: null, branchId: otherBranch.id };
      await assert.rejects(() => inventory.lotDetail(client, lot.id, scoped), (error) => error.code === 'PERMISSION_DENIED');
      await assert.rejects(() => inventory.setLotStatus(client, { lotId: lot.id, action: 'quarantine', reason: 'cross branch', user: scoped, requestId: randomUUID() }), (error) => error.code === 'PERMISSION_DENIED');
    }
    const qc = await runtime.createDocument(client, { type: 'QC_INSPECTION', user, title: 'Incoming QC Sprint 12', amount: 0, requestId: randomUUID(), payload: {} });
    const result = await production.recordInspection(client, { qcDocId: qc.id, inspection: { inspectionType: 'INCOMING', lotId: lot.id, subjectDocumentId: gr.id, sampledQty: 5, passedQty: 4, failedQty: 1, defectCode: 'DIM-OUT', rootCause: 'Dimensi di luar toleransi', correctiveAction: 'Return supplier' }, user, requestId: randomUUID() });
    assert.match(result.ncrNumber, /^NCR-\d{4}-\d{4}$/);
    assert.equal(result.quarantined, true);
    assert.equal((await client.query('SELECT status FROM stock_lots WHERE id=$1', [lot.id])).rows[0].status, 'QUARANTINE');
    const listed = await production.listInspections(client, qc.id, user);
    assert.equal(listed.items.length, 1);
  });
});

dbTest('MRP: safety stock is netted once and suggestion converts idempotently to PR', async () => {
  await withRollback(async (client) => {
    const user = await owner(client), material = await product(client, 'P12M', 50000);
    await client.query(`INSERT INTO inventory_balances(id,product_id,warehouse_id,qty_on_hand,qty_reserved,min_qty,value_idr) VALUES($1,$2,$3,2,0,10,100000)`, [randomUUID(), material.id, user.branchId]);
    const run = await production.runMrp(client, { user, requestId: randomUUID() });
    assert.ok(run.suggestions >= 1);
    const suggestion = (await client.query('SELECT * FROM mrp_suggestions WHERE run_id=$1 AND product_id=$2', [run.runId, material.id])).rows[0];
    assert.equal(Number(suggestion.demand_qty), 10);
    assert.equal(Number(suggestion.suggested_qty), 8);
    const converted = await production.convertMrp(client, { suggestionId: suggestion.id, user, requestId: randomUUID() });
    const replay = await production.convertMrp(client, { suggestionId: suggestion.id, user, requestId: randomUUID() });
    assert.match(converted.documentNumber, /^PR-/);
    assert.equal(replay.replay, true);
    assert.equal(replay.documentNumber, converted.documentNumber);
  });
});

dbTest('security: Sprint 12 tables enforce least privilege and role grants', async () => {
  await withRollback(async (client) => {
    const acl = (await client.query(`SELECT
      has_table_privilege(current_user,'work_order_operations','DELETE') op_delete,
      has_table_privilege(current_user,'work_order_materials','DELETE') material_delete,
      has_table_privilege(current_user,'mrp_suggestions','DELETE') mrp_delete,
      has_table_privilege(current_user,'qc_inspections','UPDATE') qc_update,
      has_table_privilege(current_user,'work_order_time_logs','UPDATE') time_update`)).rows[0];
    assert.deepEqual(acl, { op_delete: false, material_delete: false, mrp_delete: false, qc_update: false, time_update: false });
    assert.equal(hasPermission({ role: 'production' }, 'production.post'), true);
    assert.equal(hasPermission({ role: 'production' }, 'quality.create'), true);
    assert.equal(hasPermission({ role: 'employee' }, 'production.view'), false);
  });
});
