BEGIN;
DROP INDEX IF EXISTS ux_customer_po_number_per_customer;
DROP INDEX IF EXISTS ux_accounting_periods_entity_period;
ALTER TABLE accounting_periods ADD CONSTRAINT accounting_periods_period_key UNIQUE (period);
ALTER TABLE accounting_periods DROP COLUMN IF EXISTS legal_entity_id;
DROP TABLE IF EXISTS exchange_rate_proposals;
COMMIT;
