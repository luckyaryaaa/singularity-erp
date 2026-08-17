BEGIN;

-- 100 · Singularity Fase 1 fix — re-scope legal_entities & branches unique
-- identity ke (tenant_id, code). Dua tabel ini TERLEWAT oleh 097.
--
-- Baseline tiap tenant baru (seedTenantBaseline / publicSignup) menanam
-- legal entity `LE01` + branch `HQ`. Dengan UNIQUE(code) GLOBAL, hanya satu
-- tenant yang boleh memakai kode itu, sehingga tenant ke-2+ gagal di
-- seedTenantBaseline (duplicate key legal_entities_code_key) — memblokir
-- BAIK self-service signup MAUPUN control-plane onboard.
--
-- Aman: tidak ada FK yang mereferensikan kolom `code` (semua FK menunjuk `id`),
-- dan tidak ada referensi nama constraint di kode aplikasi. Query aplikasi
-- ter-scope RLS, jadi perilaku single-tenant tidak berubah.

ALTER TABLE legal_entities DROP CONSTRAINT legal_entities_code_key,
  ADD CONSTRAINT legal_entities_tenant_code_key UNIQUE (tenant_id, code);
ALTER TABLE branches DROP CONSTRAINT branches_code_key,
  ADD CONSTRAINT branches_tenant_code_key UNIQUE (tenant_id, code);

COMMIT;
