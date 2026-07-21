# IMPLEMENTATION BASELINE — MAT ERP V2

**Tanggal:** 2026-07-22 · **Versi:** 0.29.0 · **Commit:** 096e6c9 · **Lingkungan:** Windows 11, Node 24, PostgreSQL lokal AKTIF (berbeda dari lingkungan audit yang DB-nya mati).

## Ringkasan faktual

| Dimensi | Nilai terukur |
|---|---|
| Backend | 80 file JS, 8.960 LOC |
| Frontend | 19 file JS (3.841 LOC) + 2 CSS (765 LOC) |
| Test | 29 file, 2.702 LOC — **144/144 PASS** (lihat TEST_BASELINE.md) |
| Migrasi | 39 pasang up/down (77 file SQL), checksum + rollback-verify tersedia |
| Router HTTP | 14 bounded router, **195 handler**, 151 direct `assertPermission` |
| Permission literal | 76 kode unik |
| Job latar belakang | FILE_SCAN, GENERATE_PDF, PAYROLL_SLIPS, EXPORT_EXCEL, IMPORT_CSV, REPORT_GENERATE, NOTIFICATION_SEND, BACKUP_RUN, RECONCILIATION |
| Release builder | `scripts/build-release.js` → 297 file + manifest SHA-256 |
| Secret scan | 452 file, 0 temuan (dengan pengecualian .env/storage/dump — lihat SECURITY_EXPOSURE_BASELINE.md) |

## Perbedaan dokumentasi vs implementasi (blueprint §"Apabila dokumentasi berbeda")

1. **Audit menyatakan DB test BLOCKED (ECONNREFUSED)** — di lingkungan ini PostgreSQL aktif; seluruh 144 test termasuk integrasi PostgreSQL **benar-benar dijalankan dan lulus**. Klaim BLOCKED pada audit tidak berlaku lagi untuk baseline ini.
2. **Audit menyebut 17 dump** — faktual sekarang **18 dump** (backup run 2026-07-21 menambah satu). Semua di `storage/backups/`, **tidak ter-track git**, plaintext.
3. **Audit Organisasi/Finance ditulis untuk v0.28.1** — beberapa temuan sudah tertutup di v0.29.0 (mis. tarif pajak & peran akun sudah config-driven dengan cache; PPN historis 10%/11%).
4. **Blueprint P0 #15 "Migrate Branch-as-Warehouse"** vs Audit Operations yang menempatkannya di **P1** — source lebih akurat: migrasi ini menyentuh seluruh ledger inventory dan tidak aman dikerjakan sebagai stop-ship satu sesi. Diikuti klasifikasi audit Operations: **P1**, dengan scope-hardening opname/MRP tetap P0.
5. **Temuan baru saat baseline:** test `sprint8c-wave2` flaky pada jam 00:00–07:00 WIB karena `toISOString()` (UTC) dibandingkan dengan tanggal lokal Postgres. Diperbaiki (dueDate +2 hari). Pola `toISOString().slice(0,10)` dipakai luas di kode produksi — dicatat sebagai risiko integritas data ringan (deploy single-timezone) di ARCHITECTURE_CURRENT.md.

## Keputusan arsitektur baseline

- Modular Monolith + PostgreSQL **dipertahankan** (sesuai blueprint §2.1).
- Satu engine per fungsi **sudah** berlaku: satu router dispatcher, satu document engine, satu posting engine, satu audit trail, satu job queue, satu outbox. Tidak ditemukan renderer/router ganda.
- `business_documents` generik dipertahankan sebagai registry lifecycle; typed tables ditambah bertahap (P1+) sesuai blueprint §13.1.
