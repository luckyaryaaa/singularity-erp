BEGIN;
-- Rollback Sprint 13 (R020) fixed asset & fondasi laporan keuangan.
DROP TABLE IF EXISTS asset_depreciation_entries;
DROP TABLE IF EXISTS fixed_assets;
DROP TABLE IF EXISTS asset_categories;
-- Akun dibiarkan bila sudah dipakai jurnal.
DELETE FROM chart_of_accounts WHERE code IN ('1500','1590','3100','3900','6300','7100')
  AND NOT EXISTS (SELECT 1 FROM journal_lines jl WHERE jl.account_id=chart_of_accounts.id);
COMMIT;
