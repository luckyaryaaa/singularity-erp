BEGIN;

-- 093 · Singularity Fase 0 — tranche B: tenant_id + RLS pada tabel BISNIS
-- yang SUDAH ber-RLS (tranche branch/own) tetapi belum ber-tenant.
--
-- Pola identik 092: kolom tenant_id NOT NULL dengan fallback-default (COALESCE
-- ke MAT #001 saat konteks kosong → job/worker/platform tetap jalan di Fase 0
-- single-tenant), backfill MAT, FK, index, dan policy tenant RESTRICTIVE
-- (di-AND-kan dengan policy branch/own yang sudah ada). RLS sudah ENABLE dari
-- tranche sebelumnya → tidak perlu ENABLE ulang.
--
-- Daftar EKSPLISIT (auditable) = seluruh tabel public ber-RLS tanpa tenant_id
-- per 2026-08-10, kecuali `tenants` (registry) dan partisi `audit_logs*`
-- (ditangani terpisah). Tabel non-RLS (auth/config/reference) = tranche C.

DO $$
DECLARE
  t text;
  targets text[] := ARRAY[
    'accounting_period_close_runs','accounting_periods','attendance_corrections','attendance_records',
    'authority_delegations','business_partner_duplicate_candidates','business_partners','capa_cases',
    'change_requests','company_bank_accounts','employee_access_assignments','employee_bank_accounts',
    'employee_bpjs_profiles','employee_certifications','employee_compensation_history','employee_contracts',
    'employee_documents','employee_emergency_contacts','employee_employment_history','employee_insurance_claim_history',
    'employee_insurance_profiles','employee_personal_profiles','employee_positions','employee_restricted_records',
    'employee_rosters','employee_tax_profiles','employees','finance_reconciliation_evidence','financial_reports',
    'instrument_calibrations','leave_accrual_entries','leave_balances','master_data_quality_rules',
    'master_import_batches','master_import_rows','measuring_instruments','notification_preferences',
    'organization_hierarchy_versions','organization_jobs','organization_positions','organization_tax_identities',
    'payroll_components','payroll_items','position_assignments','purchase_contract_lines',
    'purchase_contract_releases','purchase_contracts','qc_inspections','sales_availability_promises',
    'sales_backorders','sales_contract_lines','sales_contract_releases','sales_contracts',
    'sales_margin_assessments','sales_margin_policies','sales_milestone_schedules','stock_reservations',
    'tax_records','warehouse_handling_unit_items','warehouse_handling_units','warehouse_scan_events',
    'warehouse_scan_sessions','warehouse_tasks','work_items','work_order_materials',
    'work_order_operations','work_order_time_logs'
  ];
BEGIN
  FOREACH t IN ARRAY targets LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN tenant_id uuid', t);
    EXECUTE format('UPDATE %I SET tenant_id=%L WHERE tenant_id IS NULL', t, '00000000-0000-0000-0000-000000000001');
    EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL', t);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET DEFAULT COALESCE(nullif(current_setting(%L, true), %L)::uuid, %L::uuid)',
                   t, 'app.tenant_id', '', '00000000-0000-0000-0000-000000000001');
    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (tenant_id) REFERENCES tenants(id)', t, t || '_tenant_fk');
    EXECUTE format('CREATE INDEX %I ON %I (tenant_id)', t || '_tenant_idx', t);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I AS RESTRICTIVE USING (app_tenant_visible(tenant_id)) WITH CHECK (app_tenant_visible(tenant_id))', t);
  END LOOP;
END $$;

COMMIT;
