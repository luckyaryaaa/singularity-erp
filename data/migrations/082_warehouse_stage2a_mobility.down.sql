BEGIN;

DROP VIEW IF EXISTS warehouse_dimension_health;
DROP VIEW IF EXISTS inventory_location_ledger;

DROP TRIGGER IF EXISTS trg_scan_event_append_only ON warehouse_scan_events;
DROP TRIGGER IF EXISTS trg_scan_event_scope ON warehouse_scan_events;
DROP FUNCTION IF EXISTS validate_warehouse_scan_event();
DROP FUNCTION IF EXISTS protect_warehouse_scan_event();
DROP TABLE IF EXISTS warehouse_scan_events;
DROP TRIGGER IF EXISTS trg_scan_session_scope ON warehouse_scan_sessions;
DROP FUNCTION IF EXISTS validate_warehouse_scan_session();
DROP TABLE IF EXISTS warehouse_scan_sessions;
DROP TRIGGER IF EXISTS trg_handling_unit_item_scope ON warehouse_handling_unit_items;
DROP FUNCTION IF EXISTS validate_handling_unit_item();
DROP TABLE IF EXISTS warehouse_handling_unit_items;
DROP TRIGGER IF EXISTS trg_handling_unit_dimensions ON warehouse_handling_units;
DROP FUNCTION IF EXISTS validate_handling_unit_dimensions();
DROP TABLE IF EXISTS warehouse_handling_units;

DROP TRIGGER IF EXISTS trg_warehouse_task_dimensions ON warehouse_tasks;
DROP FUNCTION IF EXISTS resolve_warehouse_task_dimensions();
DROP INDEX IF EXISTS ix_warehouse_tasks_org_warehouse;
ALTER TABLE warehouse_tasks
  DROP COLUMN IF EXISTS scan_policy,
  DROP COLUMN IF EXISTS scan_required,
  DROP COLUMN IF EXISTS storage_location_id,
  DROP COLUMN IF EXISTS org_warehouse_id;

DROP TRIGGER IF EXISTS trg_resolve_stock_lot_warehouse ON stock_lots;
CREATE OR REPLACE FUNCTION resolve_stock_lot_warehouse() RETURNS trigger AS $$
BEGIN
  IF NEW.org_warehouse_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM org_warehouses w
                    WHERE w.id=NEW.org_warehouse_id AND w.branch_id=NEW.warehouse_id) THEN
    NEW.org_warehouse_id := (SELECT id FROM org_warehouses w
      WHERE w.branch_id=NEW.warehouse_id AND w.is_default LIMIT 1);
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_resolve_stock_lot_warehouse
BEFORE INSERT OR UPDATE OF warehouse_id,org_warehouse_id ON stock_lots
FOR EACH ROW EXECUTE FUNCTION resolve_stock_lot_warehouse();
ALTER TABLE stock_lots
  DROP CONSTRAINT IF EXISTS stock_lots_expiry_after_receipt,
  DROP COLUMN IF EXISTS expiry_date,
  DROP COLUMN IF EXISTS storage_location_id;

DROP TRIGGER IF EXISTS trg_stock_reservation_warehouse ON stock_reservations;
DROP FUNCTION IF EXISTS resolve_stock_reservation_warehouse();
DROP INDEX IF EXISTS ix_stock_reservation_org_warehouse;
ALTER TABLE stock_reservations DROP COLUMN IF EXISTS org_warehouse_id;

DROP TRIGGER IF EXISTS trg_inventory_movement_dimensions ON inventory_movements;
DROP FUNCTION IF EXISTS resolve_inventory_movement_dimensions();
ALTER TABLE inventory_movements
  ALTER COLUMN org_warehouse_id DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS fk_inventory_movement_bin,
  DROP CONSTRAINT IF EXISTS fk_inventory_movement_storage_location,
  DROP CONSTRAINT IF EXISTS fk_inventory_movement_org_warehouse;

DROP TRIGGER IF EXISTS trg_inventory_balance_warehouse ON inventory_balances;
DROP FUNCTION IF EXISTS resolve_inventory_balance_warehouse();
DROP INDEX IF EXISTS ix_inventory_balance_org_warehouse;
ALTER TABLE inventory_balances DROP COLUMN IF EXISTS org_warehouse_id;

COMMIT;
