'use strict';
// P0-P — Dashboard: entitlement per kartu, KPI persediaan ter-scope cabang,
// dan tidak ada lagi angka ter-hardcode nol (revenueGrowthPct / cashPosition).
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const workspace = require('../backend/routes/workspace');

const dbTest = process.env.DATABASE_URL ? test : test.skip;
async function rollback(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try { await client.query('BEGIN'); await client.query("SELECT set_config('app.is_system','on',true),set_config('app.is_platform','on',true),set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true)"); await fn(client); }
  finally { await client.query('ROLLBACK').catch(() => {}); await client.end(); }
}
async function owner(client) {
  const r = (await client.query(`SELECT u.*,b.legal_entity_id FROM app_users u JOIN branches b ON b.id=u.branch_id WHERE u.role='owner' AND b.legal_entity_id IS NOT NULL LIMIT 1`)).rows[0];
  return { id: r.id, role: r.role, branchId: r.branch_id, branchScope: '*', displayName: r.display_name };
}
// Dashboard dipanggil lewat dispatch supaya jalur HTTP yang sesungguhnya diuji.
async function dashboard(client, user) {
  return workspace.dispatch(client, { method: 'GET' }, new URL('http://x/api/dashboard'), { user, requestId: randomUUID() });
}

dbTest('P0-P: kartu keuangan hilang dari respons untuk pengguna tanpa izinnya', async () => rollback(async (client) => {
  const admin = await owner(client);
  const full = await dashboard(client, admin);
  assert.equal(full.entitlements.revenue, true);
  assert.equal(full.entitlements.cash, true);
  assert.ok('revenueMonth' in full.kpi, 'owner wajib melihat omzet');
  assert.ok('apTotal' in full.health && 'inventoryValue' in full.health);

  // Produksi: tanpa invoice.view / ledger.view / supplier_invoice.view.
  const operator = { id: admin.id, role: 'production', branchId: admin.branchId, branchScope: admin.branchId, displayName: 'Operator' };
  const limited = await dashboard(client, operator);
  assert.equal(limited.entitlements.revenue, false);
  assert.equal(limited.entitlements.payable, false);
  assert.equal(limited.entitlements.cash, false);
  assert.ok(!('revenueMonth' in limited.kpi), 'omzet tidak boleh ikut terkirim');
  assert.ok(!('arTotal' in limited.health) && !('apTotal' in limited.health), 'AR/AP tidak boleh ikut terkirim');
  assert.ok(!('cashPosition' in limited.health), 'posisi kas tidak boleh ikut terkirim');
  assert.deepEqual(limited.revenueSeries, [], 'seri pendapatan ikut ditahan');
  // Yang memang haknya tetap ada.
  assert.ok('activeOrders' in limited.kpi && 'orderBook' in limited.health);
}));

dbTest('P0-P: KPI persediaan ter-scope cabang, tidak lagi seluruh perusahaan', async () => rollback(async (client) => {
  const admin = await owner(client);
  const home = admin.branchId;
  const other = (await client.query('SELECT id FROM branches WHERE id<>$1 AND active LIMIT 1', [home])).rows[0];
  assert.ok(other, 'butuh minimal dua cabang');
  const prod = (await client.query(
    `INSERT INTO products(id,code,name,product_type,category,uom,hpp,price,make_or_buy,active)
     VALUES($1,$2,'Stok cabang lain','PRODUCT','DASH','PCS',1000,2000,'BUY',true) RETURNING id`,
    [randomUUID(), `DSH${Date.now().toString(36).toUpperCase().slice(-7)}`])).rows[0];
  // Nilai stok besar HANYA di cabang lain.
  await client.query(`INSERT INTO inventory_balances(id,product_id,warehouse_id,qty_on_hand,value_idr) VALUES($1,$2,$3,500,777000000)
    ON CONFLICT(product_id,warehouse_id) DO UPDATE SET qty_on_hand=500,value_idr=777000000`, [randomUUID(), prod.id, other.id]);

  const globalView = await dashboard(client, admin);
  const branchUser = { id: admin.id, role: 'warehouse', branchId: home, branchScope: home, displayName: 'Gudang' };
  const scoped = await dashboard(client, branchUser);

  assert.ok(Number(globalView.health.inventoryValue) >= 777_000_000, 'owner melihat seluruh perusahaan');
  assert.ok(Number(scoped.health.inventoryValue) < 777_000_000, 'pengguna cabang tidak boleh melihat nilai stok cabang lain');
  assert.equal(scoped.scope, home);
  assert.equal(globalView.scope, 'ALL');
}));

