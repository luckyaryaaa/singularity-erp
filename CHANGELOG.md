# Changelog

Semua perubahan penting MAT ERP V2 dicatat di file ini. Versi mengikuti
Semantic Versioning selama fase local build dan LAN-UAT.

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
