BEGIN;
-- Rollback Sprint 9 (R016) O2C completion.
DELETE FROM posting_profile_legs WHERE profile_id IN (SELECT id FROM posting_profiles WHERE code='RMA-DEFAULT');
DELETE FROM posting_profiles WHERE code='RMA-DEFAULT';
DELETE FROM chart_of_accounts WHERE code='4110'
  AND NOT EXISTS (SELECT 1 FROM journal_lines jl WHERE jl.account_id=chart_of_accounts.id);
ALTER TABLE products DROP COLUMN IF EXISTS warranty_months;
DROP TABLE IF EXISTS dunning_notices;
DROP TABLE IF EXISTS dunning_policies;
DROP TABLE IF EXISTS quotation_revisions;
COMMIT;
