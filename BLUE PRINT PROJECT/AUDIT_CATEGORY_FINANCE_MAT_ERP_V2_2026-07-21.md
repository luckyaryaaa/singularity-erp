# AUDIT CATEGORY FINANCE — MAT ERP V2

**Audit date:** 2026-07-21  
**Application version:** 0.28.1  
**Scope:** Finance menu, accounting engine, AR/AP, cash and bank, fixed assets, budget, tax, financial reporting, closing, architecture, infrastructure, security, and UI/UX.

---

## 1. Executive Verdict

MAT ERP V2 already has a strong accounting foundation for a custom ERP: double-entry journals, configuration-driven posting profiles, period locks, AR/AP reconciliation, bank import and reconciliation, payment reversal, fixed-asset depreciation, tax compliance, audit trail, idempotency on several critical processes, and closing cockpit.

However, it is **not yet equivalent to SAP S/4HANA Finance, Oracle Fusion Cloud Financials, or Dynamics 365 Finance**. The largest gap is not merely additional screens; it is the absence of a complete finance control model covering ledger/legal-entity scope, full subledger lifecycle, cash management, enterprise budgeting, multi-book assets, configurable financial statements, reconciliation governance, and stricter segregation of duties.

### Current assessment

| Area | Current score | Target after upgrade |
|---|---:|---:|
| Finance menu and functional coverage | 72/100 | 95/100 |
| General ledger and posting engine | 81/100 | 96/100 |
| Accounts receivable | 76/100 | 95/100 |
| Accounts payable | 73/100 | 95/100 |
| Cash and bank management | 61/100 | 94/100 |
| Fixed assets | 64/100 | 94/100 |
| Budgeting and FP&A | 45/100 | 92/100 |
| Tax and local compliance | 79/100 | 95/100 |
| Financial reporting and close | 70/100 | 96/100 |
| Architecture and database governance | 74/100 | 95/100 |
| Security and SoD | 73/100 | 96/100 |
| Infrastructure and release hygiene | 67/100 | 97/100 |
| **Overall enterprise readiness** | **71/100** | **95–97/100** |

> Score is an engineering gap assessment, not vendor certification.

---

## 2. Current Finance Menu

Current sidebar category:

```text
FINANCE
├── Invoice
├── Collection & Dunning
├── Payments
├── Supplier Invoices
├── Expenses
├── Fixed Assets
├── Accounting
├── Financial Statements
├── Closing Cockpit
└── Tax
```

Related finance functions are scattered outside the category:

```text
OPERATIONS / PROCUREMENT
├── Payment Proposals
└── Procurement Budgets

ORGANIZATION / SETTINGS
├── Company Bank Accounts
├── Account Roles
├── Tax Rates
└── Currency & Exchange Rates (Master Data Governance)
```

This is usable but not yet an integrated Finance Control Center.

---

## 3. What Is Already Strong

### 3.1 Double-entry and configuration-driven posting

Implemented in:

- `backend/infrastructure/database/repositories/posting.js`
- `data/migrations/019_posting_profiles_payroll_rules.sql`
- `backend/infrastructure/database/repositories/accounting-config.js`

Strengths:

- Posting profiles are effective-dated and versioned.
- Account mappings can vary by legal entity and branch.
- Posting is idempotently claimed through `document_postings`.
- Journal balance is validated before completion.
- Posting profile snapshots are stored on documents.
- Closed periods reject new postings.

### 3.2 Multi-currency foundation

Implemented in migration `023_enterprise_master_data_finalization.sql`:

- Transaction currency.
- Functional currency.
- Reporting currency.
- Effective-dated exchange rates.
- Functional and reporting amount snapshots.
- Currency source and rate-date snapshots.

This is a strong foundation, although revaluation, translation, and realized/unrealized foreign-exchange accounting are still missing.

### 3.3 Accounting dimensions

Available fields:

- Legal entity.
- Department.
- Cost center.
- Profit center.
- Project WBS.

Dimension snapshots are stored on the document. The foundation is good, but dimensions remain header-level and validation is incomplete.

