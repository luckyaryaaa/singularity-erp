BEGIN;

-- 088 · Passkey / fingerprint (WebAuthn) self-service.
-- Menyimpan kredensial kunci publik FIDO2 per pengguna. Kunci privat tidak
-- pernah meninggalkan perangkat (TPM/Secure Enclave); server hanya menyimpan
-- kunci publik (JWK), credential id, dan sign counter untuk deteksi kloning.
CREATE TABLE webauthn_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  credential_id text NOT NULL UNIQUE,
  public_key jsonb NOT NULL,
  sign_count bigint NOT NULL DEFAULT 0,
  transports text,
  label text,
  user_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
CREATE INDEX webauthn_credentials_user_idx ON webauthn_credentials(user_id);

COMMENT ON TABLE webauthn_credentials IS
  'FIDO2/WebAuthn public-key credentials for passkey & fingerprint login; private keys stay on-device.';

COMMIT;
