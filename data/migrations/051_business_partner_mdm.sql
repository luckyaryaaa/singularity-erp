BEGIN;

-- Unified Business Partner / Party foundation. Legacy customer and supplier
-- identifiers remain stable; the canonical party is linked rather than
-- replacing transaction-facing rows.
CREATE TABLE business_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_number varchar(30) NOT NULL UNIQUE,
  party_type varchar(20) NOT NULL CHECK (party_type IN ('ORGANIZATION','PERSON')),
  display_name varchar(200) NOT NULL,
  legal_name varchar(240),
  normalized_name varchar(240) NOT NULL,
  tax_id varchar(40),
  status varchar(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('DRAFT','ACTIVE','BLOCKED','INACTIVE','MERGED','ARCHIVED')),
  golden_record boolean NOT NULL DEFAULT true,
  merged_into_id uuid REFERENCES business_partners(id),
  owner_branch_id uuid NOT NULL REFERENCES branches(id),
  data_quality_score smallint NOT NULL DEFAULT 0 CHECK (data_quality_score BETWEEN 0 AND 100),
  quality_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  mdm_version integer NOT NULL DEFAULT 1 CHECK (mdm_version > 0),
  effective_from date NOT NULL DEFAULT current_date,
  effective_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES app_users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES app_users(id),
  CHECK (effective_to IS NULL OR effective_to >= effective_from),
  CHECK ((status='MERGED') = (merged_into_id IS NOT NULL)),
  CHECK (merged_into_id IS NULL OR merged_into_id <> id)
);
CREATE INDEX ix_business_partners_name ON business_partners(normalized_name);
CREATE INDEX ix_business_partners_branch ON business_partners(owner_branch_id,status);
CREATE INDEX ix_business_partners_merge ON business_partners(merged_into_id) WHERE merged_into_id IS NOT NULL;

ALTER TABLE customers ADD COLUMN business_partner_id uuid REFERENCES business_partners(id);
ALTER TABLE suppliers ADD COLUMN business_partner_id uuid REFERENCES business_partners(id);
CREATE INDEX ix_customers_business_partner ON customers(business_partner_id);
CREATE INDEX ix_suppliers_business_partner ON suppliers(business_partner_id);

CREATE TABLE business_partner_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_partner_id uuid NOT NULL REFERENCES business_partners(id),
  role_type varchar(20) NOT NULL CHECK (role_type IN ('CUSTOMER','SUPPLIER','CONTACT','EMPLOYEE','PROSPECT')),
  role_code varchar(30),
  customer_id uuid REFERENCES customers(id),
  supplier_id uuid REFERENCES suppliers(id),
  status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','BLOCKED','INACTIVE')),
  effective_from date NOT NULL DEFAULT current_date,
  effective_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES app_users(id),
  CHECK (effective_to IS NULL OR effective_to >= effective_from),
  CHECK ((role_type='CUSTOMER') = (customer_id IS NOT NULL)),
  CHECK ((role_type='SUPPLIER') = (supplier_id IS NOT NULL))
);
CREATE UNIQUE INDEX ux_bp_role_customer ON business_partner_roles(customer_id) WHERE customer_id IS NOT NULL;
CREATE UNIQUE INDEX ux_bp_role_supplier ON business_partner_roles(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX ix_bp_roles_partner ON business_partner_roles(business_partner_id,role_type,status);

CREATE TABLE business_partner_identifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_partner_id uuid NOT NULL REFERENCES business_partners(id),
  identifier_type varchar(30) NOT NULL CHECK (identifier_type IN ('NPWP','NIK','REGISTRATION','EXTERNAL_ID')),
  identifier_value varchar(120) NOT NULL,
  normalized_value varchar(120) NOT NULL,
  issuing_country char(2) NOT NULL DEFAULT 'ID',
  verified boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES app_users(id)
);
CREATE UNIQUE INDEX ux_bp_identifier_active ON business_partner_identifiers(identifier_type,issuing_country,normalized_value) WHERE active;
CREATE INDEX ix_bp_identifiers_partner ON business_partner_identifiers(business_partner_id);

