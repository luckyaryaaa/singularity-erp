# ARCHITECTURE CURRENT — MAT ERP V2 (v0.29.0)

## Pola aktual (dikonfirmasi dari source, bukan dokumen)

```text
Browser (SPA vanilla, hash router, SSE)
  → server.js (headers, allowlist statis, gzip, timeout)
  → backend/api-postgres.js  [SATU dispatcher]
      resolveSession → CSRF → rate-limit → withTransaction(client)
      → 14 domain router (NO_MATCH chaining)
  → PostgreSQL 16 (mat_erp_app runtime, postgres owner utk migrasi)
```

Engine tunggal terverifikasi: document lifecycle (`runtime.js`), posting (`posting.js` + posting profiles),
approval policy versioned, audit (`runtime.audit` → partisi), idempotency (`withIdempotency`),
outbox events, job queue persisten, numbering per cabang, konversi dokumen generik, PDF engine sendiri
(document-render + pdf-image + pdf-sign PAdES), doc-verification HMAC berotasi.

## Keselarasan dengan target blueprint

| Prinsip blueprint | Status v0.29.0 |
|---|---|
| Satu core app / router / render / auth / audit / job / outbox | ✅ terpenuhi |
| Backend source of truth utk price/total/credit/period | ❌ sebagian (pricing & beberapa validasi masih FE) → P0 |
| Security context lengkap per request | PARSIAL — `ctx.user{role,branchId,branchScope}`; belum LE/plant/warehouse/field-class → P0/P1 |
| DB-backed dynamic authorization | ❌ statis → P0 |
| RLS | ❌ belum ada → P0 (tranche pertama) |
| Typed domain tables | PARSIAL (lines, lots, qc, rfq, tax sudah typed; SO/fulfilment/GR lines belum) → P1 |
| Read models | PARSIAL (mv_executive_monthly_kpis ada; dashboard dasar masih agregasi Node atas SELECT dokumen) → P0 (scope) / P1 (read model penuh) |
| Warehouse ≠ Branch | ❌ inventory ledger memakai branch sebagai warehouse → P1 (migrasi besar; scope-hardening di P0) |

## Utang teknis tercatat

1. `SELECT * FROM business_documents` + agregasi Node di dashboard dasar (degradasi seiring volume).
2. Konversi generik satu-anak-per-relasi menghambat partial fulfilment (P1).
3. Campuran tanggal UTC (`toISOString`) vs lokal Postgres (`current_date`) — helper tanggal lokal diperlukan (P1); satu flake test sudah diperbaiki di baseline.
4. Kolom bank legacy pada `suppliers` berdampingan dengan tabel bank ternormalisasi (P1 cleanup).
5. Metrics in-memory hilang saat restart (P1 observability).
