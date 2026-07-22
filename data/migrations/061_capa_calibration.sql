BEGIN;
-- 061 — CAPA dan kalibrasi alat ukur.
--
-- NCR selama ini hanya sebuah NOMOR pada qc_inspections, ditemani dua kolom
-- teks bebas (root_cause, corrective_action) yang boleh dibiarkan kosong
-- selamanya. Tidak ada penanggung jawab, tenggat, verifikasi efektivitas,
-- maupun penutupan. Temuan mutu yang tidak wajib ditutup bukan sistem mutu —
-- itu hanya catatan.
--
-- Kalibrasi alat ukur tidak ada sama sekali (nol referensi di seluruh source).
-- Untuk fabrikasi baja ini bukan pelengkap: hasil inspeksi yang diukur dengan
-- alat kedaluwarsa tidak dapat dipertanggungjawabkan, dan itu temuan audit
-- ISO 9001 §7.1.5 yang berdiri sendiri.

CREATE TABLE capa_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number varchar(40) NOT NULL UNIQUE,
  inspection_id uuid REFERENCES qc_inspections(id) ON DELETE RESTRICT,
  branch_id uuid NOT NULL REFERENCES branches(id),
  source varchar(20) NOT NULL DEFAULT 'NCR'
    CHECK (source IN ('NCR','AUDIT','COMPLAINT','INTERNAL')),
  severity varchar(10) NOT NULL DEFAULT 'MAJOR'
    CHECK (severity IN ('MINOR','MAJOR','CRITICAL')),
  title varchar(200) NOT NULL,
  description text NOT NULL,
  -- Tahapan mengikuti siklus mutu: temuan → analisis akar masalah → tindakan →
  -- verifikasi efektivitas → tutup. Tidak boleh melompat ke CLOSED.
  status varchar(20) NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN','ANALYSIS','ACTION','VERIFICATION','CLOSED','CANCELLED')),
  containment_action text,
  root_cause text,
  corrective_action text,
  preventive_action text,
  owner_id uuid REFERENCES app_users(id),
  due_date date,
  effectiveness_verified boolean,
  effectiveness_note text,
  raised_by uuid NOT NULL REFERENCES app_users(id),
  raised_at timestamptz NOT NULL DEFAULT now(),
  closed_by uuid REFERENCES app_users(id),
  closed_at timestamptz,
  closure_reason text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Yang menerbitkan temuan tidak boleh menutupnya sendiri.
  CONSTRAINT capa_closer_not_raiser CHECK (closed_by IS NULL OR closed_by <> raised_by),
  -- Penutupan wajib membawa akar masalah, tindakan, dan hasil verifikasi.
  CONSTRAINT capa_closure_complete CHECK (
    status <> 'CLOSED' OR (
      root_cause IS NOT NULL AND corrective_action IS NOT NULL
      AND effectiveness_verified IS NOT NULL AND closed_by IS NOT NULL AND closed_at IS NOT NULL
    )
  )
);
CREATE INDEX ix_capa_open ON capa_cases(branch_id, status) WHERE status NOT IN ('CLOSED','CANCELLED');
CREATE INDEX ix_capa_inspection ON capa_cases(inspection_id);
CREATE INDEX ix_capa_due ON capa_cases(due_date) WHERE status NOT IN ('CLOSED','CANCELLED');

CREATE TABLE measuring_instruments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(40) NOT NULL UNIQUE,
  name varchar(160) NOT NULL,
  instrument_type varchar(30) NOT NULL DEFAULT 'CALIPER'
    CHECK (instrument_type IN ('CALIPER','MICROMETER','GAUGE','SCALE','TORQUE_WRENCH','THICKNESS_METER','HARDNESS_TESTER','OTHER')),
  branch_id uuid NOT NULL REFERENCES branches(id),
  serial_number varchar(80),
  calibration_interval_days integer NOT NULL DEFAULT 365 CHECK (calibration_interval_days > 0),
  last_calibrated_on date,
  calibration_due_date date,
  status varchar(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','OUT_OF_SERVICE','RETIRED')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES app_users(id)
);
CREATE INDEX ix_instruments_due ON measuring_instruments(calibration_due_date) WHERE active;

CREATE TABLE instrument_calibrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id uuid NOT NULL REFERENCES measuring_instruments(id) ON DELETE RESTRICT,
  calibrated_on date NOT NULL,
  next_due_date date NOT NULL,
  result varchar(15) NOT NULL CHECK (result IN ('PASS','ADJUSTED','FAIL')),
  certificate_number varchar(80),
  performed_by varchar(160),
  notes text,
  recorded_by uuid NOT NULL REFERENCES app_users(id),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CHECK (next_due_date > calibrated_on)
);
CREATE INDEX ix_calibrations_instrument ON instrument_calibrations(instrument_id, calibrated_on DESC);

-- Inspeksi mencatat alat yang dipakai; tanpa ini hasil ukur tidak dapat
-- ditelusuri ke alat maupun sertifikat kalibrasinya.
ALTER TABLE qc_inspections ADD COLUMN instrument_id uuid REFERENCES measuring_instruments(id);

COMMIT;
