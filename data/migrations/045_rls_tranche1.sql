BEGIN;
-- 045 — B5: Row Level Security tranche 1.
--
-- Sebelum ini TIDAK ADA satu pun policy RLS di seluruh migrasi: pemisahan data
-- antarcabang sepenuhnya bergantung pada klausa WHERE di aplikasi. Satu query
-- yang lupa membawa filter cabang langsung membocorkan data cabang lain, dan
-- tidak ada jaring pengaman di bawahnya.
--
-- Tranche 1 sengaja dibatasi pada tabel yang cakupan cabangnya tidak ambigu
-- (kolom branch_id/warehouse_id langsung). Tabel turunan yang cakupannya
-- diwarisi lewat join menyusul pada tranche berikutnya, setelah tranche ini
-- terbukti tidak mengganggu operasi.
--
-- Konteks berasal dari SET LOCAL pada setiap transaksi (transaction.js):
--   app.cross_branch = 'on'  → peran lintas cabang (owner/admin/auditor/...)
--   app.is_system    = 'on'  → job internal, migrasi, boot (tanpa pengguna)
--   app.branch_id            → cabang pengguna
-- Bila konteks TIDAK disetel sama sekali, policy menutup akses: gagal tertutup,
-- bukan gagal terbuka.

CREATE OR REPLACE FUNCTION app_branch_visible(target uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT current_setting('app.is_system', true) = 'on'
      OR current_setting('app.cross_branch', true) = 'on'
      OR (target IS NULL)
      OR (NULLIF(current_setting('app.branch_id', true), '') IS NOT NULL
          AND target = NULLIF(current_setting('app.branch_id', true), '')::uuid);
$$;

-- business_documents adalah pusat seluruh transaksi; kebocoran di sini
-- membocorkan hampir semua modul sekaligus.
ALTER TABLE business_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY branch_scope ON business_documents
  USING (app_branch_visible(branch_id))
  WITH CHECK (app_branch_visible(branch_id));

ALTER TABLE inventory_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY branch_scope ON inventory_balances
  USING (app_branch_visible(warehouse_id))
  WITH CHECK (app_branch_visible(warehouse_id));

ALTER TABLE stock_lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY branch_scope ON stock_lots
  USING (app_branch_visible(warehouse_id))
  WITH CHECK (app_branch_visible(warehouse_id));

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY branch_scope ON notifications
  USING (app_branch_visible(branch_id))
  WITH CHECK (app_branch_visible(branch_id));

COMMIT;
