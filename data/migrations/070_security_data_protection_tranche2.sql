BEGIN;

-- Security & Data Protection tranche 2
-- 1. Isolate finance/organization/HR data at PostgreSQL row level.
-- 2. Extend application-layer envelope encryption to government identifiers.
-- 3. Keep existing rows deployable; the rotation job performs the online
--    backfill and validates NOT VALID constraints after this migration.

CREATE OR REPLACE FUNCTION app_employee_visible(target uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT current_setting('app.is_system', true) = 'on'
      OR current_setting('app.cross_branch', true) = 'on'
      OR EXISTS (
        SELECT 1
          FROM employees e
         WHERE e.id = target
           AND app_branch_visible(e.branch_id)
      );
$$;

ALTER TABLE financial_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY financial_reports_entity_isolation ON financial_reports
  USING (app_legal_entity_visible(legal_entity_id))
  WITH CHECK (app_legal_entity_visible(legal_entity_id));

ALTER TABLE accounting_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY accounting_periods_entity_isolation ON accounting_periods
  USING (app_legal_entity_visible(legal_entity_id))
  WITH CHECK (app_legal_entity_visible(legal_entity_id));

ALTER TABLE company_bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY company_bank_accounts_scope_isolation ON company_bank_accounts
  USING (app_legal_entity_visible(legal_entity_id) AND app_branch_visible(branch_id))
  WITH CHECK (app_legal_entity_visible(legal_entity_id) AND app_branch_visible(branch_id));

ALTER TABLE organization_tax_identities ENABLE ROW LEVEL SECURITY;
CREATE POLICY organization_tax_identities_scope_isolation ON organization_tax_identities
  USING (app_legal_entity_visible(legal_entity_id) AND app_branch_visible(branch_id))
  WITH CHECK (app_legal_entity_visible(legal_entity_id) AND app_branch_visible(branch_id));

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY employees_branch_isolation ON employees
  USING (app_branch_visible(branch_id))
  WITH CHECK (app_branch_visible(branch_id));

-- All employee-owned aggregates inherit the branch of their employee. This
-- protects direct SQL access too; endpoint permission checks remain the
-- finer-grained control for salary, bank, medical and self-service records.
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
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY employee_scope_isolation ON %I
         USING (app_employee_visible(employee_id))
         WITH CHECK (app_employee_visible(employee_id))',
      table_name
    );
  END LOOP;
END $$;

ALTER TABLE tax_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY tax_records_document_isolation ON tax_records
  USING (
    current_setting('app.is_system', true) = 'on'
    OR current_setting('app.cross_branch', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM business_documents d
       WHERE d.id = tax_records.document_id
         AND app_branch_visible(d.branch_id)
    )
  )
  WITH CHECK (
    current_setting('app.is_system', true) = 'on'
    OR current_setting('app.cross_branch', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM business_documents d
       WHERE d.id = tax_records.document_id
         AND app_branch_visible(d.branch_id)
    )
  );

ALTER TABLE employee_personal_profiles
  ADD COLUMN nik_ktp_ciphertext text,
  ADD COLUMN nik_ktp_key_id varchar(48),
  ADD COLUMN nik_ktp_blind_index char(64);
ALTER TABLE employee_tax_profiles
  ADD COLUMN npwp_ciphertext text,
  ADD COLUMN npwp_key_id varchar(48),
  ADD COLUMN npwp_blind_index char(64);
ALTER TABLE employee_bpjs_profiles
  ADD COLUMN membership_number_ciphertext text,
  ADD COLUMN membership_number_key_id varchar(48),
  ADD COLUMN membership_number_blind_index char(64);
ALTER TABLE organization_tax_identities
  ADD COLUMN identity_number_ciphertext text,
  ADD COLUMN identity_number_key_id varchar(48),
  ADD COLUMN identity_number_blind_index char(64);

ALTER TABLE employee_personal_profiles ADD CONSTRAINT ck_employee_ktp_encrypted
  CHECK(nik_ktp IS NULL OR
    (nik_ktp LIKE 'ENC:%' AND nik_ktp_ciphertext IS NOT NULL
      AND nik_ktp_key_id IS NOT NULL AND nik_ktp_blind_index IS NOT NULL)) NOT VALID;
ALTER TABLE employee_tax_profiles ADD CONSTRAINT ck_employee_npwp_encrypted
  CHECK(npwp IS NULL OR
    (npwp LIKE 'ENC:%' AND npwp_ciphertext IS NOT NULL
      AND npwp_key_id IS NOT NULL AND npwp_blind_index IS NOT NULL)) NOT VALID;
ALTER TABLE employee_bpjs_profiles ADD CONSTRAINT ck_employee_bpjs_encrypted
  CHECK(membership_number IS NULL OR
    (membership_number LIKE 'ENC:%' AND membership_number_ciphertext IS NOT NULL
      AND membership_number_key_id IS NOT NULL
      AND membership_number_blind_index IS NOT NULL)) NOT VALID;
ALTER TABLE organization_tax_identities ADD CONSTRAINT ck_organization_tax_id_encrypted
  CHECK(identity_number LIKE 'ENC:%'
    AND identity_number_ciphertext IS NOT NULL
    AND identity_number_key_id IS NOT NULL
    AND identity_number_blind_index IS NOT NULL) NOT VALID;

DROP INDEX IF EXISTS ux_employee_personal_nik_ktp;
DROP INDEX IF EXISTS ux_employee_tax_npwp;
ALTER TABLE organization_tax_identities
  DROP CONSTRAINT IF EXISTS organization_tax_identities_legal_entity_id_identity_type_identity_number_key;

CREATE UNIQUE INDEX ux_employee_personal_nik_ktp_blind
  ON employee_personal_profiles(nik_ktp_blind_index)
  WHERE nik_ktp_blind_index IS NOT NULL;
CREATE UNIQUE INDEX ux_employee_tax_npwp_blind
  ON employee_tax_profiles(npwp_blind_index)
  WHERE npwp_blind_index IS NOT NULL AND effective_to IS NULL;
CREATE UNIQUE INDEX ux_employee_bpjs_membership_blind
  ON employee_bpjs_profiles(program, membership_number_blind_index)
  WHERE membership_number_blind_index IS NOT NULL;
CREATE UNIQUE INDEX ux_organization_tax_identity_blind
  ON organization_tax_identities(legal_entity_id, identity_type, identity_number_blind_index)
  WHERE identity_number_blind_index IS NOT NULL;

COMMIT;
