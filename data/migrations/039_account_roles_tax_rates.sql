BEGIN;
-- ═══════════════════════════════════════════════════════════════════════════
-- §35 — hapus aturan keuangan yang ter-hardcode di kode program.
--
-- 1) account_roles : peran semantik akun (KAS, PIUTANG, PERSEDIAAN, ...) →
--    kode akun COA. Sebelumnya laporan/rekonsiliasi menulis '1100'/'1300'
--    langsung di query sehingga perusahaan dengan bagan akun berbeda salah
--    hitung tanpa peringatan.
-- 2) tax_rates    : tarif pajak effective-dated. Sebelumnya fallback PPN
--    memakai konstanta 1.11 (11%) di dalam SQL.
-- Keduanya effective-dated agar perubahan regulasi/bagan akun tidak merusak
-- angka periode lampau.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE account_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key varchar(40) NOT NULL,
  account_code varchar(20) NOT NULL,
  legal_entity_id uuid REFERENCES legal_entities(id),
  description text,
  effective_from date NOT NULL DEFAULT make_date(EXTRACT(YEAR FROM current_date)::int,1,1),
  effective_until date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id),
  CHECK (effective_until IS NULL OR effective_until >= effective_from)
);
-- Satu peran hanya boleh punya satu pemetaan aktif per tanggal mulai.
CREATE UNIQUE INDEX ux_account_roles_key ON account_roles(role_key, effective_from)
  WHERE active AND legal_entity_id IS NULL;
CREATE INDEX ix_account_roles_lookup ON account_roles(role_key, effective_from DESC) WHERE active;

INSERT INTO account_roles(role_key,account_code,description,effective_from) VALUES
 ('CASH_BANK','1100','Kas & bank — dipakai posisi kas cockpit dan arus kas.','2000-01-01'),
 ('AR_CONTROL','1200','Piutang usaha — akun kontrol rekonsiliasi subledger AR.','2000-01-01'),
 ('INVENTORY','1300','Persediaan — akun kontrol rekonsiliasi stok.','2000-01-01'),
 ('AP_CONTROL','2100','Utang usaha — akun kontrol rekonsiliasi subledger AP.','2000-01-01'),
 ('RETAINED_EARNINGS','3900','Laba ditahan — lawan selisih cut-over saldo awal.','2000-01-01'),
 ('PAYROLL_EXPENSE','6200','Beban gaji — rekonsiliasi payroll ke GL.','2000-01-01');

CREATE TABLE tax_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_key varchar(30) NOT NULL,                     -- PPN, PPH23, PPH21, ...
  rate_pct numeric(7,4) NOT NULL CHECK (rate_pct >= 0),
  description text,
  effective_from date NOT NULL,
  effective_until date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id),
  CHECK (effective_until IS NULL OR effective_until >= effective_from)
);
CREATE UNIQUE INDEX ux_tax_rates_key ON tax_rates(tax_key, effective_from) WHERE active;
CREATE INDEX ix_tax_rates_lookup ON tax_rates(tax_key, effective_from DESC) WHERE active;

-- Riwayat tarif PPN Indonesia agar periode lampau tetap dihitung benar.
INSERT INTO tax_rates(tax_key,rate_pct,description,effective_from,effective_until) VALUES
 ('PPN',10.0000,'PPN 10% sebelum UU HPP.','2000-01-01','2022-03-31'),
 ('PPN',11.0000,'PPN 11% sesuai UU HPP berlaku 1 April 2022.','2022-04-01',NULL);

COMMIT;
