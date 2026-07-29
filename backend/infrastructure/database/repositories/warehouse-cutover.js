'use strict';
// Canonical Warehouse Stage 2B — RECONCILE + READ-SWITCH (migrasi 083).
//
// Menyediakan: (1) rekonsiliasi read-switch — bukti bahwa membaca pada grain
// org_warehouse identik nilainya dengan grain cabang; (2) flag read-grain yang
// reversibel dengan gate — beralih ke CANONICAL hanya boleh saat rekonsiliasi
// bersih, kembali ke BRANCH selalu boleh (rollback/rehearsal); (3) pembacaan
// stok pada grain gudang kanonik. warehouse_id ber-grain cabang tetap kunci
// scope/RLS; grain-flip penuh adalah stage terminal berikutnya.
const { AppError } = require('../../../core/errors');
const permissions = require('../../../core/permissions');
const runtime = require('./runtime');

const GRAINS = ['BRANCH', 'CANONICAL'];
const SETTING_KEY = 'warehouse.read_grain';
const num = (v) => Math.round(Number(v || 0) * 10000) / 10000;

async function getReadGrain(client) {
  const row = (await client.query('SELECT value FROM system_settings WHERE setting_key=$1', [SETTING_KEY])).rows[0];
  const grain = row?.value?.grain;
  return GRAINS.includes(grain) ? grain : 'BRANCH';
}

async function reconciliation(client, user) {
  permissions.assertPermission(user, 'inventory.view');
  const health = (await client.query('SELECT * FROM warehouse_read_switch_health')).rows[0]
    || { balance_grain_mismatch: 0, dimension_issues: 0 };
  const dimension = (await client.query('SELECT * FROM warehouse_dimension_health')).rows[0];
  const mismatches = (await client.query(
    `SELECT product_id, branch_id, qty_branch::float, qty_canonical::float, qty_diff::float, value_diff::float
     FROM warehouse_read_switch_reconciliation
     WHERE qty_diff <> 0 OR value_diff <> 0 ORDER BY abs(qty_diff) DESC LIMIT 20`)).rows;
  const allClear = Number(health.balance_grain_mismatch) === 0 && Number(health.dimension_issues) === 0;
  return {
    readGrain: await getReadGrain(client),
    allClear,
    balanceGrainMismatch: Number(health.balance_grain_mismatch),
    dimensionIssues: Number(health.dimension_issues),
    dimensionHealth: runtime.camel(dimension),
    mismatches: mismatches.map(runtime.camel)
  };
}

// Cutover flag adalah kendali sistem: dijaga 'settings.edit'. Beralih ke grain
// kanonik butuh rekonsiliasi bersih; kembali ke BRANCH selalu boleh (rollback).
async function setReadGrain(client, { grain, note }, user, requestId) {
  permissions.assertPermission(user, 'settings.edit');
  const target = String(grain || '').toUpperCase();
  if (!GRAINS.includes(target)) throw new AppError('VALIDATION_ERROR', `Read-grain tidak dikenal: ${grain}.`, { allowed: GRAINS });
  const previous = await getReadGrain(client);
  if (target === 'CANONICAL') {
    const health = (await client.query('SELECT * FROM warehouse_read_switch_health')).rows[0];
    if (Number(health.balance_grain_mismatch) !== 0 || Number(health.dimension_issues) !== 0) {
      throw new AppError('STATUS_INVALID',
        'Read-switch ke CANONICAL ditolak: rekonsiliasi gudang belum bersih.',
        { balanceGrainMismatch: Number(health.balance_grain_mismatch), dimensionIssues: Number(health.dimension_issues) });
    }
  }
  await client.query(
    `INSERT INTO system_settings(setting_key,value,updated_by,updated_at)
     VALUES ($1,$2,$3,now())
     ON CONFLICT (setting_key) DO UPDATE SET value=$2, updated_by=$3, updated_at=now()`,
    [SETTING_KEY, JSON.stringify({ grain: target, note: note ? String(note).slice(0, 300) : null }), user.id]);
  await runtime.audit(client, { userId: user.id, action: 'WAREHOUSE_READ_SWITCH', module: 'settings',
    entityType: 'WAREHOUSE_READ_GRAIN', entityId: null, reason: note || null,
    oldValue: { settingKey: SETTING_KEY, grain: previous }, newValue: { settingKey: SETTING_KEY, grain: target },
    requestId, branchId: user.branchId });
  return { readGrain: target, previous };
}

// Pembacaan stok pada grain gudang kanonik: saldo diringkas per org_warehouse
// (bukan per cabang). Scope cabang tetap ditegakkan.
async function stockByWarehouse(client, user, { branchId = null, productId = null } = {}) {
  permissions.assertPermission(user, 'inventory.view');
  const scope = branchId || user.branchId;
  permissions.assertBranchScope(user, scope, 'Stok gudang kanonik');
  const params = [scope]; let where = 'w.branch_id=$1';
  if (productId) { params.push(productId); where += ` AND i.product_id=$${params.length}`; }
  const rows = (await client.query(
    `SELECT w.id org_warehouse_id, w.code warehouse_code, w.name warehouse_name, w.is_default,
       i.product_id, p.code product_code, p.name product_name, p.uom,
       i.qty_on_hand::float qty_on_hand, i.value_idr::float value_idr, i.min_qty::float min_qty
     FROM inventory_balances i
     JOIN org_warehouses w ON w.id=i.org_warehouse_id
     JOIN products p ON p.id=i.product_id
     WHERE ${where} AND i.qty_on_hand<>0
     ORDER BY w.code, p.code`, params)).rows;
  return {
    branchId: scope, readGrain: 'CANONICAL',
    items: rows.map((r) => ({ orgWarehouseId: r.org_warehouse_id, warehouseCode: r.warehouse_code,
      warehouseName: r.warehouse_name, isDefault: r.is_default, productId: r.product_id,
      productCode: r.product_code, productName: r.product_name, uom: r.uom,
      qtyOnHand: num(r.qty_on_hand), valueIdr: num(r.value_idr), minQty: num(r.min_qty) })),
    totalValue: num(rows.reduce((s, r) => s + Number(r.value_idr), 0))
  };
}

module.exports = { getReadGrain, reconciliation, setReadGrain, stockByWarehouse, GRAINS };
