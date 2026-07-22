BEGIN;
-- Rollback 057 — reservasi kembali menjadi angka tanpa asal-usul.
-- qty_reserved pada inventory_balances tidak disentuh: nilainya sudah
-- direkonsiliasi dan tetap benar tanpa tabel catatan.
DROP VIEW IF EXISTS stock_reservation_balance;
DROP TABLE IF EXISTS stock_reservations;
COMMIT;
