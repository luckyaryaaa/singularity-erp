# Backlog Resmi — MAT ERP V2

> **Notification Preferences v0.43.0: ENGINEERING SELESAI — 29 Juli 2026.**
> Migration 078 menambah `notification_preferences` (per pengguna × kategori):
> mute in-app + email per kategori, RLS per-pemilik, `SYSTEM_ALERT` tak dapat mati.
> Filter mute dijahit di jalur baca (`listNotifications`/`unreadCount`), menangani
> notifikasi user & role seragam tanpa kehilangan data. Endpoint GET/POST
> `/api/notifications/preferences` (router Operations). Menutup ⬜ audit Workspace
> 6.7 "Notification Preferences Are Missing". Source of truth 001–078; regression
> 389/389; rollback full-chain 78/77/77; authorization 304 handler. Catatan
> temuan: outbox domain-event saat ini hanya meng-emit 4 event informasional
> (invoice/payment/PO/quotation), jadi proyeksi event→work-item ditunda sampai
> emisi action-required diperluas.

> **Unified Work Item Engine v0.42.0: ENGINEERING SELESAI — 29 Juli 2026.**
> Migration 077 menambah `work_items`: backbone pekerjaan lintas modul (§4.4/§5.2)
> — approval/exception/review/correction/task/follow-up sebagai entitas bertipe
> dengan siklus hidup penuh, prioritas, risiko, SLA/jatuh tempo, evidence,
> delegasi/substitusi, eskalasi, optimistic lock, RLS, dan audit. Aksi lengkap di
> router Workspace (create/claim/start/complete/return/hold/cancel/delegate/
> escalate); kepemilikan + scope cabang ditegakkan di repository; membaca notifikasi
> tidak menutup pekerjaan. **My Work kini berbasis work item nyata** dengan aksi
> lifecycle, bukan agregasi read-only — menutup P1 audit "Unified Work Item". Emisi
> otomatis dari engine domain (approval, warehouse task, rekonsiliasi) ke work item
> adalah integrasi lanjutan. Source of truth 001–077; regression 384/384; rollback
> full-chain 77/76/76; authorization 302 handler.

> **Canonical Warehouse Ledger (Stage 1) v0.41.0: ENGINEERING SELESAI —
> 29 Juli 2026.** Migration 076 memulai migrasi §9.8 dari Branch-as-Warehouse ke
> hierarki nyata Plant→Warehouse→Storage Location→Bin **tanpa membalik kunci
> isolasi**: `org_warehouses.is_default` + backfill gudang default per cabang
> (7/7), `stock_lots.org_warehouse_id` dengan trigger self-healing (gudang lot
> selalu di cabangnya), put-away menyelaraskan gudang lot ke rak tujuan, view
> `stock_warehouse_ledger` (Legal Entity→Plant→Warehouse), endpoint + tab Gudang.
> Menutup temuan audit "◐ masih bridging ke ledger/branch legacy" menjadi
> jembatan **eksplisit & ter-enforce**. **Stage 2** (grain-flip penuh: mengganti
> makna `warehouse_id` di ~200 titik lintas 20 file + RLS + fixtures) adalah
> cutover berlapis tersendiri dan belum dikerjakan. Source of truth 001–076;
> regression 376/376; rollback full-chain 76/75/75; authorization 298 handler.

> **Warehouse Execution Task Engine v0.40.0: ENGINEERING SELESAI —
> 29 Juli 2026.** Migration 075 menambah `warehouse_tasks`: mesin tugas gudang
> bertipe (receiving→put-away→pick→pack→ship + cycle count) dengan siklus hidup,
> prioritas, jatuh tempo, penugasan, optimistic lock, RLS, dan audit. Menutup
> **sebagian** P1 Warehouse: alur WMS task flow minimum kini ada; canonical
> Branch-as-Warehouse ledger (Plant→Warehouse→Storage Location→Bin sebagai FK
> stok) dan barcode/handling-unit/FEFO tetap Wave E lanjutan. Source of truth
> 001–075; regression 370/370; rollback full-chain 75/74/74; authorization 297
> handler. Unified Work Item lintas modul, retest manual, UAT 13 role, training,
> approval enam rekonsiliasi, DR, offsite proof, dan Owner sign-off tetap gate
> manusia.

