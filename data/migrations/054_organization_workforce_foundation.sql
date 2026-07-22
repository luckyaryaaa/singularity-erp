BEGIN;

CREATE OR REPLACE FUNCTION app_legal_entity_visible(target uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT current_setting('app.is_system',true)='on'
      OR current_setting('app.cross_branch',true)='on'
      OR EXISTS(SELECT 1 FROM branches b WHERE b.id=NULLIF(current_setting('app.branch_id',true),'')::uuid AND b.legal_entity_id=target);
$$;

CREATE TABLE organization_hierarchy_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), legal_entity_id uuid NOT NULL REFERENCES legal_entities(id),
  version_no integer NOT NULL CHECK(version_no>0), status varchar(20) NOT NULL DEFAULT 'DRAFT'
    CHECK(status IN('DRAFT','PENDING_APPROVAL','APPROVED','ACTIVE','SUPERSEDED','REJECTED')),
  effective_from date NOT NULL, effective_to date, snapshot jsonb NOT NULL, snapshot_sha256 char(64) NOT NULL,
  change_reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), created_by uuid NOT NULL REFERENCES app_users(id),
  submitted_at timestamptz, approved_at timestamptz, approved_by uuid REFERENCES app_users(id), decision_reason text,
  UNIQUE(legal_entity_id,version_no), CHECK(effective_to IS NULL OR effective_to>=effective_from),
  CHECK(approved_by IS NULL OR approved_by<>created_by)
);
CREATE UNIQUE INDEX ux_org_hierarchy_active ON organization_hierarchy_versions(legal_entity_id) WHERE status='ACTIVE';

CREATE TABLE organization_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), legal_entity_id uuid NOT NULL REFERENCES legal_entities(id),
  code varchar(30) NOT NULL, title varchar(160) NOT NULL, job_family varchar(100), grade varchar(30), description text,
  status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK(status IN('DRAFT','ACTIVE','INACTIVE','ARCHIVED')),
  effective_from date NOT NULL DEFAULT current_date, effective_to date, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id), updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid REFERENCES app_users(id),
  UNIQUE(legal_entity_id,code), CHECK(effective_to IS NULL OR effective_to>=effective_from)
);

CREATE TABLE organization_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), legal_entity_id uuid NOT NULL REFERENCES legal_entities(id),
  code varchar(30) NOT NULL, name varchar(160) NOT NULL, job_id uuid NOT NULL REFERENCES organization_jobs(id),
  department_id uuid REFERENCES departments(id), branch_id uuid REFERENCES branches(id), reports_to_position_id uuid REFERENCES organization_positions(id),
  headcount integer NOT NULL DEFAULT 1 CHECK(headcount BETWEEN 1 AND 1000), position_type varchar(20) NOT NULL DEFAULT 'PERMANENT' CHECK(position_type IN('PERMANENT','TEMPORARY','PROJECT')),
  status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK(status IN('DRAFT','ACTIVE','FROZEN','INACTIVE','ARCHIVED')),
  effective_from date NOT NULL DEFAULT current_date, effective_to date, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id), updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid REFERENCES app_users(id),
  UNIQUE(legal_entity_id,code), CHECK(reports_to_position_id IS NULL OR reports_to_position_id<>id), CHECK(effective_to IS NULL OR effective_to>=effective_from)
);
CREATE INDEX ix_org_positions_structure ON organization_positions(legal_entity_id,department_id,branch_id,status);

CREATE TABLE position_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), position_id uuid NOT NULL REFERENCES organization_positions(id), employee_id uuid NOT NULL REFERENCES employees(id),
  assignment_type varchar(20) NOT NULL DEFAULT 'PRIMARY' CHECK(assignment_type IN('PRIMARY','ACTING','SECONDARY')),
  fte numeric(5,2) NOT NULL DEFAULT 1 CHECK(fte>0 AND fte<=1), effective_from date NOT NULL, effective_to date,
  status varchar(20) NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK(status IN('PENDING_APPROVAL','ACTIVE','REJECTED','ENDED','CANCELLED')),
  change_reason text NOT NULL, proposed_at timestamptz NOT NULL DEFAULT now(), proposed_by uuid NOT NULL REFERENCES app_users(id),
  decided_at timestamptz, decided_by uuid REFERENCES app_users(id), decision_reason text,
  CHECK(effective_to IS NULL OR effective_to>=effective_from), CHECK(decided_by IS NULL OR decided_by<>proposed_by)
);
CREATE INDEX ix_position_assignments_position ON position_assignments(position_id,status,effective_from,effective_to);
CREATE INDEX ix_position_assignments_employee ON position_assignments(employee_id,status,effective_from,effective_to);

