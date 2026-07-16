BEGIN;
-- Rollback Sprint 11 (R018) inventory lots + opname.
DELETE FROM posting_profile_legs WHERE profile_id IN (SELECT id FROM posting_profiles WHERE code='OPNAME-DEFAULT');
DELETE FROM posting_profiles WHERE code='OPNAME-DEFAULT';
ALTER TABLE posting_profile_legs DROP CONSTRAINT posting_profile_legs_amount_source_check;
ALTER TABLE posting_profile_legs ADD CONSTRAINT posting_profile_legs_amount_source_check
  CHECK (amount_source IN ('AMOUNT','NET','TAX','BPJS_COMPANY','BPJS_EMPLOYEE','GROSS','DEDUCTION'));
-- Akun 4250/6150 dibiarkan bila sudah dipakai jurnal; hapus hanya jika belum.
DELETE FROM chart_of_accounts WHERE code IN ('4250','6150')
  AND NOT EXISTS (SELECT 1 FROM journal_lines jl WHERE jl.account_id=chart_of_accounts.id);
DROP TABLE IF EXISTS stock_opname_lines;
DROP TABLE IF EXISTS stock_lot_movements;
DROP TABLE IF EXISTS stock_lots;
COMMIT;
