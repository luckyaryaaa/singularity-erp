BEGIN;

-- 087 · Akun pengguna: foto profil self-service.
-- Sama seperti 085/086 (party & product photo): biner tetap di private file
-- storage dengan malware-scan; app_users hanya menyimpan referensi file opaque.
-- Ditautkan dan dilihat hanya oleh pemiliknya sendiri (session-scoped), dan
-- hanya disajikan setelah scan_status CLEAN. Fallback adalah inisial deterministik.
ALTER TABLE app_users
  ADD COLUMN profile_file_id uuid REFERENCES file_metadata(id) ON DELETE SET NULL;

COMMENT ON COLUMN app_users.profile_file_id IS
  'Private scanned self-service avatar shown in the topbar account card; fallback is deterministic initials.';

COMMIT;
