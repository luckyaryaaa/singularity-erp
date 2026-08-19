BEGIN;

-- 109 · Fix RLS salary_grades: policy 108 hanya RESTRICTIVE (tenant_isolation),
-- tanpa policy PERMISSIVE → semua baris ter-deny. Tambah policy PERMISSIVE
-- (read scope per tenant) sehingga baris tenant terlihat; RESTRICTIVE tetap
-- jadi pagar keras tenant (pola sama seperti 107).
CREATE POLICY salary_grades_tenant_read ON salary_grades AS PERMISSIVE
  USING (app_tenant_visible(tenant_id)) WITH CHECK (app_tenant_visible(tenant_id));

COMMIT;
