# Changelog

Semua perubahan penting MAT ERP V2 dicatat di file ini. Versi mengikuti
Semantic Versioning selama fase local build dan LAN-UAT.

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
