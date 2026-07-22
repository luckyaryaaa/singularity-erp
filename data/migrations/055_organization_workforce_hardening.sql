BEGIN;

CREATE OR REPLACE FUNCTION protect_hierarchy_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.snapshot IS DISTINCT FROM OLD.snapshot OR NEW.snapshot_sha256 IS DISTINCT FROM OLD.snapshot_sha256 OR NEW.version_no IS DISTINCT FROM OLD.version_no OR NEW.legal_entity_id IS DISTINCT FROM OLD.legal_entity_id THEN
    RAISE EXCEPTION 'Hierarchy snapshot identity is immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER hierarchy_snapshot_immutable BEFORE UPDATE ON organization_hierarchy_versions FOR EACH ROW EXECUTE FUNCTION protect_hierarchy_snapshot();

CREATE OR REPLACE FUNCTION enforce_position_hierarchy() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_entity uuid; cycle_found boolean;
BEGIN
  IF NEW.reports_to_position_id IS NULL THEN RETURN NEW; END IF;
  SELECT legal_entity_id INTO parent_entity FROM organization_positions WHERE id=NEW.reports_to_position_id;
  IF parent_entity IS DISTINCT FROM NEW.legal_entity_id THEN RAISE EXCEPTION 'Reporting position must be in the same legal entity' USING ERRCODE='23514'; END IF;
  WITH RECURSIVE chain AS(
    SELECT id,reports_to_position_id FROM organization_positions WHERE id=NEW.reports_to_position_id
    UNION ALL SELECT p.id,p.reports_to_position_id FROM organization_positions p JOIN chain c ON p.id=c.reports_to_position_id
  ) SELECT EXISTS(SELECT 1 FROM chain WHERE id=NEW.id) INTO cycle_found;
  IF cycle_found THEN RAISE EXCEPTION 'Position reporting hierarchy cycle' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER organization_position_hierarchy BEFORE INSERT OR UPDATE OF reports_to_position_id,legal_entity_id ON organization_positions FOR EACH ROW EXECUTE FUNCTION enforce_position_hierarchy();

ALTER TABLE position_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY legal_entity_scope ON position_assignments
  USING(EXISTS(SELECT 1 FROM organization_positions p WHERE p.id=position_id AND app_legal_entity_visible(p.legal_entity_id)))
  WITH CHECK(EXISTS(SELECT 1 FROM organization_positions p WHERE p.id=position_id AND app_legal_entity_visible(p.legal_entity_id)));

ALTER TABLE authority_delegations ENABLE ROW LEVEL SECURITY;
CREATE POLICY delegation_scope ON authority_delegations
  USING(current_setting('app.is_system',true)='on' OR current_setting('app.cross_branch',true)='on'
    OR NULLIF(current_setting('app.user_id',true),'')::uuid IN(delegator_user_id,delegate_user_id,created_by,approved_by))
  WITH CHECK(current_setting('app.is_system',true)='on' OR current_setting('app.cross_branch',true)='on'
    OR NULLIF(current_setting('app.user_id',true),'')::uuid IN(delegator_user_id,delegate_user_id,created_by,approved_by));

COMMIT;
