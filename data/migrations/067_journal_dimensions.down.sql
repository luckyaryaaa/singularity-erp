BEGIN;
-- Rollback 067 — hapus coding block dimensi dan kebijakan akun.
DROP TABLE IF EXISTS account_dimension_policy;
DROP INDEX IF EXISTS ix_journal_lines_project;
DROP INDEX IF EXISTS ix_journal_lines_profit_center;
DROP INDEX IF EXISTS ix_journal_lines_cost_center;
ALTER TABLE journal_lines
  DROP COLUMN IF EXISTS project_wbs_id,
  DROP COLUMN IF EXISTS profit_center_id,
  DROP COLUMN IF EXISTS cost_center_id;
COMMIT;