CREATE TABLE business_partner_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_partner_id uuid NOT NULL REFERENCES business_partners(id),
  site_type varchar(20) NOT NULL CHECK (site_type IN ('PRIMARY','BILL_TO','SHIP_TO','OFFICE','FACTORY','WAREHOUSE','PROJECT')),
  label varchar(100), address text NOT NULL, city varchar(80), province varchar(80), postal_code varchar(15), country char(2) NOT NULL DEFAULT 'ID',
  is_primary boolean NOT NULL DEFAULT false, active boolean NOT NULL DEFAULT true,
  source_type varchar(30), source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id)
);
CREATE UNIQUE INDEX ux_bp_site_source ON business_partner_sites(source_type,source_id) WHERE source_id IS NOT NULL;
CREATE UNIQUE INDEX ux_bp_site_primary ON business_partner_sites(business_partner_id) WHERE is_primary AND active;

CREATE TABLE business_partner_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_partner_id uuid NOT NULL REFERENCES business_partners(id),
  contact_name varchar(160) NOT NULL, job_title varchar(100), email varchar(160), phone varchar(40), whatsapp varchar(40),
  is_primary boolean NOT NULL DEFAULT false, active boolean NOT NULL DEFAULT true,
  source_type varchar(30), source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id)
);
CREATE UNIQUE INDEX ux_bp_contact_source ON business_partner_contacts(source_type,source_id) WHERE source_id IS NOT NULL;
CREATE UNIQUE INDEX ux_bp_contact_primary ON business_partner_contacts(business_partner_id) WHERE is_primary AND active;

CREATE TABLE business_partner_survivorship_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name varchar(60) NOT NULL,
  strategy varchar(30) NOT NULL CHECK (strategy IN ('PREFERRED_SOURCE','MOST_RECENT','FIRST_NON_EMPTY')),
  source_priority text[] NOT NULL DEFAULT ARRAY['MANUAL','CUSTOMER','SUPPLIER','IMPORT'],
  effective_from date NOT NULL DEFAULT current_date,
  effective_to date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id),
  UNIQUE(field_name,effective_from), CHECK (effective_to IS NULL OR effective_to >= effective_from)
);
INSERT INTO business_partner_survivorship_rules(field_name,strategy) VALUES
  ('display_name','PREFERRED_SOURCE'),('legal_name','PREFERRED_SOURCE'),
  ('tax_id','FIRST_NON_EMPTY'),('party_type','PREFERRED_SOURCE');

CREATE TABLE business_partner_duplicate_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  left_partner_id uuid NOT NULL REFERENCES business_partners(id),
  right_partner_id uuid NOT NULL REFERENCES business_partners(id),
  match_score numeric(5,2) NOT NULL CHECK (match_score BETWEEN 0 AND 100),
  match_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  status varchar(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IGNORED','MERGED')),
  owner_branch_id uuid NOT NULL REFERENCES branches(id),
  detected_at timestamptz NOT NULL DEFAULT now(), detected_by uuid REFERENCES app_users(id),
  decided_at timestamptz, decided_by uuid REFERENCES app_users(id), decision_reason text,
  survivor_partner_id uuid REFERENCES business_partners(id),
  CHECK (left_partner_id < right_partner_id), CHECK (left_partner_id <> right_partner_id),
  UNIQUE(left_partner_id,right_partner_id)
);
CREATE INDEX ix_bp_duplicates_queue ON business_partner_duplicate_candidates(status,match_score DESC,detected_at DESC);

CREATE TABLE business_partner_merge_lineage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survivor_partner_id uuid NOT NULL REFERENCES business_partners(id),
  merged_partner_id uuid NOT NULL REFERENCES business_partners(id),
  duplicate_candidate_id uuid REFERENCES business_partner_duplicate_candidates(id),
  field_decisions jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text NOT NULL, merged_at timestamptz NOT NULL DEFAULT now(), merged_by uuid NOT NULL REFERENCES app_users(id),
  UNIQUE(merged_partner_id), CHECK (survivor_partner_id <> merged_partner_id)
);

