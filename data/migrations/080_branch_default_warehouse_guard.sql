BEGIN;
-- 080 — Active-branch default warehouse invariant.
--
-- Migration 076 backfilled branches that existed while it ran, but a branch
-- created afterwards could still exist without a canonical default warehouse.
-- That made a clean UAT database differ from a long-lived development database.
-- This trigger keeps the invariant true for every future active branch.

CREATE OR REPLACE FUNCTION ensure_branch_default_warehouse() RETURNS trigger AS $$
DECLARE
  existing_id uuid;
  desired_code varchar(20);
BEGIN
  IF NOT NEW.active THEN
    RETURN NEW;
  END IF;

  SELECT id INTO existing_id
  FROM org_warehouses
  WHERE branch_id = NEW.id AND is_default
  ORDER BY active DESC, code
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    UPDATE org_warehouses SET active = true WHERE id = existing_id AND NOT active;
    RETURN NEW;
  END IF;

  SELECT id INTO existing_id
  FROM org_warehouses
  WHERE branch_id = NEW.id
  ORDER BY active DESC, code
  LIMIT 1
  FOR UPDATE;

  IF existing_id IS NOT NULL THEN
    UPDATE org_warehouses
    SET is_default = true, active = true
    WHERE id = existing_id;
    RETURN NEW;
  END IF;

  desired_code := left('WH-' || NEW.code, 20);
  BEGIN
    INSERT INTO org_warehouses(branch_id, code, name, warehouse_type, active, is_default)
    VALUES(NEW.id, desired_code, 'Gudang Utama ' || NEW.code, 'GENERAL', true, true);
  EXCEPTION WHEN unique_violation THEN
    -- org_warehouses.code unik global; suffix UUID menjaga fallback tetap unik
    -- bila instalasi lama pernah memakai kode WH-<branch> untuk cabang lain.
    INSERT INTO org_warehouses(branch_id, code, name, warehouse_type, active, is_default)
    VALUES(NEW.id, 'WH-' || substr(replace(NEW.id::text, '-', ''), 1, 16),
           'Gudang Utama ' || NEW.code, 'GENERAL', true, true);
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE TRIGGER trg_branch_default_warehouse
AFTER INSERT OR UPDATE OF active ON branches
FOR EACH ROW EXECUTE FUNCTION ensure_branch_default_warehouse();

-- Repair branches added after migration 076 but before this guard. Assigning
-- the existing value deliberately fires the UPDATE OF active trigger.
UPDATE branches SET active = active WHERE active;

COMMIT;
