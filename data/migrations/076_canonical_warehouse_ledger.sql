BEGIN;
-- 076 — Canonical Warehouse Ledger (Stage 1).
--
-- Blueprint §9.8 menuntut migrasi dari "Branch-as-Warehouse" ke hierarki nyata
-- Plant → Warehouse → Storage Location → Bin. Strukturnya sudah ada sejak 012
-- (plants, org_warehouses, storage_locations, warehouse_bins), tetapi STOK masih
-- menggantung pada cabang: stock_lots.warehouse_id → branches. Akibatnya stok
-- tidak punya identitas gudang nyata, dan "gudang = cabang" tertanam di ~200
-- tempat pada kode.
--
-- Membalik grain stok (warehouse_id menjadi org_warehouse) adalah cutover
-- berlapis yang menyentuh RLS dan puluhan modul. Stage 1 ini menegakkan DIMENSI
-- gudang kanonik tanpa membalik kunci isolasi: setiap lot memperoleh
-- org_warehouse_id nyata (di dalam cabangnya), konsistensinya dijaga trigger,
-- dan cabang tetap menjadi kunci scope/RLS sebagai jembatan yang kini EKSPLISIT
-- dan ter-enforce — bukan implisit seperti sebelumnya.

-- 1. Setiap cabang memerlukan satu gudang default yang deterministik.
ALTER TABLE org_warehouses ADD COLUMN is_default boolean NOT NULL DEFAULT false;
-- Maksimal satu default per cabang.
CREATE UNIQUE INDEX ux_org_warehouses_default ON org_warehouses(branch_id) WHERE is_default;

-- Cabang tanpa gudang sama sekali memperoleh gudang utama (plant diambil bila
-- cabang punya tepat satu; selain itu NULL — plant_id memang opsional).
INSERT INTO org_warehouses(id, plant_id, branch_id, code, name, warehouse_type, active, is_default)
SELECT gen_random_uuid(),
       (SELECT p.id FROM plants p WHERE p.branch_id = b.id AND p.active ORDER BY p.code LIMIT 1),
       b.id, 'WH-' || b.code, 'Gudang Utama ' || b.code, 'GENERAL', true, true
FROM branches b
WHERE b.active AND NOT EXISTS (SELECT 1 FROM org_warehouses w WHERE w.branch_id = b.id);

-- Cabang yang sudah punya gudang tetapi belum menandai default: tandai satu.
UPDATE org_warehouses SET is_default = true
WHERE id IN (
  SELECT DISTINCT ON (branch_id) id FROM org_warehouses
  WHERE branch_id IN (
    SELECT branch_id FROM org_warehouses GROUP BY branch_id HAVING bool_or(is_default) = false
  )
  ORDER BY branch_id, code
);

-- 2. Stok memperoleh identitas gudang kanonik (di dalam cabangnya).
ALTER TABLE stock_lots ADD COLUMN org_warehouse_id uuid REFERENCES org_warehouses(id);
CREATE INDEX ix_stock_lots_org_warehouse ON stock_lots(org_warehouse_id) WHERE org_warehouse_id IS NOT NULL;

-- Invariant self-healing: org_warehouse_id selalu berada di cabang lotnya. Bila
-- NULL atau menunjuk gudang cabang lain, di-resolve ke gudang default cabang —
-- jadi stok tidak pernah bisa "menggantung" di gudang milik cabang lain, tetapi
-- penempatan spesifik ke gudang lain dalam cabang yang sama tetap dihormati.
CREATE OR REPLACE FUNCTION resolve_stock_lot_warehouse() RETURNS trigger AS $$
BEGIN
  IF NEW.org_warehouse_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM org_warehouses w
                    WHERE w.id = NEW.org_warehouse_id AND w.branch_id = NEW.warehouse_id) THEN
    NEW.org_warehouse_id := (SELECT id FROM org_warehouses w
                             WHERE w.branch_id = NEW.warehouse_id AND w.is_default LIMIT 1);
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_resolve_stock_lot_warehouse
BEFORE INSERT OR UPDATE OF warehouse_id, org_warehouse_id ON stock_lots
FOR EACH ROW EXECUTE FUNCTION resolve_stock_lot_warehouse();

-- Backfill lot yang sudah ada (bila ada) ke gudang default cabangnya.
UPDATE stock_lots l SET org_warehouse_id = (
  SELECT id FROM org_warehouses w WHERE w.branch_id = l.warehouse_id AND w.is_default LIMIT 1)
WHERE org_warehouse_id IS NULL;

-- 3. Ledger hierarki kanonik: Legal Entity → Plant → Warehouse → (Storage/Bin)
-- dengan ringkasan stok diturunkan dari lot. security_invoker: view membaca
-- dengan RLS pemanggil (PostgreSQL 16), bukan owner.
CREATE VIEW stock_warehouse_ledger AS
SELECT w.id                AS org_warehouse_id,
       w.code              AS warehouse_code,
       w.name              AS warehouse_name,
       w.warehouse_type,
       w.is_default,
       w.active,
       w.branch_id,
       b.code              AS branch_code,
       b.name              AS branch_name,
       b.legal_entity_id,
       w.plant_id,
       p.code              AS plant_code,
       p.name              AS plant_name,
       COALESCE(s.lot_count, 0)         AS lot_count,
       COALESCE(s.qty_on_hand, 0)::float AS qty_on_hand
FROM org_warehouses w
JOIN branches b ON b.id = w.branch_id
LEFT JOIN plants p ON p.id = w.plant_id
LEFT JOIN (
  SELECT org_warehouse_id, count(*) AS lot_count, sum(qty_on_hand) AS qty_on_hand
  FROM stock_lots
  WHERE qty_on_hand > 0 AND status <> 'CONSUMED'
  GROUP BY org_warehouse_id
) s ON s.org_warehouse_id = w.id;
ALTER VIEW stock_warehouse_ledger SET (security_invoker = true);

COMMIT;
