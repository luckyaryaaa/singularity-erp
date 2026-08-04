BEGIN;

-- 086 · Product 360 profile/catalog photo.
-- Sama seperti 085 (party photo): biner tetap di private file storage; master
-- produk hanya menyimpan referensi file opaque. Tampil hanya bila hasil
-- malware-scan CLEAN dan pemohon punya izin product.view.
ALTER TABLE products
  ADD COLUMN profile_file_id uuid REFERENCES file_metadata(id) ON DELETE SET NULL;

COMMENT ON COLUMN products.profile_file_id IS
  'Private scanned product/service photo used by Product 360; fallback is deterministic initials.';

COMMIT;