### 3.4 AR/AP subledger reconciliation

`finance-reports.js` compares:

- AR outstanding versus GL control account.
- AP outstanding versus GL control account.
- Reversed payment allocations are excluded.
- Only accounting-posted invoices are included.

### 3.5 Period control and closing cockpit

Available controls:

- Open/closed accounting period.
- Advisory locking for close.
- Trial-balance validation.
- Unposted transaction validation.
- Bank reconciliation status.
- Inventory versus GL check.
- Payroll versus GL check.
- Tax synchronization indicator.
- Depreciation check.
- AR/AP versus GL checks.

### 3.6 Payment reversal

The original journal is not deleted. The system creates a reversing journal, marks allocations as reversed, recalculates invoice balances, and retains the audit trail.

### 3.7 Fixed assets

Available:

- Asset categories.
- Asset register.
- Custodian and location.
- Acquisition document reference.
- Straight-line depreciation.
- Idempotent depreciation by asset and period.
- Disposal with reason and audit.
- Append-only depreciation entries.

### 3.8 Indonesian tax foundation

Available:

- Effective-dated tax rates.
- PPN output/input.
- PPh records.
- NSFP ranges.
- Faktur Pajak lifecycle.
- Replacement/cancellation.
- Withholding documents.
- e-Faktur CSV export.
- Audit on export.

---

## 4. Critical Findings — P0/P1

### FIN-CRIT-01 — Backend period close does not enforce the full closing cockpit

`closePeriod()` currently blocks only when:

- Trial balance is not balanced.
- Finance documents are not posted.

It does **not** enforce all other closing checks on the server:

- Bank reconciliation.
- Inventory reconciliation.
- Payroll reconciliation.
- Tax reconciliation.
- Depreciation completion.
- AR/AP control-account reconciliation.

The Closing Cockpit UI can show BLOCKED/REVIEW, but the Accounting page still exposes a close action, and the backend close endpoint does not call the full cockpit gate.

**Required fix:**

```text
Close Request
→ Run immutable closing checklist
→ Resolve or formally waive WARN
→ Block all FAIL
→ Reviewer approval
→ Finance Manager approval
→ Close ledger period
→ Snapshot evidence
```

### FIN-CRIT-02 — Payment allocation is not idempotent

Endpoint:

```text
POST /api/payments/allocate
```

uses row locks, but does not use `runtime.withIdempotency()`. A browser or network retry can repeat an allocation and increase the amount again through the `ON CONFLICT ... amount + excluded.amount` behavior.

**Required fix:** require an `Idempotency-Key`, store request hash/result, and reject replay with different content.

### FIN-CRIT-03 — Accounting periods are global, not per ledger/legal entity

Current schema:

```text
accounting_periods.period UNIQUE
```

This means one month has one global status for the entire application. A tier-1 model requires period status by:

```text
Ledger + Legal Entity + Module + Period
```

Examples:

- GL open while AP is closed.
- One legal entity still open while another is closed.
- Adjustment period available only for selected ledgers.

### FIN-CRIT-04 — Finance roles remain too broad for strict SoD

`finance_manager` receives all actions for invoices, payments, AP invoices, supplier payments, expenses, assets, budgets, and credit. `accounting` receives all actions for journal, ledger, closing, reports, and assets.

The system has an SoD conflict center, but production security should prevent incompatible duties, not merely detect them.

Required duty separation:

```text
Invoice Creator ≠ Invoice Approver
Payment Preparer ≠ Payment Releaser
Journal Preparer ≠ Journal Approver/Poster
Asset Creator ≠ Capitalization Approver
Reconciliation Preparer ≠ Reconciliation Approver
Period Close Preparer ≠ Final Closer
FX Rate Creator ≠ FX Rate Approver
Posting Profile Maintainer ≠ Posting Profile Approver
```

### FIN-CRIT-05 — No PostgreSQL Row-Level Security

No `ENABLE ROW LEVEL SECURITY` or `CREATE POLICY` was found in migrations.

Application authorization is useful, but finance tables require database defense-in-depth for:

- Business documents.
- Payment allocations.
- Journal lines.
- Bank transactions.
- Reconciliation runs.
- Fixed assets.
- Tax documents.
- Budgets.
- Sensitive finance configuration.

### FIN-CRIT-06 — Exchange rates are self-approved and immediately active

`createExchangeRate()` inserts/updates the rate as `ACTIVE`, with `created_by = approved_by`.

This violates maker-checker principles and can materially change transaction valuation.

Target lifecycle:

```text
DRAFT → SUBMITTED → VERIFIED → APPROVED → ACTIVE → SUPERSEDED
```

### FIN-CRIT-07 — Posting-profile/account-role/tax-rate changes activate without finance governance

Account roles and tax rates are created through `settings.edit` and directly become effective. There is no formal change request, validation simulation, or independent approval.

Required:

- Proposed configuration version.
- Impact simulation.
- Test journal.
- Maker-checker.
- Scheduled activation.
- Rollback version.
- Immutable audit evidence.

### FIN-CRIT-08 — Unknown account categories are silently added to equity

In `financialStatements()`, categories outside ASSET, LIABILITY, EQUITY, REVENUE, COGS, and EXPENSE are included on the equity side to preserve the balance-sheet equation.

This can conceal mapping errors.

**Required fix:** show an explicit `UNMAPPED / INVALID CLASSIFICATION` section and block official statement publication until resolved.

### FIN-CRIT-09 — Closing tax reconciliation is not a real GL-to-tax reconciliation

The closing check currently treats tax as synchronized when tax records exist, or when no unposted finance documents exist. It does not compare tax subledger balances against tax control accounts.

Required reconciliation:

```text
PPN Output subledger vs PPN Output GL
PPN Input subledger vs PPN Input GL
PPh payable by type vs withholding GL
Reported/paid amount vs tax payable balance
```

### FIN-CRIT-10 — Bank reconciliation model supports only one run per branch/month

Current unique key:

```text
(branch_id, period)
```

There is no bank-account/statement ID in `bank_transactions` or `reconciliation_runs`. A branch with multiple bank accounts cannot reconcile each statement independently.

Target key:

```text
Legal Entity + Bank Account + Statement Number + Statement Period
```

### FIN-CRIT-11 — Workspace ZIP contains development/runtime data

The supplied workspace contains:

- `.env`
- `.git`
- `node_modules`
- runtime `storage`
- 17 PostgreSQL dump files (about 6.55 MiB total)

The clean release builder is strong and generated 297 files with a SHA-256 manifest, but the main workspace must never be used as a delivery artifact.

The secret scanner reports zero findings while explicitly excluding `.env`, `storage`, dumps, PDF, spreadsheets, images, and ZIP files. Therefore, zero findings does not prove the supplied ZIP is safe.

---

## 5. Functional Gap by Finance Domain

## 5.1 Finance Control Center — Missing

Create a unified executive and operational workspace:

```text
FINANCE CONTROL CENTER
├── Cash Position
├── Working Capital
├── AR Aging and Collection Risk
├── AP Due and Payment Readiness
├── Budget vs Actual
├── Profitability
├── Close Readiness
├── Reconciliation Exceptions
├── Tax Compliance
├── Asset Activity
└── Finance Approval Inbox
```

Required filters:

- Legal entity.
- Ledger.
- Branch.
- Period.
- Currency.
- Cost center/profit center.
- Project.

## 5.2 General Ledger

Already available:

- COA foundation.
- Journal lines.
- Manual journal.
- Automatic posting profiles.
- Trial balance.
- Ledger list.
- Period lock.

Missing:

- COA maintenance workbench.
- Account hierarchy and groups.
- Control-account flag.
- Open-item management.
- Reconciliation-account flag.
- Posting block.
- Effective dates.
- Currency restriction.
- Tax category.
- Journal batch/header/line lifecycle.
- Journal source and category.
- Recurring journals.
- Accrual and deferral schedules.
- Auto-reversing journals.
- Allocation rules.
- Ledger settlement.
- Intercompany balancing.
- Multiple ledgers and accounting books.
- Parallel accounting/local GAAP versus IFRS.
- Foreign-currency revaluation.
- Reporting-currency translation.
- Year-end retained-earnings process.
- Adjustment periods.

