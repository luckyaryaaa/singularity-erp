BEGIN;
-- Rollback 041 — kembalikan mrp_suggestions ke bentuk lintas gudang.
DROP INDEX IF EXISTS ux_mrp_suggestions_run_site_product;
DROP INDEX IF EXISTS ix_mrp_suggestions_warehouse;
ALTER TABLE mrp_suggestions DROP CONSTRAINT IF EXISTS mrp_suggestions_warehouse_required;
ALTER TABLE mrp_suggestions DROP COLUMN IF EXISTS warehouse_id;
COMMIT;
