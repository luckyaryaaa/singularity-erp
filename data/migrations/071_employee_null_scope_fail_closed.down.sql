BEGIN;

CREATE OR REPLACE FUNCTION app_employee_visible(target uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT current_setting('app.is_system', true) = 'on'
      OR current_setting('app.cross_branch', true) = 'on'
      OR EXISTS (
        SELECT 1
          FROM employees e
         WHERE e.id = target
           AND app_branch_visible(e.branch_id)
      );
$$;

DROP POLICY IF EXISTS employees_branch_isolation ON employees;
CREATE POLICY employees_branch_isolation ON employees
  USING (app_branch_visible(branch_id))
  WITH CHECK (app_branch_visible(branch_id));

COMMIT;
