-- 014_branch_aware_numbering.sql — P0 §4.3: nomor dokumen memuat kode branch.
-- Format v2: {DOC}-{BRANCH}-{MMYY}-{SEQ3}. Nomor lama (v1, tanpa branch) tetap
-- terbaca dan tidak diubah. Sequence tetap atomic per (tipe, branch, periode);
-- void/cancel tidak mengembalikan sequence; nomor tidak dapat diedit.
BEGIN;

CREATE TABLE numbering_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version integer UNIQUE NOT NULL,
  format varchar(80) NOT NULL,
  description text,
  effective_from timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Hanya satu konfigurasi aktif pada satu waktu.
CREATE UNIQUE INDEX ux_numbering_active ON numbering_configurations(active) WHERE active;

INSERT INTO numbering_configurations(version, format, description, active) VALUES
  (1, '{PREFIX}-{MMYY}-{SEQ:3}', 'Format legacy tanpa kode branch — nomor lama tetap valid dan terbaca.', false),
  (2, '{PREFIX}-{BRANCH}-{MMYY}-{SEQ:3}', 'Format branch-aware: menutup tabrakan nomor antarcabang (P0 4.3).', true);

COMMIT;
