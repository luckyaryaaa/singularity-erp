BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TYPE document_status AS ENUM ('DRAFT','SUBMITTED','WAITING_APPROVAL','APPROVED','IN_PROCESS','COMPLETED','CLOSED','REVISION_REQUIRED','REJECTED','CANCELLED','VOID','ON_HOLD','EXPIRED','OVERDUE','PARTIALLY_COMPLETED','PARTIALLY_PAID','ARCHIVED');

CREATE TABLE branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code varchar(20) UNIQUE NOT NULL,
  name varchar(120) NOT NULL, active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), username varchar(80) UNIQUE NOT NULL,
  password_hash text NOT NULL, display_name varchar(120) NOT NULL, branch_id uuid REFERENCES branches(id),
  active boolean NOT NULL DEFAULT true, failed_login_count integer NOT NULL DEFAULT 0,
  locked_until timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE business_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_number varchar(80) UNIQUE NOT NULL,
  document_type varchar(50) NOT NULL, branch_id uuid NOT NULL REFERENCES branches(id), work_location_id uuid,
  status document_status NOT NULL DEFAULT 'DRAFT', version integer NOT NULL DEFAULT 1,
  amount numeric(20,2) NOT NULL DEFAULT 0 CHECK (amount >= 0), payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid NOT NULL REFERENCES app_users(id),
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid NOT NULL REFERENCES app_users(id),
  approved_at timestamptz, approved_by uuid REFERENCES app_users(id), cancelled_at timestamptz,
  cancelled_by uuid REFERENCES app_users(id), voided_at timestamptz, voided_by uuid REFERENCES app_users(id),
  is_archived boolean NOT NULL DEFAULT false
);
CREATE INDEX ix_documents_branch_status_updated ON business_documents(branch_id,status,updated_at DESC);
CREATE INDEX ix_documents_type_status ON business_documents(document_type,status);
CREATE INDEX ix_documents_payload_gin ON business_documents USING gin(payload);

CREATE TABLE idempotency_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES app_users(id),
  operation varchar(80) NOT NULL, idempotency_key varchar(120) NOT NULL, request_hash varchar(64) NOT NULL,
  response_status integer NOT NULL, response_body jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL, UNIQUE(user_id,operation,idempotency_key)
);
CREATE TABLE audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY, occurred_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES app_users(id), action varchar(40) NOT NULL, module varchar(50) NOT NULL,
  entity_type varchar(50) NOT NULL, entity_id uuid, document_number varchar(80), old_value jsonb,
  new_value jsonb, reason text, request_id uuid NOT NULL, session_id uuid, ip inet, branch_id uuid,
  PRIMARY KEY(id,occurred_at)
) PARTITION BY RANGE (occurred_at);
CREATE TABLE audit_logs_2026 PARTITION OF audit_logs FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE INDEX ix_audit_2026_entity ON audit_logs_2026(entity_type,entity_id,occurred_at DESC);

CREATE TABLE file_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), original_filename text NOT NULL, stored_filename text UNIQUE NOT NULL,
  storage_path text NOT NULL, mime_type varchar(120) NOT NULL, size_bytes bigint NOT NULL CHECK(size_bytes > 0),
  checksum_sha256 varchar(64) NOT NULL, uploaded_by uuid NOT NULL REFERENCES app_users(id), uploaded_at timestamptz NOT NULL DEFAULT now(),
  related_module varchar(50) NOT NULL, related_document_id uuid, access_level varchar(30) NOT NULL DEFAULT 'PRIVATE', retention_policy varchar(50)
);

-- Update documents with WHERE id=:id AND version=:expected_version; zero rows means HTTP 409.
COMMIT;
