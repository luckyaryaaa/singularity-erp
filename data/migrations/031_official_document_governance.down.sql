BEGIN;
DROP INDEX IF EXISTS ix_documents_official_signature;
ALTER TABLE business_documents DROP CONSTRAINT IF EXISTS ck_documents_official_complete;
ALTER TABLE business_documents
  DROP COLUMN IF EXISTS official_payload,
  DROP COLUMN IF EXISTS official_template_version,
  DROP COLUMN IF EXISTS official_key_id,
  DROP COLUMN IF EXISTS official_signature,
  DROP COLUMN IF EXISTS official_issued_by,
  DROP COLUMN IF EXISTS official_issued_at;
COMMIT;
