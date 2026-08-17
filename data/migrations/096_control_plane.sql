BEGIN;

-- 096 · Singularity Fase 1 — Control Plane foundation.
--
-- Bidang kontrol (provisioning/lifecycle tenant) TERPISAH dari data plane.
-- Kedua tabel ini GLOBAL (bukan tenant-scoped) — memang lintas-tenant, dikelola
-- operator platform. Operator platform ≠ pengguna tenant biasa: hanya user yang
-- terdaftar di platform_operators yang boleh menjalankan aksi control-plane.

CREATE TABLE platform_operators (
  user_id    uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES app_users(id),
  note       text
);
COMMENT ON TABLE platform_operators IS
  'Users authorized for Singularity control-plane actions (tenant provisioning/lifecycle). Global, NOT tenant-scoped.';

-- Bootstrap: owner Tenant #001 (MAT) menjadi operator platform awal. Di produksi
-- sebaiknya identitas operator dipisah dari pengguna tenant; ini seed dev.
INSERT INTO platform_operators(user_id)
  SELECT id FROM app_users
  WHERE role = 'owner' AND tenant_id = '00000000-0000-0000-0000-000000000001'
  ON CONFLICT (user_id) DO NOTHING;

-- Audit control-plane (terpisah dari audit tenant).
CREATE TABLE tenant_provisioning_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid REFERENCES tenants(id),
  action        varchar(24) NOT NULL
                  CHECK (action IN ('provision','suspend','resume','offboard','create_owner')),
  actor_user_id uuid REFERENCES app_users(id),
  detail        jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tenant_provisioning_log_tenant_idx ON tenant_provisioning_log(tenant_id);

COMMIT;
