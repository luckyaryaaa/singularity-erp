# Audit Enterprise Blueprint MAT ERP V2

**Tanggal audit:** 27 Juli 2026  
**Basis kode:** `2da37a0d3c5b4f1d82c588bd87f3eaac0827d665`  
**Blueprint kanonis yang dibandingkan:** `BLUE PRINT PROJECT/FINAL_UPDATE_UPGRADE_MAT_ERP_V2.md`  
**Security addendum:** `BLUE PRINT PROJECT/PROMPT_FIX_UAT_MFA_PASSWORD_RESET_SECURITY_MAT_ERP_V2.md`  
**Migration terpasang:** `001`–`062`  
**Versi paket saat audit:** `0.34.0`

## 1. Keputusan eksekutif

MAT ERP V2 sudah mempunyai fondasi enterprise yang kuat dan jauh melampaui
prototipe: modular monolith, PostgreSQL, transaksi atomik, audit, IAM multi-role,
SoD, approval, RLS tranche awal, document graph, posting engine, lot/heat,
perpetual inventory, ATP/CTP, capacity, WIP, CAPA, backup/restore, dan automated
assurance.

Namun sistem **belum dapat dinyatakan 100% sesuai blueprint atau production
ready**. Status yang jujur pada tanggal audit:

> **Engineering core: kuat dan lulus regression. Go-live: BLOCKED.**

Penyebabnya bukan satu bug tunggal. Empat kelompok gerbang masih terbuka:

1. security/UAT addendum belum selesai dan insiden `SEC-UAT-001` belum ditutup;
2. predeploy gate gagal pada visual regression dan LAN load setelah MFA
   privileged diwajibkan;
3. RLS, field encryption, optimistic locking, UI/API parity, dan release
   traceability belum konsisten pada capability baru;
4. UAT 13 role, training, rekonsiliasi, restore evidence, dan Owner sign-off
   belum dieksekusi manusia.

## 2. Bukti yang benar-benar diverifikasi

| Gerbang | Hasil audit | Status |
|---|---:|---|
| Isolated UAT regression | 321/321 lulus | PASS |
| Provision + migration | 62 migration terpasang | PASS |
| Migration checksum | seluruh `001`–`062` valid | PASS |
| Rollback drill | `62 up → 61 down → 61 re-up` | PASS |
| Backup lokal | terenkripsi, checksum valid | PASS |
| Restore drill teknis | 198 tabel, migration terakhir `062` | PASS |
| Secret scan | 597 file, 0 temuan | PASS |
| Dependency audit | 46 dependency, 0 vulnerability | PASS |
| Accessibility static gate | 18/18 | PASS |
| Release artifact verification | 385 file, 0 temuan | PASS |
| Fingerprinted/compressed asset | immutable cache + Brotli | PASS |
| Visual regression | login berhenti pada MFA challenge | FAIL |
| LAN load 10/25 user | virtual user tidak menyelesaikan MFA | FAIL |
| Offsite backup copy | `EPERM` ke target offsite lokal | FAIL |
| Final UAT evidence | 13 scenario belum dijalankan | BLOCKED |
| Critical incident | `SEC-UAT-001 = READY_FOR_RETEST` | BLOCKED |
| Final sign-off | belum tersedia | BLOCKED |

Catatan: dependency audit awal gagal karena registry tidak dapat diakses dari
predeploy sandbox. Verifikasi terpisah terhadap registry berhasil dan menemukan
0 vulnerability. Formal predeploy tetap harus dijalankan ulang setelah dua
skrip MFA diperbaiki.

## 3. Perubahan baru yang sudah nyata, tetapi belum tercatat resmi

Kode dan database sudah bergerak melewati evidence `v0.34.0`:

| Migration | Capability | Backend/test | UI | Dokumentasi rilis |
|---|---|---:|---:|---:|
| `057` | stock reservation ledger | Ada | Tidak ada workbench reservation | Belum |
| `058` | bin put-away/move/location | Ada | Ada tab Rak & Bin | Belum |
| `059` | purchase/blanket contracts | Ada | Belum ada workbench | Belum |
| `060` | capacity planning + WIP | Ada | Belum ada board/workbench | Belum |
| `061` | CAPA + calibration | Ada | Belum ada workbench khusus | Belum |
| `062` | perpetual inventory + COGS/GRIR/WIP | Ada | Dampak transaksi terintegrasi | Belum |

