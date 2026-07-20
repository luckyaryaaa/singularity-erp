# MAT ERP V2 — Mandiri Abadi Teknik

ERP internal multi-pengguna dengan identitas Soft Clay Enterprise. Runtime
normal memakai Node.js 20+ dan PostgreSQL 16 sebagai sumber data tunggal.

## Menjalankan

```powershell
npm.cmd run db:validate
npm.cmd test
npm.cmd run dev
```

Aplikasi tersedia di `http://127.0.0.1:4173`. Credential development hanya
dibaca dari `.env`; akun demo dan password hard-coded tidak tersedia pada
runtime PostgreSQL.

## Status v0.24.0 — Final Assurance & LAN-UAT Readiness

- Sprint 17/R024 selesai: matriks otorisasi 14 router dan 183 handler,
  negative allow/deny test, serta public-endpoint allowlist menjadi bukti
  eksplisit dan terversi.
- Self-Test final memakai taksonomi `PASS/WARNING/FAIL/BLOCKED` dan mengaudit
  rekonsiliasi jurnal, persediaan, payroll, current/next partition, orphan
  kritis, backup/restore, IAM, dokumen resmi, serta reporting freshness.
- Migration 035 menyediakan maintenance partisi inventory yang terkontrol
  melalui fungsi `SECURITY DEFINER`; runtime role tetap tidak mempunyai hak
  membuat schema/table.
- Load LAN terotomasi menguji 10 lalu 25 sesi pengguna independen dengan
  kombinasi read dan write, CSRF, cleanup, serta ambang p95 terpisah.
- Katalog 18 SOP operasional tersedia dan divalidasi oleh automated test.
- Evidence closure: regression 136/136, authorization 14/14, security 5/5,
  a11y 18/18, visual 10/10, migration 001–035 dan rollback drill penuh lulus.
  Secret scan 434 file/0 temuan, dependency audit cache 0 vulnerability, dan
  paket production 281 file tervalidasi. Predeploy LOCAL 13/13 lulus; Self-Test
  berakhir 19 PASS, 1 WARNING data pembukaan persediaan, 0 blocking.

Status saat ini **LOCAL BUILD / LAN-UAT CANDIDATE**, bukan klaim seluruh ERP
production-ready. Sprint 18 LAN-UAT lintas divisi, koreksi opening balance yang
disetujui Finance/Owner, Owner sign-off, dan Sprint 19 aktivasi VPS tetap
mengikuti backlog resmi.

## Status v0.16.0 — Enterprise Master Governance (Sprint 8C Selesai)

- Customer Link Wizard mengubah Inquiry/Quotation/PO pelanggan/Sales Order/
  Project menjadi Customer baru atau menautkannya ke Customer yang sudah ada.
- Draft wizard tersimpan di server, dapat dipulihkan selama 30 hari, dilindungi
  optimistic locking, dan finalisasi atomik serta idempotent.
- Supplier Performance Cockpit menghitung delivery, quality, price, dan
  compliance dari bukti PO/GR/QC/dokumen memakai policy effective-dated.
- Dokumen supplier memakai maker-checker; dokumen wajib kedaluwarsa dan nilai
  kinerja di bawah ambang otomatis menghasilkan risk hold yang memblokir PO.
- Regression 84/84, migration 001–026, rollback 025–026, accessibility 18/18,
  visual 8/8, dan predeploy LOCAL 11/11 lulus. Seluruh item Sprint 8C kini
  selesai; aktivasi VPS tetap ditahan sampai LAN-UAT dan gate go-live.

Rilis ini berstatus **LOCAL BUILD READY**. Sprint berikutnya adalah R016 Sales
& Order-to-Cash; status ini bukan klaim bahwa seluruh ERP siap production.

## Status v0.15.0 — Enterprise Master Governance (Sprint 8C Wave 1)

- Customer, Supplier, dan Product dapat dipelihara memakai field enterprise;
  duplicate code/NPWP diblokir sebelum penyimpanan.
- Data Quality & FX Center menampilkan skor kualitas empat master, issue
  prioritas, currency registry, dan kurs effective-dated.
- Dokumen menyimpan immutable currency/dimension snapshot, nilai
  transaction/functional/reporting, serta cost center tervalidasi legal entity.
- Product memiliki Variant Matrix dan BOM Cost Trace berbasis Active HPP.
- Regression 82/82, aksesibilitas 18/18, visual 8/8, migration 001–024,
  rollback disposable, serta predeploy LOCAL 11/11 lulus.

