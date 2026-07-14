-- 003_runtime_security.sql — kolom runtime auth/ABAC dan constraint produksi.
BEGIN;

ALTER TABLE app_users
  ADD COLUMN role varchar(40) NOT NULL DEFAULT 'employee',
  ADD COLUMN department varchar(80),
  ADD COLUMN job_title varchar(120),
  ADD COLUMN branch_scope varchar(20),
  ADD COLUMN owner_pin_hash text,
  ADD COLUMN mfa_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN totp_secret_ciphertext text,
  ADD COLUMN must_change_password boolean NOT NULL DEFAULT true,
  ADD COLUMN last_login_at timestamptz,
  ADD CONSTRAINT ck_app_users_role CHECK (role IN ('owner','admin','finance','accounting','tax','hrd','sales','procurement','warehouse','production','employee'));

CREATE INDEX ix_app_users_role_branch ON app_users(role,branch_id) WHERE active;
CREATE INDEX ix_sessions_expiry ON user_sessions(expires_at) WHERE active;
CREATE INDEX ix_idempotency_expiry ON idempotency_records(expires_at);

ALTER TABLE business_documents
  ADD CONSTRAINT ck_document_version_positive CHECK (version > 0);

-- Audit tidak boleh diubah/dihapus oleh role runtime; INSERT/SELECT diberikan
-- oleh grant-runtime, UPDATE/DELETE dicabut eksplisit setelah migration.
COMMIT;
