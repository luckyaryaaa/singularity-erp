BEGIN;

-- Immutable issuance snapshot for official documents. Rendering and public
-- verification use this snapshot, not mutable transactional rows.
ALTER TABLE business_documents
  ADD COLUMN official_issued_at timestamptz,
  ADD COLUMN official_issued_by uuid REFERENCES app_users(id),
  ADD COLUMN official_signature varchar(20),
  ADD COLUMN official_key_id varchar(40),
  ADD COLUMN official_template_version varchar(60),
  ADD COLUMN official_payload jsonb;

ALTER TABLE business_documents ADD CONSTRAINT ck_documents_official_complete CHECK (
  (official_issued_at IS NULL AND official_issued_by IS NULL AND official_signature IS NULL AND official_key_id IS NULL AND official_template_version IS NULL AND official_payload IS NULL)
  OR
  (official_issued_at IS NOT NULL AND official_issued_by IS NOT NULL AND official_signature IS NOT NULL AND official_key_id IS NOT NULL AND official_template_version IS NOT NULL AND official_payload IS NOT NULL)
);

CREATE INDEX ix_documents_official_signature ON business_documents(official_signature) WHERE official_signature IS NOT NULL;

COMMIT;