`package.json`, README, CHANGELOG, backlog, dan operations evidence masih
menempatkan rilis pada `v0.34.0 — Sales Commercial Controls`. Release manifest
memuat migration `062` tetapi tetap bernama `0.34.0`. Ini membuat hubungan
requirement → change → test → migration → release tidak audit-ready.

Kedua blueprint berikut identik secara byte/hash dan sebaiknya tidak dipelihara
sebagai dua sumber kebenaran:

- `FINAL_BLUEPRINT_UPDATE_UPGRADE_MAT_ERP_V2_ENTERPRISE_2026-07-21.md`
- `FINAL_UPDATE_UPGRADE_MAT_ERP_V2.md`

Hash keduanya:
`E842C1A790A53A096B2AE8C33439E6F825FE76B6FFD69EE22217341274CA15B4`.

## 4. Stop-ship findings

### S0-01 — Security addendum belum memenuhi acceptance gate

Yang sudah benar:

- Owner tidak dapat direset melalui API;
- reset diri lewat admin endpoint ditolak;
- admin-to-admin dibatasi;
- izin `user.reset_password` sudah dipisah;
- recent MFA ditegakkan;
- reset sukses mencabut sesi/challenge dan tidak menulis secret ke audit;
- automated policy tests lulus.

Yang belum selesai:

- privileged reset masih langsung dieksekusi, belum maker-checker dua orang;
- halaman System Users memakai generic `masterPage` tanpa field edit, sehingga
  modal Edit User tetap kosong;
- tidak ada tombol/policy-aware password reset pada UI;
- tidak ada MFA enrollment/disable workbench pada UI;
- recovery code belum diimplementasikan;
- `MFA_RECOVERY_POLICY.md`, `AUTH_ORIGIN_CSRF_SESSION_DESIGN.md`,
  `UAT_RETEST_PLAN.md`, `UAT_RETEST_RESULTS.md`, `FILES_CHANGED.md`,
  `MIGRATION_NOTES.md`, `TEST_EVIDENCE.md`, dan `RELEASE_NOTES.md` belum ada;
- dokumen insiden/password policy masih menyebut izin granular “dijadwalkan”
  padahal kode sudah berubah;
- UAT-SYS-01 belum diretest dan issue masih `READY_FOR_RETEST`.

Ada tambahan gap implementasi: route reset menjalankan `evaluate()` lalu
langsung melempar untuk keputusan DENY. Audit `PASSWORD_RESET_DENIED` berada
di `passwordReset.reset()`, sehingga penolakan dari route tidak melewati audit
tersebut. Test saat ini menguji service secara langsung, belum kontrak HTTP
deny + audit.

### S0-02 — Predeploy gate merah setelah MFA enforcement

`scripts/ui-smoke-cdp.js` dan `scripts/load-lan.js` masih menganggap respons
login langsung berisi session/csrf. Akun Owner sekarang mengembalikan MFA
challenge. Integration test sudah memiliki helper MFA-aware, tetapi kedua
skrip release belum menggunakannya.

Dampak:

- visual coverage 15 halaman tidak benar-benar berjalan;
- LAN 10/25 concurrent-user evidence tidak valid;
- `npm run predeploy` berakhir `LOCAL DIBLOKIR`.

### S0-03 — RLS dan field encryption belum memenuhi blueprint

RLS baru terpasang pada 24 tabel/tranche. Capability baru belum konsisten:

- `stock_reservations`: tanpa RLS;
- `purchase_contract_lines`: tanpa RLS;
- `purchase_contract_releases`: tanpa RLS;
- `capa_cases`: tanpa RLS;
- `measuring_instruments`: tanpa RLS;
- `instrument_calibrations`: tanpa RLS.

`purchase_contracts` sendiri sudah RLS. Repository melakukan branch checks,
tetapi blueprint mensyaratkan defense-in-depth pada database. View saldo bin
dan reservation juga perlu diuji dengan `security_invoker`/RLS-aware behavior,
bukan hanya filter repository.

