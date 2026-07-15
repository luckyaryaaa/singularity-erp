# Backlog Resmi — FINAL MASTER UPDATE MAT ERP V2

> Sumber: `FINAL_MASTER_UPDATE_MAT_ERP_V2.md` (14 Juli 2026). Dokumen ini adalah
> **acuan tunggal**: daftar backlog resmi, urutan implementasi, acceptance
> criteria, dan production-readiness gate. Setiap item di bawah wajib berstatus
> `SELESAI` atau punya alasan tertulis sebelum R026 (aktivasi VPS).
>
> Status: ✅ selesai · 🔨 sedang dikerjakan · ⬜ belum · ◐ sebagian (ada catatan)

## Keputusan arsitektur terkunci (§2)

| Item | Status |
|---|---|
| VPS hanya diaktifkan paling akhir (urutan §2.1) | ✅ dijaga — runbook + gate |
| Modular monolith dipertahankan, tanpa microservices | ✅ |
| Single engine (shell/router/API/auth/permission/workflow/numbering/dokumen/audit/db/self-test) | ✅ dijaga |

## R012 — Security, Release Hygiene & Runtime Hardening (P0 §4)

| Item | Ref | Status |
|---|---|---|
| Rotasi credential yang pernah masuk ZIP | 4.1 | ⬜ (jalankan `security:rotate-owner` + ganti PG password sebelum release berikutnya) |
| Release script allowlist + secret scan + checksum + manifest | 4.1 | ⬜ |
| Environment guard LOCAL-DEV / LOCAL-INTEGRATION / LAN-UAT / PRODUCTION | 4.2 | ◐ fail-fast MAT_DB_MODE + guard production ada; pemisahan nama DB & seed guard per env ⬜ |
| Gate `MAT_PRODUCTION_ACTIVATION_ALLOWED` (§34) | 34 | ✅ boot produksi diblokir tanpa flag=1 |
| Numbering multi-branch `{DOC}-{BRANCH}-{MMYY}-{SEQ}` + config version + concurrency 100 | 4.3 | ✅ migrasi 014, uji 100 paralel unik |
| Session touch throttle 5–10 mnt (hapus FOR UPDATE per request) | 4.4 | ⬜ |
| Stable CSRF multi-tab tanpa false 403 | 4.4 | ◐ (CSRF stabil per sesi; uji multi-tab formal ⬜) |
| Revoke session saat password/role berubah + risk data IP/UA | 4.4 | ◐ (revoke saat reset password ✅; role change & risk data ⬜) |
| Trusted proxy: X-Forwarded-Proto/Host/For + IP asli utk audit/rate limit | 4.5 | ⬜ |
| Worker heartbeat 15–20 dtk + status CLAIMED/RUNNING/DEAD_LETTER + backoff + manual retry/cancel + timeout per job | 4.6 | ◐ (lease+retry+recovery ✅; heartbeat, DEAD_LETTER, manual retry/cancel ⬜) |
| Job policy registry (permission/role/scope/MFA/PIN/max rows/frequency/retention per job type) | 4.7 | ⬜ |
| Data scope standar (GLOBAL…OWN_RECORD) di semua repository + export + artifact + file + audit | 4.8 | ◐ (branch scope & self-service ✅; standarisasi enum scope penuh ⬜) |
| Pisah Owner/System Admin/Security Admin/dst (12 role governance) | 4.9 | ⬜ |
| SoD rule engine (Creator≠Approver dst + conflict detection + override ber-PIN) | 4.10 | ◐ (creator≠approver dokumen ✅; engine aturan + deteksi konflik role ⬜) |
| Approval engine configuration-driven dari `approval_matrix` + policy snapshot per dokumen | 4.11 | ⬜ |
| File security pipeline (quarantine→validate→scan→classify→CLEAN) + status file | 4.12 | ◐ (validasi MIME/size/checksum/audit ✅; quarantine & scan hook ⬜) |
| Backup lokal + restore drill + alert (§4.13) | 4.13 | ✅ v0.6.0 (offsite terenkripsi + drill + alert) |

## R013 — Enterprise Organization, IAM & SoD (§5)

