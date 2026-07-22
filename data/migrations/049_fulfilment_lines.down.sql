BEGIN;
-- Rollback 049 — pemenuhan kembali tidak terlacak per baris.
DROP VIEW IF EXISTS sales_order_line_fulfilment;
ALTER TABLE document_lines DROP CONSTRAINT IF EXISTS document_lines_source_not_self;
DROP INDEX IF EXISTS ix_document_lines_source;
ALTER TABLE document_lines DROP COLUMN IF EXISTS source_line_id;
COMMIT;
