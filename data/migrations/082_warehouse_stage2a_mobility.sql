BEGIN;
-- 082 — Canonical Warehouse Stage 2A + WMS Mobility.
--
-- Cutover Stage 2 dilakukan berlapis. Migration ini menjalankan fase
-- INTRODUCE + DUAL-WRITE GUARD:
--   * saldo kompatibilitas, movement, reservation, lot, dan task selalu
--     mempunyai org_warehouse_id yang berada di cabang yang sama;
--   * storage location diturunkan dari bin bila tersedia;
--   * health view memberi bukti rekonsiliasi sebelum read/RLS switch;
--   * handling unit/license plate dan scan session menjadi objek eksekusi
--     tersendiri, bukan teks bebas pada task.

-- ── Canonical dimensions on existing ledgers ─────────────────────────────
ALTER TABLE inventory_balances
  ADD COLUMN org_warehouse_id uuid REFERENCES org_warehouses(id);

UPDATE inventory_balances i
SET org_warehouse_id = w.id
FROM org_warehouses w
WHERE w.branch_id = i.warehouse_id AND w.is_default;

ALTER TABLE inventory_balances
  ALTER COLUMN org_warehouse_id SET NOT NULL;
CREATE INDEX ix_inventory_balance_org_warehouse
  ON inventory_balances(org_warehouse_id, product_id);

CREATE OR REPLACE FUNCTION resolve_inventory_balance_warehouse()
RETURNS trigger AS $$
DECLARE resolved uuid;
BEGIN
  resolved := NEW.org_warehouse_id;
  IF resolved IS NULL THEN
    SELECT id INTO resolved FROM org_warehouses
    WHERE branch_id = NEW.warehouse_id AND is_default AND active LIMIT 1;
  END IF;
  IF resolved IS NULL OR NOT EXISTS (
    SELECT 1 FROM org_warehouses
    WHERE id = resolved AND branch_id = NEW.warehouse_id AND active
  ) THEN
    RAISE EXCEPTION 'Inventory balance warehouse must belong to branch %', NEW.warehouse_id;
  END IF;
  NEW.org_warehouse_id := resolved;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inventory_balance_warehouse
BEFORE INSERT OR UPDATE OF warehouse_id,org_warehouse_id ON inventory_balances
FOR EACH ROW EXECUTE FUNCTION resolve_inventory_balance_warehouse();

-- inventory_movements already received nullable dimension columns in 012.
UPDATE inventory_movements m
SET org_warehouse_id = w.id
FROM org_warehouses w
WHERE w.branch_id = m.warehouse_id AND w.is_default
  AND m.org_warehouse_id IS NULL;

ALTER TABLE inventory_movements
  ADD CONSTRAINT fk_inventory_movement_org_warehouse
    FOREIGN KEY (org_warehouse_id) REFERENCES org_warehouses(id),
  ADD CONSTRAINT fk_inventory_movement_storage_location
    FOREIGN KEY (storage_location_id) REFERENCES storage_locations(id),
  ADD CONSTRAINT fk_inventory_movement_bin
    FOREIGN KEY (bin_id) REFERENCES warehouse_bins(id),
  ALTER COLUMN org_warehouse_id SET NOT NULL;

