-- 013_enterprise_master_data.sql — Master data enterprise (R014/R015, §6–§11).
-- Normalisasi employee (13 sub-tabel), customer, supplier, product + lifecycle
-- MDM (DRAFT→…→ARCHIVED), effective date, versioning, dan kontrol maker-checker.
BEGIN;

-- ── Lifecycle MDM pada seluruh master (§6) ───────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['customers','suppliers','products','employees'] LOOP
    EXECUTE format('ALTER TABLE %I
      ADD COLUMN lifecycle_status varchar(20) NOT NULL DEFAULT ''ACTIVE''
        CHECK (lifecycle_status IN (''DRAFT'',''PENDING_REVIEW'',''APPROVED'',''ACTIVE'',''SUSPENDED'',''BLOCKED'',''OBSOLETE'',''ARCHIVED'')),
      ADD COLUMN mdm_version integer NOT NULL DEFAULT 1,
      ADD COLUMN effective_from date,
      ADD COLUMN effective_to date,
      ADD COLUMN change_reason text,
      ADD COLUMN data_steward uuid REFERENCES app_users(id)', t);
  END LOOP;
END $$;

-- ════════════════════════ MASTER EMPLOYEE (§8) ═══════════════════════════════
CREATE TABLE employee_personal_profiles (
  employee_id uuid PRIMARY KEY REFERENCES employees(id),
  nik_ktp varchar(20), birth_place varchar(80), birth_date date,
  gender varchar(10) CHECK (gender IN ('MALE','FEMALE')),
  marital_status varchar(20), religion varchar(30),
  address text, phone varchar(30), personal_email varchar(120),
  blood_type varchar(5),
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid REFERENCES app_users(id)
);

CREATE TABLE employee_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id),
  department_id uuid REFERENCES departments(id),
  division varchar(80), position_title varchar(120) NOT NULL,
  supervisor_employee_id uuid REFERENCES employees(id),
  branch_id uuid REFERENCES branches(id),
  work_location varchar(120), shift_group varchar(40),
  salary_grade varchar(20), payroll_frequency varchar(20) NOT NULL DEFAULT 'MONTHLY',
  commission_eligible boolean NOT NULL DEFAULT false,
  effective_from date NOT NULL, effective_to date,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);
CREATE INDEX ix_emp_positions ON employee_positions(employee_id, effective_from DESC);

CREATE TABLE employee_employment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id),
  employment_type varchar(20) NOT NULL CHECK (employment_type IN ('PERMANENT','CONTRACT','PROBATION','INTERN','OUTSOURCE')),
  employment_status varchar(20) NOT NULL CHECK (employment_status IN ('ACTIVE','ON_LEAVE','SUSPENDED','TERMINATED','RESIGNED','RETIRED')),
  event_date date NOT NULL, event_reason text,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id)
);
CREATE INDEX ix_emp_history ON employee_employment_history(employee_id, event_date DESC);

CREATE TABLE employee_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id),
  contract_number varchar(60), contract_type varchar(20) NOT NULL CHECK (contract_type IN ('PKWT','PKWTT','MAGANG','OUTSOURCE')),
  start_date date NOT NULL, end_date date, probation_end date, permanent_date date,
  file_id uuid, status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT','ACTIVE','EXPIRED','TERMINATED')),
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id)
);

CREATE TABLE employee_compensation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id),
  base_salary numeric(20,2) NOT NULL CHECK (base_salary >= 0),
  fixed_allowance numeric(20,2) NOT NULL DEFAULT 0,
  variable_allowance numeric(20,2) NOT NULL DEFAULT 0,
  salary_grade varchar(20),
  effective_from date NOT NULL,
  approval_reason text,
  approved_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id)
);
CREATE INDEX ix_emp_comp ON employee_compensation_history(employee_id, effective_from DESC);

CREATE TABLE employee_tax_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id),
  npwp varchar(30), tax_subject varchar(20) NOT NULL DEFAULT 'DOMESTIC' CHECK (tax_subject IN ('DOMESTIC','FOREIGN','NOT_CALCULATED')),
  tax_scheme varchar(10) NOT NULL DEFAULT 'PPH21' CHECK (tax_scheme IN ('PPH21','PPH26','NONE')),
  ptkp_status varchar(10) NOT NULL DEFAULT 'TK/0',
  ter_category varchar(5) CHECK (ter_category IN ('A','B','C')),
  tax_method varchar(10) NOT NULL DEFAULT 'GROSS' CHECK (tax_method IN ('GROSS','NET','GROSS_UP')),
  previous_employer_income numeric(20,2) NOT NULL DEFAULT 0,
  effective_from date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id)
);
CREATE INDEX ix_emp_tax ON employee_tax_profiles(employee_id, effective_from DESC);

