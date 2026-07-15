-- 017_enterprise_organization_employee.sql — R014 Enterprise Organization & Employee.
-- Identity governance, organization assets/tax/banks, employee controlled changes,
-- and immutable organization snapshots on business documents.
BEGIN;

ALTER TABLE legal_entities
  ADD COLUMN business_field varchar(160),
  ADD COLUMN tagline varchar(240),
  ADD COLUMN legal_address text,
  ADD COLUMN operational_address text,
  ADD COLUMN whatsapp varchar(40),
  ADD COLUMN document_footer text,
  ADD COLUMN lifecycle_status varchar(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (lifecycle_status IN ('DRAFT','PENDING_REVIEW','APPROVED','ACTIVE','SUSPENDED','BLOCKED','OBSOLETE','ARCHIVED')),
  ADD COLUMN mdm_version integer NOT NULL DEFAULT 1,
  ADD COLUMN effective_from date,
  ADD COLUMN effective_to date,
  ADD COLUMN change_reason text,
  ADD COLUMN data_steward uuid REFERENCES app_users(id);
UPDATE legal_entities
SET legal_address=COALESCE(legal_address,address), operational_address=COALESCE(operational_address,address), effective_from=COALESCE(effective_from,current_date);

ALTER TABLE work_locations
  ADD COLUMN legal_entity_id uuid REFERENCES legal_entities(id),
  ADD COLUMN plant_id uuid REFERENCES plants(id),
  ADD COLUMN address text,
  ADD COLUMN effective_from date NOT NULL DEFAULT current_date,
  ADD COLUMN effective_to date;
UPDATE work_locations w SET legal_entity_id=b.legal_entity_id FROM branches b WHERE b.id=w.branch_id AND w.legal_entity_id IS NULL;

CREATE TABLE organization_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_entity_id uuid NOT NULL REFERENCES legal_entities(id),
  asset_type varchar(30) NOT NULL CHECK (asset_type IN ('APPLICATION_LOGO','LETTERHEAD_LOGO','STAMP','SIGNATURE','LEGAL_DOCUMENT','OTHER')),
  title varchar(160) NOT NULL,
  file_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  effective_from date NOT NULL DEFAULT current_date,
  effective_to date,
  status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT','ACTIVE','SUPERSEDED','ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);
CREATE INDEX ix_org_assets_entity_type ON organization_assets(legal_entity_id,asset_type,status);

CREATE TABLE organization_signatories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_entity_id uuid NOT NULL REFERENCES legal_entities(id),
  employee_id uuid REFERENCES employees(id),
  signatory_name varchar(160) NOT NULL, position_title varchar(120) NOT NULL,
  document_types text[] NOT NULL DEFAULT ARRAY[]::text[],
  signature_asset_id uuid REFERENCES organization_assets(id),
  effective_from date NOT NULL DEFAULT current_date, effective_to date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE TABLE organization_tax_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_entity_id uuid NOT NULL REFERENCES legal_entities(id), branch_id uuid REFERENCES branches(id),
  identity_type varchar(30) NOT NULL CHECK (identity_type IN ('NPWP','NITKU','PKP','NIB','OTHER')),
  identity_number varchar(80) NOT NULL, registered_name varchar(200),
  effective_from date NOT NULL DEFAULT current_date, effective_to date,
  status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT','ACTIVE','SUSPENDED','ARCHIVED')),
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id),
  UNIQUE(legal_entity_id,identity_type,identity_number),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);
CREATE UNIQUE INDEX ux_org_tax_primary ON organization_tax_identities(legal_entity_id,identity_type) WHERE is_primary AND status='ACTIVE';

CREATE TABLE company_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_entity_id uuid NOT NULL REFERENCES legal_entities(id), branch_id uuid REFERENCES branches(id),
  bank_name varchar(120) NOT NULL, account_number varchar(80) NOT NULL, account_holder varchar(200) NOT NULL,
  currency char(3) NOT NULL DEFAULT 'IDR', usage_purpose varchar(80) NOT NULL DEFAULT 'OPERATING',
  effective_from date NOT NULL DEFAULT current_date, effective_to date,
  verification_status varchar(24) NOT NULL DEFAULT 'PENDING_VERIFICATION'
    CHECK (verification_status IN ('PENDING_VERIFICATION','VERIFIED','REJECTED','RETIRED')),
  is_primary boolean NOT NULL DEFAULT false, qr_payload jsonb,
  proposed_by uuid NOT NULL REFERENCES app_users(id), proposed_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid REFERENCES app_users(id), approved_at timestamptz,
  rejected_by uuid REFERENCES app_users(id), rejected_at timestamptz, rejection_reason text,
  change_reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (approved_by IS NULL OR approved_by <> proposed_by),
  CHECK (rejected_by IS NULL OR rejected_by <> proposed_by),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);
