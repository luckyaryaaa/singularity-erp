# Release Notes — v0.36.0

**Tanggal:** 2026-07-28 · **Branch:** review/codex-claude-consolidation ·
**Migrasi:** 001–066 · **Gate:** predeploy LOCAL 14/14 hijau.

Rilis ini mengonsolidasikan empat wave enterprise (migrasi 063–066) dan
penutupan audit otorisasi **G1–G6** menjadi riwayat yang dapat direview.

## Sorotan

### Keamanan & tata kelola
- **Privileged password reset maker-checker (063):** reset administratif memakai
  usul→setuju dua orang (Security/System Admin → Owner) dengan recent MFA, SoD
  (maker ≠ checker), tautan sekali pakai 30 menit, dan audit DENY/APPROVE tanpa
  menulis secret. Reset Owner server-only. Izin `user.reset_password` dipisah
  granular dari `user.edit`.
- **MFA recovery (063):** sepuluh recovery code SHA-256 sekali pakai, lifecycle
  pergantian faktor, dan workbench Account/User Security.
- **Field-level encryption (065):** AES-256-GCM untuk rekening bank, PII, dan
  data gaji; blind index HMAC untuk pencarian atas ciphertext; rotasi kunci
  berversi (current + previous) + skrip rotasi.
- **Data retention lifecycle (066):** policy retensi allowlist tertutup, legal
  hold, preview/eksekusi aman, ledger retensi append-only, API/UI governance.

### Eksekusi & integritas data (064)
- **RLS defense-in-depth** pada reservasi, kontrak pembelian, work-order
  operations/materials/time-logs, QC, CAPA, alat ukur, kalibrasi;
  view `security_invoker`.
- **Optimistic concurrency** (kolom `version` + `expectedVersion`) mencegah
  timpa perubahan dari layar stale.
- **Replay guard** kontrak pembelian NULL-safe (idempotency + unique partial index).
- **Workbench operator** desktop/mobile: Reservation, Purchase Contract 360,
  Capacity & WIP, CAPA & Calibration — dengan URL state, empty/permission state,
  pagination, dan mutasi terkendali.

### Penutupan audit otorisasi (G1–G6)
- **G1:** memperbaiki bypass konteks RLS — sebelumnya **setiap** request domain
  berjalan sebagai `app.is_system=on/cross_branch=on`, mematikan pertahanan
  kedua di database pada 34 tabel ber-RLS. Diperbaiki dan **dibuktikan pada
  PostgreSQL live**.
- **G2:** akuntansi handler lengkap (`directGuards + delegated + public === handlers`)
  yang ditegakkan CI.
- **G3:** rekonsiliasi dokumen keamanan ke 281 handler + drift-guard.
- **G4:** logging event `authz_denied` terstruktur pada penolakan izin.
- **G5:** guard three-way match didokumentasikan (read-only derived — disengaja).
- **G6:** endpoint publik didokumentasikan di OpenAPI.

## Kompatibilitas & migrasi
Naik migrasi 063→066 secara berurutan; rollback tersedia (`.down.sql`) dan
teruji (66→65→…→63). Set env baru `MAT_FIELD_ENCRYPTION_*` (lihat `.env.example`).
Detail: [MIGRATION_NOTES.md](MIGRATION_NOTES.md).

## Status
Rekayasa lulus regression. **Go-live: BLOCKED** menunggu gate manusia Wave F
(UAT 13 role, rekonsiliasi, DR RTO/RPO, Owner sign-off, SEC-UAT-001 CLOSED) dan
wave rekayasa berikutnya (Finance depth, Operations logistics). Lihat artefak
readiness & [../uat/UAT_RETEST_PLAN.md](../uat/UAT_RETEST_PLAN.md).
