BEGIN;
-- 058 — Eksekusi bin: menghidupkan skema yang selama ini mati.
--
-- storage_locations dan warehouse_bins ada sejak migrasi 012 tetapi TIDAK
-- PERNAH dirujuk satu baris kode pun. Tabelnya ada, terlihat seperti fitur,
-- tetapi tidak ada transaksi yang menyentuhnya — skema mati lebih menyesatkan
-- daripada fitur yang jelas belum ada, karena orang mengira barangnya sudah
-- dapat dilacak sampai rak.
--
-- Penyebabnya struktural: bin menggantung pada org_warehouses, sedangkan stok
-- (stock_lots.warehouse_id) menggantung pada branches. Dua hierarki terpisah,
-- sehingga lot memang TIDAK MUNGKIN di-join ke bin. Migrasi ini menjembatani
-- keduanya lewat org_warehouses.branch_id, bukan dengan mengubah ledger stok —
-- perubahan ledger adalah pekerjaan Branch-as-Warehouse yang berdiri sendiri.

ALTER TABLE stock_lots ADD COLUMN bin_id uuid REFERENCES warehouse_bins(id);
CREATE INDEX ix_stock_lots_bin ON stock_lots(bin_id) WHERE bin_id IS NOT NULL AND qty_on_hand > 0;

-- Perpindahan antar bin dicatat pada ledger lot yang sudah ada, bukan tabel
-- gerakan kedua.
ALTER TABLE stock_lot_movements
  ADD COLUMN from_bin_id uuid REFERENCES warehouse_bins(id),
  ADD COLUMN to_bin_id uuid REFERENCES warehouse_bins(id);

-- Jenis gerakan baru didaftarkan di constraint, bukan dipaksakan lewat kode.
ALTER TABLE stock_lot_movements DROP CONSTRAINT IF EXISTS stock_lot_movements_movement_type_check;
ALTER TABLE stock_lot_movements ADD CONSTRAINT stock_lot_movements_movement_type_check
  CHECK (movement_type IN ('RECEIPT','ISSUE','TRANSFER_IN','TRANSFER_OUT','ADJUST_IN','ADJUST_OUT',
                           'BLOCK','RELEASE','PUTAWAY','BIN_MOVE'));

-- Jembatan bin → cabang. Dipakai validasi penempatan supaya lot tidak pernah
-- diletakkan di bin milik cabang lain.
CREATE VIEW warehouse_bin_scope AS
SELECT b.id            AS bin_id,
       b.code          AS bin_code,
       b.bin_type,
       b.active        AS bin_active,
       s.id            AS storage_location_id,
       s.code          AS storage_location_code,
       s.name          AS storage_location_name,
       w.id            AS org_warehouse_id,
       w.code          AS org_warehouse_code,
       w.name          AS org_warehouse_name,
       w.branch_id     AS branch_id
FROM warehouse_bins b
JOIN storage_locations s ON s.id = b.storage_location_id
JOIN org_warehouses w   ON w.id = s.warehouse_id;

-- Saldo per bin diturunkan dari lot; tidak ada tabel saldo kedua yang bisa
-- menyimpang dari kenyataan.
CREATE VIEW stock_bin_balance AS
SELECT l.bin_id,
       sc.branch_id,
       sc.bin_code,
       sc.storage_location_code,
       sc.org_warehouse_code,
       l.product_id,
       SUM(l.qty_on_hand)::float AS qty_on_hand,
       COUNT(*)::int             AS lot_count
FROM stock_lots l
JOIN warehouse_bin_scope sc ON sc.bin_id = l.bin_id
WHERE l.qty_on_hand > 0 AND l.status <> 'CONSUMED'
GROUP BY l.bin_id, sc.branch_id, sc.bin_code, sc.storage_location_code, sc.org_warehouse_code, l.product_id;

COMMIT;