CREATE TABLE employee_bpjs_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id),
  program varchar(15) NOT NULL CHECK (program IN ('KESEHATAN','JHT','JKK','JKM','JP')),
  membership_number varchar(30),
  wage_base numeric(20,2), risk_category varchar(10),
  employer_pct numeric(6,3) NOT NULL DEFAULT 0,
  employee_pct numeric(6,3) NOT NULL DEFAULT 0,
  ceiling_amount numeric(20,2), floor_amount numeric(20,2),
  active_from date NOT NULL, active_to date,
  calculation_version varchar(20) NOT NULL DEFAULT '2026-01',
  UNIQUE(employee_id, program, active_from)
);

CREATE TABLE employee_insurance_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id),
  insurer varchar(120) NOT NULL, policy_number varchar(60),
  coverage_type varchar(40), family_covered boolean NOT NULL DEFAULT false,
  premium numeric(20,2) NOT NULL DEFAULT 0,
  employer_contribution numeric(20,2) NOT NULL DEFAULT 0,
  employee_contribution numeric(20,2) NOT NULL DEFAULT 0,
  effective_from date, expiry_date date, file_id uuid
);

CREATE TABLE employee_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id),
  bank_name varchar(80) NOT NULL, account_number varchar(40) NOT NULL, account_holder varchar(120) NOT NULL,
  verification_status varchar(20) NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','PENDING_VERIFICATION','VERIFIED','REJECTED')),
  verification_evidence_file uuid, effective_from date NOT NULL DEFAULT current_date,
  is_primary boolean NOT NULL DEFAULT false,
  proposed_by uuid REFERENCES app_users(id), approved_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_emp_bank_primary ON employee_bank_accounts(employee_id) WHERE is_primary;

CREATE TABLE employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id),
  document_type varchar(30) NOT NULL CHECK (document_type IN ('KTP','NPWP','KK','CONTRACT','CERTIFICATE','TRAINING','LICENSE','MEDICAL','OTHER')),
  title varchar(160) NOT NULL, file_id uuid,
  expiry_date date, verified boolean NOT NULL DEFAULT false,
  verified_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id)
);
CREATE INDEX ix_emp_docs_expiry ON employee_documents(expiry_date) WHERE expiry_date IS NOT NULL;

CREATE TABLE employee_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id),
  name varchar(160) NOT NULL, issuer varchar(120), certificate_number varchar(80),
  issued_date date, expiry_date date, file_id uuid,
  skill_tags text
);

CREATE TABLE employee_emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id),
  name varchar(120) NOT NULL, relationship varchar(40), phone varchar(30), address text,
  restricted_notes text,
  confidentiality varchar(20) NOT NULL DEFAULT 'RESTRICTED'
);

CREATE TABLE employee_access_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id),
  user_id uuid REFERENCES app_users(id),
  role varchar(40), org_scope text,
  access_start date, access_end date,
  review_note text, reviewed_at timestamptz, reviewed_by uuid REFERENCES app_users(id)
);

-- ════════════════════════ MASTER CUSTOMER (§9) ═══════════════════════════════
ALTER TABLE customers
  ADD COLUMN customer_type varchar(15) NOT NULL DEFAULT 'COMPANY' CHECK (customer_type IN ('COMPANY','INDIVIDUAL')),
  ADD COLUMN legal_name varchar(200),
  ADD COLUMN ppn_status varchar(15) NOT NULL DEFAULT 'PKP' CHECK (ppn_status IN ('PKP','NON_PKP')),
  ADD COLUMN business_category varchar(80),
  ADD COLUMN website varchar(160),
  ADD COLUMN risk_rating varchar(10) NOT NULL DEFAULT 'LOW' CHECK (risk_rating IN ('LOW','MEDIUM','HIGH')),
  ADD COLUMN customer_since date,
  ADD COLUMN assigned_sales uuid REFERENCES app_users(id),
  ADD COLUMN currency char(3) NOT NULL DEFAULT 'IDR',
  ADD COLUMN credit_hold boolean NOT NULL DEFAULT false,
  ADD COLUMN collection_status varchar(20) NOT NULL DEFAULT 'NORMAL' CHECK (collection_status IN ('NORMAL','WATCH','DUNNING','LEGAL')),
  ADD COLUMN tax_treatment varchar(40);

