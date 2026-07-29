# Data Protection Matrix — MAT ERP V2

**Baseline:** v0.39.0 · migration 001–074 · 28 Juli 2026

Dokumen ini menetapkan kontrol berdasarkan risiko dan kebutuhan pemrosesan.
Enkripsi field diterapkan pada identifier yang tidak memerlukan aritmetika SQL.
Nilai keuangan yang harus dijumlahkan/direkonsiliasi tetap bertipe numerik dan
dilindungi dengan RLS, permission, masking, audit redaction, least privilege,
serta encrypted backup.

| Kelas data | Contoh | At-rest utama | Scope database | Disclosure aplikasi | Mutasi/evidence |
|---|---|---|---|---|---|
| Credential | password, recovery code | scrypt/hash satu arah | IAM permission | tidak pernah dikembalikan | audit tanpa secret |
| Runtime secret | DB/session/encryption key | environment secret | service account | tidak masuk API/log | rotation runbook |
| Rekening bank | company/supplier/employee | AES-256-GCM + blind index | RLS sesuai aggregate | mask kecuali role berizin | maker-checker + audit |
| Identifier personal | KTP, NPWP employee, BPJS | AES-256-GCM + blind index | employee branch RLS | mask tanpa payroll permission | audit `REDACTED` |
| Identifier organisasi | NPWP/NITKU/PKP/NIB resource | AES-256-GCM + blind index | legal-entity + branch RLS | organization permission | audit `REDACTED` |
| Restricted HR notes | medical/disciplinary/emergency notes | AES-256-GCM | employee branch RLS | employee edit permission | audit `REDACTED` |
| Salary/payroll numeric | salary, allowance, deduction, tax, net pay | encrypted volume/backup | employee branch RLS | payroll permission + masking | SoD, append-only, no DELETE |
| Financial statement | report snapshot, period, balances | encrypted volume/backup | legal-entity RLS | report permission | versioning/SoD, no DELETE |
| Tax transaction | tax base/amount/reconciliation | encrypted volume/backup | document branch RLS | tax/report permission | correction trail, no DELETE |
| General business document | quotation, PO, invoice, WO | encrypted volume/backup | branch RLS | module permission | optimistic lock + audit |

## Cryptographic contract

- AES-256-GCM memakai random IV dan authenticated additional data
  `purpose + scope`; ciphertext tidak dapat dipindah ke aggregate lain.
- Key ID disimpan bersama ciphertext; key material tidak disimpan di database.
- Blind index memakai HMAC key terpisah untuk equality/uniqueness.
- Production wajib memakai encryption key dan blind-index key yang berbeda.
- Rotasi dijalankan melalui `npm run security:rotate-fields`; constraint baru
  divalidasi hanya setelah backfill selesai.

## RLS contract

- Konteks `app.branch_id`, `app.cross_branch`, dan `app.is_system` selalu
  dipasang transaction-local.
- Tanpa konteks, akses gagal tertutup.
- Runtime role bukan table owner dan tidak memiliki `BYPASSRLS`.
- Employee dengan `branch_id IS NULL` tidak terlihat oleh user branch.
- System context hanya untuk background/maintenance path; cross-branch context
  hanya berasal dari role/scope yang diizinkan server.

## Gate verifikasi

```powershell
npm.cmd run db:validate
npm.cmd run security:fields-status
npm.cmd run security:data-audit
node --test test/security-data-protection.test.js
```

`security:data-audit` harus menghasilkan:

- 31/31 tabel RLS aktif dan memiliki policy;
- runtime ownership 0 dan `BYPASSRLS=false`;
- empat constraint identifier tervalidasi;
- plaintext KTP/NPWP/BPJS/organization tax = 0;
- sembilan histori sensitif tidak memiliki `DELETE/TRUNCATE`.

Kontrol engineering ini tidak menggantikan manual security UAT, review akses
berkala, DR/offsite evidence, atau Owner production sign-off.
