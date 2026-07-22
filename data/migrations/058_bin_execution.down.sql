BEGIN;
-- Rollback 058 — bin kembali menjadi skema mati tanpa kaitan ke stok.
DROP VIEW IF EXISTS stock_bin_balance;
DROP VIEW IF EXISTS warehouse_bin_scope;
-- stock_lot_movements bersifat append-only bagi role aplikasi, tetapi migrasi
-- berjalan sebagai pemilik objek sehingga pembersihan ini sah. Gerakan bin
-- dihapus lebih dulu karena jenisnya tidak lagi sah setelah rollback.
DELETE FROM stock_lot_movements WHERE movement_type IN ('PUTAWAY','BIN_MOVE');
ALTER TABLE stock_lot_movements DROP CONSTRAINT IF EXISTS stock_lot_movements_movement_type_check;
ALTER TABLE stock_lot_movements ADD CONSTRAINT stock_lot_movements_movement_type_check
  CHECK (movement_type IN ('RECEIPT','ISSUE','TRANSFER_IN','TRANSFER_OUT','ADJUST_IN','ADJUST_OUT','BLOCK','RELEASE'));
ALTER TABLE stock_lot_movements DROP COLUMN IF EXISTS to_bin_id;
ALTER TABLE stock_lot_movements DROP COLUMN IF EXISTS from_bin_id;
DROP INDEX IF EXISTS ix_stock_lots_bin;
ALTER TABLE stock_lots DROP COLUMN IF EXISTS bin_id;
COMMIT;
