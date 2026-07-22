BEGIN;
-- Rollback 060 — kapasitas kembali tidak diperiksa dan WIP kembali tak terlihat.
DROP VIEW IF EXISTS work_order_wip;
DROP VIEW IF EXISTS work_center_daily_load;
DROP INDEX IF EXISTS ix_wo_operations_schedule;
ALTER TABLE work_order_operations
  DROP COLUMN IF EXISTS actual_hours,
  DROP COLUMN IF EXISTS scheduled_date;
COMMIT;
