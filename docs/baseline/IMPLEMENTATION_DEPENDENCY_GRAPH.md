# IMPLEMENTATION DEPENDENCY GRAPH — P0 (2026-07-22)

Urutan eksekusi P0 disusun agar tidak ada rework, mengikuti blueprint §19 namun disesuaikan fakta source.
Setiap wave = commit terpisah dengan suite penuh hijau.

```text
WAVE 0  Baseline (SELESAI)
        └─ 144/144 PASS + 6 dokumen baseline + fix flaky tz test

WAVE 1  Release & artefak  (tanpa dependensi)
        ├─ P0-A: scanner artefak FINAL tanpa pengecualian + deny-list (.env/.git/dump/storage/node_modules)
        ├─ P0-B: SBOM (package-lock) + manifest ditandatangani hash
        └─ P0-C: enkripsi backup lokal + enkripsi in-place 18 dump lama

WAVE 2  Enforcement backend transaksional  (tanpa dependensi antar-item, satu commit)
        ├─ P0-D: payment allocation idempotent
        ├─ P0-E: closePeriod = full closing cockpit gate (+waiver WARN beralasan)
        ├─ P0-F: financial statements — UNMAPPED eksplisit, blokir publish
        ├─ P0-G: kurs maker-checker (PENDING→approve oleh user berbeda)
        ├─ P0-H: accounting_periods per Legal Entity (kolom+unique, backfill entitas tunggal)
        ├─ P0-I: server-authoritative totals (recompute lines vs header, tolak selisih)
        ├─ P0-J: Customer PO backend validation + unique per customer
        ├─ P0-K: credit exposure += open SO + unbilled delivery, lock per-customer, checkpoint delivery
        ├─ P0-L: RMA kumulatif ≤ delivered (qty & nilai dari sumber)
        ├─ P0-M: QC-final gate + urutan operasi WO
        ├─ P0-N: opname scope + idempotency; MRP scoped per cabang/warehouse
        └─ P0-O: three-way match pakai toleransi qty + perbandingan line bila tersedia
        (D–H = Finance; I–L = Sales; M–O = Operations. Test sprint terkait di-update bersama.)

WAVE 3  Workspace entitlement & notifikasi  (butuh W2 tidak; independen)
        ├─ P0-P: KPI entitlement per kartu + scope cabang inventory + hapus nilai hard-coded
        ├─ P0-Q: permission per report key (view/schedule/export)
        └─ P0-R: notification_recipients per penerima + scope cabang + pisah "action required" dari unread

WAVE 4  IAM & audit  (P0-S prasyarat P0-T/U)
        ├─ P0-S: authorization DB-backed (grants ter-seed dari peta statis, versi+cache,
        │        multiple-role union dari assignment aktif, emergency override runtime)
        ├─ P0-T: MFA wajib akun privileged + disable MFA butuh TOTP + hash versioning scrypt→param baru
        ├─ P0-U: redaksi audit terpusat + grant partisi audit INSERT-only + default privileges
        └─ P0-V: RLS tranche-1 (business_documents, inventory_balances, stock_lots, notifications)
                 — session GUC di dispatcher + worker + helper test

DEFERRED KE P1 (dgn justifikasi di IMPLEMENTATION_BASELINE §Perbedaan):
        Branch-as-Warehouse migration (ledger inventory penuh), typed SO/fulfilment lines,
        ATP/CTP, read model dashboard penuh, workbench organisasi, Party/BP, Change Request engine.
```

**Gate P0 selesai** = seluruh wave 1–4 commit, `npm test` hijau (jumlah test bertambah), rollback-verify migrasi baru lulus, scanner artefak final lulus pada `release/`.