> **Finance End-to-End Closure v0.39.0: ENGINEERING SELESAI —
> 28 Juli 2026.** Migration 074 menutup HARD coding block, six-way immutable
> reconciliation evidence, official financial-report workflow, period-close
> package, RLS, maker-checker, SHA-256, dan UI desktop/mobile.
> Source of truth 001–074; regression/isolated 363/363; rollback full-chain
> 74/73/73; visual v7 52/52; authorization 291 handler.
>
> Tahap aktif berikutnya: canonical Warehouse/WMS dan Unified Work Item.
> Manual security retest, UAT 13 role, training, approval aktual enam
> rekonsiliasi, DR, offsite proof, dan Owner sign-off tetap gate manusia.

> **Security & Data Protection Closure v0.38.0: ENGINEERING SELESAI —
> 28 Juli 2026.** Migration 070–073 menutup RLS tranche Finance/HR/payroll,
> fail-closed employee tanpa branch, perluasan enkripsi KTP/NPWP/BPJS/identitas
> pajak, least-privilege histori sensitif, dan kapasitas token legacy.

> **Enterprise Data & Finance Controls v0.37.0: ENGINEERING BASELINE —
> 28 Juli 2026.** Migration 065–069 menutup field-encryption foundation,
> retention/legal hold, journal coding block, GL↔tax reconciliation, dan
> financial-report sign-off. Source of truth 001–069; authorization matrix
> 14 router/286 handler; OpenAPI 1.3; regression 353/353.
>
> Tahap aktif berikutnya sesuai audit 28 Juli saat baseline ini diterbitkan:
> RLS untuk aggregate Finance sensitif dan perluasan klasifikasi/enkripsi PII,
> UI end-to-end coding block/tax reconciliation/report sign-off, lalu canonical
> Warehouse/WMS dan Unified Work Item. SEC-UAT-001, UAT 13 role, training,
> rekonsiliasi, DR, serta Owner sign-off tetap gate manusia.

> **Execution Control Workbenches v0.36.0: WAVE B/C ENGINEERING SELESAI —
> 27 Juli 2026.** Migration 064 menambahkan RLS execution, security-invoker
> view, optimistic version, dan replay guard. Reservation, Purchase Contract
> 360, Capacity & WIP, serta CAPA & Calibration kini memiliki workbench
> desktop/mobile. Regression 326/326, visual 42/42 tanpa overflow, dan rollback
> 64→63→64 lulus.
>
> Tahap aktif berikutnya: selesaikan sisa Wave B berupa field encryption/key
> rotation dan data-retention lifecycle, lalu Wave D Finance enterprise.
> SEC-UAT-001 tetap `READY_FOR_RETEST`; UAT manusia dan Owner sign-off tidak
> boleh ditandai selesai oleh automation.

> **Wave Sales Commercial Controls v0.34.0: SELESAI — 22 Juli 2026.** ATP/CTP
> line promise, effective-dated margin policy dan Finance exception approval,
> customer contract/blanket release, milestone billing idempoten, backorder
> worklist, RLS, audit, lifecycle gate, serta Commercial Control Center selesai.
> Evidence: migration 001–056, rollback 56/55/55, isolated regression 264/264,
> restore 186 tabel. Tahap aktif berikutnya adalah Procurement contract/blanket
> PO lalu Inventory/WMS reservation dan bin execution.

> **Wave Organization & Workforce v0.33.0: SELESAI — 22 Juli 2026.** Versioned
> hierarchy, canonical Job/Position/Assignment, headcount dan overlap control,
> reporting-line guard, authority delegation runtime, RLS, audit, UI, serta
> backfill legacy selesai. Tahap aktif berikutnya adalah gap transaksi
> Sales–Procurement–Inventory–Production sesuai urutan dependensi.

