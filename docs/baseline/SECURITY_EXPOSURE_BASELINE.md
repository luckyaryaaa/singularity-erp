# SECURITY EXPOSURE BASELINE — MAT ERP V2 (v0.29.0, 2026-07-22)

Prioritas mengikuti klasifikasi audit; setiap item ditandai status faktual pada lingkungan ini.

## A. Paparan artefak & release (P0)

| # | Temuan | Status faktual | Tindakan P0 |
|---|---|---|---|
| A1 | 18 dump PostgreSQL **plaintext** di `storage/backups/` (~6.9 MiB) | ADA. Tidak ter-track git (gitignored). Bocor hanya bila workspace di-ZIP manual | Enkripsi in-place + backup baru terenkripsi lokal |
| A2 | Screenshot smoke + artifacts runtime di `storage/` | ADA, gitignored | Masuk deny-list scanner artefak final |
| A3 | `.env` berisi secret aktif di workspace | ADA (by design dev). Tidak ter-track git | Larangan distribusi workspace + scanner artefak final yang memindai **hasil release**, bukan hanya source |
| A4 | Secret scanner mengecualikan .env/storage/dump/PDF/ZIP → "0 findings" tidak membuktikan paket aman | BENAR (dikonfirmasi baca `scripts/secret-scan.js`) | Buat `release:verify` = scan artefak final tanpa pengecualian kategori + deny-list file terlarang + SBOM |
| A5 | Distribusi harus selalu dari `release/` hasil builder (297 file, manifest SHA-256) | Builder ADA & lulus | Jadikan satu-satunya jalur paket; gate menolak selainnya |

## B. Authorization & IAM (P0)

| # | Temuan | Status faktual |
|---|---|---|
| B1 | `ROLE_GRANTS` statis di source; DB bukan sumber kebenaran runtime | BENAR — `backend/core/permissions.js` |
| B2 | Satu primary role per user; additional role ditolak repo IAM | BENAR — governance.js assignment |
| B3 | Emergency access tercatat tapi tidak dibaca `hasPermission()` | PARSIAL — `permission_overrides` dipakai jalur SoD override; `emergency_access_overrides` tidak terhubung runtime |
| B4 | MFA belum wajib untuk akun privileged; disable MFA cukup password | BENAR — auth.js |
| B5 | Tidak ada PostgreSQL RLS di seluruh migrasi | BENAR — grep `ROW LEVEL SECURITY` = 0 |
| B6 | Scrypt N=2^14 perlu dinaikkan + hash versioning | BENAR — core/password.js |

## C. Data scope & business enforcement (P0)

| # | Temuan | Status faktual |
|---|---|---|
| C1 | Dashboard: KPI finansial untuk semua pemegang `dashboard.view`; inventory KPI **tanpa filter cabang**; `revenueGrowthPct`/`cashPosition` hard-coded 0 | BENAR — backend/routes/workspace.js |
| C2 | Report generation hanya cek `report.export` generik, bukan per-report | BENAR — reporting.js + worker |
| C3 | Notifikasi role-target berbagi satu `read_at`; tanpa scope cabang/LE | BENAR — tabel notifications |
| C4 | Pricing dihitung browser; header amount tidak direkonsiliasi server vs lines | BENAR — runtime.createDocument menerima amount klien |
| C5 | Customer PO: validasi kecocokan quotation/customer/status hanya frontend; nomor PO pelanggan tidak unik | BENAR |
| C6 | Credit exposure = invoice terbuka saja; SO terbuka & delivery belum masuk; tanpa lock per-customer; tanpa checkpoint delivery | BENAR — procurement.assertCreditOk |
| C7 | RMA: qty/nilai retur tidak divalidasi terhadap pengiriman sumber & retur kumulatif | BENAR |
| C8 | Opname: create/read/count tidak assert scope warehouse; start tanpa idempotency | BENAR — inventory.js |
| C9 | MRP global (lintas cabang), sinkron, konversi ke PR cabang user | BENAR |
| C10 | Three-way match level header; toleransi qty tidak dipakai | BENAR — procurement.assertMatchOk |
| C11 | WO completion tanpa gate QC final; urutan operasi tidak dipaksa | BENAR — production.js |
| C12 | closePeriod hanya cek trial balance + unposted; checklist cockpit tidak dipaksa server | BENAR — business-operations.closePeriod |
| C13 | `/api/payments/allocate` tanpa idempotency (`ON CONFLICT amount+excluded` bisa dobel saat retry) | BENAR |
| C14 | accounting_periods global (`period UNIQUE`), bukan per Legal Entity/Ledger | BENAR — migrasi 002 |
| C15 | Kurs valuta: dibuat langsung ACTIVE, creator=approver | BENAR — master-governance.createExchangeRate |
| C16 | Kategori akun tak dikenal masuk sisi ekuitas diam-diam | BENAR — finance-reports.financialStatements |
| C17 | Employee list `SELECT m.*` mengekspos base_salary ke pemegang employee.view | BENAR — master-data listMaster |

## D. Audit & kriptografi (P0)

| # | Temuan | Status faktual |
|---|---|---|
| D1 | audit menerima old/newValue tanpa redaksi terpusat | BENAR — runtime.audit |
| D2 | Grant DB broad-grant-lalu-revoke; partisi audit baru berisiko dapat UPDATE/DELETE | PERLU VERIFIKASI di scripts/grant-runtime.js saat implementasi |
| D3 | Backup lokal plaintext (enkripsi hanya offsite) | BENAR — 18 dump plaintext |
| D4 | Bank account / NIK / salary plaintext di DB (masking hanya di response) | BENAR |
| D5 | Temporary password reset ditampilkan langsung di UI | BENAR |

## E. Yang SUDAH kuat (dipertahankan)

Scrypt+salt, session & CSRF hash, cookie hardening, lockout, TOTP AES-256-GCM, recent-MFA pada aksi sensitif, CSP ketat tanpa unsafe-inline, HSTS produksi, static allowlist anti-traversal, maker-checker (bank, role, kompensasi, PO change), SoD dokumen, quotation revision immutable, idempotency engine dokumen, advisory lock stok/numbering/closing, audit partisi + append-only sebagian, outbox, migration checksum, boot gate produksi `MAT_PRODUCTION_ACTIVATION_ALLOWED`.
