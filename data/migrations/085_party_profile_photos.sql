BEGIN;

-- 085 · Enterprise Party 360 profile portrait.
-- The binary remains in private file storage; masters only retain the opaque
-- file reference. Download still requires an authenticated module permission
-- and a CLEAN malware-scan result.
ALTER TABLE customers
  ADD COLUMN profile_file_id uuid REFERENCES file_metadata(id) ON DELETE SET NULL;

ALTER TABLE suppliers
  ADD COLUMN profile_file_id uuid REFERENCES file_metadata(id) ON DELETE SET NULL;

COMMENT ON COLUMN customers.profile_file_id IS
  'Private scanned profile portrait used by Customer 360; fallback is deterministic initials.';
COMMENT ON COLUMN suppliers.profile_file_id IS
  'Private scanned profile portrait used by Supplier 360; fallback is deterministic initials.';

COMMIT;
