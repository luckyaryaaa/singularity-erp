BEGIN;

-- 098 · Singularity Fase 1 — Billing & Entitlements (control-plane, global).
--
-- plans: katalog paket sewa dengan entitlements (modul aktif, batas user/cabang,
--   fitur). tenant_subscriptions: langganan tenant (plan + status siklus tagih).
-- Keduanya GLOBAL (dikelola platform, bukan data tenant) — tanpa RLS tenant.
-- entitlements JSON: {"modules":[...] | ["*"], "maxUsers":int|null, "maxBranches":int|null, "features":[...] }
-- "*" berarti semua (Enterprise). null limit = tak terbatas.

CREATE TABLE plans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          varchar(32) NOT NULL UNIQUE CHECK (code ~ '^[a-z][a-z0-9_-]{1,31}$'),
  name          varchar(120) NOT NULL,
  price_monthly numeric(14,2),                 -- NULL = harga kustom/hubungi
  currency      char(3) NOT NULL DEFAULT 'IDR',
  entitlements  jsonb NOT NULL DEFAULT '{}',
  active        boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tenant_subscriptions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid NOT NULL UNIQUE REFERENCES tenants(id),
  plan_id              uuid NOT NULL REFERENCES plans(id),
  status               varchar(16) NOT NULL DEFAULT 'trial'
                         CHECK (status IN ('trial','active','past_due','suspended','cancelled')),
  trial_ends_at        timestamptz,
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end   timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  version              integer NOT NULL DEFAULT 1
);
CREATE INDEX tenant_subscriptions_plan_idx ON tenant_subscriptions(plan_id);

-- Katalog paket
INSERT INTO plans(code,name,price_monthly,entitlements,sort_order) VALUES
  ('starter','Starter', 500000,
    '{"modules":["workspace","masters","sales","inventory","finance","reporting"],"maxUsers":10,"maxBranches":2,"features":[]}', 1),
  ('business','Business', 2500000,
    '{"modules":["workspace","masters","organization","sales","procurement","operations","inventory","production","finance","hr","reporting"],"maxUsers":50,"maxBranches":10,"features":["advanced_pricing","crm"]}', 2),
  ('enterprise','Enterprise', NULL,
    '{"modules":["*"],"maxUsers":null,"maxBranches":null,"features":["*"]}', 3);

-- Tenant #001 (MAT) → Enterprise, aktif.
INSERT INTO tenant_subscriptions(tenant_id, plan_id, status, current_period_end)
  SELECT '00000000-0000-0000-0000-000000000001', id, 'active', now() + interval '1 year'
  FROM plans WHERE code = 'enterprise';

COMMIT;
