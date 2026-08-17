BEGIN;

-- Balikan 092. RLS tetap ENABLE (diaktifkan migrasi 045, bukan di sini) —
-- hanya policy tenant, FK, index, dan kolom tenant_id yang dilepas.

DROP POLICY IF EXISTS tenant_isolation ON business_documents;
ALTER TABLE business_documents DROP CONSTRAINT IF EXISTS business_documents_tenant_fk;
DROP INDEX IF EXISTS business_documents_tenant_idx;
ALTER TABLE business_documents DROP COLUMN IF EXISTS tenant_id;

DROP POLICY IF EXISTS tenant_isolation ON inventory_balances;
ALTER TABLE inventory_balances DROP CONSTRAINT IF EXISTS inventory_balances_tenant_fk;
DROP INDEX IF EXISTS inventory_balances_tenant_idx;
ALTER TABLE inventory_balances DROP COLUMN IF EXISTS tenant_id;

DROP POLICY IF EXISTS tenant_isolation ON stock_lots;
ALTER TABLE stock_lots DROP CONSTRAINT IF EXISTS stock_lots_tenant_fk;
DROP INDEX IF EXISTS stock_lots_tenant_idx;
ALTER TABLE stock_lots DROP COLUMN IF EXISTS tenant_id;

DROP POLICY IF EXISTS tenant_isolation ON notifications;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_tenant_fk;
DROP INDEX IF EXISTS notifications_tenant_idx;
ALTER TABLE notifications DROP COLUMN IF EXISTS tenant_id;

COMMIT;
