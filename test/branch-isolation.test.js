'use strict';

require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');

const dataScope = require('../backend/core/data-scope');
const runtime = require('../backend/infrastructure/database/repositories/runtime');
const assets = require('../backend/infrastructure/database/repositories/fixed-assets');
const financeReports = require('../backend/infrastructure/database/repositories/finance-reports');
const businessOps = require('../backend/infrastructure/database/repositories/business-operations');
const hr = require('../backend/infrastructure/database/repositories/hr-operations');
const procurement = require('../backend/infrastructure/database/repositories/procurement');
const sales = require('../backend/infrastructure/database/repositories/sales-o2c');

const dbTest = process.env.DATABASE_URL ? test : test.skip;

async function withRollback(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN'); await client.query("SELECT set_config('app.is_system','on',true),set_config('app.is_platform','on',true),set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true)");
    const owner = runtime.camel((await client.query(`SELECT id,username,display_name "displayName",role,branch_id "branchId",branch_scope "branchScope" FROM app_users WHERE role='owner' AND active LIMIT 1`)).rows[0]);
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
    const branchA = (await client.query(`INSERT INTO branches(id,code,name) VALUES($1,$2,$3) RETURNING id`, [randomUUID(), `BA-${stamp}`, 'Branch Isolation A'])).rows[0];
    const branchB = (await client.query(`INSERT INTO branches(id,code,name) VALUES($1,$2,$3) RETURNING id`, [randomUUID(), `BB-${stamp}`, 'Branch Isolation B'])).rows[0];
    await fn(client, owner, branchA.id, branchB.id, stamp);
  } finally {
    await client.query('ROLLBACK').catch(() => {});
    await client.end();
  }
}

test('branch scope helper default-deny dan global override eksplisit', () => {
  const scoped = { id: 'u-a', role: 'sales', branchId: 'a', branchScope: null };
  assert.equal(dataScope.canAccessBranch(scoped, 'a'), true);
  assert.equal(dataScope.canAccessBranch(scoped, 'b'), false);
  assert.throws(() => dataScope.assertBranchAccess(scoped, 'b'), (error) => error.code === 'PERMISSION_DENIED');
  assert.throws(() => dataScope.resolveBranch(scoped, 'b'), (error) => error.code === 'PERMISSION_DENIED');
  assert.equal(dataScope.resolveBranch(scoped), 'a');
  assert.equal(dataScope.resolveBranch({ ...scoped, role: 'owner', branchScope: '*' }, 'b'), 'b');
});

