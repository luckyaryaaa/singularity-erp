BEGIN;
-- Rollback 042 — kembalikan three-way match ke perbandingan header saja.
ALTER TABLE match_tolerance_config DROP COLUMN IF EXISTS qty_tolerance_abs;
ALTER TABLE three_way_matches DROP COLUMN IF EXISTS goods_receipt_ids;
ALTER TABLE three_way_matches DROP COLUMN IF EXISTS line_variances;
COMMIT;
