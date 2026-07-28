'use strict';
// Wave 12 — database defense-in-depth untuk execution engine 057–061.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const runtime = require('../backend/infrastructure/database/repositories/runtime');
const contracts = require('../backend/infrastructure/database/repositories/purchase-contracts');
const businessDate = require('../backend/core/business-date');

const dbTest = process.env.DATABASE_URL ? test : test.skip;
const RLS_TABLES = [
  'stock_reservations', 'purchase_contract_lines', 'purchase_contract_releases',
  'work_order_operations', 'work_order_materials', 'work_order_time_logs',
  'qc_inspections', 'capa_cases', 'measuring_instruments', 'instrument_calibrations'
];

async function rollback(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.is_system','on',true)");
    await fn(client);
  } finally {
    await client.query('ROLLBACK').catch(() => {});
    await client.end();
  }
}
const tag = (prefix) => `${prefix}${Date.now().toString(36).slice(-6)}${randomUUID().slice(0, 4)}`
  .replace(/[^A-Z0-9-]/gi, '').toUpperCase().slice(0, 20);

dbTest('Wave 12: seluruh tabel execution memakai RLS dan view memakai security_invoker', async () => rollback(async (client) => {
  const rows = (await client.query(
    `SELECT c.relname,c.relrowsecurity,
       (SELECT count(*)::int FROM pg_policy p WHERE p.polrelid=c.oid) policies
     FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relname=ANY($1)`, [RLS_TABLES])).rows;
  assert.equal(rows.length, RLS_TABLES.length);
  for (const row of rows) {
    assert.equal(row.relrowsecurity, true, `${row.relname} belum RLS`);
    assert.ok(row.policies >= 1, `${row.relname} tanpa policy`);
  }
  const runtimePosture = (await client.query(
    `SELECT bool_or(pg_get_userbyid(c.relowner)=current_user) owns,
       (SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user) bypass
     FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relname=ANY($1)`, [RLS_TABLES])).rows[0];
  assert.equal(runtimePosture.owns, false);
  assert.equal(runtimePosture.bypass, false);

  const views = (await client.query(
    `SELECT relname,COALESCE(reloptions,'{}') options FROM pg_class
     WHERE relname=ANY($1)`, [[
      'stock_reservation_balance', 'work_center_daily_load', 'work_order_wip'
    ]])).rows;
  assert.equal(views.length, 3);
  for (const view of views) {
    assert.ok(view.options.includes('security_invoker=true'),
      `${view.relname} wajib security_invoker`);
  }
}));

