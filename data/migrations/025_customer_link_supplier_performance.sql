-- 025_customer_link_supplier_performance.sql
-- Sprint 8C Wave 2: recoverable Customer Link workflow and evidence-based
-- supplier performance/document governance.
BEGIN;

CREATE TABLE customer_link_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES app_users(id),
  branch_id uuid NOT NULL REFERENCES branches(id),
  source_document_id uuid REFERENCES business_documents(id),
  status varchar(15) NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','COMPLETED','ABANDONED','EXPIRED')),
  current_step smallint NOT NULL DEFAULT 0 CHECK(current_step BETWEEN 0 AND 5),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_customer_id uuid REFERENCES customers(id),
  expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX ix_customer_link_recovery ON customer_link_drafts(created_by,status,updated_at DESC)
  WHERE status='DRAFT';
CREATE UNIQUE INDEX ux_customer_link_source_draft ON customer_link_drafts(created_by,source_document_id)
  WHERE status='DRAFT' AND source_document_id IS NOT NULL;

CREATE TABLE supplier_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  document_type varchar(30) NOT NULL CHECK(document_type IN ('NIB','NPWP','PKP','BANK_PROOF','COI','ISO','SNI','MILL_CERT','INSURANCE','CONTRACT','OTHER')),
  document_number varchar(80),
  title varchar(160) NOT NULL,
  file_id uuid,
  issue_date date,
  expiry_date date,
  required boolean NOT NULL DEFAULT false,
  verification_status varchar(15) NOT NULL DEFAULT 'PENDING' CHECK(verification_status IN ('PENDING','VERIFIED','REJECTED')),
  verified_by uuid REFERENCES app_users(id),
  verified_at timestamptz,
  notes text,
  created_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(expiry_date IS NULL OR issue_date IS NULL OR expiry_date>=issue_date)
);
CREATE INDEX ix_supplier_documents_expiry ON supplier_documents(supplier_id,expiry_date)
  WHERE verification_status='VERIFIED';

ALTER TABLE suppliers
  ADD COLUMN performance_hold boolean NOT NULL DEFAULT false,
  ADD COLUMN performance_hold_reason text,
  ADD COLUMN last_performance_score numeric(5,2),
  ADD COLUMN last_performance_period char(7);

ALTER TABLE supplier_evaluations
  ADD COLUMN calculation_source varchar(15) NOT NULL DEFAULT 'MANUAL' CHECK(calculation_source IN ('MANUAL','AUTOMATIC')),
  ADD COLUMN order_count integer NOT NULL DEFAULT 0,
  ADD COLUMN receipt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN inspection_count integer NOT NULL DEFAULT 0,
  ADD COLUMN price_sample_count integer NOT NULL DEFAULT 0,
  ADD COLUMN score_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN calculated_at timestamptz,
  ADD COLUMN calculated_by uuid REFERENCES app_users(id);

CREATE TABLE supplier_score_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(30) NOT NULL,
  version integer NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  delivery_weight numeric(5,2) NOT NULL,
  quality_weight numeric(5,2) NOT NULL,
  price_weight numeric(5,2) NOT NULL,
  compliance_weight numeric(5,2) NOT NULL,
  approved_threshold numeric(5,2) NOT NULL DEFAULT 70,
  hold_threshold numeric(5,2) NOT NULL DEFAULT 50,
  min_orders_for_hold integer NOT NULL DEFAULT 3,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(code,version),
  CHECK(delivery_weight+quality_weight+price_weight+compliance_weight=100),
  CHECK(effective_to IS NULL OR effective_to>=effective_from)
);
CREATE UNIQUE INDEX ux_supplier_score_policy_active ON supplier_score_policies(code)
  WHERE active AND effective_to IS NULL;
INSERT INTO supplier_score_policies(code,version,effective_from,delivery_weight,quality_weight,price_weight,compliance_weight)
VALUES('DEFAULT',1,'2026-01-01',35,35,20,10);

COMMIT;
