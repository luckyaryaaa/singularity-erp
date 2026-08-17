'use strict';
// Sprint 18 prep — jurnal saldo awal persediaan (cut-over): selisih GL 1300
// vs subledger stok dibukukan sekali lawan 3900, idempoten, seimbang.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');

const enabled = !!process.env.DATABASE_URL;
const dbTest = enabled ? test : test.skip;

const runtime = require('../backend/infrastructure/database/repositories/runtime');
const financeReports = require('../backend/infrastructure/database/repositories/finance-reports');

dbTest('opening balance persediaan: jurnal seimbang menyelaraskan GL 1300, replay idempoten', async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    await c.query('BEGIN'); await c.query("SELECT set_config('app.is_system','on',true),set_config('app.is_platform','on',true),set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true)");
    const u = runtime.camel((await c.query(`SELECT id,username,display_name "displayName",role,branch_id "branchId",branch_scope "branchScope" FROM app_users WHERE role='owner' LIMIT 1`)).rows[0]);
    // Buat ketidakselarasan buatan agar jalur jurnal teruji walau DB sudah selaras.
    await c.query(`UPDATE business_documents SET status='CANCELLED' WHERE document_type='JOURNAL' AND payload->>'source'='INVENTORY_OPENING_BALANCE'`);
    const wh = (await c.query('SELECT id FROM branches WHERE active LIMIT 1')).rows[0];
    const prod = (await c.query('SELECT id FROM products WHERE active LIMIT 1')).rows[0];
    await c.query(`INSERT INTO inventory_balances(id,product_id,warehouse_id,qty_on_hand,value_idr) VALUES($1,$2,$3,1,7_500_000)
      ON CONFLICT(product_id,warehouse_id) DO UPDATE SET value_idr=inventory_balances.value_idr+7_500_000`, [randomUUID(), prod.id, wh.id]);
    const r1 = await financeReports.postInventoryOpeningBalance(c, { user: u, requestId: randomUUID() });
    assert.match(r1.documentNumber, /^JRN-/);
    const jl = (await c.query(`SELECT COALESCE(SUM(jl.debit),0)::float d,COALESCE(SUM(jl.credit),0)::float cr FROM journal_lines jl
      JOIN business_documents doc ON doc.id=jl.journal_document_id WHERE doc.document_number=$1`, [r1.documentNumber])).rows[0];
    assert.ok(Math.abs(jl.d - jl.cr) < 0.01 && jl.d > 0, 'jurnal opening seimbang');
    const gl = Number((await c.query(`SELECT COALESCE(SUM(j.debit-j.credit),0)::float n FROM journal_lines j JOIN chart_of_accounts a ON a.id=j.account_id WHERE a.code='1300'`)).rows[0].n);
    const sub = Number((await c.query('SELECT COALESCE(SUM(value_idr),0)::float n FROM inventory_balances')).rows[0].n);
    assert.ok(Math.abs(gl - sub) < 1, `GL 1300 (${gl}) selaras subledger (${sub})`);
    const r2 = await financeReports.postInventoryOpeningBalance(c, { user: u, requestId: randomUUID() });
    assert.equal(r2.replay, true, 'run kedua replay — tidak dobel');
  } finally { await c.query('ROLLBACK').catch(() => {}); await c.end(); }
});