CREATE OR REPLACE FUNCTION resolve_inventory_movement_dimensions()
RETURNS trigger AS $$
DECLARE wh_branch uuid; bin_wh uuid; bin_loc uuid; loc_wh uuid; resolved_wh uuid;
BEGIN
  IF NEW.org_warehouse_id IS NULL THEN
    SELECT id INTO resolved_wh FROM org_warehouses
    WHERE branch_id = NEW.warehouse_id AND is_default AND active LIMIT 1;
    NEW.org_warehouse_id := resolved_wh;
  END IF;
  SELECT branch_id INTO wh_branch FROM org_warehouses
  WHERE id = NEW.org_warehouse_id AND active;
  IF wh_branch IS NULL OR wh_branch <> NEW.warehouse_id THEN
    RAISE EXCEPTION 'Inventory movement warehouse is outside branch scope';
  END IF;
  IF NEW.bin_id IS NOT NULL THEN
    SELECT s.warehouse_id,s.id INTO bin_wh,bin_loc
    FROM warehouse_bins b JOIN storage_locations s ON s.id=b.storage_location_id
    WHERE b.id=NEW.bin_id AND b.active AND s.active;
    IF bin_wh IS NULL OR bin_wh <> NEW.org_warehouse_id THEN
      RAISE EXCEPTION 'Inventory movement bin is outside canonical warehouse';
    END IF;
    NEW.storage_location_id := bin_loc;
  ELSIF NEW.storage_location_id IS NOT NULL THEN
    SELECT warehouse_id INTO loc_wh FROM storage_locations
    WHERE id=NEW.storage_location_id AND active;
    IF loc_wh IS NULL OR loc_wh <> NEW.org_warehouse_id THEN
      RAISE EXCEPTION 'Inventory movement storage location is outside canonical warehouse';
    END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inventory_movement_dimensions
BEFORE INSERT OR UPDATE OF warehouse_id,org_warehouse_id,storage_location_id,bin_id
ON inventory_movements
FOR EACH ROW EXECUTE FUNCTION resolve_inventory_movement_dimensions();

ALTER TABLE stock_reservations
  ADD COLUMN org_warehouse_id uuid REFERENCES org_warehouses(id);
UPDATE stock_reservations r SET org_warehouse_id=w.id
FROM org_warehouses w
WHERE w.branch_id=r.warehouse_id AND w.is_default;
ALTER TABLE stock_reservations ALTER COLUMN org_warehouse_id SET NOT NULL;
CREATE INDEX ix_stock_reservation_org_warehouse
  ON stock_reservations(org_warehouse_id,status,product_id);

CREATE OR REPLACE FUNCTION resolve_stock_reservation_warehouse()
RETURNS trigger AS $$
DECLARE resolved_wh uuid;
BEGIN
  IF NEW.org_warehouse_id IS NULL THEN
    SELECT id INTO resolved_wh FROM org_warehouses
    WHERE branch_id=NEW.warehouse_id AND is_default AND active LIMIT 1;
    NEW.org_warehouse_id := resolved_wh;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM org_warehouses
    WHERE id=NEW.org_warehouse_id AND branch_id=NEW.warehouse_id AND active) THEN
    RAISE EXCEPTION 'Stock reservation warehouse is outside branch scope';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_stock_reservation_warehouse
BEFORE INSERT OR UPDATE OF warehouse_id,org_warehouse_id ON stock_reservations
FOR EACH ROW EXECUTE FUNCTION resolve_stock_reservation_warehouse();

ALTER TABLE stock_lots
  ADD COLUMN storage_location_id uuid REFERENCES storage_locations(id),
  ADD COLUMN expiry_date date,
  ADD CONSTRAINT stock_lots_expiry_after_receipt CHECK (
    expiry_date IS NULL OR expiry_date >= received_at::date
  );
UPDATE stock_lots l SET storage_location_id=b.storage_location_id
FROM warehouse_bins b WHERE b.id=l.bin_id;

-- Upgrade resolver Stage 1: warehouse + storage location now move together.
CREATE OR REPLACE FUNCTION resolve_stock_lot_warehouse() RETURNS trigger AS $$
DECLARE bin_wh uuid; bin_loc uuid; resolved_wh uuid;
BEGIN
  IF NEW.bin_id IS NOT NULL THEN
    SELECT s.warehouse_id,s.id INTO bin_wh,bin_loc
    FROM warehouse_bins b JOIN storage_locations s ON s.id=b.storage_location_id
    WHERE b.id=NEW.bin_id AND b.active AND s.active;
    IF bin_wh IS NULL THEN RAISE EXCEPTION 'Stock lot bin is inactive or unknown'; END IF;
    NEW.org_warehouse_id := bin_wh;
    NEW.storage_location_id := bin_loc;
  ELSE
    NEW.storage_location_id := NULL;
  END IF;
  IF NEW.org_warehouse_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM org_warehouses w
                    WHERE w.id=NEW.org_warehouse_id AND w.branch_id=NEW.warehouse_id) THEN
    SELECT id INTO resolved_wh FROM org_warehouses
    WHERE branch_id=NEW.warehouse_id AND is_default LIMIT 1;
    NEW.org_warehouse_id := resolved_wh;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_resolve_stock_lot_warehouse ON stock_lots;
