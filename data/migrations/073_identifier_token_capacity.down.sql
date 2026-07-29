BEGIN;

-- Safe only before identifier rotation/backfill. Once values are tokenized,
-- use a forward migration rather than narrowing these columns.
ALTER TABLE employee_bpjs_profiles
  ALTER COLUMN membership_number TYPE varchar(30);
ALTER TABLE employee_tax_profiles
  ALTER COLUMN npwp TYPE varchar(30);
ALTER TABLE employee_personal_profiles
  ALTER COLUMN nik_ktp TYPE varchar(20);

COMMIT;
