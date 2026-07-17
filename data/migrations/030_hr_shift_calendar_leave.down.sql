BEGIN;
-- Rollback Sprint 14 (R021) HR completion.
DROP TABLE IF EXISTS leave_accrual_entries;
DROP TABLE IF EXISTS leave_policies;
DROP TABLE IF EXISTS attendance_corrections;
DROP TABLE IF EXISTS hr_calendar_config;
DROP TABLE IF EXISTS work_calendar;
DROP TABLE IF EXISTS employee_rosters;
DROP TABLE IF EXISTS work_shifts;
COMMIT;
