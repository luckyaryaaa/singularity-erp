BEGIN;
-- Kembalikan konfigurasi template ke seed 036 (judul & remarks Bahasa Indonesia).
UPDATE document_templates SET config = jsonb_build_object(
  'title','FAKTUR / INVOICE','accentColor','#16243c','showQr',true,'showSignature',true,'showTerbilang',true,
  'signatureLabel','Hormat kami','partyLabel','Kepada Yth.',
  'termsTitle','Syarat Pembayaran','terms',jsonb_build_array(
    'Pembayaran ditransfer ke rekening resmi perusahaan yang tercantum.',
    'Konfirmasi pembayaran disertai bukti transfer ke bagian keuangan.',
    'Keterlambatan pembayaran dapat dikenakan penyesuaian sesuai kontrak.'),
  'footerNote','Dokumen ini sah tanpa tanda tangan basah bila kode verifikasi terkonfirmasi.'),
  updated_at = now()
WHERE document_type='INVOICE' AND active;

UPDATE document_templates SET config = jsonb_build_object(
  'title','SURAT PENAWARAN','accentColor','#1f3557','showQr',true,'showSignature',true,'showTerbilang',true,
  'signatureLabel','Hormat kami','partyLabel','Kepada Yth.',
  'termsTitle','Syarat & Ketentuan','terms',jsonb_build_array(
    'Harga berlaku 30 hari sejak tanggal penawaran.',
    'Harga belum termasuk PPN kecuali dinyatakan lain.',
    'Waktu pengerjaan dihitung setelah PO dan uang muka diterima.'),
  'footerNote','Terima kasih atas kepercayaan Anda kepada kami.'),
  updated_at = now()
WHERE document_type='QUOTATION' AND active;

UPDATE document_templates SET config = config || jsonb_build_object('accentColor','#1f3557'), updated_at = now()
WHERE document_type IN ('SALES_ORDER','DELIVERY') AND active;
UPDATE document_templates SET config = config || jsonb_build_object('accentColor','#264066'), updated_at = now()
WHERE document_type IN ('PURCHASE_ORDER','SUPPLIER_INVOICE') AND active;

COMMIT;