## 5.3 Accounts Receivable / Credit-to-Cash

Already available:

- Invoice lifecycle.
- Customer payment.
- Payment allocation.
- Partial settlement.
- Reversal.
- Dunning.
- Credit hold integration.
- AR subledger reconciliation.

Missing:

- Credit memo and debit memo.
- Invoice adjustment.
- Dispute/case management.
- Receipt batch and lockbox import.
- Auto cash application rules.
- Unapplied/on-account receipts.
- Short payment/overpayment handling.
- Bank charge and withholding deductions.
- Write-off and bad-debt approval.
- Promise-to-pay.
- Customer statement generation.
- Collector work queue.
- Aging buckets configurable by policy.
- Payment schedule/installments.
- Realized/unrealized FX gain/loss.
- Credit insurance/guarantee support.

## 5.4 Accounts Payable / Invoice-to-Pay

Already available:

- Supplier invoice.
- Three-way match foundation.
- Payment proposal.
- Supplier payment.
- Allocation.
- AP subledger reconciliation.
- Supplier bank verification in master data.

Missing:

- Invoice distributions by account/dimension.
- Invoice hold/release.
- Match exceptions workbench.
- Supplier prepayment/advance.
- Debit memo/credit memo.
- Recurring supplier invoices.
- Duplicate invoice scoring.
- Payment batch/run.
- Payment method and bank-account selection rules.
- Positive pay/payment-file generation.
- Payment approval and release workflow separated from preparation.
- Remittance advice.
- Withholding by invoice line.
- FX settlement gains/losses.
- AP period close checklist.

## 5.5 Cash and Bank / Treasury

Current implementation is basic:

- CSV bank import.
- Transaction matching by amount.
- Branch-level reconciliation.
- Company bank account master.

Missing:

- Bank statement header and lines.
- Multiple statements per account/period.
- Account-specific reconciliation.
- Configurable matching rules.
- Date/reference/amount tolerance.
- Many-to-one and one-to-many matching.
- Bank fees and interest posting.
- Transfers between bank accounts.
- Cash positioning.
- Short-term cash forecasting.
- Expected receipt/payment forecast.
- Uncleared/cleared status.
- Bank balance confirmation.
- Electronic statement formats.
- Bank API/SFTP connector abstraction.
- Treasury controls and counterparty limits.

## 5.6 Fixed Assets

Already available:

- Registry.
- Category configuration.
- Custodian.
- Source document.
- Straight-line depreciation.
- Disposal.

Missing:

- Asset books: corporate, fiscal, tax.
- Depreciation conventions.
- Mid-month/half-year conventions.
- Additional depreciation methods.
- Capitalization workflow.
- Construction in progress.
- Asset transfer.
- Split and merge.
- Reclassification.
- Impairment.
- Revaluation.
- Retirement versus sale versus scrap.
- Reinstatement.
- Physical inventory and barcode.
- Maintenance/insurance linkage.
- Component assets.
- Lease accounting.

### Disposal-accounting concern

Current disposal journal removes accumulated depreciation, debits the remaining book value to account `7100`, and credits the asset account. Sale proceeds are stored in payload but are not included in that disposal journal. The implementation assumes proceeds are booked separately, but no enforced settlement link is present.

Required:

- Create linked receivable/cash transaction for proceeds, or
- Include cash/receivable and gain/loss in one controlled disposal posting.

## 5.7 Budgeting and FP&A

Current budget scope is limited to procurement budget by branch and month.

Missing:

- Annual operating budget.
- Capital expenditure budget.
- Revenue budget.
- Headcount/payroll budget.
- Project budget.
- Budget versions and scenarios.
- Bottom-up planning.
- Workflow and approval.
- Budget transfer/revision.
- Commitment and encumbrance.
- Actual/commitment/forecast comparison.
- Rolling forecast.
- Driver-based planning.
- Cash-flow forecast.
- Variance explanation.
- Budgetary control by dimension.

