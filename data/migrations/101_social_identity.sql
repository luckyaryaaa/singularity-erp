BEGIN;

-- 101 · Singularity — social login (OIDC). Menautkan identitas provider
-- (Google/Microsoft/SSO generik) ke app_users, dan menyimpan email untuk
-- pencocokan. Tabel auth global (tanpa RLS), konsisten dengan infra auth;
-- unik (provider, provider_subject) global — satu akun provider = satu user.

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS email varchar(160);
CREATE INDEX IF NOT EXISTS ix_app_users_email ON app_users (lower(email)) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS user_identities (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  tenant_id        uuid,
  provider         varchar(40)  NOT NULL,
  provider_subject varchar(255) NOT NULL,
  email            varchar(160),
  display_name     varchar(160),
  raw              jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  last_login_at    timestamptz,
  UNIQUE (provider, provider_subject)
);
CREATE INDEX IF NOT EXISTS ix_user_identities_user ON user_identities (user_id);

COMMIT;