CREATE TABLE authority_delegations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), delegator_user_id uuid NOT NULL REFERENCES app_users(id), delegate_user_id uuid NOT NULL REFERENCES app_users(id),
  permission_code varchar(80) NOT NULL, scope_type varchar(30) NOT NULL DEFAULT 'GLOBAL'
    CHECK(scope_type IN('GLOBAL','LEGAL_ENTITY','BUSINESS_UNIT','BRANCH','PLANT','WAREHOUSE','DEPARTMENT','PROJECT','OWN_RECORD')),
  scope_id uuid, effective_from timestamptz NOT NULL, effective_until timestamptz NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK(status IN('PENDING_APPROVAL','ACTIVE','REJECTED','REVOKED','EXPIRED')),
  reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), created_by uuid NOT NULL REFERENCES app_users(id),
  approved_at timestamptz, approved_by uuid REFERENCES app_users(id), decision_reason text, revoked_at timestamptz, revoked_by uuid REFERENCES app_users(id),
  CHECK(delegator_user_id<>delegate_user_id), CHECK(effective_until>effective_from),
  CHECK(effective_until<=effective_from+interval '90 days'), CHECK((scope_type='GLOBAL')=(scope_id IS NULL)),
  CHECK(approved_by IS NULL OR approved_by<>created_by)
);
CREATE INDEX ix_authority_delegations_runtime ON authority_delegations(delegate_user_id,status,effective_from,effective_until);

CREATE OR REPLACE FUNCTION enforce_position_assignment_capacity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE capacity integer; occupied integer; overlapping_primary integer;
BEGIN
  IF NEW.status<>'ACTIVE' THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.position_id::text,0));
  SELECT headcount INTO capacity FROM organization_positions WHERE id=NEW.position_id AND status='ACTIVE' FOR UPDATE;
  IF capacity IS NULL THEN RAISE EXCEPTION 'Position is not active' USING ERRCODE='23514'; END IF;
  SELECT count(*) INTO occupied FROM position_assignments a WHERE a.position_id=NEW.position_id AND a.status='ACTIVE' AND a.id<>NEW.id
    AND daterange(a.effective_from,COALESCE(a.effective_to,'infinity'::date),'[]') && daterange(NEW.effective_from,COALESCE(NEW.effective_to,'infinity'::date),'[]');
  IF occupied>=capacity THEN RAISE EXCEPTION 'Position headcount capacity exceeded' USING ERRCODE='23514'; END IF;
  IF NEW.assignment_type='PRIMARY' THEN
    SELECT count(*) INTO overlapping_primary FROM position_assignments a WHERE a.employee_id=NEW.employee_id AND a.assignment_type='PRIMARY' AND a.status='ACTIVE' AND a.id<>NEW.id
      AND daterange(a.effective_from,COALESCE(a.effective_to,'infinity'::date),'[]') && daterange(NEW.effective_from,COALESCE(NEW.effective_to,'infinity'::date),'[]');
    IF overlapping_primary>0 THEN RAISE EXCEPTION 'Employee already has an overlapping primary assignment' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER position_assignment_capacity BEFORE INSERT OR UPDATE ON position_assignments FOR EACH ROW EXECUTE FUNCTION enforce_position_assignment_capacity();

-- Backfill active legacy employee positions into canonical Job/Position/Assignment.
INSERT INTO organization_jobs(legal_entity_id,code,title,job_family,status,created_by)
SELECT DISTINCT b.legal_entity_id,'JOB-'||upper(substr(md5(upper(ep.position_title)),1,10)),ep.position_title,COALESCE(ep.division,d.name),'ACTIVE',ep.created_by
FROM employee_positions ep JOIN employees e ON e.id=ep.employee_id JOIN branches b ON b.id=COALESCE(ep.branch_id,e.branch_id)
LEFT JOIN departments d ON d.id=ep.department_id WHERE b.legal_entity_id IS NOT NULL
ON CONFLICT(legal_entity_id,code) DO NOTHING;

INSERT INTO organization_positions(id,legal_entity_id,code,name,job_id,department_id,branch_id,headcount,status,effective_from,effective_to,created_by)
SELECT ep.id,b.legal_entity_id,'POS-'||upper(substr(replace(ep.id::text,'-',''),1,12)),ep.position_title,j.id,ep.department_id,COALESCE(ep.branch_id,e.branch_id),1,'ACTIVE',ep.effective_from,ep.effective_to,ep.created_by
FROM employee_positions ep JOIN employees e ON e.id=ep.employee_id JOIN branches b ON b.id=COALESCE(ep.branch_id,e.branch_id)
JOIN organization_jobs j ON j.legal_entity_id=b.legal_entity_id AND j.code='JOB-'||upper(substr(md5(upper(ep.position_title)),1,10))
WHERE b.legal_entity_id IS NOT NULL ON CONFLICT(id) DO NOTHING;

INSERT INTO position_assignments(position_id,employee_id,assignment_type,effective_from,effective_to,status,change_reason,proposed_by)
SELECT ep.id,ep.employee_id,'PRIMARY',ep.effective_from,ep.effective_to,'ACTIVE','Migration from employee_positions',COALESCE(ep.created_by,(SELECT id FROM app_users WHERE role='owner' ORDER BY created_at LIMIT 1))
FROM employee_positions ep JOIN organization_positions p ON p.id=ep.id ON CONFLICT DO NOTHING;

ALTER TABLE organization_hierarchy_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY legal_entity_scope ON organization_hierarchy_versions USING(app_legal_entity_visible(legal_entity_id)) WITH CHECK(app_legal_entity_visible(legal_entity_id));
ALTER TABLE organization_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY legal_entity_scope ON organization_jobs USING(app_legal_entity_visible(legal_entity_id)) WITH CHECK(app_legal_entity_visible(legal_entity_id));
ALTER TABLE organization_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY legal_entity_scope ON organization_positions USING(app_legal_entity_visible(legal_entity_id)) WITH CHECK(app_legal_entity_visible(legal_entity_id));

COMMIT;
