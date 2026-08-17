BEGIN;

-- 092 · Singularity Fase 0 — tranche A: tenant_id + RLS pada tabel transaksi inti.
--
-- Empat tabel ini SUDAH ber-RLS dengan policy branch_scope PERMISSIVE (migrasi
-- 045). Kita tambahkan tenant_id (backfill Tenant #001/MAT) dan policy tenant
-- RESTRICTIVE. PostgreSQL meng-AND-kan restrictive dengan permissive, sehingga
-- efektifnya menjadi:  branch_scope (permissive)  AND  tenant_isolation.
-- Membuat tenant PERMISSIVE akan salah (branch OR tenant) dan bocor untuk peran
-- cross-branch. RLS sudah ENABLE dari 045 — tidak perlu ENABLE ulang.
--
-- Konteks dibaca dari app.tenant_id / app.is_platform (transaction.js). Tabel
-- turunan yang cakupannya diwarisi lewat join menyusul pada tranche berikutnya.

-- ── business_documents (pusat seluruh transaksi) ─────────────────────────────
ALTER TABLE business_documents ADD COLUMN tenant_id uuid;
UPDATE business_documents SET tenant_id = (SELECT id FROM tenants WHERE code = 'mat') WHERE tenant_id IS NULL;
ALTER TABLE business_documents ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE business_documents ALTER COLUMN tenant_id SET DEFAULT COALESCE(nullif(current_setting('app.tenant_id', true), '')::uuid, '00000000-0000-0000-0000-000000000001'::uuid);
ALTER TABLE business_documents ADD CONSTRAINT business_documents_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id);
CREATE INDEX business_documents_tenant_idx ON business_documents(tenant_id);
CREATE POLICY tenant_isolation ON business_documents AS RESTRICTIVE
  USING (app_tenant_visible(tenant_id)) WITH CHECK (app_tenant_visible(tenant_id));

-- ── inventory_balances ───────────────────────────────────────────────────────
ALTER TABLE inventory_balances ADD COLUMN tenant_id uuid;
UPDATE inventory_balances SET tenant_id = (SELECT id FROM tenants WHERE code = 'mat') WHERE tenant_id IS NULL;
ALTER TABLE inventory_balances ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE inventory_balances ALTER COLUMN tenant_id SET DEFAULT COALESCE(nullif(current_setting('app.tenant_id', true), '')::uuid, '00000000-0000-0000-0000-000000000001'::uuid);
ALTER TABLE inventory_balances ADD CONSTRAINT inventory_balances_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id);
CREATE INDEX inventory_balances_tenant_idx ON inventory_balances(tenant_id);
CREATE POLICY tenant_isolation ON inventory_balances AS RESTRICTIVE
  USING (app_tenant_visible(tenant_id)) WITH CHECK (app_tenant_visible(tenant_id));

-- ── stock_lots ───────────────────────────────────────────────────────────────
ALTER TABLE stock_lots ADD COLUMN tenant_id uuid;
UPDATE stock_lots SET tenant_id = (SELECT id FROM tenants WHERE code = 'mat') WHERE tenant_id IS NULL;
ALTER TABLE stock_lots ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE stock_lots ALTER COLUMN tenant_id SET DEFAULT COALESCE(nullif(current_setting('app.tenant_id', true), '')::uuid, '00000000-0000-0000-0000-000000000001'::uuid);
ALTER TABLE stock_lots ADD CONSTRAINT stock_lots_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id);
CREATE INDEX stock_lots_tenant_idx ON stock_lots(tenant_id);
CREATE POLICY tenant_isolation ON stock_lots AS RESTRICTIVE
  USING (app_tenant_visible(tenant_id)) WITH CHECK (app_tenant_visible(tenant_id));

-- ── notifications ────────────────────────────────────────────────────────────
ALTER TABLE notifications ADD COLUMN tenant_id uuid;
UPDATE notifications SET tenant_id = (SELECT id FROM tenants WHERE code = 'mat') WHERE tenant_id IS NULL;
ALTER TABLE notifications ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE notifications ALTER COLUMN tenant_id SET DEFAULT COALESCE(nullif(current_setting('app.tenant_id', true), '')::uuid, '00000000-0000-0000-0000-000000000001'::uuid);
ALTER TABLE notifications ADD CONSTRAINT notifications_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id);
CREATE INDEX notifications_tenant_idx ON notifications(tenant_id);
CREATE POLICY tenant_isolation ON notifications AS RESTRICTIVE
  USING (app_tenant_visible(tenant_id)) WITH CHECK (app_tenant_visible(tenant_id));

COMMIT;
