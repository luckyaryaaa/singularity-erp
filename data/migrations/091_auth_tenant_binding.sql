BEGIN;

-- 091 · Singularity Fase 0 — ikat pengguna ke tenant (auth foundation).
-- app_users mendapat tenant_id sehingga sesi/otorisasi dapat membawa tenant
-- pemanggil (resolveSession → user.tenantId → app.tenant_id di transaction.js).
-- Backfill deterministik ke Tenant #001 (MAT). RLS tenant dipasang di sini
-- karena pengguna adalah data per-tenant; login & resolveSession berjalan dalam
-- konteks PLATFORM (loginTransaction & awal request), jadi tetap dapat membaca
-- baris lintas-tenant untuk resolusi — RLS baru menyaring pada konteks tenant.
--
-- Catatan: keunikan `username` DIPERTAHANKAN global untuk Fase 0 (single-tenant
-- MAT). Username per-tenant + login ter-scope tenant menyusul di Fase 1 bersama
-- Tenant Resolver (domain → tenant), agar username sama boleh dipakai lintas
-- perusahaan tanpa ambiguitas saat login.

ALTER TABLE app_users ADD COLUMN tenant_id uuid;
UPDATE app_users SET tenant_id = (SELECT id FROM tenants WHERE code = 'mat') WHERE tenant_id IS NULL;
ALTER TABLE app_users ALTER COLUMN tenant_id SET NOT NULL;
-- Default dari konteks sesi: INSERT tanpa tenant_id otomatis memakai tenant
-- pemanggil (app.tenant_id) → repository/seed TIDAK perlu diubah. Fase 0
-- single-tenant: bila konteks kosong (job/worker/platform/bootstrap), jatuh ke
-- MAT (#001) sebagai satu-satunya tenant agar aplikasi tetap berjalan penuh.
-- Multi-tenant (Fase 1) mengganti fallback ini dengan worker tenant-aware (§7)
-- sehingga penulisan platform WAJIB menyebut tenant secara eksplisit.
ALTER TABLE app_users ALTER COLUMN tenant_id SET DEFAULT COALESCE(nullif(current_setting('app.tenant_id', true), '')::uuid, '00000000-0000-0000-0000-000000000001'::uuid);
ALTER TABLE app_users ADD CONSTRAINT app_users_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id);
CREATE INDEX app_users_tenant_idx ON app_users(tenant_id);

-- app_users belum punya policy permissive apa pun (tidak masuk tranche branch 045),
-- jadi butuh baseline permissive + isolasi tenant RESTRICTIVE (di-AND-kan).
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_rows ON app_users USING (true) WITH CHECK (true);
CREATE POLICY tenant_isolation ON app_users AS RESTRICTIVE
  USING (app_tenant_visible(tenant_id))
  WITH CHECK (app_tenant_visible(tenant_id));

COMMIT;
