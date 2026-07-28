BEGIN;

DROP TABLE IF EXISTS field_encryption_rotations;

DROP INDEX IF EXISTS ux_employee_bank_blind;
DROP INDEX IF EXISTS ux_supplier_bank_blind;
DROP INDEX IF EXISTS ux_company_bank_blind;

ALTER TABLE employee_restricted_records
  DROP CONSTRAINT IF EXISTS ck_restricted_notes_encrypted,
  DROP COLUMN IF EXISTS restricted_notes_key_id,
  DROP COLUMN IF EXISTS restricted_notes_ciphertext;
ALTER TABLE employee_emergency_contacts
  DROP CONSTRAINT IF EXISTS ck_emergency_notes_encrypted,
  DROP COLUMN IF EXISTS restricted_notes_key_id,
  DROP COLUMN IF EXISTS restricted_notes_ciphertext;
ALTER TABLE suppliers
  DROP COLUMN IF EXISTS bank_account_blind_index,
  DROP COLUMN IF EXISTS bank_account_key_id,
  DROP COLUMN IF EXISTS bank_account_ciphertext;
ALTER TABLE employee_bank_accounts
  DROP CONSTRAINT IF EXISTS ck_employee_bank_encrypted,
  DROP COLUMN IF EXISTS account_number_blind_index,
  DROP COLUMN IF EXISTS account_number_key_id,
  DROP COLUMN IF EXISTS account_number_ciphertext;
ALTER TABLE supplier_bank_accounts
  DROP CONSTRAINT IF EXISTS ck_supplier_bank_encrypted,
  DROP COLUMN IF EXISTS account_number_blind_index,
  DROP COLUMN IF EXISTS account_number_key_id,
  DROP COLUMN IF EXISTS account_number_ciphertext;
ALTER TABLE company_bank_accounts
  DROP CONSTRAINT IF EXISTS ck_company_bank_encrypted,
  DROP COLUMN IF EXISTS account_number_blind_index,
  DROP COLUMN IF EXISTS account_number_key_id,
  DROP COLUMN IF EXISTS account_number_ciphertext;

COMMIT;
