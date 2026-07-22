BEGIN;
-- Rollback 046 — hapus indeks pendukung dashboard.
DROP INDEX IF EXISTS ix_documents_dashboard_payable;
DROP INDEX IF EXISTS ix_documents_dashboard_invoice;
DROP INDEX IF EXISTS ix_documents_dashboard_active;
COMMIT;
