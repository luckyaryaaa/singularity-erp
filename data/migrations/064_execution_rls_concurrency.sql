BEGIN;
-- 064 — Defense-in-depth untuk execution engine 057–061.
--
-- UI workbench baru akan membuka data reservasi, kontrak, kapasitas, WIP,
-- CAPA, dan kalibrasi lebih luas. Sebelum itu database harus menjadi jaring
-- pengaman terakhir: branch isolation tidak boleh hanya bergantung pada WHERE
-- di JavaScript, view tidak boleh melewati RLS, dan mutation tidak boleh
-- menimpa perubahan user lain secara diam-diam.

ALTER TABLE stock_reservations
  ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE purchase_contract_lines
  ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE work_order_operations
  ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE capa_cases
  ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE measuring_instruments
  ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version > 0);

-- UNIQUE biasa memperlakukan NULL sebagai nilai berbeda. Akibatnya release
-- level header (contract_line_id NULL) dapat direplay dengan key HTTP berbeda.
CREATE UNIQUE INDEX ux_purchase_contract_release_business_key
  ON purchase_contract_releases(
    contract_id,
    purchase_order_id,
    COALESCE(contract_line_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(purchase_order_line_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

ALTER TABLE stock_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY warehouse_scope ON stock_reservations
  USING (app_branch_visible(warehouse_id))
  WITH CHECK (app_branch_visible(warehouse_id));

ALTER TABLE purchase_contract_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY contract_scope ON purchase_contract_lines
  USING (EXISTS (
    SELECT 1 FROM purchase_contracts c
    WHERE c.id = contract_id AND app_branch_visible(c.branch_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM purchase_contracts c
    WHERE c.id = contract_id AND app_branch_visible(c.branch_id)
  ));

ALTER TABLE purchase_contract_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY contract_scope ON purchase_contract_releases
  USING (EXISTS (
    SELECT 1 FROM purchase_contracts c
    WHERE c.id = contract_id AND app_branch_visible(c.branch_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM purchase_contracts c
    WHERE c.id = contract_id AND app_branch_visible(c.branch_id)
  ));

ALTER TABLE work_order_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY work_order_scope ON work_order_operations
  USING (EXISTS (
    SELECT 1 FROM business_documents d
    WHERE d.id = work_order_id AND app_branch_visible(d.branch_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM business_documents d
    WHERE d.id = work_order_id AND app_branch_visible(d.branch_id)
  ));

ALTER TABLE work_order_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY work_order_scope ON work_order_materials
  USING (EXISTS (
    SELECT 1 FROM business_documents d
    WHERE d.id = work_order_id AND app_branch_visible(d.branch_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM business_documents d
    WHERE d.id = work_order_id AND app_branch_visible(d.branch_id)
  ));

ALTER TABLE work_order_time_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY operation_scope ON work_order_time_logs
  USING (EXISTS (
    SELECT 1
    FROM work_order_operations o
    JOIN business_documents d ON d.id = o.work_order_id
    WHERE o.id = operation_id AND app_branch_visible(d.branch_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM work_order_operations o
    JOIN business_documents d ON d.id = o.work_order_id
    WHERE o.id = operation_id AND app_branch_visible(d.branch_id)
  ));

ALTER TABLE qc_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY document_scope ON qc_inspections
  USING (EXISTS (
    SELECT 1 FROM business_documents d
    WHERE d.id = qc_document_id AND app_branch_visible(d.branch_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM business_documents d
    WHERE d.id = qc_document_id AND app_branch_visible(d.branch_id)
  ));

ALTER TABLE capa_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY branch_scope ON capa_cases
  USING (app_branch_visible(branch_id))
  WITH CHECK (app_branch_visible(branch_id));

ALTER TABLE measuring_instruments ENABLE ROW LEVEL SECURITY;
CREATE POLICY branch_scope ON measuring_instruments
  USING (app_branch_visible(branch_id))
  WITH CHECK (app_branch_visible(branch_id));

ALTER TABLE instrument_calibrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY instrument_scope ON instrument_calibrations
  USING (EXISTS (
    SELECT 1 FROM measuring_instruments i
    WHERE i.id = instrument_id AND app_branch_visible(i.branch_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM measuring_instruments i
    WHERE i.id = instrument_id AND app_branch_visible(i.branch_id)
  ));

-- PostgreSQL 16: view membaca dengan privilege dan RLS pemanggil, bukan owner.
ALTER VIEW stock_reservation_balance SET (security_invoker = true);
ALTER VIEW work_center_daily_load SET (security_invoker = true);
ALTER VIEW work_order_wip SET (security_invoker = true);

COMMIT;
