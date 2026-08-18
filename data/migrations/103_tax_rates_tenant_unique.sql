BEGIN;

-- 103 · Re-scope tax_rates unique per tenant (multi-tenant correctness).
--
-- ux_tax_rates_key semula (tax_key, effective_from) WHERE active — GLOBAL: tarif
-- aktif MAT (mis. PPN 11% eff 2022-04-01) memblok tenant lain memiliki tarif yang
-- sama, sehingga baseline akuntansi tenant baru gagal (duplicate key). Re-scope ke
-- (tenant_id, tax_key, effective_from) WHERE active agar tiap tenant punya tarif
-- pajaknya sendiri. Sejalan dgn pola re-scope unique identity per-tenant (097/100).

DROP INDEX IF EXISTS ux_tax_rates_key;
CREATE UNIQUE INDEX ux_tax_rates_key
  ON tax_rates (tenant_id, tax_key, effective_from) WHERE active;

COMMIT;
