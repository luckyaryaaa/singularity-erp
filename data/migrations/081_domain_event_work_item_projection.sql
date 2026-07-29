BEGIN;
-- 081 — Domain Event → Unified Work Item projection (§4.4 / §4.5).
--
-- Outbox sebelumnya hanya menyiarkan event ke SSE. Event yang membutuhkan
-- tindakan manusia belum menjadi pekerjaan yang bisa dimiliki, di-SLA-kan,
-- diselesaikan, dan diaudit. Kolom berikut memberi kontrak event ber-versi,
-- retry/backoff, dead-letter, serta kunci proyeksi idempoten.

ALTER TABLE domain_event_outbox
  ADD COLUMN event_version smallint NOT NULL DEFAULT 1
    CHECK (event_version > 0),
  ADD COLUMN delivery_status varchar(12) NOT NULL DEFAULT 'PENDING'
    CHECK (delivery_status IN ('PENDING','PUBLISHED','DEAD_LETTER')),
  ADD COLUMN next_attempt_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN dead_lettered_at timestamptz;

UPDATE domain_event_outbox
SET delivery_status = 'PUBLISHED'
WHERE published_at IS NOT NULL;

DROP INDEX IF EXISTS ix_outbox_unpublished;
CREATE INDEX ix_outbox_dispatch
  ON domain_event_outbox(next_attempt_at, created_at, id)
  WHERE delivery_status = 'PENDING' AND published_at IS NULL;
CREATE INDEX ix_outbox_dead_letter
  ON domain_event_outbox(dead_lettered_at DESC)
  WHERE delivery_status = 'DEAD_LETTER';

ALTER TABLE work_items
  ADD COLUMN automation_key varchar(160),
  ADD COLUMN source_event_id uuid REFERENCES domain_event_outbox(id),
  ADD COLUMN source_event_type varchar(100),
  ADD COLUMN auto_managed boolean NOT NULL DEFAULT false;

-- Satu kejadian bisnis hanya boleh memiliki satu pekerjaan aktif/tertutup.
-- source_event_id mencegah replay event yang sama; automation_key mencegah
-- event baru dengan business key yang sama membuat duplikat.
CREATE UNIQUE INDEX ux_work_items_source_event
  ON work_items(source_event_id)
  WHERE source_event_id IS NOT NULL;
CREATE UNIQUE INDEX ux_work_items_automation_key
  ON work_items(automation_key)
  WHERE automation_key IS NOT NULL;

COMMIT;
