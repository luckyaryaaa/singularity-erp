BEGIN;
-- 077 — Unified Work Item engine (§4.4 / §5.2).
--
-- Sampai kini "My Work" hanya AGREGASI read-only dari business_documents,
-- background_jobs, dan notifications — tidak ada objek pekerjaan yang bisa
-- ditugaskan, diklaim, di-SLA-kan, didelegasikan, dan diaudit lintas modul.
-- Membaca notifikasi pun keliru dianggap "menutup pekerjaan". Blueprint menuntut
-- satu Work Item Engine formal: approval, exception, review, correction, dan
-- tugas operasional menjadi entitas bertipe dengan siklus hidup nyata.
--
-- Engine ini generik lintas modul: source_entity_id sengaja TANPA FK karena
-- menunjuk banyak tabel (dokumen, tugas gudang, rekonsiliasi, dst). Isolasi
-- tetap pada cabang (RLS), konsisten dengan seluruh engine eksekusi.

CREATE TABLE work_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type varchar(16) NOT NULL
    CHECK (item_type IN ('APPROVAL','EXCEPTION','REVIEW','CORRECTION','TASK','FOLLOW_UP')),
  title text NOT NULL,
  description text,
  -- Sumber: modul, jenis entitas, dan id-nya (generik, tanpa FK lintas tabel).
  source_module varchar(30),
  source_entity_type varchar(40),
  source_entity_id uuid,
  branch_id uuid NOT NULL REFERENCES branches(id),
  -- Penerima: pengguna spesifik dan/atau peran (pool).
  assignee_user_id uuid REFERENCES app_users(id),
  assignee_role varchar(40),
  priority varchar(8) NOT NULL DEFAULT 'NORMAL'
    CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT')),
  risk varchar(8) NOT NULL DEFAULT 'LOW'
    CHECK (risk IN ('LOW','MEDIUM','HIGH')),
  status varchar(16) NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN','CLAIMED','IN_PROGRESS','RETURNED','ON_HOLD','DONE','CANCELLED')),
  required_action text,
  completion_condition text,
  due_at timestamptz,
  sla_minutes integer CHECK (sla_minutes IS NULL OR sla_minutes > 0),
  claimed_by uuid REFERENCES app_users(id),
  claimed_at timestamptz,
  started_at timestamptz,
  -- Delegasi / substitusi (cuti): pekerjaan tetap ada pemiliknya, tetapi orang
  -- lain diberi wewenang mengerjakannya.
  delegated_to uuid REFERENCES app_users(id),
  delegated_by uuid REFERENCES app_users(id),
  delegated_at timestamptz,
  delegation_reason text,
  on_hold_reason text,
  returned_reason text,
  escalated boolean NOT NULL DEFAULT false,
  escalated_at timestamptz,
  escalated_to uuid REFERENCES app_users(id),
  evidence jsonb,
  completion_note text,
  completed_by uuid REFERENCES app_users(id),
  completed_at timestamptz,
  cancelled_by uuid REFERENCES app_users(id),
  cancelled_at timestamptz,
  cancel_reason text,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES app_users(id),
  -- Item tertutup wajib punya jejak siapa & kapan.
  CONSTRAINT work_items_done_stamp CHECK (
    status <> 'DONE' OR (completed_at IS NOT NULL AND completed_by IS NOT NULL)),
  CONSTRAINT work_items_cancel_stamp CHECK (
    status <> 'CANCELLED' OR (cancelled_at IS NOT NULL AND cancel_reason IS NOT NULL))
);

-- "Tugas saya" (langsung atau lewat peran) yang masih berjalan.
CREATE INDEX ix_work_items_assignee ON work_items(assignee_user_id, status)
  WHERE status IN ('OPEN','CLAIMED','IN_PROGRESS','RETURNED','ON_HOLD');
-- Papan kerja per cabang, urut prioritas dan jatuh tempo.
CREATE INDEX ix_work_items_branch ON work_items(branch_id, status, priority, due_at);
-- Yang didelegasikan kepada saya.
CREATE INDEX ix_work_items_delegate ON work_items(delegated_to, status)
  WHERE delegated_to IS NOT NULL;
-- Telusur balik dari entitas sumber ke work item-nya.
CREATE INDEX ix_work_items_source ON work_items(source_entity_type, source_entity_id)
  WHERE source_entity_id IS NOT NULL;

-- RLS sebagai pertahanan kedua: isolasi cabang tidak boleh hanya WHERE di JS.
ALTER TABLE work_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY branch_scope ON work_items
  USING (app_branch_visible(branch_id))
  WITH CHECK (app_branch_visible(branch_id));

COMMIT;