CREATE TABLE master_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type varchar(30) NOT NULL CHECK (entity_type IN ('BUSINESS_PARTNER','CUSTOMER','SUPPLIER')),
  source_name varchar(180) NOT NULL, source_checksum char(64) NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'STAGED' CHECK (status IN ('STAGED','VALIDATED','VALIDATED_WITH_ERRORS','PROMOTING','PROMOTED','PARTIAL','FAILED')),
  owner_branch_id uuid NOT NULL REFERENCES branches(id),
  row_count integer NOT NULL DEFAULT 0, valid_count integer NOT NULL DEFAULT 0, invalid_count integer NOT NULL DEFAULT 0, promoted_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid NOT NULL REFERENCES app_users(id),
  validated_at timestamptz, promoted_at timestamptz,
  UNIQUE(owner_branch_id,entity_type,source_checksum)
);

CREATE TABLE master_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), batch_id uuid NOT NULL REFERENCES master_import_batches(id) ON DELETE CASCADE,
  row_number integer NOT NULL CHECK (row_number > 0), raw_payload jsonb NOT NULL, normalized_payload jsonb,
  status varchar(20) NOT NULL DEFAULT 'STAGED' CHECK (status IN ('STAGED','VALID','INVALID','PROMOTED','FAILED')),
  validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb, promoted_entity_id uuid,
  owner_branch_id uuid NOT NULL REFERENCES branches(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(batch_id,row_number)
);
CREATE INDEX ix_master_import_rows_batch ON master_import_rows(batch_id,status,row_number);

CREATE TABLE master_data_quality_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code varchar(60) NOT NULL,
  target_type varchar(30) NOT NULL CHECK (target_type IN ('BUSINESS_PARTNER','CUSTOMER','SUPPLIER','PRODUCT','EMPLOYEE')),
  field_name varchar(60) NOT NULL,
  rule_type varchar(30) NOT NULL CHECK (rule_type IN ('REQUIRED','REGEX','ENUM','MIN_LENGTH')),
  rule_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  severity varchar(10) NOT NULL CHECK (severity IN ('INFO','WARNING','CRITICAL')),
  description varchar(300) NOT NULL, active boolean NOT NULL DEFAULT true,
  effective_from date NOT NULL DEFAULT current_date, effective_to date,
  owner_branch_id uuid NOT NULL REFERENCES branches(id),
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id),
  UNIQUE(owner_branch_id,target_type,code,effective_from), CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

ALTER TABLE master_data_quality_issues DROP CONSTRAINT master_data_quality_issues_master_type_check;
ALTER TABLE master_data_quality_issues ADD CONSTRAINT master_data_quality_issues_master_type_check
  CHECK (master_type IN ('business_partners','customers','suppliers','products','employees'));

