BEGIN;
-- 049 — P1-4: baris pemenuhan bertipe (typed SO/fulfilment lines).
--
-- document_lines tidak pernah berubah sejak migrasi 002 dan TIDAK menyimpan
-- kaitan apa pun antara baris pengiriman/tagihan dengan baris pesanan yang
-- dipenuhinya. Akibatnya sistem tidak dapat menjawab pertanyaan paling dasar
-- dari sebuah sales order: baris mana yang sudah dikirim, berapa banyak, dan
-- berapa sisanya. Pemenuhan parsial sama sekali tidak terlihat.
--
-- Konsekuensinya sudah terasa: eksposur kredit (P0-K) terpaksa menebak
-- "pengiriman belum ditagih" lewat NOT EXISTS pada relasi dokumen, dan ATP/CTP
-- tidak mungkin dihitung tanpa tahu sisa pesanan per baris.
--
-- business_documents TETAP menjadi registry lifecycle (blueprint §13.1);
-- yang ditambahkan hanya ketypean pada barisnya, bukan tabel dokumen baru.

-- RESTRICT, bukan CASCADE: menghapus baris pesanan yang sudah dipenuhi harus
-- GAGAL, bukan diam-diam menghapus riwayat pemenuhannya.
ALTER TABLE document_lines
  ADD COLUMN source_line_id uuid REFERENCES document_lines(id) ON DELETE RESTRICT;

CREATE INDEX ix_document_lines_source ON document_lines(source_line_id) WHERE source_line_id IS NOT NULL;

-- Baris tidak boleh memenuhi dirinya sendiri.
ALTER TABLE document_lines
  ADD CONSTRAINT document_lines_source_not_self CHECK (source_line_id IS NULL OR source_line_id <> id);

-- Status yang benar-benar mengklaim pesanan. DRAFT dan REVISION_REQUIRED
-- sengaja dikecualikan, sama seperti aturan tagihan terdahulu pada three-way
-- match: draf telantar tidak boleh mengunci sisa pesanan selamanya.
CREATE VIEW sales_order_line_fulfilment AS
SELECT
  so.id                AS sales_order_id,
  so.document_number   AS sales_order_number,
  so.party_id,
  so.branch_id,
  sol.id               AS line_id,
  sol.line_no,
  sol.product_id,
  sol.description,
  sol.uom,
  sol.qty::float       AS ordered_qty,
  COALESCE(SUM(child.qty) FILTER (
    WHERE cd.document_type = 'DELIVERY'
      AND cd.status NOT IN ('DRAFT','REVISION_REQUIRED','CANCELLED','VOID','REJECTED')), 0)::float AS delivered_qty,
  COALESCE(SUM(child.qty) FILTER (
    WHERE cd.document_type = 'INVOICE'
      AND cd.status NOT IN ('DRAFT','REVISION_REQUIRED','CANCELLED','VOID','REJECTED')), 0)::float AS invoiced_qty,
  GREATEST(sol.qty - COALESCE(SUM(child.qty) FILTER (
    WHERE cd.document_type = 'DELIVERY'
      AND cd.status NOT IN ('DRAFT','REVISION_REQUIRED','CANCELLED','VOID','REJECTED')), 0), 0)::float AS remaining_qty
FROM business_documents so
JOIN document_lines sol ON sol.document_id = so.id
LEFT JOIN document_lines child ON child.source_line_id = sol.id
LEFT JOIN business_documents cd ON cd.id = child.document_id
WHERE so.document_type = 'SALES_ORDER'
GROUP BY so.id, so.document_number, so.party_id, so.branch_id,
         sol.id, sol.line_no, sol.product_id, sol.description, sol.uom, sol.qty;

COMMIT;
