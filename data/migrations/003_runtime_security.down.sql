BEGIN;
DROP INDEX IF EXISTS ix_idempotency_expiry;
DROP INDEX IF EXISTS ix_sessions_expiry;
DROP INDEX IF EXISTS ix_app_users_role_branch;
ALTER TABLE business_documents DROP CONSTRAINT IF EXISTS ck_document_version_positive;
ALTER TABLE app_users
  DROP CONSTRAINT IF EXISTS ck_app_users_role,
  DROP COLUMN IF EXISTS last_login_at,
  DROP COLUMN IF EXISTS must_change_password,
  DROP COLUMN IF EXISTS totp_secret_ciphertext,
  DROP COLUMN IF EXISTS mfa_enabled,
  DROP COLUMN IF EXISTS owner_pin_hash,
  DROP COLUMN IF EXISTS branch_scope,
  DROP COLUMN IF EXISTS job_title,
  DROP COLUMN IF EXISTS department,
  DROP COLUMN IF EXISTS role;
COMMIT;
