BEGIN;
-- 075 — Warehouse execution task engine (WMS minimal task flow).
--
-- Sampai 058 gudang punya bin dan penempatan lot, tetapi eksekusinya masih
-- implisit: siapa yang harus menaruh lot X ke rak Y, kapan jatuh temponya, dan
-- apakah sudah dikerjakan — tidak pernah menjadi objek yang dapat ditugaskan,
-- diklaim, dan diaudit. Blueprint §9.8 menuntut alur receiving → put-away →
-- pick → pack → ship sebagai TUGAS bertipe, bukan sekadar mutasi diam-diam.
--
-- Engine ini berdiri DI ATAS model lot/bin yang sudah ada. Ledger stok tidak
-- diubah: migrasi Branch-as-Warehouse kanonik (memindahkan stock_lots dari
-- branches ke org_warehouses) tetap pekerjaan tersendiri. Tugas PUTAWAY
-- menyelesaikan dirinya dengan memanggil penempatan lot yang sudah ada, jadi
-- tidak ada jalur mutasi stok kedua yang bisa menyimpang dari kenyataan.

CREATE TABLE warehouse_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type varchar(16) NOT NULL
    CHECK (task_type IN ('RECEIVE','PUTAWAY','PICK','PACK','SHIP','COUNT')),
  status varchar(16) NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN','CLAIMED','IN_PROGRESS','DONE','CANCELLED')),
  priority varchar(8) NOT NULL DEFAULT 'NORMAL'
    CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT')),
  -- Cakupan tugas = cabang (model gudang saat ini). RLS memakai kolom ini.
  branch_id uuid NOT NULL REFERENCES branches(id),
  product_id uuid REFERENCES products(id),
  lot_id uuid REFERENCES stock_lots(id),
  from_bin_id uuid REFERENCES warehouse_bins(id),
  to_bin_id uuid REFERENCES warehouse_bins(id),
  qty numeric(16,4) CHECK (qty IS NULL OR qty > 0),
  -- Asal tugas: dokumen sumber (GR/SO/WO/opname) supaya eksekusi gudang selalu
  -- tertaut ke perintah bisnisnya, bukan mengambang.
  source_module varchar(30),
  source_document_id uuid REFERENCES business_documents(id),
  reference text,
  instructions text,
  due_at timestamptz,
  assigned_to uuid REFERENCES app_users(id),
  claimed_by uuid REFERENCES app_users(id),
  claimed_at timestamptz,
  started_at timestamptz,
  completed_by uuid REFERENCES app_users(id),
  completed_at timestamptz,
  completion_note text,
  cancelled_by uuid REFERENCES app_users(id),
  cancelled_at timestamptz,
  cancel_reason text,
  -- Optimistic lock: mutasi konkuren tidak boleh saling menimpa diam-diam.
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES app_users(id),
  -- Tugas tertutup wajib punya jejak siapa dan kapan — bukan status kosong.
  CONSTRAINT warehouse_tasks_done_stamp CHECK (
    status <> 'DONE' OR (completed_at IS NOT NULL AND completed_by IS NOT NULL)),
  CONSTRAINT warehouse_tasks_cancel_stamp CHECK (
    status <> 'CANCELLED' OR (cancelled_at IS NOT NULL AND cancel_reason IS NOT NULL)),
  -- Tugas yang tidak bermakna tidak boleh tersimpan: put-away butuh lot dan rak
  -- tujuan; pick butuh lot. Dijaga di database, bukan sekadar di aplikasi.
  CONSTRAINT warehouse_tasks_putaway_target CHECK (
    task_type <> 'PUTAWAY' OR (lot_id IS NOT NULL AND to_bin_id IS NOT NULL)),
  CONSTRAINT warehouse_tasks_pick_lot CHECK (
    task_type <> 'PICK' OR lot_id IS NOT NULL)
);

-- Papan kerja gudang: buka tugas per cabang, urut prioritas dan jatuh tempo.
CREATE INDEX ix_warehouse_tasks_board ON warehouse_tasks(branch_id, status, priority, due_at);
-- "Tugas saya" yang masih berjalan.
CREATE INDEX ix_warehouse_tasks_assignee ON warehouse_tasks(assigned_to, status)
  WHERE status IN ('OPEN','CLAIMED','IN_PROGRESS');
-- Telusur balik dari dokumen sumber ke tugas eksekusinya.
CREATE INDEX ix_warehouse_tasks_source ON warehouse_tasks(source_document_id)
  WHERE source_document_id IS NOT NULL;

-- RLS sebagai pertahanan kedua: isolasi cabang tidak boleh hanya WHERE di JS.
ALTER TABLE warehouse_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY branch_scope ON warehouse_tasks
  USING (app_branch_visible(branch_id))
  WITH CHECK (app_branch_visible(branch_id));

COMMIT;
