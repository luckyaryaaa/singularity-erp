BEGIN;
-- ═══════════════════════════════════════════════════════════════════════════
-- Sprint 14 (R021) — HR completion:
--   1. work_shifts + employee_rosters : shift configuration-driven (§35 —
--      jam standar lembur payroll TIDAK lagi hardcode 8 jam; NORMAL default
--      = 8 jam efektif menjaga parity angka lama)
--   2. work_calendar + hr_calendar_config : hari libur & aturan akhir pekan
--   3. attendance_corrections : koreksi absensi maker-checker (snapshot lama
--      immutable; pemohon ≠ pemutus sampai CHECK database)
--   4. leave_policies + leave_accrual_entries : akrual cuti bulanan
--      configuration-driven, idempoten per karyawan per periode
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE work_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(20) NOT NULL UNIQUE,
  name varchar(120) NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,                          -- boleh < start (lintas hari)
  break_minutes integer NOT NULL DEFAULT 60 CHECK (break_minutes >= 0),
  is_default boolean NOT NULL DEFAULT false,       -- dipakai bila tanpa roster
  active boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX ux_work_shifts_default ON work_shifts((1)) WHERE is_default AND active;
INSERT INTO work_shifts(code,name,start_time,end_time,break_minutes,is_default) VALUES
 ('NORMAL','Jam kerja normal','08:00','17:00',60,true),    -- 8 jam efektif (parity)
 ('PAGI','Shift pagi','07:00','16:00',60,false),
 ('SIANG','Shift siang','14:00','23:00',60,false),
 ('MALAM','Shift malam (lintas hari)','22:00','07:00',60,false);

CREATE TABLE employee_rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id),
  work_date date NOT NULL,
  shift_id uuid NOT NULL REFERENCES work_shifts(id),
  assigned_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, work_date)
);
CREATE INDEX ix_employee_rosters_date ON employee_rosters(work_date);

-- Hari libur (branch NULL = nasional/global) + aturan akhir pekan.
CREATE TABLE work_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date date NOT NULL,
  name varchar(160) NOT NULL,
  branch_id uuid REFERENCES branches(id),
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES app_users(id)
);
CREATE UNIQUE INDEX ux_work_calendar_scope ON work_calendar(holiday_date, COALESCE(branch_id,'00000000-0000-0000-0000-000000000000')) WHERE active;

CREATE TABLE hr_calendar_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekend_days smallint[] NOT NULL DEFAULT '{0,6}',  -- 0=Minggu, 6=Sabtu
  active boolean NOT NULL DEFAULT true
);
INSERT INTO hr_calendar_config DEFAULT VALUES;

-- Koreksi absensi ber-workflow: nilai lama dibekukan, pemohon ≠ pemutus.
CREATE TABLE attendance_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id),
  work_date date NOT NULL,
  old_value jsonb NOT NULL DEFAULT '{}',
  proposed jsonb NOT NULL,                          -- {checkIn,checkOut,status,notes}
  reason text NOT NULL,
  status varchar(15) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  requested_by uuid NOT NULL REFERENCES app_users(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_by uuid REFERENCES app_users(id),
  decided_at timestamptz,
  decide_reason text,
  CHECK (decided_by IS NULL OR decided_by <> requested_by)
);
CREATE UNIQUE INDEX ux_attendance_corrections_pending ON attendance_corrections(employee_id, work_date) WHERE status='PENDING';
CREATE INDEX ix_attendance_corrections_status ON attendance_corrections(status) WHERE status='PENDING';

-- Kebijakan cuti effective-dated + jejak akrual append-only.
CREATE TABLE leave_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(20) NOT NULL,
  name varchar(120) NOT NULL,
  days_per_year numeric(5,2) NOT NULL CHECK (days_per_year >= 0),
  accrue_monthly boolean NOT NULL DEFAULT true,
  min_service_months integer NOT NULL DEFAULT 12 CHECK (min_service_months >= 0),
  effective_from date NOT NULL DEFAULT make_date(EXTRACT(YEAR FROM current_date)::int,1,1),
  effective_until date,
  active boolean NOT NULL DEFAULT true,
  UNIQUE(code, effective_from)
);
INSERT INTO leave_policies(code,name,days_per_year,accrue_monthly,min_service_months) VALUES
 ('ANNUAL','Cuti tahunan',12,true,12);

CREATE TABLE leave_accrual_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id),
  period varchar(7) NOT NULL CHECK (period ~ '^\d{4}-\d{2}$'),
  days numeric(5,2) NOT NULL CHECK (days > 0),
  policy_snapshot jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, period)
);
REVOKE UPDATE, DELETE ON leave_accrual_entries FROM mat_erp_app;

COMMIT;
