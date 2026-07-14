# Self-Test MAT ERP V2

Gerbang runtime tersedia di Sistem → Self Test dan `GET /api/system/self-test`.
Rilis diblokir bila pemeriksaan kritis gagal.

Pemeriksaan runtime:

1. koneksi PostgreSQL;
2. migration terbaru `010_employee_self_service.sql`;
3. hashing token session dan CSRF;
4. persistent job queue;
5. persistent auth challenge;
6. transaction ledger readiness;
7. schema enterprise operations;
8. finance & HR operations;
9. backup completed dan restore drill berhasil.

Suite `npm.cmd test` berisi 38 test: session, CSRF, Origin, lockout, rate limit,
RBAC, pagination, optimistic locking, concurrency, idempotency, approval tier,
PIN Owner, SSE, migration checksum, least privilege, PostgreSQL localhost,
outbox, job claim, seluruh kontrak endpoint UI, restart persistence, password
change challenge, MFA TOTP, inventory movement, jurnal double-entry, konversi
dokumen, master CRUD/import, private file, artifact worker, accounting summary,
payment allocation, closing/reopen, attendance, payroll, tax, bank reconciliation,
employee self-service, dan matriks UAT lintas role.
