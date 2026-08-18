BEGIN;

ALTER TABLE employees DROP COLUMN IF EXISTS profile_file_id;

COMMIT;
