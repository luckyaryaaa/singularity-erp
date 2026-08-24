BEGIN;

-- 115 · Siklus manajemen kinerja karyawan — Goals/OKR (dengan progres berbobot)
-- dan Performance Review (self-assessment, penilaian manajer, kompetensi, rating
-- akhir, kalibrasi). Memperluas tab "Performance & Talent" (9-box sudah ada di 110).
-- tenant_id (RESTRICTIVE) + employee_scope (PERMISSIVE) — dua policy, pola 110.

CREATE TABLE employee_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT COALESCE(nullif(current_setting('app.tenant_id', true), '')::uuid, '00000000-0000-0000-0000-000000000001'::uuid) REFERENCES tenants(id),
  employee_id uuid NOT NULL REFERENCES employees(id),
  period varchar(20) NOT NULL DEFAULT to_char(now(), 'YYYY'),
  category varchar(20) NOT NULL DEFAULT 'OKR' CHECK (category IN ('OKR','BUSINESS','DEVELOPMENT','BEHAVIOR')),
  objective text NOT NULL,
  key_results text,
  metric text,
  weight int NOT NULL DEFAULT 0 CHECK (weight BETWEEN 0 AND 100),
  progress int NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status varchar(20) NOT NULL DEFAULT 'ON_TRACK' CHECK (status IN ('DRAFT','ON_TRACK','AT_RISK','DONE','CANCELLED')),
  start_date date,
  due_date date,
  created_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX employee_goals_tenant_idx ON employee_goals (tenant_id);
CREATE INDEX employee_goals_emp_idx ON employee_goals (employee_id, period);

ALTER TABLE employee_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON employee_goals AS RESTRICTIVE
  USING (app_tenant_visible(tenant_id)) WITH CHECK (app_tenant_visible(tenant_id));
CREATE POLICY employee_scope_isolation ON employee_goals
  USING (app_employee_visible(employee_id)) WITH CHECK (app_employee_visible(employee_id));

CREATE TABLE employee_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT COALESCE(nullif(current_setting('app.tenant_id', true), '')::uuid, '00000000-0000-0000-0000-000000000001'::uuid) REFERENCES tenants(id),
  employee_id uuid NOT NULL REFERENCES employees(id),
  period varchar(20) NOT NULL,
  review_type varchar(20) NOT NULL DEFAULT 'ANNUAL' CHECK (review_type IN ('ANNUAL','MID_YEAR','PROBATION','PROJECT','QUARTERLY')),
  self_assessment text,
  manager_review text,
  strengths text,
  improvements text,
  competencies jsonb NOT NULL DEFAULT '{}'::jsonb,
  rating numeric(2,1) CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  status varchar(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SELF_SUBMITTED','MANAGER_REVIEW','CALIBRATED','FINALIZED')),
  calibrated boolean NOT NULL DEFAULT false,
  reviewer_id uuid REFERENCES app_users(id),
  created_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX employee_reviews_tenant_idx ON employee_reviews (tenant_id);
CREATE INDEX employee_reviews_emp_idx ON employee_reviews (employee_id, period);

ALTER TABLE employee_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON employee_reviews AS RESTRICTIVE
  USING (app_tenant_visible(tenant_id)) WITH CHECK (app_tenant_visible(tenant_id));
CREATE POLICY employee_scope_isolation ON employee_reviews
  USING (app_employee_visible(employee_id)) WITH CHECK (app_employee_visible(employee_id));

COMMIT;