dbTest('Wave 12: RLS child dan direct table gagal tertutup lintas cabang', async () => rollback(async (client) => {
  const branches = (await client.query(
    `SELECT id,legal_entity_id FROM branches
     WHERE active AND legal_entity_id IS NOT NULL ORDER BY code LIMIT 2`)).rows;
  assert.equal(branches.length, 2, 'butuh dua cabang ber-legal entity');
  const [home, other] = branches;
  const actor = (await client.query('SELECT id FROM app_users WHERE active ORDER BY created_at LIMIT 1')).rows[0];
  const supplier = (await client.query(
    `INSERT INTO suppliers(id,code,name,category,active,onboarding_status)
     VALUES($1,$2,'RLS Supplier','MATERIAL',true,'APPROVED') RETURNING id`,
    [randomUUID(), tag('RLS-SUP')])).rows[0];
  const product = (await client.query(
    `INSERT INTO products(id,code,name,product_type,category,uom,hpp,price,make_or_buy,active)
     VALUES($1,$2,'RLS Product','PRODUCT','RLS','PCS',1,1,'BUY',true) RETURNING id`,
    [randomUUID(), tag('RLS-P')])).rows[0];
  const mkDoc = async (branch, number) => (await client.query(
    `INSERT INTO business_documents(id,document_number,document_type,branch_id,
       legal_entity_id,status,version,amount,payload,title,exchange_rate_date,
       functional_amount,reporting_amount,created_by,updated_by)
     VALUES($1,$2,'SALES_ORDER',$3,$4,'DRAFT',1,1,'{}','RLS execution',
       current_date,1,1,$5,$5) RETURNING id`,
    [randomUUID(), number, branch.id, branch.legal_entity_id, actor.id])).rows[0];
  const homeDoc = await mkDoc(home, tag('RLS-H'));
  const otherDoc = await mkDoc(other, tag('RLS-O'));
  const reserve = async (branch, doc) => (await client.query(
    `INSERT INTO stock_reservations(id,product_id,warehouse_id,document_id,qty,created_by)
     VALUES($1,$2,$3,$4,1,$5) RETURNING id`,
    [randomUUID(), product.id, branch.id, doc.id, actor.id])).rows[0].id;
  const mineReservation = await reserve(home, homeDoc);
  const otherReservation = await reserve(other, otherDoc);
  const contract = async (branch, number) => (await client.query(
    `INSERT INTO purchase_contracts(id,contract_number,legal_entity_id,branch_id,
       supplier_id,title,valid_from,valid_to,ceiling_amount,created_by)
     VALUES($1,$2,$3,$4,$5,'RLS Contract',current_date,current_date+30,100,$6)
     RETURNING id`,
    [randomUUID(), number, branch.legal_entity_id, branch.id, supplier.id, actor.id])).rows[0];
  const homeContract = await contract(home, tag('PC-H'));
  const otherContract = await contract(other, tag('PC-O'));
  const line = async (contractId) => (await client.query(
    `INSERT INTO purchase_contract_lines(id,contract_id,line_no,description,ceiling_amount)
     VALUES($1,$2,1,'RLS line',100) RETURNING id`,
    [randomUUID(), contractId])).rows[0].id;
  const mineLine = await line(homeContract.id);
  const otherLine = await line(otherContract.id);
  const capa = async (branch, number) => (await client.query(
    `INSERT INTO capa_cases(id,case_number,branch_id,title,description,raised_by)
     VALUES($1,$2,$3,'RLS CAPA','Cross branch isolation evidence',$4) RETURNING id`,
    [randomUUID(), number, branch.id, actor.id])).rows[0].id;
  const mineCapa = await capa(home, tag('CAPA-H'));
  const otherCapa = await capa(other, tag('CAPA-O'));

  await client.query("SELECT set_config('app.is_system','off',true)");
  await client.query("SELECT set_config('app.cross_branch','off',true)");
  await client.query("SELECT set_config('app.branch_id',$1,true)", [home.id]);
  const visibleReservations = (await client.query(
    'SELECT id FROM stock_reservations WHERE id=ANY($1::uuid[])',
    [[mineReservation, otherReservation]])).rows.map((row) => row.id);
  assert.deepEqual(visibleReservations, [mineReservation]);
  const visibleLines = (await client.query(
    'SELECT id FROM purchase_contract_lines WHERE id=ANY($1::uuid[])',
    [[mineLine, otherLine]])).rows.map((row) => row.id);
  assert.deepEqual(visibleLines, [mineLine]);
  const visibleCapa = (await client.query(
    'SELECT id FROM capa_cases WHERE id=ANY($1::uuid[])',
    [[mineCapa, otherCapa]])).rows.map((row) => row.id);
  assert.deepEqual(visibleCapa, [mineCapa]);

  await client.query("SELECT set_config('app.branch_id','',true)");
  assert.equal((await client.query(
    'SELECT count(*)::int n FROM stock_reservations WHERE id=ANY($1::uuid[])',
    [[mineReservation, otherReservation]])).rows[0].n, 0,
  'tanpa konteks cabang tidak ada reservasi yang terlihat');
}));

