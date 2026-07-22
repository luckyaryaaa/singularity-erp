BEGIN;

-- Correct an ambiguity caught by the disposable integration gate. Migration
-- 051 remains immutable; this patch preserves a truthful migration ledger.
CREATE OR REPLACE FUNCTION ensure_legacy_business_partner() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE partner_id uuid; normalized_tax text; existing_id uuid; owner_branch uuid; kind text;
BEGIN
  normalized_tax := NULLIF(regexp_replace(COALESCE(NEW.npwp,''),'[^0-9]','','g'),'');
  partner_id := NEW.business_partner_id;
  IF normalized_tax IS NOT NULL THEN
    SELECT i.business_partner_id INTO existing_id FROM business_partner_identifiers i WHERE i.identifier_type='NPWP' AND i.normalized_value=normalized_tax AND i.active LIMIT 1;
    IF partner_id IS NOT NULL AND existing_id IS NOT NULL AND existing_id <> partner_id THEN RAISE EXCEPTION 'NPWP belongs to another Business Partner; use duplicate resolution' USING ERRCODE='23505'; END IF;
    partner_id := COALESCE(partner_id,existing_id);
  END IF;
  owner_branch := COALESCE((SELECT u.branch_id FROM app_users u WHERE u.id=NEW.created_by),NULLIF(current_setting('app.branch_id',true),'')::uuid,(SELECT b.id FROM branches b ORDER BY b.created_at,b.id LIMIT 1));
  IF partner_id IS NULL THEN
    partner_id := gen_random_uuid();
    IF TG_TABLE_NAME='customers' THEN kind := CASE WHEN NEW.customer_type='INDIVIDUAL' THEN 'PERSON' ELSE 'ORGANIZATION' END;
    ELSE kind := CASE WHEN NEW.supplier_type='INDIVIDUAL' THEN 'PERSON' ELSE 'ORGANIZATION' END; END IF;
    INSERT INTO business_partners(id,party_number,party_type,display_name,legal_name,normalized_name,tax_id,owner_branch_id,created_by,updated_by)
    VALUES(partner_id,'BP-'||upper(substr(replace(partner_id::text,'-',''),1,16)),kind,NEW.name,COALESCE(NEW.legal_name,NEW.name),regexp_replace(upper(COALESCE(NEW.legal_name,NEW.name)),'[^A-Z0-9]','','g'),NEW.npwp,owner_branch,NEW.created_by,NEW.updated_by);
  ELSE
    UPDATE business_partners SET display_name=NEW.name,legal_name=COALESCE(NEW.legal_name,NEW.name),normalized_name=regexp_replace(upper(COALESCE(NEW.legal_name,NEW.name)),'[^A-Z0-9]','','g'),tax_id=NEW.npwp,mdm_version=mdm_version+1,updated_at=now(),updated_by=NEW.updated_by WHERE id=partner_id AND status<>'MERGED';
  END IF;
  IF normalized_tax IS NOT NULL THEN INSERT INTO business_partner_identifiers(business_partner_id,identifier_type,identifier_value,normalized_value,created_by) VALUES(partner_id,'NPWP',NEW.npwp,normalized_tax,NEW.updated_by) ON CONFLICT(identifier_type,issuing_country,normalized_value) WHERE active DO UPDATE SET identifier_value=excluded.identifier_value; END IF;
  NEW.business_partner_id := partner_id;
  RETURN NEW;
END $$;

-- Runtime authorization is database-backed. Add only the new module grants;
-- existing administrator customizations remain untouched.
INSERT INTO role_permissions(role,permission_code,source)
SELECT r.role,'business_partner.'||a.action,'BASELINE'
FROM (VALUES ('system_admin'),('finance_manager'),('sales'),('procurement')) r(role)
CROSS JOIN (VALUES ('view'),('create'),('edit'),('submit'),('approve'),('reject'),('post'),('void'),('cancel'),('export'),('import')) a(action)
ON CONFLICT(role,permission_code) DO NOTHING;

INSERT INTO role_permissions(role,permission_code,source)
SELECT r.role,'business_partner.'||a.action,'BASELINE'
FROM (VALUES ('security_admin'),('accounting'),('tax'),('auditor')) r(role)
CROSS JOIN (VALUES ('view'),('export')) a(action)
ON CONFLICT(role,permission_code) DO NOTHING;

INSERT INTO role_permissions(role,permission_code,source)
SELECT r.role,'business_partner.view','BASELINE'
FROM (VALUES ('warehouse'),('production')) r(role)
ON CONFLICT(role,permission_code) DO NOTHING;

COMMIT;