| Item | Status |
|---|---|
| 13 entitas organisasi (legal_entities…ledgers) | 🔨 Wave 1a — migrasi 012 |
| Aturan organisasi (warehouse ≠ FK branches; transaksi ber-cost center; movement ber-warehouse) | ◐ skema Wave 1a; enforcement transaksi bertahap |
| Multi-currency future-ready (functional/transaction/reporting, FX) | ◐ kolom currency di skema; engine FX ⬜ |
| Role redesign + field masking + access review | ⬜ (masking bank/salary server-side 🔨 Wave 1d) |

## R014 — Master Organization & Employee (§7–8)

| Item | Status |
|---|---|
| Master Organization: identitas lengkap + aset dokumen + signatory | ◐ (profil dasar + PIN ✅; logo/letterhead/signatory ⬜) |
| Bank account governance perusahaan (maker-checker + PIN + audit old/new) | ◐ (PIN+alasan ✅; maker-checker ⬜) |
| Employee 13 sub-tabel ternormalisasi (§8.10) | 🔨 Wave 1b — migrasi 013 |
| 10 tab UI Employee (Overview…Audit) | 🔨 Wave 1d |
| MDM lifecycle DRAFT→ARCHIVED + effective date + versioning + change reason (§6) | 🔨 Wave 1b |

## R015 — Master Customer, Supplier & Product (§9–11)

| Item | Status |
|---|---|
| Customer: PIC multipel, alamat multipel, commercial control, credit, dokumen, wizard | 🔨 Wave 1b/1d (wizard link ⬜) |
| Supplier: onboarding, legal&tax, bank governance maker-checker, approved material, price history revisioned, scoring | 🔨 Wave 1b/1d (scoring otomatis ⬜) |
| Product: varian, UoM konversi, BOM revision lifecycle, cost components, HPP versioning + Active HPP lock + snapshot | 🔨 Wave 1b (BOM/HPP skema; kalkulasi trace ⬜) |
| Duplicate detection master | ⬜ |

## R016–R023 — Modul lanjutan (§12–23)

| Release | Ruang lingkup | Status |
|---|---|---|
| R016 Sales & Order-to-Cash | inquiry→quotation revisi→PO→SO/proyek→credit control→delivery→invoice→collection→warranty | ◐ alur dasar ✅; credit control, revisi quotation, RMA/warranty ⬜ |
| R017 Procurement Source-to-Pay | PR→budget→RFQ→comparison→PO→GR→three-way match→payment proposal | ◐ PR/PO/GR/invoice/payment ✅; RFQ, three-way match, payment proposal batch ⬜ |
| R018 Warehouse & Inventory | hierarchy, bin, lot/serial/heat, reservation, opname, valuation policy | ◐ movement ledger+balance ✅; bin/lot/serial, opname, valuasi policy ⬜ |
| R019 Production, BOM, MRP & QC | routing, work center, MRP, capacity, WIP, job costing, inspection plan, NCR/CAPA, kalibrasi | ◐ WO+QC dasar ✅; BOM skema Wave 1b; MRP/capacity/NCR ⬜ |
| R020 Finance, Accounting & Fixed Asset | posting profile, segmented COA, subledger, closing cockpit, fixed asset, budgeting | ◐ posting+closing+rekonsiliasi ✅; posting profile config, subledger formal, fixed asset ⬜ |
| R021 HRD, Payroll & Tax | shift/roster, koreksi absensi, leave accrual, rule engine payroll/BPJS/PPh21 versioned | ◐ attendance/leave/payroll/pajak dasar ✅; rule engine ber-versi ⬜ |
| R022 Document, Notification & Integration | template dokumen resmi, SMTP, webhook, API versioning, OpenAPI, event catalog | ◐ PDF/artifact+webhook alert ✅; SMTP, template resmi ber-identitas, OpenAPI ⬜ |
| R023 Reporting & Executive Cockpit | SQL KPI layer, materialized view, laporan terjadwal | ◐ laporan dasar ✅; materialized/terjadwal ⬜ |

## R024–R026 — Audit final, UAT LAN, Go-live (§29–34)

| Item | Status |
|---|---|
| Pemisahan skrip test (unit/integration/e2e/security/authorization/migration/performance/ui) | ⬜ |
| Negative authorization tests lengkap (§29.4) | ◐ sebagian di suite |
| Load test 10/25 user LAN | ◐ smoke 12 konkuren ✅; skenario tulis ⬜ |
| Self-Test final PASS/WARNING/FAIL/BLOCKED (§30) | ◐ 9 cek ✅; financial/inventory/payroll reconciliation checks ⬜ |
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