dbTest('Wave 12: purchase release menolak stale version dan replay business key', async () => rollback(async (client) => {
  const branch = (await client.query(
    `SELECT id FROM branches WHERE active AND legal_entity_id IS NOT NULL ORDER BY code LIMIT 1`)).rows[0];
  const users = (await client.query(
    'SELECT id FROM app_users WHERE active ORDER BY created_at LIMIT 2')).rows;
  assert.equal(users.length, 2);
  const maker = { id: users[0].id, role: 'procurement', branchId: branch.id, branchScope: '*', displayName: 'Maker' };
  const checker = { id: users[1].id, role: 'owner', branchId: branch.id, branchScope: '*', displayName: 'Checker' };
  const supplier = (await client.query(
    `INSERT INTO suppliers(id,code,name,category,active,onboarding_status)
     VALUES($1,$2,'Replay Supplier','MATERIAL',true,'APPROVED') RETURNING id,name`,
    [randomUUID(), tag('SUP')])).rows[0];
  const product = (await client.query(
    `INSERT INTO products(id,code,name,product_type,category,uom,hpp,price,make_or_buy,active)
     VALUES($1,$2,'Replay Product','PRODUCT','RLS','PCS',10,10,'BUY',true) RETURNING id,code`,
    [randomUUID(), tag('PRD')])).rows[0];
  const draft = await contracts.createContract(client, {
    supplierId: supplier.id, title: 'Replay guarded contract',
    validFrom: businessDate.today(), validTo: businessDate.addDays(businessDate.today(), 30),
    ceilingAmount: 1000,
    lines: [{ productId: product.id, description: product.code, committedQty: 100,
      ceilingAmount: 1000, uom: 'PCS', unitPrice: 10 }]
  }, maker, randomUUID());
  const active = await contracts.decideContract(client, {
    id: draft.id, approve: true, reason: 'Checker berbeda menyetujui kontrak.',
    expectedVersion: draft.version, user: checker, requestId: randomUUID()
  });
  assert.equal(active.version, 2);
  const order = await runtime.createDocument(client, {
    type: 'PURCHASE_ORDER', user: maker, title: 'Replay guarded PO', amount: 100,
    partyId: supplier.id, partyName: supplier.name,
    payload: { taxPct: 0, lines: [{ productId: product.id, description: product.code,
      qty: 10, unitPrice: 10, taxPct: 0 }] }
  });
  const detail = await contracts.contractDetail(client, draft.id, maker);
  await contracts.releaseContract(client, {
    id: draft.id, purchaseOrderId: order.id, contractLineId: detail.lines[0].id,
    releasedQty: 10, releasedAmount: 100, expectedVersion: detail.version,
    user: maker, requestId: randomUUID()
  });
  const after = await contracts.contractDetail(client, draft.id, maker);
  assert.equal(after.version, 3);
  await assert.rejects(() => contracts.releaseContract(client, {
    id: draft.id, purchaseOrderId: order.id, contractLineId: detail.lines[0].id,
    releasedQty: 10, releasedAmount: 100, expectedVersion: after.version,
    user: maker, requestId: randomUUID()
  }), (error) => error.code === 'DUPLICATE_REQUEST');

  const otherOrder = await runtime.createDocument(client, {
    type: 'PURCHASE_ORDER', user: maker, title: 'Stale version PO', amount: 50,
    partyId: supplier.id, partyName: supplier.name,
    payload: { taxPct: 0, lines: [{ productId: product.id, description: product.code,
      qty: 5, unitPrice: 10, taxPct: 0 }] }
  });
  await assert.rejects(() => contracts.releaseContract(client, {
    id: draft.id, purchaseOrderId: otherOrder.id, contractLineId: detail.lines[0].id,
    releasedQty: 5, releasedAmount: 50, expectedVersion: 2,
    user: maker, requestId: randomUUID()
  }), (error) => error.code === 'DOCUMENT_CONFLICT' && error.extra.currentVersion === 3);
}));

test('Wave 12: migration memiliki rollback dan replay NULL-safe', () => {
  const fs = require('node:fs');
  const up = fs.readFileSync('data/migrations/064_execution_rls_concurrency.sql', 'utf8');
  const down = fs.readFileSync('data/migrations/064_execution_rls_concurrency.down.sql', 'utf8');
  assert.match(up, /security_invoker\s*=\s*true/);
  assert.match(up, /COALESCE\(contract_line_id/);
  assert.match(up, /ENABLE ROW LEVEL SECURITY/g);
  assert.match(down, /DROP INDEX IF EXISTS ux_purchase_contract_release_business_key/);
});
