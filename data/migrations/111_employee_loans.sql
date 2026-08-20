BEGIN;

-- 111 · Kasbon / Pinjaman Karyawan — pengajuan pinjaman/kasbon + persetujuan
-- (maker-checker, SoD approver≠pengaju) + jadwal cicilan. Saat DISETUJUI,
-- modul membuat baris payroll_components kind=DEDUCTION (mekanisme potongan
-- payroll yang SUDAH dibaca payroll run) sehingga cicilan otomatis terpotong
-- tanpa menyentuh engine payroll. Saat lunas/batal, komponen di-nonaktifkan.
-- tenant_id (RESTRICTIVE) + employee_scope (PERMISSIVE) — dua policy, pola 110.
CREATE TABLE employee_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT COALESCE(nullif(current_setting('app.tenant_id', true), '')::uuid, '00000000-0000-0000-0000-000000000001'::uuid) REFERENCES tenants(id),
  employee_id uuid NOT NULL REFERENCES employees(id),
  loan_number varchar(40) NOT NULL,
  loan_type varchar(20) NOT NULL DEFAULT 'KASBON' CHECK (loan_type IN ('KASBON','INSTALLMENT','EMERGENCY')),
  principal_amount numeric(20,2) NOT NULL CHECK (principal_amount > 0),
  tenor_months int NOT NULL DEFAULT 1 CHECK (tenor_months BETWEEN 1 AND 120),
  installment_amount numeric(20,2) NOT NULL DEFAULT 0 CHECK (installment_amount >= 0),
  interest_rate numeric(6,4) NOT NULL DEFAULT 0 CHECK (interest_rate >= 0),
  purpose text,
  start_period char(7),
  status varchar(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','ACTIVE','SETTLED','CANCELLED')),
  installments_paid int NOT NULL DEFAULT 0 CHECK (installments_paid >= 0),
  outstanding_amount numeric(20,2) NOT NULL DEFAULT 0 CHECK (outstanding_amount >= 0),
  deduction_code varchar(30),
  requested_by uuid REFERENCES app_users(id),
  approved_by uuid REFERENCES app_users(id),
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, loan_number)
);
CREATE INDEX employee_loans_tenant_idx ON employee_loans (tenant_id);
CREATE INDEX employee_loans_emp_idx ON employee_loans (employee_id, status);

ALTER TABLE employee_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON employee_loans AS RESTRICTIVE
  USING (app_tenant_visible(tenant_id)) WITH CHECK (app_tenant_visible(tenant_id));
CREATE POLICY employee_scope_isolation ON employee_loans
  USING (app_employee_visible(employee_id)) WITH CHECK (app_employee_visible(employee_id));

COMMIT;
