BEGIN;
-- ═══════════════════════════════════════════════════════════════════════════
-- P0 Wave 2 — enforcement keuangan & penjualan (blueprint 2026-07-21).
-- (1) Kurs maker-checker: usulan dipisah dari kurs aktif; creator≠approver.
-- (2) Periode akuntansi per Legal Entity (persiapan multi-entitas; entitas
--     tunggal saat ini di-backfill otomatis).
-- (3) Nomor PO pelanggan unik per pelanggan (dokumen aktif).
-- Seluruh perubahan menjaga data lama + backfill + dapat di-rollback.
-- ═══════════════════════════════════════════════════════════════════════════

-- (1) Usulan kurs — kurs TIDAK lagi langsung ACTIVE oleh pembuatnya.
CREATE TABLE exchange_rate_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_type varchar(20) NOT NULL DEFAULT 'CORPORATE'
    CHECK (rate_type IN ('CORPORATE','TAX','BUY','SELL','CLOSING')),
  from_currency char(3) NOT NULL REFERENCES currencies(code),
  to_currency char(3) NOT NULL REFERENCES currencies(code),
  effective_date date NOT NULL,
  rate numeric(24,10) NOT NULL CHECK (rate > 0),
  source varchar(120) NOT NULL,
  notes text,
  status varchar(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  created_by uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_by uuid REFERENCES app_users(id),
  decided_at timestamptz,
  decision_reason text,
  -- Maker-checker keras di level basis data: pembuat tidak boleh memutuskan.
  CHECK (decided_by IS NULL OR decided_by <> created_by)
);
CREATE INDEX ix_fx_proposals_pending ON exchange_rate_proposals(status, created_at DESC) WHERE status = 'PENDING';

-- (2) Periode akuntansi per Legal Entity.
ALTER TABLE accounting_periods ADD COLUMN legal_entity_id uuid REFERENCES legal_entities(id);
UPDATE accounting_periods SET legal_entity_id = (SELECT id FROM legal_entities ORDER BY active DESC, created_at LIMIT 1);
ALTER TABLE accounting_periods ALTER COLUMN legal_entity_id SET NOT NULL;
ALTER TABLE accounting_periods DROP CONSTRAINT IF EXISTS accounting_periods_period_key;
CREATE UNIQUE INDEX ux_accounting_periods_entity_period ON accounting_periods(legal_entity_id, period);

-- (3) Nomor PO pelanggan unik per pelanggan untuk dokumen aktif.
CREATE UNIQUE INDEX ux_customer_po_number_per_customer
  ON business_documents(party_id, (payload->>'customerPoNumber'))
  WHERE document_type = 'CUSTOMER_PO'
    AND status NOT IN ('CANCELLED','VOID','REJECTED')
    AND payload->>'customerPoNumber' IS NOT NULL;

COMMIT;
