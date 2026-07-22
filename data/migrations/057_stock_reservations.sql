BEGIN;
-- 057 — Reservasi stok sebagai CATATAN, bukan sekadar angka.
--
-- Selama ini reservasi hanya kolom `inventory_balances.qty_reserved`: satu
-- angka tanpa asal-usul. Sistem tahu "5 unit direservasi" tetapi tidak tahu
-- SIAPA yang mereservasi, UNTUK dokumen mana, dan karenanya tidak dapat
-- melepas satu reservasi tertentu — hanya bisa mengurangi angkanya dan berharap
-- benar. Tidak ada yang bisa menjawab "kenapa stok ini tidak tersedia?".
--
-- Yang lebih berbahaya sejak v0.34: ATP/CTP menghitung ketersediaan dan
-- MENJANJIKAN tanggal kepada pelanggan, tetapi Sales Order tidak mereservasi
-- apa pun. Stok yang sudah dijanjikan bebas diambil work order atau pesanan
-- lain, sehingga janji itu tidak terlindungi sama sekali.

CREATE TABLE stock_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  warehouse_id uuid NOT NULL REFERENCES branches(id),
  -- Pemilik reservasi: dokumen yang menahannya, dan baris spesifiknya bila ada.
  document_id uuid NOT NULL REFERENCES business_documents(id) ON DELETE RESTRICT,
  document_line_id uuid REFERENCES document_lines(id) ON DELETE RESTRICT,
  work_order_material_id uuid REFERENCES work_order_materials(id) ON DELETE RESTRICT,
  qty numeric(16,4) NOT NULL CHECK (qty > 0),
  consumed_qty numeric(16,4) NOT NULL DEFAULT 0 CHECK (consumed_qty >= 0),
  status varchar(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','CONSUMED','RELEASED','EXPIRED')),
  reason text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES app_users(id),
  released_at timestamptz,
  released_by uuid REFERENCES app_users(id),
  release_reason text,
  CONSTRAINT stock_reservations_consumed_within CHECK (consumed_qty <= qty),
  -- Reservasi yang sudah ditutup wajib punya jejak kapan dan oleh apa.
  CONSTRAINT stock_reservations_closed CHECK (
    status = 'ACTIVE' OR released_at IS NOT NULL
  )
);

CREATE INDEX ix_stock_reservations_stock ON stock_reservations(product_id, warehouse_id) WHERE status = 'ACTIVE';
CREATE INDEX ix_stock_reservations_document ON stock_reservations(document_id);
CREATE INDEX ix_stock_reservations_expiry ON stock_reservations(expires_at) WHERE status = 'ACTIVE' AND expires_at IS NOT NULL;

-- Sisa reservasi aktif per produk/gudang — sumber kebenaran baru untuk
-- ketersediaan. qty_reserved pada inventory_balances tetap dipelihara sebagai
-- cache yang direkonsiliasi dari sini, bukan sebaliknya.
CREATE VIEW stock_reservation_balance AS
SELECT product_id, warehouse_id,
       SUM(qty - consumed_qty)::float AS reserved_qty,
       COUNT(*)::int AS reservation_count
FROM stock_reservations
WHERE status = 'ACTIVE'
GROUP BY product_id, warehouse_id;

-- Backfill: reservasi produksi yang selama ini hanya berupa angka diubah
-- menjadi catatan nyata, supaya tidak ada reservasi tak bertuan yang tertinggal
-- dan angka lama tetap dapat dipertanggungjawabkan.
INSERT INTO stock_reservations(product_id, warehouse_id, document_id, work_order_material_id, qty, reason, created_by)
SELECT m.product_id,
       COALESCE((d.payload->'production'->>'warehouseId')::uuid, d.branch_id),
       m.work_order_id, m.id, m.reserved_qty,
       'Backfill migrasi 057 — reservasi produksi yang sebelumnya hanya angka pada inventory_balances',
       d.created_by
FROM work_order_materials m
JOIN business_documents d ON d.id = m.work_order_id
WHERE m.reserved_qty > 0
  AND d.status NOT IN ('CANCELLED','VOID','REJECTED','COMPLETED','CLOSED');

COMMIT;