CREATE TRIGGER trg_resolve_stock_lot_warehouse
BEFORE INSERT OR UPDATE OF warehouse_id,org_warehouse_id,bin_id,storage_location_id ON stock_lots
FOR EACH ROW EXECUTE FUNCTION resolve_stock_lot_warehouse();

ALTER TABLE warehouse_tasks
  ADD COLUMN org_warehouse_id uuid REFERENCES org_warehouses(id),
  ADD COLUMN storage_location_id uuid REFERENCES storage_locations(id),
  ADD COLUMN scan_required boolean NOT NULL DEFAULT false,
  ADD COLUMN scan_policy jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(scan_policy)='object');

UPDATE warehouse_tasks t SET org_warehouse_id=COALESCE(
  (SELECT sc.org_warehouse_id FROM warehouse_bin_scope sc
   WHERE sc.bin_id=COALESCE(t.to_bin_id,t.from_bin_id)),
  (SELECT l.org_warehouse_id FROM stock_lots l WHERE l.id=t.lot_id),
  (SELECT w.id FROM org_warehouses w WHERE w.branch_id=t.branch_id AND w.is_default LIMIT 1)
);
UPDATE warehouse_tasks t SET storage_location_id=(
  SELECT sc.storage_location_id FROM warehouse_bin_scope sc
  WHERE sc.bin_id=COALESCE(t.to_bin_id,t.from_bin_id)
);
ALTER TABLE warehouse_tasks ALTER COLUMN org_warehouse_id SET NOT NULL;
CREATE INDEX ix_warehouse_tasks_org_warehouse
  ON warehouse_tasks(org_warehouse_id,status,due_at);

CREATE OR REPLACE FUNCTION resolve_warehouse_task_dimensions()
RETURNS trigger AS $$
DECLARE scoped_wh uuid; scoped_loc uuid; resolved_wh uuid;
BEGIN
  IF COALESCE(NEW.to_bin_id,NEW.from_bin_id) IS NOT NULL THEN
    SELECT org_warehouse_id,storage_location_id INTO scoped_wh,scoped_loc
    FROM warehouse_bin_scope WHERE bin_id=COALESCE(NEW.to_bin_id,NEW.from_bin_id);
    IF scoped_wh IS NULL THEN RAISE EXCEPTION 'Warehouse task bin is unknown'; END IF;
    NEW.org_warehouse_id := scoped_wh;
    NEW.storage_location_id := scoped_loc;
  ELSIF NEW.lot_id IS NOT NULL THEN
    SELECT org_warehouse_id,storage_location_id INTO scoped_wh,scoped_loc
    FROM stock_lots WHERE id=NEW.lot_id;
    NEW.org_warehouse_id := COALESCE(NEW.org_warehouse_id,scoped_wh);
    NEW.storage_location_id := COALESCE(NEW.storage_location_id,scoped_loc);
  END IF;
  IF NEW.org_warehouse_id IS NULL THEN
    SELECT id INTO resolved_wh FROM org_warehouses
    WHERE branch_id=NEW.branch_id AND is_default AND active LIMIT 1;
    NEW.org_warehouse_id := resolved_wh;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM org_warehouses
    WHERE id=NEW.org_warehouse_id AND branch_id=NEW.branch_id AND active) THEN
    RAISE EXCEPTION 'Warehouse task canonical warehouse is outside branch scope';
  END IF;
  IF NEW.storage_location_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM storage_locations
    WHERE id=NEW.storage_location_id AND warehouse_id=NEW.org_warehouse_id AND active
  ) THEN
    RAISE EXCEPTION 'Warehouse task storage location is outside canonical warehouse';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_warehouse_task_dimensions
