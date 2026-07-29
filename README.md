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

## Status v0.42.0 — Unified Work Item Engine

- PostgreSQL source of truth berada pada migration 001–077.
- `work_items` (migrasi 077) menjadi backbone pekerjaan lintas modul (§4.4/§5.2):
  approval, exception, review, correction, dan tugas operasional menjadi entitas
  bertipe dengan siklus hidup penuh, prioritas, risiko, SLA/jatuh tempo, evidence,
  delegasi/substitusi, eskalasi, optimistic lock, RLS, dan audit.
- Aksi diekspos di router Workspace (create/claim/start/complete/return/hold/
  cancel/delegate/escalate); guard `dashboard.view` dengan kepemilikan dan scope
  cabang ditegakkan di repository. Membaca notifikasi tidak menutup pekerjaan.
- **My Work** kini berbasis work item nyata dengan aksi lifecycle langsung —
  bukan lagi agregasi read-only.
- Authorization matrix mencakup **302 handler** (Workspace 7).

Regression 384/384, migration 001–077, dan rollback full-chain 77/76/76 telah
tervalidasi. Status ini adalah **engineering release candidate**, bukan izin
production: UAT 13 role, security retest manual, persetujuan enam rekonsiliasi,
training, DR RTO/RPO, offsite evidence, dan Owner sign-off tetap menjadi gate
go-live.

## Status v0.41.0 — Canonical Warehouse Ledger (Stage 1)

- PostgreSQL source of truth berada pada migration 001–076.
- Memulai migrasi §9.8 dari "Branch-as-Warehouse" ke hierarki nyata **Plant →
  Warehouse → Storage Location → Bin** tanpa membalik kunci isolasi. Setiap
  cabang aktif kini punya **gudang default** deterministik (backfill 7/7).
- `stock_lots` memperoleh `org_warehouse_id` (identitas gudang kanonik). Trigger
  self-healing menjamin gudang lot selalu berada di dalam cabangnya; put-away
  menyelaraskan gudang lot ke gudang rak tujuan (ledger mengikuti penempatan).
- View `stock_warehouse_ledger` (security_invoker) menyatukan Legal Entity →
  Plant → Warehouse; endpoint `GET /api/inventory/warehouses` dan tab **Gudang**
  menampilkannya per cabang.
- Jembatan cabang↔gudang kini eksplisit dan ter-enforce. Grain-flip penuh
  (mengganti makna `warehouse_id` di ~200 titik + RLS) adalah cutover berlapis
  berikutnya (Stage 2).
- Authorization matrix mencakup **298 handler** (Inventory 21).

Regression 376/376, migration 001–076, dan rollback full-chain 76/75/75 telah
tervalidasi. Status ini adalah **engineering release candidate**, bukan izin
production: UAT 13 role, security retest manual, persetujuan enam rekonsiliasi,
training, DR RTO/RPO, offsite evidence, dan Owner sign-off tetap menjadi gate
go-live.

## Status v0.40.0 — Warehouse Execution Task Engine

- PostgreSQL source of truth berada pada migration 001–075.
- Warehouse Task Engine (migrasi 075) menjadikan eksekusi gudang —
  receiving, put-away, pick, pack, ship, dan cycle count — sebagai **tugas
  bertipe** yang dapat ditugaskan, diklaim, dikerjakan, dan diaudit, dengan
  siklus hidup OPEN→CLAIMED→IN_PROGRESS→DONE/CANCELLED, prioritas, jatuh tempo,
  optimistic version, dan RLS isolasi cabang.
- Tugas PUTAWAY menyelesaikan diri dengan memindahkan lot ke rak tujuan lewat
  penempatan lot yang sudah ada — status DONE berarti stok benar-benar berpindah,
  bukan sekadar ditandai. Ledger stok tidak diubah: migrasi Branch-as-Warehouse
  kanonik tetap pekerjaan tersendiri.
- Router Inventory bertambah enam handler (papan kerja + create + claim + start +
  complete + cancel) dengan permission delegated, optimistic lock, idempotency,
  dan audit old/new/reason; Warehouse Task Board tersedia di modul Persediaan.
- Authorization matrix mencakup 297 handler; OpenAPI mengekspos enam operasi WMS
  ber-cookieAuth.

Regression 370/370, migration 001–075, dan rollback full-chain 75/74/74 telah
tervalidasi. Status ini adalah **engineering release candidate**, bukan izin
production: UAT 13 role, security retest manual, persetujuan manusia atas enam
rekonsiliasi, training, DR RTO/RPO, offsite evidence, dan Owner sign-off tetap
menjadi gate go-live.

## Status v0.39.0 — Finance End-to-End Closure

- PostgreSQL source of truth berada pada migration 001–074.
- Journal coding block berjalan fail-closed pada mode `HARD`; posting P&L wajib
  membawa cost center/profit center sesuai policy ber-versi. Dokumen otomatis
  me-resolve master aktif dan menyimpan snapshot audit.
