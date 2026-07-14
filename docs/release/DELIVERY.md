# MAT ERP V2 — Delivery v0.6.0 (Pengerasan Produksi)

## Status v0.6.0 — siap runbook go-live VPS

- Git repository aktif (baseline + commit per item); dead code legacy dihapus.
- Migrasi 011: partisi audit 2026–2031 + DEFAULT + maintenance otomatis —
  bom waktu tulis massal 1 Jan 2027 tertutup dan terverifikasi (insert 2027 →
  partisi 2027, insert 2040 → DEFAULT).
- Fail-fast `MAT_DB_MODE`; kredensial demo hilang total dari klien.
- Backup 3-2-1: offsite terenkripsi AES-256-GCM + retensi 14 + decrypt CLI;
  restore drill terbaru menghasilkan 52 tabel + migrasi 011.
- Alert webhook operasional + `/api/health` publik untuk uptime monitor.
- FIX SSE runtime postgres (koneksi kini terdaftar ke event bus — realtime hidup).
- Paket deploy: `deploy/Caddyfile`, `deploy/mat-erp.service` (hardened),
  `deploy/firewall.sh`, `docs/release/vps-runbook.md` (go-live 6 fase +
  rollback kode/migrasi/offsite).
- `npm run predeploy`: 4/4 hijau. `npm run load:smoke`: p50 6 ms / p95 135 ms /
  p99 259 ms @ 300 req 12 konkuren, 0 gagal (target p95 < 500 ms).
- 41/41 automated tests; self-test runtime 9/9; gerbang rilis terbuka.

# Riwayat v0.5.0 / Sprint 4

## Status

- PostgreSQL 16.14 Windows Service, automatic startup, localhost-only.
- Database `mat_erp_v2_dev`; runtime role `mat_erp_app` least-privilege.
- Migration 001–010 diterapkan dan checksum valid.
- API PostgreSQL melayani seluruh endpoint yang digunakan SPA.
- Persistent session, auth challenge, notification, job queue, audit, outbox.
- Password challenge dan MFA TOTP lengkap serta tahan restart.
- Konversi lintas dokumen, posting inventory/accounting, master CRUD, dan system setting persisten aktif.
- Private file, PDF/Excel/slip payroll artifact worker, notification delivery, backup scheduler + retention aktif.
- Trial balance, buku besar, jurnal manual, payment allocation, closing/reopen, tax record, dan rekonsiliasi aktif.
- Attendance, leave balance, payroll, BPJS/PPh 21, import CSV, dan employee self-service terisolasi aktif.
- Backup PostgreSQL nyata lolos checksum; restore drill menghasilkan 46 tabel dan migration 010.
- 38/38 automated tests lulus; release gate tidak diblokir.

## Operasional

```powershell
npm.cmd run db:health
npm.cmd run db:validate
npm.cmd test
npm.cmd run dev
```

Server hanya bind `127.0.0.1:4173`. PostgreSQL hanya bind `127.0.0.1:5432`.
Production wajib memakai reverse proxy HTTPS/HSTS dan
`MAT_MFA_ENCRYPTION_KEY` terpisah yang kuat.

## Ruang lingkup Sprint 4 — selesai

1. accounting aktual, jurnal manual, period closing/reopen, dan rekonsiliasi bank;
2. payment allocation atomic serta tax record dari transaksi aktual;
3. attendance, leave balance, payroll, BPJS, PPh 21, dan slip employee privat;
4. master CRUD + import CSV, lampiran privat, dan laporan worker berbasis data;
5. employee self-service dengan isolasi user–employee dan branch scope;
6. monitoring storage nyata, backup checksum, dan restore drill migration 010;
7. UAT Sprint 4 serta regression lintas seluruh role.

Integration test lintas domain, backup restore drill, security review, dan UAT
multi-role Sprint 4 selesai pada 14 Juli 2026. Secret tetap hanya berada di `.env`.
