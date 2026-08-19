BEGIN;

-- 108 · Compensation Management — struktur grade gaji (SAP-style salary bands).
-- Tiap grade punya min–mid–max; dipakai menghitung compa-ratio & position-in-range.
-- tenant_id + RLS mengikuti pola 093/107.
CREATE TABLE salary_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT COALESCE(nullif(current_setting('app.tenant_id', true), '')::uuid, '00000000-0000-0000-0000-000000000001'::uuid) REFERENCES tenants(id),
  grade_code varchar(20) NOT NULL,
  grade_name varchar(80),
  min_salary numeric(20,2) NOT NULL,
  mid_salary numeric(20,2) NOT NULL,
  max_salary numeric(20,2) NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'IDR',
  effective_from date NOT NULL DEFAULT current_date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT salary_grades_band CHECK (min_salary <= mid_salary AND mid_salary <= max_salary),
  UNIQUE (tenant_id, grade_code, effective_from)
);
CREATE INDEX salary_grades_tenant_idx ON salary_grades (tenant_id);
CREATE INDEX salary_grades_code_idx ON salary_grades (grade_code, active);

ALTER TABLE salary_grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON salary_grades AS RESTRICTIVE
  USING (app_tenant_visible(tenant_id)) WITH CHECK (app_tenant_visible(tenant_id));

-- Seed band untuk tenant MAT (grade A–E). Nominal IDR/bulan.
INSERT INTO salary_grades (tenant_id, grade_code, grade_name, min_salary, mid_salary, max_salary) VALUES
  ('00000000-0000-0000-0000-000000000001','A','Staff / Junior',        4000000, 6000000, 8000000),
  ('00000000-0000-0000-0000-000000000001','B','Senior / Specialist',   6000000, 9000000, 12000000),
  ('00000000-0000-0000-0000-000000000001','C','Lead / Supervisor',     10000000,15000000,20000000),
  ('00000000-0000-0000-0000-000000000001','D','Manager',               18000000,25000000,35000000),
  ('00000000-0000-0000-0000-000000000001','E','Head / Director',       32000000,45000000,65000000)
ON CONFLICT DO NOTHING;

COMMIT;
