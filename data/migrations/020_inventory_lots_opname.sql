BEGIN;
-- ═══════════════════════════════════════════════════════════════════════════
-- Sprint 11 (R018) — Inventory enterprise:
--   1. stock_lots: lot/serial/heat-number traceability (mill certificate baja)
--   2. stock_lot_movements: jejak mutasi lot append-only
--   3. stock_opname_lines: baris hitung fisik; header = business_documents
--      tipe STOCK_OPNAME (numbering + approval + SoD dari mesin dokumen)
--   4. Selisih opname dijurnal via posting profile (GAIN/LOSS) — bukan hardcode
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Lot stok ──────────────────────────────────────────────────────────────
-- Satu lot = satu batch penerimaan (per baris GR). Heat number & nomor
-- sertifikat pabrik (MTC) melekat pada lot — wajib untuk traceability baja.
CREATE TABLE stock_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_number varchar(80) NOT NULL UNIQUE,          -- {GR}/L{line} atau {ADJ}/A{n}
  product_id uuid NOT NULL REFERENCES products(id),
  warehouse_id uuid NOT NULL REFERENCES branches(id),
  heat_number varchar(80),                         -- nomor heat mill (traceability)
  mill_cert_no varchar(120),                       -- nomor mill test certificate
  serial_number varchar(120),                      -- item serialized (opsional)
  supplier_id uuid REFERENCES suppliers(id),
  source_document_id uuid REFERENCES business_documents(id),
  parent_lot_id uuid REFERENCES stock_lots(id),    -- lineage transfer/split
  received_at timestamptz NOT NULL DEFAULT now(),
  qty_received numeric(16,4) NOT NULL CHECK (qty_received > 0),
  qty_on_hand numeric(16,4) NOT NULL CHECK (qty_on_hand >= 0),
  uom varchar(20),
  unit_cost numeric(20,2) NOT NULL DEFAULT 0,
  status varchar(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','BLOCKED','QUARANTINE','CONSUMED')),
  block_reason text,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Pemilihan FIFO: lot aktif bersaldo, urut waktu terima.
CREATE INDEX ix_stock_lots_fifo ON stock_lots(product_id, warehouse_id, received_at)
  WHERE status = 'ACTIVE' AND qty_on_hand > 0;
CREATE INDEX ix_stock_lots_heat ON stock_lots(heat_number) WHERE heat_number IS NOT NULL;
CREATE INDEX ix_stock_lots_source ON stock_lots(source_document_id);
CREATE INDEX ix_stock_lots_parent ON stock_lots(parent_lot_id) WHERE parent_lot_id IS NOT NULL;

-- ── 2. Mutasi lot (append-only) ──────────────────────────────────────────────
CREATE TABLE stock_lot_movements (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lot_id uuid NOT NULL REFERENCES stock_lots(id) ON DELETE RESTRICT,
  document_id uuid REFERENCES business_documents(id),
  movement_type varchar(20) NOT NULL CHECK (movement_type IN
    ('RECEIPT','ISSUE','TRANSFER_IN','TRANSFER_OUT','ADJUST_IN','ADJUST_OUT','BLOCK','RELEASE')),
  qty numeric(16,4) NOT NULL DEFAULT 0,
  from_warehouse_id uuid REFERENCES branches(id),
  to_warehouse_id uuid REFERENCES branches(id),
  memo text,
  created_by uuid REFERENCES app_users(id),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_stock_lot_movements_lot ON stock_lot_movements(lot_id, occurred_at DESC);
CREATE INDEX ix_stock_lot_movements_doc ON stock_lot_movements(document_id);
-- Append-only untuk role aplikasi (pola sama dengan audit_logs).
REVOKE UPDATE, DELETE ON stock_lot_movements FROM mat_erp_app;

-- ── 3. Baris stock opname ────────────────────────────────────────────────────
-- Header adalah business_documents (STOCK_OPNAME): DRAFT → hitung →
-- WAITING_APPROVAL → APPROVED (checker ≠ maker via SoD) → penyesuaian diposting.
CREATE TABLE stock_opname_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES business_documents(id) ON DELETE RESTRICT,
  line_no integer NOT NULL,
  product_id uuid NOT NULL REFERENCES products(id),
  lot_id uuid REFERENCES stock_lots(id),           -- NULL = saldo tanpa lot (legacy)
  system_qty numeric(16,4) NOT NULL,               -- snapshot saat sesi dibuat
  counted_qty numeric(16,4),                       -- NULL = belum dihitung
  unit_cost numeric(20,2) NOT NULL DEFAULT 0,
  note text,
  counted_by uuid REFERENCES app_users(id),
  counted_at timestamptz,
  UNIQUE(document_id, line_no)
);
CREATE INDEX ix_stock_opname_lines_doc ON stock_opname_lines(document_id);

-- ── 4. Posting selisih opname via profile (configuration-driven) ────────────
ALTER TABLE posting_profile_legs DROP CONSTRAINT posting_profile_legs_amount_source_check;
ALTER TABLE posting_profile_legs ADD CONSTRAINT posting_profile_legs_amount_source_check
  CHECK (amount_source IN ('AMOUNT','NET','TAX','BPJS_COMPANY','BPJS_EMPLOYEE','GROSS','DEDUCTION','GAIN','LOSS'));

INSERT INTO chart_of_accounts(code,name,normal_side,category) VALUES
 ('4250','Pendapatan Selisih Persediaan','C','REVENUE'),
 ('6150','Beban Selisih Persediaan','D','EXPENSE')
ON CONFLICT(code) DO NOTHING;

DO $$
DECLARE p uuid;
BEGIN
  INSERT INTO posting_profiles(code,transaction_type,description)
  VALUES ('OPNAME-DEFAULT','STOCK_OPNAME','Selisih stock opname: lebih = pendapatan, kurang = beban')
  RETURNING id INTO p;
  INSERT INTO posting_profile_legs(profile_id,leg_no,side,account_code,amount_source,memo_suffix) VALUES
   (p,1,'D','1300','GAIN','selisih lebih'),
   (p,2,'C','4250','GAIN','selisih lebih'),
   (p,3,'D','6150','LOSS','selisih kurang'),
   (p,4,'C','1300','LOSS','selisih kurang');
END $$;

COMMIT;
