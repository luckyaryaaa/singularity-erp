-- 023_enterprise_master_data_finalization.sql
-- Sprint 8C: currency/FX foundation, mandatory accounting dimensions,
-- product variants, and governed master-data quality.
BEGIN;

CREATE TABLE currencies (
  code char(3) PRIMARY KEY,
  name varchar(80) NOT NULL,
  symbol varchar(8),
  decimal_places smallint NOT NULL DEFAULT 2 CHECK (decimal_places BETWEEN 0 AND 6),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO currencies(code,name,symbol,decimal_places) VALUES
  ('IDR','Indonesian Rupiah','Rp',0),('USD','US Dollar','$',2),
  ('SGD','Singapore Dollar','S$',2),('EUR','Euro','EUR',2),
  ('JPY','Japanese Yen','JPY',0),('CNY','Chinese Yuan','CNY',2);

CREATE TABLE exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_type varchar(20) NOT NULL DEFAULT 'CORPORATE'
    CHECK (rate_type IN ('CORPORATE','TAX','BUY','SELL','CLOSING')),
  from_currency char(3) NOT NULL REFERENCES currencies(code),
  to_currency char(3) NOT NULL REFERENCES currencies(code),
  effective_date date NOT NULL,
  rate numeric(24,10) NOT NULL CHECK (rate > 0),
  source varchar(120) NOT NULL,
  status varchar(15) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('DRAFT','ACTIVE','SUPERSEDED')),
  notes text,
  created_by uuid REFERENCES app_users(id),
  approved_by uuid REFERENCES app_users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(rate_type,from_currency,to_currency,effective_date)
);
CREATE INDEX ix_exchange_rates_lookup ON exchange_rates(from_currency,to_currency,rate_type,effective_date DESC)
  WHERE status='ACTIVE';

INSERT INTO exchange_rates(rate_type,from_currency,to_currency,effective_date,rate,source,status)
VALUES ('CORPORATE','IDR','IDR','2000-01-01',1,'SYSTEM','ACTIVE');

CREATE TABLE transaction_dimension_policies (
  document_type varchar(40) PRIMARY KEY,
  legal_entity_required boolean NOT NULL DEFAULT true,
  department_required boolean NOT NULL DEFAULT false,
  cost_center_required boolean NOT NULL DEFAULT false,
  profit_center_required boolean NOT NULL DEFAULT false,
  project_wbs_required boolean NOT NULL DEFAULT false,
  effective_from date NOT NULL DEFAULT current_date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO transaction_dimension_policies(document_type,cost_center_required) VALUES
  ('INVOICE',true),('CUSTOMER_PAYMENT',true),('SUPPLIER_INVOICE',true),
  ('SUPPLIER_PAYMENT',true),('EXPENSE',true),('JOURNAL',true),
  ('PAYROLL_RUN',true),('TAX_DOCUMENT',true),('PAYMENT_PROPOSAL',true),
  ('PURCHASE_ORDER',true),('SALES_ORDER',true),('WORK_ORDER',true);

ALTER TABLE business_documents
  ADD COLUMN transaction_currency char(3) REFERENCES currencies(code) DEFAULT 'IDR',
  ADD COLUMN functional_currency char(3) REFERENCES currencies(code) DEFAULT 'IDR',
  ADD COLUMN reporting_currency char(3) REFERENCES currencies(code) DEFAULT 'IDR',
  ADD COLUMN exchange_rate numeric(24,10) NOT NULL DEFAULT 1 CHECK (exchange_rate > 0),
  ADD COLUMN exchange_rate_date date,
  ADD COLUMN functional_amount numeric(20,2),
  ADD COLUMN reporting_amount numeric(20,2),
  ADD COLUMN currency_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN dimension_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE business_documents d SET
  transaction_currency='IDR',
  functional_currency=COALESCE(le.functional_currency,'IDR'),
  reporting_currency=COALESCE(le.reporting_currency,le.functional_currency,'IDR'),
  exchange_rate=1,
  exchange_rate_date=d.created_at::date,
  functional_amount=d.amount,
  reporting_amount=d.amount,
  currency_snapshot=jsonb_build_object('transactionCurrency','IDR','functionalCurrency',COALESCE(le.functional_currency,'IDR'),'reportingCurrency',COALESCE(le.reporting_currency,le.functional_currency,'IDR'),'rate',1,'rateDate',d.created_at::date,'source','MIGRATION-023')
FROM legal_entities le WHERE le.id=d.legal_entity_id;

UPDATE business_documents SET
  transaction_currency=COALESCE(transaction_currency,'IDR'),
  functional_currency=COALESCE(functional_currency,'IDR'),
  reporting_currency=COALESCE(reporting_currency,'IDR'),
  exchange_rate_date=COALESCE(exchange_rate_date,created_at::date),
  functional_amount=COALESCE(functional_amount,amount),
  reporting_amount=COALESCE(reporting_amount,amount)
WHERE functional_amount IS NULL OR reporting_amount IS NULL OR exchange_rate_date IS NULL;

ALTER TABLE business_documents
  ALTER COLUMN transaction_currency SET NOT NULL,
  ALTER COLUMN functional_currency SET NOT NULL,
  ALTER COLUMN reporting_currency SET NOT NULL,
  ALTER COLUMN exchange_rate_date SET NOT NULL,
  ALTER COLUMN functional_amount SET NOT NULL,
  ALTER COLUMN reporting_amount SET NOT NULL;

CREATE INDEX ix_documents_currency_date ON business_documents(transaction_currency,exchange_rate_date);

CREATE TABLE product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_product_id uuid NOT NULL REFERENCES products(id),
  variant_product_id uuid REFERENCES products(id),
  variant_code varchar(40) NOT NULL,
  variant_name varchar(160) NOT NULL,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  uom varchar(20),
  price numeric(20,2) CHECK (price IS NULL OR price >= 0),
  status varchar(15) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT','ACTIVE','BLOCKED','OBSOLETE')),
  effective_from date NOT NULL DEFAULT current_date,
  effective_to date,
  created_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(parent_product_id,variant_code),
  UNIQUE(variant_product_id),
  CHECK (effective_to IS NULL OR effective_to >= effective_from),
  CHECK (variant_product_id IS NULL OR variant_product_id <> parent_product_id)
);
CREATE INDEX ix_product_variants_parent ON product_variants(parent_product_id,status);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['customers','suppliers','products','employees'] LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN data_quality_score smallint NOT NULL DEFAULT 0 CHECK (data_quality_score BETWEEN 0 AND 100), ADD COLUMN quality_flags jsonb NOT NULL DEFAULT ''[]''::jsonb, ADD COLUMN quality_checked_at timestamptz',t);
  END LOOP;
END $$;

CREATE TABLE master_data_quality_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_type varchar(20) NOT NULL CHECK (master_type IN ('customers','suppliers','products','employees')),
  master_id uuid NOT NULL,
  rule_code varchar(60) NOT NULL,
  severity varchar(10) NOT NULL CHECK (severity IN ('INFO','WARNING','CRITICAL')),
  status varchar(15) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','ACCEPTED','RESOLVED')),
  detail text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES app_users(id),
  resolution_note text,
  UNIQUE(master_type,master_id,rule_code,status)
);
CREATE INDEX ix_master_quality_open ON master_data_quality_issues(master_type,severity,detected_at DESC) WHERE status='OPEN';

COMMIT;
