BEGIN;
-- 047 — P1-2: Change Request engine untuk perubahan master yang sensitif.
--
-- Sebelumnya SETIAP kolom master yang boleh diedit langsung tersimpan begitu
-- disubmit. Batas kredit pelanggan, NPWP, gaji pokok, dan harga jual dapat
-- diubah satu orang tanpa jejak persetujuan siapa pun — hanya audit trail
-- setelah fakta. Untuk data yang berdampak uang dan pajak, itu terlalu longgar.
--
-- Mesin ini memakai pola maker-checker yang SAMA dengan usulan kurs (migrasi
-- 040): pengusul tidak boleh menjadi pemutus. Bukan approval engine kedua —
-- perubahan master bukan dokumen bisnis dan tidak melewati siklus dokumen.

CREATE TABLE change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type varchar(40) NOT NULL,          -- customers / suppliers / products / employees
  entity_id uuid NOT NULL,
  entity_label varchar(200),                 -- kode+nama saat diajukan, untuk antrean yang terbaca
  changes jsonb NOT NULL,                    -- { kolom: { from, to } } — sebelum & sesudah
  reason text NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','APPROVED','REJECTED','SUPERSEDED')),
  requested_by uuid NOT NULL REFERENCES app_users(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_by uuid REFERENCES app_users(id),
  decided_at timestamptz,
  decision_reason text,
  branch_id uuid REFERENCES branches(id),
  -- Segregation of duties: pengusul tidak boleh memutuskan usulannya sendiri.
  CONSTRAINT change_requests_sod CHECK (decided_by IS NULL OR decided_by <> requested_by),
  CONSTRAINT change_requests_decided CHECK (
    (status = 'PENDING' AND decided_by IS NULL AND decided_at IS NULL)
    OR (status <> 'PENDING' AND (status = 'SUPERSEDED' OR (decided_by IS NOT NULL AND decided_at IS NOT NULL)))
  ),
  CONSTRAINT change_requests_changes_object CHECK (jsonb_typeof(changes) = 'object' AND changes <> '{}'::jsonb)
);

CREATE INDEX ix_change_requests_pending ON change_requests(entity_type, entity_id) WHERE status = 'PENDING';
CREATE INDEX ix_change_requests_queue ON change_requests(status, requested_at DESC);

COMMIT;
