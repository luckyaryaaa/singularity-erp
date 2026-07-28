# Test Evidence — v0.36.0

**Basis:** review/codex-claude-consolidation · migrasi 001–066 · PostgreSQL live.
Seluruh angka di bawah dijalankan pada working tree yang identik dengan rilis.

## Gate agregat

| Gate | Hasil |
|---|---|
| `npm run predeploy` (LOCAL) | **14/14 hijau, exit 0** |
| Suite tes otomatis terisolasi | **326/326** |
| Migrasi + checksum (001–066) | valid |
| Rollback drill | 66 → 65 → 64 → 63 aman |
| Visual desktop + mobile | lulus, tanpa overflow/console error |
| Aksesibilitas statis | 18/18 |
| Secret scan | 0 temuan |
| Dependency audit | 0 vulnerability (high) |
| Backup + restore drill | terenkripsi, checksum valid, drill sukses |

## Bukti scoped per-wave (dijalankan saat konsolidasi)

| Wave / temuan | Test | Hasil |
|---|---|---|
| 063 + 066 | `sec-uat-001-password-reset`, `wave14-data-retention`, `postgres-auth.integration` | **13/13** |
| 064 | `wave12-execution-hardening`, `wave9-capacity-wip`, `wave10-capa-calibration`, `sprint12-production` | **23/23** |
| 065 | `wave13-field-encryption` | **4/4** |
| G1–G6 | `authorization-matrix` (6), `p0-rls-tranche1` (9), `branch-isolation` (4) | **19/19** |
| HTTP e2e | `postgres.http` | **5/5** |
| OpenAPI/docs | `sprint15-docs` | **15/15** |

## Bukti G1 — RLS pada PostgreSQL live

`test/p0-rls-tranche1.test.js` (9/9, 0 skipped) membuktikan pada database nyata:
- **Isolasi cabang:** pengguna cabang A tidak melihat/menulis record cabang B;
- **Fail-closed:** tanpa konteks, 0 baris terbaca;
- **Isolasi pool:** koneksi bekas pengguna sistem/global tidak bocor ke pengguna
  normal berikutnya; konteks tidak bertahan setelah commit/rollback/exception;
- **App-layer:** pengguna cabang tidak dapat eskalasi lewat `branchId` request.

Ditambah `test/branch-isolation.test.js` (4/4) membuktikan penolakan IDOR lintas
cabang pada jalur HTTP nyata melalui dispatcher yang sudah diperbaiki.

## Catatan
Angka ini adalah bukti **rekayasa**. Bukti **manusia** (UAT 13 role,
rekonsiliasi, DR RTO/RPO, Owner sign-off) belum termasuk dan tidak boleh
digantikan hasil otomatis — lihat [../uat/UAT_RETEST_RESULTS.md](../uat/UAT_RETEST_RESULTS.md).
