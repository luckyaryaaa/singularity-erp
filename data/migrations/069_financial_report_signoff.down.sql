BEGIN;
-- Rollback 069 — hapus laporan keuangan ber-versi.
DROP TABLE IF EXISTS financial_reports;
COMMIT;
