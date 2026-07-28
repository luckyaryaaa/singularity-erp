BEGIN;

-- Retention hanya mengelola data teknis sementara. Dokumen bisnis, jurnal,
-- payroll, inventory movement, dan audit log sengaja tidak tersedia di
-- resource_type maupun fungsi eksekusi.
CREATE TABLE data_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type varchar(48) UNIQUE NOT NULL CHECK(resource_type IN(
    'AUTH_CHALLENGE','IDEMPOTENCY','USER_SESSION','EVENT_OUTBOX',
    'NOTIFICATION_DELIVERY','BACKGROUND_JOB'
  )),
  retention_days integer NOT NULL CHECK(retention_days BETWEEN 1 AND 3650),
  batch_size integer NOT NULL DEFAULT 500 CHECK(batch_size BETWEEN 1 AND 5000),
  status varchar(16) NOT NULL DEFAULT 'ACTIVE' CHECK(status IN('ACTIVE','DISABLED')),
  legal_basis varchar(160) NOT NULL,
  description varchar(500) NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  effective_from timestamptz NOT NULL DEFAULT now(),
  approved_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE data_retention_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type varchar(48) NOT NULL CHECK(resource_type IN(
    'AUTH_CHALLENGE','IDEMPOTENCY','USER_SESSION','EVENT_OUTBOX',
    'NOTIFICATION_DELIVERY','BACKGROUND_JOB'
  )),
  resource_id text NOT NULL CHECK(length(trim(resource_id)) BETWEEN 1 AND 160),
  reason varchar(1000) NOT NULL CHECK(length(trim(reason)) >= 10),
  reference_number varchar(120),
  status varchar(16) NOT NULL DEFAULT 'ACTIVE' CHECK(status IN('ACTIVE','RELEASED')),
  placed_by uuid NOT NULL REFERENCES app_users(id),
  placed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  released_by uuid REFERENCES app_users(id),
  released_at timestamptz,
  release_reason varchar(1000),
  CHECK(expires_at IS NULL OR expires_at > placed_at),
  CHECK((status='ACTIVE' AND released_by IS NULL AND released_at IS NULL)
    OR (status='RELEASED' AND released_by IS NOT NULL AND released_at IS NOT NULL
      AND length(trim(release_reason)) >= 10))
);
CREATE UNIQUE INDEX ux_retention_hold_active
  ON data_retention_holds(resource_type,resource_id)
  WHERE status='ACTIVE';
CREATE INDEX ix_retention_hold_lookup
  ON data_retention_holds(resource_type,resource_id,status,expires_at);

CREATE TABLE data_retention_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES data_retention_policies(id) ON DELETE RESTRICT,
  preview_id uuid REFERENCES data_retention_runs(id) ON DELETE RESTRICT,
  mode varchar(16) NOT NULL CHECK(mode IN('PREVIEW','EXECUTE')),
  status varchar(16) NOT NULL CHECK(status IN('SUCCEEDED','FAILED')),
  cutoff_at timestamptz NOT NULL,
  candidate_count bigint NOT NULL DEFAULT 0 CHECK(candidate_count >= 0),
  planned_count bigint NOT NULL DEFAULT 0 CHECK(planned_count >= 0),
  affected_count bigint NOT NULL DEFAULT 0 CHECK(affected_count >= 0),
  policy_snapshot jsonb NOT NULL,
  reason varchar(1000),
  idempotency_key varchar(160),
  requested_by uuid NOT NULL REFERENCES app_users(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  CHECK((mode='PREVIEW' AND preview_id IS NULL AND idempotency_key IS NULL
      AND expires_at IS NOT NULL)
    OR (mode='EXECUTE' AND preview_id IS NOT NULL AND idempotency_key IS NOT NULL
      AND expires_at IS NULL AND length(trim(reason)) >= 10))
);
CREATE UNIQUE INDEX ux_retention_execute_idempotency
  ON data_retention_runs(requested_by,idempotency_key)
  WHERE mode='EXECUTE';
CREATE INDEX ix_retention_runs_policy ON data_retention_runs(policy_id,started_at DESC);

INSERT INTO data_retention_policies
  (resource_type,retention_days,batch_size,legal_basis,description)
VALUES
  ('AUTH_CHALLENGE',7,500,'Security lifecycle',
    'Challenge MFA, recovery, dan perubahan kata sandi yang sudah kedaluwarsa.'),
  ('IDEMPOTENCY',7,1000,'Operational reliability',
    'Respons replay idempotency yang sudah melewati masa berlaku.'),
  ('USER_SESSION',90,500,'Security lifecycle',
    'Sesi yang tidak aktif atau berakhir; sesi aktif tidak pernah menjadi kandidat.'),
  ('EVENT_OUTBOX',30,1000,'Integration operations',
    'Event outbox yang sudah berhasil dipublikasikan; event pending tidak pernah dihapus.'),
  ('NOTIFICATION_DELIVERY',90,500,'Communication operations',
    'Riwayat delivery final SENT atau SKIPPED; delivery QUEUED/FAILED dipertahankan.'),
  ('BACKGROUND_JOB',90,500,'Operational support',
    'Job berstatus terminal; job QUEUED/CLAIMED/RUNNING tidak pernah dihapus.');

