BEGIN;
-- 083 — Canonical Warehouse Stage 2B: RECONCILE + READ-SWITCH.
--
-- Stage 2A (082) menyelesaikan INTRODUCE + DUAL-WRITE GUARD: setiap ledger stok
-- membawa org_warehouse_id yang tervalidasi di cabangnya. Stage 2B menambahkan
-- fase RECONCILE + READ-SWITCH secara REVERSIBEL:
--   * bukti bahwa membaca pada grain org_warehouse identik nilainya dengan grain
--     cabang (warehouse_id) — read-switch tidak mengubah angka, hanya grain;
--   * flag read-grain yang dapat diaktifkan/dibatalkan (rehearsal + rollback),
--     dengan gate: switch ke CANONICAL hanya boleh saat rekonsiliasi bersih.
-- warehouse_id ber-grain cabang TETAP menjadi kunci scope/RLS (kompatibilitas);
-- grain-flip penuh adalah stage terminal berikutnya.

-- Read-switch reconciliation: per produk×cabang, total pada grain cabang wajib
-- sama dengan total pada grain org_warehouse (dipetakan balik ke cabang). Selama
-- setiap saldo hanya punya satu org_warehouse dalam cabangnya (dijamin 082),
-- selisih selalu nol — view ini menjadikannya dapat diverifikasi dan menjaga
-- dari divergensi di masa depan.
CREATE VIEW warehouse_read_switch_reconciliation AS
WITH by_branch AS (
  SELECT product_id, warehouse_id AS branch_id,
         SUM(qty_on_hand)::numeric qty_branch, SUM(value_idr)::numeric value_branch
  FROM inventory_balances GROUP BY product_id, warehouse_id
),
by_canonical AS (
  SELECT i.product_id, w.branch_id,
         SUM(i.qty_on_hand)::numeric qty_canonical, SUM(i.value_idr)::numeric value_canonical
  FROM inventory_balances i JOIN org_warehouses w ON w.id = i.org_warehouse_id
  GROUP BY i.product_id, w.branch_id
)
SELECT COALESCE(b.product_id, c.product_id) AS product_id,
       COALESCE(b.branch_id, c.branch_id)   AS branch_id,
       COALESCE(b.qty_branch, 0)            AS qty_branch,
       COALESCE(c.qty_canonical, 0)         AS qty_canonical,
       COALESCE(b.qty_branch, 0) - COALESCE(c.qty_canonical, 0) AS qty_diff,
       COALESCE(b.value_branch, 0) - COALESCE(c.value_canonical, 0) AS value_diff
FROM by_branch b
FULL OUTER JOIN by_canonical c
  ON b.product_id = c.product_id AND b.branch_id = c.branch_id;
ALTER VIEW warehouse_read_switch_reconciliation SET (security_invoker = true);

-- Ringkasan gate read-switch: nol berarti aman beralih ke grain kanonik.
CREATE VIEW warehouse_read_switch_health AS
SELECT
  (SELECT count(*) FROM warehouse_read_switch_reconciliation
   WHERE qty_diff <> 0 OR value_diff <> 0)::int AS balance_grain_mismatch,
  (SELECT balance_missing_warehouse + movement_missing_warehouse
        + reservation_missing_warehouse + lot_missing_warehouse
        + task_missing_warehouse + lot_cross_branch + reservation_cross_branch
   FROM warehouse_dimension_health)::int AS dimension_issues;
ALTER VIEW warehouse_read_switch_health SET (security_invoker = true);

-- Flag read-grain (reversibel). Default BRANCH: seluruh modul lama tetap membaca
-- grain cabang sampai cutover diaktifkan secara sadar.
INSERT INTO system_settings(setting_key, value)
VALUES ('warehouse.read_grain', '{"grain":"BRANCH"}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

COMMIT;
