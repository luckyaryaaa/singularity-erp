BEGIN;

-- Restore only the privilege available before 072. TRUNCATE was never part
-- of the runtime baseline and therefore remains denied.
GRANT DELETE ON
  financial_reports,
  accounting_periods,
  employee_compensation_history,
  employee_tax_profiles,
  employee_bpjs_profiles,
  payroll_items,
  tax_records
TO mat_erp_app;

COMMIT;
