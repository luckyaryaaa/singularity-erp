BEGIN;

ALTER TABLE app_users ADD COLUMN employee_id uuid REFERENCES employees(id);
CREATE UNIQUE INDEX ux_app_users_employee ON app_users(employee_id) WHERE employee_id IS NOT NULL;

COMMIT;