dbTest('branch isolation: fixed asset dan laporan keuangan tidak bocor lintas cabang', async () => {
  await withRollback(async (client, owner, branchA, branchB) => {
    const globalOwner = { ...owner, branchScope: '*' };
    const scopedFinance = { ...owner, role: 'finance_manager', branchScope: null, branchId: branchA };
    const assetA = await assets.createAsset(client, { name: 'Scoped asset A', categoryCode: 'MESIN', acquisitionDate: '2026-01-01', acquisitionCost: 12_000_000, branchId: branchA, user: globalOwner, requestId: randomUUID() });
    const assetB = await assets.createAsset(client, { name: 'Scoped asset B', categoryCode: 'MESIN', acquisitionDate: '2026-01-01', acquisitionCost: 24_000_000, branchId: branchB, user: globalOwner, requestId: randomUUID() });
    const listed = await assets.listAssets(client, scopedFinance);
    assert.ok(listed.items.some((row) => row.id === assetA.id));
    assert.ok(!listed.items.some((row) => row.id === assetB.id));
    await assert.rejects(() => assets.disposeAsset(client, { assetId: assetB.id, reason: 'IDOR test', user: scopedFinance, requestId: randomUUID() }), (error) => error.code === 'PERMISSION_DENIED');

    const account = (await client.query(`SELECT id FROM chart_of_accounts WHERE code='6200' AND active LIMIT 1`)).rows[0];
    const period = '2098-07';
    const journalA = await runtime.createDocument(client, { type: 'JOURNAL', title: 'Scoped journal A', amount: 100, payload: { period }, user: { ...globalOwner, branchId: branchA }, requestId: randomUUID() });
    const journalB = await runtime.createDocument(client, { type: 'JOURNAL', title: 'Scoped journal B', amount: 900, payload: { period }, user: { ...globalOwner, branchId: branchB }, requestId: randomUUID() });
    await client.query(`INSERT INTO journal_lines(id,journal_document_id,account_id,debit,credit,memo) VALUES($1,$2,$3,100,0,'scope A'),($4,$5,$3,900,0,'scope B')`, [randomUUID(), journalA.id, account.id, randomUUID(), journalB.id]);
    const statements = await financeReports.financialStatements(client, period, scopedFinance);
    assert.equal(statements.scope, 'BRANCH');
    assert.equal(statements.branchId, branchA);
    assert.equal(statements.incomeStatement.expense, 100);

    const invoiceA = await runtime.createDocument(client, { type: 'INVOICE', title: 'Scoped tax A', amount: 111, user: { ...globalOwner, branchId: branchA }, requestId: randomUUID() });
    const invoiceB = await runtime.createDocument(client, { type: 'INVOICE', title: 'Scoped tax B', amount: 999, user: { ...globalOwner, branchId: branchB }, requestId: randomUUID() });
    const taxA = randomUUID(), taxB = randomUUID();
    await client.query(`INSERT INTO tax_records(id,document_id,tax_type,period,base_amount,tax_amount) VALUES($1,$2,'PPN_OUTPUT',$3,100,11),($4,$5,'PPN_OUTPUT',$3,900,99)`, [taxA, invoiceA.id, period, taxB, invoiceB.id]);
    const taxes = await businessOps.taxSummary(client, period, scopedFinance);
    assert.equal(taxes.ppnOutput, 11);
    assert.deepEqual(taxes.documents.map((row) => row.id), [taxA]);
    await assert.rejects(() => businessOps.reportTax(client, taxB, scopedFinance), (error) => error.code === 'RESOURCE_NOT_FOUND');
  });
});

dbTest('branch isolation: HR roster, koreksi, kalender, dan batch menolak cabang lain', async () => {
  await withRollback(async (client, owner, branchA, branchB, stamp) => {
    const employeeA = (await client.query(`INSERT INTO employees(id,nik,name,department,branch_id,join_date) VALUES($1,$2,'Scoped Employee A','OPS',$3,'2020-01-01') RETURNING id`, [randomUUID(), `EA-${stamp}`, branchA])).rows[0];
    const employeeB = (await client.query(`INSERT INTO employees(id,nik,name,department,branch_id,join_date) VALUES($1,$2,'Scoped Employee B','OPS',$3,'2020-01-01') RETURNING id`, [randomUUID(), `EB-${stamp}`, branchB])).rows[0];
    const shift = (await client.query(`SELECT id FROM work_shifts WHERE active ORDER BY is_default DESC LIMIT 1`)).rows[0];
    await client.query(`INSERT INTO employee_rosters(id,employee_id,work_date,shift_id,assigned_by) VALUES($1,$2,'2098-07-01',$3,$4),($5,$6,'2098-07-01',$3,$4)`, [randomUUID(), employeeA.id, shift.id, owner.id, randomUUID(), employeeB.id]);
    const scopedHrd = { ...owner, role: 'hrd', branchScope: null, branchId: branchA };
    const roster = await hr.listRoster(client, scopedHrd, { period: '2098-07' });
    assert.deepEqual(roster.items.map((row) => row.employeeId), [employeeA.id]);
    await assert.rejects(() => hr.assignRoster(client, { assignments: [{ employeeId: employeeB.id, workDate: '2098-07-02', shiftId: shift.id }], user: scopedHrd, requestId: randomUUID() }), (error) => error.code === 'PERMISSION_DENIED');
    await assert.rejects(() => hr.requestCorrection(client, { employeeId: employeeB.id, workDate: '2098-07-01', proposed: { status: 'PRESENT' }, reason: 'IDOR test', user: scopedHrd, requestId: randomUUID() }), (error) => error.code === 'PERMISSION_DENIED');
    await assert.rejects(() => hr.upsertHoliday(client, { holidayDate: '2098-07-17', name: 'Other branch', branchId: branchB, user: scopedHrd, requestId: randomUUID() }), (error) => error.code === 'PERMISSION_DENIED');
    const accrual = await hr.runLeaveAccrual(client, { period: '2098-07', user: scopedHrd, requestId: randomUUID() });
    assert.equal(accrual.accrued, 1);
    const entries = (await client.query(`SELECT employee_id FROM leave_accrual_entries WHERE period='2098-07' AND employee_id=ANY($1::uuid[])`, [[employeeA.id, employeeB.id]])).rows;
    assert.deepEqual(entries.map((row) => row.employee_id), [employeeA.id]);
  });
});

