BEGIN;
-- 062 — Persediaan perpetual dan pengakuan Harga Pokok Penjualan.
--
-- Buku besar TIDAK mencatat pergerakan persediaan sama sekali:
--   * Pembelian langsung menjadi beban (SUPPLIER_INVOICE: D 6100 / K 2100),
--     bukan dikapitalisasi sebagai aset persediaan.
--   * Penerimaan barang dan pengeluaran material tidak menyentuh GL — tidak ada
--     POSTING_TRIGGER maupun posting profile untuk keduanya.
--   * HPP tidak pernah diakui: nol baris jurnal harga pokok di seluruh basis
--     data, sehingga setiap invoice mengakui pendapatan tanpa biaya lawan.
--
-- Terbukti terukur: satu penerimaan barang menaikkan persediaan operasional
-- Rp65 juta sementara GL akun 1300 bergerak NOL. Neraca menyembunyikan nilai
-- persediaan dan laba kotor tampak 100%.
--
-- Migrasi ini menerapkan model perpetual, BERLAKU MAJU sejak diterapkan.
-- Dokumen yang sudah diposting menyimpan posting_profile_snapshot masing-masing
-- sehingga tidak berubah surut, dan claimPosting mencegah posting ulang.

-- ── Bagan akun yang dibutuhkan ──────────────────────────────────────────────
-- Kategori COGS sudah dikenal bagan akun; HPP memakai kategorinya sendiri agar
-- laporan laba rugi memisahkannya dari beban operasional.
INSERT INTO chart_of_accounts(code,name,normal_side,category,active)
VALUES
  ('1310','Persediaan Barang Dalam Proses','D','ASSET',true),
  ('1320','Persediaan Barang Jadi','D','ASSET',true),
  ('2150','Penerimaan Barang Belum Ditagih (GR/IR)','C','LIABILITY',true),
  ('5100','Harga Pokok Penjualan','D','COGS',true)
ON CONFLICT (code) DO NOTHING;

-- Peran semantik: kode akun TIDAK di-hardcode di kode program.
INSERT INTO account_roles(role_key,account_code,description,effective_from) VALUES
  ('WIP','1310','Barang dalam proses produksi',current_date),
  ('FINISHED_GOODS','1320','Persediaan barang jadi',current_date),
  ('GRIR_CLEARING','2150','Kliring penerimaan barang belum ditagih',current_date),
  ('COGS','5100','Harga pokok penjualan',current_date)
ON CONFLICT DO NOTHING;

-- Sumber nilai baru didaftarkan di constraint, bukan dipaksakan lewat kode.
-- VALUE = nilai persediaan dari inventory_movements (qty × unit_cost).
ALTER TABLE posting_profile_legs DROP CONSTRAINT IF EXISTS posting_profile_legs_amount_source_check;
ALTER TABLE posting_profile_legs ADD CONSTRAINT posting_profile_legs_amount_source_check
  CHECK (amount_source IN ('AMOUNT','NET','TAX','BPJS_COMPANY','BPJS_EMPLOYEE','GROSS','DEDUCTION','VALUE','GAIN','LOSS'));

-- ── Posting profile baru ────────────────────────────────────────────────────
-- Nilai yang diposting adalah NILAI PERSEDIAAN dari inventory_movements
-- (qty × unit_cost), bukan nilai header dokumen yang memuat pajak dan ongkos.
INSERT INTO posting_profiles(id,code,transaction_type,item_category,priority,version,effective_from,active,description)
VALUES
  (gen_random_uuid(),'GR-PERPETUAL','GOODS_RECEIPT','*',100,1,current_date,true,'Kapitalisasi penerimaan barang ke persediaan'),
  (gen_random_uuid(),'ISSUE-PERPETUAL','MATERIAL_ISSUE','*',100,1,current_date,true,'Pemindahan persediaan ke barang dalam proses'),
  (gen_random_uuid(),'WOFINISH-PERPETUAL','WORK_ORDER','*',100,1,current_date,true,'Penyerapan WIP menjadi barang jadi'),
  (gen_random_uuid(),'DELIVERY-COGS','DELIVERY','*',100,1,current_date,true,'Pengakuan harga pokok penjualan saat barang dikirim');

INSERT INTO posting_profile_legs(profile_id,leg_no,side,account_code,amount_source)
SELECT p.id,v.leg_no,v.side,v.account_code,v.amount_source
FROM posting_profiles p
JOIN (VALUES
  -- Terima barang: persediaan bertambah, kewajiban kliring diakui.
  ('GR-PERPETUAL',       1,'D','1300','VALUE'),
  ('GR-PERPETUAL',       2,'C','2150','VALUE'),
  -- Material masuk produksi: persediaan menjadi barang dalam proses.
  ('ISSUE-PERPETUAL',    1,'D','1310','VALUE'),
  ('ISSUE-PERPETUAL',    2,'C','1300','VALUE'),
  -- Barang jadi selesai: WIP terserap menjadi persediaan barang jadi.
  ('WOFINISH-PERPETUAL', 1,'D','1320','VALUE'),
  ('WOFINISH-PERPETUAL', 2,'C','1310','VALUE'),
  -- Barang dikirim: HPP diakui pada periode yang sama dengan pendapatannya.
  ('DELIVERY-COGS',      1,'D','5100','VALUE'),
  ('DELIVERY-COGS',      2,'C','1300','VALUE')
) AS v(code,leg_no,side,account_code,amount_source) ON v.code=p.code
WHERE p.version=1;

-- ── Pembelian tidak lagi langsung menjadi beban ─────────────────────────────
-- Tagihan supplier kini melunasi kliring GR/IR, bukan membebankan pembelian.
-- Profil lama dinonaktifkan (bukan dihapus) supaya dokumen yang sudah diposting
-- tetap dapat ditelusuri ke aturan yang berlaku saat itu.
UPDATE posting_profiles SET active=false, effective_until=current_date
WHERE transaction_type='SUPPLIER_INVOICE' AND active AND code='SUPPINV-DEFAULT';

INSERT INTO posting_profiles(id,code,transaction_type,item_category,priority,version,effective_from,active,description)
VALUES (gen_random_uuid(),'SUPPINV-PERPETUAL','SUPPLIER_INVOICE','*',100,2,current_date,true,
        'Pelunasan kliring penerimaan barang menjadi utang usaha');
INSERT INTO posting_profile_legs(profile_id,leg_no,side,account_code,amount_source)
SELECT p.id,v.leg_no,v.side,v.account_code,v.amount_source
FROM posting_profiles p
JOIN (VALUES
  ('SUPPINV-PERPETUAL',1,'D','2150','AMOUNT'),
  ('SUPPINV-PERPETUAL',2,'C','2100','AMOUNT')
) AS v(code,leg_no,side,account_code,amount_source) ON v.code=p.code;

COMMIT;
