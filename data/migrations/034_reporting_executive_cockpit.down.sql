BEGIN;
DROP TABLE IF EXISTS report_schedules;
DROP TABLE IF EXISTS report_saved_filters;
DROP FUNCTION IF EXISTS refresh_executive_reporting();
DROP MATERIALIZED VIEW IF EXISTS mv_executive_monthly_kpis;
DROP TABLE IF EXISTS reporting_refresh_runs;
COMMIT;