Encryption at rest pada level field baru terbukti untuk TOTP secret. Nomor
rekening, identifier pajak, dan data HR/payroll sensitif masih mengandalkan
masking/permission, belum centralized field encryption sesuai blueprint.

### S0-04 — DR belum production-ready

Backup lokal dan restore teknis lulus, tetapi copy offsite gagal `EPERM`.
Blueprint mensyaratkan media terpisah/immutable. Menyalin ke folder lokal pada
mesin yang sama juga belum setara offsite storage.

### S0-05 — Human acceptance belum ada

`uat:validate` gagal secara fail-closed karena:

- 13 skenario role belum dieksekusi;
- training 13 role belum terbukti;
- trial balance, AR–GL, AP–GL, inventory–GL, payroll–GL, dan tax
  reconciliation belum mendapat evidence/approval manusia;
- restore drill belum berisi actual RTO/RPO dan bukti operator;
- Owner final sign-off belum tersedia;
- `SEC-UAT-001` belum `CLOSED`.

Hal ini tidak boleh digantikan oleh hasil automated test.

## 5. High-priority engineering findings

### H1-01 — UI/API parity

Backend/API tersedia tetapi belum usable end-to-end melalui UI untuk:

- purchase contracts dan release;
- production capacity board, scheduling, overload approval, dan WIP;
- CAPA lifecycle dan calibration register;
- reservation trace “stok ini ditahan siapa/dokumen apa”;
- password reset policy, MFA enrollment, dan recovery.

Pola SAP/Oracle/Dynamics membutuhkan list/detail/workbench, filter, state,
approval, drill-down, error/permission/empty/loading state, dan audit link—bukan
hanya endpoint.

### H1-02 — Mutation concurrency belum konsisten

`purchase_contracts` mempunyai kolom `version`, tetapi decision/release tidak
menerima `expectedVersion`. CAPA, instrument, reservation, dan operation
schedule/actual-hours juga tidak memakai optimistic version check. Row lock
menghindari sebagian race, tetapi tidak mencegah pengguna menimpa perubahan
dari layar stale.

### H1-03 — Purchase contract replay risk

Route create/approve/release contract belum memakai wrapper idempotency.
Constraint:

```sql
UNIQUE (contract_id, purchase_order_id, contract_line_id)
```

tidak mencegah duplikasi saat `contract_line_id IS NULL`, karena PostgreSQL
memperlakukan nilai `NULL` sebagai berbeda. Retry header-level release dapat
menggandakan `consumed_amount`. Perlu idempotency key dan unique partial index
atau `NULLS NOT DISTINCT`, plus concurrency/replay test.

### H1-04 — Release governance tertinggal

Capability 057–062 perlu:

- bump versi minimal ke next minor release;
- CHANGELOG/README/schema/API/backlog diperbarui;
- operations evidence + test matrix 057–062;
- release notes security incident;
- manifest dibuat dari commit bersih yang sama dengan evidence;
- formal predeploy hijau.

### H1-05 — Branch-as-Warehouse belum selesai

Migration `058` sendiri mencatat bahwa bin masih dijembatani dari
`org_warehouses.branch_id`, sedangkan stock ledger memakai `branches`.
Put-away sudah bekerja, tetapi model gudang enterprise belum menjadi sumber
kebenaran tunggal. Ini membatasi multi-warehouse per branch, transfer, mobile
scanner, picking wave, dan slotting.

## 6. Matriks acceptance gate per kategori

Legenda: **Selesai** = evidence automated + implementasi tersedia; **Parsial** =
fondasi ada tetapi scope/UI/control belum lengkap; **Belum** = capability target
tidak ditemukan atau belum dapat digunakan.