CREATE TABLE customer_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id),
  name varchar(120) NOT NULL, position_title varchar(80), department varchar(80),
  phone varchar(30), email varchar(120), whatsapp varchar(30),
  is_primary boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id)
);
CREATE UNIQUE INDEX ux_cust_contact_primary ON customer_contacts(customer_id) WHERE is_primary;

CREATE TABLE customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id),
  address_type varchar(15) NOT NULL CHECK (address_type IN ('BILLING','DELIVERY','SITE')),
  label varchar(80), address text NOT NULL, city varchar(80), province varchar(80), postal_code varchar(12),
  is_default boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX ux_cust_addr_default ON customer_addresses(customer_id, address_type) WHERE is_default;

CREATE TABLE customer_product_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id),
  product_id uuid NOT NULL REFERENCES products(id),
  price numeric(20,2) NOT NULL CHECK (price >= 0), currency char(3) NOT NULL DEFAULT 'IDR',
  effective_from date NOT NULL DEFAULT current_date, expiry_date date,
  status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT','ACTIVE','EXPIRED')),
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id)
);
CREATE INDEX ix_cust_prices ON customer_product_prices(customer_id, product_id, effective_from DESC);

-- ════════════════════════ MASTER SUPPLIER (§10) ══════════════════════════════
ALTER TABLE suppliers
  ADD COLUMN supplier_type varchar(15) NOT NULL DEFAULT 'COMPANY' CHECK (supplier_type IN ('COMPANY','INDIVIDUAL')),
  ADD COLUMN legal_name varchar(200),
  ADD COLUMN ppn_treatment varchar(15) NOT NULL DEFAULT 'EXCLUDE' CHECK (ppn_treatment IN ('NON_PPN','INCLUDE','EXCLUDE','MIXED')),
  ADD COLUMN pph_treatment varchar(20),
  ADD COLUMN withholding_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN onboarding_status varchar(20) NOT NULL DEFAULT 'APPROVED' CHECK (onboarding_status IN ('REGISTERED','UNDER_REVIEW','APPROVED','SUSPENDED','BLOCKED')),
  ADD COLUMN risk_level varchar(10) NOT NULL DEFAULT 'LOW' CHECK (risk_level IN ('LOW','MEDIUM','HIGH')),
  ADD COLUMN coi_declared boolean NOT NULL DEFAULT false;

CREATE TABLE supplier_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  name varchar(120) NOT NULL, position_title varchar(80),
  phone varchar(30), email varchar(120), whatsapp varchar(30),
  is_primary boolean NOT NULL DEFAULT false, active boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX ux_supp_contact_primary ON supplier_contacts(supplier_id) WHERE is_primary;

CREATE TABLE supplier_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  address_type varchar(15) NOT NULL DEFAULT 'OFFICE' CHECK (address_type IN ('OFFICE','FACTORY','WAREHOUSE')),
  address text NOT NULL, city varchar(80), province varchar(80),
  is_default boolean NOT NULL DEFAULT false, active boolean NOT NULL DEFAULT true
);

-- Bank supplier = high-risk event (§10.3): maker-checker + payment hold.
CREATE TABLE supplier_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  bank_name varchar(80) NOT NULL, account_number varchar(40) NOT NULL, account_holder varchar(120) NOT NULL,
  currency char(3) NOT NULL DEFAULT 'IDR',
  verification_status varchar(25) NOT NULL DEFAULT 'PENDING_VERIFICATION'
    CHECK (verification_status IN ('PENDING_VERIFICATION','VERIFIED','REJECTED')),
  verification_evidence text,
  effective_from date NOT NULL DEFAULT current_date,
  is_primary boolean NOT NULL DEFAULT false,
  payment_hold boolean NOT NULL DEFAULT true, -- hold sampai verifikasi selesai
  change_reason text,
  proposed_by uuid REFERENCES app_users(id), proposed_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid REFERENCES app_users(id), approved_at timestamptz,
  CHECK (approved_by IS NULL OR approved_by <> proposed_by) -- SoD: maker ≠ checker
);
CREATE UNIQUE INDEX ux_supp_bank_primary ON supplier_bank_accounts(supplier_id) WHERE is_primary;

