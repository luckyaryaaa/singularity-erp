BEGIN;
-- Rollback 083 — hapus view read-switch dan flag read-grain.
DROP VIEW IF EXISTS warehouse_read_switch_health;
DROP VIEW IF EXISTS warehouse_read_switch_reconciliation;
DELETE FROM system_settings WHERE setting_key = 'warehouse.read_grain';
COMMIT;
