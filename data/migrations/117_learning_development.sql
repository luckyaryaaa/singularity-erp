BEGIN;

-- 117 · Learning & Development (LMS) — katalog program pelatihan (tingkat-tenant)
-- + pendaftaran/riwayat pelatihan per karyawan. training_programs: pola tenant
-- non-employee (RESTRICTIVE tenant_isolation + PERMISSIVE tenant_access).
-- training_enrollments: pola 110 employee-scope (tenant RESTRICTIVE + employee
-- PERMISSIVE) agar HR melihat semua & karyawan melihat miliknya.

CREATE TABLE training_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT COALESCE(nullif(current_setting('app.tenant_id', true), '')::uuid, '00000000-0000-0000-0000-000000000001'::uuid) REFERENCES tenants(id),
  code varchar(30) NOT NULL,
  title varchar(180) NOT NULL,
  category varchar(20) NOT NULL DEFAULT 'TECHNICAL' CHECK (category IN ('TECHNICAL','LEADERSHIP','COMPLIANCE','SOFT_SKILL','SAFETY','ONBOARDING','PRODUCT','OTHER')),
  provider varchar(120),
  delivery_mode varchar(15) NOT NULL DEFAULT 'IN_HOUSE' CHECK (delivery_mode IN ('IN_HOUSE','EXTERNAL','ONLINE','BLENDED')),
  duration_hours numeric(6,1) CHECK (duration_hours IS NULL OR duration_hours >= 0),
  cost numeric(15,2) CHECK (cost IS NULL OR cost >= 0),
  status varchar(15) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT','ACTIVE','ARCHIVED')),
  description text,
  created_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
CREATE INDEX training_programs_tenant_idx ON training_programs (tenant_id);

ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON training_programs AS RESTRICTIVE
  USING (app_tenant_visible(tenant_id)) WITH CHECK (app_tenant_visible(tenant_id));
CREATE POLICY tenant_access ON training_programs
  USING (app_tenant_visible(tenant_id)) WITH CHECK (app_tenant_visible(tenant_id));

CREATE TABLE training_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT COALESCE(nullif(current_setting('app.tenant_id', true), '')::uuid, '00000000-0000-0000-0000-000000000001'::uuid) REFERENCES tenants(id),
  employee_id uuid NOT NULL REFERENCES employees(id),
  program_id uuid NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  status varchar(15) NOT NULL DEFAULT 'ENROLLED' CHECK (status IN ('ENROLLED','IN_PROGRESS','COMPLETED','CANCELLED','FAILED')),
  enrolled_at date NOT NULL DEFAULT current_date,
  started_at date,
  completed_at date,
  score numeric(5,2) CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  certificate_file_id uuid,
  notes text,
  created_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX training_enrollments_tenant_idx ON training_enrollments (tenant_id);
CREATE INDEX training_enrollments_emp_idx ON training_enrollments (employee_id, status);
CREATE INDEX training_enrollments_prog_idx ON training_enrollments (program_id);

ALTER TABLE training_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON training_enrollments AS RESTRICTIVE
  USING (app_tenant_visible(tenant_id)) WITH CHECK (app_tenant_visible(tenant_id));
CREATE POLICY employee_scope_isolation ON training_enrollments
  USING (app_employee_visible(employee_id)) WITH CHECK (app_employee_visible(employee_id));

COMMIT;
