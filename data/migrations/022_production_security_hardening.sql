BEGIN;
-- Sprint 12 hardening: tabel operasional hanya boleh berubah melalui service
-- yang terkontrol. Hak minimum mencegah penghapusan histori produksi/MRP dan
-- perubahan hasil QC setelah dicatat.
REVOKE DELETE ON work_order_operations FROM mat_erp_app;
REVOKE DELETE ON work_order_materials FROM mat_erp_app;
REVOKE DELETE ON mrp_suggestions FROM mat_erp_app;
REVOKE UPDATE, DELETE ON qc_inspections FROM mat_erp_app;
COMMIT;
