BEGIN;
-- Rollback 079 — index ikut terhapus bersama tabel.
DROP TABLE IF EXISTS pricing_conditions CASCADE;
COMMIT;
