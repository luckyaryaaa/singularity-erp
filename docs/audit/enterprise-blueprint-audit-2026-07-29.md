# Audit Terpadu Enterprise Blueprint MAT ERP V2

> **Remediation update v0.47 — 29 Juli 2026.** Tahap C Stage 2A sudah
> dieksekusi melalui migration 082: canonical dimension guard, location ledger,
> expiry/FEFO foundation, handling unit/license plate, serta WMS mobile scan
> evidence. Evidence: fresh isolated 408/408, rollback 82/81/81, visual 64/64,
> accessibility 18/18, authorization 319 handler, RLS 31/31, plaintext 0.
> Stage 2 belum dinyatakan penuh: reconciliation/read-switch/cutover Stage 2B,
> perangkat scanner nyata, LAN-UAT, DR, training, dan Owner sign-off tetap
> terbuka.

> **Remediation update — 29 Juli 2026.** Temuan P0 release-governance dan P1
> Work Orchestration pada audit ini telah dieksekusi menjadi
> v0.46.0/migration 081. Database fresh menutup celah default warehouse untuk
> cabang pasca-migration; action-required approval, Warehouse Task, CAPA/QC,
> reconciliation exception, dan dunning/credit hold kini diproyeksikan ke
> Unified Work Item secara idempoten dengan auto-resolution,
> retry/backoff/dead-letter, audit, serta controlled recovery. Evidence terbaru:
> 403/403 main + isolated PASS, rollback 81/80/80, visual v8 62/62,
> accessibility 18/18, authorization 310 handler, data protection 31/31 RLS dan
> 0 plaintext. Blueprint kanonis/mirror sudah dipisahkan melalui source map.
> Human/production gates pada bagian bawah dokumen tetap berlaku dan tidak
> ditutup oleh automation.

**Tanggal audit:** 29 Juli 2026  
**Baseline source:** `b954130422f68c8b2a3f66f3614c0332034a1aaf` + working tree v0.44.0  
**Current remediated baseline:** v0.47.0, migration `001`–`082`  
**Database:** PostgreSQL 16 lokal, migration `001`–`082`  
**Cakupan:** seluruh source, migration, API, UI, security control, release
artifact, automated assurance, UAT evidence, dan 10 dokumen Markdown di
`BLUE PRINT PROJECT/`.

Dokumen ini menggantikan audit 28 Juli sebagai **current gap assessment**.
Dokumen audit terdahulu tetap dipertahankan sebagai histori.

## 1. Putusan Eksekutif

MAT ERP V2 sudah menjadi **enterprise-grade modular ERP engineering baseline**
yang kuat untuk kebutuhan internal MAT. Fondasi lintas modul—PostgreSQL,
authorization dinamis, multiple roles, SoD, MFA, RLS, field encryption, audit,
approval, Business Partner, organization/workforce, Sales, Procurement,
Inventory, Production, Finance, HR/Payroll, reporting, WMS task, dan Unified
Work Item—sudah nyata di source dan diuji.

Namun, proyek **belum boleh dinyatakan 100% tuntas atau production go-live
ready**. Ada tiga lapis status yang tidak boleh dicampur:

1. **Engineering baseline v0.46.0:** sehat; 403/403 main + isolated test lulus.
2. **Blueprint P0/P1 core acceptance:** mayoritas selesai; Work Orchestration
   Integration telah ditutup. Empat area masih parsial—global organization
   context, canonical warehouse Stage 2, WMS depth, serta monitoring/DR
   production proof.
3. **Production acceptance:** belum lulus; final validation tetap fail-closed
   dengan 41 gap evidence/sign-off manusia/produksi.

Arsitektur tidak perlu dibangun ulang dan tidak perlu dipaksa menyalin seluruh
fitur SAP, Oracle, atau Dynamics 365. Target yang benar adalah **tier-1 control
pattern alignment**: data owner jelas, lifecycle terkontrol, transaksi
traceable, angka dapat direkonsiliasi, akses scoped, dan setiap keputusan
memiliki evidence.

