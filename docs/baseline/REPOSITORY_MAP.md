# REPOSITORY MAP — MAT ERP V2 (v0.29.0)

## Struktur direktori

```text
server.js                  HTTP server, security headers, static allowlist, gzip, boot gate produksi
index.html                 SPA shell (script src/ dimuat langsung, tanpa bundler)
backend/
├── api-postgres.js        Dispatcher tunggal: session → CSRF → rate-limit → transaksi → domain router
├── core/                  errors, permissions (ROLE_GRANTS statis), password(scrypt), csrf, env,
│                          doc-verification (HMAC), pdf-sign (PAdES/CMS), document-types,
│                          authorization-matrix (kontrak 195 handler), openapi, util, data-scope
├── routes/                14 bounded router (lihat tabel)
├── infrastructure/
│   ├── database/          pool, migrations (checksum), backup (pg_dump + offsite terenkripsi)
│   │   └── repositories/  runtime (document engine+audit+idempotency+konversi+event outbox),
│   │                      posting, accounting-config (peran akun/tarif/payroll, cache 60s),
│   │                      business-operations, finance-reports, fixed-assets, tax-compliance,
│   │                      procurement (credit/budget/match), production, inventory, hr-operations,
│   │                      master-data, master-governance, organization, governance (IAM/SoD),
│   │                      operations (jobs/notifikasi), reporting (cockpit MV), document-templates,
│   │                      doc-numbering, assurance (self-test)
│   ├── files/             private-storage (quarantine+scan), document-render (PDF), pdf-image,
│   │                      artifact-storage
│   ├── smtp.js            Email (no-op bila belum dikonfigurasi)
│   └── workers/           postgres-worker (job queue lease/heartbeat/retry/dead-letter)
├── workers/               entry worker
src/
├── core.js                api client, cache query/invalidate, SSE, router hash, i18n hook, asList
├── components.js          ICONS, dialogs, drawer dokumen, toast, runDocAction/Conversion
├── components/enterprise-table.js  tabel server-side (pagination/sort/saved view/kolom)
├── pages.js               PageKit (docListPage, masterPage, dsb)
├── modules/               13 modul UI: workspace(dashboard+approvals+notif), my-work, sales,
│                          procurement, inventory, production, finance, hr, master-data,
│                          organization(+settings+template), governance, documents,
│                          executive-reporting (analitik dashboard + report factory)
├── styles.css + design-system/tokens.css
data/migrations/           001..039 (+.down.sql masing-masing)
scripts/                   db.js, provision, seed dev/uat, purge, backup, rotate-secrets,
                           build-release, secret-scan, verify-release-assets, accessibility-audit,
                           ui-smoke-cdp, load-smoke, predeploy-gate, cutover, grant-runtime
deploy/                    Caddyfile (TLS), mat-erp.service (systemd hardening), firewall.sh,
                           install/rollback-release.sh
test/                      29 file (unit, integrasi PostgreSQL, HTTP e2e, authorization, isolasi cabang)
storage/                   RUNTIME (private files, backups .dump, artifacts, smoke png) — gitignored
release/                   Hasil clean build — gitignored
```

## Router → permission → evidence

| Router | Handler | Strategi guard | Test evidence |
|---|---:|---|---|
| auth.js | 13 | PUBLIC_OR_SESSION_SELF_SERVICE | api.test, postgres-auth |
| workspace.js | 3 | PERMISSION_AND_USER_SCOPE | api.test |
| documents.js | 8 | DYNAMIC_DOC_PERMISSION_AND_BRANCH | api.test, branch-isolation |
| sales.js | 6 | PERMISSION_AND_REPOSITORY_BRANCH | sprint9-o2c, branch-isolation |
| procurement.js | 15 | REPOSITORY_PERMISSION_BRANCH_SOD | sprint10-s2p |
| operations.js | 12 | PERMISSION_OWNERSHIP_BRANCH | postgres.http, r012 |
| masters.js | 30 | DYNAMIC_MASTER_PERMISSION_SCOPE | sprint8c |
| organization.js | 11 | REPOSITORY_SCOPE_OWNER_PIN_MFA | sprint7, sprint15 |
| inventory.js | 8 | PERMISSION_AND_WAREHOUSE_BRANCH | sprint11 |
| production.js | 14 | PERMISSION_AND_WO_BRANCH | sprint12 |
| finance.js | 30 | PERMISSION_BRANCH_PIN_SOD | sprint13, branch-isolation |
| hr.js | 15 | PERMISSION_BRANCH_OWN_RECORD | sprint14 |
| reporting.js | 9 | PERMISSION_BRANCH_FILTER_OWNERSHIP | sprint16 |
| governance.js | 21 | PERMISSION_SOD_PIN_MFA_APPEND_ONLY | sprint6, r012 |

## Alur dokumen (CONVERSIONS aktif)

`QUOTATION→SALES_ORDER`, `CUSTOMER_PO→SALES_ORDER`, `SALES_ORDER→PROJECT`, `PROJECT→WORK_ORDER`,
`PURCHASE_REQUEST→PURCHASE_ORDER`, `PURCHASE_ORDER→GOODS_RECEIPT`, `DELIVERY→INVOICE`
(engine konversi generik = satu anak per relasi; keterbatasan dicatat di blueprint P1).

## Duplikasi / dead code hasil scan

- Tidak ditemukan engine ganda (approval/audit/numbering/notifikasi satu implementasi).
- `supplier` base table masih membawa kolom bank legacy di samping workflow bank ternormalisasi (temuan audit MD 7.8 — kandidat pembersihan P1 setelah rekonsiliasi).
- Pola tanggal `toISOString().slice(0,10)` (UTC) bercampur dengan `current_date` lokal Postgres — sumber flake test yang diperbaiki di baseline; audit lanjutan per call-site masuk backlog P1.
