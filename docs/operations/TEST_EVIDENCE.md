# Test Evidence — v0.47.0

**Basis:** `review/codex-claude-consolidation` · migration 001–082 ·
PostgreSQL 16 lokal · dijalankan 29 Juli 2026.

## Gate agregat

| Gate | Hasil |
|---|---|
| Suite regresi utama/final fresh | **408/408 PASS** |
| Suite regresi database disposable | **408/408 PASS** |
| Migration + checksum | **001–082 valid/applied** |
| Rollback disposable | **82 up, 81 down, 81 re-up PASS** |
| Authorization matrix | **14 router, 319 handler PASS** |
| Visual desktop + mobile | **64/64 PASS** (32 halaman × 2 viewport) |
| Visual quality | body overflow 0, unlabeled button 0, console error 0 |
| Accessibility static | **18/18 PASS** |
| Secret scan repository | **1.038 file, 0 finding** |
| Release artifact | **v0.47.0, 460 packaged file, 461 scanned, migration 082, integrity finding 0** |
| Backup + restore disposable | encrypted/checksum valid, **219 tabel**, migration 082 |
| Runtime database role | `mat_erp_app` non-superuser, minimum runtime grants |
| Predeploy LOCAL | **14/15 PASS**; hanya live npm advisory lookup ditolak sandbox |
| Dependency audit offline | **46 dependency, 0 vulnerability** (cache/offline; bukan bukti registry terkini) |

## Capability evidence

| Area | Bukti | Hasil |
|---|---|---|
| Finance closure | coding block HARD, six reconciliation evidence, close package, report sign-off | PASS |
| Warehouse task engine | lifecycle, optimistic lock, scope, put-away | PASS |
| Canonical warehouse | ledger, lot self-heal, late-created branch default invariant | PASS |
| Unified work items | lifecycle, ownership, evidence, delegation, escalation | PASS |
| Notification preferences | mute/filter, upsert, SYSTEM_ALERT guard | PASS |
| Pricing conditions | specificity, scale, validity, discount/surcharge, deactivate | PASS |
| Domain event/work orchestration | versioned contract, idempotent projection, auto-resolution, retry/dead-letter/recovery | PASS |
| Authorization | allow/deny, public allowlist, RLS context | **310 handler PASS** |
| Data protection | RLS, encryption, plaintext, runtime grants | **31/31 RLS; 0 plaintext; 9 history protected** |

## Visual baseline v8

Cakupan wajib tambahan:

- `#/my-work` — `#workItemsPanel`;
- `#/notifications` — `.notif-prefs`;
- `#/warehouse/inventory?tab=gudang` — `.warehouse-ledger`;
- `#/warehouse/inventory?tab=tugas` — `.warehouse-task-board`;
- `#/sales/commercial-control` — `.pricing-conditions`.

Seluruh 31 halaman lulus pada desktop 1440×1000 dan mobile 390×844.
Warehouse task desktop memakai table overflow internal yang disengaja; body
tetap tidak overflow.

## Isolated UAT technical gate

Database `mat_erp_v2_gate_uat` diprovision fresh, migration 001–081 diterapkan,
field rotation dan runtime grants dijalankan, UAT seed dimuat, opening inventory
direkonsiliasi, backup terenkripsi dibuat, restore disposable mengembalikan 213
tabel pada migration 081, lalu 403 test lulus. Database gate dihapus setelah
selesai.

Percobaan menyalin backup ke `C:\MAT-ERP-Offsite` ditolak environment lokal
(`EPERM`); backup lokal terenkripsi dan restore disposable tetap lulus. Ini
bukan bukti offsite immutable production.

Predeploy lulus pada accessibility, visual, environment, secret scan, migration,
data protection, release/SBOM, isolated regression, load smoke, LAN load,
runtime health/control, final assurance, dan backup freshness. Lookup advisory
live gagal karena environment menolak egress metadata dependency ke registry
publik. Audit offline terhadap cache tersedia lulus 0 vulnerability pada 46
dependency; klaim advisory live terbaru tidak dibuat.

## Batas klaim

Angka ini merupakan bukti **engineering/technical RC**. Bukti manusia—UAT 13
role, SEC-UAT-001 retest, enam rekonsiliasi aktual, training, actual RTO/RPO,
offsite immutable evidence, dan Owner sign-off—belum digantikan automation.
