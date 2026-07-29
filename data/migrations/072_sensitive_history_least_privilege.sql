BEGIN;

-- Corrections to financial statements and HR/payroll histories are represented
-- by a new version, reversal, or effective-dated row. The runtime role may
-- never erase this evidentiary history, even if an application defect issues
-- a DELETE directly.
REVOKE DELETE,TRUNCATE ON
  financial_reports,
  accounting_periods,
  employee_compensation_history,
  employee_tax_profiles,
  employee_bpjs_profiles,
  payroll_items,
  tax_records
FROM mat_erp_app;

COMMIT;
