-- 012_enterprise_organization.sql — Struktur organisasi enterprise (R013 / §5).
-- Corporate Group → Legal Entity → Business Unit → Branch/Plant → Warehouse →
-- Storage Location → Bin, plus Department, Cost/Profit Center, Work Center,
-- Project WBS, Fiscal Calendar, Ledger. Warehouse berhenti menumpang branches.
BEGIN;

CREATE TABLE legal_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(20) UNIQUE NOT NULL,
  legal_name varchar(200) NOT NULL,
  trade_name varchar(200),
  npwp varchar(30),
  functional_currency char(3) NOT NULL DEFAULT 'IDR',
  reporting_currency char(3) NOT NULL DEFAULT 'IDR',
  address text, phone varchar(40), email varchar(120), website varchar(160),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ledgers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_entity_id uuid NOT NULL REFERENCES legal_entities(id),
  code varchar(20) NOT NULL, name varchar(120) NOT NULL,
  ledger_type varchar(20) NOT NULL DEFAULT 'PRIMARY' CHECK (ledger_type IN ('PRIMARY','SECONDARY','TAX')),
  currency char(3) NOT NULL DEFAULT 'IDR',
  active boolean NOT NULL DEFAULT true,
  UNIQUE(legal_entity_id, code)
);

CREATE TABLE fiscal_calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_entity_id uuid NOT NULL REFERENCES legal_entities(id),
  fiscal_year integer NOT NULL,
  start_date date NOT NULL, end_date date NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED')),
  UNIQUE(legal_entity_id, fiscal_year),
  CHECK (end_date > start_date)
);

CREATE TABLE business_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_entity_id uuid NOT NULL REFERENCES legal_entities(id),
  code varchar(20) NOT NULL, name varchar(160) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(legal_entity_id, code)
);

-- branches sudah ada (001): tautkan ke struktur baru tanpa memutus data lama.
ALTER TABLE branches
  ADD COLUMN legal_entity_id uuid REFERENCES legal_entities(id),
  ADD COLUMN business_unit_id uuid REFERENCES business_units(id);

CREATE TABLE departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_entity_id uuid NOT NULL REFERENCES legal_entities(id),
  code varchar(20) NOT NULL, name varchar(160) NOT NULL,
  parent_id uuid REFERENCES departments(id),
  head_employee_id uuid REFERENCES employees(id),
  active boolean NOT NULL DEFAULT true,
  UNIQUE(legal_entity_id, code)
);

CREATE TABLE cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_entity_id uuid NOT NULL REFERENCES legal_entities(id),
  code varchar(20) NOT NULL, name varchar(160) NOT NULL,
  department_id uuid REFERENCES departments(id),
  branch_id uuid REFERENCES branches(id),
  valid_from date NOT NULL DEFAULT current_date, valid_to date,
  active boolean NOT NULL DEFAULT true,
  UNIQUE(legal_entity_id, code)
);

CREATE TABLE profit_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_entity_id uuid NOT NULL REFERENCES legal_entities(id),
  code varchar(20) NOT NULL, name varchar(160) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  UNIQUE(legal_entity_id, code)
);

CREATE TABLE plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  code varchar(20) UNIQUE NOT NULL, name varchar(160) NOT NULL,
  plant_type varchar(20) NOT NULL DEFAULT 'WORKSHOP' CHECK (plant_type IN ('WORKSHOP','FACTORY','SERVICE_CENTER')),
  address text,
  active boolean NOT NULL DEFAULT true
);

-- Warehouse sebagai entitas mandiri (bukan lagi FK ke branches).
CREATE TABLE org_warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid REFERENCES plants(id),
  branch_id uuid NOT NULL REFERENCES branches(id),
  code varchar(20) UNIQUE NOT NULL, name varchar(160) NOT NULL,
  warehouse_type varchar(20) NOT NULL DEFAULT 'GENERAL' CHECK (warehouse_type IN ('GENERAL','RAW_MATERIAL','FINISHED_GOODS','CONSIGNMENT','QUARANTINE','SCRAP')),
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE storage_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES org_warehouses(id),
  code varchar(20) NOT NULL, name varchar(120) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  UNIQUE(warehouse_id, code)
);

CREATE TABLE warehouse_bins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_location_id uuid NOT NULL REFERENCES storage_locations(id),
  code varchar(30) NOT NULL,
  bin_type varchar(20) DEFAULT 'RACK' CHECK (bin_type IN ('RACK','FLOOR','SHELF','CAGE')),
  active boolean NOT NULL DEFAULT true,
  UNIQUE(storage_location_id, code)
);

CREATE TABLE work_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES plants(id),
  code varchar(20) NOT NULL, name varchar(160) NOT NULL,
  work_center_type varchar(30) NOT NULL DEFAULT 'MACHINING'
    CHECK (work_center_type IN ('MACHINING','WELDING','FABRICATION','ASSEMBLY','QC','PAINTING','SUBCONTRACT','SERVICE')),
  capacity_hours_per_day numeric(6,2) NOT NULL DEFAULT 8,
  hourly_rate numeric(20,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  UNIQUE(plant_id, code)
);