> **Wave Enterprise MDM v0.32.0: SELESAI — 22 Juli 2026.** Unified Business
> Partner, cross-role NPWP linkage, Golden Record, duplicate scoring,
> survivorship, maker-checker merge lineage, import staging, configurable data
> quality, RLS, permission, audit, UI, dan compatibility layer telah lulus
> 256/256 test pada database disposable. Tahap aktif berikutnya: versioned
> organization hierarchy + Job/Position/Assignment + delegation authority.

> **Sumber acuan tunggal (terbaru): `FINAL_MASTER_UPDATE_TERPADU_MAT_ERP_V2_2026-07-15.md`**
> (menggantikan `FINAL_MASTER_UPDATE_MAT_ERP_V2.md` 14 Juli). Urutan sprint resmi:
> 8A release closure → 8B arsitektur/UI → 8C master data final → 9–16 modul →
> 17 audit final → 18 LAN-UAT → 19 VPS go-live. Setiap item wajib berstatus
> `SELESAI` atau punya alasan tertulis sebelum R026 (aktivasi VPS).
>
> **Sprint 18 / R025 technical readiness: ✅ SELESAI 22 Juli 2026
> (v0.31.0).** Database staf `mat_erp_v2_lan_uat`, isolated regression DB,
> 13-role evidence schema, backup+restore, load, release gate, dan final
> assurance telah lulus. Eksekusi bisnis lintas divisi, attendance training,
> enam approval rekonsiliasi, issue retest, serta Owner sign-off masih wajib
> dilakukan manusia. Karena itu Sprint 18 keseluruhan berstatus ◐ dan R026/VPS
> tetap diblokir.
>
> **P0.5 Transaction Correctness Closure: ✅ SELESAI 22 Juli 2026
> (v0.30.0).** Legal-entity IDOR dan recursive hierarchy guard, fulfilment
> aggregation/locking/revalidation, Change Request allowlist + stale detection
> + unique pending + RLS, scoped emergency access, auth grant consistency, dan
> stale release verification telah diterapkan. Evidence: migration 001–050
> terpasang, 247/247 regression dan predeploy LOCAL 14/14 lulus. Status tetap LOCAL BUILD READY;
> LAN-UAT, Owner sign-off, production secrets, dan VPS adalah gate berikutnya.
>
> **Sprint 17 — Final Audit & Assurance: ✅ SELESAI 20 Juli 2026
> (v0.24.0).** Matriks otorisasi 14 router/183 handler, negative allow/deny,
> public allowlist, load LAN 10/25 user dengan read+write, Self-Test 20 kontrol,
> maintenance partisi inventory least-privilege, orphan detection, serta katalog
> 18 SOP selesai. Evidence: 136/136 regression, 14/14 authorization, 5/5
> security, 18/18 a11y, 10/10 visual, migration/rollback 001–035, dan final
> assurance 19 PASS + 1 WARNING opening inventory + 0 blocking. Warning wajib
> diselesaikan bersama Finance/Owner pada Sprint 18; VPS tetap belum diaktifkan.
>
> **Sprint 16 — Reporting & Executive Cockpit: ✅ SELESAI 20 Juli 2026
> (v0.23.0).** Semantic KPI PostgreSQL, materialized monthly summary, freshness
> worker, filter periode/cabang, saved view privat, executive mobile cockpit,
> AR aging, order funnel, actual project margin, action queue, delapan laporan
> PDF/XLSX, scheduler idempoten, export scope validation, dan audit download.
> Evidence: regression 128/128, authorization 11/11, security 5/5, a11y 18/18,
> visual 10/10, migration/rollback 001–034, secret/dependency scan bersih,
> paket 254 file, dan predeploy LOCAL 11/11. Aktivasi VPS tetap ditahan sampai
> audit final, LAN-UAT, dan Owner sign-off.
>
> **Enterprise Security & Release Closure — ✅ SELESAI 20 Juli 2026
> (v0.22.0).** Isolasi cabang/IDOR diperluas pada finance/tax/asset, HR,
> procurement, sales/dunning/RMA; dokumen resmi memakai immutable issued
> snapshot, QR, signature ber-key ID, watermark, pagination, dan audit reprint;
> XLSX asli, PDF multi-page, font lokal, SMTP attachment+retry idempotent,
> migration 031–033, full reversible migration drill, serta paket production
> PostgreSQL-only dan deploy/rollback atomik. Closure ini tidak mengubah status
> Sprint modul yang masih sebagian dan bukan izin aktivasi VPS.
>
> **Sprint 8C Wave 2 — Customer Link & Supplier Performance: ✅ SELESAI
> 16 Juli 2026 (v0.16.0).** Customer Link Wizard kini memiliki draft
> server-side, recovery 30 hari, optimistic lock, duplicate candidate,
> existing/new customer, serta finalisasi atomik dan idempotent dari dokumen
> sumber. Supplier Performance menghitung delivery/quality/price/compliance
> dari PO/GR/QC/dokumen memakai policy effective-dated; expiry dan skor rendah
> menghasilkan risk hold yang memblokir PO. Dokumen supplier memakai
> maker-checker hingga constraint database. Evidence: migration 001–026 dan
> rollback 025–026 valid, 84/84 automated tests, a11y 18/18, visual 8/8, serta
> predeploy LOCAL 11/11 lulus. Sprint 8C dinyatakan selesai; VPS tetap
> ditahan sampai LAN-UAT dan gate go-live.
>
> **Sprint 12 — R019 Production Foundation v0.12.0: ✅ SELESAI 16 Juli 2026.**
> Routing/work center + snapshot rate · BOM explosion · lokasi stok eksplisit
> + reservasi · FIFO Material Issue · actual time append-only · job costing ·
> finished-goods lot · completion gate · QC inspection/NCR/CAPA/karantina ·
> MRP netting→PR · branch scope + idempotency + DB least privilege. Evidence:
> migration 001–022 valid, rollback 022→021 disposable PASS, 74/74 tes, scan
> 321 file/0 temuan, dependency audit 0, load 300/300 p95 31 ms, backup offsite
> + restore 124 tabel PASS, predeploy LOCAL 9/9. Capacity/WIP/inspection plan/
> calibration tetap backlog R019 lanjutan; status bukan PRODUCTION READY.
>
> **Sprint 8C Wave 1 — Enterprise Master Governance: ✅ SELESAI 16 Juli 2026
> (v0.15.0).** Migration 023–024 menambah currency/FX effective-dated, policy
> dimensi, immutable currency+dimension snapshot, normalized product variants,
> quality score/issue registry. Form parent Customer/Supplier/Product membuka
> field enterprise, duplicate code/NPWP diblokir, Data Quality & FX Center serta
> BOM Cost Trace aktif. Evidence: 82/82 tes, rollback disposable, a11y 18/18,
> visual 8/8, predeploy LOCAL 11/11. Dua item Wave 2 tersebut diselesaikan pada
> v0.16.0.
>
> **Sprint 8B — Fondasi arsitektur & UI: ✅ SELESAI 16 Juli 2026 (v0.14.0).**
> ✅ My Work inbox lintas modul (§10.7): GET /api/my-work + halaman
> `src/modules/my-work.js` — file modul frontend pertama hasil pemecahan
> pages.js (router sama, tanpa renderer kedua) · ✅ HTTP hardening §5.1
> (requestTimeout 30s, headersTimeout 15s, keepAlive 7s, maxRequestsPerSocket
> 1000, konfigurasi via env) · ✅ liveness `/api/live` terpisah dari readiness
> `/api/health` + kontrak tes · ✅ i18n baseline §10.15 (src/i18n.js +
> locales id-ID/en-US, pengalih bahasa di topbar, nav & login ter-i18n).
> ✅ Approval Center 2.0 (§10.8): antrean persetujuan kini menampilkan eksposur
> kredit pelanggan (sisa plafon / over-limit / hold) + versi snapshot kebijakan
> approval per dokumen · ✅ Design System 2.0 (awal): token dipisah ke
> `src/design-system/tokens.css` (dimuat sebelum styles.css) + lapisan token
> semantik §10.3 (--bg-canvas/--space-N/--radius-N/--elevation-N).
> ✅ Enterprise View Console: saved views, column chooser, density, sorting,
> server pagination, state URL, semantic row action · ✅ component terpisah
> `src/components/enterprise-table.js` · ✅ aksesibilitas audit 18/18 + focus
> modal/inert/restore · ✅ visual regression Edge 4 halaman × 2 viewport ·
> ✅ fingerprint 12 digit + manifest + Brotli/Gzip + immutable cache ·
> ✅ route production/QC/MRP dipisah ke `backend/routes/production.js` ·
> ✅ pemecahan penuh: `pages.js` 1.652→70 baris (11 bounded module) dan
> `api-postgres.js` 372→66 baris (Auth + 11 route domain) · ✅ architecture
> regression guard mencegah composition root kembali menjadi monolit.
>
> **Sprint 8A — Release Closure v0.11.0: ✅ SELESAI 15 Juli 2026.**
> Rotasi secret owner+runtime (sesi dicabut, UAT wajib ganti sandi, kunci backup
> lama dipertahankan) · backup segar + offsite terenkripsi · rollback drill 018
> bolak-balik di DB disposable PASS · restore drill 113 tabel s.d. 018 PASS ·
> predeploy gate 9/9 (60/60 tes, scan 0, dep audit, load smoke, boot, kontrol
> R012+R013) · versi 0.11.0 · paket release allowlist + manifest SHA-256 · tag git.
>
> Status: ✅ selesai · 🔨 sedang dikerjakan · ⬜ belum · ◐ sebagian (ada catatan)
>
> **Audit verifikasi terakhir — 20 Juli 2026 (v0.24.0):** migration 001–035
> checksum valid · rollback disposable 35 up/34 down/34 re-up PASS · regression
> 136/136 · authorization 14/14 · security 5/5 · a11y 18/18 · visual 10/10 ·
> load LAN 10 user/220 request dan 25 user/550 request tanpa gagal · final
> assurance 19 PASS + 1 WARNING data pembukaan + 0 blocking. Detail artefak,
> secret scan 434/0, dependency audit cache 0 vulnerability, paket 281 file,
> dan predeploy LOCAL 13/13 ada di evidence Sprint 17.

