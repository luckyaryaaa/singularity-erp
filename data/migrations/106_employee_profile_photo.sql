BEGIN;

-- 106 · Employee 360 profile portrait.
-- Mirrors the Party/Product profile-photo pattern (085/086): the binary stays in
-- private, malware-scanned file storage; the master only keeps the opaque file
-- reference. Fallback remains deterministic initials.
ALTER TABLE employees
  ADD COLUMN profile_file_id uuid REFERENCES file_metadata(id) ON DELETE SET NULL;

COMMENT ON COLUMN employees.profile_file_id IS
  'Private scanned profile portrait used by Employee 360; fallback is deterministic initials.';

COMMIT;
