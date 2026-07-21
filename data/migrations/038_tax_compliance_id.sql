BEGIN;
-- ═══════════════════════════════════════════════════════════════════════════
-- Kepatuhan pajak Indonesia (Prioritas 3): register NSFP + Faktur Pajak
-- keluaran + bukti potong PPh. Seluruh tarif/kode TIDAK di-hardcode (§35):
-- tarif diambil dari baris dokumen, kode transaksi & jenis PPh dari tabel
-- konfigurasi di bawah sehingga dapat mengikuti perubahan regulasi.
-- ═══════════════════════════════════════════════════════════════════════════

-- Jatah Nomor Seri Faktur Pajak yang diberikan DJP.
CREATE TABLE tax_number_ranges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_entity_id uuid REFERENCES legal_entities(id),
  dgt_letter_number varchar(60) NOT NULL,           -- nomor surat pemberian NSFP
  prefix varchar(10) NOT NULL,                      -- mis. '001-26'
  serial_start bigint NOT NULL CHECK (serial_start > 0),
  serial_end bigint NOT NULL,
  next_serial bigint NOT NULL,                      -- kursor pemakaian (gapless)
  issued_date date NOT NULL DEFAULT current_date,
  status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','EXHAUSTED','REVOKED')),
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id),
  CHECK (serial_end >= serial_start),
  CHECK (next_serial >= serial_start AND next_serial <= serial_end + 1),
  UNIQUE (prefix, serial_start)
);
CREATE INDEX ix_tax_ranges_active ON tax_number_ranges(status, prefix) WHERE status = 'ACTIVE';

-- Kode transaksi Faktur Pajak (config-driven, bukan hardcode di kode program).
CREATE TABLE tax_transaction_codes (
  code char(2) PRIMARY KEY,
  name varchar(120) NOT NULL,
  description text,
  requires_buyer_npwp boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true
);
INSERT INTO tax_transaction_codes(code,name,description,requires_buyer_npwp) VALUES
 ('01','Kepada pihak yang bukan Pemungut PPN','Penyerahan yang terutang PPN dan PPN-nya dipungut oleh PKP Penjual.',true),
 ('02','Kepada Pemungut Bendaharawan','PPN dipungut oleh Pemungut Bendaharawan Pemerintah.',true),
 ('03','Kepada Pemungut Selain Bendaharawan','PPN dipungut oleh Pemungut PPN selain bendaharawan.',true),
 ('04','DPP Nilai Lain','Penyerahan yang memakai DPP Nilai Lain.',true),
 ('07','Penyerahan Tidak Dipungut/Ditanggung Pemerintah','PPN tidak dipungut atau ditanggung pemerintah.',true),
 ('08','Penyerahan Dibebaskan','Penyerahan yang dibebaskan dari pengenaan PPN.',true);

-- Faktur Pajak keluaran atas dokumen INVOICE.
CREATE TABLE tax_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES business_documents(id),
  range_id uuid REFERENCES tax_number_ranges(id),
  transaction_code char(2) NOT NULL REFERENCES tax_transaction_codes(code),
  replacement_ordinal smallint NOT NULL DEFAULT 0,  -- 0 = normal, 1..9 = pengganti ke-n
  prefix varchar(10) NOT NULL,
  serial bigint NOT NULL,
  fp_number varchar(30) NOT NULL,                   -- tampilan mis. 010.001-26.00000001
  fp_date date NOT NULL,
  period char(7) NOT NULL,
  seller_npwp varchar(30), seller_name varchar(200),
  buyer_npwp varchar(30), buyer_nik varchar(20),
  buyer_name varchar(200) NOT NULL, buyer_address text,
  dpp numeric(20,2) NOT NULL DEFAULT 0,             -- dasar pengenaan pajak
  ppn numeric(20,2) NOT NULL DEFAULT 0,
  ppnbm numeric(20,2) NOT NULL DEFAULT 0,
  status varchar(20) NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED','REPLACED','CANCELLED')),
  replaces_id uuid REFERENCES tax_invoices(id),
  reported_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id),
  CHECK (dpp >= 0 AND ppn >= 0)
);
-- Nomor faktur wajib unik mutlak; satu dokumen hanya boleh punya satu FP aktif.
CREATE UNIQUE INDEX ux_tax_invoices_number ON tax_invoices(fp_number);
CREATE UNIQUE INDEX ux_tax_invoices_serial ON tax_invoices(prefix, serial, replacement_ordinal);
CREATE UNIQUE INDEX ux_tax_invoices_active_doc ON tax_invoices(document_id) WHERE status = 'ISSUED';
CREATE INDEX ix_tax_invoices_period ON tax_invoices(period, status);

-- Bukti potong PPh (e-Bupot) atas tagihan supplier / jasa.
CREATE TABLE withholding_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES business_documents(id),
  certificate_number varchar(40) NOT NULL,
  tax_type varchar(20) NOT NULL CHECK (tax_type IN ('PPH21','PPH23','PPH26','PPH_FINAL','PPH22')),
  object_code varchar(20),                          -- kode objek pajak (mis. 24-104-01)
  partner_npwp varchar(30), partner_nik varchar(20),
  partner_name varchar(200) NOT NULL,
  gross_amount numeric(20,2) NOT NULL CHECK (gross_amount >= 0),
  rate_pct numeric(7,4) NOT NULL CHECK (rate_pct >= 0),
  tax_amount numeric(20,2) NOT NULL CHECK (tax_amount >= 0),
  certificate_date date NOT NULL DEFAULT current_date,
  period char(7) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED','CANCELLED')),
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id)
);
CREATE UNIQUE INDEX ux_withholding_number ON withholding_certificates(certificate_number);
CREATE INDEX ix_withholding_period ON withholding_certificates(period, tax_type, status);

COMMIT;
