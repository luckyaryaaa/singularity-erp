BEGIN;

-- Sprint 16 (R023) — semantic KPI, materialized summary, saved view, dan
-- laporan terjadwal. Nilai keuangan berasal dari jurnal double-entry;
-- dokumen operasional dan QC hanya menjadi sumber KPI non-GL.
CREATE TABLE reporting_refresh_runs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  status varchar(12) NOT NULL CHECK (status IN ('RUNNING','SUCCEEDED','FAILED')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  row_count integer,
  detail varchar(500)
);

CREATE MATERIALIZED VIEW mv_executive_monthly_kpis AS
WITH gl AS (
  SELECT d.branch_id,
    date_trunc('month',CASE
      WHEN d.payload->>'period' ~ '^\d{4}-\d{2}$' THEN to_date(d.payload->>'period','YYYY-MM')::timestamp
      ELSE d.created_at
    END)::date period_start,
    COALESCE(SUM(CASE WHEN a.category='REVENUE' THEN jl.credit-jl.debit ELSE 0 END),0)::numeric(20,2) revenue,
    COALESCE(SUM(CASE WHEN a.category='COGS' THEN jl.debit-jl.credit ELSE 0 END),0)::numeric(20,2) cogs,
    COALESCE(SUM(CASE WHEN a.category='EXPENSE' THEN jl.debit-jl.credit ELSE 0 END),0)::numeric(20,2) operating_expense,
    COALESCE(SUM(CASE WHEN a.code='1100' THEN jl.debit-jl.credit ELSE 0 END),0)::numeric(20,2) cash_movement
  FROM journal_lines jl
  JOIN chart_of_accounts a ON a.id=jl.account_id
  JOIN business_documents d ON d.id=jl.journal_document_id
  WHERE d.status NOT IN ('DRAFT','REJECTED','CANCELLED','VOID')
  GROUP BY d.branch_id,2
), docs AS (
  SELECT d.branch_id,date_trunc('month',d.created_at)::date period_start,
    COALESCE(SUM(d.functional_amount) FILTER (WHERE d.document_type='SALES_ORDER' AND d.status NOT IN ('DRAFT','REJECTED','CANCELLED','VOID')),0)::numeric(20,2) order_intake,
    COALESCE(SUM(d.functional_amount) FILTER (WHERE d.document_type='INVOICE' AND d.status NOT IN ('DRAFT','REJECTED','CANCELLED','VOID')),0)::numeric(20,2) invoice_value,
    COALESCE(SUM(d.functional_amount) FILTER (WHERE d.document_type='CUSTOMER_PAYMENT' AND d.status NOT IN ('DRAFT','REJECTED','CANCELLED','VOID')),0)::numeric(20,2) collections,
    COALESCE(SUM(d.functional_amount) FILTER (WHERE d.document_type='SUPPLIER_INVOICE' AND d.status NOT IN ('DRAFT','REJECTED','CANCELLED','VOID')),0)::numeric(20,2) procurement_spend,
    COUNT(*) FILTER (WHERE d.document_type='WORK_ORDER' AND d.status IN ('COMPLETED','CLOSED'))::int work_orders_completed,
    COUNT(*) FILTER (WHERE d.document_type='DELIVERY' AND d.status IN ('COMPLETED','CLOSED'))::int deliveries_completed,
    COUNT(*) FILTER (WHERE d.document_type='DELIVERY' AND d.status IN ('COMPLETED','CLOSED') AND d.due_date IS NOT NULL AND d.updated_at::date<=d.due_date)::int deliveries_on_time
  FROM business_documents d
  GROUP BY d.branch_id,2
), quality AS (
  SELECT d.branch_id,date_trunc('month',q.inspected_at)::date period_start,
    COALESCE(SUM(q.passed_qty),0)::numeric(20,4) qc_passed_qty,
    COALESCE(SUM(q.failed_qty),0)::numeric(20,4) qc_failed_qty,
    COUNT(*) FILTER (WHERE q.result IN ('FAIL','PARTIAL'))::int quality_failures
  FROM qc_inspections q JOIN business_documents d ON d.id=q.qc_document_id
  GROUP BY d.branch_id,2
), keys AS (
  SELECT branch_id,period_start FROM gl UNION
  SELECT branch_id,period_start FROM docs UNION
  SELECT branch_id,period_start FROM quality
)
SELECT k.branch_id,k.period_start,
  COALESCE(g.revenue,0)::numeric(20,2) revenue,
  COALESCE(g.cogs,0)::numeric(20,2) cogs,
  COALESCE(g.operating_expense,0)::numeric(20,2) operating_expense,
  (COALESCE(g.revenue,0)-COALESCE(g.cogs,0))::numeric(20,2) gross_margin,
  (COALESCE(g.revenue,0)-COALESCE(g.cogs,0)-COALESCE(g.operating_expense,0))::numeric(20,2) operating_income,
  COALESCE(g.cash_movement,0)::numeric(20,2) cash_movement,
  COALESCE(d.order_intake,0)::numeric(20,2) order_intake,
  COALESCE(d.invoice_value,0)::numeric(20,2) invoice_value,
  COALESCE(d.collections,0)::numeric(20,2) collections,
  COALESCE(d.procurement_spend,0)::numeric(20,2) procurement_spend,
  COALESCE(d.work_orders_completed,0)::int work_orders_completed,
  COALESCE(d.deliveries_completed,0)::int deliveries_completed,
  COALESCE(d.deliveries_on_time,0)::int deliveries_on_time,
  COALESCE(q.qc_passed_qty,0)::numeric(20,4) qc_passed_qty,
  COALESCE(q.qc_failed_qty,0)::numeric(20,4) qc_failed_qty,
  COALESCE(q.quality_failures,0)::int quality_failures
