BEGIN;
-- 067 — Wave D.1: coding block dimensi pada journal_lines + kebijakan per akun.
--
-- Sebelum ini setiap baris jurnal hanya membawa akun + debit/kredit; tidak ada
-- cost center / profit center / project, sehingga analitik keuangan enterprise
-- (P&L per pusat biaya/laba, biaya per proyek) mustahil dihitung dari buku besar.
--
-- Kolom ditambahkan NULLABLE agar seluruh posting existing tetap sah. Penegakan
-- "wajib" bertahap: mode SOFT (default) hanya memvalidasi dimensi yang dikirim;
-- mode HARD memaksa dimensi wajib. Controller mem-flip ke HARD lewat
-- MAT_JOURNAL_DIMENSION_ENFORCEMENT setelah master di-backfill.

ALTER TABLE journal_lines
  ADD COLUMN cost_center_id   uuid REFERENCES cost_centers(id),
  ADD COLUMN profit_center_id uuid REFERENCES profit_centers(id),
  ADD COLUMN project_wbs_id   uuid REFERENCES project_wbs(id);

CREATE INDEX ix_journal_lines_cost_center   ON journal_lines(cost_center_id)   WHERE cost_center_id   IS NOT NULL;
CREATE INDEX ix_journal_lines_profit_center ON journal_lines(profit_center_id) WHERE profit_center_id IS NOT NULL;
CREATE INDEX ix_journal_lines_project       ON journal_lines(project_wbs_id)   WHERE project_wbs_id   IS NOT NULL;

-- Kebijakan dimensi per kategori akun (data-driven; dapat disetel Controller
-- TANPA migrasi). P&L wajib cost + profit center; neraca tidak wajib; project
-- selalu opsional pada baseline ini.
CREATE TABLE account_dimension_policy (
  category               varchar(40) PRIMARY KEY,
  requires_cost_center   boolean NOT NULL DEFAULT false,
  requires_profit_center boolean NOT NULL DEFAULT false,
  requires_project       boolean NOT NULL DEFAULT false,
  updated_at             timestamptz NOT NULL DEFAULT now()
);

INSERT INTO account_dimension_policy(category, requires_cost_center, requires_profit_center) VALUES
  ('REVENUE',   true,  true),
  ('EXPENSE',   true,  true),
  ('COGS',      true,  true),
  ('ASSET',     false, false),
  ('LIABILITY', false, false),
  ('EQUITY',    false, false)
ON CONFLICT (category) DO NOTHING;

COMMIT;
