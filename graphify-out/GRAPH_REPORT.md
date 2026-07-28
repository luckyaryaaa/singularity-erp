# Graph Report - .  (2026-07-27)

## Corpus Check
- Large corpus: 587 files · ~427,610 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 2714 nodes · 4563 edges · 176 communities (167 shown, 9 thin omitted)
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 768 edges (avg confidence: 0.56)
- Token cost: 425,176 input · 0 output

## Community Hubs (Navigation)
- Authentication, Session & MFA
- Production & MRP Execution
- Ops Scripts & DB Tooling
- Change-Request Governance
- Business Partner MDM
- Stock Reservations
- Architecture & Changelog Docs
- Operations SOPs
- Job Queue & Operations Repo
- Reporting & Cockpit
- Sessions, Events & Notifications
- Alerts & Backup Crypto
- Document Runtime & Approvals
- Document Rendering (PDF)
- HR & Reporting Routes
- Sales Commercial Controls
- API Dispatcher & Documents
- CSV Import & Job Worker
- Procurement Controls
- Tax Compliance (eFaktur)
- Master Data & Field Encryption
- Governance Policies & Reviews
- Organization Workforce
- Core Auth & MFA
- Business Ops & Payroll
- Seed, Boot & Approval Matrix
- Audit, Numbering & Store
- Governance Routes & Health
- Document Routes & Issuance
- DB Migrations
- Org Structure
- Data Retention & Legal Holds
- Postgres API Dispatcher
- Master Governance & FX Rates
- UI Components & Dialogs
- Permissions & Grants
- Organization Repo & Bank Secrets
- Privileged Password Reset
- Errors & Document Templates
- DB Transactions & RLS
- Request Context & IP Trust
- Private File Storage
- Frontend App Shell
- PDF Digital Signing
- HR Operations (Leave/Roster)
- uat-evidence.js
- repositories/inventory.js
- util.js
- core/documents.js
- authorization-matrix.test.js
- pool.js
- sprint17-final-audit.test.js
- master-wizards.js
- posting.js
- quality-capa.js
- artifact-storage.js
- postgres.integration.test.js
- accounting-config.js
- build-release.js
- ui-smoke-cdp.js
- sprint15-docs.test.js
- wave8-purchase-contracts.test.js
- fixed-assets.js
- routes/operations.js
- finance-reports.js
- purchase-contracts.js
- routes/organization.js
- Security Model MAT ERP V2
- predeploy-gate.js
- sprint12-production.test.js
- field-encryption.js
- routes/finance.js
- PostgreSQL Schema MAT ERP V2
- seed-postgres-uat.js
- core.js
- branch-isolation.test.js
- p0-three-way-match.test.js
- p1-fulfilment-lines.test.js
- wave11-perpetual-inventory.test.js
- wave9-capacity-wip.test.js
- sales-o2c.js
- selftest.js
- rotate-runtime-secrets.js
- p0-opname-scope.test.js
- postgres.http.test.js
- sprint8c-wave2.test.js
- wave4-organization-workforce.test.js
- hasGlobalScope
- capacity.js
- routes/auth.js
- masters.js
- Official Master Update Backlog
- accessibility-audit.js
- run-uat-technical.js
- sprint11-inventory-lots.test.js
- sprint14-hr.test.js
- sprint8c-master-governance.test.js
- doc-verification.js
- Collection
- smtp.js
- routes/inventory.js
- package.json
- load-lan.js
- start-lan-uat.js
- verify-release-artifact.js
- app.js
- p0-finance-enforcement.test.js
- p0-operations-gates.test.js
- p1-dashboard-read-model.test.js
- sec-uat-001-password-reset.test.js
- sprint10-s2p.test.js
- sprint13-finance.test.js
- wave12-execution-hardening.test.js
- wave7-bin-execution.test.js
- env.js
- bin-execution.js
- Privileged Reset Maker-Checker
- build-assets.js
- run-isolated-uat-tests.js
- p0-customer-po.test.js
- p0-iam-audit-hardening.test.js
- p0-rls-tranche1.test.js
- sprint16-reporting.test.js
- sprint9-o2c.test.js
- ratelimit.js
- totp.js
- postAccounting
- routes/production.js
- routes/workspace.js
- purge-business-data.js
- rotate-field-encryption.js
- secret-scan.js
- app.test.js
- p0-dashboard-entitlement.test.js
- p0-sales-pricing.test.js
- sprint13-posting-config.test.js
- sprint7-organization-employee.test.js
- wave13-field-encryption.test.js
- wave2-procurement.test.js
- persistence.js
- pdf-image.js
- rotate-owner-password.js
- modular-architecture.test.js
- official-document-governance.test.js
- p0-emergency-access.test.js
- visual-coverage.test.js
- dependencies
- cutover-opening.test.js
- mfa-login.js
- business-date.js
- Deployment & Rollback Runbook
- v0.36 Execution Control Workbenches
- generate-sbom.js
- provision-db.js
- p0-password-versioning.test.js
- postgres-auth.integration.test.js
- postgres-concurrency.integration.test.js
- document-types.js
- load-smoke.js
- seed-postgres-dev.js
- P0.5 Control Matrix
- seed-postgres-uat-sprint4.js
- verify-release-assets.js
- executive-reporting.js
- AGENTS.md — Graphify Agent Guide
- restore-config-seed.js
- my-work.js
- firewall.sh
- grant-runtime.js