FROM keys k
LEFT JOIN gl g USING(branch_id,period_start)
LEFT JOIN docs d USING(branch_id,period_start)
LEFT JOIN quality q USING(branch_id,period_start)
WITH NO DATA;

CREATE UNIQUE INDEX ux_mv_executive_monthly_kpis
  ON mv_executive_monthly_kpis(branch_id,period_start);

CREATE OR REPLACE FUNCTION refresh_executive_reporting()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp AS $$
DECLARE run_id bigint; rows_count integer;
BEGIN
  INSERT INTO reporting_refresh_runs(status) VALUES('RUNNING') RETURNING id INTO run_id;
  REFRESH MATERIALIZED VIEW mv_executive_monthly_kpis;
  SELECT count(*)::int INTO rows_count FROM mv_executive_monthly_kpis;
  UPDATE reporting_refresh_runs SET status='SUCCEEDED',finished_at=now(),row_count=rows_count WHERE id=run_id;
  RETURN rows_count;
EXCEPTION WHEN OTHERS THEN
  UPDATE reporting_refresh_runs SET status='FAILED',finished_at=now(),detail=left(SQLERRM,500) WHERE id=run_id;
  RAISE;
END $$;

CREATE TABLE report_saved_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_key varchar(60) NOT NULL,
  name varchar(100) NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(created_by,report_key,name)
);

CREATE TABLE report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL,
  report_key varchar(60) NOT NULL,
  format varchar(8) NOT NULL DEFAULT 'XLSX' CHECK(format IN ('XLSX','PDF')),
  frequency varchar(10) NOT NULL CHECK(frequency IN ('DAILY','WEEKLY','MONTHLY')),
  branch_id uuid REFERENCES branches(id),
  filters jsonb NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  next_run_at timestamptz NOT NULL,
  last_enqueued_at timestamptz,
  last_job_id uuid REFERENCES background_jobs(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_by uuid NOT NULL REFERENCES app_users(id),
  updated_by uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_report_schedules_due ON report_schedules(next_run_at)
  WHERE enabled;
CREATE INDEX ix_report_schedules_owner ON report_schedules(created_by,updated_at DESC);

GRANT SELECT ON mv_executive_monthly_kpis TO mat_erp_app;
GRANT SELECT ON reporting_refresh_runs TO mat_erp_app;
GRANT SELECT,INSERT,UPDATE,DELETE ON report_saved_filters TO mat_erp_app;
GRANT SELECT,INSERT,UPDATE ON report_schedules TO mat_erp_app;
GRANT EXECUTE ON FUNCTION refresh_executive_reporting() TO mat_erp_app;
REVOKE INSERT,UPDATE,DELETE,TRUNCATE ON reporting_refresh_runs FROM mat_erp_app;
REVOKE DELETE,TRUNCATE ON report_schedules FROM mat_erp_app;

SELECT refresh_executive_reporting();

COMMIT;
