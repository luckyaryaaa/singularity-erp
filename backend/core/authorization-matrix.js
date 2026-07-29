'use strict';

// Sprint 17 / R024 — daftar seluruh bounded HTTP router. Nilai handlers adalah
// baseline kontrak; penambahan endpoint wajib memperbarui matriks, permission,
// branch strategy, dan negative test evidence pada release yang sama.
// G2 — akuntansi handler LENGKAP: setiap handler wajib dijelaskan sebagai
// directGuards (assertPermission di router) + delegated (izin ditegakkan di
// repository) + public (auth.js: allowlist publik / self-service tanpa izin).
// Invariant `directGuards + delegated + public === handlers` diverifikasi di
// authorization-matrix.test.js, sehingga handler baru tanpa penjaga apa pun
// tidak bisa lolos diam-diam. Kolom `delegated` mengunci hasil audit manual
// (verifikasi handler-per-handler repo tier) menjadi kontrak yang ditegakkan CI.
const ROUTE_MATRIX = Object.freeze([
  { file:'auth.js', handlers:15, directGuards:0, delegated:0, public:15, strategy:'PUBLIC_OR_SESSION_SELF_SERVICE_MFA_RECOVERY', evidence:['test/api.test.js','test/postgres-auth.integration.test.js','test/postgres.http.test.js'] },
  { file:'workspace.js', handlers:7, directGuards:7, delegated:0, public:0, strategy:'PERMISSION_AND_USER_SCOPE_OWNERSHIP_VERSION_AND_IDEMPOTENCY', evidence:['test/api.test.js','test/wave20-work-items.test.js'] },
  { file:'documents.js', handlers:9, directGuards:9, delegated:0, public:0, strategy:'DYNAMIC_DOCUMENT_PERMISSION_AND_BRANCH', evidence:['test/api.test.js','test/branch-isolation.test.js'] },
  { file:'sales.js', handlers:27, directGuards:27, delegated:0, public:0, strategy:'PERMISSION_REPOSITORY_BRANCH_RLS_SOD_AND_IDEMPOTENCY', evidence:['test/sprint9-o2c.test.js','test/branch-isolation.test.js','test/wave5-sales-commercial.test.js','test/wave22-pricing-conditions.test.js'] },
  { file:'procurement.js', handlers:20, directGuards:2, delegated:18, public:0, strategy:'REPOSITORY_PERMISSION_RLS_BRANCH_SOD_VERSION_AND_IDEMPOTENCY', evidence:['test/sprint10-s2p.test.js','test/branch-isolation.test.js','test/wave8-purchase-contracts.test.js','test/wave12-execution-hardening.test.js'] },
  { file:'operations.js', handlers:14, directGuards:14, delegated:0, public:0, strategy:'PERMISSION_OWNERSHIP_AND_BRANCH', evidence:['test/postgres.http.test.js','test/r012-hardening.test.js','test/wave21-notification-preferences.test.js'] },
  { file:'masters.js', handlers:47, directGuards:30, delegated:17, public:0, strategy:'DYNAMIC_MASTER_PERMISSION_RLS_STAGING_AND_MAKER_CHECKER', evidence:['test/sprint8c-master-governance.test.js','test/sprint8c-wave2.test.js','test/wave3-business-partner-mdm.test.js'] },
  { file:'organization.js', handlers:30, directGuards:20, delegated:10, public:0, strategy:'REPOSITORY_SCOPE_VERSIONING_MAKER_CHECKER_OWNER_PIN_AND_MFA', evidence:['test/sprint7-organization-employee.test.js','test/sprint15-docs.test.js','test/wave4-organization-workforce.test.js'] },
  { file:'inventory.js', handlers:33, directGuards:8, delegated:25, public:0, strategy:'PERMISSION_RLS_CANONICAL_WAREHOUSE_MOBILITY_READSWITCH_VERSION_AND_IDEMPOTENCY', evidence:['test/sprint11-inventory-lots.test.js','test/wave6-stock-reservations.test.js','test/wave12-execution-hardening.test.js','test/wave18-warehouse-tasks.test.js','test/wave19-canonical-warehouse.test.js','test/wave24-warehouse-mobility.test.js','test/wave25-warehouse-read-switch.test.js'] },
  { file:'production.js', handlers:24, directGuards:14, delegated:10, public:0, strategy:'PERMISSION_RLS_WORK_ORDER_BRANCH_VERSION_SOD_AND_IDEMPOTENCY', evidence:['test/sprint12-production.test.js','test/wave9-capacity-wip.test.js','test/wave10-capa-calibration.test.js','test/wave12-execution-hardening.test.js'] },
  { file:'finance.js', handlers:40, directGuards:35, delegated:5, public:0, strategy:'PERMISSION_BRANCH_PIN_SOD_CODING_BLOCK_RECONCILIATION_EVIDENCE_AND_REPORT_SIGNOFF', evidence:['test/sprint13-finance.test.js','test/branch-isolation.test.js','test/wave16-tax-reconciliation.test.js','test/wave17-financial-report-signoff.test.js','test/finance-end-to-end-closure.test.js'] },
  { file:'hr.js', handlers:15, directGuards:15, delegated:0, public:0, strategy:'PERMISSION_BRANCH_AND_OWN_RECORD', evidence:['test/sprint14-hr.test.js','test/branch-isolation.test.js'] },
  { file:'reporting.js', handlers:9, directGuards:9, delegated:0, public:0, strategy:'PERMISSION_BRANCH_AND_FILTER_OWNERSHIP', evidence:['test/sprint16-reporting.test.js'] },
  { file:'governance.js', handlers:32, directGuards:32, delegated:0, public:0, strategy:'PERMISSION_SOD_PIN_MFA_PRIVILEGED_RESET_APPEND_ONLY_RETENTION_AND_OUTBOX_RECOVERY', evidence:['test/sprint6-governance.test.js','test/r012-hardening.test.js','test/sec-uat-001-password-reset.test.js','test/wave14-data-retention.test.js','test/wave23-domain-work-projection.test.js','test/postgres.http.test.js'] }
]);

const PUBLIC_ENDPOINTS = Object.freeze([
  'GET /api/live','GET /api/health','GET /api/openapi.json',
  'GET /api/system/events-catalog','GET /api/verify','GET /api/runtime',
  'POST /api/auth/login','POST /api/auth/mfa','POST /api/auth/change-password-required'
]);

module.exports = { ROUTE_MATRIX, PUBLIC_ENDPOINTS };