CREATE TABLE project_wbs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_document_id uuid REFERENCES business_documents(id),
  code varchar(40) NOT NULL, name varchar(200) NOT NULL,
  parent_id uuid REFERENCES project_wbs(id),
  cost_center_id uuid REFERENCES cost_centers(id),
  budget_amount numeric(20,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  UNIQUE(project_document_id, code)
);

-- Dimensi akuntansi pada dokumen transaksi (§18.1) — nullable agar data lama aman.
ALTER TABLE business_documents
  ADD COLUMN legal_entity_id uuid REFERENCES legal_entities(id),
  ADD COLUMN department_id uuid REFERENCES departments(id),
  ADD COLUMN cost_center_id uuid REFERENCES cost_centers(id),
  ADD COLUMN profit_center_id uuid REFERENCES profit_centers(id),
  ADD COLUMN project_wbs_id uuid REFERENCES project_wbs(id);
CREATE INDEX ix_documents_cost_center ON business_documents(cost_center_id) WHERE cost_center_id IS NOT NULL;

-- Dimensi gudang pada movement (§5.2) — nullable, movement lama tetap valid.
ALTER TABLE inventory_movements
  ADD COLUMN org_warehouse_id uuid,
  ADD COLUMN storage_location_id uuid,
  ADD COLUMN bin_id uuid;

-- ── Seed struktur MAT (idempotent, hanya bila legal entity belum ada) ────────
DO $$
DECLARE
  le uuid; bu uuid; dep_ops uuid; plant_ws uuid; wh uuid; sl uuid;
  br record;
BEGIN
  IF EXISTS (SELECT 1 FROM legal_entities) THEN RETURN; END IF;

  INSERT INTO legal_entities(code,legal_name,trade_name,functional_currency)
    VALUES('MAT','PT Mandiri Abadi Teknik','Mandiri Abadi Teknik','IDR') RETURNING id INTO le;
  INSERT INTO ledgers(legal_entity_id,code,name) VALUES(le,'MAIN','Buku Besar Utama');
  INSERT INTO fiscal_calendars(legal_entity_id,fiscal_year,start_date,end_date)
    VALUES(le,EXTRACT(YEAR FROM now())::int,make_date(EXTRACT(YEAR FROM now())::int,1,1),make_date(EXTRACT(YEAR FROM now())::int,12,31));
  INSERT INTO business_units(legal_entity_id,code,name)
    VALUES(le,'MFG','Manufacturing & Services') RETURNING id INTO bu;
  UPDATE branches SET legal_entity_id=le, business_unit_id=bu;

  FOR br IN SELECT id,code,name FROM branches LOOP
    -- Plant untuk setiap branch bertipe workshop; warehouse untuk semua branch.
    INSERT INTO plants(branch_id,code,name,plant_type)
      VALUES(br.id,'PL-'||br.code,'Plant '||br.name,'WORKSHOP') RETURNING id INTO plant_ws;
    INSERT INTO org_warehouses(plant_id,branch_id,code,name)
      VALUES(plant_ws,br.id,'WH-'||br.code,'Gudang '||br.name) RETURNING id INTO wh;
    INSERT INTO storage_locations(warehouse_id,code,name) VALUES(wh,'MAIN','Area Utama') RETURNING id INTO sl;
    INSERT INTO warehouse_bins(storage_location_id,code) VALUES(sl,'A-01-01');
    INSERT INTO work_centers(plant_id,code,name,work_center_type) VALUES
      (plant_ws,'WC-MC','Machining','MACHINING'),
      (plant_ws,'WC-WD','Welding & Fabrikasi','WELDING'),
      (plant_ws,'WC-QC','Quality Control','QC');
  END LOOP;

  FOR br IN SELECT unnest(ARRAY['OPS','FIN','ACC','TAX','HRD','SLS','PRC','WHS','PRD']) AS code,
                   unnest(ARRAY['Operasional','Finance','Accounting','Tax','HRD','Sales','Procurement','Warehouse','Production']) AS name LOOP
    INSERT INTO departments(legal_entity_id,code,name) VALUES(le,br.code,br.name);
  END LOOP;
  SELECT id INTO dep_ops FROM departments WHERE legal_entity_id=le AND code='OPS';
  INSERT INTO cost_centers(legal_entity_id,code,name,department_id) SELECT le,'CC-'||d.code,'CC '||d.name,d.id FROM departments d WHERE d.legal_entity_id=le;
  INSERT INTO profit_centers(legal_entity_id,code,name) VALUES
    (le,'PC-SVC','Service & Repair'),(le,'PC-FAB','Fabrication & Manufacturing'),(le,'PC-PRT','Spare Parts & Trading');
END $$;

COMMIT;