## Keputusan arsitektur terkunci (§2)

| Item | Status |
|---|---|
| VPS hanya diaktifkan paling akhir (urutan §2.1) | ✅ dijaga — runbook + gate |
| Modular monolith dipertahankan, tanpa microservices | ✅ |
| Single engine (shell/router/API/auth/permission/workflow/numbering/dokumen/audit/db/self-test) | ✅ dijaga |

## R012 — Security, Release Hygiene & Runtime Hardening (P0 §4)

| Item | Ref | Status |
|---|---|---|
| Rotasi credential yang pernah masuk ZIP | 4.1 | ✅ rotasi lengkap 15 Juli 2026; sesi/challenge dicabut, secret hanya `.env` |
| Release script allowlist + secret scan + checksum + manifest | 4.1 | ✅ `release:build` + `security:scan` |
| Environment guard LOCAL-DEV / LOCAL-INTEGRATION / LAN-UAT / PRODUCTION | 4.2 | ✅ nama environment, DB guard, seed guard, secure-cookie/scanner/activation guard |
| Gate `MAT_PRODUCTION_ACTIVATION_ALLOWED` (§34) | 34 | ✅ boot produksi diblokir tanpa flag=1 |
| Numbering multi-branch `{DOC}-{BRANCH}-{MMYY}-{SEQ}` + config version + concurrency 100 | 4.3 | ✅ migrasi 014, uji 100 paralel unik |
| Session touch throttle 5–10 mnt (hapus FOR UPDATE per request) | 4.4 | ✅ throttle 5 menit, tanpa row lock setiap request |
| Stable CSRF multi-tab tanpa false 403 | 4.4 | ✅ previous-token grace 10 menit + regression test |
| Revoke session saat password/role berubah + risk data IP/UA | 4.4 | ✅ password/role/status revoke + IP/UA risk flags |
| Trusted proxy: X-Forwarded-Proto/Host/For + IP asli utk audit/rate limit | 4.5 | ✅ exact/CIDR trusted proxy; forwarding asing diabaikan |
| Worker heartbeat 15–20 dtk + status CLAIMED/RUNNING/DEAD_LETTER + backoff + manual retry/cancel + timeout per job | 4.6 | ✅ heartbeat 15 dtk, lifecycle eksplisit, deadline, retry/cancel/backoff |
| Job policy registry (permission/role/scope/MFA/PIN/max rows/frequency/retention per job type) | 4.7 | ✅ registry + immutable policy/data-scope snapshot |
| Data scope standar (GLOBAL…OWN_RECORD) di semua repository + export + artifact + file + audit | 4.8 | ✅ enum baku; transaksi, worker report/export, artifact ownership, file, dan audit terscope |
| Pisah Owner/System Admin/Security Admin/dst (13 role governance) | 4.9 | ✅ Sprint 6: katalog role, least privilege, assignment maker-checker/effective-dated |
| SoD rule engine (Creator≠Approver dst + conflict detection + override ber-PIN) | 4.10 | ✅ rule/event konflik, creator≠approver, override Owner scoped maks. 24 jam |
| Approval engine configuration-driven + policy snapshot per dokumen | 4.11 | ✅ policy versioned/effective-dated, maker-checker, overlap guard, immutable snapshot |
| File security pipeline (quarantine→validate→scan→classify→CLEAN) + status file | 4.12 | ✅ quarantine, signature/archive, async scan, status, branch scope; production AV fail-closed |
| Backup lokal + restore drill + alert (§4.13) | 4.13 | ✅ v0.6.0 (offsite terenkripsi + drill + alert) |