## 5.8 Financial Reporting

Already available:

- Balance sheet.
- Income statement.
- Trial balance.
- AR/AP reconciliation.

Missing:

- Cash-flow statement.
- Statement of changes in equity.
- Comparative prior period/year.
- Budget versus actual.
- Segment/profit-center reports.
- Cost-center P&L.
- Project profitability.
- Customer/product margin.
- Working-capital dashboard.
- Configurable financial statement layout.
- Report versioning.
- Drill-through to journal/document.
- Report annotations and sign-off.
- Consolidation and elimination.
- Export evidence package.
- Report publication workflow.

## 5.9 Tax

Tax foundation is strong, but upgrade is still needed:

- Tax determination per item/service and party status.
- Withholding by invoice line.
- Tax reconciliation to GL control accounts.
- Tax settlement/payment document.
- Period lock and filing sign-off.
- Amendment workflow.
- Evidence/document attachment.
- Submission-channel connector abstraction.
- Tax audit package.
- Separate tax rate maker-checker.

---

## 6. Architecture Findings

## 6.1 Keep modular monolith

A rebuild to microservices is not recommended. The current modular monolith plus PostgreSQL remains suitable for MAT because it preserves ACID consistency and reduces operational complexity.

Recommended finance bounded contexts:

```text
Finance Platform
├── General Ledger
├── Receivables
├── Payables
├── Cash and Bank
├── Fixed Assets
├── Budgeting and Forecasting
├── Tax Accounting
├── Financial Close
├── Financial Reporting
└── Finance Configuration and Governance
```

## 6.2 Replace generic-document-only subledgers with dedicated finance projections

`business_documents` is useful as a common workflow/document header. As finance grows, add specialized tables/projections:

```text
ar_invoices / ar_installments / ar_receipts / ar_applications
ap_invoices / ap_distributions / ap_holds / ap_payments
journal_batches / journal_headers / journal_lines
bank_statements / bank_statement_lines / bank_matches
asset_transactions / asset_books / depreciation_entries
tax_subledger_entries
```

Keep document IDs as traceable links.

## 6.3 Move dimensions and currency amounts to journal-line level

Current journal lines store only account, debit, credit, and memo. Tier-1 finance needs each line to carry:

- Legal entity.
- Ledger.
- Branch.
- Department.
- Cost center.
- Profit center.
- Project/WBS.
- Customer/supplier.
- Product/service.
- Transaction currency amount.
- Functional currency amount.
- Reporting currency amount.
- Exchange-rate type/date.
- Tax code.
- Intercompany partner.

## 6.4 Stop silent dimension defaulting

When cost center is mandatory and omitted, current logic selects the first active cost center. This can silently misclassify costs.

Required behavior:

- Reject missing dimensions, or
- Use an explicit, approved default by legal entity/branch/document type and visibly flag it.

## 6.5 Version financial configurations

The following must become governed objects:

- COA.
- Account hierarchy.
- Posting profile.
- Account role.
- Tax rate.
- Dimension policy.
- Exchange rate.
- Closing checklist.
- Financial statement layout.

Lifecycle:

```text
DRAFT → VALIDATED → REVIEWED → APPROVED → SCHEDULED → ACTIVE → SUPERSEDED
```

---

## 7. Security Target

### 7.1 Granular permissions

Recommended permission families:

```text
finance.dashboard.view

ar.invoice.view/create/edit/submit/approve/post/adjust/writeoff/void
ar.receipt.create/apply/unapply/reverse
ar.collection.manage

ap.invoice.view/create/edit/submit/approve/post/hold/release/void
ap.payment.prepare/approve/release/reverse

cash.statement.import
cash.reconciliation.prepare/approve
cash.transfer.prepare/approve
cash.position.view

gl.account.view/maintain/approve
gl.journal.prepare/approve/post/reverse
gl.period.prepare_close/approve_close/reopen

afa.asset.create/capitalize/transfer/depreciate/dispose/approve

budget.prepare/review/approve/revise/transfer

tax.prepare/review/approve/file/amend/export

finance.config.propose/approve/activate
finance.report.view/publish/export
```

