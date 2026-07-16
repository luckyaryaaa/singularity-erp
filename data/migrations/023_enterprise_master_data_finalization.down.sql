BEGIN;
DROP TABLE IF EXISTS master_data_quality_issues;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['customers','suppliers','products','employees'] LOOP
    EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS quality_checked_at, DROP COLUMN IF EXISTS quality_flags, DROP COLUMN IF EXISTS data_quality_score',t);
  END LOOP;
END $$;
DROP TABLE IF EXISTS product_variants;
DROP INDEX IF EXISTS ix_documents_currency_date;
ALTER TABLE business_documents
  DROP COLUMN IF EXISTS dimension_snapshot,
  DROP COLUMN IF EXISTS currency_snapshot,
  DROP COLUMN IF EXISTS reporting_amount,
  DROP COLUMN IF EXISTS functional_amount,
  DROP COLUMN IF EXISTS exchange_rate_date,
  DROP COLUMN IF EXISTS exchange_rate,
  DROP COLUMN IF EXISTS reporting_currency,
  DROP COLUMN IF EXISTS functional_currency,
  DROP COLUMN IF EXISTS transaction_currency;
DROP TABLE IF EXISTS transaction_dimension_policies;
DROP TABLE IF EXISTS exchange_rates;
DROP TABLE IF EXISTS currencies;
COMMIT;
