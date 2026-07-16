BEGIN;
DROP INDEX IF EXISTS ux_master_quality_single_open;
DELETE FROM master_data_quality_issues a USING master_data_quality_issues b
WHERE a.id>b.id AND a.master_type=b.master_type AND a.master_id=b.master_id
  AND a.rule_code=b.rule_code AND a.status=b.status;
ALTER TABLE master_data_quality_issues
  ADD CONSTRAINT master_data_quality_issues_master_type_master_id_rule_code_status_key
  UNIQUE(master_type,master_id,rule_code,status);
COMMIT;
