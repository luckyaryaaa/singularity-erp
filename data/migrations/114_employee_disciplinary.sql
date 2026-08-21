BEGIN;

-- 114 · Surat Peringatan (SP) & disiplin karyawan — SP1/SP2/SP3/teguran dengan
-- masa berlaku (umumnya 6 bulan) + pelanggaran. Untuk tab "Surat & Disiplin"
-- (generator surat + tracking sanksi). tenant_id (RESTRICTIVE) + employee_scope
-- (PERMISSIVE) — dua policy, pola 110.
CREATE TABLE employee_disciplinary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT COALESCE(nullif(current_setting('app.tenant_id', true), '')::uuid, '00000000-0000-0000-0000-000000000001'::uuid) REFERENCES tenants(id),
  employee_id uuid NOT NULL REFERENCES employees(id),
  level varchar(10) NOT NULL DEFAULT 'SP1' CHECK (level IN ('TEGURAN','SP1','SP2','SP3')),
  violation text NOT NULL,
  issued_date date NOT NULL,
  expiry_date date,
  status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','EXPIRED','REVOKED')),
  notes text,
  issued_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX employee_disciplinary_tenant_idx ON employee_disciplinary (tenant_id);
CREATE INDEX employee_disciplinary_emp_idx ON employee_disciplinary (employee_id, status);

ALTER TABLE employee_disciplinary ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON employee_disciplinary AS RESTRICTIVE
  USING (app_tenant_visible(tenant_id)) WITH CHECK (app_tenant_visible(tenant_id));
CREATE POLICY employee_scope_isolation ON employee_disciplinary
  USING (app_employee_visible(employee_id)) WITH CHECK (app_employee_visible(employee_id));

COMMIT;
