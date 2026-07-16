BEGIN;
-- Mengembalikan privilege sebelum migration 022; dipakai hanya oleh prosedur
-- rollback terotorisasi, bukan runtime aplikasi harian.
GRANT DELETE ON work_order_operations TO mat_erp_app;
GRANT DELETE ON work_order_materials TO mat_erp_app;
GRANT DELETE ON mrp_suggestions TO mat_erp_app;
GRANT UPDATE, DELETE ON qc_inspections TO mat_erp_app;
COMMIT;
