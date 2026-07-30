BEGIN;
-- Rollback 084 — lepas keunikan grain kanonik. Keunikan cabang tetap.
ALTER TABLE inventory_balances
  DROP CONSTRAINT inventory_balances_product_id_org_warehouse_id_key;
COMMIT;