BEFORE INSERT OR UPDATE OF branch_id,org_warehouse_id,storage_location_id,lot_id,from_bin_id,to_bin_id
ON warehouse_tasks
FOR EACH ROW EXECUTE FUNCTION resolve_warehouse_task_dimensions();

-- ── Handling unit / license plate ─────────────────────────────────────────
CREATE TABLE warehouse_handling_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_plate varchar(80) NOT NULL UNIQUE,
  branch_id uuid NOT NULL REFERENCES branches(id),
  org_warehouse_id uuid NOT NULL REFERENCES org_warehouses(id),
  storage_location_id uuid REFERENCES storage_locations(id),
  bin_id uuid REFERENCES warehouse_bins(id),
  status varchar(12) NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN','SEALED','STAGED','LOADED','SHIPPED','VOID')),
  handling_unit_type varchar(16) NOT NULL DEFAULT 'PALLET'
    CHECK (handling_unit_type IN ('PALLET','CRATE','BOX','BUNDLE','CONTAINER')),
  gross_weight numeric(16,4) CHECK (gross_weight IS NULL OR gross_weight>=0),
  version integer NOT NULL DEFAULT 1 CHECK (version>0),
  created_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_handling_units_board
  ON warehouse_handling_units(branch_id,status,updated_at DESC);
ALTER TABLE warehouse_handling_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY branch_scope ON warehouse_handling_units
  USING (app_branch_visible(branch_id)) WITH CHECK (app_branch_visible(branch_id));

CREATE OR REPLACE FUNCTION validate_handling_unit_dimensions()
RETURNS trigger AS $$
DECLARE bin_wh uuid; bin_loc uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM org_warehouses
    WHERE id=NEW.org_warehouse_id AND branch_id=NEW.branch_id AND active) THEN
    RAISE EXCEPTION 'Handling unit warehouse is outside branch scope';
  END IF;
  IF NEW.bin_id IS NOT NULL THEN
    SELECT s.warehouse_id,s.id INTO bin_wh,bin_loc
    FROM warehouse_bins b JOIN storage_locations s ON s.id=b.storage_location_id
    WHERE b.id=NEW.bin_id AND b.active AND s.active;
    IF bin_wh IS NULL OR bin_wh<>NEW.org_warehouse_id THEN
      RAISE EXCEPTION 'Handling unit bin is outside canonical warehouse';
    END IF;
    NEW.storage_location_id:=bin_loc;
  ELSIF NEW.storage_location_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM storage_locations
    WHERE id=NEW.storage_location_id AND warehouse_id=NEW.org_warehouse_id AND active
  ) THEN
    RAISE EXCEPTION 'Handling unit storage location is outside canonical warehouse';
  END IF;
  NEW.updated_at:=now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_handling_unit_dimensions
BEFORE INSERT OR UPDATE OF branch_id,org_warehouse_id,storage_location_id,bin_id
ON warehouse_handling_units
FOR EACH ROW EXECUTE FUNCTION validate_handling_unit_dimensions();

CREATE TABLE warehouse_handling_unit_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handling_unit_id uuid NOT NULL REFERENCES warehouse_handling_units(id) ON DELETE RESTRICT,
  lot_id uuid NOT NULL REFERENCES stock_lots(id) ON DELETE RESTRICT,
  branch_id uuid NOT NULL REFERENCES branches(id),
  qty numeric(16,4) NOT NULL CHECK (qty>0),
  created_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(handling_unit_id,lot_id)
);
CREATE INDEX ix_handling_unit_items_lot ON warehouse_handling_unit_items(lot_id);
ALTER TABLE warehouse_handling_unit_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY branch_scope ON warehouse_handling_unit_items
  USING (app_branch_visible(branch_id)) WITH CHECK (app_branch_visible(branch_id));

