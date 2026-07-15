# Skema PostgreSQL MAT ERP V2

## Migration

| File | Ruang lingkup |
|---|---|
| `001_core_foundation.sql` | branch, user, dokumen berversi, idempotency, audit, file metadata |
| `002_business_modules.sql` | master, lines, inventory, accounting, payroll, tax, session, job |
| `003_runtime_security.sql` | RBAC/ABAC user, MFA, indeks dan constraint security |
| `004_transaction_runtime.sql` | sequence atomic, auth pending, outbox, approval state |
| `005_persistent_jobs.sql` | priority, lease, retry, recovery, claim index |
| `006_auth_challenges.sql` | payload challenge MFA/password dan indeks expiry |
| `007_transaction_ledgers.sql` | posting marker, default stock partition, COA, ledger constraints |
| `008_enterprise_operations.sql` | relasi dokumen, setting persisten, private artifact, delivery, backup restore metadata |
| `009_finance_hr_operations.sql` | payment allocation audit, attendance, leave balance, payroll component, bank reconciliation, import batch, akun finance/HR |
| `010_employee_self_service.sql` | tautan unik user–employee untuk isolasi attendance, leave, payroll, dan slip pribadi |
| `011_audit_partition_lifecycle.sql` | partisi audit 2027–2031 + DEFAULT + fungsi maintenance otomatis (tutup bom waktu 2027) |
| `012_enterprise_organization.sql` | legal entity, business unit, department, cost/profit center, plant, warehouse mandiri, storage location, bin, work center, project WBS, fiscal calendar, ledger + dimensi akuntansi pada dokumen |
| `013_enterprise_master_data.sql` | lifecycle MDM 4 master + 13 sub-tabel employee + customer contacts/addresses/harga + supplier bank maker-checker/materials/price history/evaluasi + product variant/UoM/BOM revision/HPP versioning |
| `014_branch_aware_numbering.sql` | konfigurasi penomoran ber-versi; format branch-aware {DOC}-{BRANCH}-{MMYY}-{SEQ} |
| `015_r012_runtime_hardening.sql` | environment/runtime hardening, session CSRF grace, job policy snapshot, file scanner metadata, dan scope organisasi |
| `016_enterprise_iam_sod_approval.sql` | 13 enterprise roles, role assignment maker-checker/effective-dated, SoD rules/events, emergency override, access review, approval policy version, dan snapshot policy dokumen |
| `017_enterprise_organization_employee.sql` | identitas organisasi versioned, asset/signatory/tax registry, company-bank maker-checker, MFA step-up session, snapshot identitas dokumen, employee compensation/payroll-bank approval, claim history, dan restricted records |

Semua migration memiliki checksum yang diverifikasi saat startup. Runtime gagal
menyala bila migration terbaru belum aktif.

## Pola transaksi

- UUID sebagai primary key.
- Nomor dokumen unik `PREFIX-MMYY-SEQ3` dari sequence atomic.
- `version` untuk optimistic locking; stale update menghasilkan HTTP 409.
- Mutasi kritis menggunakan idempotency record dan advisory lock.
- Audit bersifat append-only; role aplikasi tidak memiliki UPDATE/DELETE.
- Event domain ditulis ke outbox pada transaction yang sama.
- Role efektif berasal dari `user_role_assignments` primary yang aktif dan
  masih dalam masa berlaku; expiry mencabut sesi secara otomatis.
- Approval policy diselesaikan saat submit dan disalin ke
  `business_documents.approval_policy_snapshot` sebagai histori immutable.
- Identitas legal, rekening terverifikasi, serta penandatangan aktif disalin ke
  `business_documents.organization_identity_snapshot` pada saat dokumen dibuat.

## Runtime

`MAT_DB_MODE=postgres` memakai pool user `mat_erp_app` yang bukan superuser,
tidak dapat membuat database/role/schema, dan hanya terhubung ke localhost.
Adapter in-memory hanya aktif dalam automated test terisolasi.
