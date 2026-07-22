BEGIN;

DROP POLICY IF EXISTS branch_scope ON change_requests;
ALTER TABLE change_requests DISABLE ROW LEVEL SECURITY;

DROP INDEX IF EXISTS ux_change_requests_open_entity;
CREATE INDEX ix_change_requests_pending
  ON change_requests(entity_type, entity_id)
  WHERE status = 'PENDING';

ALTER TABLE change_requests
  DROP CONSTRAINT IF EXISTS change_requests_entity_type_allowed;

COMMIT;