## 2. Integritas Sumber Blueprint

### 2.1 Inventaris

Folder `BLUE PRINT PROJECT/` berisi 11 dokumen Markdown dengan total 320.753
byte:

- audit Workspace, Master Data, Organization, Sales, Operations, Finance,
  dan System;
- dua dokumen blueprint terpadu;
- prompt penutupan UAT/MFA/password-reset/security.
- `README.md` sebagai source map governance.

### 2.2 Kepemilikan sumber kebenaran

Duplikasi sumber kebenaran sudah ditutup tanpa menghapus histori:

- file bertanggal diberi banner **BLUEPRINT KANONIS** dan menjadi requirement
  baseline;
- file pendek diberi banner **HISTORICAL MIRROR — JANGAN DIEDIT**;
- `BLUE PRINT PROJECT/README.md` memetakan canonical requirement, mirror
  historis, audit implementasi, backlog, dan test evidence;
- kedua isi requirement tetap setara; perbedaan hanya banner governance.

## 3. Bukti Verifikasi Audit Ini

| Gate | Hasil aktual | Status |
|---|---:|---|
| Regression suite | **403/403 main + isolated lulus** | ✅ |
| Migration/checksum | **001–081 valid dan applied** | ✅ |
| Rollback full-chain disposable | **81 up / 80 down / 80 re-up** | ✅ |
| Authorization matrix | **14 router, 310 handler** | ✅ |
| Data protection | **31/31 RLS aktif** | ✅ |
| Runtime DB role | bukan owner, tanpa `BYPASSRLS` | ✅ |
| Plaintext identifier audit | KTP/NPWP/BPJS/org-tax = **0** | ✅ |
| Least-privilege history | **9** histori terlindungi | ✅ |
| Secret scan | **1.021 file, 0 finding** | ✅ |
| Accessibility | **18/18 lulus** | ✅ |
| Visual browser baseline v8 | **62/62 lulus**, desktop + mobile | ✅ |
| UAT template readiness | 13 role, 13 skenario tersedia | ✅ |
| Final UAT validation | **gagal tertutup dengan 41 blocker manusia/produksi** | ❌ |
| Release artifact verification | **v0.46.0, 456 file, migration 081, 0 finding** | ✅ |
| Live dependency advisory | belum direvalidasi pada audit ini | ◐ |
| Production offsite/DR/HA | belum ada evidence production | ❌ |

Rollback full-chain `81 up / 80 down / 80 re-up` dijalankan pada database
disposable. Fresh-database gate juga melakukan provision, migration 001–081,
seed, field rotation, minimum runtime grants, backup terenkripsi, restore 213
tabel pada migration 081, lalu menjalankan 403 test sebelum database gate
dihapus.

Knowledge graph diperbarui setelah implementasi. Parser SQL graph tidak
tersedia (`tree_sitter_sql` belum terpasang), sehingga migration tidak dinilai
dari graph; seluruh SQL diverifikasi langsung melalui checksum/applied status,
test database, repository linkage, dan evidence rollback.

### 3.1 Batas bukti visual

Baseline v8 mengunci secara spesifik capability baru berikut pada desktop dan
mobile:

- Warehouse Task Board;
- Canonical Warehouse Ledger tab;
- Work Item lifecycle actions;
- Notification Preferences controls;
- Pricing Conditions workbench dan price resolution.

Seluruh 31 halaman × 2 viewport lulus. Status yang benar adalah **UI sehat dan
targeted regression coverage capability terbaru lengkap**; bukti ini tetap
tidak menggantikan UAT manusia lintas 13 role.

## 4. Perubahan Material Setelah Audit 28 Juli

