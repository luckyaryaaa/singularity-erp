-- Rollback 013 — staging saja; jalankan setelah backup terverifikasi.
BEGIN;
DROP TABLE IF EXISTS product_cost_revisions;
DROP TABLE IF EXISTS bom_lines;
DROP TABLE IF EXISTS bom_headers;
DROP TABLE IF EXISTS product_files;
DROP TABLE IF EXISTS product_uom_conversions;
ALTER TABLE products
  DROP COLUMN IF EXISTS variant_attributes, DROP COLUMN IF EXISTS parent_product_id,
  DROP COLUMN IF EXISTS inspection_required, DROP COLUMN IF EXISTS lot_required,
  DROP COLUMN IF EXISTS serial_required, DROP COLUMN IF EXISTS is_stock,
  DROP COLUMN IF EXISTS make_or_buy, DROP COLUMN IF EXISTS drawing_revision,
  DROP COLUMN IF EXISTS drawing_number, DROP COLUMN IF EXISTS weight_kg,
  DROP COLUMN IF EXISTS dimensions, DROP COLUMN IF EXISTS specification,
  DROP COLUMN IF EXISTS grade, DROP COLUMN IF EXISTS material_type,
  DROP COLUMN IF EXISTS category, DROP COLUMN IF EXISTS product_type;
DROP TABLE IF EXISTS supplier_evaluations;
DROP TABLE IF EXISTS supplier_price_history;
DROP TABLE IF EXISTS supplier_materials;
DROP TABLE IF EXISTS supplier_bank_accounts;
DROP TABLE IF EXISTS supplier_addresses;
DROP TABLE IF EXISTS supplier_contacts;
ALTER TABLE suppliers
  DROP COLUMN IF EXISTS coi_declared, DROP COLUMN IF EXISTS risk_level,
  DROP COLUMN IF EXISTS onboarding_status, DROP COLUMN IF EXISTS withholding_eligible,
  DROP COLUMN IF EXISTS pph_treatment, DROP COLUMN IF EXISTS ppn_treatment,
  DROP COLUMN IF EXISTS legal_name, DROP COLUMN IF EXISTS supplier_type;
DROP TABLE IF EXISTS customer_product_prices;
DROP TABLE IF EXISTS customer_addresses;
DROP TABLE IF EXISTS customer_contacts;
ALTER TABLE customers
  DROP COLUMN IF EXISTS tax_treatment, DROP COLUMN IF EXISTS collection_status,
  DROP COLUMN IF EXISTS credit_hold, DROP COLUMN IF EXISTS currency,
  DROP COLUMN IF EXISTS assigned_sales, DROP COLUMN IF EXISTS customer_since,
  DROP COLUMN IF EXISTS risk_rating, DROP COLUMN IF EXISTS website,
  DROP COLUMN IF EXISTS business_category, DROP COLUMN IF EXISTS ppn_status,
  DROP COLUMN IF EXISTS legal_name, DROP COLUMN IF EXISTS customer_type;
DROP TABLE IF EXISTS employee_access_assignments;
DROP TABLE IF EXISTS employee_emergency_contacts;
DROP TABLE IF EXISTS employee_certifications;
DROP TABLE IF EXISTS employee_documents;
DROP TABLE IF EXISTS employee_bank_accounts;
DROP TABLE IF EXISTS employee_insurance_profiles;
DROP TABLE IF EXISTS employee_bpjs_profiles;
DROP TABLE IF EXISTS employee_tax_profiles;
DROP TABLE IF EXISTS employee_compensation_history;
DROP TABLE IF EXISTS employee_contracts;
DROP TABLE IF EXISTS employee_employment_history;
DROP TABLE IF EXISTS employee_positions;
DROP TABLE IF EXISTS employee_personal_profiles;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['customers','suppliers','products','employees'] LOOP
    EXECUTE format('ALTER TABLE %I
      DROP COLUMN IF EXISTS data_steward, DROP COLUMN IF EXISTS change_reason,
      DROP COLUMN IF EXISTS effective_to, DROP COLUMN IF EXISTS effective_from,
      DROP COLUMN IF EXISTS mdm_version, DROP COLUMN IF EXISTS lifecycle_status', t);
  END LOOP;
END $$;
COMMIT;
