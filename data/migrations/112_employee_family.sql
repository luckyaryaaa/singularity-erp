BEGIN;

-- 112 · Keluarga & Tanggungan karyawan — pasangan, anak, orang tua, dll.
-- is_dependent menandai tanggungan untuk PTKP (maks 3). bpjs_covered untuk
-- kepesertaan BPJS Kesehatan keluarga. Status PTKP diturunkan dari status
-- perkawinan (profil pribadi) + jumlah tanggungan → feed ke profil pajak.
-- tenant_id (RESTRICTIVE) + employee_scope (PERMISSIVE) — dua policy, pola 110.
CREATE TABLE employee_family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT COALESCE(nullif(current_setting('app.tenant_id', true), '')::uuid, '00000000-0000-0000-0000-000000000001'::uuid) REFERENCES tenants(id),
  employee_id uuid NOT NULL REFERENCES employees(id),
  full_name varchar(120) NOT NULL,
  relationship varchar(20) NOT NULL DEFAULT 'CHILD' CHECK (relationship IN ('SPOUSE','CHILD','PARENT','SIBLING','OTHER')),
  gender varchar(10) CHECK (gender IN ('MALE','FEMALE')),
  birth_date date,
  is_dependent boolean NOT NULL DEFAULT true,
  bpjs_covered boolean NOT NULL DEFAULT false,
  occupation varchar(80),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX employee_family_tenant_idx ON employee_family_members (tenant_id);
CREATE INDEX employee_family_emp_idx ON employee_family_members (employee_id);

ALTER TABLE employee_family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON employee_family_members AS RESTRICTIVE
  USING (app_tenant_visible(tenant_id)) WITH CHECK (app_tenant_visible(tenant_id));
CREATE POLICY employee_scope_isolation ON employee_family_members
  USING (app_employee_visible(employee_id)) WITH CHECK (app_employee_visible(employee_id));

COMMIT;