- Tax Reconciliation Workbench membandingkan GL dengan tax subledger serta
  menyimpan evidence immutable ber-versi melalui maker-checker.
- Official Financial Statements memakai alur Prepare → Review → Sign-off,
  segregation of duties, SHA-256, balanced snapshot, dan hanya dapat
  ditandatangani setelah period close.
- Closing Cockpit mencakup evidence BANK, INVENTORY, PAYROLL, TAX, AR, dan AP,
  close package immutable, alasan wajib, idempotency, dan jejak reopen. Period
  close ditolak sampai versi terbaru keenam evidence approved, SHA valid, dan
  tidak berstatus NOT_RUN.
- RLS aktif pada 31 tabel Finance, organization, HR, payroll, attendance, dan
  tax; runtime role bukan owner, tidak memiliki `BYPASSRLS`, dan employee tanpa
  branch gagal tertutup.
- Field encryption AES-256-GCM melindungi rekening bank, restricted HR notes,
  KTP, NPWP employee, nomor BPJS, dan identitas pajak organisasi, dengan blind
  index, key ring, rotation ledger, dan pemeriksaan plaintext pada predeploy.
- Sembilan histori financial report, accounting period/close, reconciliation,
  compensation, tax/BPJS, payroll, dan tax record tidak dapat dihapus oleh
  runtime role.
- Data Retention & Legal Hold Workbench menyediakan policy allowlist, preview,
  exact-count execution, recent-MFA approval, idempotency, dan immutable run
  evidence untuk enam resource teknis.
- Authorization matrix mencakup 291 handler dan OpenAPI 1.4 mendokumentasikan
  kontrak Finance/Governance baru.

Regression 363/363, migration 001–074, dan rollback full-chain 74/73/73 telah
tervalidasi.
Visual baseline v7 mencakup 26 halaman × 2 viewport, termasuk empat Finance
workbench baru. Status ini adalah **engineering release candidate**, bukan izin
production: UAT 13 role, security retest manual, persetujuan manusia atas enam
rekonsiliasi, training, DR RTO/RPO, offsite evidence, dan Owner sign-off tetap
wajib.

## Status v0.36.0 — Execution Control Workbenches

- PostgreSQL source of truth berada pada migration 001–064.
- Reservation, Purchase Contract 360, Capacity & WIP, serta CAPA & Calibration
  kini memiliki workbench operator lengkap dan state desktop/mobile tervalidasi.
- Tabel execution dilindungi RLS, view memakai `security_invoker`, aggregate
  mutable memakai optimistic version, dan mutasi kritis replay-safe/idempoten.
- Finite-capacity scheduling memakai advisory lock; contract release memakai
  business-key guard; CAPA menegakkan SoD penerbit–penutup.
- Evidence teknis ada di
  `docs/operations/v0.36-execution-control-workbenches.md`.

Regression 326/326, visual 42/42, dan rollback 64→63→64 lulus. Status ini
menutup Wave B/C engineering, bukan go-live: field encryption/data-retention,
Finance/Operations tier berikutnya, UAT manusia, DR, Owner sign-off, serta VPS
tetap mengikuti gate blueprint.

## Status v0.35.0 — Enterprise Execution & Identity Controls

- Source of truth PostgreSQL berada pada migration 001–063.
- Engine reservation/bin, purchase contract, capacity/WIP, CAPA/calibration,
  serta perpetual inventory/COGS sudah masuk release line resmi.
- Reset administrator memakai maker-checker Security Admin/Owner → Owner,
  recent MFA, expiry 30 menit, SoD, audit, dan tautan reset sekali pakai.
- MFA memiliki recovery code sekali pakai, regenerasi terkontrol, factor-change
  notification, serta halaman Keamanan Akun.
- Workbench Pengguna & Keamanan Akses menggantikan modal master kosong.
- Evidence ada di
  `docs/operations/v0.35-enterprise-execution-identity.md`.

Release ini belum berarti go-live. UAT 13 role, training, rekonsiliasi, retest
SEC-UAT-001, Owner sign-off, offsite backup target, dan VPS tetap merupakan
gate manusia/infrastruktur.

## Status v0.34.0 — Sales Commercial Controls

- Commercial Control Center mengelola ATP/CTP line promise, margin exception,
  customer contract/blanket release, milestone billing, dan backorder worklist.
- Submission quotation/Sales Order berbaris melewati margin snapshot; Sales
  Order juga wajib memiliki availability promise aktif pada seluruh baris.
- Policy margin effective-dated, contract/milestone maker-checker, RLS cabang,
  audit, idempotency, dan lifecycle integration tersedia.
- PostgreSQL source of truth: migration 001–056. Evidence ada di
  `docs/operations/v0.34-sales-commercial-controls.md`.