dbTest('P0-P: antrean approval berjalan untuk role non-owner (regresi operator text[])', async () => rollback(async (client) => {
  const runtime = require('../backend/infrastructure/database/repositories/runtime');
  const admin = await owner(client);
  const doc = await runtime.createDocument(client, { type: 'QUOTATION', user: admin, title: 'Menunggu approval', amount: 20_000_000, requestId: randomUUID() });
  await client.query(`UPDATE business_documents SET status='WAITING_APPROVAL',required_approval_levels=ARRAY['supervisor','finance'],submitted_at=now() WHERE id=$1`, [doc.id]);

  // Setiap role non-owner memakai cabang filter + keanggotaan level; dulu
  // seluruhnya melempar "operator does not exist: text[] ? unknown".
  for (const role of ['sales', 'finance_manager', 'accounting', 'procurement']) {
    const actor = { id: admin.id, role, branchId: admin.branchId, branchScope: '*', displayName: role };
    const queue = await runtime.pendingApprovals(client, actor, { limit: 10 });
    assert.ok(Number.isInteger(queue.total), `antrean approval gagal untuk role ${role}`);
  }
  const supervisor = { id: admin.id, role: 'sales', branchId: admin.branchId, branchScope: '*', displayName: 'Sales' };
  const queue = await runtime.pendingApprovals(client, supervisor, { limit: 50 });
  assert.ok(queue.items.some((i) => i.id === doc.id), 'dokumen yang menunggu level supervisor wajib muncul di antrean');

  // Setelah level supervisor disetujui, dokumen tidak boleh muncul lagi untuk supervisor.
  await client.query(`UPDATE business_documents SET approvals=jsonb_build_array(jsonb_build_object('level','supervisor')) WHERE id=$1`, [doc.id]);
  const after = await runtime.pendingApprovals(client, supervisor, { limit: 50 });
  assert.ok(!after.items.some((i) => i.id === doc.id), 'level yang sudah disetujui tidak boleh diminta lagi');
}));

dbTest('P0-P: pertumbuhan pendapatan dihitung nyata, bukan nol ter-hardcode', async () => rollback(async (client) => {
  const admin = await owner(client);
  const base = await dashboard(client, admin);
  // Nilai boleh null (tidak ada pembanding) tetapi TIDAK boleh nol palsu saat
  // bulan lalu sebenarnya berisi pendapatan.
  if (Number(base.kpi.revenuePrevMonth) > 0) {
    const expected = Math.round((Number(base.kpi.revenueMonth) - Number(base.kpi.revenuePrevMonth)) / Number(base.kpi.revenuePrevMonth) * 1000) / 10;
    assert.equal(base.kpi.revenueGrowthPct, expected, 'pertumbuhan wajib turunan dari dua bulan nyata');
  } else {
    assert.equal(base.kpi.revenueGrowthPct, null, 'tanpa pembanding, pertumbuhan null — bukan 0');
  }
  // cashPosition berasal dari buku besar via peran akun CASH_BANK.
  assert.ok(base.health.cashPosition === null || typeof base.health.cashPosition === 'number');
  const ledger = (await client.query(`SELECT COALESCE(SUM(l.debit-l.credit),0)::float b FROM journal_lines l
    JOIN chart_of_accounts a ON a.id=l.account_id JOIN business_documents j ON j.id=l.journal_document_id
    WHERE a.code LIKE (SELECT account_code FROM account_roles WHERE role_key='CASH_BANK' AND active ORDER BY effective_from DESC LIMIT 1)||'%'
      AND j.status NOT IN('DRAFT','CANCELLED','VOID','REJECTED')`)).rows[0];
  assert.equal(base.health.cashPosition, Math.round(Number(ledger.b) * 100) / 100, 'posisi kas wajib cocok dengan buku besar');
}));
