BEGIN;

-- 063 — privileged password reset maker-checker and MFA recovery controls.
INSERT INTO permission_catalog(code,module,action,sensitive,description) VALUES
  ('user.reset_password','user','reset_password',true,'Mengusulkan atau menjalankan reset kata sandi terkontrol'),
  ('user.approve_password_reset','user','approve_password_reset',true,'Menyetujui atau menolak reset kata sandi administrator')
ON CONFLICT(code) DO UPDATE SET
  module=EXCLUDED.module,
  action=EXCLUDED.action,
  sensitive=EXCLUDED.sensitive,
  description=EXCLUDED.description,
  active=true;

CREATE TABLE password_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES app_users(id),
  target_class varchar(30) NOT NULL CHECK(target_class IN('PRIVILEGED_ADMIN')),
  status varchar(20) NOT NULL DEFAULT 'PENDING'
    CHECK(status IN('PENDING','COMPLETED','REJECTED','EXPIRED','CANCELLED')),
  reason text NOT NULL CHECK(length(btrim(reason))>=8),
  requested_by uuid NOT NULL REFERENCES app_users(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now()+interval '30 minutes'),
  decided_by uuid REFERENCES app_users(id),
  decided_at timestamptz,
  decision_reason text,
  reset_operation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(expires_at>requested_at),
  CHECK(decided_by IS NULL OR decided_by<>requested_by),
  CHECK(
    (status='PENDING' AND decided_by IS NULL AND decided_at IS NULL AND reset_operation_id IS NULL)
    OR
    (status='COMPLETED' AND decided_by IS NOT NULL AND decided_at IS NOT NULL AND reset_operation_id IS NOT NULL)
    OR
    (status IN('REJECTED','CANCELLED') AND decided_by IS NOT NULL AND decided_at IS NOT NULL)
    OR
    status='EXPIRED'
  )
);
CREATE UNIQUE INDEX ux_password_reset_target_pending
  ON password_reset_requests(target_user_id) WHERE status='PENDING';
CREATE INDEX ix_password_reset_queue
  ON password_reset_requests(status,expires_at,requested_at DESC);

CREATE TABLE mfa_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL,
  code_hash char(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz,
  used_ip inet,
  UNIQUE(user_id,code_hash)
);
CREATE INDEX ix_mfa_recovery_available
  ON mfa_recovery_codes(user_id,created_at DESC) WHERE used_at IS NULL;

COMMIT;
