-- 011_audit_partition_lifecycle.sql
-- Menutup bom waktu partisi: audit_logs hanya memiliki partisi 2026 tanpa
-- DEFAULT, sehingga seluruh operasi tulis akan gagal mulai 1 Januari 2027.
-- Solusi berlapis:
--   1. pra-buat partisi tahunan 2027–2031 + indeks;
--   2. partisi DEFAULT sebagai jaring pengaman terakhir;
--   3. fungsi maintenance SECURITY DEFINER yang dipanggil worker secara
--      berkala untuk selalu menyediakan partisi tahun berjalan + 1.
BEGIN;

DO $$
DECLARE
  y int;
  part text;
BEGIN
  FOR y IN 2027..2031 LOOP
    part := format('audit_logs_%s', y);
    IF to_regclass(part) IS NULL THEN
      EXECUTE format(
        'CREATE TABLE %I PARTITION OF audit_logs FOR VALUES FROM (%L) TO (%L)',
        part, make_date(y, 1, 1), make_date(y + 1, 1, 1)
      );
      EXECUTE format(
        'CREATE INDEX %I ON %I(entity_type, entity_id, occurred_at DESC)',
        'ix_' || part || '_entity', part
      );
    END IF;
  END LOOP;
END $$;

-- Jaring pengaman: baris di luar rentang partisi bernama tidak boleh
-- menggagalkan transaksi bisnis.
CREATE TABLE IF NOT EXISTS audit_logs_default PARTITION OF audit_logs DEFAULT;
CREATE INDEX IF NOT EXISTS ix_audit_default_entity
  ON audit_logs_default(entity_type, entity_id, occurred_at DESC);

-- Maintenance dipanggil runtime role (least-privilege) via SECURITY DEFINER.
CREATE OR REPLACE FUNCTION audit_partition_maintenance()
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  y int;
  part text;
  created text[] := '{}';
BEGIN
  FOR y IN EXTRACT(YEAR FROM now())::int .. EXTRACT(YEAR FROM now())::int + 1 LOOP
    part := format('audit_logs_%s', y);
    IF to_regclass(part) IS NULL THEN
      EXECUTE format(
        'CREATE TABLE %I PARTITION OF audit_logs FOR VALUES FROM (%L) TO (%L)',
        part, make_date(y, 1, 1), make_date(y + 1, 1, 1)
      );
      EXECUTE format(
        'CREATE INDEX %I ON %I(entity_type, entity_id, occurred_at DESC)',
        'ix_' || part || '_entity', part
      );
      created := created || part;
    END IF;
  END LOOP;
  RETURN created;
END $$;

REVOKE ALL ON FUNCTION audit_partition_maintenance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION audit_partition_maintenance() TO mat_erp_app;

COMMIT;
