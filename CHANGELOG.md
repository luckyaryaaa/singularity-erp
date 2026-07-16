# Changelog

Semua perubahan penting MAT ERP V2 dicatat di file ini. Versi mengikuti
Semantic Versioning selama fase local build dan LAN-UAT.

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