| Versi | Migration | Perubahan | Dampak audit |
|---|---:|---|---|
| v0.40.0 | 075 | Warehouse Task Engine: receive, put-away, pick, pack, ship, count | WMS minimum task flow tersedia |
| v0.41.0 | 076 | Canonical Warehouse Ledger Stage 1, default warehouse, stock-lot bridge ter-enforce | Branch-as-Warehouse menjadi jembatan eksplisit, belum grain-flip |
| v0.42.0 | 077 | Unified Work Item lifecycle, SLA, delegation, escalation, evidence | Gap utama My Work ditutup secara engineering |
| v0.43.0 | 078 | Notification Preferences per user/category dengan RLS | Gap personalization notifikasi ditutup |
| v0.44.0 | 079 | Pricing Conditions Stage 1 dan resolver server-authoritative | Advanced pricing naik dari tidak ada menjadi parsial |

Audit 28 Juli yang masih menulis WMS, Unified Work Item, dan Notification
Preferences sebagai belum tersedia tidak lagi mencerminkan source saat ini.

## 5. Matriks Acceptance Gate Blueprint

Legenda: ✅ selesai secara engineering, ◐ parsial, ⬜ belum tersedia.

### 5.1 Ringkasan 42 gate inti

| Kategori | Gate penuh | Parsial | Belum | Putusan |
|---|---:|---:|---:|---|
| Workspace | 6 | 0 | 0 | Core gate selesai; auto-projection tetap gap integrasi |
| Master Data | 6 | 0 | 0 | Core gate selesai |
| Organization | 4 | 2 | 0 | Context selector dan scope propagation belum seragam |
| Sales | 6 | 0 | 0 | Core gate selesai; pricing tier-1 masih Stage 1 |
| Operations | 4 | 2 | 0 | Canonical warehouse dan WMS depth masih parsial |
| Finance | 6 | 0 | 0 | Core gate selesai secara engineering |
| System | 5 | 1 | 0 | Monitoring/DR/release production belum final |
| **Total** | **37** | **5** | **0** | P0/P1 core kuat, belum production accepted |

Status 37/5/0 bukan persentase go-live dan bukan klaim feature parity dengan
SAP/Oracle/Dynamics 365.

### 5.2 Workspace

| Target | Status | Bukti/gap |
|---|---|---|
| KPI permission per card | ✅ | Entitlement dan branch scope teruji |
| Scope-safe data | ✅ | SQL read model dan RLS/permission |
| Unified Work Item | ✅ | Migration 077, lifecycle, SLA, evidence, delegation |
| Per-recipient notification | ✅ | Receipt per user + preferences migration 078 |
| Report-level permission | ✅ | Endpoint authorization dan scope |
| Mobile approval cards | ✅ | Browser smoke desktop/mobile |

Remediation v0.46: engine domain telah menerbitkan kontrak
`work.action-required.v1`/`work.action-resolved.v1` untuk approval, credit
hold/dunning, QC fail/CAPA, WMS assignment, dan reconciliation exception.
Projection idempoten, dedupe, retry/dead-letter, SLA, notifikasi, audit, serta
controlled recovery telah tersedia.

### 5.3 Master Data

| Target | Status | Bukti/gap |
|---|---|---|
| Business Partner | ✅ | Canonical party + compatibility layer |
| Change Request | ✅ | Allowlist, maker-checker, stale guard |
| Duplicate/Golden Record | ✅ | Scoring, survivorship, merge lineage |
| Data Quality rules | ✅ | Rule configuration dan issue lifecycle |
| Import staging | ✅ | Validate/promote/replay-safe |
| Effective dating dan audit | ✅ | Lifecycle/version/audit tersedia |

Gap tier-1: Reference Data Hub terpadu, governance seragam pada seluruh master,
serta verifikasi bank/tax ke sumber otoritatif eksternal belum tersedia.

### 5.4 Organization

