BEGIN;

-- 056 — Sales commercial controls. Semua keputusan menyimpan snapshot agar
-- perubahan HPP, stok, lead time, atau policy berikutnya tidak menulis ulang
-- dasar keputusan historis.
CREATE TABLE sales_margin_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), legal_entity_id uuid NOT NULL REFERENCES legal_entities(id),
  document_type varchar(50) NOT NULL CHECK(document_type IN('QUOTATION','SALES_ORDER')),
  minimum_margin_pct numeric(7,4) NOT NULL CHECK(minimum_margin_pct BETWEEN -100 AND 100),
  warning_margin_pct numeric(7,4) NOT NULL CHECK(warning_margin_pct BETWEEN -100 AND 100),
  effective_from date NOT NULL, effective_to date, status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK(status IN('DRAFT','ACTIVE','INACTIVE')),
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id), approved_at timestamptz, approved_by uuid REFERENCES app_users(id),
  CHECK(warning_margin_pct>=minimum_margin_pct), CHECK(effective_to IS NULL OR effective_to>=effective_from), CHECK(approved_by IS NULL OR approved_by<>created_by)
);
CREATE UNIQUE INDEX ux_sales_margin_policy_active ON sales_margin_policies(legal_entity_id,document_type,effective_from) WHERE status='ACTIVE';

INSERT INTO sales_margin_policies(legal_entity_id,document_type,minimum_margin_pct,warning_margin_pct,effective_from,status,approved_at)
SELECT id,t,15,25,current_date,'ACTIVE',now() FROM legal_entities CROSS JOIN unnest(ARRAY['QUOTATION','SALES_ORDER']) t;

CREATE TABLE sales_margin_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_id uuid NOT NULL REFERENCES business_documents(id) ON DELETE RESTRICT,
  document_version integer NOT NULL, policy_id uuid REFERENCES sales_margin_policies(id), revenue numeric(20,2) NOT NULL,
  estimated_cost numeric(20,2) NOT NULL, margin_amount numeric(20,2) NOT NULL, margin_pct numeric(9,4) NOT NULL,
  policy_snapshot jsonb NOT NULL, cost_snapshot jsonb NOT NULL,
  status varchar(20) NOT NULL CHECK(status IN('NOT_REQUIRED','PENDING_APPROVAL','APPROVED','REJECTED','SUPERSEDED')),
  requested_at timestamptz NOT NULL DEFAULT now(), requested_by uuid NOT NULL REFERENCES app_users(id),
  decided_at timestamptz, decided_by uuid REFERENCES app_users(id), decision_reason text,
  UNIQUE(document_id,document_version), CHECK(decided_by IS NULL OR decided_by<>requested_by)
);
CREATE INDEX ix_sales_margin_pending ON sales_margin_assessments(status,requested_at) WHERE status='PENDING_APPROVAL';

CREATE TABLE sales_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), contract_number varchar(60) NOT NULL UNIQUE,
  legal_entity_id uuid NOT NULL REFERENCES legal_entities(id), branch_id uuid NOT NULL REFERENCES branches(id), customer_id uuid NOT NULL REFERENCES customers(id),
  title varchar(200) NOT NULL, contract_type varchar(30) NOT NULL DEFAULT 'FRAMEWORK' CHECK(contract_type IN('FRAMEWORK','BLANKET','PROJECT','SERVICE')),
  valid_from date NOT NULL, valid_to date NOT NULL, currency char(3) NOT NULL DEFAULT 'IDR', ceiling_amount numeric(20,2) NOT NULL CHECK(ceiling_amount>0),
  consumed_amount numeric(20,2) NOT NULL DEFAULT 0 CHECK(consumed_amount>=0), status varchar(25) NOT NULL DEFAULT 'DRAFT'
    CHECK(status IN('DRAFT','PENDING_APPROVAL','ACTIVE','REJECTED','EXPIRED','CLOSED','CANCELLED')),
  terms jsonb NOT NULL DEFAULT '{}', version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), created_by uuid NOT NULL REFERENCES app_users(id),
  submitted_at timestamptz, approved_at timestamptz, approved_by uuid REFERENCES app_users(id), decision_reason text, updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid REFERENCES app_users(id),
  CHECK(valid_to>=valid_from), CHECK(consumed_amount<=ceiling_amount), CHECK(approved_by IS NULL OR approved_by<>created_by)
);
CREATE INDEX ix_sales_contract_customer ON sales_contracts(customer_id,status,valid_to);