### 7.2 Step-up authentication

Require recent MFA for:

- Payment release.
- Payment reversal.
- Journal posting above threshold.
- Period close/reopen.
- Bank-account reveal/export.
- FX-rate activation.
- Posting-profile activation.
- Tax filing/export.
- Asset disposal above threshold.

### 7.3 RLS and database roles

Use separate database roles:

- Migration owner.
- Application runtime.
- Read-only reporting.
- Backup/restore.
- Background worker.

Enable RLS using session context for legal entity/branch and use default-deny policies.

### 7.4 Immutable accounting data

- Revoke UPDATE/DELETE from posted journal lines.
- Correct only through reversal and reposting.
- Hash journal batches/closing evidence.
- Audit reveal, export, waiver, and configuration activation.
- Store close-package manifest and evidence checksum.

---

## 8. Recommended Final Finance Menu

```text
FINANCE
├── Finance Control Center
│   ├── Executive Overview
│   ├── My Finance Work
│   ├── Exceptions & Alerts
│   └── Finance Approval Inbox
│
├── Accounts Receivable
│   ├── Customer Invoices
│   ├── Credit/Debit Memos
│   ├── Customer Receipts
│   ├── Cash Application
│   ├── Collection & Dunning
│   ├── Disputes & Write-offs
│   └── AR Aging & Statements
│
├── Accounts Payable
│   ├── Supplier Invoices
│   ├── Match Exceptions
│   ├── Holds & Prepayments
│   ├── Payment Proposals
│   ├── Payment Runs
│   ├── Supplier Payments
│   └── AP Aging
│
├── Cash & Bank
│   ├── Cash Position
│   ├── Bank Statements
│   ├── Bank Reconciliation
│   ├── Bank Transfers
│   ├── Cash Forecast
│   └── Bank Accounts (linked to Organization)
│
├── General Ledger
│   ├── Journal Workbench
│   ├── General Ledger
│   ├── Trial Balance
│   ├── Chart of Accounts
│   ├── Dimensions
│   ├── Allocations & Accruals
│   ├── FX Revaluation
│   └── Intercompany
│
├── Fixed Assets
│   ├── Asset Register
│   ├── Capitalization
│   ├── Asset Transactions
│   ├── Depreciation
│   ├── Transfers & Reclassification
│   ├── Physical Verification
│   └── Disposal
│
├── Budgeting & Forecast
│   ├── Budget Plans
│   ├── Budget Control
│   ├── Commitments
│   ├── Forecast
│   └── Budget vs Actual
│
├── Tax
│   ├── Tax Control Center
│   ├── VAT / PPN
│   ├── Withholding / PPh
│   ├── Tax Documents
│   ├── Reconciliation
│   ├── Filing & Settlement
│   └── Tax Audit Package
│
├── Financial Close
│   ├── Close Calendar
│   ├── Closing Cockpit
│   ├── Reconciliation Center
│   ├── Close Tasks
│   ├── Adjustments
│   └── Close Evidence
│
├── Financial Reporting
│   ├── Financial Statements
│   ├── Management Reports
│   ├── Profitability
│   ├── Cash Flow
│   ├── Consolidation
│   └── Report Designer
│
└── Finance Configuration
    ├── Ledgers & Periods
    ├── Chart of Accounts
    ├── Posting Profiles
    ├── Account Roles
    ├── Tax Rules
    ├── Exchange Rates
    ├── Payment Methods
    ├── Reconciliation Rules
    └── Finance Governance
```

---

## 9. UI/UX Direction

### Visual formula

```text
85% Clean Enterprise
10% Premium Pearl Glass
5% Cute Clay and Motion
```

Finance must be more restrained than Master Data or Organization because monetary values, approvals, and audit evidence require high visual clarity.

### Palette

- Pearl white background.
- Deep navy navigation and primary actions.
- Champagne gold for approval/authority.
- Mint for reconciled/posted/healthy.
- Amber for review/variance.
- Coral for blocked/overdue/out-of-balance.
- Lavender for forecast/information.

### Clay usage

Use cute clay accents only for:

- Finance overview KPI icons.
- Empty states.
- Close completion.
- Reconciliation success.
- Cash forecast illustration.
- Asset category illustration.
- Guided assistant.

Do not use clay inside:

- Journal lines.
- Trial balance.
- Payment release.
- Audit logs.
- Tax evidence.
- Dense reconciliation tables.

### Required enterprise interactions

- Legal entity and ledger selector.
- Period and currency selector.
- Saved views.
- Server-side filters/pagination.
- Column chooser.
- Drill-through from KPI → statement → account → journal → source document.
- Side-by-side before/after.
- Exception drawer.
- Sticky totals and action bar.
- Approval timeline.
- Reconciliation evidence attachments.
- Mobile view optimized for review/approval, not dense journal maintenance.

---

## 10. Priority Roadmap

### P0 — Stop-Ship

- Enforce full closing cockpit in backend close endpoint.
- Add idempotency to payment allocation and close operations.
- Separate period status by legal entity/ledger/module.
- Rotate secrets and quarantine unsafe workspace ZIPs.
- Scan the final release artifact, not only source files.
- Add strict SoD for payment, journal, reconciliation, and close.
- Add PostgreSQL RLS for finance data.
- Stop exchange-rate self-approval.
- Stop direct activation of posting profile/account role/tax rate.
- Replace unknown-category-to-equity fallback.

### P1 — Production Complete

- Finance Control Center.
- Dedicated AR/AP workbenches.
- Bank-account-level statements and reconciliation.
- COA management.
- Journal batches/sources/categories.
- Close calendar/tasks/evidence.
- Line-level dimensions and currency.
- Configurable statement layouts.
- Asset capitalization and transfer workflow.
- Real GL-to-tax reconciliation.

### P2 — Enterprise Finance

- Multi-ledger and multi-book.
- FX revaluation and translation.
- Allocation/accrual/deferral engine.
- Cash forecasting.
- Payment runs and release workflow.
- Credit/debit memos, disputes, write-offs.
- AP holds/prepayments/duplicate detection.
- Full budgeting and forecast.
- Multi-book fixed assets.
- Intercompany and consolidation.

### P3 — Platform Maturity

- SSO/OIDC and SCIM.
- Vault/KMS.
- Signed release provenance and SBOM.
- SAST/DAST/dependency scanning.
- SIEM and finance fraud alerts.
- PostgreSQL standby/failover.
- Immutable backup and restore evidence.
- API connectors for banks/tax channels through controlled adapters.

---

## 11. Testing Results During Audit

### Passed

- UI shell and accessibility tests: 5/5 passed.
- Security headers and traversal protection: passed.
- Fingerprinted and compressed assets: passed.
- Authorization coverage: 195 handlers covered.
- Permission allow/deny paths: passed.
- Public endpoint allowlist: passed.
- Static branch helper default-deny: passed.
- Tax number-format and module-contract tests: passed.
- Clean release build: 297 files, SHA-256 manifest generated.

### Not validated because PostgreSQL was unavailable

Database integration tests returned:

```text
ECONNREFUSED 127.0.0.1:5432
```

The following remain unvalidated in this audit environment:

- Finance branch-isolation integration.
- Fixed-asset posting/depreciation integration.
- Financial-statement balancing integration.
- AR/AP subledger integration.
- Closing-cockpit integration.

These are **not considered passed** until executed against the intended PostgreSQL environment.

---

## 12. Final Decision

Current status:

> **Strong Accounting Core — Incomplete Enterprise Finance Suite — Not Yet Production-Final.**

After P0 and P1:

- Suitable for controlled internal production at MAT.
- Strong finance governance for a single-company/multi-branch setup.

After P0–P2:

- 100% complete for MAT's defined enterprise scope.
- Approximately 95–97% enterprise-ready against the relevant control patterns of SAP, Oracle, and Dynamics 365, while remaining lighter and easier to maintain.

Do **not** rebuild the application from zero. Preserve the modular monolith and PostgreSQL foundation, then strengthen the finance domain model, governance, security enforcement, and workbench UX.
