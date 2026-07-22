BEGIN;
-- Rollback 044 — kembalikan role_permissions ke bentuk minimal migrasi 002.
ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_fk;
DROP INDEX IF EXISTS ix_role_permissions_role;
ALTER TABLE role_permissions
  DROP COLUMN IF EXISTS created_at,
  DROP COLUMN IF EXISTS granted_by,
  DROP COLUMN IF EXISTS source,
  DROP COLUMN IF EXISTS active;
COMMIT;
