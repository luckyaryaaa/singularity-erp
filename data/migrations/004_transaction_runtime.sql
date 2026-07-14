-- 004_transaction_runtime.sql — primitive transaksi runtime yang tahan concurrency.
BEGIN;

CREATE TABLE document_sequences (
  document_type varchar(50) NOT NULL,
  branch_id uuid NOT NULL REFERENCES branches(id),
  period char(4) NOT NULL CHECK (period ~ '^[0-9]{4}$'),
  current_value bigint NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(document_type,branch_id,period)
);

CREATE TABLE auth_pending (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind varchar(30) NOT NULL CHECK (kind IN ('mfa','password_change','mfa_recovery')),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token_hash char(64) UNIQUE NOT NULL,
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_auth_pending_expiry ON auth_pending(expires_at);

CREATE TABLE domain_event_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type varchar(100) NOT NULL,
  entity_id varchar(100),
  branch_id uuid REFERENCES branches(id),
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error text
);
CREATE INDEX ix_outbox_unpublished ON domain_event_outbox(created_at) WHERE published_at IS NULL;

ALTER TABLE business_documents
  ADD COLUMN party_id uuid,
  ADD COLUMN party_name varchar(180),
  ADD COLUMN title varchar(240),
  ADD COLUMN due_date date,
  ADD COLUMN submitted_at timestamptz,
  ADD COLUMN required_approval_levels text[] NOT NULL DEFAULT '{}',
  ADD COLUMN approvals jsonb NOT NULL DEFAULT '[]';

CREATE INDEX ix_documents_due_status ON business_documents(status,due_date);
CREATE INDEX ix_documents_party_id ON business_documents(party_id);

COMMIT;
