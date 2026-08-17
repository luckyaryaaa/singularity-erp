BEGIN;

-- 097 · Singularity Fase 1 — re-scope unique identity tenant-level ke
-- (tenant_id, ...), sehingga tenant baru boleh memakai ulang kode/nomor yang
-- sudah dipakai tenant lain (mis. version numbering, nomor dokumen, kode
-- produk/customer/supplier/COA/plant, nomor CAPA/dunning/NCR).
--
-- TIDAK diubah:
--  • Constraint yang sudah ter-scope lewat parent FK (document_id, employee_id,
--    legal_entity_id, product_id, dst) — sudah unik per tenant via induknya.
--  • `app_users.username` — SENGAJA tetap global: login lintas-tenant memakai
--    username global (tanpa perlu tahu tenant lebih dulu). Same-username
--    per-tenant + login ter-scope adalah refinement fase berikutnya.
--
-- Aman: tidak ada `ON CONFLICT (kolom)` maupun referensi nama constraint di kode.
-- Query aplikasi ter-scope RLS (WHERE code=? hanya melihat baris tenant), jadi
-- perilaku single-tenant tidak berubah.

ALTER TABLE numbering_configurations DROP CONSTRAINT numbering_configurations_version_key,
  ADD CONSTRAINT numbering_configurations_tenant_version_key UNIQUE (tenant_id, version);
ALTER TABLE business_documents DROP CONSTRAINT business_documents_document_number_key,
  ADD CONSTRAINT business_documents_tenant_document_number_key UNIQUE (tenant_id, document_number);
ALTER TABLE products DROP CONSTRAINT products_code_key,
  ADD CONSTRAINT products_tenant_code_key UNIQUE (tenant_id, code);
ALTER TABLE customers DROP CONSTRAINT customers_code_key,
  ADD CONSTRAINT customers_tenant_code_key UNIQUE (tenant_id, code);
ALTER TABLE suppliers DROP CONSTRAINT suppliers_code_key,
  ADD CONSTRAINT suppliers_tenant_code_key UNIQUE (tenant_id, code);
ALTER TABLE chart_of_accounts DROP CONSTRAINT chart_of_accounts_code_key,
  ADD CONSTRAINT chart_of_accounts_tenant_code_key UNIQUE (tenant_id, code);
ALTER TABLE plants DROP CONSTRAINT plants_code_key,
  ADD CONSTRAINT plants_tenant_code_key UNIQUE (tenant_id, code);
ALTER TABLE asset_categories DROP CONSTRAINT asset_categories_code_key,
  ADD CONSTRAINT asset_categories_tenant_code_key UNIQUE (tenant_id, code);
ALTER TABLE capa_cases DROP CONSTRAINT capa_cases_case_number_key,
  ADD CONSTRAINT capa_cases_tenant_case_number_key UNIQUE (tenant_id, case_number);
ALTER TABLE dunning_notices DROP CONSTRAINT dunning_notices_notice_number_key,
  ADD CONSTRAINT dunning_notices_tenant_notice_number_key UNIQUE (tenant_id, notice_number);
ALTER TABLE qc_inspections DROP CONSTRAINT qc_inspections_ncr_number_key,
  ADD CONSTRAINT qc_inspections_tenant_ncr_number_key UNIQUE (tenant_id, ncr_number);

-- Partial unique INDEX (bukan constraint): "satu numbering aktif" harus PER
-- TENANT, bukan global — jika tidak, tenant baru tak bisa punya numbering aktif.
DROP INDEX ux_numbering_active;
CREATE UNIQUE INDEX ux_numbering_active ON numbering_configurations (tenant_id) WHERE active;

COMMIT;