## R013 — Enterprise Organization, IAM & SoD (§5)

| Item | Status |
|---|---|
| 13 entitas organisasi (legal_entities…ledgers) | ✅ migrasi 012 terpasang + seed MAT terverifikasi (9 dept, 9 CC, 3 PC, plant/gudang/bin/WC) |
| Aturan organisasi (warehouse ≠ FK branches; transaksi ber-cost center; movement ber-warehouse) | ✅ policy per tipe dokumen + auto-resolution cost center aktif + validasi legal entity + immutable dimension snapshot (023) |
| Multi-currency future-ready (functional/transaction/reporting, FX) | ✅ registry mata uang, kurs effective-dated direct/inverse, functional/reporting amount + immutable FX snapshot (023) |
| Role redesign + field masking + access review | ✅ role enterprise + masking bank/salary + access review retain/revoke/completion |

## R014 — Master Organization & Employee (§7–8)

### Sprint 7 completion record — v0.10.0 (15 Juli 2026)

- ✅ Organization Workbench: legal identity versioning, hierarchy, assets, signatory, tax identity, bank registry.
- ✅ Company bank control: maker ≠ checker, Owner PIN, recent MFA step-up, reason, masked audit old/new.
- ✅ Business documents store an immutable organization identity/bank/signatory snapshot at creation.
- ✅ Employee UI follows exactly 10 final tabs; normalized sub-tables are grouped without a duplicate renderer.
- ✅ Compensation and payroll-bank changes use maker-checker; salary, bank, restricted records remain permission-masked.
- ✅ Migration 017, rollback, integration coverage, self-test gate, and release manifest are included.

