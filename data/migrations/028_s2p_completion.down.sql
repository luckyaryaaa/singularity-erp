BEGIN;
-- Rollback Sprint 10 (R017) S2P completion.
ALTER TABLE payment_allocations
  DROP COLUMN IF EXISTS reversed_at,
  DROP COLUMN IF EXISTS reversed_by,
  DROP COLUMN IF EXISTS reversal_reason;
DROP TABLE IF EXISTS po_change_orders;
DROP TABLE IF EXISTS rfq_quote_lines;
DROP TABLE IF EXISTS procurement_budgets;
COMMIT;
