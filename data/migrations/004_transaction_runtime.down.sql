BEGIN;
DROP INDEX IF EXISTS ix_documents_party_id;
DROP INDEX IF EXISTS ix_documents_due_status;
ALTER TABLE business_documents
  DROP COLUMN IF EXISTS approvals,
  DROP COLUMN IF EXISTS required_approval_levels,
  DROP COLUMN IF EXISTS submitted_at,
  DROP COLUMN IF EXISTS due_date,
  DROP COLUMN IF EXISTS title,
  DROP COLUMN IF EXISTS party_name,
  DROP COLUMN IF EXISTS party_id;
DROP TABLE IF EXISTS domain_event_outbox;
DROP TABLE IF EXISTS auth_pending;
DROP TABLE IF EXISTS document_sequences;
COMMIT;
