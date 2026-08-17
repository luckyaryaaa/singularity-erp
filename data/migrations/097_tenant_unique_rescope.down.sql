BEGIN;
-- Kembali ke unique global. Catatan: bila sudah ada >1 tenant memakai kode/versi
-- yang sama, rollback ini akan gagal (duplikat) — konsekuensi wajar setelah
-- data multi-tenant terbentuk.
ALTER TABLE numbering_configurations DROP CONSTRAINT numbering_configurations_tenant_version_key,
  ADD CONSTRAINT numbering_configurations_version_key UNIQUE (version);
ALTER TABLE business_documents DROP CONSTRAINT business_documents_tenant_document_number_key,
  ADD CONSTRAINT business_documents_document_number_key UNIQUE (document_number);
ALTER TABLE products DROP CONSTRAINT products_tenant_code_key, ADD CONSTRAINT products_code_key UNIQUE (code);
ALTER TABLE customers DROP CONSTRAINT customers_tenant_code_key, ADD CONSTRAINT customers_code_key UNIQUE (code);
ALTER TABLE suppliers DROP CONSTRAINT suppliers_tenant_code_key, ADD CONSTRAINT suppliers_code_key UNIQUE (code);
ALTER TABLE chart_of_accounts DROP CONSTRAINT chart_of_accounts_tenant_code_key, ADD CONSTRAINT chart_of_accounts_code_key UNIQUE (code);
ALTER TABLE plants DROP CONSTRAINT plants_tenant_code_key, ADD CONSTRAINT plants_code_key UNIQUE (code);
ALTER TABLE asset_categories DROP CONSTRAINT asset_categories_tenant_code_key, ADD CONSTRAINT asset_categories_code_key UNIQUE (code);
ALTER TABLE capa_cases DROP CONSTRAINT capa_cases_tenant_case_number_key, ADD CONSTRAINT capa_cases_case_number_key UNIQUE (case_number);
ALTER TABLE dunning_notices DROP CONSTRAINT dunning_notices_tenant_notice_number_key, ADD CONSTRAINT dunning_notices_notice_number_key UNIQUE (notice_number);
ALTER TABLE qc_inspections DROP CONSTRAINT qc_inspections_tenant_ncr_number_key, ADD CONSTRAINT qc_inspections_ncr_number_key UNIQUE (ncr_number);
DROP INDEX ux_numbering_active;
CREATE UNIQUE INDEX ux_numbering_active ON numbering_configurations (active) WHERE active;
COMMIT;
