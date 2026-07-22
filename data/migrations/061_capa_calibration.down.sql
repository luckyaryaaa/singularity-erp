BEGIN;
-- Rollback 061 — temuan mutu kembali tanpa siklus, alat ukur kembali tanpa kalibrasi.
ALTER TABLE qc_inspections DROP COLUMN IF EXISTS instrument_id;
DROP TABLE IF EXISTS instrument_calibrations;
DROP TABLE IF EXISTS measuring_instruments;
DROP TABLE IF EXISTS capa_cases;
COMMIT;