-- Backfill canonical parties. Exact normalized NPWP is the only automatic
-- cross-role unification signal; names alone are routed to duplicate review.
DO $$
DECLARE r record; partner_id uuid; normalized_tax text; branch_id uuid;
BEGIN
  FOR r IN SELECT c.*,u.branch_id creator_branch FROM customers c LEFT JOIN app_users u ON u.id=c.created_by ORDER BY c.created_at,c.id LOOP
    normalized_tax := NULLIF(regexp_replace(COALESCE(r.npwp,''),'[^0-9]','','g'),'');
    branch_id := COALESCE(r.creator_branch,(SELECT id FROM branches ORDER BY created_at,id LIMIT 1));
    partner_id := NULL;
    IF normalized_tax IS NOT NULL THEN SELECT business_partner_id INTO partner_id FROM business_partner_identifiers WHERE identifier_type='NPWP' AND normalized_value=normalized_tax AND active LIMIT 1; END IF;
    IF partner_id IS NULL THEN
      partner_id := gen_random_uuid();
      INSERT INTO business_partners(id,party_number,party_type,display_name,legal_name,normalized_name,tax_id,owner_branch_id,created_by,updated_by)
      VALUES(partner_id,'BP-'||upper(substr(replace(partner_id::text,'-',''),1,16)),CASE WHEN r.customer_type='INDIVIDUAL' THEN 'PERSON' ELSE 'ORGANIZATION' END,r.name,COALESCE(r.legal_name,r.name),regexp_replace(upper(COALESCE(r.legal_name,r.name)),'[^A-Z0-9]','','g'),r.npwp,branch_id,r.created_by,r.updated_by);
    END IF;
    UPDATE customers SET business_partner_id=partner_id WHERE id=r.id;
    INSERT INTO business_partner_roles(business_partner_id,role_type,role_code,customer_id,status,created_by) VALUES(partner_id,'CUSTOMER',r.code,r.id,CASE WHEN r.active THEN 'ACTIVE' ELSE 'INACTIVE' END,r.created_by);
    IF normalized_tax IS NOT NULL THEN INSERT INTO business_partner_identifiers(business_partner_id,identifier_type,identifier_value,normalized_value,created_by) VALUES(partner_id,'NPWP',r.npwp,normalized_tax,r.created_by) ON CONFLICT DO NOTHING; END IF;
  END LOOP;
  FOR r IN SELECT s.*,u.branch_id creator_branch FROM suppliers s LEFT JOIN app_users u ON u.id=s.created_by ORDER BY s.created_at,s.id LOOP
    normalized_tax := NULLIF(regexp_replace(COALESCE(r.npwp,''),'[^0-9]','','g'),'');
    branch_id := COALESCE(r.creator_branch,(SELECT id FROM branches ORDER BY created_at,id LIMIT 1));
    partner_id := NULL;
    IF normalized_tax IS NOT NULL THEN SELECT business_partner_id INTO partner_id FROM business_partner_identifiers WHERE identifier_type='NPWP' AND normalized_value=normalized_tax AND active LIMIT 1; END IF;
    IF partner_id IS NULL THEN
      partner_id := gen_random_uuid();
      INSERT INTO business_partners(id,party_number,party_type,display_name,legal_name,normalized_name,tax_id,owner_branch_id,created_by,updated_by)
      VALUES(partner_id,'BP-'||upper(substr(replace(partner_id::text,'-',''),1,16)),CASE WHEN r.supplier_type='INDIVIDUAL' THEN 'PERSON' ELSE 'ORGANIZATION' END,r.name,COALESCE(r.legal_name,r.name),regexp_replace(upper(COALESCE(r.legal_name,r.name)),'[^A-Z0-9]','','g'),r.npwp,branch_id,r.created_by,r.updated_by);
    END IF;
    UPDATE suppliers SET business_partner_id=partner_id WHERE id=r.id;
    INSERT INTO business_partner_roles(business_partner_id,role_type,role_code,supplier_id,status,created_by) VALUES(partner_id,'SUPPLIER',r.code,r.id,CASE WHEN r.active THEN 'ACTIVE' ELSE 'INACTIVE' END,r.created_by);
    IF normalized_tax IS NOT NULL THEN INSERT INTO business_partner_identifiers(business_partner_id,identifier_type,identifier_value,normalized_value,created_by) VALUES(partner_id,'NPWP',r.npwp,normalized_tax,r.created_by) ON CONFLICT DO NOTHING; END IF;
  END LOOP;
END $$;

ALTER TABLE customers ALTER COLUMN business_partner_id SET NOT NULL;
ALTER TABLE suppliers ALTER COLUMN business_partner_id SET NOT NULL;

