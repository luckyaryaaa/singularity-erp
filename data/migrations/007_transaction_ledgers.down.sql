BEGIN;
ALTER TABLE journal_lines DROP CONSTRAINT IF EXISTS ck_journal_line_one_side;
ALTER TABLE inventory_balances DROP CONSTRAINT IF EXISTS ck_inventory_reserved_nonnegative;
ALTER TABLE inventory_balances DROP CONSTRAINT IF EXISTS ck_inventory_version_positive;
DROP TABLE IF EXISTS inventory_movements_default;
DROP TABLE IF EXISTS document_postings;
COMMIT;
