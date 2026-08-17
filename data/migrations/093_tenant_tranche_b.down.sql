BEGIN;

-- Balikan 093. RLS tetap ENABLE (dari tranche sebelumnya) — hanya policy tenant,
-- FK, index, dan kolom tenant_id yang dilepas, untuk daftar tabel yang sama.

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
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', t, t || '_tenant_fk');
    EXECUTE format('DROP INDEX IF EXISTS %I', t || '_tenant_idx');
    EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS tenant_id', t);
  END LOOP;
END $$;

COMMIT;