CREATE TABLE sales_contract_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), contract_id uuid NOT NULL REFERENCES sales_contracts(id) ON DELETE RESTRICT,
  line_no integer NOT NULL, product_id uuid REFERENCES products(id), description text NOT NULL, committed_qty numeric(16,4),
  released_qty numeric(16,4) NOT NULL DEFAULT 0, ceiling_amount numeric(20,2) NOT NULL CHECK(ceiling_amount>=0), released_amount numeric(20,2) NOT NULL DEFAULT 0,
  uom varchar(20), unit_price numeric(20,2), UNIQUE(contract_id,line_no), CHECK(committed_qty IS NULL OR committed_qty>0),
  CHECK(released_qty>=0 AND (committed_qty IS NULL OR released_qty<=committed_qty)), CHECK(released_amount>=0 AND released_amount<=ceiling_amount)
);

CREATE TABLE sales_contract_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), contract_id uuid NOT NULL REFERENCES sales_contracts(id) ON DELETE RESTRICT,
  contract_line_id uuid REFERENCES sales_contract_lines(id) ON DELETE RESTRICT, sales_order_id uuid NOT NULL REFERENCES business_documents(id) ON DELETE RESTRICT,
  sales_order_line_id uuid REFERENCES document_lines(id) ON DELETE RESTRICT, released_qty numeric(16,4), released_amount numeric(20,2) NOT NULL CHECK(released_amount>0),
  released_at timestamptz NOT NULL DEFAULT now(), released_by uuid NOT NULL REFERENCES app_users(id),
  UNIQUE(contract_id,sales_order_id,contract_line_id), CHECK(released_qty IS NULL OR released_qty>0)
);

CREATE TABLE sales_availability_promises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sales_order_id uuid NOT NULL REFERENCES business_documents(id) ON DELETE RESTRICT,
  sales_order_line_id uuid NOT NULL REFERENCES document_lines(id) ON DELETE RESTRICT, warehouse_id uuid NOT NULL REFERENCES branches(id),
  demand_qty numeric(16,4) NOT NULL CHECK(demand_qty>0), on_hand_qty numeric(16,4) NOT NULL, reserved_qty numeric(16,4) NOT NULL,
  prior_promised_qty numeric(16,4) NOT NULL, atp_qty numeric(16,4) NOT NULL CHECK(atp_qty>=0), ctp_qty numeric(16,4) NOT NULL CHECK(ctp_qty>=0),
  promised_qty numeric(16,4) NOT NULL CHECK(promised_qty>=0), promise_date date, promise_source varchar(30) NOT NULL CHECK(promise_source IN('ATP','CTP_BUY','CTP_MAKE','MANUAL_REVIEW')),
  calculation_snapshot jsonb NOT NULL, calculated_at timestamptz NOT NULL DEFAULT now(), calculated_by uuid NOT NULL REFERENCES app_users(id), active boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX ux_sales_promise_active ON sales_availability_promises(sales_order_line_id) WHERE active;
CREATE INDEX ix_sales_promise_product ON sales_availability_promises(warehouse_id,active,promise_date);

CREATE TABLE sales_milestone_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sales_order_id uuid NOT NULL REFERENCES business_documents(id) ON DELETE RESTRICT,
  milestone_no integer NOT NULL, description varchar(200) NOT NULL, billing_pct numeric(7,4) NOT NULL CHECK(billing_pct>0 AND billing_pct<=100),
  billing_amount numeric(20,2) NOT NULL CHECK(billing_amount>0), trigger_type varchar(30) NOT NULL DEFAULT 'DATE'
    CHECK(trigger_type IN('DATE','DELIVERY','ACCEPTANCE','PROGRESS','MANUAL_APPROVAL')),
  planned_date date, status varchar(20) NOT NULL DEFAULT 'PLANNED' CHECK(status IN('PLANNED','READY','INVOICED','CANCELLED')),
  invoice_document_id uuid REFERENCES business_documents(id) ON DELETE RESTRICT, created_at timestamptz NOT NULL DEFAULT now(), created_by uuid NOT NULL REFERENCES app_users(id),
  ready_at timestamptz, ready_by uuid REFERENCES app_users(id), invoiced_at timestamptz, UNIQUE(sales_order_id,milestone_no)
);

