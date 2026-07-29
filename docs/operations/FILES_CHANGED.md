# Files Changed — Konsolidasi v0.39.0

Riwayat pada branch `review/codex-claude-consolidation`. Setiap commit mandiri,
di-review, dan lulus scoped tests-nya (lihat [TEST_EVIDENCE.md](TEST_EVIDENCE.md)).

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
