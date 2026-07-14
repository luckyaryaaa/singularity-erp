BEGIN;
ALTER TABLE auth_pending DROP CONSTRAINT auth_pending_kind_check;
ALTER TABLE auth_pending ADD CONSTRAINT auth_pending_kind_check CHECK(kind IN('mfa','password_change','mfa_recovery','mfa_setup'));
ALTER TABLE auth_pending ADD COLUMN payload jsonb NOT NULL DEFAULT '{}';
CREATE INDEX ix_auth_pending_user_kind ON auth_pending(user_id,kind,expires_at DESC);
COMMIT;
