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
```

Perintah rotasi menghasilkan password baru langsung di `.env`, memperbarui hash
PostgreSQL, mencabut semua sesi Owner, dan tidak mencetak secret.

## Dokumentasi

- `docs/architecture/overview.md`
- `docs/api/endpoints.md`
- `docs/database/schema.md`
- `docs/security/security-model.md`
- `docs/self-test/checklist.md`
- `docs/release/DELIVERY.md`
