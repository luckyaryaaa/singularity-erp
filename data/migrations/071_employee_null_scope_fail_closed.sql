BEGIN;

-- Employees are never valid global rows. A missing branch assignment must
-- fail closed for branch-scoped sessions instead of inheriting the generic
-- app_branch_visible(NULL)=true behavior used by legitimate global records.
DROP POLICY IF EXISTS employees_branch_isolation ON employees;
CREATE POLICY employees_branch_isolation ON employees
  USING (
    current_setting('app.is_system', true) = 'on'
    OR current_setting('app.cross_branch', true) = 'on'
    OR (branch_id IS NOT NULL AND app_branch_visible(branch_id))
  )
  WITH CHECK (
    current_setting('app.is_system', true) = 'on'
    OR current_setting('app.cross_branch', true) = 'on'
    OR (branch_id IS NOT NULL AND app_branch_visible(branch_id))
  );

CREATE OR REPLACE FUNCTION app_employee_visible(target uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT current_setting('app.is_system', true) = 'on'
      OR current_setting('app.cross_branch', true) = 'on'
      OR EXISTS (
        SELECT 1
          FROM employees e
         WHERE e.id = target
           AND e.branch_id IS NOT NULL
           AND app_branch_visible(e.branch_id)
      );
$$;

COMMIT;
