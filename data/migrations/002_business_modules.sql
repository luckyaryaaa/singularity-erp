-- 002_business_modules.sql — Skema modul bisnis MAT ERP V2 (PostgreSQL).
-- Melengkapi 001_core_foundation.sql. Non-destruktif: hanya CREATE, tanpa DROP.
-- Rollback: 002_business_modules.down.sql (validasi di lingkungan staging dahulu).
BEGIN;

-- ── Organisasi & sesi ────────────────────────────────────────────────────────
CREATE TABLE work_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  code varchar(20) UNIQUE NOT NULL, name varchar(120) NOT NULL,
  kind varchar(30) NOT NULL CHECK (kind IN ('head_office','branch','warehouse','workshop')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id),
  token_hash varchar(64) UNIQUE NOT NULL,        -- simpan hash, bukan token mentah
  csrf_token_hash varchar(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  ip inet, device varchar(160),
  active boolean NOT NULL DEFAULT true,
  ended_at timestamptz, end_reason varchar(30)
);
CREATE INDEX ix_sessions_user_active ON user_sessions(user_id, active);

CREATE TABLE login_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES app_users(id), username_attempted varchar(80) NOT NULL,
  succeeded boolean NOT NULL, ip inet, device varchar(160),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_login_history_user ON login_history(user_id, occurred_at DESC);

CREATE TABLE role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role varchar(40) NOT NULL, permission_code varchar(80) NOT NULL,
  UNIQUE(role, permission_code)
);

CREATE TABLE approval_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type varchar(50) NOT NULL,
  min_amount numeric(20,2) NOT NULL DEFAULT 0,
  max_amount numeric(20,2),                       -- NULL = tanpa batas atas
  approval_levels text[] NOT NULL,                -- {supervisor,finance,owner}
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO approval_matrix (document_type, min_amount, max_amount, approval_levels) VALUES
  ('*', 0, 5000000, '{supervisor}'),
  ('*', 5000001, 50000000, '{supervisor,finance}'),
  ('*', 50000001, NULL, '{supervisor,finance,owner}');

-- ── Master data ──────────────────────────────────────────────────────────────
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(20) UNIQUE NOT NULL, name varchar(160) NOT NULL,
  npwp varchar(30), city varchar(80), address text,
  payment_term_days integer NOT NULL DEFAULT 30 CHECK (payment_term_days >= 0),
  credit_limit numeric(20,2), active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id),
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid REFERENCES app_users(id)
);
CREATE TABLE suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(20) UNIQUE NOT NULL, name varchar(160) NOT NULL,
  npwp varchar(30), category varchar(80), rating smallint CHECK (rating BETWEEN 1 AND 5),
  bank_name varchar(80), bank_account varchar(40), bank_holder varchar(120),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id),
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid REFERENCES app_users(id)
);
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(20) UNIQUE NOT NULL, name varchar(160) NOT NULL,
  uom varchar(20) NOT NULL, hpp numeric(20,2) NOT NULL DEFAULT 0 CHECK (hpp >= 0),
  price numeric(20,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nik varchar(30) UNIQUE NOT NULL, name varchar(160) NOT NULL,
  department varchar(80) NOT NULL, job_title varchar(120),
  base_salary numeric(20,2) NOT NULL DEFAULT 0,
  branch_id uuid REFERENCES branches(id), bpjs boolean NOT NULL DEFAULT true,
  join_date date, active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Baris dokumen & inventori ────────────────────────────────────────────────
-- Header transaksi memakai business_documents (001). Baris detail di sini.
CREATE TABLE document_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES business_documents(id) ON DELETE RESTRICT,
  line_no integer NOT NULL,
  product_id uuid REFERENCES products(id),
  description text NOT NULL,
  qty numeric(16,4) NOT NULL DEFAULT 1 CHECK (qty > 0),
  uom varchar(20), unit_price numeric(20,2) NOT NULL DEFAULT 0,
  discount_pct numeric(5,2) NOT NULL DEFAULT 0 CHECK (discount_pct BETWEEN 0 AND 100),
  tax_pct numeric(5,2) NOT NULL DEFAULT 11,
  line_total numeric(20,2) NOT NULL DEFAULT 0,
  UNIQUE(document_id, line_no)
);
CREATE INDEX ix_document_lines_document ON document_lines(document_id);
CREATE INDEX ix_document_lines_product ON document_lines(product_id);

CREATE TABLE inventory_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  warehouse_id uuid NOT NULL REFERENCES branches(id),
  qty_on_hand numeric(16,4) NOT NULL DEFAULT 0,
  qty_reserved numeric(16,4) NOT NULL DEFAULT 0,
  min_qty numeric(16,4) NOT NULL DEFAULT 0,
  value_idr numeric(20,2) NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,             -- optimistic lock saldo stok
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, warehouse_id)
);
CREATE INDEX ix_inventory_product_wh ON inventory_balances(product_id, warehouse_id);

-- Mutasi stok dipartisi per bulan (volume tinggi).
CREATE TABLE inventory_movements (
  id bigint GENERATED ALWAYS AS IDENTITY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  product_id uuid NOT NULL REFERENCES products(id),
  warehouse_id uuid NOT NULL REFERENCES branches(id),
  document_id uuid REFERENCES business_documents(id),
  movement_type varchar(30) NOT NULL CHECK (movement_type IN ('RECEIPT','ISSUE','TRANSFER_IN','TRANSFER_OUT','ADJUSTMENT','RETURN')),
  qty numeric(16,4) NOT NULL,
  unit_cost numeric(20,2), created_by uuid REFERENCES app_users(id),
  PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);
