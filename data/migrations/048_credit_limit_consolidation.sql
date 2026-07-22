BEGIN;
-- 048 — satukan dua kolom batas kredit yang saling bertentangan.
--
-- customers punya DUA kolom batas kredit:
--   credit_limit        — yang diisi seed dan diedit lewat API master
--   credit_limit_amount — yang DIBACA mesin kontrol kredit (migrasi 018)
--
-- Tidak ada satu pun kode backend yang membaca credit_limit. Sementara itu
-- assertCreditOk memperlakukan credit_limit_amount = 0 sebagai "tanpa batas".
-- Akibatnya setiap pelanggan nyata (credit_limit 1 miliar, credit_limit_amount
-- 0) berjalan TANPA kontrol kredit sama sekali, sedangkan layar menampilkan
-- batas satu miliar yang tidak pernah ditegakkan. Seluruh penegakan eksposur
-- kredit P0-K hanya berfungsi pada pelanggan yang kolom _amount-nya kebetulan
-- terisi — dan tidak ada.
--
-- Ditemukan saat menulis uji Change Request engine, bukan dari dokumentasi.

-- Pindahkan nilai yang selama ini ditampilkan menjadi nilai yang ditegakkan.
-- Hanya mengisi yang masih nol supaya batas yang sudah sengaja disetel lewat
-- kolom _amount tidak tertimpa.
UPDATE customers
   SET credit_limit_amount = credit_limit
 WHERE COALESCE(credit_limit_amount, 0) = 0
   AND COALESCE(credit_limit, 0) > 0;

-- Kolom lama dihapus supaya tidak ada lagi dua sumber kebenaran. Aman: tidak
-- ada pembaca di backend, dan API master dialihkan ke credit_limit_amount pada
-- perubahan kode yang menyertai migrasi ini.
ALTER TABLE customers DROP COLUMN credit_limit;

COMMENT ON COLUMN customers.credit_limit_amount IS
  'Batas kredit yang DITEGAKKAN mesin kontrol kredit. 0 berarti tanpa batas.';

COMMIT;
