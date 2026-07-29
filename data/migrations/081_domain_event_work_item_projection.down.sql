BEGIN;

DROP INDEX IF EXISTS ux_work_items_automation_key;
DROP INDEX IF EXISTS ux_work_items_source_event;
ALTER TABLE work_items
  DROP COLUMN IF EXISTS auto_managed,
  DROP COLUMN IF EXISTS source_event_type,
  DROP COLUMN IF EXISTS source_event_id,
  DROP COLUMN IF EXISTS automation_key;

DROP INDEX IF EXISTS ix_outbox_dead_letter;
DROP INDEX IF EXISTS ix_outbox_dispatch;
ALTER TABLE domain_event_outbox
  DROP COLUMN IF EXISTS dead_lettered_at,
  DROP COLUMN IF EXISTS next_attempt_at,
  DROP COLUMN IF EXISTS delivery_status,
  DROP COLUMN IF EXISTS event_version;
CREATE INDEX ix_outbox_unpublished
  ON domain_event_outbox(created_at)
  WHERE published_at IS NULL;

COMMIT;
