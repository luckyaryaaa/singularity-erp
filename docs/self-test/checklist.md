# Self-Test MAT ERP V2

Gerbang runtime tersedia di Sistem → Self Test dan `GET /api/system/self-test`.
Rilis diblokir bila pemeriksaan kritis gagal.

Pemeriksaan runtime:

1. koneksi PostgreSQL;
2. migration terbaru (dinamis dari folder migrasi — saat ini `018_procurement_credit_control.sql`);
3. hashing token session dan CSRF;
4. persistent job queue;
5. persistent auth challenge;
6. transaction ledger readiness;
7. schema enterprise operations;
8. finance & HR operations;
9. enterprise IAM, SoD, dan access review;
10. versioned approval policy aktif;
11. Organization & Employee Master, MFA step-up, dan snapshot identitas dokumen;
12. backup completed dan restore drill berhasil.

Suite `npm.cmd test` berisi 60 test (termasuk Wave 2: RFQ+perbandingan,
three-way match ber-toleransi, credit control, payment proposal): session,
CSRF, Origin, lockout, rate limit,
RBAC, pagination, optimistic locking, concurrency, idempotency, approval tier,
PIN Owner, SSE, migration checksum, least privilege, PostgreSQL localhost,
outbox, job claim, seluruh kontrak endpoint UI, restart persistence, password
change challenge, MFA TOTP, inventory movement, jurnal double-entry, konversi
dokumen, master CRUD/import, private file, artifact worker, accounting summary,
payment allocation, closing/reopen, attendance, payroll, tax, bank reconciliation,
employee self-service, matriks UAT lintas role, role assignment maker-checker,
SoD conflict, expiry akses, session revocation, access review, dan immutable
approval policy snapshot.