| Target | Status | Bukti/gap |
|---|---|---|
| Multi-Legal Entity selector | ◐ | Model ada; context selector belum konsisten di seluruh halaman |
| Organization workbenches | ✅ | Identity, hierarchy, workforce, bank/tax/signatory |
| Versioned hierarchies | ✅ | Maker-checker + immutable SHA snapshot |
| Job/Position/Assignment | ✅ | Headcount, overlap, reporting guard |
| Authority matrix | ✅ | Delegation scoped dan time-bound |
| Scope propagation | ◐ | Sebagian modul masih memakai branch sebagai compatibility scope |

### 5.5 Sales

| Target | Status | Bukti/gap |
|---|---|---|
| Server pricing | ✅ | Amount contract + Pricing Conditions resolver |
| Typed SO lines | ✅ | Line-level order model |
| Complete credit exposure | ✅ | Open order/delivery/invoice checkpoint |
| Fulfilment orchestration | ✅ | Typed line conversion dan aggregation |
| Partial delivery/invoice | ✅ | Over-fulfilment dan replay guard |
| RMA governance | ✅ | Quantity/value/source/warranty enforcement |

Gap tier-1: condition engine belum otomatis mengisi dan membekukan price
snapshot quotation/SO; rebate, commission, CRM lead/opportunity/forecast, dan
customer portal belum ada. Hanya implementasikan yang memiliki nilai bisnis MAT.

### 5.6 Operations

| Target | Status | Bukti/gap |
|---|---|---|
| Real Warehouse/Location/Bin | ◐ | Stage 1 eksplisit; grain stok utama masih branch |
| Site-aware MRP | ✅ | Scope site dan suggestion isolation |
| Routing dan capacity | ✅ | Sequence, overload control, WIP |
| QC completion gate | ✅ | NCR/CAPA/calibration enforcement |
| Line three-way match | ✅ | Receipt/invoice/price/qty per baris |
| Warehouse execution | ◐ | Task minimum ada; mobility dan advanced WMS belum ada |

Gap utama:

- Stage 2 canonical warehouse grain-flip dengan introduce → dual-write →
  backfill → read-switch → RLS-switch → deprecate;
- barcode/QR scanning, handling unit/license plate/pallet;
- FEFO, replenishment, staging/loading, wave/batch picking;
- inspection plan dan sampling/AQL;
- Project Operations dan Enterprise Asset Management.

### 5.7 Finance

| Target | Status | Bukti/gap |
|---|---|---|
| Ledger-based periods | ✅ | Per legal entity |
| Full close enforcement | ✅ | Six-way evidence + immutable close package |
| AR/AP/Cash completeness | ✅ | Subledger dan reconciliation baseline |
| Line dimensions | ✅ | HARD coding block + snapshot |
| Tax reconciliation | ✅ | GL↔tax workbench + maker-checker |
| Financial report sign-off | ✅ | Prepare→Review→Sign-off + SHA + SoD |

Gap tier-1: rolling budget/forecast, FX revaluation, treasury/cash forecast,
intercompany, consolidation, dan group reporting belum tersedia. Bukti approval
enam rekonsiliasi aktual juga tetap gate manusia.

### 5.8 System, Security, dan Platform

| Target | Status | Bukti/gap |
|---|---|---|
| Dynamic IAM | ✅ | Database-backed grants |
| Multiple roles | ✅ | Effective role union dan expiry |
| Privileged access | ✅ | MFA, emergency/delegated access, maker-checker reset |
| Immutable redacted audit | ✅ | Redaction + append-only/least privilege |
| RLS dan encryption | ✅ | 31 RLS, AES-GCM, blind index, rotation |
| Monitoring, DR, release gate | ◐ | Local controls kuat; production proof dan release v0.44 belum final |

Gap platform:

- SSO OIDC/SAML, SCIM, passkeys/WebAuthn;
- OpenTelemetry, centralized logs/SIEM, persistent SLO/error budget;
- feature flags dan configuration transport antar-environment;
- HA/standby, immutable offsite backup, production restore drill;
- versioned integration contracts dan action-required domain events.

