BEGIN;

DROP INDEX IF EXISTS ux_employees_tenant_code;
ALTER TABLE employees DROP COLUMN IF EXISTS employee_code;
DROP TABLE IF EXISTS tenant_employee_seq;

COMMIT;
