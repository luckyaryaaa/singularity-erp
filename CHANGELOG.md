# Changelog

## [0.47.0] — 2026-07-29

### Canonical Warehouse Stage 2A + WMS Mobility

- Migration 082 mewajibkan dimensi `org_warehouse_id` pada balance, movement,
  reservation, lot, dan Warehouse Task dengan trigger scope lintas cabang.
- Lot memperoleh storage location dan expiry date untuk canonical location
  ledger serta fondasi FEFO.
- Handling unit/license plate memiliki lifecycle OPEN → SEALED → STAGED →
  LOADED → SHIPPED, quantity guard, RLS, audit, dan optimistic locking.
- Mobile scan session menegakkan urutan LOT/BIN/HU, operator ownership,
  canonical warehouse scope, append-only evidence, serta task completion gate.
- Workbench WMS Mobile tersedia pada inventori dengan health reconciliation,
  handling-unit board, dan input scanner keyboard-wedge.

### Assurance

- Targeted Wave 24 **5/5 PASS**; targeted compatibility **25/25 PASS**.
- Migration/checksum **001–082** valid; rollback disposable **82/81/81 PASS**.
- Authorization matrix **14 router/319 handler PASS**.

Semua perubahan penting MAT ERP V2 dicatat di file ini. Versi mengikuti
Semantic Versioning selama fase local build dan LAN-UAT.

## [0.46.0] — 2026-07-29

### Domain Event → Unified Work Item

- Migration 081 menambah versioned outbox delivery state, retry scheduling,
  dead-letter, serta deduplication metadata pada `work_items`.
- Proyektor idempoten mengubah event `work.action-required.v1` menjadi Work
  Item + notifikasi `ACTION_REQUIRED`, dan `work.action-resolved.v1` menutupnya
  otomatis dengan audit.
- Approval, Warehouse Task, CAPA/QC, reconciliation exception, serta
  dunning/credit hold sudah menerbitkan kontrak action-required/resolved.
- Outbox dispatcher sekarang memakai RLS system context eksplisit,
  exponential backoff, dead-letter audit, dan baru menyiarkan SSE setelah commit.
- Governance API menyediakan metadata outbox tanpa payload dan retry
  dead-letter beralasan dengan recent MFA.

### Assurance

- Targeted Wave 23 **5/5 PASS**.
- Regression utama dan isolated fresh PostgreSQL **403/403 PASS**.
- Migration/checksum **001–081** valid; rollback disposable **81/80/80 PASS**.
- Authorization matrix **14 router/310 handler PASS**.

## [0.45.0] — 2026-07-29

### Fresh-database warehouse invariant dan release closure

- Migration 080 menutup celah lifecycle migration 076: cabang aktif yang dibuat
  setelah migration kini otomatis memperoleh tepat satu gudang default aktif.
- Trigger menggunakan fungsi `SECURITY DEFINER` dengan `search_path` terkunci;
  backfill memperbaiki cabang aktif yang telanjur belum mempunyai default.
- Integration fixtures mengikuti ownership child warehouse saat membersihkan
  cabang temporer.
- Visual baseline v8 menambahkan lima capability terbaru dan menjadi 31 halaman
  × 2 viewport.

### Assurance

- Regression utama dan isolated PostgreSQL gate **398/398 PASS**.
- Migration/checksum **001–080** valid; rollback disposable **80/79/79 PASS**.
- Backup terenkripsi dan restore disposable **213 tabel**, migration 080.
- Visual **62/62 PASS**, accessibility **18/18 PASS**, authorization **308
  handler**, dan data protection **31/31 RLS; 0 plaintext**.

## [0.44.0] — 2026-07-29

### Advanced Pricing — Condition Engine (Stage 1)

- Migration 079 menambah `pricing_conditions`: condition records ala SAP-SD ringkas
  (BASE_PRICE, DISCOUNT_PCT, DISCOUNT_AMT, SURCHARGE_PCT) per legal entity, dengan
  cakupan produk/pelanggan/kategori, **skala kuantitas** (`min_qty`), **validity**
  (effective-dated), prioritas, dan optimistic lock.
- Resolver **server-authoritative** `resolvePrice(legalEntity, party, product, qty,
  date)`: menentukan base price paling spesifik/berprioritas (jatuh ke harga daftar
  produk bila tak ada), lalu menerapkan seluruh diskon/surcharge yang berlaku
  berurutan — klien meminta harga, tidak menetapkannya.
- Empat endpoint pada router Sales: resolusi (`GET /api/sales/price`) + CRUD
  condition (`GET`/`POST /api/sales/pricing-conditions`, `POST …/{id}/deactivate`),
  guard `quotation.view`/`quotation.edit`, idempotency + audit.
- Legal-entity scope ditegakkan (entity lain hanya untuk peran lintas cabang).
- Mengangkat ⬜ audit Sales "Advanced pricing condition engine" ke Stage 1;
  **rebate dan komisi tetap stage berikutnya**.

### Assurance

- Regression + isolated PostgreSQL gate **397/397** lulus (8 test pricing baru:
  base price vs daftar, spesifisitas pelanggan+produk, skala kuantitas, diskon/
  surcharge, validity, deactivate + optimistic lock, legal-entity scope, liveness).
- Full-chain rollback lulus di database disposable: **79 up, 78 down, 78 re-up**.
- Authorization matrix **308 handler** (Sales 23→27).

## [0.43.0] — 2026-07-29

### Notification Preferences

- Migration 078 menambah `notification_preferences` (per pengguna × kategori):
  kategori yang di-mute disaring dari tampilan in-app pengguna itu **tanpa
  menghapus** notifikasinya, dan email per kategori dapat dinyalakan/dimatikan.
  RLS mengunci ke pemiliknya (bypass sistem untuk worker/test).
- Filter mute dijahit di **jalur baca** (`listNotifications` + `unreadCount`),
  bukan di jalur tulis — menangani notifikasi bertarget pengguna maupun peran
  secara seragam tanpa kehilangan data.
- `SYSTEM_ALERT` tidak dapat dimatikan — peringatan sistem harus selalu sampai.
- Endpoint `GET`/`POST /api/notifications/preferences` (router Operations),
  guard `notification.view`, upsert + audit old/new.
