BEGIN;

-- Sprint 17 / R024 — inventory movement partition maintenance. Runtime hanya
-- boleh mengeksekusi fungsi terkontrol; CREATE TABLE tetap milik migration
-- role melalui SECURITY DEFINER.
CREATE OR REPLACE FUNCTION inventory_partition_maintenance(months_ahead integer DEFAULT 2)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE
  offset_month integer;
  from_date date;
  until_date date;
  partition_name text;
  created text[] := ARRAY[]::text[];
  default_rows bigint;
BEGIN
  IF months_ahead < 1 OR months_ahead > 24 THEN
    RAISE EXCEPTION 'months_ahead harus 1..24';
  END IF;
  LOCK TABLE inventory_movements IN SHARE UPDATE EXCLUSIVE MODE;
  FOR offset_month IN 0..months_ahead LOOP
    from_date := (date_trunc('month',current_date) + make_interval(months=>offset_month))::date;
    until_date := (from_date + interval '1 month')::date;
    partition_name := format('inventory_movements_%s',to_char(from_date,'YYYY_MM'));
    IF to_regclass('public.'||partition_name) IS NULL THEN
      EXECUTE format('SELECT count(*) FROM ONLY inventory_movements_default WHERE occurred_at >= %L AND occurred_at < %L',from_date,until_date) INTO default_rows;
      IF default_rows > 0 THEN
        RAISE EXCEPTION 'Default partition memiliki % baris untuk %. Jalankan prosedur relokasi terkontrol.',default_rows,partition_name;
      END IF;
      EXECUTE format('CREATE TABLE %I PARTITION OF inventory_movements FOR VALUES FROM (%L) TO (%L)',partition_name,from_date,until_date);
      created := array_append(created,partition_name);
    END IF;
  END LOOP;
  RETURN created;
END $$;

REVOKE ALL ON FUNCTION inventory_partition_maintenance(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION inventory_partition_maintenance(integer) TO mat_erp_app;

COMMIT;
