BEGIN;
-- Rollback 045 — matikan RLS tranche 1.
DROP POLICY IF EXISTS branch_scope ON notifications;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS branch_scope ON stock_lots;
ALTER TABLE stock_lots DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS branch_scope ON inventory_balances;
ALTER TABLE inventory_balances DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS branch_scope ON business_documents;
ALTER TABLE business_documents DISABLE ROW LEVEL SECURITY;
DROP FUNCTION IF EXISTS app_branch_visible(uuid);
COMMIT;
