BEGIN;

-- 104 · Re-scope blind-index PII unique per tenant (multi-tenant correctness).
--
-- Tiga unique index blind-index PII pegawai masih GLOBAL (tanpa tenant_id):
-- NIK KTP (employee_personal_profiles), NPWP (employee_tax_profiles), BPJS
-- (employee_bpjs_profiles). Akibatnya dua tenant (dua perusahaan) TAK BISA
-- sama-sama mempekerjakan orang ber-NIK/NPWP/BPJS sama — gagal duplicate key.
--
-- Re-scope ke (tenant_id, …). HMAC blind-index tetap global (nilai sama lintas
-- tenant) — TAPI aman: pencarian tetap ter-scope tenant lewat RLS, dan keunikan
-- kini per-tenant. Karena hanya index yang berubah (bukan nilai), TANPA
-- re-enkripsi/backfill. Sejalan pola re-scope unique 097/100/103.
-- (Blind-index bank & organization tax sudah ter-scope lewat parent FK tenant.)

DROP INDEX IF EXISTS ux_employee_personal_nik_ktp_blind;
CREATE UNIQUE INDEX ux_employee_personal_nik_ktp_blind
  ON employee_personal_profiles(tenant_id, nik_ktp_blind_index)
  WHERE nik_ktp_blind_index IS NOT NULL;

DROP INDEX IF EXISTS ux_employee_tax_npwp_blind;
CREATE UNIQUE INDEX ux_employee_tax_npwp_blind
  ON employee_tax_profiles(tenant_id, npwp_blind_index)
  WHERE npwp_blind_index IS NOT NULL AND effective_to IS NULL;

DROP INDEX IF EXISTS ux_employee_bpjs_membership_blind;
CREATE UNIQUE INDEX ux_employee_bpjs_membership_blind
  ON employee_bpjs_profiles(tenant_id, program, membership_number_blind_index)
  WHERE membership_number_blind_index IS NOT NULL;

COMMIT;
