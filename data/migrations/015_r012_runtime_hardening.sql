BEGIN;

-- R012: session touch tidak lagi menulis/mengunci setiap request dan perubahan
-- konteks perangkat dapat ditinjau tanpa menyimpan credential/token mentah.
ALTER TABLE user_sessions
  ADD COLUMN last_ip inet,
  ADD COLUMN last_device varchar(160),
  ADD COLUMN risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN risk_updated_at timestamptz,
  ADD COLUMN previous_csrf_token_hash char(64),
  ADD COLUMN previous_csrf_valid_until timestamptz;
UPDATE user_sessions SET last_ip=ip, last_device=device WHERE last_ip IS NULL;

-- R012: lifecycle job eksplisit. PROCESSING/COMPLETED dipertahankan hanya agar
-- histori lama tetap terbaca; seluruh job baru memakai CLAIMED/RUNNING/SUCCEEDED.
ALTER TABLE background_jobs DROP CONSTRAINT background_jobs_status_check;
ALTER TABLE background_jobs
  ADD CONSTRAINT background_jobs_status_check CHECK(status IN
    ('QUEUED','CLAIMED','RUNNING','SUCCEEDED','FAILED','CANCELLED','DEAD_LETTER','PROCESSING','COMPLETED')),
  ADD COLUMN execution_key varchar(180),
  ADD COLUMN timeout_seconds integer NOT NULL DEFAULT 300 CHECK(timeout_seconds BETWEEN 10 AND 86400),
  ADD COLUMN deadline_at timestamptz,
  ADD COLUMN cancel_requested_at timestamptz,
  ADD COLUMN cancel_reason varchar(500),
  ADD COLUMN policy_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN artifact_retention_days integer NOT NULL DEFAULT 30 CHECK(artifact_retention_days BETWEEN 1 AND 3650);
CREATE UNIQUE INDEX ux_jobs_execution_key ON background_jobs(requested_by,job_type,execution_key)
  WHERE execution_key IS NOT NULL AND status NOT IN('FAILED','CANCELLED','DEAD_LETTER');
CREATE INDEX ix_jobs_runtime_lease ON background_jobs(lease_until)
  WHERE status IN('CLAIMED','RUNNING');

-- R012: unggahan selalu masuk quarantine; CLEAN hanya boleh diberikan scanner.
ALTER TABLE file_metadata DROP CONSTRAINT file_metadata_scan_status_check;
UPDATE file_metadata SET scan_status='PENDING_SCAN' WHERE scan_status='PENDING';
ALTER TABLE file_metadata
  ADD CONSTRAINT file_metadata_scan_status_check CHECK(scan_status IN
    ('PENDING_SCAN','QUARANTINED','SCANNING','CLEAN','INFECTED','REJECTED','DELETED')),
  ADD COLUMN scan_engine varchar(80),
  ADD COLUMN scan_detail varchar(500),
  ADD COLUMN scanned_at timestamptz,
  ADD COLUMN confidentiality varchar(20) NOT NULL DEFAULT 'INTERNAL'
    CHECK(confidentiality IN('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED')),
  ADD COLUMN branch_id uuid REFERENCES branches(id),
  ADD COLUMN legal_entity_id uuid REFERENCES legal_entities(id);
CREATE INDEX ix_files_scan_queue ON file_metadata(scan_status,uploaded_at)
  WHERE NOT is_deleted AND scan_status IN('PENDING_SCAN','QUARANTINED','SCANNING');

COMMIT;
