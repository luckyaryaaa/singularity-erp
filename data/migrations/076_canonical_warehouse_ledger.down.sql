BEGIN;
-- Rollback 076. Baris gudang default hasil backfill dibiarkan (baris org yang
-- benign); re-up bersifat idempoten sehingga tidak menduplikasi.
DROP VIEW IF EXISTS stock_warehouse_ledger;
DROP TRIGGER IF EXISTS trg_resolve_stock_lot_warehouse ON stock_lots;
DROP FUNCTION IF EXISTS resolve_stock_lot_warehouse();
DROP INDEX IF EXISTS ix_stock_lots_org_warehouse;
ALTER TABLE stock_lots DROP COLUMN IF EXISTS org_warehouse_id;
DROP INDEX IF EXISTS ux_org_warehouses_default;
ALTER TABLE org_warehouses DROP COLUMN IF EXISTS is_default;
COMMIT;
