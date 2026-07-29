# Test Evidence — v0.39.0

**Basis:** `review/codex-claude-consolidation` · migration 001–074 ·
PostgreSQL 16 lokal. Seluruh bukti dijalankan 28 Juli 2026.

## Gate agregat

| Gate | Hasil |
|---|---|
| Suite regresi utama | **363/363 PASS** |
| Suite regresi database disposable | **363/363 PASS** |
| Migration + checksum | **001–074 valid/applied** |
| Rollback disposable | **74 up, 73 down, 73 re-up PASS** |
| Authorization matrix | **14 router, 291 handler PASS** |
| Visual desktop + mobile | **52/52 PASS** (26 halaman × 2 viewport) |
| Visual quality | overflow 0, unlabeled button 0, console error 0 |
| Accessibility static | **18/18 PASS** |
| Secret scan repository | **936 file, 0 finding** |
| Release artifact | **v0.39.0, 427 file, migration 074, integrity finding 0** |
| Backup + restore disposable | encrypted/checksum valid, **208 tabel**, migration 074 |
| Runtime database role | `mat_erp_app` non-superuser, minimum runtime grants |
| Predeploy LOCAL | **14/15 PASS**; hanya live npm advisory lookup tertahan sandbox/usage approval |

## Bukti Finance End-to-End

| Area | Bukti | Hasil |
|---|---|---|
| HARD coding block | `test/finance-end-to-end-closure.test.js`, `test/wave15-journal-dimensions.test.js` | PASS |
| Automatic posting dimensions | Sprint 9/11 dan Wave 11 regression | **20/20 PASS** |
| Reconciliation evidence | prepare/approve, SoD, immutable snapshot | PASS |
| Period-close package | missing/unapproved/NOT_RUN/hash invalid fail-closed; six evidence frozen; reopen lifecycle | PASS |
| Financial reports | prepare/review/sign-off, period CLOSED, balance/hash | PASS |
| Authorization | route matrix allow/deny dan public allowlist | **291 handler PASS** |
| Data protection | RLS, encryption, plaintext, runtime grants | **31/31 RLS; 0 plaintext; 9 history protected** |

## Bukti visual v7

Empat workbench Finance baru menjadi cakupan wajib:

- `#/accounting` — `.process-rail` dan Coding Block Control;
- `#/tax` — Tax Reconciliation Workbench;
- `#/accounting/statements` — Official Financial Statements;
- `#/accounting/closing` — Closing Cockpit dan close evidence.

Semuanya lulus pada desktop 1440×1000 dan mobile 390×844, tanpa horizontal
overflow, visible button tanpa accessible name, error state, atau console error.

## Isolated UAT technical gate

Database `mat_erp_v2_gate_uat` diprovision fresh, migration 001–074 diterapkan,
field rotation dan runtime grants dijalankan, UAT seed dimuat, opening inventory
direkonsiliasi, backup terenkripsi dibuat, restore disposable mengembalikan 208
tabel, lalu 363 test lulus. Database gate dihapus setelah selesai.

Penyalinan backup ke `C:\MAT-ERP-Offsite` ditolak environment lokal (`EPERM`);
backup lokal terenkripsi dan restore test tetap lulus. Ini bukan bukti offsite
immutable production.

Seluruh kontrol predeploy lokal selain live `npm audit` lulus: accessibility,
visual, environment, secret scan, migration, data protection, release/SBOM,
isolated regression, load smoke, LAN load 10/25 user, health, runtime controls,
final assurance, dan backup freshness. Permintaan registry eksternal tidak
dapat diotorisasi pada sesi ini; hasil advisory terkini tidak diklaim.

## Batas klaim

Angka ini merupakan bukti **engineering**. Bukti manusia—UAT 13 role,
persetujuan aktual enam rekonsiliasi, training, SEC-UAT-001 retest, actual
RTO/RPO, offsite evidence, dan Owner sign-off—belum digantikan automation.