| Kategori | Selesai | Parsial | Belum / blocker utama |
|---|---|---|---|
| Workspace | KPI permission/scope, per-recipient notification, report permissions | My Work mengagregasi sumber tetapi belum unified typed work-item engine; mobile belum tervalidasi visual | mobile approval evidence setelah MFA-aware visual test |
| Master Data | canonical Business Partner, duplicate queue/merge lineage, staging, quality rules, change request foundation | Change Request/DQ/import belum seragam ke seluruh master; survivorship/golden record masih domain BP | enterprise-wide reference-data governance |
| Organization | workbench, versioned hierarchy, Job/Position/Assignment, delegation/authority, scope controls | organization context belum menjadi global multi-legal-entity selector | global context propagation lintas seluruh workbench |
| Sales | server totals, typed fulfilment lines, credit exposure, partial flow, ATP/CTP, contracts, margin, RMA | pricing condition engine dan orchestration masih lebih ringan dari tier-1 | advanced pricing/rebate bila bisnis memerlukan |
| Operations | site-aware MRP, line 3-way match, lot/heat, bin put-away, reservation, capacity/WIP, QC/CAPA/calibration, perpetual COGS | warehouse model, CAPA/capacity/contract UI | pick-pack-ship tasks, barcode/HU, inspection plan, Project Ops, EAM |
| Finance | ledger period, posting profiles, AR/AP/Cash baseline, fixed asset, close cockpit, inventory/GRIR/COGS | tax check dan reconciliation foundation | journal-line dimensions, real GL-to-tax reconciliation, report sign-off, rolling forecast, FX/intercompany |
| System | dynamic IAM, multiple roles, SoD, step-up MFA, immutable/redacted audit foundation, monitoring/self-test | RLS coverage, privileged reset, backup center | field encryption, recovery codes, offsite immutable backup, OTel/SIEM, clean green release |

## 7. UI/UX assessment

Kekuatan yang sudah terbukti:

- semantic token/design system dan visual clay yang terkendali;
- focus-visible, reduced motion, landmarks, accessible sort, live region;
- server pagination pada enterprise tables;
- responsive shell dan consistent panel/card language;
- accessibility gate 18/18.

Yang harus diperbaiki agar setara enterprise product:

1. Bangun workbench untuk capability 059–061 dan security flows; jangan
   mengandalkan generic empty modal.
2. Semua destructive/privileged action harus punya reason, confirmation,
   permission explanation, dan maker-checker status yang terlihat.
3. Simpan filter/page/tab yang relevan di URL agar shareable dan back/forward
   aman.
4. List CAPA/purchase contract yang saat ini `LIMIT 200` perlu pagination dan
   total count, bukan hard cap diam-diam.
5. Tambahkan mobile task card untuk approval, put-away, QC, calibration, dan
   warehouse execution.
6. Jalankan ulang visual desktop/mobile setelah test login MFA-aware.

Review ini mengikuti prinsip semantic controls, visible focus, labeled forms,
reduced motion, URL state, explicit destructive confirmation, dan list
performance dari:
`https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`.

## 8. Urutan eksekusi yang direkomendasikan

### Wave A — Release unblocker dan security closure

1. Perbaiki HTTP denied-reset audit dan tambah HTTP-level policy tests.
2. Implement privileged reset request/approve maker-checker.
3. Perbaiki Edit User modal; pisahkan role, status, reset, MFA actions.
4. Implement MFA enrollment UI dan recovery code lifecycle.
5. Lengkapi security deliverables, lalu lakukan UAT-SYS-01 retest.
6. Jadikan visual/LAN load MFA-aware dan pastikan predeploy hijau.

**Exit gate:** `SEC-UAT-001 CLOSED`, 0 Critical/High, predeploy hijau.

### Wave B — Database defense-in-depth

1. Tambahkan RLS + policy + negative IDOR tests untuk seluruh tabel baru.
2. Gunakan RLS-aware/security-invoker views.
3. Tambahkan optimistic version pada mutable aggregate.
4. Tutup replay purchase contract dan tambahkan idempotency.
5. Buat field-encryption service + key rotation untuk data sensitif.

**Exit gate:** semua acceptance Security/Data Integrity pada blueprint lulus.

### Wave C — UI completion 057–061

1. Inventory Reservation Workbench.
2. Purchase Contract 360 + release history.
3. Capacity Board + WIP drill-down.
4. CAPA Workbench + Calibration Register.
5. Permission-aware mobile task cards dan visual test cases.

**Exit gate:** list/detail/workbench + loading/empty/error/permission/mobile
state lulus untuk seluruh capability.

