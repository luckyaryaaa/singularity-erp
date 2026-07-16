BEGIN;
-- Rollback Sprint 12 (R019) production/quality/MRP.
DROP TABLE IF EXISTS mrp_suggestions;
DROP TABLE IF EXISTS qc_inspections;
DROP TABLE IF EXISTS work_order_materials;
DROP TABLE IF EXISTS work_order_time_logs;
DROP TABLE IF EXISTS work_order_operations;
COMMIT;
