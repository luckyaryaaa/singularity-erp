BEGIN;
ALTER TABLE business_documents DROP COLUMN IF EXISTS document_template_snapshot;
DROP TABLE IF EXISTS document_templates;
COMMIT;
