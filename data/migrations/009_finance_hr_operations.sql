BEGIN;

ALTER TABLE payment_allocations ADD COLUMN created_by uuid REFERENCES app_users(id);
CREATE INDEX ix_payment_alloc_invoice ON payment_allocations(invoice_document_id,allocated_at DESC);
CREATE UNIQUE INDEX ux_tax_document_type ON tax_records(document_id,tax_type) WHERE document_id IS NOT NULL;

CREATE TABLE attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),employee_id uuid NOT NULL REFERENCES employees(id),work_date date NOT NULL,
  check_in timestamptz,check_out timestamptz,status varchar(20) NOT NULL DEFAULT 'PRESENT' CHECK(status IN('PRESENT','LATE','ABSENT','LEAVE','SICK','REMOTE')),
  source varchar(30) NOT NULL DEFAULT 'MANUAL',notes text,created_by uuid REFERENCES app_users(id),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id,work_date),CHECK(check_out IS NULL OR check_in IS NULL OR check_out>check_in)
);
CREATE INDEX ix_attendance_date ON attendance_records(work_date,employee_id);

CREATE TABLE leave_balances (
  employee_id uuid NOT NULL REFERENCES employees(id),year integer NOT NULL,entitlement numeric(6,2) NOT NULL DEFAULT 12 CHECK(entitlement>=0),
  used numeric(6,2) NOT NULL DEFAULT 0 CHECK(used>=0),updated_at timestamptz NOT NULL DEFAULT now(),updated_by uuid REFERENCES app_users(id),
  PRIMARY KEY(employee_id,year),CHECK(used<=entitlement)
);

CREATE TABLE payroll_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),employee_id uuid NOT NULL REFERENCES employees(id),code varchar(30) NOT NULL,name varchar(120) NOT NULL,
  kind varchar(20) NOT NULL CHECK(kind IN('ALLOWANCE','DEDUCTION')),amount numeric(20,2) NOT NULL CHECK(amount>=0),recurring boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(employee_id,code)
);

CREATE TABLE bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),branch_id uuid NOT NULL REFERENCES branches(id),transaction_date date NOT NULL,reference varchar(100) NOT NULL,
  description text,direction char(1) NOT NULL CHECK(direction IN('D','C')),amount numeric(20,2) NOT NULL CHECK(amount>0),
  matched_document_id uuid REFERENCES business_documents(id),status varchar(20) NOT NULL DEFAULT 'UNMATCHED' CHECK(status IN('UNMATCHED','MATCHED','IGNORED')),
  imported_by uuid REFERENCES app_users(id),created_at timestamptz NOT NULL DEFAULT now(),matched_at timestamptz,UNIQUE(branch_id,reference,direction)
);
CREATE INDEX ix_bank_transactions_match ON bank_transactions(branch_id,status,transaction_date DESC);

CREATE TABLE reconciliation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),branch_id uuid NOT NULL REFERENCES branches(id),period char(7) NOT NULL,
  status varchar(20) NOT NULL CHECK(status IN('DRAFT','COMPLETED')),statement_total numeric(20,2) NOT NULL DEFAULT 0,
  ledger_total numeric(20,2) NOT NULL DEFAULT 0,difference numeric(20,2) NOT NULL DEFAULT 0,matched_count integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES app_users(id),created_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz,UNIQUE(branch_id,period)
);

CREATE TABLE import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),job_id uuid REFERENCES background_jobs(id) ON DELETE SET NULL,module varchar(40) NOT NULL,
  file_name text NOT NULL,total_rows integer NOT NULL DEFAULT 0,success_rows integer NOT NULL DEFAULT 0,error_rows integer NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]',created_by uuid NOT NULL REFERENCES app_users(id),created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO chart_of_accounts(code,name,normal_side,category) VALUES
 ('2200','Utang Payroll','C','LIABILITY'),('2400','Utang BPJS','C','LIABILITY'),('4200','Pendapatan Lain-lain','C','REVENUE'),
 ('6200','Beban Gaji','D','EXPENSE'),('6210','Beban BPJS','D','EXPENSE')
ON CONFLICT(code) DO NOTHING;

COMMIT;
