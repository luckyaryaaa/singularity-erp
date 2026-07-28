BEGIN;
-- 069 — Wave D.3: laporan keuangan ber-versi dengan alur prepare → review →
-- sign-off. financialStatements() selama ini hanya dihitung langsung; tidak ada
-- snapshot resmi yang bisa ditandatangani dan diaudit. Tabel ini menyimpan
-- snapshot immutable + SHA-256, dengan segregation of duties ditegakkan di
-- database (reviewer != preparer, signer != reviewer) sebagai pertahanan kedua.

CREATE TABLE financial_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_entity_id uuid NOT NULL REFERENCES legal_entities(id),
  period char(7) NOT NULL,                       -- YYYY-MM
  report_type varchar(30) NOT NULL DEFAULT 'PERIOD_STATEMENTS',
  version integer NOT NULL CHECK (version > 0),
  status varchar(20) NOT NULL DEFAULT 'PREPARED'
    CHECK (status IN ('PREPARED','REVIEWED','SIGNED_OFF','REJECTED','SUPERSEDED')),
  snapshot jsonb NOT NULL,
  snapshot_sha256 char(64) NOT NULL,
  net_income numeric(18,2),
  total_assets numeric(18,2),
  balanced boolean NOT NULL DEFAULT false,
  prepared_by uuid NOT NULL REFERENCES app_users(id),
  prepared_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES app_users(id),
  reviewed_at timestamptz,
  signed_off_by uuid REFERENCES app_users(id),
  signed_off_at timestamptz,
  decision_reason text,
  UNIQUE (legal_entity_id, period, version),
  CHECK (reviewed_by IS NULL OR reviewed_by <> prepared_by),
  CHECK (signed_off_by IS NULL OR signed_off_by <> reviewed_by)
);
CREATE INDEX ix_financial_reports_period ON financial_reports(legal_entity_id, period, status);

COMMIT;
