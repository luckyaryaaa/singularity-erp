BEGIN;

-- 089 · Izinkan kind challenge WebAuthn pada auth_pending.
-- Registrasi & login passkey menyimpan challenge sekali-pakai berumur pendek di
-- auth_pending; kind-nya harus lolos check constraint yang ada.
ALTER TABLE auth_pending DROP CONSTRAINT IF EXISTS auth_pending_kind_check;
ALTER TABLE auth_pending ADD CONSTRAINT auth_pending_kind_check
  CHECK (kind IN ('mfa','password_change','mfa_recovery','mfa_setup','passkey_reg','passkey_login'));

COMMIT;
