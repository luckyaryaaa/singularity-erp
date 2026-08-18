BEGIN;

-- 102 · Singularity Fase 1 (W1 Commercialize) — Metering & Platform Invoicing.
--
-- Melengkapi "Singularity bisa menyewakan mandiri": platform merekam pemakaian
-- per tenant lalu MENERBITKAN tagihan (base langganan + overage metered + PPN).
--
-- plan_meters          : definisi metrik ter-tagih per paket (kuota + harga overage).
-- tenant_usage_events  : event pemakaian eksplisit (mis. api_calls). Metrik lain
--                        (seats/documents/storage) dihitung dari tabel sumber saat generate.
-- platform_invoices/_lines : tagihan yang diterbitkan PLATFORM ke tenant.
--
-- Semua GLOBAL (dikelola platform, bukan data tenant) — tanpa RLS tenant,
-- konsisten dgn plans/tenant_subscriptions (098). Tabel baru otomatis ter-grant
-- ke runtime role via ALTER DEFAULT PRIVILEGES.

CREATE TABLE plan_meters (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id      uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  metric       varchar(24) NOT NULL CHECK (metric IN ('seats','documents','storage_gb','api_calls')),
  label        varchar(80) NOT NULL,
  unit         varchar(24) NOT NULL DEFAULT 'unit',
  included_qty numeric(16,2) NOT NULL DEFAULT 0 CHECK (included_qty >= 0),
  unit_price   numeric(14,4) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  UNIQUE (plan_id, metric)
);

CREATE TABLE tenant_usage_events (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  metric      varchar(24) NOT NULL,
  quantity    numeric(16,2) NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  source      varchar(40),
  meta        jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX tenant_usage_events_idx ON tenant_usage_events(tenant_id, metric, occurred_at DESC);

CREATE TABLE platform_invoices (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id),
  invoice_number varchar(48) NOT NULL UNIQUE,
  period_start   date NOT NULL,
  period_end     date NOT NULL,
  currency       char(3) NOT NULL DEFAULT 'IDR',
  subtotal       numeric(16,2) NOT NULL DEFAULT 0,
  tax_rate       numeric(6,4) NOT NULL DEFAULT 0.11,
  tax            numeric(16,2) NOT NULL DEFAULT 0,
  total          numeric(16,2) NOT NULL DEFAULT 0,
  status         varchar(12) NOT NULL DEFAULT 'issued' CHECK (status IN ('draft','issued','paid','void')),
  issued_at      timestamptz NOT NULL DEFAULT now(),
  paid_at        timestamptz,
  meta           jsonb NOT NULL DEFAULT '{}',
  version        integer NOT NULL DEFAULT 1,
  UNIQUE (tenant_id, period_start)
);
CREATE INDEX platform_invoices_tenant_idx ON platform_invoices(tenant_id, period_start DESC);

CREATE TABLE platform_invoice_lines (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid NOT NULL REFERENCES platform_invoices(id) ON DELETE CASCADE,
  kind        varchar(16) NOT NULL CHECK (kind IN ('subscription','overage','adjustment')),
  description varchar(160) NOT NULL,
  metric      varchar(24),
  quantity    numeric(16,2) NOT NULL DEFAULT 1,
  unit_price  numeric(14,4) NOT NULL DEFAULT 0,
  amount      numeric(16,2) NOT NULL DEFAULT 0,
  sort_order  integer NOT NULL DEFAULT 0
);
CREATE INDEX platform_invoice_lines_inv_idx ON platform_invoice_lines(invoice_id, sort_order);

-- Metered rates untuk paket berbayar. Enterprise = kontrak kustom → tanpa meter
-- (base harga NULL, tidak dikenai overage).
INSERT INTO plan_meters(plan_id, metric, label, unit, included_qty, unit_price)
            SELECT id, 'seats',      'Pengguna',    'user',    10,   50000 FROM plans WHERE code='starter'
  UNION ALL SELECT id, 'documents',  'Dokumen',     'dokumen', 1000, 150   FROM plans WHERE code='starter'
  UNION ALL SELECT id, 'storage_gb', 'Penyimpanan', 'GB',      5,    20000 FROM plans WHERE code='starter'
  UNION ALL SELECT id, 'seats',      'Pengguna',    'user',    50,   40000 FROM plans WHERE code='business'
  UNION ALL SELECT id, 'documents',  'Dokumen',     'dokumen', 10000,100   FROM plans WHERE code='business'
  UNION ALL SELECT id, 'storage_gb', 'Penyimpanan', 'GB',      50,   15000 FROM plans WHERE code='business';

COMMIT;
