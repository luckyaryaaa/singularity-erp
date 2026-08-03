BEGIN;

ALTER TABLE suppliers DROP COLUMN IF EXISTS profile_file_id;
ALTER TABLE customers DROP COLUMN IF EXISTS profile_file_id;

COMMIT;
