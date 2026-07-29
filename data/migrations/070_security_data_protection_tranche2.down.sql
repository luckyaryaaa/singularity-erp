BEGIN;

DROP INDEX IF EXISTS ux_organization_tax_identity_blind;
DROP INDEX IF EXISTS ux_employee_bpjs_membership_blind;
DROP INDEX IF EXISTS ux_employee_tax_npwp_blind;
DROP INDEX IF EXISTS ux_employee_personal_nik_ktp_blind;

ALTER TABLE organization_tax_identities
  DROP CONSTRAINT IF EXISTS ck_organization_tax_id_encrypted,
  DROP COLUMN IF EXISTS identity_number_blind_index,
  DROP COLUMN IF EXISTS identity_number_key_id,
  DROP COLUMN IF EXISTS identity_number_ciphertext;
ALTER TABLE employee_bpjs_profiles
  DROP CONSTRAINT IF EXISTS ck_employee_bpjs_encrypted,
  DROP COLUMN IF EXISTS membership_number_blind_index,
  DROP COLUMN IF EXISTS membership_number_key_id,
  DROP COLUMN IF EXISTS membership_number_ciphertext;
ALTER TABLE employee_tax_profiles
  DROP CONSTRAINT IF EXISTS ck_employee_npwp_encrypted,
  DROP COLUMN IF EXISTS npwp_blind_index,
  DROP COLUMN IF EXISTS npwp_key_id,
  DROP COLUMN IF EXISTS npwp_ciphertext;
ALTER TABLE employee_personal_profiles
  DROP CONSTRAINT IF EXISTS ck_employee_ktp_encrypted,
  DROP COLUMN IF EXISTS nik_ktp_blind_index,
  DROP COLUMN IF EXISTS nik_ktp_key_id,
  DROP COLUMN IF EXISTS nik_ktp_ciphertext;

CREATE UNIQUE INDEX ux_employee_personal_nik_ktp
  ON employee_personal_profiles(nik_ktp) WHERE nik_ktp IS NOT NULL;
CREATE UNIQUE INDEX ux_employee_tax_npwp
  ON employee_tax_profiles(npwp) WHERE npwp IS NOT NULL AND effective_to IS NULL;
ALTER TABLE organization_tax_identities
  ADD CONSTRAINT organization_tax_identities_legal_entity_id_identity_type_identity_number_key
  UNIQUE(legal_entity_id, identity_type, identity_number);

DROP POLICY IF EXISTS tax_records_document_isolation ON tax_records;
ALTER TABLE tax_records DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'payroll_items',
    'attendance_records',
    'leave_balances',
    'payroll_components',
    'employee_personal_profiles',
    'employee_positions',
    'employee_employment_history',
    'employee_contracts',
    'employee_compensation_history',
    'employee_tax_profiles',
    'employee_bpjs_profiles',
    'employee_insurance_profiles',
    'employee_bank_accounts',
    'employee_documents',
    'employee_certifications',
    'employee_emergency_contacts',
    'employee_access_assignments',
    'employee_insurance_claim_history',
    'employee_restricted_records',
    'employee_rosters',
    'attendance_corrections',
    'leave_accrual_entries',
    'position_assignments'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS employee_scope_isolation ON %I', table_name);
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;

DROP POLICY IF EXISTS employees_branch_isolation ON employees;
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organization_tax_identities_scope_isolation ON organization_tax_identities;
ALTER TABLE organization_tax_identities DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_bank_accounts_scope_isolation ON company_bank_accounts;
ALTER TABLE company_bank_accounts DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS accounting_periods_entity_isolation ON accounting_periods;
ALTER TABLE accounting_periods DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS financial_reports_entity_isolation ON financial_reports;
ALTER TABLE financial_reports DISABLE ROW LEVEL SECURITY;

DROP FUNCTION IF EXISTS app_employee_visible(uuid);

COMMIT;
