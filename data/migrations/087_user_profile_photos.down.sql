BEGIN;

ALTER TABLE app_users DROP COLUMN IF EXISTS profile_file_id;

COMMIT;
