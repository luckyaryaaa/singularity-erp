# Hasil Retest UAT — v0.36.0

**Basis:** review/codex-claude-consolidation · migrasi 001–066 · 2026-07-28.
Dokumen ini memisahkan **bukti otomatis (selesai)** dari **gate manusia
(menunggu operator)**. Automation tidak boleh menutup gate manusia.

## A. Bukti otomatis — LULUS

| Gate | Hasil | Bukti |
|---|---|---|
| Predeploy LOCAL | **14/14 hijau, exit 0** | `npm run predeploy` |
| Regresi terisolasi | **326/326** | `npm run test:uat:isolated` |
| Migrasi + checksum | 001–066 valid | `db:validate` |
| Rollback drill | 66 → 65 → 66 aman | predeploy |
| Visual desktop+mobile | lulus (MFA-aware) | `test:visual` |
| Aksesibilitas | 18/18 | `test:a11y` |
| Secret scan | 0 temuan | `security:scan` |
| Backup + restore drill | terenkripsi, drill sukses | predeploy |
| SEC-UAT-001 (otomatis) | maker-checker, SoD, token/recovery sekali pakai, DENY teraudit — **PASS** | `test/sec-uat-001-password-reset.test.js`, `test/postgres.http.test.js` |
| RLS G1 (live PostgreSQL) | isolasi cabang, fail-closed, isolasi pool — **PASS** | `test/p0-rls-tranche1.test.js`, `test/branch-isolation.test.js` |

## B. Gate manusia — MENUNGGU (belum boleh ditandai selesai)

| Gate | Status | Penanggung jawab |
|---|---|---|
| SEC-UAT-001 retest manual (5 skenario §2 plan) | ⬜ PENDING | Security Admin + Owner |
| UAT 13 role end-to-end | ⬜ PENDING | Tim UAT |
| Rekonsiliasi TB/AR/AP/INV/PAYROLL/TAX + approval | ⬜ PENDING | Finance |
| Training attendance 13 role | ⬜ PENDING | HRD |
| Restore drill RTO/RPO aktual | ⬜ PENDING | Ops |
| Owner final sign-off | ⬜ PENDING | Owner |
| Backup offsite immutable (saat ini `EPERM`) | ⬜ PENDING | Infra |

## C. Cara menutup

1. Jalankan §2 [UAT_RETEST_PLAN.md](UAT_RETEST_PLAN.md), isi `retestEvidence` +
   `closedBy` pada `ISSUE_REGISTER.json`, status → `CLOSED`.
2. Lengkapi JSON evidence (`UAT_RESULTS`, `RECONCILIATION`, `TRAINING_ATTENDANCE`,
   `RESTORE_DRILL`, `FINAL_SIGNOFF`).
3. `npm run uat:validate` (mode final) harus hijau.

> **Label saat ini: Enterprise Engineering In Progress — belum production-ready.**
> Bukti otomatis lengkap; penutupan menunggu tanda tangan manusia di atas.
