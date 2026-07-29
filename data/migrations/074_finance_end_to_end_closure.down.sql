BEGIN;

DROP TRIGGER IF EXISTS trg_protect_period_close_evidence ON accounting_period_close_runs;
DROP FUNCTION IF EXISTS protect_period_close_evidence();
DROP TRIGGER IF EXISTS trg_protect_finance_reconciliation_evidence ON finance_reconciliation_evidence;
DROP FUNCTION IF EXISTS protect_finance_evidence();
DROP TABLE IF EXISTS accounting_period_close_runs;
DROP TABLE IF EXISTS finance_reconciliation_evidence;

ALTER TABLE account_dimension_policy
  DROP COLUMN IF EXISTS updated_by,
  DROP COLUMN IF EXISTS version;

UPDATE transaction_dimension_policies
   SET profit_center_required = false,
       updated_at = now()
 WHERE document_type IN (
   'INVOICE','CUSTOMER_PAYMENT','SUPPLIER_INVOICE','SUPPLIER_PAYMENT',
   'EXPENSE','JOURNAL','PAYROLL_RUN','TAX_DOCUMENT','PAYMENT_PROPOSAL'
 );

COMMIT;