CREATE OR REPLACE FUNCTION validate_handling_unit_item()
RETURNS trigger AS $$
DECLARE hu_branch uuid; hu_wh uuid; hu_status varchar; lot_branch uuid; lot_wh uuid;
BEGIN
  SELECT branch_id,org_warehouse_id,status INTO hu_branch,hu_wh,hu_status
  FROM warehouse_handling_units WHERE id=NEW.handling_unit_id;
  SELECT warehouse_id,org_warehouse_id INTO lot_branch,lot_wh
  FROM stock_lots WHERE id=NEW.lot_id;
  IF hu_status<>'OPEN' THEN
    RAISE EXCEPTION 'Items can only change while handling unit is OPEN';
  END IF;
  IF hu_branch IS NULL OR lot_branch IS NULL OR hu_branch<>lot_branch OR hu_wh<>lot_wh THEN
    RAISE EXCEPTION 'Handling unit item is outside unit warehouse scope';
  END IF;
  NEW.branch_id:=hu_branch;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_handling_unit_item_scope
BEFORE INSERT OR UPDATE ON warehouse_handling_unit_items
FOR EACH ROW EXECUTE FUNCTION validate_handling_unit_item();

-- ── Mobile scan sessions and immutable evidence ───────────────────────────
CREATE TABLE warehouse_scan_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES warehouse_tasks(id) ON DELETE RESTRICT,
  branch_id uuid NOT NULL REFERENCES branches(id),
  org_warehouse_id uuid NOT NULL REFERENCES org_warehouses(id),
  operator_id uuid NOT NULL REFERENCES app_users(id),
  status varchar(12) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','READY','COMPLETED','CANCELLED')),
  required_scans jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(required_scans)='array'),
  scanned_count integer NOT NULL DEFAULT 0 CHECK (scanned_count>=0),
  version integer NOT NULL DEFAULT 1 CHECK (version>0),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT scan_session_completed_stamp CHECK (
    status<>'COMPLETED' OR completed_at IS NOT NULL)
);
CREATE UNIQUE INDEX ux_scan_session_active_task
  ON warehouse_scan_sessions(task_id)
  WHERE status IN ('ACTIVE','READY');
CREATE INDEX ix_scan_session_operator
  ON warehouse_scan_sessions(operator_id,status,started_at DESC);
ALTER TABLE warehouse_scan_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY branch_scope ON warehouse_scan_sessions
  USING (app_branch_visible(branch_id)) WITH CHECK (app_branch_visible(branch_id));

CREATE OR REPLACE FUNCTION validate_warehouse_scan_session()
RETURNS trigger AS $$
DECLARE task_branch uuid; task_wh uuid; task_status varchar;
BEGIN
  SELECT branch_id,org_warehouse_id,status INTO task_branch,task_wh,task_status
  FROM warehouse_tasks WHERE id=NEW.task_id;
  IF task_branch IS NULL OR task_branch<>NEW.branch_id OR task_wh<>NEW.org_warehouse_id THEN
    RAISE EXCEPTION 'Scan session is outside task warehouse scope';
  END IF;
  IF TG_OP='INSERT' AND task_status NOT IN ('CLAIMED','IN_PROGRESS') THEN
    RAISE EXCEPTION 'Scan session requires a claimed or in-progress task';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_scan_session_scope
BEFORE INSERT OR UPDATE OF task_id,branch_id,org_warehouse_id ON warehouse_scan_sessions
FOR EACH ROW EXECUTE FUNCTION validate_warehouse_scan_session();

