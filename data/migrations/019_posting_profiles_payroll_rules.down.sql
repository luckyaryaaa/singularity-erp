-- Rollback 019 — staging saja; jalankan setelah backup terverifikasi.
BEGIN;
ALTER TABLE business_documents DROP COLUMN IF EXISTS posting_profile_snapshot;
ALTER TABLE payroll_items DROP COLUMN IF EXISTS rule_snapshot;
DROP TABLE IF EXISTS payroll_rule_versions;
DROP TABLE IF EXISTS posting_profile_legs;
DROP TABLE IF EXISTS posting_profiles;
COMMIT;
