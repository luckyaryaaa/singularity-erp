BEGIN;
DELETE FROM auth_pending WHERE kind='mfa_setup';
DROP INDEX IF EXISTS ix_auth_pending_user_kind;
ALTER TABLE auth_pending DROP COLUMN payload;
ALTER TABLE auth_pending DROP CONSTRAINT auth_pending_kind_check;
ALTER TABLE auth_pending ADD CONSTRAINT auth_pending_kind_check CHECK(kind IN('mfa','password_change','mfa_recovery'));
COMMIT;
