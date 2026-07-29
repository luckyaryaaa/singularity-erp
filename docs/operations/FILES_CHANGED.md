# Files Changed — Konsolidasi v0.47.0

## Closure v0.47.0 — migration 082 dan WMS Mobility

- `082_warehouse_stage2a_mobility`: canonical warehouse guard, expiry/location
  ledger, health view, handling unit, scan session, dan append-only scan event.
- `warehouse-mobility.js`: lifecycle license plate dan eksekusi scan berurutan.
- `warehouse-tasks.js`: canonical dimension serta scan-required completion gate.
- `inventory.js` (route + UI): sembilan endpoint dan WMS Mobile workbench.
- Wave 24, OpenAPI 1.5, authorization 319 handler, visual baseline v9.

Riwayat pada branch `review/codex-claude-consolidation`. Setiap commit mandiri,
di-review, dan lulus scoped tests-nya (lihat [TEST_EVIDENCE.md](TEST_EVIDENCE.md)).

## Closure v0.46.0 — migration 081 dan Work Orchestration

- `081_domain_event_work_item_projection`: versioned outbox delivery,
  retry/backoff/dead-letter, serta dedupe/source metadata Unified Work Item.
- `domain-work-projector.js`: proyeksi idempoten action-required/resolved,
  notifikasi, auto-resolution, dan audit.
- Runtime sources: approval, Warehouse Task, CAPA/QC, reconciliation exception,
  serta dunning/credit hold.
- Outbox dispatcher: RLS system context, savepoint per event, post-commit SSE,
  exponential backoff, dan dead-letter audit.
- Governance outbox operations/API: metadata tanpa payload dan controlled retry
  dengan recent MFA + alasan.
- Wave 23 test, OpenAPI event catalog, SSE cache invalidation, authorization
  matrix 310 handler, environment example, release evidence, backlog, audit,
  dan blueprint diselaraskan.

## Closure v0.45.0 — migration 080 dan release governance

- `080_branch_default_warehouse_guard`: invariant gudang default untuk cabang
  yang dibuat/diaktifkan setelah migration 076, backfill, dan rollback.
- Test Warehouse Stage 2 menambah late-created branch lifecycle; integration
  fixtures membersihkan owned warehouse sebelum branch temporer.
- Visual baseline v8: 31 halaman × desktop/mobile, termasuk lima capability
  terbaru dengan selector terarah.
- README, changelog, release/migration notes, test evidence, UAT baseline,
  security matrix, audit, backlog, blueprint source map, dan release artifact
  diselaraskan ke v0.45/migration 080.

## Closure v0.40.0–v0.44.0 — migration 075–079

- 075 Warehouse Task Engine; 076 Canonical Warehouse Ledger Stage 1;
  077 Unified Work Items; 078 Notification Preferences; 079 Advanced Pricing
  Conditions Stage 1.
- Source, API, UI, permission/scope, audit, test, rollback, dan dokumentasi
  capability tersedia; production acceptance tetap mengikuti human gates.

## Closure v0.39.0 — migration 074

- `074_finance_end_to_end_closure`: reconciliation evidence, period-close
  package, RLS, immutable trigger, policy version, dan rollback.
- Posting repository: HARD enforcement, header/payload dimensions, deterministic
  legal-entity master fallback, dan posting-resolution snapshot.
- Finance repository/routes: reconciliation prepare/approve/reject, close
  evidence, coding policy maintenance, report integrity/sign-off, mandatory
  idempotency untuk period close, serta audit trail.
- Finance UI: Coding Block Control, Tax Reconciliation, Official Financial
  Statements, dan Closing Cockpit end-to-end.
- OpenAPI 1.4, authorization matrix 291 handler, visual baseline v7, tests,
  roadmap, audit, release/migration notes, dan evidence diselaraskan.

## Closure v0.38.0 — migration 070–073

- `070_security_data_protection_tranche2`: 29 tabel RLS dan encryption KTP,
  NPWP employee, BPJS, serta organization tax identity.
- `071_employee_null_scope_fail_closed`: null-branch employee tidak bocor ke
  sesi branch.
- `072_sensitive_history_least_privilege`: tujuh histori kritis no-delete.
- `073_identifier_token_capacity`: kolom legacy menampung token terenkripsi.
- Repository master-data/organization, rotation utility, runtime grants,
  predeploy gate, release builder, data-protection audit, negative isolation
  tests, risk matrix, audit, roadmap, dan release evidence diselaraskan.

## Closure v0.37.0 — migration 065–069 dan release governance

