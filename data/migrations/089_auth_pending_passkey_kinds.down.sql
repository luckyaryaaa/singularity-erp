BEGIN;

DELETE FROM auth_pending WHERE kind IN ('passkey_reg','passkey_login');
ALTER TABLE auth_pending DROP CONSTRAINT IF EXISTS auth_pending_kind_check;
ALTER TABLE auth_pending ADD CONSTRAINT auth_pending_kind_check
  CHECK (kind IN ('mfa','password_change','mfa_recovery','mfa_setup'));

COMMIT;