## 6. Temuan Prioritas

### P0 — Stop-ship sebelum release candidate v0.44

1. **Release artifact stale.** `release:verify` menolak paket karena manifest
   masih `0.39.0` dan migration 074, sedangkan source `0.44.0`/079.
2. **Release documentation drift.** `TEST_EVIDENCE.md`, `RELEASE_NOTES.md`,
   header `MIGRATION_NOTES.md`, `FILES_CHANGED.md`, data-protection matrix,
   serta UAT retest plan/result masih memakai baseline v0.39.
3. **Targeted visual coverage belum memuat lima wave terbaru.** Baseline v8
   perlu selector dan action nyata, bukan hanya halaman induk.
4. **Live dependency vulnerability audit belum terkini.**
5. **Canonical blueprint masih duplikat.**

### P0 — Stop-ship sebelum production go-live

1. Final UAT 13 role belum dieksekusi.
2. Training attendance 13 role belum terbukti.
3. `SEC-UAT-001` masih `READY_FOR_RETEST`, bukan `CLOSED`.
4. Trial Balance, AR–GL, AP–GL, Inventory–GL, Payroll–GL, dan Tax belum
   memiliki evidence aktual yang approved.
5. Actual RTO/RPO dan immutable offsite restore evidence belum approved.
6. Owner final sign-off yang menunjuk versi, SHA, migration, dan UAT run yang
   sama belum tersedia.

### P1 — Menutup core blueprint engineering

1. ✅ Domain Event → Unified Work Item projection untuk kejadian
   action-required — selesai v0.46/migration 081.
2. Canonical Warehouse Stage 2 dengan migration berlapis dan rollback/forward
   compatibility.
3. WMS mobility: scanner, handling unit, FEFO, replenishment, staging/loading,
   wave/batch picking.
4. Organization/legal-entity context selector dan scope propagation seragam.
5. Pricing Stage 2: resolver otomatis pada quotation/SO, immutable price
   snapshot, controlled manual override; rebate/commission hanya jika disetujui.

### P2 — Kapabilitas enterprise berdasarkan nilai bisnis

1. Reference Data Hub dan external master verification.
2. Inspection Planning/Sampling.
3. Project Operations dan EAM.
4. Rolling forecast, FX revaluation, treasury, intercompany, consolidation.
5. CRM/opportunity/commission/customer portal bila masuk operating model MAT.

### P3 — Platform maturity

1. SSO/SCIM/passkeys.
2. OpenTelemetry/SIEM/SLO.
3. Feature flags dan configuration transport.
4. HA/standby, immutable offsite backup, production DR exercise.
5. Formal integration/event versioning dan outbound webhook allowlist.

## 7. Urutan Eksekusi Resmi yang Direkomendasikan

### Tahap A — v0.44 Release Governance Closure

- sinkronkan release notes, evidence, migration/files-changed header, UAT
  baseline, data-protection matrix, SBOM, dan release manifest;
- tambah dokumen operasi v0.44 Pricing Conditions;
- buat visual baseline v8 untuk lima wave terbaru;
- jalankan isolated regression, rollback, release build/verify, secret scan,
  dependency audit, dan predeploy;
- hasil tahap ini adalah **technical release candidate**, bukan go-live.

### Tahap B — Work Orchestration Integration

**Status: engineering selesai pada v0.46.0.**

- definisikan katalog event `action-required`;
- transactional outbox → idempotent Work Item projector;
- sumber awal: approval pending, credit hold, QC fail/CAPA, WMS assignment,
  Finance reconciliation exception, overdue;
- deduplication key, retry/dead-letter, SLA policy, dan audit wajib.

### Tahap C — Warehouse Stage 2 dan WMS Mobility

- lakukan canonical grain migration berlapis, bukan big-bang;
- tambah dual-write reconciliation dan negative cross-warehouse tests;
- lanjutkan scanner/handling unit/FEFO/replenishment/staging/loading;
- lakukan UAT operator gudang pada perangkat nyata.

