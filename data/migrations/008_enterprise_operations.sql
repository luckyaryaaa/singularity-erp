BEGIN;
CREATE TABLE document_relations (
  parent_document_id uuid NOT NULL REFERENCES business_documents(id) ON DELETE RESTRICT,
  child_document_id uuid NOT NULL REFERENCES business_documents(id) ON DELETE RESTRICT,
  relation_type varchar(40) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),created_by uuid NOT NULL REFERENCES app_users(id),
  PRIMARY KEY(parent_document_id,child_document_id,relation_type),
  CHECK(parent_document_id<>child_document_id)
);
CREATE INDEX ix_document_relations_child ON document_relations(child_document_id,relation_type);

CREATE TABLE system_settings (
  setting_key varchar(120) PRIMARY KEY,value jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now(),updated_by uuid REFERENCES app_users(id)
);

ALTER TABLE file_metadata ADD COLUMN scan_status varchar(20) NOT NULL DEFAULT 'PENDING' CHECK(scan_status IN('PENDING','CLEAN','REJECTED')),
  ADD COLUMN is_deleted boolean NOT NULL DEFAULT false,ADD COLUMN deleted_at timestamptz,ADD COLUMN deleted_by uuid REFERENCES app_users(id);
CREATE INDEX ix_file_related ON file_metadata(related_module,related_document_id,uploaded_at DESC) WHERE NOT is_deleted;

CREATE TABLE generated_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),job_id uuid REFERENCES background_jobs(id) ON DELETE SET NULL,
  requested_by uuid NOT NULL REFERENCES app_users(id),file_name text NOT NULL,mime_type varchar(120) NOT NULL,
  storage_path text UNIQUE NOT NULL,size_bytes bigint NOT NULL CHECK(size_bytes>0),checksum_sha256 char(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz
);

CREATE TABLE notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),notification_id uuid REFERENCES notifications(id) ON DELETE CASCADE,
  channel varchar(20) NOT NULL CHECK(channel IN('IN_APP','EMAIL','WEBHOOK')),destination varchar(240),
  status varchar(20) NOT NULL CHECK(status IN('QUEUED','SENT','FAILED','SKIPPED')),attempts integer NOT NULL DEFAULT 0,
  last_error text,created_at timestamptz NOT NULL DEFAULT now(),sent_at timestamptz
);
CREATE INDEX ix_delivery_queue ON notification_deliveries(status,created_at) WHERE status IN('QUEUED','FAILED');

ALTER TABLE backup_runs ADD COLUMN backup_type varchar(20) NOT NULL DEFAULT 'FULL',ADD COLUMN file_path text,
  ADD COLUMN error text,ADD COLUMN restore_tested_at timestamptz,ADD COLUMN restore_test_detail text;
COMMIT;
