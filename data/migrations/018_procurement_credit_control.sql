-- 018_procurement_credit_control.sql — Wave 2 (R016 credit control §12.5,
-- R017 source-to-pay §13). RFQ + perbandingan supplier, three-way match
-- ber-toleransi, payment proposal, dan kontrol kredit pelanggan.
BEGIN;

-- ── Kontrol kredit pelanggan (§9.3/§12.5) ────────────────────────────────────
-- Kolom credit_hold sudah ditambahkan migrasi 013. Lengkapi batas & konfigurasi.
ALTER TABLE customers
  ADD COLUMN credit_limit_amount numeric(20,2) NOT NULL DEFAULT 0,
  ADD COLUMN credit_term_days integer NOT NULL DEFAULT 30,
  ADD COLUMN credit_hold_reason text,
  ADD COLUMN credit_reviewed_at timestamptz,
  ADD COLUMN credit_reviewed_by uuid REFERENCES app_users(id);

-- Override kredit (per dokumen) — jejak persetujuan finance atas pelampauan limit.
CREATE TABLE credit_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id),
  document_id uuid REFERENCES business_documents(id),
  requested_amount numeric(20,2) NOT NULL,
  exposure_before numeric(20,2) NOT NULL,
  credit_limit numeric(20,2) NOT NULL,
  reason text NOT NULL,
  approved_by uuid NOT NULL REFERENCES app_users(id),
  approved_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days'
);
CREATE INDEX ix_credit_override_doc ON credit_overrides(document_id);

-- ── RFQ & perbandingan supplier (§13.2) ──────────────────────────────────────
-- Header RFQ memakai business_documents (type RFQ). Kuota per supplier di sini.
CREATE TABLE rfq_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_document_id uuid NOT NULL REFERENCES business_documents(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  currency char(3) NOT NULL DEFAULT 'IDR',
  price_total numeric(20,2) NOT NULL DEFAULT 0 CHECK (price_total >= 0),
  tax_total numeric(20,2) NOT NULL DEFAULT 0,
  freight_total numeric(20,2) NOT NULL DEFAULT 0,
  lead_time_days integer,
  payment_terms varchar(60),
  moq_note varchar(120),
  quality_score smallint CHECK (quality_score BETWEEN 1 AND 5),
  -- Landed cost jadi dasar perbandingan objektif (§13.2).
  landed_cost numeric(20,2) GENERATED ALWAYS AS (price_total + tax_total + freight_total) STORED,
  is_selected boolean NOT NULL DEFAULT false,
  selection_reason text,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES app_users(id),
  UNIQUE(rfq_document_id, supplier_id)
);
CREATE INDEX ix_rfq_quotes_rfq ON rfq_quotes(rfq_document_id);
-- Hanya satu kuota terpilih per RFQ.
CREATE UNIQUE INDEX ux_rfq_selected ON rfq_quotes(rfq_document_id) WHERE is_selected;

-- ── Konfigurasi toleransi three-way match (§13.5) ────────────────────────────
CREATE TABLE match_tolerance_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_entity_id uuid REFERENCES legal_entities(id),
  qty_tolerance_pct numeric(5,2) NOT NULL DEFAULT 5,
  price_tolerance_pct numeric(5,2) NOT NULL DEFAULT 2,
  amount_tolerance_abs numeric(20,2) NOT NULL DEFAULT 50000,
  effective_from date NOT NULL DEFAULT current_date,
  active boolean NOT NULL DEFAULT true
);
INSERT INTO match_tolerance_config(qty_tolerance_pct, price_tolerance_pct, amount_tolerance_abs)
  VALUES (5, 2, 50000);

-- Hasil three-way match tersimpan (PO vs GR vs Supplier Invoice).
CREATE TABLE three_way_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_invoice_id uuid NOT NULL REFERENCES business_documents(id),
  purchase_order_id uuid REFERENCES business_documents(id),
  goods_receipt_id uuid REFERENCES business_documents(id),
  po_amount numeric(20,2), gr_amount numeric(20,2), invoice_amount numeric(20,2),
  qty_variance_pct numeric(8,3), price_variance_pct numeric(8,3), amount_variance numeric(20,2),
  result varchar(15) NOT NULL CHECK (result IN ('MATCHED','EXCEPTION','OVERRIDDEN')),
  exceptions jsonb NOT NULL DEFAULT '[]',
  override_reason text, override_by uuid REFERENCES app_users(id),
  evaluated_at timestamptz NOT NULL DEFAULT now(), evaluated_by uuid REFERENCES app_users(id),
  UNIQUE(supplier_invoice_id)
);

-- ── Payment proposal batch (§13.6/§17.2) ─────────────────────────────────────
-- Header proposal memakai business_documents (type PAYMENT_PROPOSAL). Baris di sini.
CREATE TABLE payment_proposal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_document_id uuid NOT NULL REFERENCES business_documents(id) ON DELETE CASCADE,
  supplier_invoice_id uuid NOT NULL REFERENCES business_documents(id),
  supplier_id uuid REFERENCES suppliers(id),
  amount numeric(20,2) NOT NULL CHECK (amount > 0),
  supplier_bank_id uuid REFERENCES supplier_bank_accounts(id),
  payment_hold boolean NOT NULL DEFAULT false,
  hold_reason text,
  UNIQUE(proposal_document_id, supplier_invoice_id)
);
CREATE INDEX ix_pp_lines_proposal ON payment_proposal_lines(proposal_document_id);

COMMIT;