## God Nodes (most connected - your core abstractions)
1. `camel()` - 117 edges
2. `assertPermission()` - 76 edges
3. `AppError` - 56 edges
4. `scripts` - 50 edges
5. `assertBranchAccess()` - 33 edges
6. `readBody()` - 30 edges
7. `nowIso()` - 26 edges
8. `hasGlobalScope()` - 23 edges
9. `verifyPassword()` - 23 edges
10. `queryScope()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `AGENTS.md — Graphify Agent Guide` --semantically_similar_to--> `CLAUDE.md — Graphify Project Instructions`  [INFERRED] [semantically similar]
  AGENTS.md → CLAUDE.md
- `index.html — App Shell` --references--> `MAT Brand Mark (Favicon)`  [EXTRACTED]
  index.html → favicon.svg
- `Sidebar Navigation` --conceptually_related_to--> `MAT Brand Mark (Favicon)`  [INFERRED]
  index.html → favicon.svg
- `createPayroll()` --indirect_call--> `raw()`  [INFERRED]
  backend/infrastructure/database/repositories/business-operations.js → test/p0-credit-exposure.test.js
- `validatePack()` --indirect_call--> `code()`  [INFERRED]
  scripts/uat-evidence.js → backend/infrastructure/database/repositories/org-workforce.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Single-Engine Modular Monolith** — docs_architecture_overview_modular_monolith, docs_architecture_overview_dispatcher, docs_architecture_overview_postgresql_source_of_truth, docs_architecture_overview_job_worker, docs_architecture_sprint_8b_enterprise_ux_no_match_dispatch [EXTRACTED 0.90]
- **Execution Control Workbenches (v0.36.0)** — changelog_inventory_reservation_workbench, changelog_purchase_contract_360, changelog_capacity_wip_control_tower, changelog_capa_calibration_workbench [EXTRACTED 0.90]
- **Go-Live Blocking Gates** — docs_audit_enterprise_blueprint_audit_2026_07_27_go_live_blocked, docs_audit_enterprise_blueprint_audit_2026_07_27_sec_uat_001, docs_audit_enterprise_blueprint_audit_2026_07_27_s0_03_rls_field_encryption, docs_baseline_security_exposure_baseline_field_encryption [EXTRACTED 0.85]
- **v0.36 Execution Control Defense-in-Depth** — docs_operations_v0_36_execution_control_workbenches_migration_064, docs_operations_v0_36_execution_control_workbenches_reservation_workbench, docs_operations_v0_36_execution_control_workbenches_purchase_contract_360, docs_operations_v0_36_execution_control_workbenches_capacity_wip, docs_operations_v0_36_execution_control_workbenches_capa_calibration [EXTRACTED 0.90]
- **Privileged Password Reset & MFA Recovery Flow** — docs_security_password_reset_policy_target_classification, docs_security_password_reset_policy_maker_checker_reset, docs_security_password_reset_policy_one_time_reset_link, docs_operations_v0_35_enterprise_execution_identity_mfa_recovery, docs_operations_v0_35_enterprise_execution_identity_migration_063 [EXTRACTED 0.85]
- **Immutable Versioned Snapshot Pattern** — docs_database_schema_approval_policy_snapshot, docs_database_schema_organization_identity_snapshot, docs_database_schema_official_document_signature, docs_operations_v0_33_organization_workforce_versioned_hierarchy [INFERRED 0.70]
- **Month-End Close Reconciliation Across Subledgers** — docs_sop_10_financial_close_reconciliation, docs_sop_11_inventory_opname_reconciliation, docs_sop_12_sales_o2c_collection_rma, docs_sop_13_procurement_s2p_payment, docs_sop_15_hr_payroll [INFERRED 0.85]
- **Incident, Backup, Disaster Recovery & Rollback Response** — docs_sop_06_incident_response, docs_sop_04_backup_restore, docs_sop_05_disaster_recovery, docs_sop_07_release_deployment_rollback [EXTRACTED 0.90]
- **Maker-Checker / SoD Control Pattern** — docs_sop_09_user_access_iam_maker_checker, docs_sop_13_procurement_s2p_payment, docs_sop_15_hr_payroll [INFERRED 0.85]

## Communities (176 total, 9 thin omitted)

### Community 0 - "Authentication, Session & MFA"
Cohesion: 0.06
Nodes (55): sessionResponse(), grantsFor(), ROLE_GRANTS, { AppError }, assertPasswordPolicy(), assertRecentMfa(), changeOwnPassword(), changePasswordWithToken() (+47 more)

### Community 1 - "Production & MRP Execution"
Cohesion: 0.06
Nodes (41): { AppError }, assertBranchScope(), assertReadyToComplete(), completeOperation(), convertMrp(), createIssueFromPlan(), finishWorkOrder(), getWo() (+33 more)

### Community 2 - "Ops Scripts & DB Tooling"
Cohesion: 0.04
Nodes (50): scripts, assets:build, backup:decrypt, backup:encrypt-local, backup:restore-test, backup:run, cutover:opening-inventory, data:purge (+42 more)

### Community 3 - "Change-Request Governance"
Cohesion: 0.05
Nodes (35): { AppError }, assertCanDecide(), assertValidChangeSet(), { camel }, CONTROLLED_FIELDS, controlledFor(), decide(), DECIDER_PERMISSION (+27 more)

### Community 4 - "Business Partner MDM"
Cohesion: 0.08
Nodes (36): { AppError }, clean(), create(), createRule(), detectDuplicates(), IMPORT_TYPES, importErrors(), list() (+28 more)

### Community 5 - "Stock Reservations"
Cohesion: 0.06
Nodes (30): { AppError }, availability(), consume(), expireStale(), listForDocument(), listForStock(), lock(), num() (+22 more)

### Community 6 - "Architecture & Changelog Docs"
Cohesion: 0.08
Nodes (42): CHANGELOG — MAT ERP V2, CAPA & Calibration Workbench, Capacity & WIP Control Tower, Inventory Reservation Workbench, Purchase Contract 360, API Endpoints Reference, OpenAPI 3.0.3 Spec + X-API-Version, Architecture Overview (+34 more)

### Community 7 - "Operations SOPs"
Cohesion: 0.09
Nodes (41): SOP-01 Daily Operations & Monitoring, Self Test Gate, SOP-02 Weekly Performance & Security Review, SOP-03 Monthly Platform Maintenance, SOP-04 Backup & Restore, Encrypted Offsite Backup, Restore Drill on Disposable DB, SHA-256 Checksum Verification (+33 more)

### Community 8 - "Job Queue & Operations Repo"
Cohesion: 0.07
Nodes (34): activeStatuses, {AppError}, authorizeJob(), {camel}, CATEGORIES, claim(), complete(), createMaster() (+26 more)

### Community 9 - "Reporting & Cockpit"
Cohesion: 0.07
Nodes (28): accountingConfig, { AppError }, assertReportAllowed(), BY_KEY, BY_TITLE, { camel }, cockpit(), createSchedule() (+20 more)

### Community 10 - "Sessions, Events & Notifications"
Cohesion: 0.08
Nodes (25): logout(), logoutAll(), resolveSession(), clients, CATEGORIES, events, listFor(), markAllRead() (+17 more)

### Community 11 - "Alerts & Backup Crypto"
Cohesion: 0.09
Nodes (26): lastSentAt, alerts, backupCrypto, cli(), {Client}, connection(), crypto, decrypt() (+18 more)

### Community 12 - "Document Runtime & Approvals"
Cohesion: 0.10
Nodes (30): { AppError }, APPROVAL_TIERS, approvalPolicy(), assertCustomerPoValid(), audit(), auditTrail(), businessDate, CONVERSIONS (+22 more)

### Community 13 - "Document Rendering (PDF)"
Cohesion: 0.12
Nodes (18): applySignature(), buildPdf(), { codeFor }, { decodeImage }, drawQr(), esc(), fmtDate(), hexToPdf() (+10 more)

### Community 14 - "HR & Reporting Routes"
Cohesion: 0.10
Nodes (25): readBody(), { assertPermission }, businessOps, dispatch(), hrOps, { NO_MATCH }, { readBody }, runtime (+17 more)

### Community 15 - "Sales Commercial Controls"
Cohesion: 0.10
Nodes (26): { AppError }, assertMarginRelease(), assessMargin(), availability(), backorders(), businessDate, calculateAvailability(), contracts() (+18 more)

### Community 16 - "API Dispatcher & Documents"
Cohesion: 0.08
Nodes (24): ACTION_PERMISSION, { AppError }, { assertPermission, grantsFor, approvalLevelsFor, APPROVAL_MATRIX }, audit, auth, documents, events, handle() (+16 more)

### Community 17 - "CSV Import & Job Worker"
Cohesion: 0.11
Nodes (25): {AppError}, parse(), heartbeat(), artifacts, auditPartitionMaintenance(), backup, businessDate, businessOps (+17 more)

### Community 18 - "Procurement Controls"
Cohesion: 0.16
Nodes (26): assertBranchAccess(), assertPermission(), addQuote(), { AppError }, { assertBranchAccess, hasGlobalScope, queryScope, resolveBranch }, assertBudgetOk(), assertCreditOk(), assertMatchOk() (+18 more)

### Community 19 - "Tax Compliance (eFaktur)"
Cohesion: 0.13
Nodes (21): spec(), { AppError }, businessDate, csvCell(), digitsOnly(), exportEFaktur(), formatFpNumber(), idr() (+13 more)

### Community 20 - "Master Data & Field Encryption"
Cohesion: 0.15
Nodes (26): hasPermission(), activateCostRevision(), { AppError }, approveSupplierBank(), { assertPermission, hasPermission }, canSeeBank(), canSeeSalary(), createSub() (+18 more)

### Community 21 - "Governance Policies & Reviews"
Cohesion: 0.14
Nodes (26): activatePolicy(), {AppError}, {camel}, completeReview(), createOverride(), createPolicy(), createReview(), decideAssignment() (+18 more)

### Community 22 - "Organization Workforce"
Cohesion: 0.15
Nodes (26): {AppError}, assertPositionParents(), assertScope(), businessDate, {camel}, captureVersion(), clean(), code() (+18 more)

### Community 23 - "Core Auth & MFA"
Cohesion: 0.12
Nodes (21): adminResetPassword(), { AppError }, assertPasswordPolicy(), audit, changeOwnPassword(), crypto, disableMfa(), { hashPassword, verifyPassword } (+13 more)

### Community 24 - "Business Ops & Payroll"
Cohesion: 0.13
Nodes (22): queryScope(), accountingConfig, accountingSummary(), allocatePayment(), {AppError}, {assertBranchAccess,hasGlobalScope,queryScope}, attendance(), closePeriod() (+14 more)

### Community 25 - "Seed, Boot & Approval Matrix"
Cohesion: 0.10
Nodes (23): pendingApprovalsFor(), APPROVAL_MATRIX, approvalLevelsFor(), { approvalLevelsFor }, hasDefaultCredentials(), { hashPassword }, numbering, seed() (+15 more)

### Community 26 - "Audit, Numbering & Store"
Cohesion: 0.09
Nodes (13): ACTIONS, REASON_REQUIRED, record(), { store }, { uid, nowIso }, PREFIXES, { store }, { clone } (+5 more)

### Community 27 - "Governance Routes & Health"
Cohesion: 0.09
Nodes (24): healthCheck(), stats(), alerts, apiMetrics, { AppError }, { assertPermission }, assurance, auth (+16 more)

### Community 28 - "Document Routes & Issuance"
Cohesion: 0.09
Nodes (24): { AppError }, { assertPermission }, businessOps, dispatch(), docRender, docTemplates, documentCore, docVerify (+16 more)

### Community 29 - "DB Migrations"
Cohesion: 0.13
Nodes (22): checksum(), crypto, DIR, ensureTable(), fs, { getPool }, migrationFiles(), path (+14 more)

### Community 30 - "Org Structure"
Cohesion: 0.12
Nodes (17): { AppError }, assertLegalEntityScope(), assertNotReferenced(), assertParents(), { camel }, create(), list(), NODES (+9 more)

### Community 31 - "Data Retention & Legal Holds"
Cohesion: 0.13
Nodes (22): { AppError }, { camel }, countCandidates(), createHold(), execute(), listHolds(), listPolicies(), listRuns() (+14 more)

### Community 32 - "Postgres API Dispatcher"
Cohesion: 0.11
Nodes (21): apiMetrics, { AppError }, auth, authRoutes, dispatch(), domainRoutes, events, { getPool } (+13 more)

### Community 33 - "Master Governance & FX Rates"
Cohesion: 0.11
Nodes (14): detail(), { AppError }, businessDate, calculateSupplierPerformance(), findRate(), MASTER_RULES, normalize(), qualityDashboard() (+6 more)

### Community 34 - "UI Components & Dialogs"
Cohesion: 0.13
Nodes (17): actionButtonsFor(), actionDialog(), closeLayers(), conversionButtonFor(), formDialog(), openDrawer(), rememberLayerFocus(), runDocAction() (+9 more)

### Community 35 - "Permissions & Grants"
Cohesion: 0.12
Nodes (19): ACTIONS, { AppError }, APPROVAL_LEVEL_BY_ROLE, assertBranchScope(), delegatedGrantFor(), effectiveGrants(), emergencyGrantFor(), emergencyScopeMatches() (+11 more)

### Community 36 - "Organization Repo & Bank Secrets"
Cohesion: 0.16
Nodes (20): { AppError }, { assertPermission, hasPermission }, ASSET_SLOTS, canSeeBank(), createResource(), decideBank(), decryptBank(), documentAssets() (+12 more)

### Community 37 - "Privileged Password Reset"
Cohesion: 0.21
Nodes (21): { AppError }, approveRequest(), assertOwner(), classify(), classifyActor(), decide(), effectiveRoles(), evaluate() (+13 more)

### Community 38 - "Errors & Document Templates"
Cohesion: 0.10
Nodes (13): AppError, CATALOG, { AppError }, businessDate, FALLBACK, { randomUUID }, { AppError }, { assertPermission } (+5 more)

### Community 39 - "DB Transactions & RLS"
Cohesion: 0.12
Nodes (18): CROSS_BRANCH_ROLES, { CROSS_BRANCH_ROLES }, { getPool }, setRlsContext(), setSessionTimezone(), { TIMEZONE }, withSerializableRetry(), withTransaction() (+10 more)

### Community 40 - "Request Context & IP Trust"
Cohesion: 0.14
Nodes (19): cleanIp(), firstHeader(), ipv4Number(), matches(), net, requestContext(), trusted(), assert (+11 more)

### Community 41 - "Private File Storage"
Cohesion: 0.14
Nodes (20): absolute(), { AppError }, archiveSafe(), { camel }, download(), { execFile }, fs, { hasGlobalScope } (+12 more)

### Community 42 - "Frontend App Shell"
Cohesion: 0.11
Nodes (21): MAT Brand Mark (Favicon), src/app.js Entrypoint, App Shell Root, Command Palette Dialog, src/components.js, src/core.js, src/design-system/tokens.css, index.html — App Shell (+13 more)

### Community 43 - "PDF Digital Signing"
Cohesion: 0.22
Nodes (17): algId(), buildCms(), children(), config(), { createSign, createHash, X509Certificate }, ctx(), derLen(), isConfigured() (+9 more)

### Community 44 - "HR Operations (Leave/Roster)"
Cohesion: 0.17
Nodes (19): activeLeavePolicy(), { AppError }, { assertBranchAccess, hasGlobalScope, queryScope, resolveBranch }, assertLeaveOk(), assignRoster(), countWorkingDays(), d2(), decideCorrection() (+11 more)

### Community 45 - "uat-evidence.js"
Cohesion: 0.13
Nodes (17): FINAL_FILES, fs, loadPack(), path, present(), readJson(), REQUIRED_RECONCILIATIONS, REQUIRED_ROLES (+9 more)

### Community 46 - "repositories/inventory.js"
Cohesion: 0.17
Nodes (15): { AppError }, camelLot(), consumeLots(), createOpname(), listLots(), lotDetail(), lotMovement(), normalizeOpnameScope() (+7 more)

### Community 47 - "util.js"
Cohesion: 0.22
Nodes (16): changePasswordWithToken(), completeMfa(), createPending(), createSession(), findPending(), login(), publicUser(), lookup() (+8 more)

### Community 48 - "core/documents.js"
Cohesion: 0.16
Nodes (17): ACTION_AUDIT, { AppError }, { approvalLevelsFor }, audit, create(), eventOf(), events, moduleOf() (+9 more)

### Community 49 - "authorization-matrix.test.js"
Cohesion: 0.13
Nodes (13): PUBLIC_ENDPOINTS, ROUTE_MATRIX, ENDPOINTS, EVENTS, assert, fs, {hasPermission}, openapi (+5 more)

### Community 50 - "pool.js"
Cohesion: 0.13
Nodes (12): dispatchBatch(), events, { getPool }, start(), config(), intEnv(), { Pool }, assert (+4 more)

### Community 51 - "sprint17-final-audit.test.js"
Cohesion: 0.15
Nodes (13): accountingConfig, checks(), collect(), evaluate(), money(), status(), assert, assurance (+5 more)

### Community 52 - "master-wizards.js"
Cohesion: 0.14
Nodes (15): abandon(), { AppError }, { assertPermission }, finalize(), listSources(), masterData, operations, { randomUUID } (+7 more)

### Community 53 - "posting.js"
Cohesion: 0.15
Nodes (13): accountingConfig, {AppError}, assertFulfilmentWithinOrder(), balance(), lineSubtotalOf(), movementValue(), normalizeLines(), PERPETUAL_TRIGGER (+5 more)

### Community 54 - "quality-capa.js"
Cohesion: 0.15
Nodes (15): advanceCase(), { AppError }, businessDate, FLOW, getCase(), listCases(), listInstruments(), nextCaseNumber() (+7 more)

### Community 55 - "artifact-storage.js"
Cohesion: 0.16
Nodes (16): absolute(), {AppError}, businessDate, {camel}, create(), download(), excelBuffer(), fs (+8 more)

### Community 56 - "postgres.integration.test.js"
Cohesion: 0.12
Nodes (16): artifactStorage, assert, businessOps, { Client }, fs, { hashPassword }, { hasPermission }, operations (+8 more)

### Community 57 - "accounting-config.js"
Cohesion: 0.20
Nodes (10): accountCode(), accountCodes(), { AppError }, asDate(), businessDate, cacheGet(), cacheSet(), configCache (+2 more)

### Community 58 - "build-release.js"
Cohesion: 0.14
Nodes (14): allFiles(), allow, build(), copy(), crypto, denyNames, {fingerprintRelease}, fs (+6 more)

### Community 59 - "ui-smoke-cdp.js"
Cohesion: 0.15
Nodes (15): baselineFile, { Client }, { currentTotp }, dbMode, delay(), { DEMO_PASSWORD }, fs, os (+7 more)

### Community 60 - "sprint15-docs.test.js"
Cohesion: 0.12
Nodes (12): artifacts, assert, { decodeImage }, docVerify, oneLine, openapi, pdfSign, render (+4 more)

### Community 61 - "wave8-purchase-contracts.test.js"
Cohesion: 0.17
Nodes (12): activeContract(), assert, { Client }, contracts, plusDays(), product(), { randomUUID }, runtime (+4 more)

### Community 62 - "fixed-assets.js"
Cohesion: 0.25
Nodes (13): resolveBranch(), { AppError }, { assertBranchAccess, queryScope, resolveBranch }, createAsset(), disposeAsset(), getCategory(), idr(), listAssets() (+5 more)

### Community 63 - "routes/operations.js"
Cohesion: 0.15
Nodes (14): MODULES, readRawBody(), { AppError }, artifactStorage, { assertPermission, MODULES }, dispatch(), documentCore, { NO_MATCH } (+6 more)

### Community 64 - "finance-reports.js"
Cohesion: 0.21
Nodes (13): accountingConfig, { AppError }, assertPeriod(), closingCockpit(), financialStatements(), { hasGlobalScope, queryScope }, idr(), postInventoryOpeningBalance() (+5 more)

### Community 65 - "purchase-contracts.js"
Cohesion: 0.18
Nodes (13): { AppError }, businessDate, contractDetail(), createContract(), decideContract(), getContract(), listContracts(), nextContractNumber() (+5 more)

### Community 66 - "routes/organization.js"
Cohesion: 0.15
Nodes (14): { AppError }, { assertPermission }, dispatch(), docRender, docTemplates, { NO_MATCH }, organization, orgPreviewSnapshot() (+6 more)

### Community 67 - "Security Model MAT ERP V2"
Cohesion: 0.16
Nodes (15): Immutable Approval Policy Snapshot, Append-only Audit, v0.32 Unified Business Partner MDM, Business Partner Golden Record, v0.34 Sales Commercial Controls, ATP/CTP Line Promise, Customer Contract/Blanket Release, Server-side Margin Assessment (+7 more)

### Community 68 - "predeploy-gate.js"
Cohesion: 0.20
Nodes (13): path, probeHealth(), results, ROOT, runSync(), {spawnSync,spawn}, STAGE, step() (+5 more)

### Community 69 - "sprint12-production.test.js"
Cohesion: 0.14
Nodes (11): assert, { Client }, code(), { hasPermission }, inventory, posting, product(), production (+3 more)

### Community 70 - "field-encryption.js"
Cohesion: 0.29
Nodes (12): blindIndex(), configuration(), context(), crypto, decrypt(), derive(), encrypt(), keyIdOf() (+4 more)

### Community 71 - "routes/finance.js"
Cohesion: 0.14
Nodes (13): accountingConfig, { AppError }, { assertPermission }, businessDate, businessOps, dispatch(), financeReports, fixedAssets (+5 more)

### Community 72 - "PostgreSQL Schema MAT ERP V2"
Cohesion: 0.19
Nodes (14): PostgreSQL Schema MAT ERP V2, Branch-aware Document Numbering, Domain Event Outbox, Executive Cockpit KPI (mv_executive_monthly_kpis), Official Document HMAC Signature, Optimistic Locking (version to HTTP 409), Organization Identity Snapshot, mat_erp_app Runtime Least-Privilege (+6 more)

### Community 73 - "seed-postgres-uat.js"
Cohesion: 0.14
Nodes (12): {assertDedicatedUatDatabase}, {Client}, customers, env, {hashPassword}, operations, posting, products (+4 more)

### Community 74 - "core.js"
Cohesion: 0.22
Nodes (9): api(), can(), current(), invalidate(), refreshBadge(), render(), sessionLost(), startSse() (+1 more)

### Community 75 - "branch-isolation.test.js"
Cohesion: 0.14
Nodes (12): assert, assets, businessOps, { Client }, dataScope, financeReports, hr, procurement (+4 more)

### Community 76 - "p0-three-way-match.test.js"
Cohesion: 0.14
Nodes (6): assert, { Client }, procurement, { randomUUID }, runtime, test

### Community 77 - "p1-fulfilment-lines.test.js"
Cohesion: 0.14
Nodes (6): assert, { Client }, posting, { randomUUID }, runtime, test

### Community 78 - "wave11-perpetual-inventory.test.js"
Cohesion: 0.15
Nodes (8): assert, { Client }, posting, product(), { randomUUID }, runtime, tag(), test

### Community 79 - "wave9-capacity-wip.test.js"
Cohesion: 0.15
Nodes (9): assert, businessDate, capacity, { Client }, { randomUUID }, runtime, tag(), test (+1 more)

### Community 80 - "sales-o2c.js"
Cohesion: 0.22
Nodes (12): activePolicies(), { AppError }, { assertBranchAccess, queryScope }, businessDate, createRma(), idr(), listQuotationRevisions(), postRma() (+4 more)

### Community 81 - "selftest.js"
Cohesion: 0.17
Nodes (12): paginate(), documents, events, fs, { grantsFor, ROLE_GRANTS, hasPermission }, idempotency, numbering, path (+4 more)

### Community 82 - "rotate-runtime-secrets.js"
Cohesion: 0.15
Nodes (9): {Client}, env, envPath, fs, {hashPassword}, original, path, {randomBytes,randomUUID} (+1 more)

### Community 83 - "p0-opname-scope.test.js"
Cohesion: 0.15
Nodes (7): assert, { Client }, inv, posting, { randomUUID }, runtime, test

### Community 84 - "postgres.http.test.js"
Cohesion: 0.18
Nodes (11): assert, {Client}, delay(), {hashPassword}, {loginHttp}, {randomUUID}, {spawn}, stop() (+3 more)

### Community 85 - "sprint8c-wave2.test.js"
Cohesion: 0.15
Nodes (9): assert, {Client}, governance, masterData, operations, {randomUUID}, runtime, test (+1 more)

### Community 86 - "wave4-organization-workforce.test.js"
Cohesion: 0.15
Nodes (9): assert, auth, {Client}, fs, path, permissions, {randomUUID}, test (+1 more)

### Community 87 - "hasGlobalScope"
Cohesion: 0.20
Nodes (11): { AppError }, canAccessBranch(), hasGlobalScope(), SCOPES, snapshot(), listCorrections(), upsertHoliday(), listSchedules() (+3 more)

### Community 88 - "capacity.js"
Cohesion: 0.21
Nodes (8): { AppError }, businessDate, loadOn(), operationWithScope(), permissions, recordActualHours(), runtime, scheduleOperation()

### Community 89 - "routes/auth.js"
Cohesion: 0.20
Nodes (11): { AppError }, auth, authResult(), dispatchPublic(), docVerify, { grantsFor }, { NO_MATCH }, operations (+3 more)

### Community 90 - "masters.js"
Cohesion: 0.17
Nodes (11): { assertPermission }, businessPartners, changeRequests, masterData, masterGovernance, masterModules, masterWizards, { NO_MATCH } (+3 more)

### Community 91 - "Official Master Update Backlog"
Cohesion: 0.23
Nodes (12): Sprint 17 Final Audit & Assurance Evidence, Opening Inventory Reconciliation Warning, v0.31 LAN-UAT Technical Readiness, FINAL_SIGNOFF.json Gate, LAN-UAT Staff Database (mat_erp_v2_lan_uat), v0.33 Organization & Workforce, Scoped Authority Delegation, Versioned Org Hierarchy Snapshot (+4 more)

### Community 92 - "accessibility-audit.js"
Cohesion: 0.17
Nodes (10): checks, components, core, css, failed, fs, html, path (+2 more)

### Community 93 - "run-uat-technical.js"
Cohesion: 0.20
Nodes (9): { assertDedicatedUatDatabase }, childEnv, path, ROOT, { spawnSync }, steps, target, assertDedicatedUatDatabase() (+1 more)

### Community 94 - "sprint11-inventory-lots.test.js"
Cohesion: 0.17
Nodes (7): assert, { Client }, inv, posting, { randomUUID }, runtime, test

### Community 95 - "sprint14-hr.test.js"
Cohesion: 0.17
Nodes (8): assert, businessOps, { Client }, hr, period, { randomUUID }, runtime, test

### Community 96 - "sprint8c-master-governance.test.js"
Cohesion: 0.17
Nodes (8): assert, {Client}, governance, masterData, operations, {randomUUID}, runtime, test

### Community 97 - "doc-verification.js"
Cohesion: 0.35
Nodes (10): canonical(), codeFor(), compact(), constantEqual(), { createHmac, timingSafeEqual }, keyId(), secret(), signPayload() (+2 more)

### Community 99 - "smtp.js"
Cohesion: 0.29
Nodes (10): buildMessage(), config(), isConfigured(), net, { randomBytes }, safeHeader(), send(), talk() (+2 more)

### Community 100 - "routes/inventory.js"
Cohesion: 0.18
Nodes (10): { AppError }, { assertPermission }, binExecution, dispatch(), inventoryLots, { NO_MATCH }, operations, { readBody } (+2 more)

### Community 101 - "package.json"
Cohesion: 0.18
Nodes (10): @fontsource-variable/manrope, @fontsource-variable/plus-jakarta-sans, devDependencies, @fontsource-variable/manrope, @fontsource-variable/plus-jakarta-sans, engines, node, name (+2 more)

### Community 102 - "load-lan.js"
Cohesion: 0.20
Nodes (10): {Client}, {loginHttp}, main(), path, percentile(), {randomUUID}, ROOT, {spawn} (+2 more)

### Community 103 - "start-lan-uat.js"
Cohesion: 0.18
Nodes (9): { assertDedicatedUatDatabase }, check, child, ips, os, path, { spawn }, target (+1 more)

### Community 104 - "verify-release-artifact.js"
Cohesion: 0.24
Nodes (10): crypto, FORBIDDEN_DIRS, fs, isForbiddenEnv(), path, { patterns }, ROOT, TARGET (+2 more)

### Community 105 - "app.js"
Cohesion: 0.25
Nodes (6): applySession(), markActiveNav(), openCommand(), renderCommand(), renderNav(), updateBadge()

### Community 106 - "p0-finance-enforcement.test.js"
Cohesion: 0.18
Nodes (8): accountingConfig, assert, businessOps, { Client }, financeReports, { randomUUID }, runtime, test

### Community 107 - "p0-operations-gates.test.js"
Cohesion: 0.18
Nodes (7): assert, { Client }, o2c, production, { randomUUID }, runtime, test

### Community 108 - "p1-dashboard-read-model.test.js"
Cohesion: 0.18
Nodes (5): assert, { Client }, { randomUUID }, test, workspace

### Community 109 - "sec-uat-001-password-reset.test.js"
Cohesion: 0.18
Nodes (7): assert, auth, { Client }, policy, { randomUUID }, test, { verifyPassword }

### Community 110 - "sprint10-s2p.test.js"
Cohesion: 0.18
Nodes (8): assert, businessOps, { Client }, posting, procurement, { randomUUID }, runtime, test

### Community 111 - "sprint13-finance.test.js"
Cohesion: 0.18
Nodes (8): assert, { Client }, fa, period, { randomUUID }, reports, runtime, test

### Community 112 - "wave12-execution-hardening.test.js"
Cohesion: 0.18
Nodes (8): assert, businessDate, { Client }, contracts, { randomUUID }, RLS_TABLES, runtime, test

### Community 113 - "wave7-bin-execution.test.js"
Cohesion: 0.22
Nodes (8): assert, bins, { Client }, makeBin(), makeLot(), { randomUUID }, tag(), test

### Community 114 - "env.js"
Cohesion: 0.31
Nodes (8): assertEnvironment(), assertSeedAllowed(), environmentName(), ENVIRONMENTS, fs, path, validateEnvironment(), weak()

### Community 115 - "bin-execution.js"
Cohesion: 0.31
Nodes (8): { AppError }, binContents(), getLot(), locateProduct(), num(), permissions, putaway(), resolveBin()

### Community 116 - "Privileged Reset Maker-Checker"
Cohesion: 0.38
Nodes (10): v0.35 Enterprise Execution & Identity Controls, MFA Recovery Codes (one-time), Migration 063 Reset & MFA Recovery, Password Reset Policy, Privileged Reset Maker-Checker, One-time Reset Link, Reset Target Classification (OWNER/PRIVILEGED_ADMIN/STANDARD_USER), Security Incident SEC-UAT-001 (+2 more)

### Community 117 - "build-assets.js"
Cohesion: 0.31
Nodes (9): COMPRESSIBLE, crypto, digest(), fingerprintRelease(), fs, path, safeAssetName(), writeCompressed() (+1 more)

### Community 118 - "run-isolated-uat-tests.js"
Cohesion: 0.20
Nodes (6): { assertDedicatedUatDatabase }, childEnv, { Client }, path, ROOT, { spawnSync }

### Community 119 - "p0-customer-po.test.js"
Cohesion: 0.20
Nodes (5): assert, { Client }, { randomUUID }, runtime, test

### Community 120 - "p0-iam-audit-hardening.test.js"
Cohesion: 0.20
Nodes (7): assert, auth, { Client }, operations, { randomUUID }, runtime, test

### Community 121 - "p0-rls-tranche1.test.js"
Cohesion: 0.20
Nodes (5): assert, { Client }, { randomUUID }, RLS_TABLES, test

### Community 122 - "sprint16-reporting.test.js"
Cohesion: 0.20
Nodes (7): assert, {Client}, fs, path, reporting, test, worker

### Community 123 - "sprint9-o2c.test.js"
Cohesion: 0.20
Nodes (7): assert, { Client }, o2c, posting, { randomUUID }, runtime, test

### Community 124 - "ratelimit.js"
Cohesion: 0.22
Nodes (3): { AppError }, buckets, POLICIES

### Community 125 - "totp.js"
Cohesion: 0.31
Nodes (7): base32Decode(), base32Encode(), crypto, generateSecret(), hotp(), verify(), RFC-6238

### Community 126 - "postAccounting"
Cohesion: 0.56
Nodes (9): accountMap(), claimPosting(), ensureOpenPeriod(), finishPosting(), postAccounting(), postFromProfile(), postManualJournal(), postPayroll() (+1 more)

### Community 127 - "routes/production.js"
Cohesion: 0.22
Nodes (8): { AppError }, { assertPermission }, capacity, { NO_MATCH }, production, qualityCapa, { readBody }, runtime

### Community 128 - "routes/workspace.js"
Cohesion: 0.28
Nodes (8): accountingConfig, { assertPermission, hasPermission }, cashOnHand(), dashboard(), DASHBOARD_CARDS, entitlementsFor(), { NO_MATCH }, runtime

### Community 129 - "purge-business-data.js"
Cohesion: 0.28
Nodes (8): ALWAYS_CLEAR, { Client }, { environmentName }, fs, KEEP, path, purgeOrder(), sortByDependency()

### Community 130 - "rotate-field-encryption.js"
Cohesion: 0.25
Nodes (7): APPLY, BANKS, { Client }, fields, NOTES, plaintext(), rotate()

### Community 131 - "secret-scan.js"
Cohesion: 0.28
Nodes (8): excluded, files(), fs, ignored(), path, patterns, ROOT, scan()

### Community 132 - "app.test.js"
Cohesion: 0.22
Nodes (8): assert, { fingerprintRelease }, fs, os, { paginate }, path, server, test

### Community 133 - "p0-dashboard-entitlement.test.js"
Cohesion: 0.22
Nodes (5): assert, { Client }, { randomUUID }, test, workspace

### Community 134 - "p0-sales-pricing.test.js"
Cohesion: 0.22
Nodes (6): assert, { Client }, posting, { randomUUID }, runtime, test

### Community 135 - "sprint13-posting-config.test.js"
Cohesion: 0.22
Nodes (6): assert, { Client }, config, posting, runtime, test

### Community 136 - "sprint7-organization-employee.test.js"
Cohesion: 0.22
Nodes (8): assert, auth, {hasPermission}, masterData, organization, {randomUUID}, runtime, test

### Community 137 - "wave13-field-encryption.test.js"
Cohesion: 0.22
Nodes (7): assert, { Client }, encryption, masterData, organization, { randomUUID }, test

### Community 138 - "wave2-procurement.test.js"
Cohesion: 0.22
Nodes (6): assert, { Client }, procurement, { randomUUID }, runtime, test

### Community 139 - "persistence.js"
Cohesion: 0.32
Nodes (6): flush(), fs, init(), markDirty(), path, state

### Community 140 - "pdf-image.js"
Cohesion: 0.39
Nodes (7): decodeImage(), decodeJpeg(), decodePng(), paeth(), PNG_SIG, unfilter(), { unzlibSync, zlibSync }

### Community 141 - "rotate-owner-password.js"
Cohesion: 0.25
Nodes (7): {Client}, envPath, fs, {hashPassword}, original, path, {randomBytes,randomUUID}

### Community 142 - "modular-architecture.test.js"
Cohesion: 0.29
Nodes (7): assert, fs, lineCount(), path, read(), root, test

### Community 143 - "official-document-governance.test.js"
Cohesion: 0.25
Nodes (7): assert, { Client }, documentsRoute, docVerify, { randomUUID }, runtime, test

### Community 144 - "p0-emergency-access.test.js"
Cohesion: 0.25
Nodes (6): assert, auth, { Client }, permissions, { randomUUID }, test

### Community 145 - "visual-coverage.test.js"
Cohesion: 0.25
Nodes (7): assert, baseline, fs, path, root, smoke, test

### Community 146 - "dependencies"
Cohesion: 0.29
Nodes (7): fflate, dependencies, fflate, pg, qrcode, pg, qrcode

### Community 147 - "cutover-opening.test.js"
Cohesion: 0.29
Nodes (6): assert, { Client }, financeReports, { randomUUID }, runtime, test

### Community 148 - "mfa-login.js"
Cohesion: 0.43
Nodes (6): cipherKey(), crypto, currentTotp(), decryptSecret(), loginHttp(), totp

### Community 149 - "business-date.js"
Cohesion: 0.53
Nodes (5): addDays(), formatter, periodOf(), toBusinessDate(), today()

### Community 150 - "Deployment & Rollback Runbook"
Cohesion: 0.40
Nodes (4): install-release.sh script, rollback-release.sh script, Deployment & Rollback Runbook, Health/Liveness Check (/api/health, /api/live)

### Community 151 - "v0.36 Execution Control Workbenches"
Cohesion: 0.53
Nodes (6): v0.36 Execution Control Workbenches, CAPA & Calibration Workbench, Capacity & WIP Control Tower, Migration 064 Execution RLS/Concurrency, Purchase Contract 360, Inventory Reservation Workbench

### Community 152 - "generate-sbom.js"
Cohesion: 0.33
Nodes (4): crypto, fs, path, ROOT

### Community 154 - "p0-password-versioning.test.js"
Cohesion: 0.33
Nodes (4): assert, crypto, password, test

### Community 155 - "postgres-auth.integration.test.js"
Cohesion: 0.33
Nodes (5): assert, auth, {Client}, {currentTotp}, test

### Community 156 - "postgres-concurrency.integration.test.js"
Cohesion: 0.33
Nodes (5): assert, { Client }, { randomUUID }, runtime, test

### Community 158 - "load-smoke.js"
Cohesion: 0.40
Nodes (3): path, ROOT, { spawn }

### Community 159 - "seed-postgres-dev.js"
Cohesion: 0.40
Nodes (4): {Client}, env, {hashPassword}, {randomUUID}

### Community 161 - "P0.5 Control Matrix"
Cohesion: 0.67
Nodes (4): Idempotency + Advisory Lock, v0.30 P0.5 Transaction Correctness Closure, P0.5 Control Matrix, Migration 050 Transaction Correctness

### Community 162 - "seed-postgres-uat-sprint4.js"
Cohesion: 0.50
Nodes (3): {Client}, env, operations

### Community 166 - "AGENTS.md — Graphify Agent Guide"
Cohesion: 1.00
Nodes (3): AGENTS.md — Graphify Agent Guide, Graphify Knowledge Graph, CLAUDE.md — Graphify Project Instructions

## Knowledge Gaps
- **1221 isolated node(s):** `{ randomUUID }`, `{ parseCookies }`, `{ AppError }`, `{ getPool }`, `{ withTransaction, setRlsContext }` (+1216 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppError` connect `Errors & Document Templates` to `Authentication, Session & MFA`, `Production & MRP Execution`, `Change-Request Governance`, `Business Partner MDM`, `Stock Reservations`, `Job Queue & Operations Repo`, `Reporting & Cockpit`, `Sessions, Events & Notifications`, `Document Runtime & Approvals`, `Sales Commercial Controls`, `API Dispatcher & Documents`, `CSV Import & Job Worker`, `Procurement Controls`, `Tax Compliance (eFaktur)`, `Master Data & Field Encryption`, `Governance Policies & Reviews`, `Organization Workforce`, `Core Auth & MFA`, `Business Ops & Payroll`, `Governance Routes & Health`, `Document Routes & Issuance`, `Org Structure`, `Data Retention & Legal Holds`, `Postgres API Dispatcher`, `Master Governance & FX Rates`, `Permissions & Grants`, `Organization Repo & Bank Secrets`, `Privileged Password Reset`, `Private File Storage`, `HR Operations (Leave/Roster)`, `repositories/inventory.js`, `core/documents.js`, `master-wizards.js`, `posting.js`, `quality-capa.js`, `artifact-storage.js`, `accounting-config.js`, `fixed-assets.js`, `routes/operations.js`, `finance-reports.js`, `purchase-contracts.js`, `routes/organization.js`, `routes/finance.js`, `sales-o2c.js`, `hasGlobalScope`, `capacity.js`, `routes/auth.js`, `routes/inventory.js`, `bin-execution.js`, `ratelimit.js`, `routes/production.js`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._
- **Why does `camel()` connect `Governance Policies & Reviews` to `purchase-contracts.js`, `Change-Request Governance`, `Job Queue & Operations Repo`, `Reporting & Cockpit`, `Private File Storage`, `Document Runtime & Approvals`, `Sales Commercial Controls`, `artifact-storage.js`, `Organization Workforce`, `quality-capa.js`, `hasGlobalScope`, `Org Structure`, `Data Retention & Legal Holds`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `Endpoint Authorization Matrix` connect `Security Model MAT ERP V2` to `Postgres API Dispatcher`, `authorization-matrix.test.js`, `Official Master Update Backlog`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Are the 36 inferred relationships involving `camel()` (e.g. with `list()` and `listAssignments()`) actually correct?**
  _`camel()` has 36 INFERRED edges - model-reasoned connections that need verification._
- **What connects `{ randomUUID }`, `{ parseCookies }`, `{ AppError }` to the rest of the system?**
  _1221 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Authentication, Session & MFA` be split into smaller, more focused modules?**
  _Cohesion score 0.05827505827505827 - nodes in this community are weakly interconnected._
- **Should `Production & MRP Execution` be split into smaller, more focused modules?**
  _Cohesion score 0.0632996632996633 - nodes in this community are weakly interconnected._