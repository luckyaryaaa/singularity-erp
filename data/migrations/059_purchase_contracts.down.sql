BEGIN;
-- Rollback 059 — pembelian kembali tanpa kontrak kerangka.
DROP POLICY IF EXISTS branch_scope ON purchase_contracts;
DROP TABLE IF EXISTS purchase_contract_releases;
DROP TABLE IF EXISTS purchase_contract_lines;
DROP TABLE IF EXISTS purchase_contracts;
COMMIT;
