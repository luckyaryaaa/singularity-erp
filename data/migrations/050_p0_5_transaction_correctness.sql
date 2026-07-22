BEGIN;
-- 050 — P0.5: defense-in-depth untuk Change Request.
-- Repository sudah memakai allowlist, row lock, baseline check, dan advisory
-- lock. Constraint/index/RLS ini menjaga invariant yang sama di lapisan DB.

ALTER TABLE change_requests
  ADD CONSTRAINT change_requests_entity_type_allowed
  CHECK (entity_type IN ('customers','suppliers','products','employees'));

DROP INDEX IF EXISTS ix_change_requests_pending;
CREATE UNIQUE INDEX ux_change_requests_open_entity
  ON change_requests(entity_type, entity_id)
  WHERE status = 'PENDING';

ALTER TABLE change_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY branch_scope ON change_requests
  USING (app_branch_visible(branch_id))
  WITH CHECK (app_branch_visible(branch_id));

COMMIT;
