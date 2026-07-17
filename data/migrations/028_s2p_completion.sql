BEGIN;
-- ═══════════════════════════════════════════════════════════════════════════
-- Sprint 10 (R017) — Source-to-Pay completion:
--   1. procurement_budgets : anggaran belanja per periode/cabang (§13 flow
--      PR → Budget Check); enforce saat submit PR/PO, override finance teraudit
--   2. rfq_quote_lines     : kuota supplier multi-baris (perbandingan per item)
--   3. po_change_orders    : amendemen PO ber-versi maker-checker (SoD di DB)
--   4. payment_allocations : kolom pembalikan (payment reversal) — histori
--      alokasi tidak pernah dihapus, hanya ditandai reversed
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE procurement_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period varchar(7) NOT NULL CHECK (period ~ '^\d{4}-\d{2}$'),
  branch_id uuid REFERENCES branches(id),          -- NULL = berlaku semua cabang
  amount numeric(20,2) NOT NULL CHECK (amount >= 0),
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_procurement_budgets_scope ON procurement_budgets(period, COALESCE(branch_id,'00000000-0000-0000-0000-000000000000')) WHERE active;

-- Kuota supplier per baris — perbandingan objektif per item, bukan hanya total.
CREATE TABLE rfq_quote_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES rfq_quotes(id) ON DELETE CASCADE,
  line_no integer NOT NULL,
  description varchar(300) NOT NULL,
  qty numeric(16,4) NOT NULL CHECK (qty > 0),
  uom varchar(20),
  unit_price numeric(20,2) NOT NULL CHECK (unit_price >= 0),
  line_total numeric(20,2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  UNIQUE(quote_id, line_no)
);
CREATE INDEX ix_rfq_quote_lines_quote ON rfq_quote_lines(quote_id);

-- Amendemen PO ber-versi. SoD ditegakkan sampai level database:
-- pemohon tidak boleh menjadi pemutus.
CREATE TABLE po_change_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_document_id uuid NOT NULL REFERENCES business_documents(id) ON DELETE RESTRICT,
  change_no integer NOT NULL,
  reason text NOT NULL,
  old_amount numeric(20,2) NOT NULL,
  new_amount numeric(20,2) NOT NULL CHECK (new_amount >= 0),
  old_lines jsonb NOT NULL DEFAULT '[]',
  new_lines jsonb NOT NULL DEFAULT '[]',
  status varchar(15) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  requested_by uuid NOT NULL REFERENCES app_users(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_by uuid REFERENCES app_users(id),
  decided_at timestamptz,
  decide_reason text,
  UNIQUE(po_document_id, change_no),
  CHECK (decided_by IS NULL OR decided_by <> requested_by)
);
CREATE INDEX ix_po_change_orders_po ON po_change_orders(po_document_id);
-- Hanya satu amendemen PENDING per PO.
CREATE UNIQUE INDEX ux_po_change_pending ON po_change_orders(po_document_id) WHERE status='PENDING';

-- Pembalikan pembayaran: alokasi tidak dihapus, ditandai. Semua perhitungan
-- outstanding wajib memfilter reversed_at IS NULL.
ALTER TABLE payment_allocations
  ADD COLUMN reversed_at timestamptz,
  ADD COLUMN reversed_by uuid REFERENCES app_users(id),
  ADD COLUMN reversal_reason text;

COMMIT;
