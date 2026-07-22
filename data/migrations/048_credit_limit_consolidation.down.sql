BEGIN;
-- Rollback 048 — kembalikan kolom credit_limit dan isinya dari nilai yang
-- ditegakkan. Kedua kolom kembali hidup berdampingan seperti semula.
ALTER TABLE customers ADD COLUMN credit_limit numeric(20,2) NOT NULL DEFAULT 0;
UPDATE customers SET credit_limit = COALESCE(credit_limit_amount, 0);
COMMIT;
