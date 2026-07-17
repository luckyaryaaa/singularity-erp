BEGIN;
-- ═══════════════════════════════════════════════════════════════════════════
-- Sprint 13 (R020) — Fixed Asset, depresiasi & fondasi laporan keuangan:
--   1. asset_categories : kategori aset configuration-driven (§35) — umur
--      manfaat, metode, dan AKUN (aset/akumulasi/beban) dari konfigurasi
--   2. fixed_assets     : registry aset tetap (nomor FA-*, kustodian, lokasi,
--      disposal ber-alasan dengan jurnal otomatis)
--   3. asset_depreciation_entries : jejak penyusutan idempoten per aset per
--      periode, tertaut dokumen jurnal
--   4. COA: 1500 Aset Tetap, 1590 Akumulasi Penyusutan (kontra aset),
--      3100/3900 Ekuitas (fondasi neraca), 6300 Beban Penyusutan,
--      7100 Laba/Rugi Pelepasan Aset
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO chart_of_accounts(code,name,normal_side,category) VALUES
 ('1500','Aset Tetap','D','ASSET'),
 ('1590','Akumulasi Penyusutan','C','ASSET'),
 ('3100','Modal Disetor','C','EQUITY'),
 ('3900','Laba Ditahan','C','EQUITY'),
 ('6300','Beban Penyusutan','D','EXPENSE'),
 ('7100','Laba/Rugi Pelepasan Aset','C','REVENUE')
ON CONFLICT(code) DO NOTHING;

CREATE TABLE asset_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(20) NOT NULL UNIQUE,
  name varchar(120) NOT NULL,
  useful_life_months integer NOT NULL CHECK (useful_life_months > 0),
  depreciation_method varchar(20) NOT NULL DEFAULT 'STRAIGHT_LINE'
    CHECK (depreciation_method IN ('STRAIGHT_LINE')),   -- metode lain menyusul
  asset_account_code varchar(20) NOT NULL,
  accumulated_account_code varchar(20) NOT NULL,
  expense_account_code varchar(20) NOT NULL,
  active boolean NOT NULL DEFAULT true
);
INSERT INTO asset_categories(code,name,useful_life_months,asset_account_code,accumulated_account_code,expense_account_code) VALUES
 ('MESIN','Mesin & alat produksi',96,'1500','1590','6300'),
 ('KENDARAAN','Kendaraan operasional',60,'1500','1590','6300'),
 ('PERALATAN','Peralatan & inventaris',48,'1500','1590','6300'),
 ('BANGUNAN','Bangunan & prasarana',240,'1500','1590','6300');

CREATE TABLE fixed_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_number varchar(40) NOT NULL UNIQUE,
  name varchar(200) NOT NULL,
  category_id uuid NOT NULL REFERENCES asset_categories(id),
  branch_id uuid REFERENCES branches(id),
  custodian_employee_id uuid REFERENCES employees(id),
  location varchar(160),
  source_document_id uuid REFERENCES business_documents(id),  -- GR/tagihan asal
  acquisition_date date NOT NULL,
  acquisition_cost numeric(20,2) NOT NULL CHECK (acquisition_cost > 0),
  salvage_value numeric(20,2) NOT NULL DEFAULT 0 CHECK (salvage_value >= 0),
  useful_life_months integer,                                  -- override kategori
  status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','FULLY_DEPRECIATED','DISPOSED')),
  disposed_at timestamptz,
  disposed_by uuid REFERENCES app_users(id),
  disposal_reason text,
  disposal_proceeds numeric(20,2),
  disposal_journal_id uuid REFERENCES business_documents(id),
  notes text,
  created_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (salvage_value < acquisition_cost)
);
CREATE INDEX ix_fixed_assets_status ON fixed_assets(status) WHERE status='ACTIVE';
CREATE INDEX ix_fixed_assets_category ON fixed_assets(category_id);

-- Penyusutan idempoten per aset per periode; append-only untuk role aplikasi.
CREATE TABLE asset_depreciation_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES fixed_assets(id) ON DELETE RESTRICT,
  period varchar(7) NOT NULL CHECK (period ~ '^\d{4}-\d{2}$'),
  amount numeric(20,2) NOT NULL CHECK (amount > 0),
  accumulated_after numeric(20,2) NOT NULL,
  journal_document_id uuid REFERENCES business_documents(id),
  created_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(asset_id, period)
);
CREATE INDEX ix_asset_depreciation_period ON asset_depreciation_entries(period);
REVOKE UPDATE, DELETE ON asset_depreciation_entries FROM mat_erp_app;

COMMIT;
