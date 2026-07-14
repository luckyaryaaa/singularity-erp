# Arsitektur MAT ERP V2

MAT ERP V2 adalah modular monolith: satu HTTP server, satu SPA shell, satu
permission engine, satu document state machine, satu PostgreSQL database, dan
worker dalam proses yang menggunakan persistent queue.

```text
Browser SPA
  -> HTTP API + SSE
    -> Auth / RBAC+ABAC / CSRF / rate limit
      -> Domain services dan repositories
        -> PostgreSQL 16
           documents | inventory | accounting | tax | HR/payroll | audit | jobs
```

## Konsistensi

Transaction database menyatukan dokumen, numbering, audit, idempotency, dan
outbox. Optimistic locking mencegah silent overwrite. Job worker memakai
`FOR UPDATE SKIP LOCKED`, lease, heartbeat, retry, dan expired-lease recovery.

## Runtime

- `server.js`: static allowlist, security headers, gzip, startup gate.
- `backend/api-postgres.js`: kontrak REST/SSE runtime PostgreSQL.
- `backend/infrastructure/database`: pool, transaction, migration, repository.
- `backend/workers/postgres-worker.js`: persistent background worker.
- `backend/infrastructure/database/repositories/business-operations.js`: accounting, allocation, tax, attendance, payroll, dan reconciliation.
- `src/`: router, API client, cache, components, pages, responsive design.

Memory adapter hanya untuk regression test; tidak menjadi fallback runtime.
