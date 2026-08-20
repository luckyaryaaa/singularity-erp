BEGIN;

-- 113 · Offboarding & Pesangon — siklus keluar karyawan (resign/PHK/pensiun/
-- meninggal/end-kontrak) + kalkulasi pesangon PP 35/2021 (UP + UPMK + UPH +
-- uang pisah) berdasarkan masa kerja, upah, dan alasan; checklist clearance;
-- perubahan status lifecycle saat selesai. tenant_id (RESTRICTIVE) +
-- employee_scope (PERMISSIVE) — dua policy, pola 110.
CREATE TABLE employee_offboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT COALESCE(nullif(current_setting('app.tenant_id', true), '')::uuid, '00000000-0000-0000-0000-000000000001'::uuid) REFERENCES tenants(id),
  employee_id uuid NOT NULL REFERENCES employees(id),
  reason varchar(30) NOT NULL CHECK (reason IN ('RESIGN','TERM_EFISIENSI','TERM_CEGAH_RUGI','PENSIUN','MENINGGAL','SAKIT_LAMA','END_CONTRACT','PELANGGARAN_BERAT','MANGKIR','LAINNYA')),
  effective_date date NOT NULL,
  last_working_date date,
  tenure_years numeric(6,2) NOT NULL DEFAULT 0,
  monthly_wage numeric(20,2) NOT NULL DEFAULT 0,
  unused_leave_days int NOT NULL DEFAULT 0,
  up_amount numeric(20,2) NOT NULL DEFAULT 0,
  upmk_amount numeric(20,2) NOT NULL DEFAULT 0,
  uph_amount numeric(20,2) NOT NULL DEFAULT 0,
  separation_pay numeric(20,2) NOT NULL DEFAULT 0,
  total_amount numeric(20,2) NOT NULL DEFAULT 0,
  clearance jsonb NOT NULL DEFAULT '{}'::jsonb,
  status varchar(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','CLEARANCE','COMPLETED','CANCELLED')),
  notes text,
  initiated_by uuid REFERENCES app_users(id),
  completed_by uuid REFERENCES app_users(id),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX employee_offboarding_tenant_idx ON employee_offboarding (tenant_id);
CREATE INDEX employee_offboarding_emp_idx ON employee_offboarding (employee_id, status);

ALTER TABLE employee_offboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON employee_offboarding AS RESTRICTIVE
  USING (app_tenant_visible(tenant_id)) WITH CHECK (app_tenant_visible(tenant_id));
CREATE POLICY employee_scope_isolation ON employee_offboarding
  USING (app_employee_visible(employee_id)) WITH CHECK (app_employee_visible(employee_id));

COMMIT;
