BEGIN;
DROP INDEX IF EXISTS ux_app_users_employee;
ALTER TABLE app_users DROP COLUMN IF EXISTS employee_id;
COMMIT;