CREATE TABLE inventory_movements_2026_07 PARTITION OF inventory_movements FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE inventory_movements_2026_08 PARTITION OF inventory_movements FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE INDEX ix_movements_product ON inventory_movements(product_id, occurred_at DESC);

-- ── Keuangan & akuntansi ─────────────────────────────────────────────────────
CREATE TABLE payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_document_id uuid NOT NULL REFERENCES business_documents(id),
  invoice_document_id uuid NOT NULL REFERENCES business_documents(id),
  amount numeric(20,2) NOT NULL CHECK (amount > 0),
  allocated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(payment_document_id, invoice_document_id)
);

CREATE TABLE chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(20) UNIQUE NOT NULL, name varchar(160) NOT NULL,
  normal_side char(1) NOT NULL CHECK (normal_side IN ('D','C')),
  category varchar(40) NOT NULL, active boolean NOT NULL DEFAULT true
);
CREATE TABLE journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_document_id uuid NOT NULL REFERENCES business_documents(id),
  account_id uuid NOT NULL REFERENCES chart_of_accounts(id),
  debit numeric(20,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit numeric(20,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  memo text,
  CHECK (debit = 0 OR credit = 0)
);
CREATE INDEX ix_journal_lines_document ON journal_lines(journal_document_id);
CREATE INDEX ix_journal_lines_account ON journal_lines(account_id);

CREATE TABLE accounting_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period char(7) UNIQUE NOT NULL,                 -- '2026-07'
  status varchar(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED')),
  closed_at timestamptz, closed_by uuid REFERENCES app_users(id),
  reopened_at timestamptz, reopened_by uuid REFERENCES app_users(id), reopen_reason text
);

-- ── Payroll & pajak ─────────────────────────────────────────────────────────
CREATE TABLE payroll_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_document_id uuid NOT NULL REFERENCES business_documents(id),
  employee_id uuid NOT NULL REFERENCES employees(id),
  base_salary numeric(20,2) NOT NULL, allowances numeric(20,2) NOT NULL DEFAULT 0,
  overtime numeric(20,2) NOT NULL DEFAULT 0, deductions numeric(20,2) NOT NULL DEFAULT 0,
  bpjs_company numeric(20,2) NOT NULL DEFAULT 0, bpjs_employee numeric(20,2) NOT NULL DEFAULT 0,
  pph21 numeric(20,2) NOT NULL DEFAULT 0, net_pay numeric(20,2) NOT NULL,
  UNIQUE(payroll_document_id, employee_id)
);
CREATE INDEX ix_payroll_items_employee ON payroll_items(employee_id);

CREATE TABLE tax_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES business_documents(id),
  tax_type varchar(20) NOT NULL CHECK (tax_type IN ('PPN_OUTPUT','PPN_INPUT','PPH21','PPH23','PPH26','PPH_FINAL')),
  period char(7) NOT NULL, base_amount numeric(20,2) NOT NULL,
  tax_amount numeric(20,2) NOT NULL, reported boolean NOT NULL DEFAULT false,
  reported_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_tax_records_period ON tax_records(period, tax_type);

-- ── Notifikasi, job, backup ─────────────────────────────────────────────────
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id), target_role varchar(40),
  category varchar(20) NOT NULL CHECK (category IN ('ACTION_REQUIRED','WARNING','INFORMATION','SUCCESS','SYSTEM_ALERT')),
  title varchar(200) NOT NULL, body text, link varchar(200),
  dedupe_key varchar(120), created_at timestamptz NOT NULL DEFAULT now(), read_at timestamptz
);
CREATE INDEX ix_notifications_user ON notifications(user_id, read_at, created_at DESC);
CREATE UNIQUE INDEX ux_notifications_dedupe ON notifications(dedupe_key) WHERE dedupe_key IS NOT NULL AND read_at IS NULL;

CREATE TABLE background_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type varchar(40) NOT NULL, priority varchar(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  params jsonb NOT NULL DEFAULT '{}',
  status varchar(20) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','PROCESSING','COMPLETED','FAILED','CANCELLED')),
  progress smallint NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  requested_by uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(), started_at timestamptz, finished_at timestamptz,
  result jsonb, error text
);
CREATE INDEX ix_jobs_status ON background_jobs(status, priority, created_at);
CREATE INDEX ix_jobs_user ON background_jobs(requested_by, created_at DESC);

CREATE TABLE backup_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz,
  size_mb integer, checksum varchar(80),
  target varchar(120) NOT NULL, restore_tested boolean NOT NULL DEFAULT false,
  status varchar(20) NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING','COMPLETED','FAILED'))
);

-- ── Indeks tambahan pada dokumen (pola query nyata) ─────────────────────────
CREATE INDEX ix_documents_due_date ON business_documents(status, (payload->>'dueDate'));
CREATE INDEX ix_documents_created_at ON business_documents(created_at DESC);
CREATE INDEX ix_documents_party ON business_documents((payload->>'partyId'));

COMMIT;
