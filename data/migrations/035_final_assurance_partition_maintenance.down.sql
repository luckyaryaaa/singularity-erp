BEGIN;
-- Partisi yang sudah menampung transaksi sengaja dipertahankan saat code
-- rollback; menghapus child partition otomatis akan menjadi destructive data
-- operation. Hanya entry point maintenance yang dicabut.
REVOKE ALL ON FUNCTION inventory_partition_maintenance(integer) FROM mat_erp_app;
DROP FUNCTION IF EXISTS inventory_partition_maintenance(integer);
COMMIT;
