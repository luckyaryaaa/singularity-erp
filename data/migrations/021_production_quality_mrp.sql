BEGIN;
-- ═══════════════════════════════════════════════════════════════════════════
-- Sprint 12 (R019) — Production, MRP & Quality:
--   1. work_order_operations : routing/operasi per WO (rate work center di-
--      snapshot saat planning — biaya historis tidak berubah saat master naik)
--   2. work_order_time_logs  : catatan jam kerja append-only (labor/machine)
--   3. work_order_materials  : rencana material hasil ledakan BOM + reservasi
--   4. qc_inspections        : QC formal incoming/in-process/final + NCR/CAPA;
--      gagal QC pada lot → lot otomatis dikarantina (integrasi Sprint 11)
--   5. mrp_suggestions       : hasil MRP run → dapat dikonversi jadi PR
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE work_order_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES business_documents(id) ON DELETE RESTRICT,
  op_no integer NOT NULL,
  name varchar(160) NOT NULL,
  work_center_id uuid NOT NULL REFERENCES work_centers(id),
  hourly_rate_snapshot numeric(20,2) NOT NULL DEFAULT 0,  -- rate saat planning
  planned_hours numeric(8,2) NOT NULL DEFAULT 0 CHECK (planned_hours >= 0),
  status varchar(15) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','IN_PROGRESS','DONE')),
  started_at timestamptz, finished_at timestamptz,
  UNIQUE(work_order_id, op_no)
);
CREATE INDEX ix_wo_operations_wo ON work_order_operations(work_order_id);

-- Jam kerja dicatat append-only; jam aktual operasi = SUM(log). Tidak ada
-- edit/hapus log oleh role aplikasi — koreksi = log negatif ber-alasan.
CREATE TABLE work_order_time_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  operation_id uuid NOT NULL REFERENCES work_order_operations(id) ON DELETE RESTRICT,
  hours numeric(8,2) NOT NULL CHECK (hours <> 0),
  note text,
  logged_by uuid NOT NULL REFERENCES app_users(id),
  logged_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_wo_time_logs_op ON work_order_time_logs(operation_id);
REVOKE UPDATE, DELETE ON work_order_time_logs FROM mat_erp_app;

CREATE TABLE work_order_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES business_documents(id) ON DELETE RESTRICT,
  line_no integer NOT NULL,
  product_id uuid NOT NULL REFERENCES products(id),
  bom_line_id uuid REFERENCES bom_lines(id),
  planned_qty numeric(16,4) NOT NULL CHECK (planned_qty > 0),  -- termasuk scrap%
  reserved_qty numeric(16,4) NOT NULL DEFAULT 0 CHECK (reserved_qty >= 0),
  issued_qty numeric(16,4) NOT NULL DEFAULT 0 CHECK (issued_qty >= 0),
  uom varchar(20),
  unit_cost_snapshot numeric(20,2) NOT NULL DEFAULT 0,          -- HPP saat planning
  UNIQUE(work_order_id, line_no)
);
CREATE INDEX ix_wo_materials_wo ON work_order_materials(work_order_id);
CREATE INDEX ix_wo_materials_product ON work_order_materials(product_id);

-- QC formal. Satu baris = satu inspeksi (bisa per lot). failed>0 pada lot →
-- lot dikarantina; baris ini sekaligus berperan sebagai NCR ringkas dengan
-- root cause + tindakan korektif (CAPA).
CREATE TABLE qc_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ncr_number varchar(40) UNIQUE,                       -- terisi hanya bila gagal
  qc_document_id uuid NOT NULL REFERENCES business_documents(id) ON DELETE RESTRICT,
  subject_document_id uuid REFERENCES business_documents(id),   -- GR/WO/DO yang diperiksa
  inspection_type varchar(15) NOT NULL CHECK (inspection_type IN ('INCOMING','IN_PROCESS','FINAL')),
  lot_id uuid REFERENCES stock_lots(id),
  product_id uuid REFERENCES products(id),
  sampled_qty numeric(16,4) NOT NULL DEFAULT 0 CHECK (sampled_qty >= 0),
  passed_qty numeric(16,4) NOT NULL DEFAULT 0 CHECK (passed_qty >= 0),
  failed_qty numeric(16,4) NOT NULL DEFAULT 0 CHECK (failed_qty >= 0),
  result varchar(10) NOT NULL CHECK (result IN ('PASS','FAIL','PARTIAL')),
  defect_code varchar(60),
  root_cause text,
  corrective_action text,
  inspected_by uuid NOT NULL REFERENCES app_users(id),
  inspected_at timestamptz NOT NULL DEFAULT now(),
  CHECK (passed_qty + failed_qty <= sampled_qty)
);
CREATE INDEX ix_qc_inspections_qcdoc ON qc_inspections(qc_document_id);
CREATE INDEX ix_qc_inspections_subject ON qc_inspections(subject_document_id);
CREATE INDEX ix_qc_inspections_lot ON qc_inspections(lot_id);

CREATE TABLE mrp_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES products(id),
  demand_qty numeric(16,4) NOT NULL DEFAULT 0,
  on_hand numeric(16,4) NOT NULL DEFAULT 0,
  reserved numeric(16,4) NOT NULL DEFAULT 0,
  on_order numeric(16,4) NOT NULL DEFAULT 0,          -- PO terbuka
  min_qty numeric(16,4) NOT NULL DEFAULT 0,
  suggested_qty numeric(16,4) NOT NULL CHECK (suggested_qty > 0),
  source text,                                         -- ringkasan pemicu (WO/min-stock)
  status varchar(15) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CONVERTED','DISMISSED')),
  converted_document_id uuid REFERENCES business_documents(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES app_users(id)
);
CREATE INDEX ix_mrp_suggestions_run ON mrp_suggestions(run_id);
CREATE INDEX ix_mrp_suggestions_status ON mrp_suggestions(status) WHERE status='OPEN';

COMMIT;
