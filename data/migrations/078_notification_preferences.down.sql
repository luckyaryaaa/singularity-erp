BEGIN;
-- Rollback 078 — policy ikut terhapus bersama tabel.
DROP TABLE IF EXISTS notification_preferences CASCADE;
COMMIT;