Rilis ini menutup Wave 1. Kedua pekerjaan yang saat itu masih terbuka telah
diselesaikan pada v0.16.0; aktivasi VPS tetap belum dilakukan.

## Status v0.14.0 — Modular Monolith Foundation (Sprint 8B Selesai)

- Frontend terdiri dari 11 bounded module; `pages.js` hanya menyimpan PageKit
  reusable dan tidak lagi memuat implementasi halaman domain.
- Backend PostgreSQL terdiri dari route module Auth, Workspace, Documents,
  Procurement, Operations, Masters, Organization, Inventory, Production,
  Finance, HR, dan Governance; `api-postgres.js` hanya menangani cross-cutting
  HTTP/session/transaction/security concern serta delegasi domain.
- Architecture guard mencegah composition root melewati 100 baris atau route
  domain kembali ditulis langsung ke root.
- Single app shell, single router, single auth/permission/workflow/numbering,
  dan satu PostgreSQL source of truth tetap dipertahankan—bukan microservices.
- Regression 79/79, aksesibilitas 18/18, visual 8/8, dan predeploy LOCAL 11/11
  lulus tanpa perubahan kontrak endpoint maupun workflow.

Rilis ini menutup Sprint 8B pada status **LOCAL BUILD READY**. Tahap berikutnya
adalah Sprint 8C finalisasi master data, bukan aktivasi VPS atau production.

## Status v0.13.0 — Enterprise UX & Delivery Foundation

- Semua daftar dokumen memakai Enterprise View Console: pencarian, filter,
  sorting, pagination server-side, saved view, pilihan kolom, density, dan URL
  state yang dapat dibagikan/bookmark.
- Keyboard/focus flow diperkeras untuk app shell, drawer, menu mobile, dialog,
  tabel, dan reduced-motion; audit otomatis 18/18 lulus.
- Visual regression menangkap Dashboard, Penawaran, Work Order, dan Approval
  pada desktop + mobile; 8/8 kontrak visual lulus tanpa page overflow atau
  tombol visible tanpa accessible name.
- Paket release memakai 12-digit content hash, precompressed Brotli/Gzip,
  cache immutable satu tahun, dan manifest SHA-256 yang terverifikasi runtime.
- Composition root API mulai dipisah per bounded domain; production/QC/MRP kini
  berada di `backend/routes/production.js`, sedangkan tabel enterprise menjadi
  komponen mandiri `src/components/enterprise-table.js`.

Rilis ini adalah **LOCAL BUILD READY**, bukan production go-live. Pemecahan
domain frontend/backend berikutnya tetap dilakukan inkremental agar kontrak
transaksi tidak rusak; LAN-UAT, Owner sign-off, dan aktivasi VPS masih mengikuti
backlog resmi.

## Status v0.12.0 — Production, Quality & MRP Foundation (R019)

- Work order production cockpit mencakup routing/work center, BOM explosion,
  reservasi stok eksplisit, material issue FIFO, actual time, job costing, dan
  penerimaan barang jadi ber-lot.
- Quality inspection incoming/in-process/final menerbitkan NCR, menyimpan root
  cause/CAPA, dan otomatis mengkarantina lot gagal.
- MRP melakukan netting kebutuhan WO dan safety stock terhadap stok serta PO,
  lalu mengonversi suggestion menjadi Purchase Request secara idempotent.
- Seluruh mutasi production/QC/MRP membutuhkan idempotency key, menerapkan
  branch scope, completion gate, dan least-privilege database.
- Migration 001–022 valid, rollback 022→021 terbukti di database disposable,
  regression 74/74 lulus, secret/dependency audit bersih, load smoke lulus,
  serta backup offsite terenkripsi dan restore drill 124 tabel berhasil.

Rilis ini adalah **LOCAL BUILD READY**, bukan production go-live. Capacity
planning, WIP accounting formal, inspection plan, calibration, LAN-UAT, Owner
sign-off, dan aktivasi VPS tetap mengikuti backlog resmi.

## Status v0.9.0 — Sprint 6 / R013 IAM, SoD & Approval Governance

- 13 enterprise roles memisahkan Owner, System Admin, Security Admin,
  Finance Manager, Auditor, dan business roles; perubahan role wajib melalui
  assignment maker-checker dengan effective date dan scope organisasi.