CREATE TABLE supplier_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  product_id uuid REFERENCES products(id),
  category varchar(80) NOT NULL, grade_spec varchar(160), brand varchar(80),
  supplier_part_number varchar(80), uom varchar(20),
  moq numeric(16,4), lead_time_days integer,
  certification varchar(160),
  approved_status varchar(20) NOT NULL DEFAULT 'APPROVED' CHECK (approved_status IN ('PROPOSED','APPROVED','SUSPENDED')),
  valid_from date NOT NULL DEFAULT current_date, valid_to date
);

-- Harga = riwayat append-only (§10.5): revisi baru, tidak menimpa, tidak
-- otomatis mengubah Active HPP; PO menyimpan snapshot sendiri.
CREATE TABLE supplier_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  product_id uuid REFERENCES products(id),
  material_desc varchar(200) NOT NULL,
  grade varchar(80), specification varchar(200), uom varchar(20) NOT NULL,
  currency char(3) NOT NULL DEFAULT 'IDR',
  price numeric(20,2) NOT NULL CHECK (price >= 0),
  tax_included boolean NOT NULL DEFAULT false,
  freight_included boolean NOT NULL DEFAULT false,
  lead_time_days integer, moq numeric(16,4), supplier_part_number varchar(80),
  effective_from date NOT NULL DEFAULT current_date, expiry_date date,
  source_quotation varchar(80),
  revision_no integer NOT NULL DEFAULT 1,
  status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT','ACTIVE','EXPIRED','SUPERSEDED')),
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id)
);
CREATE INDEX ix_supp_price ON supplier_price_history(supplier_id, product_id, effective_from DESC);

CREATE TABLE supplier_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  period char(7) NOT NULL,
  on_time_delivery_pct numeric(5,2), quality_acceptance_pct numeric(5,2),
  rejection_rate_pct numeric(5,2), price_competitiveness smallint CHECK (price_competitiveness BETWEEN 1 AND 5),
  responsiveness smallint CHECK (responsiveness BETWEEN 1 AND 5),
  document_compliance smallint CHECK (document_compliance BETWEEN 1 AND 5),
  overall_score numeric(5,2), risk_level varchar(10),
  approved_vendor boolean NOT NULL DEFAULT true,
  notes text,
  UNIQUE(supplier_id, period)
);

-- ════════════════════════ MASTER PRODUCT (§11) ═══════════════════════════════
ALTER TABLE products
  ADD COLUMN product_type varchar(20) NOT NULL DEFAULT 'PRODUCT'
    CHECK (product_type IN ('PRODUCT','SERVICE','RAW_MATERIAL','CONSUMABLE','SPARE_PART','TOOLING')),
  ADD COLUMN category varchar(80),
  ADD COLUMN material_type varchar(80), ADD COLUMN grade varchar(60),
  ADD COLUMN specification text, ADD COLUMN dimensions varchar(120), ADD COLUMN weight_kg numeric(12,3),
  ADD COLUMN drawing_number varchar(60), ADD COLUMN drawing_revision varchar(20),
  ADD COLUMN make_or_buy varchar(15) NOT NULL DEFAULT 'BUY' CHECK (make_or_buy IN ('MAKE','BUY','SUBCONTRACT')),
  ADD COLUMN is_stock boolean NOT NULL DEFAULT true,
  ADD COLUMN serial_required boolean NOT NULL DEFAULT false,
  ADD COLUMN lot_required boolean NOT NULL DEFAULT false,
  ADD COLUMN inspection_required boolean NOT NULL DEFAULT false,
  ADD COLUMN parent_product_id uuid REFERENCES products(id),
  ADD COLUMN variant_attributes jsonb;

CREATE TABLE product_uom_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  from_uom varchar(20) NOT NULL, to_uom varchar(20) NOT NULL,
  factor numeric(16,6) NOT NULL CHECK (factor > 0),
  UNIQUE(product_id, from_uom, to_uom)
);

CREATE TABLE product_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  file_id uuid, title varchar(160) NOT NULL,
  file_type varchar(25) NOT NULL CHECK (file_type IN ('DRAWING','CAD','SPECIFICATION','QC_STANDARD','WORK_INSTRUCTION','PHOTO','CERTIFICATE')),
  revision varchar(20),
  confidentiality varchar(20) NOT NULL DEFAULT 'INTERNAL' CHECK (confidentiality IN ('PUBLIC','INTERNAL','CONFIDENTIAL')),
  customer_owned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id)
);

