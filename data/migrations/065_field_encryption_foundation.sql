BEGIN;

-- Application-layer ciphertext lives beside a non-sensitive legacy token.
-- Constraints are NOT VALID so an existing installation can migrate first,
-- then run security:rotate-fields to encrypt/backfill and validate atomically.
ALTER TABLE company_bank_accounts
  ADD COLUMN account_number_ciphertext text,
  ADD COLUMN account_number_key_id varchar(48),
  ADD COLUMN account_number_blind_index char(64);
ALTER TABLE supplier_bank_accounts
  ADD COLUMN account_number_ciphertext text,
  ADD COLUMN account_number_key_id varchar(48),
  ADD COLUMN account_number_blind_index char(64);
ALTER TABLE employee_bank_accounts
  ADD COLUMN account_number_ciphertext text,
  ADD COLUMN account_number_key_id varchar(48),
  ADD COLUMN account_number_blind_index char(64);
ALTER TABLE suppliers
  ADD COLUMN bank_account_ciphertext text,
  ADD COLUMN bank_account_key_id varchar(48),
  ADD COLUMN bank_account_blind_index char(64);
ALTER TABLE employee_emergency_contacts
  ADD COLUMN restricted_notes_ciphertext text,
  ADD COLUMN restricted_notes_key_id varchar(48);
ALTER TABLE employee_restricted_records
  ADD COLUMN restricted_notes_ciphertext text,
  ADD COLUMN restricted_notes_key_id varchar(48);

ALTER TABLE company_bank_accounts ADD CONSTRAINT ck_company_bank_encrypted
  CHECK(account_number LIKE 'ENC:%'
    AND account_number_ciphertext IS NOT NULL
    AND account_number_key_id IS NOT NULL
    AND account_number_blind_index IS NOT NULL) NOT VALID;
ALTER TABLE supplier_bank_accounts ADD CONSTRAINT ck_supplier_bank_encrypted
  CHECK(account_number LIKE 'ENC:%'
    AND account_number_ciphertext IS NOT NULL
    AND account_number_key_id IS NOT NULL
    AND account_number_blind_index IS NOT NULL) NOT VALID;
ALTER TABLE employee_bank_accounts ADD CONSTRAINT ck_employee_bank_encrypted
  CHECK(account_number LIKE 'ENC:%'
    AND account_number_ciphertext IS NOT NULL
    AND account_number_key_id IS NOT NULL
    AND account_number_blind_index IS NOT NULL) NOT VALID;
ALTER TABLE employee_emergency_contacts ADD CONSTRAINT ck_emergency_notes_encrypted
  CHECK(restricted_notes IS NULL OR
    (restricted_notes='[ENCRYPTED]' AND restricted_notes_ciphertext IS NOT NULL
      AND restricted_notes_key_id IS NOT NULL)) NOT VALID;
ALTER TABLE employee_restricted_records ADD CONSTRAINT ck_restricted_notes_encrypted
  CHECK(restricted_notes='[ENCRYPTED]'
    AND restricted_notes_ciphertext IS NOT NULL
    AND restricted_notes_key_id IS NOT NULL) NOT VALID;

CREATE UNIQUE INDEX ux_company_bank_blind
  ON company_bank_accounts(legal_entity_id,account_number_blind_index)
  WHERE account_number_blind_index IS NOT NULL;
CREATE UNIQUE INDEX ux_supplier_bank_blind
  ON supplier_bank_accounts(supplier_id,account_number_blind_index)
  WHERE account_number_blind_index IS NOT NULL;
CREATE UNIQUE INDEX ux_employee_bank_blind
  ON employee_bank_accounts(employee_id,account_number_blind_index)
  WHERE account_number_blind_index IS NOT NULL;

CREATE TABLE field_encryption_rotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  current_key_id varchar(48) NOT NULL,
  previous_key_ids text[] NOT NULL DEFAULT '{}',
  status varchar(20) NOT NULL CHECK(status IN('SUCCEEDED','FAILED')),
  row_counts jsonb NOT NULL DEFAULT '{}',
  database_user text NOT NULL DEFAULT current_user,
  started_at timestamptz NOT NULL,
  finished_at timestamptz NOT NULL,
  detail text
);
REVOKE ALL ON field_encryption_rotations FROM PUBLIC;

COMMIT;
