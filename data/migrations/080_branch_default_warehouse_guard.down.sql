BEGIN;
DROP TRIGGER IF EXISTS trg_branch_default_warehouse ON branches;
DROP FUNCTION IF EXISTS ensure_branch_default_warehouse();
COMMIT;