-- BOM ber-revisi (§11.3): DRAFT → REVIEW → APPROVED → EFFECTIVE → SUPERSEDED.
CREATE TABLE bom_headers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  revision_no integer NOT NULL DEFAULT 1,
  bom_type varchar(15) NOT NULL DEFAULT 'MANUFACTURING' CHECK (bom_type IN ('ENGINEERING','MANUFACTURING')),
  status varchar(15) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','REVIEW','APPROVED','EFFECTIVE','SUPERSEDED')),
  effective_date date, notes text,
  approved_by uuid REFERENCES app_users(id), approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id),
  UNIQUE(product_id, bom_type, revision_no)
);
CREATE UNIQUE INDEX ux_bom_effective ON bom_headers(product_id, bom_type) WHERE status = 'EFFECTIVE';

CREATE TABLE bom_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_id uuid NOT NULL REFERENCES bom_headers(id) ON DELETE CASCADE,
  line_no integer NOT NULL,
  component_product_id uuid NOT NULL REFERENCES products(id),
  qty numeric(16,6) NOT NULL CHECK (qty > 0), uom varchar(20) NOT NULL,
  scrap_pct numeric(5,2) NOT NULL DEFAULT 0 CHECK (scrap_pct BETWEEN 0 AND 100),
  operation_note varchar(200),
  UNIQUE(bom_id, line_no)
);

-- HPP ber-versi (§11.4): Draft → Review → Approved → Locked → Active.
-- Active HPP tidak dapat diedit; transaksi menyimpan snapshot.
CREATE TABLE product_cost_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  revision_no integer NOT NULL DEFAULT 1,
  status varchar(15) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','REVIEW','APPROVED','LOCKED','ACTIVE','SUPERSEDED')),
  cost_raw_material numeric(20,2) NOT NULL DEFAULT 0,
  cost_consumable numeric(20,2) NOT NULL DEFAULT 0,
  cost_bought_out numeric(20,2) NOT NULL DEFAULT 0,
  cost_subcontract numeric(20,2) NOT NULL DEFAULT 0,
  cost_labor numeric(20,2) NOT NULL DEFAULT 0,
  cost_machine numeric(20,2) NOT NULL DEFAULT 0,
  cost_tooling numeric(20,2) NOT NULL DEFAULT 0,
  cost_electricity numeric(20,2) NOT NULL DEFAULT 0,
  cost_overhead numeric(20,2) NOT NULL DEFAULT 0,
  cost_packaging numeric(20,2) NOT NULL DEFAULT 0,
  cost_freight numeric(20,2) NOT NULL DEFAULT 0,
  cost_qc numeric(20,2) NOT NULL DEFAULT 0,
  cost_other numeric(20,2) NOT NULL DEFAULT 0,
  total_cost numeric(20,2) GENERATED ALWAYS AS (
    cost_raw_material+cost_consumable+cost_bought_out+cost_subcontract+cost_labor+cost_machine+
    cost_tooling+cost_electricity+cost_overhead+cost_packaging+cost_freight+cost_qc+cost_other) STORED,
  calculation_notes text,
  approved_by uuid REFERENCES app_users(id), approved_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id),
  UNIQUE(product_id, revision_no)
);
CREATE UNIQUE INDEX ux_cost_active ON product_cost_revisions(product_id) WHERE status = 'ACTIVE';

-- ── Backfill ringan agar data existing langsung tampil rapi ────────────────
INSERT INTO employee_compensation_history(employee_id, base_salary, effective_from, approval_reason)
  SELECT id, base_salary, COALESCE(join_date, current_date), 'Backfill migrasi 013' FROM employees WHERE base_salary IS NOT NULL;
INSERT INTO employee_tax_profiles(employee_id, tax_scheme, ptkp_status, tax_method, effective_from)
  SELECT id, 'PPH21', 'TK/0', 'GROSS', COALESCE(join_date, current_date) FROM employees;
INSERT INTO employee_positions(employee_id, position_title, branch_id, effective_from)
  SELECT id, COALESCE(job_title,'Belum diatur'), branch_id, COALESCE(join_date, current_date) FROM employees;
UPDATE customers SET legal_name = name, customer_since = created_at::date WHERE legal_name IS NULL;
UPDATE suppliers  SET legal_name = name WHERE legal_name IS NULL;
INSERT INTO supplier_bank_accounts(supplier_id, bank_name, account_number, account_holder, verification_status, is_primary, payment_hold, change_reason)
  SELECT id, bank_name, bank_account, COALESCE(bank_holder,name), 'VERIFIED', true, false, 'Backfill migrasi 013'
  FROM suppliers WHERE bank_name IS NOT NULL AND bank_account IS NOT NULL;

COMMIT;