INSERT INTO business_partner_sites(business_partner_id,site_type,label,address,city,is_primary,source_type,source_id)
SELECT c.business_partner_id,'PRIMARY','Legacy primary',c.address,c.city,true,'CUSTOMER',c.id FROM customers c
WHERE NULLIF(trim(c.address),'') IS NOT NULL ON CONFLICT DO NOTHING;
INSERT INTO business_partner_sites(business_partner_id,site_type,label,address,city,province,is_primary,source_type,source_id)
SELECT c.business_partner_id,CASE a.address_type WHEN 'BILLING' THEN 'BILL_TO' WHEN 'DELIVERY' THEN 'SHIP_TO' ELSE 'PROJECT' END,a.label,a.address,a.city,a.province,false,'CUSTOMER_ADDRESS',a.id
FROM customer_addresses a JOIN customers c ON c.id=a.customer_id ON CONFLICT DO NOTHING;
INSERT INTO business_partner_sites(business_partner_id,site_type,address,city,province,is_primary,source_type,source_id)
SELECT s.business_partner_id,CASE a.address_type WHEN 'FACTORY' THEN 'FACTORY' WHEN 'WAREHOUSE' THEN 'WAREHOUSE' ELSE 'OFFICE' END,a.address,a.city,a.province,false,'SUPPLIER_ADDRESS',a.id
FROM supplier_addresses a JOIN suppliers s ON s.id=a.supplier_id ON CONFLICT DO NOTHING;
INSERT INTO business_partner_contacts(business_partner_id,contact_name,job_title,email,phone,whatsapp,is_primary,source_type,source_id,created_by)
SELECT c.business_partner_id,x.name,x.position_title,x.email,x.phone,x.whatsapp,x.is_primary,'CUSTOMER_CONTACT',x.id,x.created_by FROM customer_contacts x JOIN customers c ON c.id=x.customer_id ON CONFLICT DO NOTHING;
INSERT INTO business_partner_contacts(business_partner_id,contact_name,job_title,email,phone,whatsapp,is_primary,source_type,source_id)
SELECT s.business_partner_id,x.name,x.position_title,x.email,x.phone,x.whatsapp,x.is_primary,'SUPPLIER_CONTACT',x.id FROM supplier_contacts x JOIN suppliers s ON s.id=x.supplier_id ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION ensure_legacy_business_partner() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE partner_id uuid; normalized_tax text; existing_id uuid; branch_id uuid; kind text;
BEGIN
  normalized_tax := NULLIF(regexp_replace(COALESCE(NEW.npwp,''),'[^0-9]','','g'),'');
  partner_id := NEW.business_partner_id;
  IF normalized_tax IS NOT NULL THEN
    SELECT business_partner_id INTO existing_id FROM business_partner_identifiers WHERE identifier_type='NPWP' AND normalized_value=normalized_tax AND active LIMIT 1;
    IF partner_id IS NOT NULL AND existing_id IS NOT NULL AND existing_id <> partner_id THEN RAISE EXCEPTION 'NPWP belongs to another Business Partner; use duplicate resolution' USING ERRCODE='23505'; END IF;
    partner_id := COALESCE(partner_id,existing_id);
  END IF;
  branch_id := COALESCE((SELECT branch_id FROM app_users WHERE id=NEW.created_by),NULLIF(current_setting('app.branch_id',true),'')::uuid,(SELECT id FROM branches ORDER BY created_at,id LIMIT 1));
  IF partner_id IS NULL THEN
    partner_id := gen_random_uuid();
    IF TG_TABLE_NAME='customers' THEN kind := CASE WHEN NEW.customer_type='INDIVIDUAL' THEN 'PERSON' ELSE 'ORGANIZATION' END;
    ELSE kind := CASE WHEN NEW.supplier_type='INDIVIDUAL' THEN 'PERSON' ELSE 'ORGANIZATION' END; END IF;
    INSERT INTO business_partners(id,party_number,party_type,display_name,legal_name,normalized_name,tax_id,owner_branch_id,created_by,updated_by)
    VALUES(partner_id,'BP-'||upper(substr(replace(partner_id::text,'-',''),1,16)),kind,NEW.name,COALESCE(NEW.legal_name,NEW.name),regexp_replace(upper(COALESCE(NEW.legal_name,NEW.name)),'[^A-Z0-9]','','g'),NEW.npwp,branch_id,NEW.created_by,NEW.updated_by);
  ELSE
    UPDATE business_partners SET display_name=NEW.name,legal_name=COALESCE(NEW.legal_name,NEW.name),normalized_name=regexp_replace(upper(COALESCE(NEW.legal_name,NEW.name)),'[^A-Z0-9]','','g'),tax_id=NEW.npwp,mdm_version=mdm_version+1,updated_at=now(),updated_by=NEW.updated_by WHERE id=partner_id AND status<>'MERGED';
  END IF;
  IF normalized_tax IS NOT NULL THEN INSERT INTO business_partner_identifiers(business_partner_id,identifier_type,identifier_value,normalized_value,created_by) VALUES(partner_id,'NPWP',NEW.npwp,normalized_tax,NEW.updated_by) ON CONFLICT(identifier_type,issuing_country,normalized_value) WHERE active DO UPDATE SET identifier_value=excluded.identifier_value; END IF;
  NEW.business_partner_id := partner_id;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION sync_legacy_business_partner_role() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME='customers' THEN
    INSERT INTO business_partner_roles(business_partner_id,role_type,role_code,customer_id,status,created_by)
    VALUES(NEW.business_partner_id,'CUSTOMER',NEW.code,NEW.id,CASE WHEN NEW.active THEN 'ACTIVE' ELSE 'INACTIVE' END,NEW.created_by)
    ON CONFLICT(customer_id) WHERE customer_id IS NOT NULL DO UPDATE SET business_partner_id=excluded.business_partner_id,role_code=excluded.role_code,status=excluded.status;
  ELSE
    INSERT INTO business_partner_roles(business_partner_id,role_type,role_code,supplier_id,status,created_by)
    VALUES(NEW.business_partner_id,'SUPPLIER',NEW.code,NEW.id,CASE WHEN NEW.active THEN 'ACTIVE' ELSE 'INACTIVE' END,NEW.created_by)
    ON CONFLICT(supplier_id) WHERE supplier_id IS NOT NULL DO UPDATE SET business_partner_id=excluded.business_partner_id,role_code=excluded.role_code,status=excluded.status;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER customers_business_partner_ensure BEFORE INSERT OR UPDATE OF code,name,legal_name,npwp,active ON customers FOR EACH ROW EXECUTE FUNCTION ensure_legacy_business_partner();
