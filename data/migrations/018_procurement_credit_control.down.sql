-- Rollback 018 — staging saja; jalankan setelah backup terverifikasi.
BEGIN;
DROP TABLE IF EXISTS payment_proposal_lines;
DROP TABLE IF EXISTS three_way_matches;
DROP TABLE IF EXISTS match_tolerance_config;
DROP TABLE IF EXISTS rfq_quotes;
DROP TABLE IF EXISTS credit_overrides;
ALTER TABLE customers
  DROP COLUMN IF EXISTS credit_reviewed_by, DROP COLUMN IF EXISTS credit_reviewed_at,
  DROP COLUMN IF EXISTS credit_hold_reason, DROP COLUMN IF EXISTS credit_term_days,
  DROP COLUMN IF EXISTS credit_limit_amount;
COMMIT;
