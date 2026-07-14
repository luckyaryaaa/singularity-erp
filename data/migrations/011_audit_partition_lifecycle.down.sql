-- Rollback 011 — hanya untuk staging; partisi berisi data akan menolak DROP
-- tanpa data loss eksplisit. Jalankan setelah backup terverifikasi.
BEGIN;
DROP FUNCTION IF EXISTS audit_partition_maintenance();
DROP TABLE IF EXISTS audit_logs_default;
DROP TABLE IF EXISTS audit_logs_2031;
DROP TABLE IF EXISTS audit_logs_2030;
DROP TABLE IF EXISTS audit_logs_2029;
DROP TABLE IF EXISTS audit_logs_2028;
DROP TABLE IF EXISTS audit_logs_2027;
COMMIT;
