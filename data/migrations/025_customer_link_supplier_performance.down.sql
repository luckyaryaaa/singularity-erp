BEGIN;
DROP TABLE IF EXISTS supplier_score_policies;
ALTER TABLE supplier_evaluations
  DROP COLUMN IF EXISTS calculated_by,
  DROP COLUMN IF EXISTS calculated_at,
  DROP COLUMN IF EXISTS score_breakdown,
  DROP COLUMN IF EXISTS price_sample_count,
  DROP COLUMN IF EXISTS inspection_count,
  DROP COLUMN IF EXISTS receipt_count,
  DROP COLUMN IF EXISTS order_count,
  DROP COLUMN IF EXISTS calculation_source;
ALTER TABLE suppliers
  DROP COLUMN IF EXISTS last_performance_period,
  DROP COLUMN IF EXISTS last_performance_score,
  DROP COLUMN IF EXISTS performance_hold_reason,
  DROP COLUMN IF EXISTS performance_hold;
DROP TABLE IF EXISTS supplier_documents;
DROP TABLE IF EXISTS customer_link_drafts;
COMMIT;
