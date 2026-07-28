BEGIN;
-- 068 — Wave D.2: peran akun pajak untuk rekonsiliasi GL ↔ subledger pajak.
--
-- MAT memakai SATU akun pajak konsolidasi ('2300' Utang Pajak) untuk PPN
-- keluaran (PPN_OUTPUT) maupun PPh potongan (PPH21). Rekonsiliasi pajak
-- membandingkan akrual subledger (tax_records) dengan akrual GL pada akun itu.
-- Peran semantik TAX_PAYABLE memetakan rekonsiliasi ke akun tanpa me-hardcode
-- kode COA di query laporan (§35, effective-dated).

INSERT INTO account_roles(role_key, account_code, description, effective_from)
SELECT 'TAX_PAYABLE', '2300', 'Utang pajak konsolidasi (PPN keluaran + PPh potongan)', '2000-01-01'
WHERE NOT EXISTS (SELECT 1 FROM account_roles WHERE role_key = 'TAX_PAYABLE');

COMMIT;
