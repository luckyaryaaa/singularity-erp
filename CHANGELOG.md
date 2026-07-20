# Changelog

Semua perubahan penting MAT ERP V2 dicatat di file ini. Versi mengikuti
Semantic Versioning selama fase local build dan LAN-UAT.

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
