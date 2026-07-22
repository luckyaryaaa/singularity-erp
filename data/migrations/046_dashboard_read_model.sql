BEGIN;
-- 046 — P1-1: indeks pendukung read model dashboard.
--
-- Agregasi dashboard kini dikerjakan database (sebelumnya seluruh baris ditarik
-- lalu difilter di memori Node). Tanpa indeks, agregat itu tetap seq scan atas
-- seluruh riwayat dokumen — cepat pada data dev, mahal pada data produksi.
--
-- Indeks parsial: hanya baris yang benar-benar dipandang dashboard yang
-- diindeks, sehingga indeksnya tetap kecil walau tabelnya tumbuh.

-- Pesanan aktif: order book, jumlah aktif, progres produksi, daftar 8 teratas.
CREATE INDEX ix_documents_dashboard_active
  ON business_documents (branch_id, updated_at DESC)
  WHERE is_archived = false
    AND document_type IN ('WORK_ORDER','SALES_ORDER','PROJECT')
    AND status IN ('WAITING_APPROVAL','APPROVED','IN_PROCESS','PARTIALLY_COMPLETED');

-- Invoice pelanggan: omzet bulan berjalan/sebelumnya, AR terbuka, AR jatuh tempo.
CREATE INDEX ix_documents_dashboard_invoice
  ON business_documents (branch_id, created_at DESC)
  WHERE is_archived = false
    AND document_type = 'INVOICE'
    AND status NOT IN ('DRAFT','VOID','CANCELLED');

-- Tagihan supplier terbuka: kartu utang usaha.
CREATE INDEX ix_documents_dashboard_payable
  ON business_documents (branch_id)
  WHERE is_archived = false
    AND document_type = 'SUPPLIER_INVOICE'
    AND status NOT IN ('CLOSED','VOID','CANCELLED');

COMMIT;