### Wave D — Finance enterprise completion

1. Journal-line dimensions dan dimension validation.
2. GL-to-tax reconciliation nyata.
3. Financial report preparation/review/sign-off/version.
4. Failed-posting/reprocessing workbench.
5. Rolling budget/forecast, FX revaluation, dan intercompany foundation sesuai
   kebutuhan bisnis MAT.

### Wave E — Operations tier-1 yang relevan

1. Migrasikan Branch-as-Warehouse ke warehouse/location/bin kanonis.
2. Receiving/put-away/pick/pack/ship task engine.
3. Barcode/QR + handling unit/pallet.
4. Inspection plan/sampling policy.
5. Project Operations dan Maintenance/EAM.

### Wave F — Human UAT dan production activation

1. Release baru yang bersih dan versioned.
2. UAT 13 role pada release SHA yang sama.
3. Training attendance.
4. Reconciliation dan actual RTO/RPO evidence.
5. Owner sign-off.
6. Baru setelah itu aktivasi VPS/domain, offsite immutable backup, TLS,
   monitoring/alerting, dan cutover.

## 9. Definition of “100%” untuk proyek ini

Status 100% hanya boleh diberikan bila seluruh kondisi berikut benar:

- automated regression, security, migration, rollback, visual, load, backup,
  restore, and release gates lulus;
- tidak ada Critical/High issue terbuka;
- seluruh P0/P1 blueprint dan P2 yang relevan untuk MAT mempunyai backend,
  database control, UI, tests, docs, dan runbook;
- UAT 13 role, training, reconciliation, DR exercise, dan Owner sign-off
  menunjuk versi/SHA/migration yang sama;
- production infrastructure aktif dengan TLS, least privilege, offsite
  immutable backup, monitoring, dan rollback plan.

Sampai semua exit gate tersebut terpenuhi, label yang tepat adalah:

> **MAT ERP V2 — Enterprise Engineering In Progress; not yet production-ready.**

## 10. Progress eksekusi setelah audit

### Wave A — selesai secara teknis pada v0.35.0

- Privileged password reset maker-checker, SoD, recent MFA, expiry, row lock,
  dan audit denial/success sudah diterapkan pada migration 063.
- MFA recovery code sekali pakai, lifecycle pergantian faktor, serta Account
  Security dan User Security Workbench sudah tersedia.
- Isolated regression 322/322, visual 34/34, accessibility 18/18, migration,
  rollback, backup/restore, secret scan, dependency audit, dan LAN concurrency
  lulus.
- Artefak v0.35.0 memiliki SHA-256
  `6ea6c8df015288a98d46160f5a3c6e25eb871cf1f19d6e1da9b2ee801096e301`.

Exit gate manusia belum boleh ditandai selesai: `SEC-UAT-001` tetap
`READY_FOR_RETEST`, copy offsite masih `EPERM`, dan UAT/training/reconciliation/
Owner sign-off belum dilaksanakan. Eksekusi berikutnya dimulai dari Wave B
database defense-in-depth, kemudian UI capability 057, 059, 060, dan 061.

### Wave B/C — selesai secara teknis pada v0.36.0

- Migration 064 menutup RLS execution, `security_invoker` view, optimistic
  version, dan NULL-safe purchase-contract release replay guard.
- Reservation, Purchase Contract 360, Capacity & WIP, serta CAPA & Calibration
  memiliki workbench operator desktop/mobile dengan URL state, empty state,
  permission-aware action, pagination, dan controlled mutation.
- Finite-capacity scheduling, contract numbering/release, CAPA numbering,
  calibration, reservation release, dan operation mutation memakai locking,
  idempotency, stale-version detection, scope, serta audit.
- Regression 326/326, isolated UAT 326/326, rollback 64→63→64, visual 42/42
  tanpa overflow/console error, accessibility 18/18, secret scan 604/0, dan
  restore 200 tabel lulus.

Sisa Wave B yang belum boleh dianggap selesai adalah field encryption/key
rotation dan retention lifecycle. Gate manusia Wave F juga tetap terbuka:
retest SEC-UAT-001, UAT 13 role, training, rekonsiliasi, DR, dan Owner sign-off.