CREATE TABLE sales_backorders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sales_order_id uuid NOT NULL REFERENCES business_documents(id) ON DELETE RESTRICT,
  sales_order_line_id uuid NOT NULL REFERENCES document_lines(id) ON DELETE RESTRICT, warehouse_id uuid REFERENCES branches(id),
  backorder_qty numeric(16,4) NOT NULL CHECK(backorder_qty>=0), allocated_qty numeric(16,4) NOT NULL DEFAULT 0 CHECK(allocated_qty>=0),
  promised_date date, status varchar(20) NOT NULL DEFAULT 'OPEN' CHECK(status IN('OPEN','PARTIALLY_ALLOCATED','ALLOCATED','FULFILLED','CANCELLED')),
  source_snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid REFERENCES app_users(id),
  UNIQUE(sales_order_line_id), CHECK(allocated_qty<=backorder_qty)
);
CREATE INDEX ix_sales_backorders_open ON sales_backorders(status,promised_date) WHERE status IN('OPEN','PARTIALLY_ALLOCATED','ALLOCATED');

ALTER TABLE sales_margin_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY legal_entity_scope ON sales_margin_policies USING(app_legal_entity_visible(legal_entity_id)) WITH CHECK(app_legal_entity_visible(legal_entity_id));
ALTER TABLE sales_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY branch_scope ON sales_contracts USING(app_branch_visible(branch_id)) WITH CHECK(app_branch_visible(branch_id));
ALTER TABLE sales_contract_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY contract_scope ON sales_contract_lines USING(EXISTS(SELECT 1 FROM sales_contracts c WHERE c.id=contract_id AND app_branch_visible(c.branch_id))) WITH CHECK(EXISTS(SELECT 1 FROM sales_contracts c WHERE c.id=contract_id AND app_branch_visible(c.branch_id)));
ALTER TABLE sales_contract_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY contract_scope ON sales_contract_releases USING(EXISTS(SELECT 1 FROM sales_contracts c WHERE c.id=contract_id AND app_branch_visible(c.branch_id))) WITH CHECK(EXISTS(SELECT 1 FROM sales_contracts c WHERE c.id=contract_id AND app_branch_visible(c.branch_id)));
ALTER TABLE sales_margin_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY document_scope ON sales_margin_assessments USING(EXISTS(SELECT 1 FROM business_documents d WHERE d.id=document_id AND app_branch_visible(d.branch_id))) WITH CHECK(EXISTS(SELECT 1 FROM business_documents d WHERE d.id=document_id AND app_branch_visible(d.branch_id)));
ALTER TABLE sales_availability_promises ENABLE ROW LEVEL SECURITY;
CREATE POLICY document_scope ON sales_availability_promises USING(EXISTS(SELECT 1 FROM business_documents d WHERE d.id=sales_order_id AND app_branch_visible(d.branch_id))) WITH CHECK(EXISTS(SELECT 1 FROM business_documents d WHERE d.id=sales_order_id AND app_branch_visible(d.branch_id)));
ALTER TABLE sales_milestone_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY document_scope ON sales_milestone_schedules USING(EXISTS(SELECT 1 FROM business_documents d WHERE d.id=sales_order_id AND app_branch_visible(d.branch_id))) WITH CHECK(EXISTS(SELECT 1 FROM business_documents d WHERE d.id=sales_order_id AND app_branch_visible(d.branch_id)));
ALTER TABLE sales_backorders ENABLE ROW LEVEL SECURITY;
CREATE POLICY document_scope ON sales_backorders USING(EXISTS(SELECT 1 FROM business_documents d WHERE d.id=sales_order_id AND app_branch_visible(d.branch_id))) WITH CHECK(EXISTS(SELECT 1 FROM business_documents d WHERE d.id=sales_order_id AND app_branch_visible(d.branch_id)));

COMMIT;
