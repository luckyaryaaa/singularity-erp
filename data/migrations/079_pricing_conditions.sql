BEGIN;
-- 079 — Advanced pricing condition engine (Stage 1) — §8.2.
--
-- Sampai kini harga jual diisi MANUAL per baris (document_lines.unit_price +
-- discount_pct), lalu sales_margin_policies hanya memeriksa margin hasilnya
-- terhadap minimum. Tidak ada penentuan harga otomatis: price list per
-- pelanggan/produk, skala kuantitas, diskon/surcharge ber-validity, atau
-- prioritas kondisi.
--
-- Tabel ini menyimpan CONDITION RECORDS (pola SAP-SD ringkas). Resolver server
-- (sales-pricing.js) menentukan base price + diskon/surcharge yang berlaku untuk
-- (legal entity, pelanggan, produk, qty, tanggal) — server-authoritative, tidak
-- mempercayai klien. Rebate dan komisi adalah stage berikutnya.

CREATE TABLE pricing_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_entity_id uuid NOT NULL REFERENCES legal_entities(id),
  condition_type varchar(16) NOT NULL
    CHECK (condition_type IN ('BASE_PRICE','DISCOUNT_PCT','DISCOUNT_AMT','SURCHARGE_PCT')),
  -- Dimensi cakupan — minimal satu terisi. Semakin spesifik (pelanggan+produk)
  -- semakin diutamakan pada resolusi.
  product_id uuid REFERENCES products(id),
  party_id uuid,                 -- business partner (tanpa FK: party lintas era)
  product_category varchar(80),  -- cocok dengan products.category
  min_qty numeric(16,4) NOT NULL DEFAULT 0 CHECK (min_qty >= 0),  -- skala kuantitas
  amount numeric(16,4) NOT NULL, -- BASE_PRICE: harga; _PCT: persen; _AMT: nilai/unit
  currency varchar(3) NOT NULL DEFAULT 'IDR',
  priority integer NOT NULL DEFAULT 0,  -- lebih tinggi = diutamakan
  effective_from date NOT NULL,
  effective_to date,
  status varchar(10) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  notes text,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES app_users(id),
  CONSTRAINT pricing_conditions_scope CHECK (
    product_id IS NOT NULL OR party_id IS NOT NULL OR product_category IS NOT NULL),
  CONSTRAINT pricing_conditions_validity CHECK (
    effective_to IS NULL OR effective_to >= effective_from),
  -- Persentase wajar; nilai negatif tidak masuk akal untuk kondisi ini.
  CONSTRAINT pricing_conditions_amount CHECK (
    amount >= 0 AND (condition_type NOT LIKE '%_PCT' OR amount <= 100))
);

-- Resolusi harga: cari kondisi aktif per legal entity + produk/pelanggan/kategori.
CREATE INDEX ix_pricing_conditions_resolve
  ON pricing_conditions(legal_entity_id, condition_type, status, effective_from);
CREATE INDEX ix_pricing_conditions_product
  ON pricing_conditions(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX ix_pricing_conditions_party
  ON pricing_conditions(party_id) WHERE party_id IS NOT NULL;

COMMIT;
