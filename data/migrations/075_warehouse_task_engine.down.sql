BEGIN;
-- Rollback 075 — policy dan index ikut terhapus bersama tabel.
DROP TABLE IF EXISTS warehouse_tasks CASCADE;
COMMIT;
