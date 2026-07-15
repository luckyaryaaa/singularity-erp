# Backlog Resmi — MAT ERP V2

> **Sumber acuan tunggal (terbaru): `FINAL_MASTER_UPDATE_TERPADU_MAT_ERP_V2_2026-07-15.md`**
> (menggantikan `FINAL_MASTER_UPDATE_MAT_ERP_V2.md` 14 Juli). Urutan sprint resmi:
> 8A release closure → 8B arsitektur/UI → 8C master data final → 9–16 modul →
> 17 audit final → 18 LAN-UAT → 19 VPS go-live. Setiap item wajib berstatus
> `SELESAI` atau punya alasan tertulis sebelum R026 (aktivasi VPS).
>
> **Sprint 8B — Fondasi arsitektur & UI: ◐ DIMULAI 15 Juli 2026.**
> ✅ My Work inbox lintas modul (§10.7): GET /api/my-work + halaman
> `src/modules/my-work.js` — file modul frontend pertama hasil pemecahan
> pages.js (router sama, tanpa renderer kedua) · ✅ HTTP hardening §5.1
> (requestTimeout 30s, headersTimeout 15s, keepAlive 7s, maxRequestsPerSocket
> 1000, konfigurasi via env) · ✅ liveness `/api/live` terpisah dari readiness
> `/api/health` + kontrak tes · ✅ i18n baseline §10.15 (src/i18n.js +
> locales id-ID/en-US, pengalih bahasa di topbar, nav & login ter-i18n).
> ⬜ Sisa 8B: pemecahan penuh pages.js/api-postgres.js/styles.css per modul,
> Design System 2.0 token, component library, Approval Center 2.0 (§10.8),
> enterprise table lanjutan (saved views/column chooser/density), aksesibilitas
> audit formal, visual regression test, static asset fingerprint + precompress.
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
> **Audit verifikasi terakhir — 15 Juli 2026 (v0.10.0):** migrasi 001–017
> checksum valid · 54/54 automated tests lulus · self-test runtime 12/12,
> rilis tidak diblokir · gerbang predeploy 9/9 hijau (environment stage,
> secret scan 296 file 0 temuan, dependency audit, load smoke, kontrol
> runtime R012+R013, backup+restore drill) · SSE, dashboard, login owner OK.

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
| Aturan organisasi (warehouse ≠ FK branches; transaksi ber-cost center; movement ber-warehouse) | ◐ skema + snapshot identitas ✅; enforcement cost-center wajib pada transaksi finansial ⬜ |
| Multi-currency future-ready (functional/transaction/reporting, FX) | ◐ kolom currency di skema; engine FX & kurs ⬜ |
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
| Customer: PIC multipel, alamat multipel, commercial control, credit, dokumen, wizard | ◐ PIC/alamat/harga khusus/credit field + tab UI ✅; **Customer Link Wizard (§9.5) ⬜; enforcement credit hold pada SO/invoice ⬜** |
| Supplier: onboarding, legal&tax, bank governance maker-checker, approved material, price history revisioned, scoring | ◐ semuanya ✅ kecuali **skor evaluasi otomatis dari data PO/GR ⬜** |
| Product: varian, UoM konversi, BOM revision lifecycle, cost components, HPP versioning + Active HPP lock + snapshot | ◐ skema+API+UI+aktivasi Active HPP ✅; **kalkulasi trace HPP dari BOM ⬜; varian UI ⬜** |
| Duplicate detection master | ⬜ (deteksi nama/NPWP mirip saat create) |

## R016–R023 — Modul lanjutan (§12–23)

| Release | Ruang lingkup | Status |
|---|---|---|
| R016 Sales & Order-to-Cash | inquiry→quotation revisi→PO→SO/proyek→credit control→delivery→invoice→collection→warranty | ◐ alur dasar + **credit control (hold/limit + override finance, enforce saat submit SO/Invoice)** ✅ Wave 2; revisi quotation ber-versi, dunning/collection, RMA/warranty ⬜ |
| R017 Procurement Source-to-Pay | PR→budget→RFQ→comparison→PO→GR→three-way match→payment proposal | ◐ PR/PO/GR/invoice/payment ✅ + **RFQ+perbandingan landed cost+pilih→PO, three-way match ber-toleransi (blokir approve+override), payment proposal batch** ✅ Wave 2; budget check & RFQ multi-line ⬜ |
| R018 Warehouse & Inventory | hierarchy, bin, lot/serial/heat, reservation, opname, valuation policy | ◐ movement ledger+balance ✅; bin/lot/serial, opname, valuasi policy ⬜ |
| R019 Production, BOM, MRP & QC | routing, work center, MRP, capacity, WIP, job costing, inspection plan, NCR/CAPA, kalibrasi | ◐ WO+QC dasar ✅; BOM skema Wave 1b; MRP/capacity/NCR ⬜ |
| R020 Finance, Accounting & Fixed Asset | posting profile, segmented COA, subledger, closing cockpit, fixed asset, budgeting | ◐ posting+closing+rekonsiliasi ✅; posting profile config, subledger formal, fixed asset ⬜ |
| R021 HRD, Payroll & Tax | shift/roster, koreksi absensi, leave accrual, rule engine payroll/BPJS/PPh21 versioned | ◐ attendance/leave/payroll/pajak dasar ✅; rule engine ber-versi ⬜ |
| R022 Document, Notification & Integration | template dokumen resmi, SMTP, webhook, API versioning, OpenAPI, event catalog | ◐ PDF/artifact+webhook alert ✅; SMTP, template resmi ber-identitas, OpenAPI ⬜ |
| R023 Reporting & Executive Cockpit | SQL KPI layer, materialized view, laporan terjadwal | ◐ laporan dasar ✅; materialized/terjadwal ⬜ |

## R024–R026 — Audit final, UAT LAN, Go-live (§29–34)

| Item | Status |
|---|---|
| Pemisahan skrip test (unit/integration/e2e/security/authorization/migration/performance/ui) | ✅ script terpisah dan tervalidasi |
| Negative authorization tests lengkap (§29.4) | ◐ sebagian di suite |
| Load test 10/25 user LAN | ◐ smoke 12 konkuren ✅; skenario tulis ⬜ |
| Self-Test final PASS/WARNING/FAIL/BLOCKED (§30) | ◐ 12 cek ✅ (verifikasi 15 Jul); rekonsiliasi financial/inventory/payroll + partition health + orphan check ⬜ |
| Dokumentasi & SOP (§31, 18 dokumen) | ◐ 8 dokumen ada |
| LAN multi-user pilot & UAT per divisi + Owner sign-off (R025) | ⬜ (butuh boss & staf) |
| R026 VPS activation (runbook siap) | ⬜ ditahan sampai gate §34 penuh |

## Aturan koding permanen (§35)

Dilarang: duplicate page/renderer, legacy tersembunyi, mapping akun & tarif
pajak/payroll hardcoded, direct balance edit, hapus transaksi posted, bypass
approval, secret di source, VPS sebelum gate. Wajib: modul terpisah,
service/repository, transaction boundary, idempotency, optimistic lock, audit
old/new/reason, scope organisasi, konfigurasi effective-dated, snapshot
kalkulasi ber-versi, test + migration + dokumentasi menyatu. `pages.js` dipecah
per modul bertahap tanpa renderer kedua.
