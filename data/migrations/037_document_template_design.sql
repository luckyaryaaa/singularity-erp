BEGIN;
-- ═══════════════════════════════════════════════════════════════════════════
-- Selaraskan konfigurasi template INVOICE & QUOTATION dengan desain resmi MAT
-- (folder Template — kop navy + aksen emas, label Inggris, remarks resmi).
-- Migrasi immutable: 036 men-seed v1, 037 memperbarui config v1 aktif agar DB
-- baru maupun lama menghasilkan template identik dengan desain yang disepakati.
-- Dokumen yang sudah terbit tetap memakai snapshot-nya sendiri.
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE document_templates SET config = jsonb_build_object(
  'title','INVOICE','accentColor','#1a2b4d','showQr',true,'showSignature',true,'showTerbilang',true,
  'signatureLabel','Prepared By','partyLabel','Bill To','termsTitle','Remarks / Notes',
  'terms',jsonb_build_array(
    'Prices are in Indonesian Rupiah (IDR).',
    'Please make payment according to the invoice amount.',
    'Payment confirmation may be sent after transfer.',
    'Thank you for your trust and business.'),
  'footerNote','This document is valid without a wet signature once the verification code is confirmed.'),
  updated_at = now()
WHERE document_type='INVOICE' AND active;

UPDATE document_templates SET config = jsonb_build_object(
  'title','QUOTATION','accentColor','#1a2b4d','showQr',true,'showSignature',true,'showTerbilang',true,
  'signatureLabel','Prepared By','partyLabel','Proposed To','termsTitle','Remarks / Notes',
  'terms',jsonb_build_array(
    'Prices are in Indonesian Rupiah (IDR).',
    'Quotation is valid until the stated date above.',
    'Lead time will be confirmed after order confirmation.',
    'Payment by bank transfer to the account below.'),
  'footerNote','Thank you for your trust in our engineering service.'),
  updated_at = now()
WHERE document_type='QUOTATION' AND active;

-- Samakan warna aksen brand navy untuk tipe lain (pengguna mendesain lanjut via UI).
UPDATE document_templates SET config = config || jsonb_build_object('accentColor','#1a2b4d'), updated_at = now()
WHERE document_type IN ('SALES_ORDER','PURCHASE_ORDER','DELIVERY','SUPPLIER_INVOICE') AND active;

COMMIT;
