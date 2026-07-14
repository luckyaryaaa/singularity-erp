BEGIN;
ALTER TABLE backup_runs DROP COLUMN IF EXISTS restore_test_detail,DROP COLUMN IF EXISTS restore_tested_at,DROP COLUMN IF EXISTS error,DROP COLUMN IF EXISTS file_path,DROP COLUMN IF EXISTS backup_type;
DROP TABLE IF EXISTS notification_deliveries;
DROP TABLE IF EXISTS generated_artifacts;
DROP INDEX IF EXISTS ix_file_related;
ALTER TABLE file_metadata DROP COLUMN IF EXISTS deleted_by,DROP COLUMN IF EXISTS deleted_at,DROP COLUMN IF EXISTS is_deleted,DROP COLUMN IF EXISTS scan_status;
DROP TABLE IF EXISTS system_settings;
DROP TABLE IF EXISTS document_relations;
COMMIT;