### Tahap D — Feature Freeze untuk Internal Go-Live

- tutup hanya gap P1 yang disetujui sebagai mandatory;
- P2/P3 yang tidak wajib dipindah ke post-go-live backlog;
- bangun satu immutable RC package dan jangan mengubah source setelah UAT
  dimulai tanpa membuat RC baru.

### Tahap E — LAN-UAT, DR, dan Sign-off

- eksekusi 13 skenario dan training;
- retest/close SEC-UAT-001;
- approve enam rekonsiliasi bisnis;
- ukur actual RTO/RPO dan verifikasi offsite restore;
- Owner menandatangani RC version + SHA + migration + UAT run yang sama.

### Tahap F — VPS/Production

VPS dan domain ERP diaktifkan paling akhir setelah seluruh gate Tahap E hijau.
Deployment production tidak boleh memakai working tree atau artifact v0.39.

## 8. Arah UI/UX Enterprise

Identitas Soft Clay Enterprise saat ini layak dipertahankan. Upgrade visual
sebaiknya meningkatkan kejelasan operasional, bukan menambah dekorasi:

- clay dipakai pada KPI, empty state, command/action card, onboarding, dan
  status positif;
- tabel transaksi, approval, audit, finance, dan security tetap datar, rapat,
  kontras tinggi, serta mudah dipindai;
- setiap workbench wajib punya loading, empty, error, permission-denied,
  overdue, conflict, retry, dan success state;
- aksi berisiko memakai reason, step-up MFA/PIN sesuai policy, review summary,
  dan confirmation yang menjelaskan dampak;
- desktop mengutamakan information density; mobile mengutamakan task card,
  scanner, sticky primary action, dan field minimum;
- design token, focus state, keyboard flow, responsive behavior, dan selector
  visual regression menjadi kontrak release.

Targetnya bukan “terlihat seperti SAP/Oracle/Dynamics”, melainkan memiliki
**disciplin kontrol dan kejelasan operasi** setara perusahaan besar dengan
identitas MAT sendiri.

## 9. Definition of Done

### Engineering Complete

- requirement memiliki source, migration, API, UI, permission/scope, audit,
  test, rollback, dan dokumentasi;
- tidak ada client-authoritative business value;
- concurrency memakai idempotency/optimistic lock sesuai risiko;
- negative authorization, IDOR, branch/legal-entity isolation lulus;
- targeted desktop/mobile visual coverage tersedia.

### Technical Release Candidate

- seluruh gate otomatis hijau pada source yang sama;
- release artifact version/migration/SHA tidak stale;
- SBOM dan dependency advisory terkini;
- restore disposable dan rollback/forward verification lulus;
- tidak ada critical/high engineering finding terbuka.

### Production Go-Live Ready

- seluruh syarat Technical RC terpenuhi;
- final UAT dan training lengkap;
- SEC-UAT-001 `CLOSED`;
- enam rekonsiliasi approved;
- actual RTO/RPO + offsite restore evidence approved;
- Owner sign-off menunjuk release yang sama.

## 10. Kesimpulan Final

**MAT ERP V2 belum 100% tuntas secara keseluruhan.** Posisi yang akurat adalah:

> **v0.46.0 engineering baseline kuat; Work Orchestration P1 selesai; Canonical
> Warehouse Stage 2/WMS Mobility dan seluruh human/production acceptance masih
> harus ditutup.**

Prioritas berikutnya bukan menambah menu secara acak. Selesaikan canonical
warehouse/WMS yang mandatory, lakukan feature freeze, lalu eksekusi
UAT/DR/Owner sign-off. Dengan
urutan tersebut, MAT ERP V2 dapat menjadi ERP internal enterprise yang rapi,
aman, dapat diaudit, dan realistis untuk dipelihara.