-- Satu-satunya primitive penghapusan retention. Resource memakai allowlist
-- literal dan SQL statis; caller tidak dapat memasukkan nama tabel/kondisi SQL.
CREATE FUNCTION execute_data_retention(
  p_resource_type varchar,
  p_cutoff_at timestamptz,
  p_limit integer
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public
AS $$
DECLARE
  affected integer := 0;
BEGIN
  IF p_limit < 1 OR p_limit > 5000 THEN
    RAISE EXCEPTION 'retention limit outside safe range';
  END IF;

  IF p_resource_type='AUTH_CHALLENGE' THEN
    WITH candidates AS (
      SELECT t.id FROM public.auth_pending t
      WHERE t.expires_at < p_cutoff_at
        AND NOT EXISTS (
          SELECT 1 FROM public.data_retention_holds h
          WHERE h.resource_type=p_resource_type
            AND h.resource_id IN(t.id::text,'*') AND h.status='ACTIVE'
            AND (h.expires_at IS NULL OR h.expires_at>now())
        )
      ORDER BY t.expires_at,t.id LIMIT p_limit FOR UPDATE SKIP LOCKED
    )
    DELETE FROM public.auth_pending t USING candidates c WHERE t.id=c.id;
  ELSIF p_resource_type='IDEMPOTENCY' THEN
    WITH candidates AS (
      SELECT t.id FROM public.idempotency_records t
      WHERE t.expires_at < p_cutoff_at
        AND NOT EXISTS (
          SELECT 1 FROM public.data_retention_holds h
          WHERE h.resource_type=p_resource_type
            AND h.resource_id IN(t.id::text,'*') AND h.status='ACTIVE'
            AND (h.expires_at IS NULL OR h.expires_at>now())
        )
      ORDER BY t.expires_at,t.id LIMIT p_limit FOR UPDATE SKIP LOCKED
    )
    DELETE FROM public.idempotency_records t USING candidates c WHERE t.id=c.id;
  ELSIF p_resource_type='USER_SESSION' THEN
    WITH candidates AS (
      SELECT t.id FROM public.user_sessions t
      WHERE NOT t.active AND coalesce(t.ended_at,t.expires_at) < p_cutoff_at
        AND NOT EXISTS (
          SELECT 1 FROM public.data_retention_holds h
          WHERE h.resource_type=p_resource_type
            AND h.resource_id IN(t.id::text,'*') AND h.status='ACTIVE'
            AND (h.expires_at IS NULL OR h.expires_at>now())
        )
      ORDER BY coalesce(t.ended_at,t.expires_at),t.id
      LIMIT p_limit FOR UPDATE SKIP LOCKED
    )
    DELETE FROM public.user_sessions t USING candidates c WHERE t.id=c.id;
  ELSIF p_resource_type='EVENT_OUTBOX' THEN
    WITH candidates AS (
      SELECT t.id FROM public.domain_event_outbox t
      WHERE t.published_at IS NOT NULL AND t.published_at < p_cutoff_at
        AND NOT EXISTS (
          SELECT 1 FROM public.data_retention_holds h
          WHERE h.resource_type=p_resource_type
            AND h.resource_id IN(t.id::text,'*') AND h.status='ACTIVE'
            AND (h.expires_at IS NULL OR h.expires_at>now())
        )
      ORDER BY t.published_at,t.id LIMIT p_limit FOR UPDATE SKIP LOCKED
    )
    DELETE FROM public.domain_event_outbox t USING candidates c WHERE t.id=c.id;
  ELSIF p_resource_type='NOTIFICATION_DELIVERY' THEN
    WITH candidates AS (
      SELECT t.id FROM public.notification_deliveries t
      WHERE t.status IN('SENT','SKIPPED')
        AND coalesce(t.sent_at,t.created_at) < p_cutoff_at
        AND NOT EXISTS (
          SELECT 1 FROM public.data_retention_holds h
          WHERE h.resource_type=p_resource_type
            AND h.resource_id IN(t.id::text,'*') AND h.status='ACTIVE'
            AND (h.expires_at IS NULL OR h.expires_at>now())
        )
      ORDER BY coalesce(t.sent_at,t.created_at),t.id
      LIMIT p_limit FOR UPDATE SKIP LOCKED
    )
    DELETE FROM public.notification_deliveries t USING candidates c WHERE t.id=c.id;
  ELSIF p_resource_type='BACKGROUND_JOB' THEN
    WITH candidates AS (
      SELECT t.id FROM public.background_jobs t
      WHERE t.status IN('SUCCEEDED','FAILED','CANCELLED','DEAD_LETTER','COMPLETED')
        AND coalesce(t.finished_at,t.created_at) < p_cutoff_at
        AND NOT EXISTS (
          SELECT 1 FROM public.data_retention_holds h
          WHERE h.resource_type=p_resource_type
            AND h.resource_id IN(t.id::text,'*') AND h.status='ACTIVE'
            AND (h.expires_at IS NULL OR h.expires_at>now())
        )
      ORDER BY coalesce(t.finished_at,t.created_at),t.id
      LIMIT p_limit FOR UPDATE SKIP LOCKED
    )
    DELETE FROM public.background_jobs t USING candidates c WHERE t.id=c.id;
  ELSE
    RAISE EXCEPTION 'retention resource is not allowlisted';
  END IF;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;
REVOKE ALL ON FUNCTION execute_data_retention(varchar,timestamptz,integer) FROM PUBLIC;

COMMIT;
