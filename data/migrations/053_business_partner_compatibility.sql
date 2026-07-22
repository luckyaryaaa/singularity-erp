BEGIN;
-- Deleting a non-posted legacy master may remove its role link, but never the
-- canonical party or merge lineage. This preserves existing maintenance and
-- test cleanup contracts without allowing transaction-facing cascades.
ALTER TABLE business_partner_roles DROP CONSTRAINT business_partner_roles_customer_id_fkey;
ALTER TABLE business_partner_roles ADD CONSTRAINT business_partner_roles_customer_id_fkey FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE;
ALTER TABLE business_partner_roles DROP CONSTRAINT business_partner_roles_supplier_id_fkey;
ALTER TABLE business_partner_roles ADD CONSTRAINT business_partner_roles_supplier_id_fkey FOREIGN KEY(supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE;
COMMIT;