| Item | Status |
|---|---|
| Master Organization: identitas lengkap + aset dokumen + signatory | ✅ Organization Workbench (identitas ber-versi, hierarki, aset, signatory, identitas pajak, registry bank) — migrasi 017 |
| Bank account governance perusahaan (maker-checker + PIN + audit old/new) | ✅ maker ≠ checker + PIN Owner + step-up MFA + alasan + audit old/new ter-masking |
| Employee 13 sub-tabel ternormalisasi (§8.10) | ✅ migrasi 013 + 017 (termasuk klaim asuransi & restricted records) |
| 10 tab UI Employee (Overview…Audit) | ✅ 10 tab final tanpa renderer ganda |
| MDM lifecycle DRAFT→ARCHIVED + effective date + versioning + change reason (§6) | ✅ lifecycle + versi + alasan + audit pada 4 master |

## R015 — Master Customer, Supplier & Product (§9–11)

| Item | Status |
|---|---|
| Customer: PIC multipel, alamat multipel, commercial control, credit, dokumen, wizard | ✅ PIC/alamat/harga khusus/commercial field + credit hold/limit/override enforcement + Customer Link Wizard server-autosave/recovery/finalisasi atomik (§9.5) |
| Supplier: onboarding, legal&tax, bank governance maker-checker, approved material, price history revisioned, scoring | ✅ automatic scoring PO/GR/QC/dokumen, policy effective-dated, document expiry, risk hold, dan maker-checker |
| Product: varian, UoM konversi, BOM revision lifecycle, cost components, HPP versioning + Active HPP lock + snapshot | ✅ Variant Matrix + UoM + BOM lifecycle + cost components + Active HPP + BOM Cost Trace berbasis sumber dan scrap |
| Duplicate detection master | ✅ normalized code/NIK + NPWP guard sebelum create/update; DB unique tetap lapisan terakhir |

