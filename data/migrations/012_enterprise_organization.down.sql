-- Rollback 012 — staging saja; jalankan setelah backup terverifikasi.
BEGIN;
ALTER TABLE inventory_movements DROP COLUMN IF EXISTS bin_id, DROP COLUMN IF EXISTS storage_location_id, DROP COLUMN IF EXISTS org_warehouse_id;
DROP INDEX IF EXISTS ix_documents_cost_center;
ALTER TABLE business_documents
  DROP COLUMN IF EXISTS project_wbs_id, DROP COLUMN IF EXISTS profit_center_id,
  DROP COLUMN IF EXISTS cost_center_id, DROP COLUMN IF EXISTS department_id,
  DROP COLUMN IF EXISTS legal_entity_id;
DROP TABLE IF EXISTS project_wbs;
DROP TABLE IF EXISTS work_centers;
DROP TABLE IF EXISTS warehouse_bins;
DROP TABLE IF EXISTS storage_locations;
DROP TABLE IF EXISTS org_warehouses;
DROP TABLE IF EXISTS plants;
DROP TABLE IF EXISTS profit_centers;
DROP TABLE IF EXISTS cost_centers;
DROP TABLE IF EXISTS departments;
ALTER TABLE branches DROP COLUMN IF EXISTS business_unit_id, DROP COLUMN IF EXISTS legal_entity_id;
DROP TABLE IF EXISTS business_units;
DROP TABLE IF EXISTS fiscal_calendars;
DROP TABLE IF EXISTS ledgers;
DROP TABLE IF EXISTS legal_entities;
COMMIT;
