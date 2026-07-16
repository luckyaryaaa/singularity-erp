BEGIN;
-- ═══════════════════════════════════════════════════════════════════════════
-- Sprint 9 (R016) — Order-to-Cash completion:
--   1. quotation_revisions : snapshot immutable tiap revisi penawaran
--   2. dunning_policies    : jenjang penagihan configuration-driven (§35 —
--      hari & aksi bukan hardcode) + dunning_notices per invoice per level
--   3. products.warranty_months + RMA (retur & klaim garansi):
--      akun 4110 Retur Penjualan + posting profile RMA-DEFAULT
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Revisi penawaran ber-versi ────────────────────────────────────────────
-- Setiap kali penawaran direvisi, keadaan SEBELUM revisi dibekukan di sini.
-- Nomor dokumen tetap; revisionNo berjalan di payload dokumen aktif.
CREATE TABLE quotation_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES business_documents(id) ON DELETE RESTRICT,
  revision_no integer NOT NULL CHECK (revision_no >= 1),
  title text NOT NULL,
  amount numeric(20,2) NOT NULL DEFAULT 0,
  status_at_revision varchar(30) NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  lines jsonb NOT NULL DEFAULT '[]',              -- salinan document_lines saat itu
  reason text NOT NULL,
  revised_by uuid NOT NULL REFERENCES app_users(id),
  revised_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(quotation_id, revision_no)
);
CREATE INDEX ix_quotation_revisions_doc ON quotation_revisions(quotation_id, revision_no DESC);
-- Histori revisi immutable untuk role aplikasi.
REVOKE UPDATE, DELETE ON quotation_revisions FROM mat_erp_app;

-- ── 2. Dunning / collection ──────────────────────────────────────────────────
CREATE TABLE dunning_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level integer NOT NULL CHECK (level BETWEEN 1 AND 9),
  min_days_overdue integer NOT NULL CHECK (min_days_overdue >= 0),
  name varchar(80) NOT NULL,
  action varchar(30) NOT NULL DEFAULT 'REMINDER'
    CHECK (action IN ('REMINDER','WARNING','FINAL_NOTICE','CREDIT_HOLD')),
  active boolean NOT NULL DEFAULT true,
  effective_from date NOT NULL DEFAULT make_date(EXTRACT(YEAR FROM current_date)::int,1,1),
  effective_until date,
  UNIQUE(level, effective_from)
);
INSERT INTO dunning_policies(level,min_days_overdue,name,action) VALUES
 (1, 7,'Pengingat pertama','REMINDER'),
 (2,14,'Peringatan kedua','WARNING'),
 (3,30,'Peringatan terakhir + rekomendasi hold','CREDIT_HOLD');

CREATE TABLE dunning_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_number varchar(40) NOT NULL UNIQUE,
  invoice_document_id uuid NOT NULL REFERENCES business_documents(id) ON DELETE RESTRICT,
  customer_id uuid REFERENCES customers(id),
  level integer NOT NULL,
  days_overdue integer NOT NULL,
  outstanding numeric(20,2) NOT NULL,
  policy_snapshot jsonb NOT NULL DEFAULT '{}',    -- kebijakan saat terbit (immutable)
  status varchar(15) NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED','RESOLVED','ESCALATED')),
  resolved_reason text,
  resolved_by uuid REFERENCES app_users(id),
  resolved_at timestamptz,
  created_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(invoice_document_id, level)              -- idempoten per invoice per jenjang
);
CREATE INDEX ix_dunning_notices_open ON dunning_notices(status, level) WHERE status='ISSUED';
CREATE INDEX ix_dunning_notices_invoice ON dunning_notices(invoice_document_id);

-- ── 3. RMA & garansi ─────────────────────────────────────────────────────────
ALTER TABLE products ADD COLUMN warranty_months integer NOT NULL DEFAULT 0
  CHECK (warranty_months >= 0);

INSERT INTO chart_of_accounts(code,name,normal_side,category) VALUES
 ('4110','Retur Penjualan','D','REVENUE')
ON CONFLICT(code) DO NOTHING;

DO $$
DECLARE p uuid;
BEGIN
  INSERT INTO posting_profiles(code,transaction_type,description)
  VALUES ('RMA-DEFAULT','RMA','Retur penjualan: kontra pendapatan terhadap piutang')
  RETURNING id INTO p;
  INSERT INTO posting_profile_legs(profile_id,leg_no,side,account_code,amount_source,memo_suffix) VALUES
   (p,1,'D','4110','AMOUNT','retur penjualan'),
   (p,2,'C','1200','AMOUNT','pengurang piutang');
END $$;

COMMIT;