## R016–R023 — Modul lanjutan (§12–23)

| Release | Ruang lingkup | Status |
|---|---|---|
| R016 Sales & Order-to-Cash | inquiry→quotation revisi→PO→SO/proyek→credit control→delivery→invoice→collection→warranty | ✅ v0.34.0 — alur dasar, quotation revision, credit/dunning/RMA, ATP/CTP line promise, margin exception maker-checker, customer contract/blanket release, milestone billing idempoten, dan backorder worklist selesai; UAT bisnis tetap gate terpisah |
| R017 Procurement Source-to-Pay | PR→budget→RFQ→comparison→PO→GR→three-way match→payment proposal | ◐ engine purchase contract/blanket + controlled release migration 059 dan Contract 360/release history v0.36.0 ✅; supplier portal/EDI dan advanced sourcing analytics tetap pengembangan lanjutan |
| R018 Warehouse & Inventory | hierarchy, bin, lot/serial/heat, reservation, opname, valuation policy | ◐ reservation engine 057, bin execution 058, lot/opname, perpetual inventory/COGS 062, Reservation Workbench v0.36.0, serta **Warehouse Task Engine 075 (receiving→put-away→pick→pack→ship + cycle count sebagai tugas bertipe, siklus hidup, optimistic lock, RLS, Warehouse Task Board) v0.40.0** ✅; **Canonical Warehouse Ledger Stage 1 (org_warehouse_id + default per cabang + trigger self-healing + view Legal Entity→Plant→Warehouse) v0.41.0** ✅; grain-flip penuh `warehouse_id` (Stage 2) + barcode/handling-unit/FEFO tetap Wave E |
| R019 Production, BOM, MRP & QC | routing, work center, MRP, capacity, WIP, job costing, inspection plan, NCR/CAPA, kalibrasi | ◐ engine capacity/WIP 060 dan CAPA/calibration 061 beserta Control Tower/Calibration Register v0.36.0 ✅; inspection-plan sampling dan maintenance/EAM tetap Wave E |
| R020 Finance, Accounting & Fixed Asset | posting profile, segmented COA, subledger, closing cockpit, fixed asset, budgeting | ◐ posting profile config-driven + budget pengadaan ✅ + **fixed asset registry (FA-*, kategori configuration-driven umur+akun), depresiasi garis lurus otomatis (idempoten per periode, jurnal sistem JRN-*), disposal ber-jurnal nilai buku, laporan keuangan formal (neraca balance dgn akun kontra bertanda benar + laba rugi), closing cockpit 10 checklist rekonsiliasi (bank/inventori/payroll/pajak/subledger/penyusutan) → readiness, subledger AR/AP vs GL ber-selisih terukur** ✅ Sprint 13; failed posting queue, project profitability, segmented COA formal ⬜ |
| R021 HRD, Payroll & Tax | shift/roster, koreksi absensi, leave accrual, rule engine payroll/BPJS/PPh21 versioned | ◐ payroll rule engine ber-versi ✅ + **shift/roster (jam lembur payroll dari shift roster — hardcode 8 jam dihapus, default NORMAL parity), work calendar + aturan akhir pekan, koreksi absensi maker-checker (snapshot lama immutable, SoD DB, source CORRECTION), leave accrual engine (kebijakan effective-dated, akrual bulanan idempoten, masa kerja minimum), LEAVE_REQUEST tervalidasi saldo & durasi hari kerja + pemotongan otomatis saat approve** ✅ Sprint 14; payslip PDF per karyawan, multi-shift per hari ⬜ |
| R022 Document, Notification & Integration | template dokumen resmi, SMTP, webhook, API versioning, OpenAPI, event catalog | ◐ **template resmi immutable + QR grafis + HMAC key rotation + watermark/pagination/audit reprint, PDF attachment SMTP dan retry idempotent, OpenAPI 3.0.3 + X-API-Version, event catalog** ✅ v0.22.0; logo binary terkelola dan webhook outbound allowlisted masih ⬜ |
| R023 Reporting & Executive Cockpit | SQL KPI layer, materialized view, laporan terjadwal | **✅ Sprint 16 / v0.23.0**: semantic KPI berbasis GL/subledger/produksi/QC, materialized 12-month summary + freshness worker, filter periode/cabang + saved view, executive mobile cockpit, AR aging/order funnel/project actual margin/action queue, 8 laporan XLSX/PDF, scheduler harian/mingguan/bulanan anti-duplikasi, export scope validation, dan audit download |

