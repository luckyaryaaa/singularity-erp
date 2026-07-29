BEGIN;
-- Rollback 077 — policy dan index ikut terhapus bersama tabel.
DROP TABLE IF EXISTS work_items CASCADE;
COMMIT;
