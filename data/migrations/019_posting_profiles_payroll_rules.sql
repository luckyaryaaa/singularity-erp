-- 019_posting_profiles_payroll_rules.sql — Sprint 13/14 (R020 §18.2 + R021 §19.5/§20.3).
-- Menghapus account determination & tarif payroll yang hardcoded (§35 "dilarang"):
-- posting akun kini dari posting_profiles configuration-driven + effective-dated,
-- tarif BPJS/PTKP/PPh21 dari payroll_rule_versions ber-versi. Keduanya di-snapshot
-- ke jurnal & payroll_items agar histori tidak berubah saat konfigurasi diperbarui.
BEGIN;

-- ── Posting profiles (account determination, §18.2) ──────────────────────────
CREATE TABLE posting_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(40) NOT NULL,
  transaction_type varchar(40) NOT NULL,            -- INVOICE, CUSTOMER_PAYMENT, PAYROLL_RUN, ...
  item_category varchar(40) NOT NULL DEFAULT '*',   -- kategori item/expense; '*' = default
  legal_entity_id uuid REFERENCES legal_entities(id),
  branch_id uuid REFERENCES branches(id),
  priority integer NOT NULL DEFAULT 100,            -- makin kecil makin spesifik/menang
  version integer NOT NULL DEFAULT 1,
  -- Default awal tahun berjalan agar seluruh periode tahun ini teresolusi.
  effective_from date NOT NULL DEFAULT make_date(EXTRACT(YEAR FROM current_date)::int,1,1),
  effective_until date,
  active boolean NOT NULL DEFAULT true,
  description text,
  created_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (effective_until IS NULL OR effective_until >= effective_from)
);
CREATE INDEX ix_posting_profiles_lookup ON posting_profiles(transaction_type, item_category, active);

-- Kaki jurnal per profile (mendukung 2-leg invoice s.d. 5-leg payroll).
CREATE TABLE posting_profile_legs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES posting_profiles(id) ON DELETE CASCADE,
  leg_no integer NOT NULL,
  side char(1) NOT NULL CHECK (side IN ('D','C')),
  account_code varchar(20) NOT NULL,
  -- Sumber nilai kaki: dihitung mesin posting dari dokumen.
  amount_source varchar(20) NOT NULL DEFAULT 'AMOUNT'
    CHECK (amount_source IN ('AMOUNT','NET','TAX','BPJS_COMPANY','BPJS_EMPLOYEE','GROSS','DEDUCTION')),
  memo_suffix varchar(80),
  UNIQUE(profile_id, leg_no)
);

-- ── Payroll rule versions (tarif effective-dated, §19.5/§20.3) ───────────────
CREATE TABLE payroll_rule_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type varchar(20) NOT NULL CHECK (rule_type IN ('BPJS','PTKP','PPH21','OVERTIME','ABSENCE')),
  version integer NOT NULL DEFAULT 1,
  -- Default awal tahun berjalan agar payroll periode mana pun di tahun ini teresolusi.
  effective_from date NOT NULL DEFAULT make_date(EXTRACT(YEAR FROM current_date)::int,1,1),
  effective_until date,
  active boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL,                             -- {employeePct, companyPct} / {annual} / {rate} / {divisor}
  description text,
  created_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(rule_type, version),
  CHECK (effective_until IS NULL OR effective_until >= effective_from)
);
CREATE INDEX ix_payroll_rules_lookup ON payroll_rule_versions(rule_type, active, effective_from);

-- Snapshot aturan yang dipakai saat kalkulasi (histori immutable).
ALTER TABLE payroll_items ADD COLUMN rule_snapshot jsonb;

-- Snapshot profile posting yang dipakai (histori immutable) pada jurnal sumber.
ALTER TABLE business_documents ADD COLUMN posting_profile_snapshot jsonb;

