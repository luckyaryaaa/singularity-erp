BEGIN;
-- 059 — Kontrak/blanket pembelian.
--
-- Sisi penjualan sudah punya kontrak kerangka sejak v0.34 (sales_contracts),
-- tetapi sisi PEMBELIAN tidak punya sama sekali. Setiap Purchase Order berdiri
-- sendiri: harga dinegosiasikan ulang tiap kali, tidak ada komitmen volume yang
-- ditegakkan, dan tidak ada yang mencegah pembelian melampaui pagu kontrak yang
-- sudah disepakati dengan pemasok.
--
-- Struktur sengaja MENCERMIN sales_contracts: nama kolom, status, aturan
-- maker-checker, dan pola release yang sama. Dua konvensi berbeda untuk konsep
-- yang sama hanya akan membingungkan dan melahirkan aturan bisnis kembar.

CREATE TABLE purchase_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number varchar(60) NOT NULL UNIQUE,
  legal_entity_id uuid NOT NULL REFERENCES legal_entities(id),
  branch_id uuid NOT NULL REFERENCES branches(id),
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  title varchar(200) NOT NULL,
  contract_type varchar(30) NOT NULL DEFAULT 'BLANKET'
    CHECK (contract_type IN ('BLANKET','FRAMEWORK','PRICE_AGREEMENT')),
  valid_from date NOT NULL,
  valid_to date NOT NULL,
  currency char(3) NOT NULL DEFAULT 'IDR',
  ceiling_amount numeric(20,2) NOT NULL CHECK (ceiling_amount > 0),
  consumed_amount numeric(20,2) NOT NULL DEFAULT 0 CHECK (consumed_amount >= 0),
  status varchar(25) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','PENDING_APPROVAL','ACTIVE','REJECTED','EXPIRED','CLOSED','CANCELLED')),
  terms jsonb NOT NULL DEFAULT '{}',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES app_users(id),
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid REFERENCES app_users(id),
  decision_reason text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_to >= valid_from),
  CHECK (consumed_amount <= ceiling_amount),
  -- Maker-checker: penyusun kontrak tidak boleh menyetujui kontraknya sendiri.
  CHECK (approved_by IS NULL OR approved_by <> created_by)
);

CREATE TABLE purchase_contract_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES purchase_contracts(id) ON DELETE RESTRICT,
  line_no integer NOT NULL,
  product_id uuid REFERENCES products(id),
  description text NOT NULL,
  committed_qty numeric(16,4),
  released_qty numeric(16,4) NOT NULL DEFAULT 0,
  ceiling_amount numeric(20,2) NOT NULL CHECK (ceiling_amount >= 0),
  released_amount numeric(20,2) NOT NULL DEFAULT 0,
  uom varchar(20),
  unit_price numeric(20,2),
  UNIQUE (contract_id, line_no),
  CHECK (committed_qty IS NULL OR committed_qty > 0),
  CHECK (released_qty >= 0 AND (committed_qty IS NULL OR released_qty <= committed_qty)),
  CHECK (released_amount >= 0 AND released_amount <= ceiling_amount)
);

CREATE TABLE purchase_contract_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES purchase_contracts(id) ON DELETE RESTRICT,
  contract_line_id uuid REFERENCES purchase_contract_lines(id) ON DELETE RESTRICT,
  purchase_order_id uuid NOT NULL REFERENCES business_documents(id) ON DELETE RESTRICT,
  purchase_order_line_id uuid REFERENCES document_lines(id) ON DELETE RESTRICT,
  released_qty numeric(16,4),
  released_amount numeric(20,2) NOT NULL DEFAULT 0,
  released_at timestamptz NOT NULL DEFAULT now(),
  released_by uuid NOT NULL REFERENCES app_users(id),
  -- Satu PO tidak boleh menarik baris kontrak yang sama dua kali.
  UNIQUE (contract_id, purchase_order_id, contract_line_id),
  CHECK (released_qty IS NULL OR released_qty > 0)
);

CREATE INDEX ix_purchase_contracts_supplier ON purchase_contracts(supplier_id, status);
CREATE INDEX ix_purchase_contracts_active ON purchase_contracts(valid_from, valid_to) WHERE status = 'ACTIVE';
CREATE INDEX ix_purchase_contract_lines_contract ON purchase_contract_lines(contract_id);
CREATE INDEX ix_purchase_contract_releases_po ON purchase_contract_releases(purchase_order_id);

ALTER TABLE purchase_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY branch_scope ON purchase_contracts
  USING (app_branch_visible(branch_id)) WITH CHECK (app_branch_visible(branch_id));

COMMIT;
