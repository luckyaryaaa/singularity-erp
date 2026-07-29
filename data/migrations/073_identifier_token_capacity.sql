BEGIN;

-- Blind-index legacy tokens use "ENC:" + 36 hexadecimal characters. Preserve
-- the original columns as non-sensitive compatibility fields, but give them
-- enough capacity for the deterministic token written by field-encryption.
ALTER TABLE employee_personal_profiles
  ALTER COLUMN nik_ktp TYPE varchar(48);
ALTER TABLE employee_tax_profiles
  ALTER COLUMN npwp TYPE varchar(48);
ALTER TABLE employee_bpjs_profiles
  ALTER COLUMN membership_number TYPE varchar(48);

COMMIT;