-- ── Seed parity: profil = perilaku hardcoded lama, tarif = nilai lama ────────
-- Posting profiles (2-leg untuk transaksi standar).
DO $$
DECLARE p uuid;
BEGIN
  -- INVOICE: D Piutang (1200) / C Pendapatan (4100)
  INSERT INTO posting_profiles(code,transaction_type,description) VALUES('INVOICE-DEFAULT','INVOICE','Pengakuan piutang & pendapatan') RETURNING id INTO p;
  INSERT INTO posting_profile_legs(profile_id,leg_no,side,account_code,amount_source) VALUES (p,1,'D','1200','AMOUNT'),(p,2,'C','4100','AMOUNT');
  -- CUSTOMER_PAYMENT: D Kas (1100) / C Piutang (1200)
  INSERT INTO posting_profiles(code,transaction_type,description) VALUES('CUSTPAY-DEFAULT','CUSTOMER_PAYMENT','Penerimaan pembayaran pelanggan') RETURNING id INTO p;
  INSERT INTO posting_profile_legs(profile_id,leg_no,side,account_code,amount_source) VALUES (p,1,'D','1100','AMOUNT'),(p,2,'C','1200','AMOUNT');
  -- SUPPLIER_INVOICE: D Beban (6100) / C Utang (2100)
  INSERT INTO posting_profiles(code,transaction_type,description) VALUES('SUPPINV-DEFAULT','SUPPLIER_INVOICE','Pengakuan beban & utang') RETURNING id INTO p;
  INSERT INTO posting_profile_legs(profile_id,leg_no,side,account_code,amount_source) VALUES (p,1,'D','6100','AMOUNT'),(p,2,'C','2100','AMOUNT');
  -- SUPPLIER_PAYMENT: D Utang (2100) / C Kas (1100)
  INSERT INTO posting_profiles(code,transaction_type,description) VALUES('SUPPPAY-DEFAULT','SUPPLIER_PAYMENT','Pembayaran ke supplier') RETURNING id INTO p;
  INSERT INTO posting_profile_legs(profile_id,leg_no,side,account_code,amount_source) VALUES (p,1,'D','2100','AMOUNT'),(p,2,'C','1100','AMOUNT');
  -- EXPENSE: D Beban (6100) / C Kas (1100)
  INSERT INTO posting_profiles(code,transaction_type,description) VALUES('EXPENSE-DEFAULT','EXPENSE','Pengeluaran operasional') RETURNING id INTO p;
  INSERT INTO posting_profile_legs(profile_id,leg_no,side,account_code,amount_source) VALUES (p,1,'D','6100','AMOUNT'),(p,2,'C','1100','AMOUNT');
  -- PAYROLL_RUN: 5-leg (D beban gaji net+pph, D beban BPJS perusahaan, C utang gaji, C utang pajak, C utang BPJS)
  INSERT INTO posting_profiles(code,transaction_type,description) VALUES('PAYROLL-DEFAULT','PAYROLL_RUN','Posting payroll multi-kaki') RETURNING id INTO p;
  INSERT INTO posting_profile_legs(profile_id,leg_no,side,account_code,amount_source) VALUES
    (p,1,'D','6200','NET'),(p,2,'D','6200','TAX'),(p,3,'D','6210','BPJS_COMPANY'),
    (p,4,'C','2200','NET'),(p,5,'C','2300','TAX'),(p,6,'C','2400','BPJS_COMPANY');
END $$;

-- Payroll rule versions (nilai identik dengan kalkulasi lama = parity).
INSERT INTO payroll_rule_versions(rule_type,config,description) VALUES
  ('BPJS', '{"employeePct":0.01,"companyPct":0.04}', 'BPJS: potongan karyawan 1%, iuran perusahaan 4% dari gaji pokok'),
  ('PTKP', '{"annualExempt":4500000}', 'Pengurang tidak kena pajak per periode (setara PTKP bulanan TK/0)'),
  ('PPH21', '{"flatRate":0.05}', 'PPh 21 estimasi tarif rata 5% atas dasar kena pajak'),
  ('OVERTIME', '{"divisor":173}', 'Upah lembur per jam = gaji pokok / 173'),
  ('ABSENCE', '{"divisor":22}', 'Potongan absen per hari = gaji pokok / 22');

COMMIT;
