# TEST BASELINE — MAT ERP V2 (v0.29.0, 2026-07-22)

Seluruh test **benar-benar dijalankan** pada lingkungan ini (PostgreSQL lokal aktif). Tidak ada status yang diasumsikan.

## Hasil eksekusi

| Suite | Hasil | Keterangan |
|---|---|---|
| `npm test` (29 file, concurrency=1) | **144 PASS / 0 FAIL / 0 SKIP** | Setelah perbaikan 1 flaky test (lihat bawah) |
| `npm run security:scan` | **PASS** — 452 file, 0 temuan | Scanner mengecualikan .env/storage/dump/binari (lihat SECURITY_EXPOSURE_BASELINE) |
| Authorization matrix | **PASS** — 195 handler tercakup | test/authorization-matrix.test.js |
| Migration checksum + urutan | **PASS** | test/database-infrastructure.test.js |
| Rollback migrasi penuh (39 up / 38 down / 38 re-up) | **PASS** (dijalankan 2026-07-21 di DB disposable) | `npm run db:rollback-verify` |
| Aksesibilitas (`test:a11y`) | **PASS 18/18** (dijalankan pada audit 2026-07-21, tidak diulang hari ini) | |

## Insiden baseline

**FAIL awal:** `sprint8c-wave2 — supplier score` gagal pada eksekusi pertama hari ini.

- **Akar masalah:** test membuat `dueDate` PO memakai `new Date().toISOString().slice(0,10)` (tanggal **UTC**), sedangkan evaluasi on-time delivery membandingkan `updated_at::date` (**waktu lokal** Postgres, Asia/Jakarta). Pada jam 00:00–07:00 WIB tanggal UTC masih H-1 → delivery 0% → skor 47.5 < ambang hold 50 → `performance_hold=true` tidak sesuai ekspektasi.
- **Bukti:** UTC date `2026-07-21` vs `current_date` Postgres `2026-07-22` pada 05:14 WIB; bobot policy DEFAULT 35/35/20/10, hold_threshold 50, min_orders 3 — skor 0×.35+50×.35+100×.20+100×.10 = 47.5.
- **Perbaikan:** dueDate test digeser +2 hari (deterministik lintas zona waktu). Setelah fix: PASS, suite penuh 144/144.
- **Tindak lanjut:** pola UTC-vs-lokal juga ada di kode produksi (risiko salah "overdue" pada jendela jam yang sama). Dicatat sebagai item P1 (standardisasi helper tanggal lokal).

## Kategori coverage yang ADA

Unit, repository/service (integrasi PostgreSQL via rollback-transaction), API/HTTP e2e, permission allow/deny, isolasi cabang (IDOR), maker-checker, SoD, idempotency, optimistic-locking, migrasi, UI smoke statis, aksesibilitas, backup crypto round-trip, kontrak partisi audit.

## Kategori coverage yang BELUM ADA (gap → diisi selama P0/P1)

- RLS allow/deny (RLS belum diimplementasikan).
- Query-performance test formal.
- Restore-drill berbasis bisnis (baru cek skema/tabel, belum trial-balance/rekonsiliasi).
- Load test multi-user tercatat sebagai skrip (`load:smoke`) namun tidak masuk gate otomatis.
