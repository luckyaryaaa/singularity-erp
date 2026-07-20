# Self-Test MAT ERP V2

Gerbang runtime tersedia di Sistem → Self Test dan `GET /api/system/self-test`.
Rilis diblokir bila pemeriksaan kritis gagal.

Pemeriksaan runtime:

1. koneksi PostgreSQL;
2. migration terbaru (dinamis dari folder migrasi — saat ini
   `035_final_assurance_partition_maintenance.sql`);
3. hashing token session dan CSRF;
4. persistent job queue;
5. persistent auth challenge;
6. transaction ledger readiness;
7. schema enterprise operations;
8. finance & HR operations;
9. enterprise IAM, SoD, dan access review;
10. versioned approval policy aktif;
11. Organization & Employee Master, MFA step-up, dan snapshot identitas dokumen;
12. backup completed dan restore drill berhasil;
13. official document issuance/signature columns dan delivery idempotency;
14. runtime role tetap least-privilege pada tabel append-only/history;
15. semantic KPI materialized view, saved filter, report scheduler, dan bukti
    refresh reporting terakhir tersedia;
16. seluruh jurnal seimbang dan setiap jurnal minimal memiliki dua baris;
17. integritas kuantitas/lot dan rekonsiliasi subledger persediaan terhadap GL;
18. total dokumen payroll sesuai jumlah payroll item;
19. partisi inventory current/next month dan audit current/next year tersedia;
20. tidak ada orphan kritis pada file, dokumen, job, lot, dan relasi dokumen.

Status pemeriksaan adalah `pass`, `warning`, `fail`, atau `blocked`. Hanya
`fail`/`blocked` pada pemeriksaan kritis yang menutup release gate. Warning
rekonsiliasi tetap tampil dengan angka selisih dan wajib ditindaklanjuti saat
LAN-UAT; warning tidak boleh diubah menjadi pass tanpa bukti koreksi.

Suite `npm.cmd test` saat closure v0.24.0 berisi 136 test dan mencakup unit,
integration PostgreSQL, HTTP/E2E,
authorization/IDOR, document rendering, migration, dan UI contracts (termasuk:
WO→reservasi→FIFO issue→costing→finished goods, QC→NCR/karantina, MRP netting,
least-privilege production, RFQ+perbandingan,
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
approval policy snapshot, semantic KPI reconciliation, reporting freshness,
saved view, scheduled report idempotency, serta negative branch-scope reporting.
Closure Sprint 17 juga menguji matriks 14 router/183 handler, public allowlist,
18 SOP, reconciliation assurance, partition lifecycle, dan orphan detection.

Release closure juga menjalankan `npm.cmd run db:rollback-verify` pada database
disposable, `npm.cmd run load:smoke`, `npm.cmd run load:lan` (10/25 user,
read+write), backup offsite terenkripsi,
`npm.cmd run backup:restore-test`, dan gerbang `npm.cmd run predeploy`.
