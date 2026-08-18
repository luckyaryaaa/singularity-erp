BEGIN;

DROP INDEX IF EXISTS ux_tax_rates_key;
CREATE UNIQUE INDEX ux_tax_rates_key
  ON tax_rates (tax_key, effective_from) WHERE active;

COMMIT;
