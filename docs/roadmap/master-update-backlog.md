# Backlog Resmi — MAT ERP V2

> **Sumber acuan tunggal (terbaru): `FINAL_MASTER_UPDATE_TERPADU_MAT_ERP_V2_2026-07-15.md`**
> (menggantikan `FINAL_MASTER_UPDATE_MAT_ERP_V2.md` 14 Juli). Urutan sprint resmi:
> 8A release closure → 8B arsitektur/UI → 8C master data final → 9–16 modul →
> 17 audit final → 18 LAN-UAT → 19 VPS go-live. Setiap item wajib berstatus
> `SELESAI` atau punya alasan tertulis sebelum R026 (aktivasi VPS).
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
> **Audit verifikasi terakhir — 16 Juli 2026 (v0.16.0):** migrasi 001–026
> checksum valid · 84/84 automated tests lulus · aksesibilitas 18/18 · visual
> regression 8/8 · asset fingerprint/Brotli/immutable PASS · gerbang predeploy
> LOCAL 11/11 hijau · secret/dependency audit bersih · backup + restore drill
> valid.

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
| R016 Sales & Order-to-Cash | inquiry→quotation revisi→PO→SO/proyek→credit control→delivery→invoice→collection→warranty | ◐ alur dasar + credit control ✅ Wave 2 + **revisi quotation ber-versi (snapshot immutable, guard konversi), dunning/collection configuration-driven (jenjang policy + auto credit hold + resolve ber-alasan), RMA/warranty (validasi masa garansi, disposisi RESTOCK/SCRAP/REPAIR, lot retur, jurnal profile RMA-DEFAULT)** ✅ Sprint 9; margin approval formal, milestone billing, backorder ⬜ |
| R017 Procurement Source-to-Pay | PR→budget→RFQ→comparison→PO→GR→three-way match→payment proposal | ◐ PR/PO/GR/invoice/payment + RFQ landed cost + three-way match + payment proposal ✅ Wave 2 + **budget check per periode/cabang (409 + override finance teraudit), RFQ multi-baris (total server-side + termurah per item + salin baris ke PO), PO change order maker-checker (SoD DB, terkunci pasca-GR), service receipt tanpa mutasi stok, payment reversal Owner+PIN (jurnal pembalik + alokasi reversed + invoice pulih)** ✅ Sprint 10; kontrak/blanket PO ⬜ |
| R018 Warehouse & Inventory | hierarchy, bin, lot/serial/heat, reservation, opname, valuation policy | ◐ movement ledger+balance ✅ + **lot/serial/heat-number traceability (mill certificate, FIFO, blokir QC, lineage transfer) + stock opname maker-checker (dokumen OPN, selisih dijurnal via posting profile OPNAME-DEFAULT) + valuasi per lapisan lot** ✅ Sprint 11; bin-level & reservation policy formal ⬜ |
| R019 Production, BOM, MRP & QC | routing, work center, MRP, capacity, WIP, job costing, inspection plan, NCR/CAPA, kalibrasi | ◐ **foundation transaksi selesai v0.12.0**: routing+rate snapshot, BOM explosion, reservasi, FIFO issue, actual time, costing, FG lot, QC+NCR/CAPA+karantina, MRP→PR, completion/security gate ✅; capacity planning, WIP accounting formal, inspection plan, kalibrasi ⬜ |
| R020 Finance, Accounting & Fixed Asset | posting profile, segmented COA, subledger, closing cockpit, fixed asset, budgeting | ◐ posting+closing+rekonsiliasi ✅ + **posting profile configuration-driven (§18.2): akun jurnal dari posting_profiles effective-dated + snapshot per dokumen, hardcode ACCOUNTING_RULES dihapus** ✅ Sprint 13; subledger formal, fixed asset, budgeting ⬜ |
| R021 HRD, Payroll & Tax | shift/roster, koreksi absensi, leave accrual, rule engine payroll/BPJS/PPh21 versioned | ◐ attendance/leave/payroll/pajak dasar ✅ + **payroll rule engine ber-versi (§19.5): tarif BPJS/PTKP/PPh21/lembur/absen dari payroll_rule_versions effective-dated + snapshot per payroll item, hardcode tarif dihapus** ✅ Sprint 14; shift/roster, koreksi absensi workflow, leave accrual ⬜ |
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
