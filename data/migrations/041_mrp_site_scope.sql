BEGIN;
-- 041 — P0-N: MRP wajib sadar lokasi (site-aware).
-- Sebelum ini seluruh perhitungan MRP menjumlahkan on-hand lintas gudang,
-- sehingga kekurangan di satu cabang tertutup oleh stok cabang lain dan saran
-- pembelian tidak pernah terbit. Saran kini melekat pada gudang.

ALTER TABLE mrp_suggestions ADD COLUMN warehouse_id uuid REFERENCES branches(id);

-- Saran lama tidak punya lokasi; tutup sebagai superseded daripada menebak
-- gudangnya — menebak akan mencemari histori perencanaan.
UPDATE mrp_suggestions SET status = 'DISMISSED' WHERE warehouse_id IS NULL AND status = 'OPEN';

-- Baris historis boleh tetap NULL; baris baru wajib bergudang. Constraint
-- NOT VALID agar migrasi tidak memindai ulang data lama.
ALTER TABLE mrp_suggestions
  ADD CONSTRAINT mrp_suggestions_warehouse_required
  CHECK (warehouse_id IS NOT NULL OR status = 'DISMISSED') NOT VALID;

CREATE INDEX ix_mrp_suggestions_warehouse ON mrp_suggestions(warehouse_id) WHERE status = 'OPEN';

-- Satu saran terbuka per produk per gudang per run.
CREATE UNIQUE INDEX ux_mrp_suggestions_run_site_product
  ON mrp_suggestions(run_id, warehouse_id, product_id)
  WHERE warehouse_id IS NOT NULL;

COMMIT;
