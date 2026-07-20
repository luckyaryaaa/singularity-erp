BEGIN;
-- ═══════════════════════════════════════════════════════════════════════════
-- Template dokumen resmi CONFIGURATION-DRIVEN (§35 / R022 lanjutan).
-- Judul, syarat & ketentuan, catatan kaki, blok tanda tangan, QR, warna
-- aksen, dan label kolom TIDAK lagi hardcode di document-render.js —
-- seluruhnya dari tabel ini, ber-versi dan effective-dated. Dokumen yang
-- sudah terbit tetap memakai snapshot template saat penerbitan.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type varchar(40) NOT NULL,
  name varchar(160) NOT NULL,
  version integer NOT NULL DEFAULT 1,
  -- config: seluruh elemen yang dapat didesain pengguna
  --   { title, subtitle, accentColor, showQr, showSignature, showTerbilang,
  --     signatureLabel, termsTitle, terms[], footerNote, columns{...},
  --     partyLabel, notesLabel }
  config jsonb NOT NULL DEFAULT '{}',
  effective_from date NOT NULL DEFAULT make_date(EXTRACT(YEAR FROM current_date)::int,1,1),
  effective_until date,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(document_type, version)
);
CREATE INDEX ix_document_templates_active ON document_templates(document_type) WHERE active;

-- Snapshot template pada dokumen: cetak ulang dokumen lama tetap identik
-- walau template diubah kemudian.
ALTER TABLE business_documents ADD COLUMN document_template_snapshot jsonb;

-- Seed template awal untuk tipe dokumen yang dicetak resmi. Isi terms
-- sengaja ringkas — pengguna mendesain lanjut lewat UI.
INSERT INTO document_templates(document_type,name,config) VALUES
 ('INVOICE','Faktur / Invoice', jsonb_build_object(
    'title','FAKTUR / INVOICE','accentColor','#16243c','showQr',true,'showSignature',true,'showTerbilang',true,
    'signatureLabel','Hormat kami','partyLabel','Kepada Yth.',
    'termsTitle','Syarat Pembayaran','terms',jsonb_build_array(
      'Pembayaran ditransfer ke rekening resmi perusahaan yang tercantum.',
      'Konfirmasi pembayaran disertai bukti transfer ke bagian keuangan.',
      'Keterlambatan pembayaran dapat dikenakan penyesuaian sesuai kontrak.'),
    'footerNote','Dokumen ini sah tanpa tanda tangan basah bila kode verifikasi terkonfirmasi.')),
 ('QUOTATION','Surat Penawaran', jsonb_build_object(
    'title','SURAT PENAWARAN','accentColor','#1f3557','showQr',true,'showSignature',true,'showTerbilang',true,
    'signatureLabel','Hormat kami','partyLabel','Kepada Yth.',
    'termsTitle','Syarat & Ketentuan','terms',jsonb_build_array(
      'Harga berlaku 30 hari sejak tanggal penawaran.',
      'Harga belum termasuk PPN kecuali dinyatakan lain.',
      'Waktu pengerjaan dihitung setelah PO dan uang muka diterima.'),
    'footerNote','Terima kasih atas kepercayaan Anda kepada kami.')),
 ('SALES_ORDER','Sales Order', jsonb_build_object(
    'title','SALES ORDER','accentColor','#1f3557','showQr',true,'showSignature',true,'showTerbilang',true,
    'signatureLabel','Disetujui oleh','partyLabel','Pelanggan',
    'termsTitle','Ketentuan Pesanan','terms',jsonb_build_array(
      'Perubahan lingkup setelah SO disetujui memerlukan amendemen tertulis.'),
    'footerNote','')),
 ('PURCHASE_ORDER','Purchase Order', jsonb_build_object(
    'title','PURCHASE ORDER','accentColor','#264066','showQr',true,'showSignature',true,'showTerbilang',true,
    'signatureLabel','Disetujui oleh','partyLabel','Kepada Supplier',
    'termsTitle','Ketentuan Pembelian','terms',jsonb_build_array(
      'Barang dikirim sesuai spesifikasi dan jadwal pada PO ini.',
      'Surat jalan dan dokumen mutu wajib disertakan saat pengiriman.',
      'Tagihan diproses setelah barang diterima dan lolos pemeriksaan.'),
    'footerNote','')),
 ('DELIVERY','Surat Jalan', jsonb_build_object(
    'title','SURAT JALAN','accentColor','#16243c','showQr',true,'showSignature',true,'showTerbilang',false,
    'signatureLabel','Pengirim','partyLabel','Dikirim kepada',
    'termsTitle','Catatan Pengiriman','terms',jsonb_build_array(
      'Barang diperiksa dan diterima dalam keadaan baik oleh penerima.'),
    'footerNote','Penerima wajib menandatangani dan membubuhkan stempel.')),
 ('RMA','Retur / RMA', jsonb_build_object(
    'title','RETUR / RMA','accentColor','#7a2e2e','showQr',true,'showSignature',true,'showTerbilang',true,
    'signatureLabel','Disetujui oleh','partyLabel','Pelanggan',
    'termsTitle','Ketentuan Retur','terms',jsonb_build_array(
      'Retur diproses setelah pemeriksaan kondisi barang.'),
    'footerNote','')),
 ('SUPPLIER_INVOICE','Tagihan Supplier', jsonb_build_object(
    'title','TAGIHAN SUPPLIER','accentColor','#264066','showQr',true,'showSignature',false,'showTerbilang',true,
    'partyLabel','Supplier','termsTitle','','terms',jsonb_build_array(),'footerNote',''));

COMMIT;
