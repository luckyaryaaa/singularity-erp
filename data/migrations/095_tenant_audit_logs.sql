BEGIN;

-- 095 · Singularity Fase 0 — tenant_id + RLS pada audit_logs (partitioned).
--
-- audit_logs adalah tabel partisi append-only (runtime hanya INSERT; UPDATE/
-- DELETE di-revoke oleh grant-runtime). Menambah kolom/policy pada PARENT
-- partisi otomatis merambat ke seluruh partisi. Backfill UPDATE dijalankan
-- migrasi sebagai owner (bypass RLS, sebelum RLS diaktifkan). tenant_id memakai
-- fallback-default (COALESCE→MAT #001) sehingga penulisan audit dari konteks
-- platform/worker tetap berhasil; runtime.audit() tidak menyebut tenant_id →
-- default yang mengisi. WITH CHECK aman: audit ditulis dalam transaksi aksi
-- yang membawa tenant pemanggil.

ALTER TABLE audit_logs ADD COLUMN tenant_id uuid;
UPDATE audit_logs SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE audit_logs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN tenant_id
  SET DEFAULT COALESCE(nullif(current_setting('app.tenant_id', true), '')::uuid, '00000000-0000-0000-0000-000000000001'::uuid);
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id);
CREATE INDEX audit_logs_tenant_idx ON audit_logs (tenant_id);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_rows ON audit_logs USING (true) WITH CHECK (true);
CREATE POLICY tenant_isolation ON audit_logs AS RESTRICTIVE
  USING (app_tenant_visible(tenant_id))
  WITH CHECK (app_tenant_visible(tenant_id));

COMMIT;
