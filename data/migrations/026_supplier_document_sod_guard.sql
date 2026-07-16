-- 026_supplier_document_sod_guard.sql
-- Database-level maker/checker guarantee for supplier compliance documents.
BEGIN;
ALTER TABLE supplier_documents
  ADD CONSTRAINT ck_supplier_document_checker
  CHECK(verified_by IS NULL OR created_by IS NULL OR verified_by<>created_by);
COMMIT;
