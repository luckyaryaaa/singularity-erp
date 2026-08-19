BEGIN;

-- 110 · Performance & Talent Management — data 9-box (performance × potential),
-- flight-risk, kesiapan suksesi, dan progres goal. Satu baris per karyawan.
-- tenant_id (RESTRICTIVE) + employee_scope (PERMISSIVE) — dua policy, pola 107.
CREATE TABLE employee_talent (
  employee_id uuid PRIMARY KEY REFERENCES employees(id),
  tenant_id uuid NOT NULL DEFAULT COALESCE(nullif(current_setting('app.tenant_id', true), '')::uuid, '00000000-0000-0000-0000-000000000001'::uuid) REFERENCES tenants(id),
  performance_rating int CHECK (performance_rating BETWEEN 1 AND 5),
  potential varchar(10) CHECK (potential IN ('LOW','MEDIUM','HIGH')),
  flight_risk varchar(10) CHECK (flight_risk IN ('LOW','MEDIUM','HIGH')),
  succession_readiness varchar(20) CHECK (succession_readiness IN ('READY_NOW','READY_1_2Y','READY_3Y','NOT_READY')),
  review_period varchar(20),
  goals_total int NOT NULL DEFAULT 0 CHECK (goals_total >= 0),
  goals_completed int NOT NULL DEFAULT 0 CHECK (goals_completed >= 0),
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES app_users(id)
);
CREATE INDEX employee_talent_tenant_idx ON employee_talent (tenant_id);

ALTER TABLE employee_talent ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON employee_talent AS RESTRICTIVE
  USING (app_tenant_visible(tenant_id)) WITH CHECK (app_tenant_visible(tenant_id));
CREATE POLICY employee_scope_isolation ON employee_talent
  USING (app_employee_visible(employee_id)) WITH CHECK (app_employee_visible(employee_id));

COMMIT;
