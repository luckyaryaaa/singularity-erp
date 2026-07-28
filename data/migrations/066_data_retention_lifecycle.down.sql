BEGIN;
DROP FUNCTION IF EXISTS execute_data_retention(varchar,timestamptz,integer);
DROP TABLE IF EXISTS data_retention_runs;
DROP TABLE IF EXISTS data_retention_holds;
DROP TABLE IF EXISTS data_retention_policies;
COMMIT;
