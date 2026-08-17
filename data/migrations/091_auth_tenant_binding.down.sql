BEGIN;

DROP POLICY IF EXISTS tenant_isolation ON app_users;
DROP POLICY IF EXISTS tenant_rows ON app_users;
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_tenant_fk;
DROP INDEX IF EXISTS app_users_tenant_idx;
ALTER TABLE app_users DROP COLUMN IF EXISTS tenant_id;

COMMIT;
