BEGIN;

-- Finance End-to-End Closure v0.39.0
-- 1. Persist immutable, versioned reconciliation evidence.
-- 2. Persist the exact checklist snapshot used to close a period.
-- 3. Complete the coding-block policy metadata used by the controller UI.

ALTER TABLE account_dimension_policy
  ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  ADD COLUMN updated_by uuid REFERENCES app_users(id);

-- Draft/review snapshots produced before canonical hashing remain historical,
-- but cannot continue into the v0.39 sign-off chain.
UPDATE financial_reports
   SET status = 'SUPERSEDED',
       decision_reason = COALESCE(decision_reason, 'Superseded by v0.39 canonical evidence workflow')
 WHERE status IN ('PREPARED','REVIEWED');

UPDATE transaction_dimension_policies
   SET profit_center_required = true,
       updated_at = now()
 WHERE document_type IN (
   'INVOICE','CUSTOMER_PAYMENT','SUPPLIER_INVOICE','SUPPLIER_PAYMENT',
   'EXPENSE','JOURNAL','PAYROLL_RUN','TAX_DOCUMENT','PAYMENT_PROPOSAL'
 );

CREATE TABLE finance_reconciliation_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_entity_id uuid NOT NULL REFERENCES legal_entities(id),
  period char(7) NOT NULL CHECK (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  reconciliation_type varchar(20) NOT NULL
    CHECK (reconciliation_type IN ('BANK','INVENTORY','PAYROLL','TAX','AR','AP')),
  version integer NOT NULL CHECK (version > 0),
  status varchar(20) NOT NULL DEFAULT 'PREPARED'
    CHECK (status IN ('PREPARED','APPROVED','REJECTED','SUPERSEDED')),
  result_status varchar(20) NOT NULL
    CHECK (result_status IN ('MATCHED','EXCEPTION','NOT_RUN')),
  difference numeric(20,2) NOT NULL DEFAULT 0,
  snapshot jsonb NOT NULL,
  snapshot_sha256 char(64) NOT NULL,
  prepared_by uuid NOT NULL REFERENCES app_users(id),
  prepared_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid REFERENCES app_users(id),
  approved_at timestamptz,
  decision_reason text,
  UNIQUE (legal_entity_id, period, reconciliation_type, version),
  CHECK (approved_by IS NULL OR approved_by <> prepared_by)
);
CREATE INDEX ix_finance_reconciliation_period
  ON finance_reconciliation_evidence(legal_entity_id, period, reconciliation_type, status);

ALTER TABLE finance_reconciliation_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY finance_reconciliation_entity_isolation
  ON finance_reconciliation_evidence
  USING (app_legal_entity_visible(legal_entity_id))
  WITH CHECK (app_legal_entity_visible(legal_entity_id));

CREATE TABLE accounting_period_close_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_entity_id uuid NOT NULL REFERENCES legal_entities(id),
  period char(7) NOT NULL CHECK (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  status varchar(20) NOT NULL DEFAULT 'CLOSED'
    CHECK (status IN ('CLOSED','REOPENED')),
  evidence jsonb NOT NULL,
  evidence_sha256 char(64) NOT NULL,
  close_reason text NOT NULL,
  closed_by uuid NOT NULL REFERENCES app_users(id),
  closed_at timestamptz NOT NULL DEFAULT now(),
  reopened_by uuid REFERENCES app_users(id),
  reopened_at timestamptz,
  reopen_reason text
);
CREATE INDEX ix_accounting_period_close_runs
  ON accounting_period_close_runs(legal_entity_id, period, closed_at DESC);

ALTER TABLE accounting_period_close_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY accounting_period_close_entity_isolation
  ON accounting_period_close_runs
  USING (app_legal_entity_visible(legal_entity_id))
  WITH CHECK (app_legal_entity_visible(legal_entity_id));

-- Evidence and its digest are immutable after insertion. Reopen only changes the
-- lifecycle columns, retaining the original close package for audit.
CREATE FUNCTION protect_finance_evidence() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.snapshot IS DISTINCT FROM OLD.snapshot
     OR NEW.snapshot_sha256 IS DISTINCT FROM OLD.snapshot_sha256
     OR NEW.version IS DISTINCT FROM OLD.version
     OR NEW.legal_entity_id IS DISTINCT FROM OLD.legal_entity_id
     OR NEW.period IS DISTINCT FROM OLD.period
     OR NEW.reconciliation_type IS DISTINCT FROM OLD.reconciliation_type
     OR NEW.prepared_by IS DISTINCT FROM OLD.prepared_by
     OR NEW.prepared_at IS DISTINCT FROM OLD.prepared_at THEN
    RAISE EXCEPTION 'finance reconciliation evidence is immutable'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_protect_finance_reconciliation_evidence
BEFORE UPDATE ON finance_reconciliation_evidence
FOR EACH ROW EXECUTE FUNCTION protect_finance_evidence();

CREATE FUNCTION protect_period_close_evidence() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.evidence IS DISTINCT FROM OLD.evidence
     OR NEW.evidence_sha256 IS DISTINCT FROM OLD.evidence_sha256
     OR NEW.legal_entity_id IS DISTINCT FROM OLD.legal_entity_id
     OR NEW.period IS DISTINCT FROM OLD.period
     OR NEW.closed_by IS DISTINCT FROM OLD.closed_by
     OR NEW.closed_at IS DISTINCT FROM OLD.closed_at THEN
    RAISE EXCEPTION 'accounting period close evidence is immutable'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_protect_period_close_evidence
BEFORE UPDATE ON accounting_period_close_runs
FOR EACH ROW EXECUTE FUNCTION protect_period_close_evidence();

COMMIT;
