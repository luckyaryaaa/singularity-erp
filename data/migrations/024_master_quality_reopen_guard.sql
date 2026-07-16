-- 024_master_quality_reopen_guard.sql
-- Allow a quality rule to be resolved and reopened repeatedly while keeping
-- exactly one OPEN issue per master/rule.
BEGIN;
ALTER TABLE master_data_quality_issues
  DROP CONSTRAINT IF EXISTS master_data_quality_issues_master_type_master_id_rule_code_status_key;
CREATE UNIQUE INDEX ux_master_quality_single_open
  ON master_data_quality_issues(master_type,master_id,rule_code)
  WHERE status='OPEN';
COMMIT;