- Migration 065–066: field encryption/key rotation dan retention/legal hold.
- Migration 067–069: journal dimensions, tax reconciliation, dan financial
  report sign-off.
- Release governance: package/lockfile, README, changelog, roadmap, OpenAPI,
  endpoint matrix, UAT baseline, migration/release notes, test evidence, visual
  baseline, dan release manifest.
- Visual v6 menambahkan Retention Workbench dan menaikkan coverage menjadi
  22 halaman × 2 viewport.

## `3edb463` — feat(security,governance): privileged reset/MFA recovery + data retention (063+066)
> 063 dan 066 digabung karena inseparable: `routes/governance.js` mengimpor
> `password-reset.js` (063) **dan** `retention.js` (066), dan `api-postgres.js`
> mem-boot seluruh router.

`backend/api.js`, `backend/core/auth.js`, `backend/core/permissions.js`,
`backend/infrastructure/database/repositories/auth.js`, `…/password-reset.js`,
`…/retention.js`, `backend/routes/auth.js`, `backend/routes/governance.js`,
`data/migrations/063_*.sql` (+down), `data/migrations/066_*.sql` (+down),
`docs/operations/v0.35-*.md`, `docs/security/PASSWORD_RESET_POLICY.md`,
`docs/security/SECURITY_INCIDENT_SEC-UAT-001.md`, `src/modules/governance.js`,
`test/helpers/mfa-login.js`, `test/postgres-auth.integration.test.js`,
`test/postgres.http.test.js`, `test/sec-uat-001-password-reset.test.js`,
`test/wave14-data-retention.test.js` — **21 file.**

## `627aaa4` — fix(execution): RLS + concurrency + workbenches (064)
repos `capacity/production/purchase-contracts/quality-capa/stock-reservations`,
routes `inventory/procurement/production`, `data/migrations/064_*.sql` (+down),
`docs/operations/v0.36-*.md`, `index.html`, `src/app.js`, `src/components.js`,
`src/locales/en-US.json`, `src/modules/inventory|procurement|production.js`,
`src/styles.css`, `test/postgres.integration.test.js`, `test/visual-baseline.json`,
`test/wave12-execution-hardening.test.js` — **22 file.** *(memuat komentar G5)*

## `7c0a29f` — feat(security): field encryption + key rotation (065)
`.env.example`, `backend/core/env.js`, `backend/core/field-encryption.js`,
repos `master-data/organization/runtime`, `data/migrations/065_*.sql` (+down),
`scripts/rotate-field-encryption.js`, `test/wave13-field-encryption.test.js`
— **10 file.**

## `15f1402` — fix(security): close G1-G6 authorization audit findings
`backend/api-postgres.js` (G1,G4), `backend/core/authorization-matrix.js` (G2),
`backend/core/openapi.js` (G6), `docs/security/endpoint-authorization-matrix.md`
(G3), `docs/security/security-model.md` (G3), `test/authorization-matrix.test.js`,
`test/p0-rls-tranche1.test.js` — **7 file.**

## `78d3873` — feat(security): field-encryption rotation npm scripts (065)
`package.json` (hunk scripts) — **1 file.**

## `132bb2e` — chore(release): reconcile release evidence, version, and tooling
`CHANGELOG.md`, `README.md`, `deploy/install-release.sh`,
`docs/audit/enterprise-blueprint-audit-2026-07-27.md`,
`docs/roadmap/master-update-backlog.md`, `docs/uat/ISSUE_REGISTER.json`,
`package-lock.json`, `package.json` (hunk versi), `scripts/build-release.js`,
`scripts/grant-runtime.js`, `scripts/load-lan.js`, `scripts/predeploy-gate.js`,
`scripts/run-isolated-uat-tests.js`, `scripts/run-uat-technical.js`,
`scripts/ui-smoke-cdp.js` — **15 file.**

## Traceability G1–G6
| Temuan | Commit | Berkas inti |
|---|---|---|
| G1 RLS re-seat + bukti live | `15f1402` (+`3edb463` DB) | `api-postgres.js`, `p0-rls-tranche1.test.js` |
| G2 handler accounting | `15f1402` | `authorization-matrix.js` + test |
| G3 doc reconciliation + drift-guard | `15f1402` | dua dokumen keamanan + test |
| G4 authz_denied logging | `15f1402` | `api-postgres.js` + test |
| G5 three-way match (read-only, disengaja) | `627aaa4` | `routes/procurement.js` |
| G6 public endpoint docs | `15f1402` | `openapi.js` |

*Commit tata kelola repo (`70786ea` AGENTS/CLAUDE) dan tooling agen + graph
(`e28005d`) tidak mengubah kode aplikasi.*
