'use strict';
// Ledger gudang kanonik (Stage 1, migrasi 076) — dimensi gudang nyata di atas
// model cabang. Membaca view stock_warehouse_ledger yang menyatukan
// Legal Entity → Plant → Warehouse dengan ringkasan stok yang diturunkan dari
// lot. Cabang tetap kunci scope; gudang kini menjadi identitas yang dapat
// ditelusuri, bukan sekadar sama dengan cabang.
const permissions = require('../../../core/permissions');

async function listWarehouses(client, user, { branchId = null } = {}) {
  permissions.assertPermission(user, 'inventory.view');
  const scope = branchId || user.branchId;
  permissions.assertBranchScope(user, scope, 'Gudang');
  const rows = (await client.query(
    `SELECT * FROM stock_warehouse_ledger WHERE branch_id = $1
     ORDER BY is_default DESC, warehouse_code`, [scope])).rows;
  return {
    branchId: scope,
    items: rows.map((r) => ({
      orgWarehouseId: r.org_warehouse_id, code: r.warehouse_code, name: r.warehouse_name,
      warehouseType: r.warehouse_type, isDefault: r.is_default, active: r.active,
      branchCode: r.branch_code, branchName: r.branch_name, legalEntityId: r.legal_entity_id,
      plantId: r.plant_id, plantCode: r.plant_code, plantName: r.plant_name,
      lotCount: Number(r.lot_count), qtyOnHand: Number(r.qty_on_hand)
    })),
    totals: {
      warehouses: rows.length,
      lotCount: rows.reduce((s, r) => s + Number(r.lot_count), 0),
      qtyOnHand: Math.round(rows.reduce((s, r) => s + Number(r.qty_on_hand), 0) * 10000) / 10000
    }
  };
}

module.exports = { listWarehouses };