- Role assignment menjadi sumber otorisasi sesi. Assignment kedaluwarsa
  otomatis berstatus EXPIRED dan seluruh sesi terkait dicabut.
- SoD engine memblokir pasangan role konflik, self-approval dokumen, dan
  self-activation policy. Emergency override hanya oleh Owner, memakai PIN,
  alasan, scope, audit trail, dan maksimum 24 jam.
- Approval policy tersimpan sebagai versi effective-dated. Dokumen menyimpan
  policy ID dan snapshot immutable ketika diajukan sehingga histori tidak
  berubah saat konfigurasi berikutnya aktif.
- Access review periodik menyediakan snapshot assignment, keputusan
  retain/revoke, pencabutan sesi, completion gate, dan audit trail.
- Self-test serta predeploy gate memverifikasi tabel IAM/SoD, policy aktif,
  expiry assignment, migration checksum, backup/restore, dan regresi penuh.

## Status v0.8.0 — Sprint 5 / R012 runtime hardening

- Credential runtime, Owner/UAT, MFA, dan backup sudah dirotasi tanpa mencetak
  secret; seluruh sesi lama dicabut dan `.env` tetap di luar repository.
- Environment guard memisahkan LOCAL-DEVELOPMENT, LOCAL-INTEGRATION, LAN-UAT,
  dan PRODUCTION; seed serta aktivasi production bersifat fail-closed.
- Session touch ditahan 5 menit, CSRF memiliki grace token untuk multi-tab,
  perubahan password/role mencabut sesi, dan perubahan IP/perangkat ditandai.
- Header forwarding hanya dipercaya dari trusted proxy; HTTPS, secure cookie,
  HSTS, host, origin, dan bind address dikendalikan environment.
- Job registry menetapkan izin, role, data scope, MFA/PIN, limit, timeout,
  retry/backoff, heartbeat, cancel, dead-letter, serta retensi artifact.
- Lampiran memakai quarantine → scan → CLEAN, validasi signature/archive,
  checksum, EICAR policy, dan filter akses cabang. Production wajib Defender
  atau ClamAV; scanner builtin hanya untuk development.
- Report/export dan file memakai scope organisasi baku (GLOBAL sampai
  OWN_RECORD), termasuk filter cabang pada worker asynchronous.
- Release allowlist menghasilkan checksum manifest dan secret scan. Gerbang
  stage-aware membedakan LOCAL, LAN-UAT, dan PRODUCTION.
- 49 automated tests lulus, termasuk regression R012; backup offsite terenkripsi
  dan restore drill PostgreSQL tetap wajib sebelum rilis.

## Status v0.7.0 — Master data & organisasi enterprise (R012–R015 Wave 1)

- Struktur organisasi enterprise: legal entity → business unit → branch → plant
  → warehouse mandiri → storage location → bin, plus department, cost/profit
  center, work center, project WBS, fiscal calendar, ledger (migrasi 012).
- Master data ternormalisasi (migrasi 013): **employee 13 sub-tabel** (personal,
  posisi, riwayat kerja, kontrak, kompensasi, pajak, BPJS per program, asuransi,
  bank ber-verifikasi, dokumen, sertifikasi, kontak darurat, akses); **customer**
  contacts/addresses/harga khusus + credit control; **supplier** bank
  maker-checker (SoD), approved materials, price history append-only, evaluasi;
  **product** varian/UoM/BOM ber-revisi/HPP ber-versi + Active HPP lock.
- Lifecycle MDM DRAFT→PENDING_REVIEW→APPROVED→ACTIVE→SUSPENDED→BLOCKED→OBSOLETE→ARCHIVED.
- Halaman master detail bertab (Employee 10+ tab) dengan masking gaji/rekening
  server-side dan aktivasi HPP satu klik.
- Numbering branch-aware `{DOC}-{BRANCH}-{MMYY}-{SEQ}` — uji 100 paralel tanpa
  tabrakan; nomor legacy tetap terbaca.
- Gate produksi `MAT_PRODUCTION_ACTIVATION_ALLOWED` (§34 master update).
- Backlog resmi seluruh FINAL MASTER UPDATE: `docs/roadmap/master-update-backlog.md`.
- 42/42 automated tests lulus (termasuk master data enterprise E2E).

## Status v0.6.0 — Pengerasan produksi (pra go-live VPS)

