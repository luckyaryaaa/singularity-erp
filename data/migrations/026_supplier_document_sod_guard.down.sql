BEGIN;
ALTER TABLE supplier_documents DROP CONSTRAINT IF EXISTS ck_supplier_document_checker;
COMMIT;