CREATE TABLE warehouse_scan_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES warehouse_scan_sessions(id) ON DELETE RESTRICT,
  branch_id uuid NOT NULL REFERENCES branches(id),
  sequence_no integer NOT NULL CHECK (sequence_no>0),
  scan_type varchar(12) NOT NULL CHECK (scan_type IN ('LOT','BIN','HU','DOCUMENT')),
  entity_id uuid NOT NULL,
  scanned_code varchar(160) NOT NULL,
  device_label varchar(120),
  scanned_by uuid NOT NULL REFERENCES app_users(id),
  scanned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id,sequence_no)
);
CREATE INDEX ix_warehouse_scan_event_entity
  ON warehouse_scan_events(scan_type,entity_id,scanned_at DESC);
ALTER TABLE warehouse_scan_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY branch_scope ON warehouse_scan_events
  USING (app_branch_visible(branch_id)) WITH CHECK (app_branch_visible(branch_id));

CREATE OR REPLACE FUNCTION validate_warehouse_scan_event()
RETURNS trigger AS $$
DECLARE session_branch uuid; session_status varchar; expected_seq integer;
BEGIN
  SELECT branch_id,status,scanned_count+1 INTO session_branch,session_status,expected_seq
  FROM warehouse_scan_sessions WHERE id=NEW.session_id;
  IF session_branch IS NULL OR session_branch<>NEW.branch_id THEN
    RAISE EXCEPTION 'Scan event is outside session branch scope';
  END IF;
  IF session_status NOT IN ('ACTIVE','READY') OR NEW.sequence_no<>expected_seq THEN
    RAISE EXCEPTION 'Scan event sequence or session state is invalid';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_scan_event_scope
BEFORE INSERT ON warehouse_scan_events
FOR EACH ROW EXECUTE FUNCTION validate_warehouse_scan_event();

CREATE OR REPLACE FUNCTION protect_warehouse_scan_event() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Warehouse scan evidence is append-only';
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_scan_event_append_only
BEFORE UPDATE OR DELETE ON warehouse_scan_events
FOR EACH ROW EXECUTE FUNCTION protect_warehouse_scan_event();

-- Canonical read model: product → warehouse → storage location → bin.
CREATE VIEW inventory_location_ledger AS
SELECT l.product_id,l.warehouse_id AS branch_id,l.org_warehouse_id,
       l.storage_location_id,l.bin_id,
       SUM(l.qty_on_hand)::float qty_on_hand,
       COUNT(*)::int lot_count,
       MIN(l.expiry_date) next_expiry_date
FROM stock_lots l
WHERE l.qty_on_hand>0 AND l.status<>'CONSUMED'
GROUP BY l.product_id,l.warehouse_id,l.org_warehouse_id,l.storage_location_id,l.bin_id;
ALTER VIEW inventory_location_ledger SET (security_invoker=true);

-- Release gate Stage 2A: semua canonical dimension wajib terisi dan scoped.
CREATE VIEW warehouse_dimension_health AS
SELECT
  (SELECT count(*) FROM inventory_balances WHERE org_warehouse_id IS NULL)::int
    AS balance_missing_warehouse,
  (SELECT count(*) FROM inventory_movements WHERE org_warehouse_id IS NULL)::int
    AS movement_missing_warehouse,
  (SELECT count(*) FROM stock_reservations WHERE org_warehouse_id IS NULL)::int
    AS reservation_missing_warehouse,
  (SELECT count(*) FROM stock_lots WHERE org_warehouse_id IS NULL)::int
    AS lot_missing_warehouse,
  (SELECT count(*) FROM warehouse_tasks WHERE org_warehouse_id IS NULL)::int
    AS task_missing_warehouse,
  (SELECT count(*) FROM stock_lots l JOIN org_warehouses w ON w.id=l.org_warehouse_id
   WHERE w.branch_id<>l.warehouse_id)::int AS lot_cross_branch,
  (SELECT count(*) FROM stock_reservations r JOIN org_warehouses w ON w.id=r.org_warehouse_id
   WHERE w.branch_id<>r.warehouse_id)::int AS reservation_cross_branch;
ALTER VIEW warehouse_dimension_health SET (security_invoker=true);

COMMIT;