## R024–R026 — Audit final, UAT LAN, Go-live (§29–34)

| Item | Status |
|---|---|
| Pemisahan skrip test (unit/integration/e2e/security/authorization/migration/performance/ui) | ✅ script terpisah dan tervalidasi |
| Negative authorization tests lengkap (§29.4) | ✅ matriks 14 router/183 handler, permission allow/deny, branch/IDOR, dan public allowlist terversi; authorization 14/14 |
| Load test 10/25 user LAN | ✅ read+write ber-CSRF: 10 user/220 request dan 25 user/550 request, 0 gagal, p95 di bawah ambang |
| Self-Test final PASS/WARNING/FAIL/BLOCKED (§30) | ✅ 20 kontrol: 19 PASS, 1 WARNING opening inventory, 0 FAIL/BLOCKED; warning menjadi tindakan UAT Finance/Owner |
| Dokumentasi & SOP (§31, 18 dokumen) | ✅ katalog 18 SOP terversi dan tervalidasi automated test |
| LAN multi-user pilot & UAT per divisi + Owner sign-off (R025) | ◐ technical gate ✅; 13 role execution, training, rekonsiliasi, retest, dan Owner sign-off ⬜ (butuh boss & staf) |
| R026 VPS activation (runbook siap) | ⬜ ditahan sampai gate §34 penuh |

## Aturan koding permanen (§35)

Dilarang: duplicate page/renderer, legacy tersembunyi, mapping akun & tarif
pajak/payroll hardcoded, direct balance edit, hapus transaksi posted, bypass
approval, secret di source, VPS sebelum gate. Wajib: modul terpisah,
service/repository, transaction boundary, idempotency, optimistic lock, audit
old/new/reason, scope organisasi, konfigurasi effective-dated, snapshot
kalkulasi ber-versi, test + migration + dokumentasi menyatu. `pages.js` dipecah
per modul bertahap tanpa renderer kedua.
