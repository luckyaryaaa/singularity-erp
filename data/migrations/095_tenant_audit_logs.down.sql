BEGIN;

DROP POLICY IF EXISTS tenant_isolation ON audit_logs;
DROP POLICY IF EXISTS tenant_rows ON audit_logs;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_tenant_fk;
DROP INDEX IF EXISTS audit_logs_tenant_idx;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS tenant_id;

COMMIT;
