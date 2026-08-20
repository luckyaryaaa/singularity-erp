BEGIN;

-- Rollback 111. Catatan: baris payroll_components (code LOAN-*) yang dibuat saat
-- persetujuan tidak ikut terhapus otomatis; bersihkan manual bila perlu.
DROP TABLE IF EXISTS employee_loans;

COMMIT;
