BEGIN;
-- Workflow/history tidak pernah dihapus oleh runtime. Koreksi dilakukan
-- melalui status, reversal, atau audit event agar evidence tetap utuh.
REVOKE DELETE ON attendance_corrections FROM mat_erp_app;
REVOKE DELETE ON dunning_notices FROM mat_erp_app;
REVOKE DELETE ON fixed_assets FROM mat_erp_app;
REVOKE DELETE ON po_change_orders FROM mat_erp_app;
COMMIT;
