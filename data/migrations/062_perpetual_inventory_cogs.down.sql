BEGIN;
-- Rollback 062 — kembali ke model lama: pembelian langsung menjadi beban dan
-- pergerakan persediaan tidak menyentuh buku besar.
-- Jurnal yang terlanjur terbentuk TIDAK dihapus: menghapus jurnal yang sudah
-- diposting melanggar aturan permanen sistem. Yang dicabut hanya aturannya.
DELETE FROM posting_profile_legs WHERE profile_id IN (
  SELECT id FROM posting_profiles WHERE code IN
    ('GR-PERPETUAL','ISSUE-PERPETUAL','WOFINISH-PERPETUAL','DELIVERY-COGS','SUPPINV-PERPETUAL'));
DELETE FROM posting_profiles WHERE code IN
  ('GR-PERPETUAL','ISSUE-PERPETUAL','WOFINISH-PERPETUAL','DELIVERY-COGS','SUPPINV-PERPETUAL');
UPDATE posting_profiles SET active=true, effective_until=NULL
WHERE code='SUPPINV-DEFAULT';
DELETE FROM account_roles WHERE role_key IN ('WIP','FINISHED_GOODS','GRIR_CLEARING','COGS');
-- Akun bagan dibiarkan: menghapus akun yang mungkin sudah memuat jurnal akan
-- memutus laporan historis.
COMMIT;
