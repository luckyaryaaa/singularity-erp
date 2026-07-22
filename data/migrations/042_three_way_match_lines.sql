BEGIN;
-- 042 — P0-O: three-way match tingkat baris.
-- Sebelum ini hanya nilai header yang dibandingkan: qty_tolerance_pct pada
-- match_tolerance_config tidak pernah dipakai dan kolom qty_variance_pct tidak
-- pernah diisi. Akibatnya tagihan dengan kuantitas melebihi penerimaan bisa
-- lolos selama total nilainya kebetulan masih dalam toleransi.

-- Rincian per baris (produk, dipesan, diterima, ditagih, sudah ditagih
-- sebelumnya, harga PO vs harga tagihan) disimpan sebagai bukti audit.
ALTER TABLE three_way_matches ADD COLUMN line_variances jsonb NOT NULL DEFAULT '[]';

-- Satu tagihan bisa merujuk beberapa penerimaan (pengiriman parsial); kolom
-- goods_receipt_id lama menyimpan salah satu saja. Daftar lengkap disimpan
-- terpisah agar kolom lama tetap kompatibel dengan pembaca yang ada.
ALTER TABLE three_way_matches ADD COLUMN goods_receipt_ids uuid[] NOT NULL DEFAULT '{}';

-- Toleransi kuantitas boleh berbeda dari toleransi harga per entitas; nilai
-- absolut menghindari pemblokiran karena pembulatan pada baris kecil.
ALTER TABLE match_tolerance_config ADD COLUMN qty_tolerance_abs numeric(16,4) NOT NULL DEFAULT 0;

COMMIT;
