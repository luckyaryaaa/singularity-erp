BEGIN;

-- 107 · Employee Self-Service — antrean pengkinian identitas (maker-checker).
-- Karyawan mengusulkan perubahan data diri NON-sensitif; HR menyetujui/menolak.
-- NIK KTP tidak lewat jalur ini (tetap diinput HR, terenkripsi). SoD ditegakkan
-- di level DB (penyetuju != pengusul) + endpoint. tenant_id + RLS mengikuti pola
-- 093; employee_scope_isolation mewarisi cabang karyawan (pola 070).
CREATE TABLE employee_self_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT COALESCE(nullif(current_setting('app.tenant_id', true), '')::uuid, '00000000-0000-0000-0000-000000000001'::uuid) REFERENCES tenants(id),
  employee_id uuid NOT NULL REFERENCES employees(id),
  proposed jsonb NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  requested_by uuid NOT NULL REFERENCES app_users(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_by uuid REFERENCES app_users(id),
  decided_at timestamptz,
  decision_reason text,
  CONSTRAINT employee_self_updates_sod CHECK (decided_by IS NULL OR decided_by <> requested_by)
);
CREATE INDEX employee_self_updates_tenant_idx ON employee_self_updates (tenant_id);
CREATE INDEX employee_self_updates_pending_idx ON employee_self_updates (status, requested_at DESC);
CREATE INDEX employee_self_updates_emp_idx ON employee_self_updates (employee_id, requested_at DESC);

ALTER TABLE employee_self_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON employee_self_updates AS RESTRICTIVE
  USING (app_tenant_visible(tenant_id)) WITH CHECK (app_tenant_visible(tenant_id));
CREATE POLICY employee_scope_isolation ON employee_self_updates
  USING (app_employee_visible(employee_id)) WITH CHECK (app_employee_visible(employee_id));

COMMENT ON TABLE employee_self_updates IS
  'Employee self-service identity change proposals (maker-checker); applied to employee_personal_profiles on HR approval.';

COMMIT;
