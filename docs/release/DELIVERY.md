# MAT ERP V2 — Delivery v0.12.0 (Sprint 12 / R019 Foundation)

## Status v0.12.0 — LOCAL BUILD READY

- Production cockpit: routing/work center, snapshot rate, BOM explosion,
  reservation, FIFO Material Issue, actual time, job costing, finished-goods
  receipt, dan completion gate.
- Quality: inspection incoming/in-process/final, NCR, root cause/CAPA, dan
  auto-quarantine lot gagal. MRP: netting kebutuhan + safety stock dan
  idempotent conversion ke Purchase Request.
- Migration 021 menambah domain production/QC/MRP; migration 022 mengunci
  least privilege. Full-chain 22 migration dan rollback 022→021 lulus pada
  database disposable.
- Evidence 16 Juli 2026: 74/74 automated tests; secret scan 321 file/0 temuan;
  dependency audit 0 vulnerability; load 300/300, p95 31 ms; PostgreSQL health
  hijau; backup offsite AES-256-GCM valid; restore drill 124 tabel sampai 022;
  predeploy LOCAL 9/9 hijau.

Scope yang belum ditutup: capacity planning, WIP accounting formal, inspection
plan, calibration, LAN-UAT lintas divisi, Owner sign-off, dan VPS production.
Karena itu label ini tidak boleh diinterpretasikan sebagai PRODUCTION READY.

## Riwayat v0.10.0 — Enterprise Organization & Employee Master

## Status v0.10.0 — Enterprise Organization & Employee Master

- Organization Workbench menjadi single source of truth identitas legal,
  hierarchy, aset, authorized signatory, identitas pajak, dan rekening perusahaan.
- Rekening perusahaan memakai maker-checker, Owner PIN, MFA step-up 10 menit,
  reason, audit old/new termasking, dan hanya status VERIFIED yang disnapshot.
- Dokumen transaksi baru menyimpan snapshot immutable identitas organisasi,
  rekening, dan penandatangan pada saat creation.
- Employee Workbench mengikuti tepat 10 tab final dengan grouped renderer tunggal;
  kompensasi dan payroll bank memakai maker-checker serta masking server-side.
- Migration 017 dan rollback tervalidasi. Suite 54/54, Self-Test 12/12,
  backup offsite terenkripsi dan restore drill 108 tabel seluruhnya lulus.
Catatan readiness: implementasi R014 selesai. Kelengkapan data legal harus diisi
dari dokumen resmi perusahaan; nilai yang belum tersedia tidak difabrikasi.

## Status v0.9.0 — Enterprise IAM, SoD & Approval Governance

- Migration 016 menyediakan 13 role enterprise, assignment role
  maker-checker/effective-dated, rule dan event SoD, emergency override,
  access review, serta approval policy versioned.
- API menolak perubahan role langsung. Persetujuan assignment dan aktivasi
  policy memerlukan checker berbeda; perubahan akses mencabut sesi aktif.
- Assignment kedaluwarsa tidak lagi dapat login atau mempertahankan sesi.
- Creator dokumen tidak dapat menjadi approver; override Owner wajib PIN,
  alasan, scope, durasi, dan audit trail.
- Approval policy aktif diselesaikan pada submit dan disnapshot immutable ke
  dokumen. Access review mendukung retain/revoke hingga completion gate.
- UI governance mencakup IAM, SoD conflict center, policy builder, daftar dan
  workbench access review. Self-test/predeploy memverifikasi kontrol R013.
- Rilis ini tetap local build. LAN-UAT, sign-off Owner, dan aktivasi VPS R026
  tetap merupakan gate terpisah setelah seluruh backlog berikutnya selesai.

## Status v0.8.0 — local build gate selesai

- Environment guard, trusted proxy, session/CSRF hardening, job lifecycle dan
  policy registry, file quarantine/scanner, serta data scope report/export/file
  aktif dan memiliki regression test.
- Credential runtime telah dirotasi pada 15 Juli 2026; nilai hanya berada di
  `.env`, tidak dicetak dan tidak dimasukkan ke paket release.
- Release dibangun dari allowlist, melewati secret scan, dan memiliki manifest
  SHA-256. `npm run predeploy` menjalankan audit dependency, checksum migration,
  full test, load smoke, boot/health, pemeriksaan R012, dan backup freshness.
- LOCAL BUILD READY bukan PRODUCTION READY. Production tetap diblokir sampai
  LAN-UAT serta `docs/uat/FINAL_SIGNOFF.json` disetujui Owner dan VPS diaktifkan
  pada R026.

# Riwayat v0.6.0 — Pengerasan Produksi

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
