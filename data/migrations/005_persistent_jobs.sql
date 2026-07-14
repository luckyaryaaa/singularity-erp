BEGIN;
ALTER TABLE background_jobs
  ADD COLUMN label varchar(160),
  ADD COLUMN attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),
  ADD COLUMN max_attempts integer NOT NULL DEFAULT 3 CHECK(max_attempts BETWEEN 1 AND 10),
  ADD COLUMN available_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN lease_until timestamptz,
  ADD COLUMN worker_id varchar(120),
  ADD COLUMN heartbeat_at timestamptz;
CREATE INDEX ix_jobs_claim ON background_jobs(priority,available_at,created_at)
  WHERE status='QUEUED';
CREATE INDEX ix_jobs_lease ON background_jobs(lease_until) WHERE status='PROCESSING';
COMMIT;