dbTest('branch isolation: procurement, quotation, dunning, dan RMA menolak IDOR', async () => {
  await withRollback(async (client, owner, branchA, branchB, stamp) => {
    const globalOwner = { ...owner, branchScope: '*' };
    const scopedProcurement = { ...owner, role: 'procurement', branchScope: null, branchId: branchA };
    const scopedFinance = { ...owner, role: 'finance_manager', branchScope: null, branchId: branchA };
    const scopedSales = { ...owner, role: 'sales', branchScope: null, branchId: branchA };
    await procurement.upsertBudget(client, { period: '2098-07', branchId: branchA, amount: 1000, user: globalOwner, requestId: randomUUID() });
    await procurement.upsertBudget(client, { period: '2098-07', branchId: branchB, amount: 9000, user: globalOwner, requestId: randomUUID() });
    const budgets = await procurement.listBudgets(client, scopedFinance, { period: '2098-07' });
    assert.deepEqual(budgets.items.map((row) => row.branchId), [branchA]);
    await assert.rejects(() => procurement.upsertBudget(client, { period: '2098-08', branchId: branchB, amount: 1, user: scopedFinance, requestId: randomUUID() }), (error) => error.code === 'PERMISSION_DENIED');

    const rfqB = await runtime.createDocument(client, { type: 'RFQ', title: 'RFQ other branch', amount: 10, user: { ...globalOwner, branchId: branchB }, requestId: randomUUID() });
    await assert.rejects(() => procurement.listQuotes(client, rfqB.id, scopedProcurement), (error) => error.code === 'PERMISSION_DENIED');
    const quotationB = await runtime.createDocument(client, { type: 'QUOTATION', title: 'Quotation other branch', amount: 10, user: { ...globalOwner, branchId: branchB }, requestId: randomUUID() });
    await assert.rejects(() => sales.listQuotationRevisions(client, quotationB.id, scopedSales), (error) => error.code === 'PERMISSION_DENIED');

    const customer = (await client.query(`INSERT INTO customers(id,code,name,active) VALUES($1,$2,'Scoped customer',true) RETURNING id`, [randomUUID(), `SC-${stamp}`])).rows[0];
    const invoiceB = await runtime.createDocument(client, { type: 'INVOICE', title: 'Invoice other branch', amount: 1000, partyId: customer.id, user: { ...globalOwner, branchId: branchB }, requestId: randomUUID() });
    await client.query(`UPDATE business_documents SET status='APPROVED',due_date=current_date-40 WHERE id=$1`, [invoiceB.id]);
    await assert.rejects(() => sales.createRma(client, { user: scopedSales, sourceDocumentId: invoiceB.id, warrantyClaim: false, reasonCode: 'RETURN', lines: [{ productId: randomUUID(), qty: 1 }], requestId: randomUUID() }), (error) => error.code === 'PERMISSION_DENIED');
    const dunning = await sales.runDunning(client, { user: { ...scopedSales, branchId: branchB }, requestId: randomUUID() });
    const notice = dunning.notices.find((row) => row.invoice === invoiceB.documentNumber);
    assert.ok(notice);
    const row = (await client.query(`SELECT id FROM dunning_notices WHERE notice_number=$1`, [notice.noticeNumber])).rows[0];
    await assert.rejects(() => sales.resolveDunning(client, { noticeId: row.id, reason: 'IDOR test', user: scopedSales, requestId: randomUUID() }), (error) => error.code === 'PERMISSION_DENIED');
  });
});