- Git version control aktif; dead code legacy dihapus.
- Partisi `audit_logs` 2026–2031 + DEFAULT + maintenance otomatis 12 jam
  (menutup kegagalan tulis massal per 1 Jan 2027).
- Fail-fast runtime: tanpa `MAT_DB_MODE=postgres` server menolak menyala;
  kredensial demo dihapus total dari klien.
- Backup 3-2-1: salinan offsite terenkripsi AES-256-GCM + retensi 14 +
  `backup:decrypt`; restore drill terverifikasi terhadap migrasi 011.
- Alert webhook operasional (backup/restore/partisi/job gagal) +
  `/api/health` tanpa autentikasi untuk uptime monitor.
- FIX: SSE runtime PostgreSQL kini benar-benar terdaftar ke event bus.
- Paket deploy VPS: `deploy/` (Caddyfile HTTPS+HSTS, systemd hardened,
  firewall) + `docs/release/vps-runbook.md` + `npm run predeploy` (4/4 hijau).
- Uji beban: 300 req @ 12 konkuren — p50 6 ms, p95 135 ms (target <500 ms).
- 41 automated tests lulus; self-test runtime 9/9; gerbang rilis terbuka.

## Status v0.5.0 — Sprint 4

- PostgreSQL pool least-privilege, migration checksum 001–010, transaksi atomic.
- Session HttpOnly, CSRF hash, lockout, rate limit, RBAC/ABAC, PIN Owner.
- Password-change challenge dan MFA TOTP persisten, terenkripsi, sekali pakai.
- Numbering concurrency-safe, optimistic locking, idempotency, audit append-only.
- Persistent jobs dengan priority, lease, retry, recovery, dan `SKIP LOCKED`.
- Konversi dokumen lintas domain, posting inventory dan jurnal double-entry idempotent.
- CRUD master terotorisasi, file privat ber-checksum, PDF/Excel artifact, notification delivery.
- Backup otomatis dengan retention; backup nyata dan restore drill tervalidasi.
- Outbox + SSE, server-side pagination, cache terarah, responsive app shell.
- Accounting aktual: trial balance, buku besar, jurnal manual, closing/reopen, rekonsiliasi bank.
- Finance aktual: alokasi pembayaran, AR/AP posting, import mutasi bank, laporan berbasis data.
- HR aktual: kehadiran, import CSV, saldo cuti, kalkulasi payroll, BPJS, PPh 21, dan slip privat.
- Tax record aktual dari invoice, supplier invoice, dan payroll; status pelaporan tercatat.
- CRUD/import master, lampiran privat per dokumen, setting sensitif Owner + PIN, monitoring storage nyata.
- Dashboard, approval, notification, seluruh dokumen, master, inventory, accounting,
  tax, HR, payroll, audit, monitoring, settings, dan self-test memakai PostgreSQL.
- 38 automated tests lulus, termasuk HTTP restart persistence dan integrasi lintas domain Sprint 4.

## Operasional penting

```powershell
npm.cmd run db:health
npm.cmd run db:status
npm.cmd run db:seed:uat:sprint4
npm.cmd run security:rotate-owner
npm.cmd run backup:run
npm.cmd run backup:restore-test
npm.cmd run backup:decrypt -- <file.dump.enc> [keluaran.dump]
npm.cmd run predeploy      # gerbang wajib hijau sebelum deploy
npm.cmd run load:smoke     # uji beban ringan (target p95 < 500 ms)
npm.cmd run load:lan       # simulasi LAN 10/25 user dengan read + write
```

Go-live VPS: ikuti `docs/release/vps-runbook.md` — VPS diaktifkan pada fase
terakhir setelah `predeploy` hijau, agar masa langganan tidak terbuang.

Perintah rotasi menghasilkan password baru langsung di `.env`, memperbarui hash
PostgreSQL, mencabut semua sesi Owner, dan tidak mencetak secret.

## Dokumentasi

- `docs/architecture/overview.md`
- `docs/api/endpoints.md`
- `docs/database/schema.md`
- `docs/security/security-model.md`
- `docs/self-test/checklist.md`
- `docs/security/endpoint-authorization-matrix.md`
- `docs/sop/README.md`
- `docs/operations/sprint17-final-audit-evidence.md`
- `docs/operations/sprint16-reporting-evidence.md`
- `docs/operations/deployment-runbook.md`
- `docs/release/DELIVERY.md`
