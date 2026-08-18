BEGIN;

DROP INDEX IF EXISTS ux_employee_personal_nik_ktp_blind;
CREATE UNIQUE INDEX ux_employee_personal_nik_ktp_blind
  ON employee_personal_profiles(nik_ktp_blind_index)
  WHERE nik_ktp_blind_index IS NOT NULL;

DROP INDEX IF EXISTS ux_employee_tax_npwp_blind;
CREATE UNIQUE INDEX ux_employee_tax_npwp_blind
  ON employee_tax_profiles(npwp_blind_index)
  WHERE npwp_blind_index IS NOT NULL AND effective_to IS NULL;

DROP INDEX IF EXISTS ux_employee_bpjs_membership_blind;
CREATE UNIQUE INDEX ux_employee_bpjs_membership_blind
  ON employee_bpjs_profiles(program, membership_number_blind_index)
  WHERE membership_number_blind_index IS NOT NULL;

COMMIT;