CREATE TRIGGER suppliers_business_partner_ensure BEFORE INSERT OR UPDATE OF code,name,legal_name,npwp,active ON suppliers FOR EACH ROW EXECUTE FUNCTION ensure_legacy_business_partner();
CREATE TRIGGER customers_business_partner_role AFTER INSERT OR UPDATE OF code,active,business_partner_id ON customers FOR EACH ROW EXECUTE FUNCTION sync_legacy_business_partner_role();
CREATE TRIGGER suppliers_business_partner_role AFTER INSERT OR UPDATE OF code,active,business_partner_id ON suppliers FOR EACH ROW EXECUTE FUNCTION sync_legacy_business_partner_role();

-- RLS for stewardship queues and canonical party records.
ALTER TABLE business_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY branch_scope ON business_partners USING (app_branch_visible(owner_branch_id)) WITH CHECK (app_branch_visible(owner_branch_id));
ALTER TABLE business_partner_duplicate_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY branch_scope ON business_partner_duplicate_candidates USING (app_branch_visible(owner_branch_id)) WITH CHECK (app_branch_visible(owner_branch_id));
ALTER TABLE master_import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY branch_scope ON master_import_batches USING (app_branch_visible(owner_branch_id)) WITH CHECK (app_branch_visible(owner_branch_id));
ALTER TABLE master_import_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY branch_scope ON master_import_rows USING (app_branch_visible(owner_branch_id)) WITH CHECK (app_branch_visible(owner_branch_id));
ALTER TABLE master_data_quality_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY branch_scope ON master_data_quality_rules USING (app_branch_visible(owner_branch_id)) WITH CHECK (app_branch_visible(owner_branch_id));

-- Configurable safe rules: configuration only, never arbitrary SQL.
INSERT INTO master_data_quality_rules(code,target_type,field_name,rule_type,severity,description,owner_branch_id)
SELECT x.code,x.target_type,x.field_name,x.rule_type,x.severity,x.description,b.id FROM branches b CROSS JOIN (VALUES
  ('BP_LEGAL_NAME_REQUIRED','BUSINESS_PARTNER','legal_name','REQUIRED','CRITICAL','Nama legal Business Partner wajib diisi'),
  ('BP_TAX_ID_REQUIRED','BUSINESS_PARTNER','tax_id','REQUIRED','WARNING','NPWP/NIK Business Partner belum tersedia'),
  ('CUSTOMER_NAME_REQUIRED','CUSTOMER','name','REQUIRED','CRITICAL','Nama pelanggan wajib diisi'),
  ('SUPPLIER_CATEGORY_REQUIRED','SUPPLIER','category','REQUIRED','WARNING','Kategori supplier wajib diisi')
) AS x(code,target_type,field_name,rule_type,severity,description);

COMMIT;