- Menutup ⬜ audit Workspace 6.7 "Notification Preferences Are Missing" (§5.2 #6/#7).

### Assurance

- Regression + isolated PostgreSQL gate **389/389** lulus (5 test preferensi baru:
  default, filter mute in-app + hitungan, SYSTEM_ALERT tak dapat mati, upsert,
  liveness).
- Full-chain rollback lulus di database disposable: **78 up, 77 down, 77 re-up**.
- Authorization matrix **304 handler** (Operations 12→14).

## [0.42.0] — 2026-07-29

### Unified Work Item Engine

- Migration 077 menambah `work_items`: backbone pekerjaan lintas modul (§4.4/§5.2).
  Approval, exception, review, correction, dan tugas operasional menjadi entitas
  bertipe dengan siklus hidup OPEN→CLAIMED→IN_PROGRESS→RETURNED/ON_HOLD→
  DONE/CANCELLED, prioritas, risiko, SLA/jatuh tempo, evidence, optimistic lock,
  RLS isolasi cabang, dan audit old/new/reason.
- Aksi lengkap: create, claim, start, complete (dengan evidence), return (revisi),
  hold, cancel, delegate (substitusi/cuti), dan escalate — enam handler bounded
  pada router Workspace (10 aksi via alternation), guard `dashboard.view` dengan
  kepemilikan (assignee/claimer/delegate/creator) dan scope cabang ditegakkan di
  repository. Membaca notifikasi TIDAK menutup pekerjaan; hanya transisi eksplisit.
- Klaim menghormati penargetan: item ber-peran hanya dapat diklaim peran yang
  cocok; pool bebas hanya bila tak ditargetkan ke pengguna maupun peran.
- **My Work** kini berbasis work item nyata (Ditugaskan/Dikerjakan/Didelegasikan/
  Dikembalikan) dengan aksi lifecycle langsung — bukan lagi sekadar agregasi
  read-only dokumen.
- Perbaikan bug laten: pemeriksaan penerima tugas memakai kolom `app_users.active`
  (bukan `status` yang tidak ada) — juga menutup jalur `assignedTo` WMS task engine.

### Assurance

- Regression + isolated PostgreSQL gate **384/384** lulus (8 test Work Item baru:
  lifecycle+evidence, optimistic lock, kepemilikan, penargetan klaim, return,
  delegasi/eskalasi, My Work scope, liveness).
- Full-chain rollback lulus di database disposable: **77 up, 76 down, 76 re-up**.
- Authorization matrix **302 handler** (Workspace 3→7); OpenAPI menambah operasi
  Work Item ber-cookieAuth.

## [0.41.0] — 2026-07-29

### Canonical Warehouse Ledger (Stage 1)

- Migration 076 memulai migrasi §9.8 dari "Branch-as-Warehouse" ke hierarki nyata
  **Plant → Warehouse → Storage Location → Bin** tanpa membalik kunci isolasi.
- `org_warehouses` memperoleh `is_default` (maksimal satu default per cabang) dan
  backfill memastikan **setiap cabang aktif punya gudang default** deterministik
  (7/7 cabang; cabang tanpa gudang dibuatkan otomatis, plant di-resolve bila ada).
- `stock_lots` memperoleh `org_warehouse_id` — identitas gudang kanonik. Trigger
  self-healing menjamin gudang lot **selalu berada di dalam cabangnya**: bila
  NULL atau menunjuk gudang cabang lain, di-resolve ke gudang default cabang;
  penempatan spesifik ke gudang lain dalam cabang yang sama dihormati.
- Put-away kini **menyelaraskan gudang lot ke gudang rak tujuan** — ledger
  mengikuti penempatan fisik.
- View `stock_warehouse_ledger` (security_invoker) menyatukan Legal Entity →
  Plant → Warehouse dengan ringkasan stok; endpoint `GET /api/inventory/warehouses`
  dan tab **Gudang** menampilkannya per cabang.
- Jembatan cabang↔gudang kini **eksplisit dan ter-enforce**, menutup temuan audit
  "◐ masih terdapat bridging ke ledger/branch legacy". Grain-flip penuh (mengganti
  makna `warehouse_id` di ~200 titik + RLS) tetap cutover berlapis berikutnya.

### Assurance

- Regression + isolated PostgreSQL gate **376/376** lulus (6 test kanonik baru:
  backfill default, auto-resolve, self-heal lintas cabang, rekonsiliasi put-away,
  scope ledger, liveness). Trigger `stock_lots` tidak meregresi jalur
  GR/produksi/opname/transfer.
- Full-chain rollback lulus di database disposable: **76 up, 75 down, 75 re-up**.
- Authorization matrix **298 handler** (Inventory 20→21); OpenAPI menambah operasi
  ledger gudang ber-cookieAuth.

## [0.40.0] — 2026-07-29

### Warehouse Execution Task Engine (WMS minimal task flow)

- Migration 075 menambah `warehouse_tasks`: mesin tugas eksekusi gudang bertipe
  (RECEIVE, PUTAWAY, PICK, PACK, SHIP, COUNT) dengan siklus hidup
  OPEN→CLAIMED→IN_PROGRESS→DONE/CANCELLED, prioritas, jatuh tempo, penugasan,
  optimistic version, RLS isolasi cabang, dan constraint struktural (put-away
  wajib lot + rak tujuan; pick wajib lot).
- Menutup sebagian blueprint §9.8: receiving→put-away→pick→pack→ship menjadi
  **tugas** yang dapat ditugaskan, diklaim, dikerjakan, dan diaudit — bukan
  mutasi stok diam-diam. Tugas PUTAWAY menyelesaikan diri dengan memindahkan lot
  ke rak tujuan lewat penempatan lot yang sudah ada (058), sehingga tidak ada
  jalur mutasi stok kedua yang bisa menyimpang dari kenyataan.
- Enam endpoint baru pada router Inventory (papan kerja + create + claim + start
  + complete + cancel) dengan permission delegated (`inventory.view`/`edit`),
  optimistic lock, idempotency pada create/complete, dan audit old/new/reason.
- Warehouse Task Board pada modul Persediaan: ringkasan terbuka/berjalan/lewat
  tempo/selesai, aksi klaim/mulai/selesai/batal, dan dialog pembuatan tugas.
- Ledger stok tidak diubah: migrasi Branch-as-Warehouse kanonik tetap pekerjaan
  tersendiri; engine ini berdiri di atas model lot/bin yang ada.

### Assurance

- Regression utama dan isolated PostgreSQL gate **370/370** lulus (7 test WMS
  baru: siklus hidup, optimistic lock, status guard, isolasi cabang, constraint,
  liveness skema).
- Full-chain rollback lulus di database disposable: **75 up, 74 down, 74 re-up**.
- Authorization matrix mencakup **297 handler** (Inventory 14→20, seluruhnya
  delegated + terklasifikasi); OpenAPI mengekspos enam operasi WMS ber-cookieAuth.
- Status tetap engineering release candidate; approval rekonsiliasi aktual, UAT
  manusia, training, DR/offsite proof, dan Owner sign-off tetap fail-closed.

## [0.39.0] — 2026-07-28

### Finance End-to-End Closure

- Migration 074 menambah evidence rekonsiliasi BANK/INVENTORY/PAYROLL/TAX/AR/AP
  dan period-close package immutable, RLS, versioning, SHA-256, serta
  segregation of duties.
- Journal coding block default `HARD`; posting P&L tanpa dimensi wajib ditolak.
  Dokumen operasional legacy me-resolve cost/profit center aktif secara
  deterministik dan menyimpan hasilnya pada header serta snapshot audit.
- Coding Block Control, Tax Reconciliation, Official Financial Statements, dan
  Closing Cockpit kini memiliki workbench operator lengkap.
- Financial report sign-off hanya dapat dilakukan pada periode `CLOSED` dengan
  snapshot seimbang dan hash yang tetap valid.
- Period close wajib beralasan dan idempoten; close/reopen mempunyai evidence
  lifecycle yang tidak dapat diedit oleh runtime role.
- OpenAPI naik ke 1.4 dan authorization matrix mencakup 291 handler.

### Assurance

- Regression utama dan isolated PostgreSQL gate **363/363** lulus.
- Full-chain rollback lulus: **74 up, 73 down, 73 re-up**.
- Data protection audit: **31/31 RLS**, empat constraint tervalidasi, nol
  plaintext, sembilan histori tanpa hak hapus runtime.
- Visual baseline v7: **52/52** render lulus (26 halaman × desktop/mobile);
  accessibility 18/18 dan secret scan 936 file/0 temuan.
- Status tetap engineering release candidate; approval rekonsiliasi aktual,
  UAT manusia, training, DR/offsite proof, dan Owner sign-off tetap fail-closed.

## [0.38.0] — 2026-07-28

### Security & Data Protection Closure

- Migration 070 mengaktifkan RLS pada 29 tabel sensitif Finance, organization,
  HR, payroll, attendance, dan tax serta menambah envelope encryption untuk
  KTP, NPWP employee, nomor BPJS, dan identitas pajak organisasi.
- Migration 071 membuat employee tanpa branch gagal tertutup bagi sesi
  branch-scoped; hanya system/cross-branch context yang dapat melihatnya.
- Migration 072 mencabut `DELETE/TRUNCATE` runtime pada tujuh histori
  Finance/HR/payroll yang harus dikoreksi melalui versioning/reversal.
- Migration 073 memperbesar compatibility-token column KTP/NPWP/BPJS agar
  token blind-index 40 karakter dapat disimpan tanpa truncation.
- Repository master data dan organization mengenkripsi sebelum write,
  mendekripsi hanya di jalur berizin, melakukan masking, dan meredaksi audit.
- `security:data-audit` memverifikasi RLS/policy, ownership/BYPASSRLS,
  constraint encryption, sisa plaintext, dan least-privilege grants.
- Predeploy dan release package memuat audit data-protection sebagai gate.

### Assurance

- Regression utama 359/359 dan scoped security 19/19 lulus.
- Full-chain rollback lulus pada database disposable: 73 up, 72 down, 72
  re-up.
- Status tetap engineering release candidate; UAT manusia, rekonsiliasi,
  training, DR/offsite proof, security retest, dan Owner sign-off tidak
  digantikan automation.

## [0.37.0] — 2026-07-28

### Enterprise Data Protection

- Migration 065 menambah field encryption AES-256-GCM, purpose/scope AAD,
  blind index, versioned key ring, dan rotation ledger untuk rekening bank
  serta restricted HR notes.
- Migration 066 menambah retention allowlist, legal hold, preview berumur
  terbatas, exact-count batch execution, idempotency, recent MFA, dan execution
  ledger.
- Retention Workbench masuk navigasi resmi dan visual baseline desktop/mobile.

### Finance Control Depth

- Migration 067 menambah journal coding block berupa cost center, profit
  center, dan project WBS beserta policy kategori akun.
- Migration 068 mengganti rekonsiliasi pajak placeholder menjadi perbandingan
  GL-ke-tax ledger yang dipakai closing cockpit.
- Migration 069 menambah financial-report lifecycle prepare→review→sign-off/
  reject dengan snapshot ber-versi dan segregation of duties.
- OpenAPI naik ke 1.3 dan mendokumentasikan endpoint tax reconciliation serta
  financial-report sign-off.

### Release Governance

- Package, lockfile, README, changelog, roadmap, release notes, migration notes,
  endpoint matrix, UAT baseline, dan release manifest diselaraskan ke v0.37.0
  serta migration 069.
- Authorization matrix mencakup 14 router dan 286 handler.
- Regression 353/353 dan migration 001–069 lulus. UAT manusia, training,
  rekonsiliasi, DR evidence, SEC-UAT-001 closure, dan Owner sign-off tetap
  fail-closed dan bukan bagian dari klaim engineering completion.

## [0.36.0] — 2026-07-27

### Execution Control Workbenches

- Inventory Reservation Workbench menyediakan pencarian, status, trace pemilik,
  sisa kuantitas, expiry, serta controlled release beralasan.
- Purchase Contract 360 menyediakan portofolio kontrak, pagu dan sisa nilai,
  line commitment, maker-checker, release history, serta release ke PO.
- Capacity & WIP Control Tower menyajikan finite-capacity harian, overload,
  utilisasi, penjadwalan operasi, progres, dan nilai WIP dari fakta transaksi.
- CAPA & Calibration Workbench menegakkan lifecycle berurutan, bukti minimum,
  SoD penerbit–penutup, register alat ukur, due date, dan kalibrasi fail-closed.

### Defense in Depth

- Migration 064 menambah RLS pada seluruh tabel execution, `security_invoker`
  untuk view, optimistic version, dan business-key replay guard kontrak.
- Mutasi kritis reservation, contract release, scheduling, CAPA, dan calibration
  memakai branch scope, idempotency key, row/advisory lock, version conflict,
  audit trail, dan validasi input server-side.
- Authorization matrix mencakup 274 handler dan OpenAPI execution naik ke API
  version 1.1.

### Verified

- Migration 001–064 valid dan rollback disposable 64→63→64 lulus.
- Regression 326/326 lulus; visual 42/42 desktop/mobile tanpa overflow,
  console error, atau tombol tak berlabel.
- Status tetap local/LAN-UAT engineering candidate. Retest SEC-UAT-001, UAT 13
  role, training, rekonsiliasi, DR evidence, dan Owner sign-off tetap gate
  manusia sebelum VPS.

## [0.35.0] — 2026-07-27

### Enterprise Execution & Identity Controls

- Stock reservation, bin execution, purchase contract, capacity/WIP,
  CAPA/calibration, dan perpetual inventory/COGS yang berada pada migration
  057–062 kini resmi masuk release line dan tidak lagi tersembunyi di versi
  0.34.0.
- Migration 063 menambah reset administrator maker-checker, expiry, SoD,
  permission granular, serta MFA recovery code sekali pakai.
- Reset user memakai tautan 30 menit; password lama langsung tidak berlaku,
  token hanya disimpan sebagai hash, dan tidak ada `tempPassword` pada runtime
  PostgreSQL.
- Workbench Pengguna & Keamanan Akses serta halaman Keamanan Akun menyediakan
  kontrol akun, queue approval, enrollment MFA, recovery code, dan sesi
  perangkat dengan secure handoff tanpa toast/log rahasia.
- Visual regression dan LAN load login kini menyelesaikan MFA privileged;
  helper yang membaca secret test tidak dimasukkan ke artefak production.

### Governance

- Dokumen kebijakan reset, insiden SEC-UAT-001, security model, backlog, README,
  dan evidence release diselaraskan dengan migration 063.
- Status SEC-UAT-001 tetap `READY_FOR_RETEST`; automation tidak memalsukan
  retest operator atau Owner sign-off.

## [0.34.0] — 2026-07-22

### Sales Commercial Controls

- ATP/CTP per Sales Order line menyimpan snapshot stok, reservasi, komitmen
  terdahulu, sumber promise, lead time, dan tanggal janji sebelum order diajukan.
- Margin quotation dan Sales Order dihitung server dari net revenue dan HPP
  per baris, memakai policy effective-dated serta maker-checker Finance untuk
  exception di bawah batas minimum.
- Kontrak pelanggan/blanket agreement memiliki plafon header dan baris,
  effective date, approval, consumption control, dan release ke Sales Order.
- Milestone billing 100% tervalidasi, konfirmasi ready memakai SoD, dan
  menghasilkan invoice idempoten yang terhubung ke Sales Order.
- Backorder worklist mengikuti fulfilment aktual dan memisahkan kuantitas
  terbuka, teralokasi, promise date, serta status pemenuhan.
- Commercial Control Center, RLS, audit, permission, lifecycle gate, dan
  negative regression telah terpasang.

### Verified

- Migration 001–056 valid; full-chain 56 up/55 down/55 re-up lulus.
- 264/264 automated test lulus melalui disposable PostgreSQL gate; restore
  drill menghasilkan 186 tabel, accessibility 18/18, UI 5/5, secret scan 0.

## [0.33.0] — 2026-07-22

### Organization & Workforce Foundation

- Hierarchy organisasi kini memiliki snapshot version, SHA-256, effective date,
  maker-checker approval, aktivasi, dan supersession tanpa mengubah sejarah.
- Job, Position, dan Position Assignment dipisahkan secara kanonis, dilengkapi
  headcount capacity, primary-assignment overlap guard, reporting-line cycle
  guard, legal-entity scope, dan effective dating.
- Authority delegation kini time-bound maksimal 90 hari, scoped, anti-escalasi,
  maker-checker, dan benar-benar dibaca mesin otorisasi runtime.
- Workforce Architecture UI, RLS, audit trail, permission HRD, dan backfill
  `employee_positions` lama tersedia.

### Verified

- Migration 001–055 valid; full-chain 55 up/54 down/54 re-up lulus.
- 260/260 automated test lulus melalui disposable PostgreSQL gate; restore
  drill menghasilkan 178 tabel.

## [0.32.0] — 2026-07-22

### Unified Business Partner MDM

- Customer dan Supplier terhubung ke canonical Business Partner tanpa
  mengubah ID transaksi legacy; NPWP identik lintas peran memakai satu party.
- Golden Record duplicate workbench memakai scoring multi-sinyal,
  survivorship, maker-checker, merge alias, dan lineage permanen.
- Import staging memiliki checksum replay protection, validasi per baris,
  promosi terkontrol, serta configurable rule tanpa arbitrary SQL.
- RLS, permission `business_partner.*`, audit trail, control-center UI, dan
  compatibility trigger endpoint lama telah terpasang.

### Verified

- Migration 001–053 valid; full-chain 52 up/51 down/51 re-up lulus.
- 256/256 test lulus di PostgreSQL disposable; restore menghasilkan 173 tabel.

## [0.31.0] — 2026-07-22

### LAN-UAT Readiness

- Menambahkan evidence pack R025 untuk 13 role, issue register, attendance,
  enam rekonsiliasi, restore drill, dan Owner sign-off.
- Production gate memvalidasi bukti terhadap version, release SHA, migration,
  run ID, executor, evidence reference, dan status issue; file sign-off sengaja
  tidak dibuat sebelum keputusan manusia.
- Menambahkan orchestrator `uat:technical` dengan database staf khusus
  `mat_erp_v2_lan_uat`, seed guard `_uat`, least privilege, seed lintas role,
  opening inventory, backup/restore, evidence readiness, dan predeploy.
- Regression LAN-UAT berjalan pada database disposable
  `mat_erp_v2_gate_uat`, sehingga fixture test tidak menyentuh data staf.
- Baseline UAT melengkapi legal entity, business unit, plant, warehouse,
  storage location, bin, work center, Owner, serta 12 akun role operasional.

### Verified

- 251/251 automated tests lulus pada database PostgreSQL terisolasi.
- Gate LAN-UAT lulus seluruh kontrol: accessibility, visual, environment,
  secret/dependency, migration, release+SBOM, regression, load 10/25 user,
  health, runtime controls, final assurance, backup, dan restore.
- Database `mat_erp_v2_lan_uat` sehat pada PostgreSQL 16.14; migration 001–050
  checksum-valid, runtime `mat_erp_app` non-superuser, final assurance
  5 PASS/0 warning/0 blocking, dan restore menghasilkan 162 tabel.
- Backup terenkripsi lokal dan offsite berhasil. Final business UAT tetap
  diblokir sampai 13 role, training, rekonsiliasi, issue closure, dan Owner
  sign-off diisi oleh pelaksana sebenarnya.

## [0.30.0] — 2026-07-22

### Security & Correctness

- Organization Workbench menegakkan legal-entity scope pada list/create/update,
  validasi parent lintas entitas, plant–warehouse satu cabang, dan pencegahan
  siklus hierarki departemen.
- Delivery/Invoice mengagregasi source line duplikat, menolak tautan parsial,
  memakai transaction advisory lock, serta memvalidasi ulang kuantitas saat
  lifecycle transition agar dua draft tidak dapat melampaui sisa order.
- Change Request memakai entity/field allowlist, stale-baseline detection,
  master row lock, advisory lock, unique pending request, RLS cabang, dan audit
  submission. Payload hasil manipulasi tidak dapat menjadi identifier SQL.
- Emergency access kini fail-closed untuk scope BRANCH/LEGAL_ENTITY/PROJECT dan
  scope enterprise lainnya. Respons login/MFA/password-change memakai union
  permission database yang sama dengan session runtime.

### Release

- Migration `050_p0_5_transaction_correctness.sql` aktif dan checksum-valid.
- Versi `package.json` dan lockfile diselaraskan ke 0.30.0.
- Verifikasi artefak membandingkan versi dan migration terbaru terhadap source;
  predeploy membangun ulang lalu memblokir paket release atau SBOM yang gagal.

### Verified

- 247/247 automated tests lulus, termasuk negative tests IDOR, recursive cycle,
  tampered/stale Change Request, scoped break-glass, duplicate source line, dan
  competing fulfilment drafts.
- Predeploy LOCAL 14/14 lulus: a11y, visual, environment, secret/dependency,
  migration, release+SBOM, regression, load, health, runtime controls, final
  assurance, serta backup/restore. Paket memindai 334 file tanpa temuan.

## [0.25.0] — 2026-07-20

### Added

- Persiapan Sprint 18 (R025 LAN-UAT):
  - `npm run cutover:opening-inventory` — jurnal saldo awal persediaan
    SEKALI saat cut-over (selisih GL 1300 vs subledger stok dibukukan lawan
    3900 ekuitas saldo awal; idempoten, advisory-lock, teraudit). Dijalankan
    pada database dev: JRN-HO-0726-003 Rp 300.555.000 → GL selaras subledger.
  - `npm run uat:lan` — boot LAN-UAT: memaksa MAT_ENVIRONMENT=LAN-UAT +
    MAT_BIND_HOST=0.0.0.0, validasi environment, banner alamat akses staf +
    checklist SOP-18, server sebagai child process.

### Verified

- 137/137 automated tests (1 tes cut-over baru); final assurance kini
  **5 PASS / 0 WARNING** (Inventory reconciliation selisih Rp 0);
  boot LAN-UAT terbukti melayani loopback 200 dan IP LAN 192.168.1.2 → 200.

## [0.24.0] — 2026-07-20

### Added

- Final assurance repository dan Self-Test bertaksonomi
  `PASS/WARNING/FAIL/BLOCKED` untuk rekonsiliasi jurnal, inventory, payroll,
  health partisi, serta orphan kritis.
- Matriks otorisasi terversi untuk 14 router/183 handler, public endpoint
  allowlist, dan negative allow/deny regression test.
- Load harness LAN dua tahap: 10 dan 25 sesi independen, read/write ber-CSRF,
  cleanup, serta ambang p95 terpisah.
- Katalog 18 SOP enterprise untuk operasi, keamanan, DR, transaksi lintas
  modul, data lifecycle, release, dan LAN-UAT/sign-off.

### Security

- Migration 035 menambah maintenance partisi inventory lewat fungsi
  `SECURITY DEFINER` terkontrol tanpa memberi role aplikasi hak CREATE.
- Self-Test, OpenAPI ordering, permission mapping, least privilege, dan public
  allowlist menjadi bagian release gate yang dapat diulang.

### Changed

- Predeploy LOCAL kini juga menjalankan load 10/25 user dan final assurance.
- Self-Test tidak menyamarkan selisih pembukaan inventory: selisih terhadap GL
  dilaporkan sebagai warning non-kritis yang wajib diselesaikan saat LAN-UAT.

### Verified

- Regression 136/136, authorization 14/14, security 5/5, accessibility 18/18,
  dan visual desktop/mobile 10/10 lulus.
- Migration 001–035 checksum-valid; rollback drill membuktikan 35 up, 34 down,
  lalu 34 re-up.
- LAN load lulus: 10 user/220 request (read p95 28 ms, write p95 18 ms) dan
  25 user/550 request (read p95 43 ms, write p95 14 ms), tanpa kegagalan.
- Final assurance: 19 PASS, 1 WARNING opening inventory, 0 FAIL/BLOCKED;
  warning membutuhkan jurnal opening balance yang disetujui Finance/Owner.
- Secret scan 434 file/0 temuan, npm dependency audit cache 0 vulnerability,
  dan paket production allowlist 281 file tervalidasi dengan SHA-256 manifest.
- Predeploy LOCAL 13/13 lulus termasuk boot PostgreSQL, load LAN, runtime
  controls, final assurance, backup berumur 3,9 jam, dan 11 restore drill.

## [0.23.0] — 2026-07-20

### Added

- Executive Cockpit responsif dengan KPI pendapatan GL, margin kotor, kas,
  modal kerja, order book, AR aging, tren 12 bulan, funnel dokumen, margin
  proyek aktual, action queue, serta definisi sumber data yang dapat diaudit.
- Semantic reporting layer PostgreSQL melalui materialized monthly KPI,
  freshness run history, refresh function ber-privilege minimum, filter periode
  dan cabang, saved view privat, serta katalog delapan laporan PDF/XLSX.
- Report scheduler harian/mingguan/bulanan yang persisten dan idempoten,
  optimistic locking, scope cabang, dan audit unduhan artefak beserta checksum.

### Security

- Filter branch divalidasi kembali saat job dibuat dan dieksekusi; pengguna
  cabang tidak dapat menaikkan scope ke cabang lain atau seluruh perusahaan.
- Runtime role hanya mendapat hak objek reporting yang diperlukan; refresh
  materialized view dilakukan lewat fungsi `SECURITY DEFINER` terkontrol.

### Changed

- Report worker memakai actual production costing untuk margin proyek dan
  mendukung laporan keuangan, quality analytics, filter periode, serta cabang.
- Halaman laporan lama diganti satu bounded module Executive Reporting tanpa
  menambah router atau application shell kedua.

### Verified

- Regression 128/128, authorization 11/11, security 5/5, accessibility 18/18,
  dan visual desktop/mobile 10/10 lulus tanpa overflow atau console error.
- Migration 001–034 checksum-valid; disposable rollback drill membuktikan
  34 up, 33 down, lalu 33 re-up; runtime PostgreSQL health PASS.
- Secret scan 402 file/0 temuan, dependency audit 0 vulnerability, dan
  predeploy LOCAL 11/11 lulus termasuk reporting freshness, load smoke,
  boot runtime, serta backup/restore evidence.
- Paket production 254 file tervalidasi dengan fingerprint, Brotli, immutable
  cache, SHA-256 release, dan migration latest 034.

## [0.22.0] — 2026-07-20

### Added

- Governance penerbitan dokumen resmi: snapshot payload/line immutable,
  signature HMAC ber-versioned key, rotasi current/previous key, QR verifikasi,
  watermark status/copy, pagination penuh, dan audit issuance/reprint.
- XLSX Office Open XML asli dengan header, freeze pane, filter, dan batas
  50.000 baris; PDF laporan kini memaginasi semua baris tanpa truncation.
- Font Manrope dan Plus Jakarta Sans disajikan lokal; tidak ada dependency
  font/CDN eksternal pada runtime.
- Deploy atomik berbasis release symlink, pre-migration backup, health-check,
  code rollback otomatis, serta rollback runbook tanpa destructive DB down.
- Migration 031–033 untuk issuance dokumen resmi, least-privilege histori,
  dan delivery notification idempotent.

### Security

- Isolasi cabang diperluas ke fixed asset, finance/reporting/tax, HR roster,
  kalender/koreksi/akrual, procurement, quotation, dunning, dan RMA; negative
  IDOR tests memastikan data cabang lain tidak dapat dibaca atau dimutasi.
- Runtime role tidak memiliki DELETE pada tabel histori kritis; rollback penuh
  seluruh migration reversible diverifikasi pada database disposable.
- Secret dokumen tidak lagi memiliki fallback statis. Production mewajibkan
  public HTTPS URL, current signing key ID, dan signing secret kuat.
- Job tanpa executor dihapus dari registry. Retry email menyimpan attempts
  secara idempotent; kanal webhook yang belum diaktifkan ditolak saat enqueue.

### Changed

- Paket production hanya menyertakan adapter PostgreSQL dan dependency
  runtime; adapter memory, seed, test, serta tooling development dikeluarkan.
- Caddy domain diparameterkan, firewall tidak lagi me-reset rule yang sudah
  ada, dan SSH port dapat dikonfigurasi.

### Verified

- 123/123 regression, authorization 11/11, security 5/5, accessibility 18/18,
  dan visual desktop/mobile 8/8 lulus.
- Migration 001–033 checksum-valid; disposable rollback drill membuktikan
  33 up, 32 down, lalu 32 re-up; runtime PostgreSQL health PASS.
- Secret scan 394 file/0 temuan, dependency audit 0 vulnerability, dan
  predeploy LOCAL 11/11 lulus termasuk load smoke serta backup/restore drill.
- Paket production 245 file tervalidasi dengan fingerprint, Brotli, immutable
  cache, font lokal, dan SHA-256 pada `release-manifest.json`.

## [0.21.0] — 2026-07-17

### Added

- Template dokumen resmi ber-identitas (`GET /api/documents/:id/official-pdf`):
  kop perusahaan dari organization_identity_snapshot (immutable — identitas
  saat terbit), tabel baris, terbilang Bahasa Indonesia, blok tanda tangan
  penandatangan aktif, footer, dan kode verifikasi keaslian; tanpa dependensi
  eksternal; unduhan teraudit EXPORT.
- Verifikasi keaslian publik (`GET /api/verify?doc=&code=`): kode HMAC-SHA256
  12 karakter dicetak pada dokumen; endpoint rate-limited memaparkan metadata
  minimal non-sensitif bila cocok, menolak kode palsu.
- SMTP zero-dependency (node:net/tls): STARTTLS & implicit TLS, AUTH LOGIN,
  dot-stuffing; tanpa MAT_SMTP_HOST menjadi no-op SKIPPED aman; kirim dokumen
  via `POST /api/documents/:id/email` dan job NOTIFICATION_SEND; setiap
  percobaan tercatat di notification_deliveries.
- OpenAPI 3.0.3 (`GET /api/openapi.json`, 47 path terkurasi, publik) + header
  `X-API-Version` pada setiap respons + katalog event domain
  (`GET /api/system/events-catalog`, 10 event).
- Tombol "Cetak resmi" + "Email" pada drawer dokumen; template .env.example
  MAT_SMTP_* dan MAT_DOC_VERIFY_SECRET.

### Verified

- 111/111 automated tests (5 tes document engine baru: terbilang, kode HMAC,
  render PDF 8 unsur, OpenAPI, SMTP no-op); UAT HTTP end-to-end: openapi 47
  paths + X-API-Version 1.0, PDF resmi application/pdf dgn kode tercetak,
  verify kode benar → valid / palsu → ditolak, email SKIPPED aman tercatat.

## [0.20.0] — 2026-07-17

### Added

- Migration 030: work_shifts + employee_rosters, work_calendar +
  hr_calendar_config, attendance_corrections (CHECK pemohon ≠ pemutus, satu
  PENDING per karyawan per tanggal), leave_policies + leave_accrual_entries
  append-only.
- Shift & roster: jam standar lembur payroll kini mengikuti shift roster per
  tanggal (fallback shift default NORMAL 8 jam efektif — parity angka lama);
  mengubah shift mengubah lembur (configuration-driven, hardcode 8 jam
  dihapus).
- Kalender kerja: hari libur global/cabang + aturan akhir pekan; durasi cuti
  dihitung dari hari kerja.
- Koreksi absensi ber-workflow: nilai lama dibekukan permanen, karyawan hanya
  boleh mengoreksi miliknya, pemutus berbeda (SoD), hasil approve tercatat
  source CORRECTION.
- Leave accrual engine: akrual bulanan days_per_year/12 untuk karyawan dengan
  masa kerja ≥ minimum, idempoten per periode, kebijakan effective-dated.
- LEAVE_REQUEST terintegrasi: submit memvalidasi rentang + saldo (hari
  kerja); approve penuh memotong saldo idempoten (payload.leaveApplied).
- Halaman Workforce (shift, roster, kalender, koreksi) + dialog Ajukan Cuti
  bertanggal + kolom rentang/pemotongan di daftar cuti.

### Verified

- 106/106 automated tests (5 tes HR baru); UAT HTTP end-to-end: roster
  SIANG, HUT RI, koreksi PENDING + self-decide 409 SOD_CONFLICT, akrual 10
  karyawan × 1 hari, cuti 27–29 Jul tervalidasi → APPROVED → leaveApplied
  3 hari kerja.

## [0.19.0] — 2026-07-17

### Added

- Migration 029: asset_categories (umur manfaat + akun configuration-driven),
  fixed_assets, asset_depreciation_entries (idempoten per aset per periode,
  append-only), akun 1500/1590/3100/3900/6300/7100 + kategori EQUITY.
- Aset tetap: registry FA-YYYY-#### dengan penyusutan garis lurus otomatis —
  satu jurnal sistem JRN-* per periode (D Beban Penyusutan / C Akumulasi per
  kategori), aset habis umur otomatis FULLY_DEPRECIATED; pelepasan ber-alasan
  dengan nilai buku dihitung sistem dan jurnal disposal seimbang.
- Laporan keuangan formal: neraca kumulatif dengan akun kontra bertanda
  mengikuti sifat kategori (akumulasi penyusutan & retur penjualan negatif) —
  identitas aset = kewajiban + ekuitas terjaga; laba rugi periode berjalan;
  halaman Laporan Keuangan + subledger AR/AP vs GL.
- Closing cockpit: 10 checklist kesiapan tutup buku (trial balance, dokumen
  belum posting, rekonsiliasi bank/inventori/payroll/pajak, penyusutan,
  subledger AR/AP, tunggakan kritis) dengan readiness READY/REVIEW/BLOCKED.
- Halaman Aset Tetap (KPI nilai buku, daftarkan, run penyusutan, lepas aset).

### Changed

- ensureOpenPeriod kini menghormati payload.period untuk semua tipe dokumen —
  jurnal manual ber-periode diposting ke periode pilihannya (sebelumnya
  memakai tanggal pembuatan), selaras dengan ledger/closing.

### Verified

- 101/101 automated tests (5 tes finance baru), migrasi 029 + rollback fix
  varchar status; UAT HTTP end-to-end: FA-2026-0001 → depresiasi 500rb
  (48jt/96bln) → neraca balanced dgn 1590 = −500rb → cockpit BLOCKED
  (mendeteksi 4 dokumen dev belum posting — bekerja sesuai desain) →
  disposal nilai buku 47,5jt jurnal seimbang.

## [0.18.0] — 2026-07-17

### Added

- Migration 028: procurement_budgets, rfq_quote_lines, po_change_orders
  (CHECK pemohon ≠ pemutus, satu PENDING per PO), kolom reversal pada
  payment_allocations.
- Budget check pengadaan: submit PR/PO melampaui anggaran periode/cabang
  ditolak 409 BUDGET_EXCEEDED kecuali override finance ber-alasan (teraudit);
  halaman Anggaran Pengadaan dengan pemakaian per cakupan.
- RFQ multi-baris: kuota per item dengan total dihitung server, perbandingan
  termurah per item, dan baris kuota terpilih tersalin ke PO.
- PO change order maker-checker: amendemen ber-versi dengan snapshot lama
  immutable, SoD sampai constraint database, terkunci setelah GR selesai;
  halaman riwayat amendemen per PO.
- Service receipt: GOODS_RECEIPT jenis SERVICE sebagai bukti penerimaan jasa
  untuk three-way match tanpa mutasi stok/lot (dari PO memakai konversi resmi
  ORDER_TO_RECEIPT).
- Payment reversal: Owner + PIN + alasan; jurnal pembalik ke periode terbuka,
  alokasi ditandai reversed (histori utuh), invoice pulih otomatis, dokumen
  pembayaran VOID; idempoten.

### Fixed

- routes/procurement.js tidak mengimpor assertPermission sejak split 8B —
  endpoint GET /api/credit/:id dan evaluasi three-way match via HTTP
  sebelumnya gagal ReferenceError; kini diverifikasi 200.

### Verified

- 96/96 automated tests (6 tes S2P baru), migrasi 028 applied, UAT HTTP
  end-to-end: budget 409→override 200, CO#1 SOD_CONFLICT saat self-decide,
  service GR COMPLETED tanpa movement/lot, reversal memulihkan invoice.

## [0.17.0] — 2026-07-16

### Added

- Migration 027: quotation_revisions immutable, dunning_policies effective-
  dated + dunning_notices, products.warranty_months, akun 4110 Retur
  Penjualan + posting profile RMA-DEFAULT.
- Revisi penawaran ber-versi: keadaan sebelum revisi dibekukan permanen,
  dokumen kembali DRAFT dengan revisionNo naik dan approval di-reset;
  penawaran yang sudah dikonversi menjadi SO ditolak revisi. Halaman histori
  revisi dengan delta nilai antar revisi.
- Collection & dunning: pemindaian invoice jatuh tempo menerbitkan notice
  per jenjang kebijakan (7/14/30 hari, configuration-driven), idempoten per
  invoice per level; level tertinggi otomatis memasang credit hold pelanggan
  ber-alasan; penyelesaian notice wajib alasan. Halaman Collection dengan
  KPI outstanding.
- RMA/warranty: dokumen RMA (nomor RMA-*) dari Delivery/Invoice dengan
  validasi masa garansi per produk sejak tanggal dokumen sumber; disposisi
  RESTOCK/SCRAP/REPAIR per baris; saat COMPLETED disposisi RESTOCK
  menghidupkan stok + lot retur (/R{n}) dan nilai kredit dijurnal via
  posting profile RMA-DEFAULT (D 4110 / C 1200).

### Verified

- 90/90 automated tests (6 tes O2C baru), migrasi 027 applied, UAT HTTP
  end-to-end: revisi QUO rev 1→2, dunning DUN-2026-0001 terbit+resolve,
  RMA lifecycle penuh sampai jurnal D4110/C1200 dan lot retur R1.

## [0.16.0] — 2026-07-16

### Added

- Migration 025–026: draft Customer Link server-side, supplier document
  governance, supplier performance policy/evidence, risk hold, dan constraint
  database maker tidak boleh menjadi verifier.
- Customer Link Wizard lima tahap dengan source context, duplicate candidate,
  existing/new customer, autosave, recovery 30 hari, save-and-exit,
  optimistic locking, dan finalisasi atomik/idempotent.
- Supplier Performance Cockpit dengan skor delivery, quality, price, dan
  compliance berbasis bukti PO/GR/QC/dokumen serta histori evaluasi.
- Supplier Documents & Expiry dengan verifikasi maker-checker dan automatic
  hold untuk dokumen wajib tidak valid atau skor di bawah policy.

### Changed

- Pembuatan Purchase Order kini menolak supplier yang sedang onboarding atau
  performance hold dengan error bisnis `SUPPLIER_HOLD`.
- Tautan source document ke customer dan pembuatan contact/address dilakukan
  dalam satu transaksi yang diaudit.

### Verified

- 84/84 automated tests, migration 001–026, rollback 025–026 disposable,
  customer/supplier integration proof, accessibility 18/18, visual 8/8,
  secret/dependency scan, load smoke, runtime health/control, backup/restore,
  asset integrity, dan predeploy LOCAL 11/11 lulus.

## [0.15.0] — 2026-07-16

### Added

- Migration 023–024: currency registry, effective-dated FX rates, transaction
  dimension policies, normalized product variants, dan master quality issue
  registry dengan reopen guard dan rollback penuh.
- Data Quality & FX Center untuk skor Customer/Supplier/Product/Employee,
  temuan prioritas, dan pemeliharaan kurs efektif.
- Product Variant Matrix dan BOM Cost Trace yang menjelaskan sumber Active HPP,
  scrap, unit cost, extended cost, serta komponen tanpa cost.
- Integration proof Sprint 8C untuk FX/cost-center snapshot, duplicate guard,
  quality score, variant, dan cost trace.

### Changed

- Form induk Customer, Supplier, dan Product kini membuka field enterprise yang
  sebelumnya sudah ada di skema tetapi belum dapat dipelihara dari UI/API.
- Dokumen menyimpan transaction/functional/reporting currency, kurs efektif,
  nilai hasil konversi, dan immutable currency/dimension snapshot.
- Tipe transaksi finansial/operasional terkontrol memperoleh cost center aktif
  yang tervalidasi terhadap legal entity.
- `db:grant-runtime` kembali menerapkan deny-list setelah broad grant agar
  hardening append-only Production/QC/MRP tidak pernah terlepas.

### Verified

- 82/82 automated tests; migration 001–024 dan disposable rollback lulus;
  accessibility 18/18; visual regression 8/8; secret scan 357 file/0 temuan;
  predeploy LOCAL 11/11 lulus.

## [0.14.0] — 2026-07-16

### Added

- Sebelas bounded module frontend untuk Workspace, Documents, Sales,
  Procurement, Inventory, Production, Finance, HR, Master Data, Organization,
  dan Governance; seluruhnya tetap memakai satu app shell dan router.
- Dua belas route module PostgreSQL dengan shared `NO_MATCH` dispatch contract:
  public/private Auth serta sebelas domain bisnis.
- Architecture regression tests yang membatasi composition root maksimal 100
  baris, memverifikasi semua script domain dimuat tepat sekali, dan menjaga
  kontrak dispatcher backend.

### Changed

- `src/pages.js` dipangkas dari 1.652 menjadi 70 baris dan hanya menyediakan
  factory bersama melalui `window.PageKit`.
- `backend/api-postgres.js` dipangkas dari 372 menjadi 66 baris; session,
  transaction, CSRF, rate limit, SSE, metrics, dan error boundary tetap terpusat.
- API metrics dipindahkan menjadi singleton core agar monitoring domain tetap
  membaca metrik composition root yang sama.

### Verified

- 79/79 automated tests; accessibility 18/18; visual regression 8/8;
  PostgreSQL integration, security, migration, load, backup/restore, dan
  predeploy LOCAL 11/11 lulus.

## [0.13.0] — 2026-07-16

### Added

- Enterprise View Console pada daftar dokumen: server-side sorting/pagination,
  pencarian dan status filter, saved views lokal, column chooser, density, serta
  state yang tersinkron ke URL.
- Audit aksesibilitas otomatis 18 kontrol dan visual regression nyata melalui
  Edge untuk 4 alur pada viewport desktop dan mobile.
- Pipeline release asset fingerprint SHA-256, manifest, precompress Brotli/Gzip,
  cache immutable, dan verifier header runtime.
- Route domain production/QC/MRP terpisah dari API composition root.

### Changed

- Router memahami query state di hash dan memindahkan fokus ke konten utama.
- Drawer memakai semantics modal, background `inert`, focus capture/restore;
  menu mobile mengelola `aria-expanded` dan focus-visible dipertahankan.
- Build release otomatis mengganti 10 referensi asset dengan nama content-hash.

### Verified

- 76/76 automated tests; accessibility 18/18; visual 8/8; asset runtime Brotli
  + immutable PASS; migration 001–022; secret/dependency audit bersih; gate
  predeploy LOCAL 11/11.

## [0.12.0] — 2026-07-16

### Added

- Production cockpit dengan routing/work center, BOM planning, reservasi,
  actual time, job costing, Material Issue, dan finished-goods receipt ber-lot.
- QC inspection incoming/in-process/final dengan NCR, CAPA, dan auto-quarantine.
- MRP netting serta konversi suggestion ke Purchase Request.
- Migration 021 domain production/QC/MRP dan migration 022 least privilege.
- Integration proof Sprint 12 dan disposable full-chain rollback verifier.

### Changed

- Semua mutasi Sprint 12 memakai idempotency key dan branch scope server-side.
- Work order hanya dapat complete setelah operasi, material, dan penerimaan
  barang jadi memenuhi prerequisite.
- MRP safety stock dinetting tepat sekali terhadap stok dan PO terbuka.

### Verified

- 74/74 test; migration 001–022; rollback 022→021; scan 0 secret; audit 0
  vulnerability; load p95 31 ms; backup offsite + restore 124 tabel; predeploy
  LOCAL 9/9.