CREATE INDEX ix_company_bank_entity ON company_bank_accounts(legal_entity_id,verification_status,created_at DESC);
CREATE UNIQUE INDEX ux_company_bank_primary ON company_bank_accounts(legal_entity_id,currency,usage_purpose)
  WHERE is_primary AND verification_status='VERIFIED' AND effective_to IS NULL;

ALTER TABLE business_documents
  ADD COLUMN organization_identity_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX ix_documents_org_identity ON business_documents USING gin(organization_identity_snapshot);

ALTER TABLE user_sessions ADD COLUMN mfa_verified_at timestamptz;

ALTER TABLE employee_compensation_history
  ADD COLUMN effective_to date,
  ADD COLUMN version integer NOT NULL DEFAULT 1,
  ADD COLUMN approval_status varchar(20) NOT NULL DEFAULT 'PENDING_APPROVAL'
    CHECK (approval_status IN ('PENDING_APPROVAL','APPROVED','REJECTED','SUPERSEDED')),
  ADD COLUMN approved_at timestamptz,
  ADD COLUMN rejected_by uuid REFERENCES app_users(id),
  ADD COLUMN rejected_at timestamptz,
  ADD COLUMN rejection_reason text,
  ADD CONSTRAINT ck_emp_comp_checker CHECK (approved_by IS NULL OR approved_by <> created_by),
  ADD CONSTRAINT ck_emp_comp_period CHECK (effective_to IS NULL OR effective_to >= effective_from);

ALTER TABLE employee_tax_profiles
  ADD COLUMN effective_to date,
  ADD COLUMN ter_rate numeric(8,5),
  ADD COLUMN calculation_version varchar(30) NOT NULL DEFAULT '2026-01',
  ADD COLUMN rule_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD CONSTRAINT ck_emp_tax_period CHECK (effective_to IS NULL OR effective_to >= effective_from);

DROP INDEX ux_emp_bank_primary;
ALTER TABLE employee_bank_accounts
  ADD COLUMN currency char(3) NOT NULL DEFAULT 'IDR',
  ADD COLUMN effective_to date,
  ADD COLUMN change_reason text,
  ADD COLUMN approved_at timestamptz,
  ADD COLUMN rejected_by uuid REFERENCES app_users(id),
  ADD COLUMN rejected_at timestamptz,
  ADD COLUMN rejection_reason text,
  ADD CONSTRAINT ck_emp_bank_checker CHECK (approved_by IS NULL OR approved_by <> proposed_by),
  ADD CONSTRAINT ck_emp_bank_period CHECK (effective_to IS NULL OR effective_to >= effective_from);
UPDATE employee_bank_accounts SET verification_status='VERIFIED', change_reason='Migrasi data eksisting' WHERE verification_status='UNVERIFIED';
CREATE UNIQUE INDEX ux_emp_bank_primary_verified ON employee_bank_accounts(employee_id)
  WHERE is_primary AND verification_status='VERIFIED' AND effective_to IS NULL;
CREATE UNIQUE INDEX ux_emp_bank_number ON employee_bank_accounts(employee_id,account_number)
  WHERE verification_status <> 'REJECTED';

CREATE TABLE employee_insurance_claim_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), employee_id uuid NOT NULL REFERENCES employees(id),
  insurance_profile_id uuid REFERENCES employee_insurance_profiles(id), claim_number varchar(80),
  claim_date date NOT NULL, claim_type varchar(80), amount numeric(20,2) NOT NULL DEFAULT 0 CHECK (amount>=0),
  status varchar(20) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED','IN_REVIEW','APPROVED','REJECTED','PAID')),
  notes text, created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id)
);

CREATE TABLE employee_restricted_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), employee_id uuid NOT NULL REFERENCES employees(id),
  record_type varchar(30) NOT NULL CHECK (record_type IN ('MEDICAL','DISCIPLINARY','BACKGROUND_CHECK','LEGAL','OTHER')),
  title varchar(160) NOT NULL, restricted_notes text NOT NULL, file_id uuid,
  effective_from date NOT NULL DEFAULT current_date, effective_to date,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE UNIQUE INDEX ux_employee_personal_nik_ktp ON employee_personal_profiles(nik_ktp) WHERE nik_ktp IS NOT NULL;
CREATE UNIQUE INDEX ux_employee_tax_npwp ON employee_tax_profiles(npwp) WHERE npwp IS NOT NULL AND effective_to IS NULL;

COMMIT;
