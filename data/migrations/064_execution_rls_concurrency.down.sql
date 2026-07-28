BEGIN;

ALTER VIEW stock_reservation_balance SET (security_invoker = false);
ALTER VIEW work_center_daily_load SET (security_invoker = false);
ALTER VIEW work_order_wip SET (security_invoker = false);

DROP POLICY IF EXISTS instrument_scope ON instrument_calibrations;
ALTER TABLE instrument_calibrations DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS branch_scope ON measuring_instruments;
ALTER TABLE measuring_instruments DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS branch_scope ON capa_cases;
ALTER TABLE capa_cases DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS document_scope ON qc_inspections;
ALTER TABLE qc_inspections DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS operation_scope ON work_order_time_logs;
ALTER TABLE work_order_time_logs DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS work_order_scope ON work_order_materials;
ALTER TABLE work_order_materials DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS work_order_scope ON work_order_operations;
ALTER TABLE work_order_operations DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS contract_scope ON purchase_contract_releases;
ALTER TABLE purchase_contract_releases DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS contract_scope ON purchase_contract_lines;
ALTER TABLE purchase_contract_lines DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS warehouse_scope ON stock_reservations;
ALTER TABLE stock_reservations DISABLE ROW LEVEL SECURITY;

DROP INDEX IF EXISTS ux_purchase_contract_release_business_key;

ALTER TABLE measuring_instruments DROP COLUMN IF EXISTS version;
ALTER TABLE capa_cases DROP COLUMN IF EXISTS version;
ALTER TABLE work_order_operations DROP COLUMN IF EXISTS version;
ALTER TABLE purchase_contract_lines DROP COLUMN IF EXISTS version;
ALTER TABLE stock_reservations DROP COLUMN IF EXISTS version;

COMMIT;