Release ini menutup gap komersial Sales, bukan seluruh blueprint. Procurement,
WMS, Production/Finance hardening, UAT manusia, dan VPS tetap mengikuti roadmap.

## Status v0.33.0 — Organization & Workforce Foundation

- Struktur organisasi memiliki snapshot versioned, approval, SHA-256, effective
  date, dan activation/supersession workflow.
- Job, Position, Assignment, headcount, reporting line, dan delegation
  authority tersedia pada Workforce Architecture Control Center.
- Delegasi aktif dibaca runtime authorization dan dibatasi scope, waktu,
  permission delegator, maker-checker, serta daftar privilege terlarang.
- PostgreSQL source of truth: migration 001–055. Evidence ada di
  `docs/operations/v0.33-organization-workforce.md`.

## Status v0.32.0 — Unified Business Partner MDM

- Customer dan Supplier kini terhubung ke satu canonical Business Partner;
  endpoint dan ID legacy tetap kompatibel.
- Control Center menyediakan Golden Record, duplicate queue, maker-checker
  merge, lineage, staged import, dan configurable data quality.
- PostgreSQL source of truth berada pada migration 001–053. Full-chain
  rollback/reapply dan 256/256 test disposable lulus.
- Evidence: `docs/operations/v0.32-business-partner-mdm.md`.

Release ini menutup fondasi Business Partner MDM, bukan seluruh blueprint.
Organization foundation, UAT manusia, dan VPS tetap mengikuti gate roadmap.

## Status v0.31.0 — Sprint 18 LAN-UAT Technical Readiness

- Database staf khusus `mat_erp_v2_lan_uat` telah diprovision pada PostgreSQL
  16 dengan runtime role non-superuser dan migration 001–050 valid.
- `npm run uat:technical` menyiapkan organisasi, 13 role, master/transaksi UAT,
  HR/Finance, opening inventory, backup terenkripsi, restore drill, serta gate
  LAN-UAT dalam satu alur fail-fast.
- Regression gate memakai database disposable `mat_erp_v2_gate_uat`; database
  tersebut dibuat fresh dan dihapus otomatis sehingga data UAT staf tidak
  terkontaminasi fixture test.
- Evidence pack R025 tersedia di `docs/uat` dan production gate memvalidasi
  release version/SHA/migration, 13 hasil role, issue closure, training,
  enam rekonsiliasi, restore evidence, dan Owner sign-off secara fail-closed.
- Evidence teknis: 251/251 tes lulus, LAN load 10/25 user lulus, health DB UP,
  final assurance 5 PASS/0 warning/0 blocking, backup lokal+offsite terenkripsi
  dan restore 162 tabel berhasil. Detail ada di
  `docs/operations/v0.31-lan-uat-technical-readiness.md`.

Status ini **LAN-UAT TECHNICALLY READY**, bukan UAT bisnis selesai dan bukan
izin production. Sprint 18 baru boleh ditutup setelah pengujian nyata 13 role,
training, rekonsiliasi Finance, issue retest, dan Owner sign-off tervalidasi.
VPS/R026 tetap terkunci sampai seluruh bukti tersebut lengkap.

## Status v0.30.0 — P0.5 Transaction Correctness Closure

- Source of truth PostgreSQL kini berada pada migration 001–050.
- Organization Workbench memiliki legal-entity boundary dan cycle guard.
- Change Request sensitif memakai maker-checker, allowlist, baseline conflict
  detection, unique pending invariant, row lock, audit, dan RLS cabang.
- Delivery/Invoice memiliki quantity invariant pada create, update, dan
  transition, termasuk agregasi source line dan serialization lock.
- Emergency grant dibatasi oleh data scope; permission response login konsisten
  dengan multi-role grant database.
- Predeploy selalu membangun ulang release, lalu verifier memblokir manifest
  versi/migration stale dan memvalidasi hash serta SBOM.
- Evidence lokal: 247/247 automated tests dan 203/203 handler authorization
  contract lulus. Predeploy LOCAL 14/14 dan paket release+SBOM 334 file juga
  lulus tanpa temuan; rincian ada di
  `docs/operations/v0.30-p0-5-closure-evidence.md`.

Status ini adalah **LOCAL BUILD READY**, bukan persetujuan production. LAN-UAT
lintas divisi, Owner sign-off, konfigurasi production secrets, dan deployment
VPS tetap merupakan gate terpisah. “Enterprise” berarti kontrol dan bukti yang
terukur—bukan klaim kesetaraan fitur penuh dengan SAP, Oracle, atau Dynamics 365.

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
- `docs/operations/v0.39-finance-end-to-end-closure.md`
- `docs/operations/sprint17-final-audit-evidence.md`
- `docs/operations/sprint16-reporting-evidence.md`
- `docs/operations/deployment-runbook.md`
- `docs/release/DELIVERY.md`
