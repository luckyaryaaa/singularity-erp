BEGIN;
-- 084 — Canonical Warehouse Terminal Grain-Flip (ledger balance write grain).
--
-- Langkah terminal cutover: grain OTORITATIF TULIS saldo persediaan berpindah ke
-- gudang kanonik (org_warehouse_id). posting.balance dan syncBalance kini meng-
-- key saldo pada (product, org_warehouse) — cabang di-resolve ke gudang
-- defaultnya. Karena tiap cabang masih 1:1 dengan gudang default (080/082), flip
-- ini VALUE-PRESERVING.
--
-- Keunikan grain cabang (product, warehouse_id) DIPERTAHANKAN sebagai
-- kompatibilitas: masih dipakai opening-inventory dan sejumlah setup sebagai
-- ON CONFLICT, dan menjaga isolasi 1:1. Menambahkan keunikan grain kanonik
-- menjadikan gudang kanonik ditegakkan untuk penulisan. Mengaktifkan
-- multi-gudang-per-cabang sebenarnya (melepas keunikan cabang + merapikan
-- seluruh read-site ber-key cabang) adalah follow-up terminal terakhir.
ALTER TABLE inventory_balances
  ADD CONSTRAINT inventory_balances_product_id_org_warehouse_id_key
  UNIQUE (product_id, org_warehouse_id);

COMMIT;
