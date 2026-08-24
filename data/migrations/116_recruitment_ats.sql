BEGIN;

-- 116 · Rekrutmen / ATS (Applicant Tracking System) — lowongan (job_requisitions)
-- + pelamar (candidates) dengan pipeline tahap. Entitas tingkat-tenant (bukan
-- per-karyawan): RESTRICTIVE tenant_isolation (batas keras) + PERMISSIVE
-- tenant_access (memberi akses role app dalam tenant). Pola tenant non-employee.

CREATE TABLE job_requisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT COALESCE(nullif(current_setting('app.tenant_id', true), '')::uuid, '00000000-0000-0000-0000-000000000001'::uuid) REFERENCES tenants(id),
  code varchar(30) NOT NULL,
  title varchar(160) NOT NULL,
  department varchar(120),
  location varchar(120),
  employment_type varchar(20) NOT NULL DEFAULT 'PKWTT' CHECK (employment_type IN ('PKWTT','PKWT','INTERN','CONTRACT','OUTSOURCE')),
  headcount int NOT NULL DEFAULT 1 CHECK (headcount >= 1),
  status varchar(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('DRAFT','OPEN','ON_HOLD','CLOSED','FILLED','CANCELLED')),
  priority varchar(10) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW','MEDIUM','HIGH','URGENT')),
  salary_range varchar(80),
  hiring_manager varchar(120),
  description text,
  requirements text,
  opened_at date DEFAULT current_date,
  target_date date,
  created_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
CREATE INDEX job_requisitions_tenant_idx ON job_requisitions (tenant_id);
CREATE INDEX job_requisitions_status_idx ON job_requisitions (tenant_id, status);

ALTER TABLE job_requisitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON job_requisitions AS RESTRICTIVE
  USING (app_tenant_visible(tenant_id)) WITH CHECK (app_tenant_visible(tenant_id));
CREATE POLICY tenant_access ON job_requisitions
  USING (app_tenant_visible(tenant_id)) WITH CHECK (app_tenant_visible(tenant_id));

CREATE TABLE candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT COALESCE(nullif(current_setting('app.tenant_id', true), '')::uuid, '00000000-0000-0000-0000-000000000001'::uuid) REFERENCES tenants(id),
  requisition_id uuid REFERENCES job_requisitions(id) ON DELETE CASCADE,
  name varchar(160) NOT NULL,
  email varchar(160),
  phone varchar(40),
  source varchar(20) NOT NULL DEFAULT 'OTHER' CHECK (source IN ('JOB_PORTAL','REFERRAL','LINKEDIN','WALK_IN','AGENCY','CAMPUS','OTHER')),
  stage varchar(20) NOT NULL DEFAULT 'APPLIED' CHECK (stage IN ('APPLIED','SCREENING','INTERVIEW','OFFER','HIRED','REJECTED','WITHDRAWN')),
  rating int CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  current_title varchar(120),
  expected_salary numeric(15,2),
  resume_file_id uuid,
  notes text,
  applied_at date NOT NULL DEFAULT current_date,
  created_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX candidates_tenant_idx ON candidates (tenant_id);
CREATE INDEX candidates_req_idx ON candidates (requisition_id, stage);

ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON candidates AS RESTRICTIVE
  USING (app_tenant_visible(tenant_id)) WITH CHECK (app_tenant_visible(tenant_id));
CREATE POLICY tenant_access ON candidates
  USING (app_tenant_visible(tenant_id)) WITH CHECK (app_tenant_visible(tenant_id));

COMMIT;
