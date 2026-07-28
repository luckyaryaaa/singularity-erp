# AUDIT FINAL CATEGORY MASTER DATA — MAT ERP V2

**Project:** MAT ERP V2  
**Source audited:** `MAT ERP V2(2).zip`  
**Application version:** `0.29.0`  
**Audit date:** 22 July 2026  
**Scope:** Menu, feature completeness, data model, UI/UX, architecture, infrastructure, database governance, security, testing, and release readiness.

---

# 1. Executive Summary

## Final verdict

MAT ERP V2 already has a **strong enterprise master-data foundation** and is significantly more mature than a normal CRUD-based internal ERP. The implementation already contains lifecycle governance, effective dating, maker-checker controls, supplier performance scoring, employee compensation approval, BOM/HPP revisions, data-quality checks, import jobs, audit trails, and a clean-release mechanism.

However, it is **not yet equivalent to the Master Data Governance capabilities of SAP, Oracle, or Microsoft Dynamics 365**.

The largest remaining gaps are not simply missing form fields. The important gaps are:

1. No unified Party/Business Partner model.
2. No generic Change Request staging and activation engine.
3. No duplicate-resolution workbench, survivorship rules, or golden record.
4. Active master records can still be updated directly through generic PATCH APIs.
5. Employee row and field security is not consistently enforced.
6. No PostgreSQL Row-Level Security.
7. Master-data permissions are still broad and static.
8. Sensitive bank, salary, tax, and personal information is not centrally protected.
9. Data-quality rules are hard-coded and limited.
10. Import processing lacks a proper staging, mapping, correction, and approval workbench.
11. Product, customer, and supplier usage is not yet modeled by Legal Entity, Business Unit, site, or purchasing/sales responsibility.
12. The release workspace still contains secrets, database dumps, runtime data, and development artifacts.

## Engineering assessment

| Area | Current Score | Final Target |
|---|---:|---:|
| Master Data feature completeness | 78/100 | 96/100 |
| Customer Master | 72/100 | 95/100 |
| Supplier Master | 85/100 | 96/100 |
| Product & Service Master | 81/100 | 96/100 |
| Employee Master | 80/100 | 96/100 |
| Business Partner / Party | 20/100 | 95/100 |
| Change Request Governance | 38/100 | 96/100 |
| Duplicate & Golden Record | 25/100 | 95/100 |
| Data Quality | 65/100 | 94/100 |
| Import & Data Migration | 55/100 | 94/100 |
| Visual UI/UX | 80/100 | 95/100 |
| Application architecture | 79/100 | 95/100 |
| Database governance | 70/100 | 96/100 |
| Security and data access | 66/100 | 97/100 |
| Infrastructure and release hygiene | 55/100 | 97/100 |
| **Overall Master Data readiness** | **69/100** | **95–97/100** |

> These scores are an engineering gap assessment, not an official SAP, Oracle, or Microsoft certification.

---

# 2. Current Master Data Menu

The current **MASTER DATA** category contains:

```text
MASTER DATA
├── Data Quality & FX
├── Customer Link
├── Pelanggan
├── Supplier
└── Produk & Jasa
```

Employee and Organization data are placed under another category.

This structure is usable, but it does not yet feel like one integrated Master Data Governance workspace. Governance functions are separated or missing:

- Business Partner.
- Reference Data.
- Duplicate Management.
- Change Requests.
- Approval Inbox.
- Import Staging.
- Data Steward Work Queue.
- Master Data Audit and Lineage.
- Master Data Configuration.

## Recommended final structure

```text
MASTER DATA HUB
├── Overview & Data Quality
├── My Change Requests
├── Approval Inbox
├── Duplicate Management
├── Business Partners
│   ├── Parties
│   ├── Customer Roles
│   ├── Supplier Roles
│   ├── Contacts
│   └── Relationships & Hierarchies
├── Customers
├── Suppliers
├── Products & Services
├── Employees
├── Product Classification & Variants
├── BOM & Costing Governance
├── Unit of Measure
├── Reference Data
├── Currency & Exchange Rate
├── Import & Data Migration
├── Data Steward Workbench
└── Audit & Governance
```

Organization and Employee can remain in their operational categories, but the Master Data Hub should provide governance visibility, quality, change requests, duplicate checks, ownership, and audit for them.

---

# 3. Capabilities Already Implemented

## 3.1 Master-data lifecycle

The system already supports a mature lifecycle:

```text
DRAFT
→ PENDING_REVIEW
→ APPROVED
→ ACTIVE
→ SUSPENDED / BLOCKED
→ OBSOLETE
→ ARCHIVED
```

Existing governance fields include:

- `mdm_version`.
- Effective dates.
- Change reason.
- Data steward.
- Lifecycle status.
- Audit history.
- Completeness or quality information in several modules.

This foundation should be retained.

## 3.2 Customer Master

Existing capabilities include:

- Company or individual customer.
- Customer code.
- Legal name.
- NPWP.
- PPN setting.
- Category.
- Website.
- Currency.
- Credit limit and risk information.
- Multiple contacts.
- Multiple addresses.
- Product-specific customer selling price.
- Customer Link onboarding wizard.
- Recoverable draft.
- Optimistic locking.
- Idempotent finalization.
- Document linkage.

## 3.3 Supplier Master

Supplier Master is currently one of the strongest Master Data areas.

Existing capabilities include:

- Company or individual supplier.
- Tax profile.
- PPN configuration.
- Supplier contacts.
- Addresses.
- Approved materials and services.
- Append-only supplier price history.
- Supplier evaluation.
- Supplier documents.
- Bank-account maker-checker.
- Payment hold.
- Supplier risk and performance hold.
- Evidence-based automated supplier performance score.
- PO blocking based on supplier compliance or performance.

## 3.4 Product & Service Master

Existing capabilities include:

- Product.
- Service.
- Raw material.
- Consumable.
- Spare part.
- Tooling.
- Product variants.
- UoM conversion.
- Product files.
- BOM revisions.
- HPP/cost revisions.
- Active HPP.
- Effective BOM.
- Supplier-price linkage.
- Customer-price linkage.
- Cost trace.
- Lifecycle control.

BOM lifecycle:

```text
DRAFT
→ REVIEW
→ APPROVED
→ EFFECTIVE
→ SUPERSEDED
```

HPP lifecycle:

```text
DRAFT
→ REVIEW
→ APPROVED
→ LOCKED
→ ACTIVE
→ SUPERSEDED
```

## 3.5 Employee Master

Existing Employee Master is broad and already covers:

- Personal information.
- Employment and position.
- Employment history.
- Contract.
- Compensation.
- Tax.
- BPJS.
- Insurance.
- Payroll bank.
- Documents.
- Certifications.
- Emergency contact.
- Restricted information.
- System access and roles.
- Audit history.
- Compensation maker-checker.
- Payroll bank maker-checker.
- Salary masking in several detail projections.

## 3.6 Data-quality foundation

The project already includes:

- Master quality scan.
- Missing-data checks.
- Document checks.
- Supplier compliance checks.
- Product costing checks.
- Employee profile checks.
- Quality issue records.
- Fixed quality penalties.
- Quality score output.

## 3.7 Import foundation

The system already supports:

- CSV import job.
- Background worker.
- Per-row processing.
- Error recording.
- Create/update based on master identifier.
- Import audit through background-job execution.

## 3.8 Security foundation

Existing controls include:

- Password hashing.
- Session management.
- CSRF protection.
- Security headers.
- RBAC.
- MFA foundation.
- Approval controls.
- Maker-checker.
- Audit logging.
- Branch-scope helper.
- Migration checksum.
- Idempotency on several critical processes.
- Event outbox.
- Clean release builder.

---

# 4. Comparison with Tier-1 ERP Patterns

MAT ERP is already moving in the right direction, but tier-1 platforms use several governance layers that are still missing.

## SAP pattern

A mature SAP MDG-style flow does not normally allow critical active Business Partner data to be changed freely. Changes are prepared through a Change Request, validated, checked for duplicates, reviewed, approved, and then activated to the active master.

Target pattern for MAT:

```text
Search Existing Master
→ Create Change Request
→ Enter Proposed Data
→ Validate
→ Duplicate Check
→ Review
→ Approve
→ Activate
→ Distribute / Publish Event
```

## Oracle pattern

Oracle Customer Data Management includes duplicate identification, merge or link resolution, master-record selection, survivorship rules, agreement rules, and golden-master concepts.

Target pattern for MAT:

```text
Duplicate Candidate
→ Match Score
→ Steward Review
→ Merge / Link / Reject
→ Survivorship Rules
→ Transaction Reassignment
→ Golden Record
→ Audit and Unmerge Evidence
```

## Dynamics 365 pattern

Dynamics uses Party and Global Address Book concepts for persons and organizations that can have multiple business roles. Product masters are also supported by governed dimensions and variant combinations.

Target pattern for MAT:

```text
Party
├── Organization / Person
├── Addresses
├── Electronic Contacts
├── Identifiers
├── Tax Registrations
├── Relationships
└── Roles
    ├── Customer
    ├── Supplier
    ├── Employee
    ├── Contact
    └── Prospect
```

---

# 5. Critical Architecture Gaps

## 5.1 No Unified Business Partner / Party

Customer, Supplier, Employee, Contact, and Organization identities are still maintained as separate masters.

Example:

```text
PT ABC as Customer
PT ABC as Supplier
```

The system can currently store them as two unrelated identity records with:

- Different names.
- Different addresses.
- Different contacts.
- Different NPWP values.
- Separate change histories.

### Required upgrade

Create a central Party model:

```text
parties
party_names
party_identifiers
party_tax_registrations
party_addresses
party_contacts
party_relationships
party_roles
customer_accounts
supplier_accounts
employee_person_links
```

Do not immediately delete existing tables. Use a controlled migration:

1. Create Party tables.
2. Generate Party records from existing customers, suppliers, employees, and contacts.
3. Create role and usage links.
4. Reconcile identities.
5. Migrate references gradually.
6. Retain compatibility views during transition.
7. Remove legacy duplicated identity fields only after reconciliation and UAT.

## 5.2 Direct update of active master data

Generic Master Data routes still allow direct `PATCH` updates to:

- Customer.
- Supplier.
- Product.
- Employee.

This bypasses the governance model expected from a tier-1 MDM system.

### Required upgrade

Critical fields must use Change Requests.

Examples:

- Customer legal identity.
- Customer credit terms.
- Supplier tax identity.
- Supplier bank.
- Product classification.
- Product UoM.
- Product BOM.
- Product HPP.
- Employee salary.
- Employee bank.
- Employee tax.
- Employee employment status.
- Employee system access.

### Final rule

```text
Non-critical correction
→ Controlled edit with reason and version check

Critical active-master change
→ Change Request and approval

Historical correction
→ Correction transaction; never overwrite evidence silently
```

## 5.3 No generic staging area

Tier-1 governance separates proposed data from the active master.

Required entities:

```text
master_change_requests
master_change_request_items
master_change_request_values
master_change_request_evidence
master_change_request_steps
master_change_request_comments
master_change_request_activations
```

The active master must not be overwritten until activation succeeds transactionally.

## 5.4 No formal document/data lineage

Each master should show:

- Data source.
- Original import.
- Source system.
- Change Request.
- Approval.
- Previous values.
- Current values.
- Downstream usage.
- Last verified date.
- Steward.
- Data owner.

---

# 6. Duplicate Management and Golden Record

## Current state

Duplicate checks are mostly exact matching:

- Exact customer code.
- Exact supplier code.
- Exact employee NIK.
- Exact normalized NPWP within the same master.

Current limitations:

- Customer is not compared with Supplier.
- No fuzzy company-name matching.
- No similar-address matching.
- No phone/email similarity.
- No configurable match weights.
- No duplicate-candidate inbox.
- No merge.
- No link.
- No unmerge.
- No survivorship rule.
- No source priority.
- No golden record.
- No transaction-reassignment workflow.

## Final Duplicate Management Workbench

```text
DUPLICATE MANAGEMENT
├── New Candidates
├── High-Confidence Matches
├── Possible Matches
├── Cross-Role Matches
├── Merge Requests
├── Linked Records
├── Rejected Matches
└── Resolution History
```

## Match dimensions

- Legal name similarity.
- Alternate/trading name.
- NPWP/NIK.
- Email.
- Phone.
- Address.
- Bank-account fingerprint.
- Website/domain.
- Registration number.
- Contact relationship.
- Source system.

## Resolution actions

```text
Merge
Link
Keep Separate
Mark False Positive
Request Evidence
Escalate
Unmerge / Restore
```

## Survivorship rules

Examples:

```text
Verified tax registration wins.
Approved bank account wins.
Most recent verified address wins.
Government-issued identifier wins.
Higher-priority source wins.
Manual steward decision overrides automated result.
```

All resolutions must be auditable.

---

# 7. Security Findings

## 7.1 Employee list API exposes too much data

The generic employee list query returns broad employee columns, including `base_salary`, to callers with `employee.view`.

Even if the UI does not display salary, the API payload may still expose it.

### Required fix

Create explicit projections:

```text
EmployeeDirectoryProjection
EmployeeHRProjection
EmployeePayrollProjection
EmployeeTaxProjection
EmployeeRestrictedProjection
```

Do not use `SELECT m.*`.

Field permissions must be checked on the backend.

## 7.2 Employee branch scope is inconsistent

Employee list, overview, subresource, and audit queries do not consistently enforce branch or row scope.

A user with `employee.view` and a known employee UUID may potentially access an employee outside the permitted branch.

### Required fix

Every repository/service method must receive security context:

```text
user_id
legal_entity_ids
branch_ids
department_ids
own_record_id
field_permissions
privileged_session
```

Use:

- Backend policy checks.
- Scoped SQL.
- PostgreSQL RLS.
- IDOR tests.
- Own-record policy for employee self-service.

## 7.3 No PostgreSQL Row-Level Security

No RLS policies were found for Master Data tables.

RLS must be introduced as defense-in-depth for:

- Party.
- Customer account.
- Supplier account.
- Employee.
- Employee salary.
- Employee bank.
- Supplier bank.
- Tax records.
- Product usage.
- Audit.
- Change Requests.
- Import staging.

## 7.4 Permissions are too broad

Current permissions are mostly module-level:

```text
customer.view
customer.edit
supplier.view
supplier.edit
employee.view
employee.edit
product.view
product.edit
settings.view
settings.edit
```

Required granular model:

```text
master.customer.identity.view
master.customer.identity.propose
master.customer.credit.view
master.customer.credit.propose
master.customer.credit.approve

master.supplier.bank.view_masked
master.supplier.bank.view_full
master.supplier.bank.propose
master.supplier.bank.verify
master.supplier.bank.approve

master.employee.directory.view
master.employee.personal.view
master.employee.salary.view
master.employee.salary.propose
master.employee.salary.approve
master.employee.bank.view_masked
master.employee.bank.reveal

master.product.identity.view
master.product.cost.view
master.product.cost.propose
master.product.cost.approve
master.product.bom.manage

master.quality.scan
master.quality.resolve
master.duplicate.resolve
master.import.execute
master.import.approve
master.audit.view
master.audit.export
```

## 7.5 Runtime authorization is static

Role grants are still defined statically in source code.

Required target:

```text
Role
→ Duty
→ Privilege
→ Permission
→ Data Policy
```

This should be database-backed and versioned.

## 7.6 Sensitive data is not centrally encrypted

Bank-account numbers are masked in several responses, but the database values remain plaintext.

Sensitive fields requiring protection include:

- Supplier bank account.
- Employee payroll bank.
- Company bank account.
- NIK.
- NPWP where appropriate.
- Restricted employee information.

Required controls:

- Field-level envelope encryption.
- Key outside the repository.
- Masked read models.
- Deterministic fingerprint for duplicate search.
- Step-up MFA for reveal.
- Reveal/export audit.
- Key rotation.
- Backup encryption.

## 7.7 No central audit redaction

Generic create/update auditing can store full objects, including sensitive values.

Required `AuditRedactionService`:

```text
PUBLIC
INTERNAL
CONFIDENTIAL
RESTRICTED
SECRET
```

Treatment:

| Classification | Audit handling |
|---|---|
| Public | Store normally |
| Internal | Store limited |
| Confidential | Mask |
| Restricted | Hash/encrypt |
| Secret | Do not store |

## 7.8 Supplier legacy bank fields remain

The Supplier base table still contains legacy bank fields while a normalized bank-account workflow also exists.

Required action:

1. Stop writing legacy bank columns.
2. Backfill normalized accounts.
3. Reconcile.
4. Create compatibility read view if needed.
5. Remove legacy fields after UAT.
6. Confirm all payments use only verified normalized accounts.

---

# 8. Data Quality Audit

## Current limitations

The current rules are hard-coded in JavaScript.

Other limitations:

- Small rule set per master.
- Fixed penalties.
- Scan limited to 500 active records.
- No rule version.
- No configurable ownership.
- No SLA.
- No waiver workflow.
- No root-cause category.
- No trend by steward or business unit.
- No validation-source evidence.
- No automated recurring schedule based on risk.
- No duplicate score integration.
- No quality gate before activation.

## Final Data Quality Engine

```text
Quality Rule
├── Rule Code
├── Master Type
├── Field / Relationship
├── Validation Type
├── Severity
├── Weight
├── Scope
├── Effective Date
├── Owner
├── Auto-Fix Policy
└── Version
```

## Quality issue lifecycle

```text
OPEN
→ ASSIGNED
→ IN_PROGRESS
→ PENDING_EVIDENCE
→ RESOLVED
→ VERIFIED
→ CLOSED

Alternative:
→ WAIVED with approval and expiry
```

## Required dashboards

- Quality score by master.
- Quality score by branch/legal entity.
- Issues by severity.
- Issues by steward.
- Duplicate trend.
- Expired documents.
- Invalid tax identifier.
- Incomplete bank verification.
- Product without active HPP.
- Supplier without approved material.
- Employee without active position.
- Customer requiring credit review.
- Aging and SLA breach.

---

# 9. Import and Data Migration

## Current state

CSV rows are processed directly by the worker. Successful rows can be written even when other rows fail.

This is usable for basic import, but not sufficient for governed enterprise migration.

## Required final workflow

```text
Upload File
→ Malware Scan
→ Select Master Type
→ Column Mapping
→ Data Preview
→ Validation
→ Duplicate Check
→ Error Correction
→ Revalidation
→ Approval
→ Atomic Commit
→ Reconciliation
→ Import Audit
```

## Required features

- Import template version.
- Mapping profiles.
- File checksum.
- Staging tables.
- Row-level status.
- Error code and human-readable message.
- Duplicate candidate linkage.
- Dry-run mode.
- Approval for high-risk imports.
- Idempotency.
- Resume/retry.
- Atomic batch option.
- Partial-commit policy explicitly selected.
- Rollback package.
- Before/after reconciliation.
- Import evidence.

---

# 10. Exchange Rate Governance

## Current risk

A new exchange rate can be inserted directly as active, with creator and approver effectively being the same user.

This violates maker-checker principles.

## Required lifecycle

```text
DRAFT
→ SUBMITTED
→ VERIFIED
→ APPROVED
→ ACTIVE
→ SUPERSEDED
```

Required fields:

- Rate type.
- Source.
- Base currency.
- Quote currency.
- Effective date/time.
- Buy rate.
- Sell rate.
- Middle rate.
- Evidence.
- Created by.
- Verified by.
- Approved by.
- Version.
- Superseded rate.
- Usage lock.

A rate already used in a posted transaction must never be overwritten.

---

# 11. Customer Master Upgrade

## Existing strengths

- Contacts and addresses.
- Credit information.
- Tax profile.
- Customer-product pricing.
- Onboarding/link wizard.
- Document relations.

## Required upgrade

### Unified identity and account usage

```text
Party
└── Customer Account
    ├── Legal Entity Usage
    ├── Sales Organization
    ├── Sales Office
    ├── Sold-To
    ├── Ship-To
    ├── Bill-To
    ├── Payer
    └── Credit Profile
```

### Customer hierarchy

- Parent company.
- Subsidiary.
- Group account.
- Buying group.
- Ultimate parent.
- Intercompany relationship.

### Tax and legal

- Multiple tax registrations.
- Registration type.
- Effective dates.
- Verification status.
- Country/region.
- Document evidence.

### Commercial governance

- Payment terms.
- Credit limit.
- Credit-review date.
- Risk class.
- Price list.
- Contract.
- Sales assignment.
- Customer status and reason.
- Block by process:
  - Order.
  - Delivery.
  - Billing.
  - Collection.

### UI tabs

```text
Overview
Identity & Roles
Contacts
Addresses & Sites
Tax Registrations
Credit & Payment Terms
Products & Pricing
Contracts
Documents
Relationships
Change Requests
Data Quality
Audit & Lineage
```

---

# 12. Supplier Master Upgrade

## Existing strengths

Supplier Master is already the strongest area.

## Required upgrade

### Supplier account and site

```text
Party
└── Supplier Account
    ├── Legal Entity Usage
    ├── Purchasing Organization
    ├── Supplier Site
    ├── Ordering Site
    ├── Remit-To Site
    ├── Payment Site
    └── Tax Profile
```

### Procurement governance

- Procurement category.
- Buyer group.
- Agreement.
- Incoterms.
- Lead-time policy.
- MOQ.
- Order multiple.
- Approved site.
- Qualification.
- Sanction/watchlist check.
- Compliance expiry.
- Supplier onboarding stages.
- Supplier requalification.

### Bank-fraud controls

- External verification.
- Callback evidence.
- Beneficiary-name matching.
- Bank change cooling-off period.
- Mandatory recent MFA.
- Payment hold until independently verified.
- Bank-account duplicate fingerprint.

### UI tabs

```text
Overview
Identity & Roles
Legal & Tax
Contacts
Addresses & Sites
Bank Accounts
Approved Materials & Services
Price History
Agreements
Documents & Compliance
Performance & Risk
Change Requests
Data Quality
Audit & Lineage
```

---

# 13. Product & Service Master Upgrade

## Current limitations

Product classification still relies heavily on free-text category, material, grade, specification, and JSON attributes.

## Required product model

```text
Product
├── Product Master
├── Released Product / Legal Entity Usage
├── Product Variant
├── Category Hierarchy
├── Attribute Group
├── UoM
├── Barcode / GTIN
├── Manufacturer
├── Manufacturer Part Number
├── Country of Origin
├── HS Code
├── Tracking Dimension Group
├── Storage Dimension Group
├── Planning Policy
├── Quality Policy
├── BOM
└── Costing
```

## Required additional fields

- Product type.
- Procurement type.
- Make/buy policy.
- Batch/serial control.
- Shelf life.
- FEFO policy.
- Weight and dimensions.
- Packaging.
- Safety stock.
- Reorder point.
- Lead time.
- Default warehouse.
- Inspection requirement.
- Approved supplier.
- Alternate/substitute item.
- Obsolescence/replacement.
- Engineering revision.

## Product variant

Do not ask users to enter raw JSON.

Use governed dimensions and attribute groups:

```text
Dimension Group
├── Size
├── Color
├── Configuration
├── Style
└── Version
```

For MAT industrial products, custom dimensions can include:

- Material grade.
- Diameter.
- Length.
- Thickness.
- Hardness.
- Finish.
- Tolerance.
- Drawing revision.

## UI tabs

```text
Overview
Classification & Attributes
Variants
UoM & Packaging
Planning & Warehousing
BOM & Routing
Costing & HPP
Quality & Compliance
Customers & Suppliers
Files & Drawings
Change Requests
Data Quality
Audit & Lineage
```

---

# 14. Employee Master Upgrade

## Required security redesign

Employee data must be divided into projections and field groups.

### Access model

```text
Employee
→ own profile only

Manager
→ team directory and approved manager fields

HR
→ personal and employment data within scope

Payroll
→ salary, tax, BPJS, bank within scope

Finance
→ payment projection only

System Administrator
→ account status and access; no automatic salary access

Security Administrator
→ security events; no automatic salary access

Owner
→ controlled privileged access with audit
```

## Required functional upgrade

- Person/Party linkage.
- Job master.
- Position master.
- Effective-dated assignment.
- Multiple assignments.
- Primary assignment.
- Acting assignment.
- Reporting line.
- Legal employer.
- Cost center.
- Work location.
- Grade.
- Authorized headcount.
- Employee lifecycle.
- Leaver workflow.
- Data-retention policy.
- Employee self-service corrections through Change Request.

## UI tabs

```text
Overview
Personal Identity
Employment & Assignment
Job & Position
Compensation
Tax & BPJS
Insurance
Bank & Payroll
Documents & Certifications
Emergency & Restricted
System Access
Change Requests
Data Quality
Audit & Lineage
```

---

# 15. Reference Data Hub

A dedicated Reference Data Hub is required.

## Reference domains

- Country.
- Province.
- City.
- Address type.
- Contact type.
- Department type.
- Position type.
- Employee status.
- Product category.
- Material type.
- Material grade.
- UoM.
- Currency.
- Exchange-rate type.
- Bank.
- Payment terms.
- Tax code.
- Document type.
- Reason code.
- Warehouse type.
- Quality-disposition code.
- Supplier category.
- Customer category.

## Required governance fields

- Code.
- Name.
- Description.
- Translation.
- Owner.
- Steward.
- Lifecycle.
- Effective dates.
- Usage count.
- Replacement value.
- Change Request.
- Audit.

Reference values already used by active transactions cannot be deleted; they must be end-dated or replaced.

---

# 16. Visual UI/UX Audit

## Existing strengths

- White enterprise foundation.
- Deep-navy structure.
- Semantic design tokens.
- Responsive breakpoint.
- Accessibility focus states.
- Consistent cards, table, modal, and tabs.
- Modern detail header.
- Clean spacing.
- Lifecycle badges.

## Current limitations

List pages are still generic and mostly contain:

- Title.
- Search.
- Basic table.
- Create.
- Import.

Missing:

- KPI summary.
- Saved views.
- Advanced filters.
- Column chooser.
- Bulk actions.
- Quality score.
- Steward.
- Effective date.
- Duplicate indicator.
- Pending Change Request.
- Legal Entity/Branch scope.
- Data lineage.
- Relationship graph.

Detail pages do not consistently show:

- Quality score.
- Steward.
- Last verified date.
- Pending change.
- Duplicate candidate status.
- Legal Entity usage.
- Master-data source.
- Relationship graph.
- Before/after change comparison.

Subresource tabs use dense/wide tables and need responsive cards or drawers on mobile.

## Final visual direction

```text
85% Clean Enterprise
10% Pearl Glass
5% Cute Clay and Motion
```

### Palette

- Pearl white.
- Cloud white.
- Deep navy.
- Azure blue.
- Champagne gold.
- Mint green.
- Amber.
- Coral.
- Lavender.

### Cute clay usage

Use for:

- Business Partner illustration.
- Customer building.
- Supplier warehouse.
- Employee avatar.
- Product/package.
- Empty state.
- Quality success.
- Duplicate warning.
- Guided onboarding.

Do not use excessively for:

- Bank details.
- Salary.
- Tax data.
- Audit history.
- Approval evidence.
- Dense tables.
- Costing values.

## Final Master Data Overview

Header:

- Legal Entity.
- Master Data scope.
- Last quality scan.
- Data steward.
- Refresh status.

KPI:

- Total active masters.
- Pending Change Requests.
- Data quality score.
- Duplicate candidates.
- Expiring documents.
- Unverified bank accounts.
- Masters without owners.
- Failed imports.

Panels:

- Quality trend.
- Master distribution.
- Duplicate queue.
- Pending approvals.
- Expiring documents.
- Steward workload.
- Import status.
- Recent master changes.

## Final list-page pattern

```text
Context Header
→ KPI Summary
→ Saved View
→ Search & Advanced Filter
→ Bulk Action
→ Server-Paginated Table
→ Detail Drawer
```

Columns should include:

- Code.
- Name.
- Type.
- Roles.
- Lifecycle.
- Quality score.
- Steward.
- Scope.
- Effective date.
- Pending change.
- Duplicate warning.
- Last updated.

## Final detail-page pattern

```text
Enterprise Header
├── Illustration / Avatar
├── Code and Name
├── Roles
├── Lifecycle
├── Quality Score
├── Steward
├── Scope
├── Effective Date
├── Last Verified
└── Pending Change

Sticky Tabs
Relationship Graph
Change Diff Drawer
Audit Timeline
Data Lineage
```

---

# 17. Architecture Recommendation

## Keep modular monolith

Do not rebuild as microservices.

The correct architecture for MAT remains:

> **Modular Monolith + PostgreSQL**

Advantages:

- Simpler deployment.
- Easier transaction consistency.
- Lower infrastructure cost.
- Easier debugging.
- Easier backup and restore.
- Lower operational complexity.
- Suitable for current MAT scale.

## Required bounded context

```text
MASTER DATA GOVERNANCE
├── Party & Business Partner
├── Customer Management
├── Supplier Management
├── Product Information Management
├── Workforce Master
├── Reference Data
├── Data Quality
├── Duplicate Resolution
├── Change Requests
├── Import & Migration
└── Master Data Audit
```

## Required service layer

```text
PartyService
BusinessPartnerService
CustomerMasterService
SupplierMasterService
ProductMasterService
EmployeeMasterService
ReferenceDataService
MasterChangeRequestService
DuplicateResolutionService
GoldenRecordService
DataQualityService
ImportStagingService
MasterScopePolicyService
EffectiveDatingService
MasterAuditService
```

## Required technical standards

- `/api/v1` versioning.
- Runtime request schema validation.
- Explicit read projections.
- No `SELECT *` for sensitive data.
- Optimistic locking.
- Idempotency.
- Effective dating.
- Server-side pagination.
- Transactional activation.
- Event outbox.
- Structured error codes.
- Correlation ID.
- Central audit redaction.
- Domain-event versioning.
- Query-performance tests.

---

# 18. Database Integrity Upgrade

## Required constraints

- Customer account must reference a Party.
- Supplier account must reference a Party.
- Employee must reference a Person Party.
- Role dates must not overlap incorrectly.
- Effective-date periods must not overlap where only one active value is allowed.
- Primary address must be unique per role and date.
- Primary bank account must be unique per account and usage.
- Product variant combination must be unique.
- UoM conversions must be valid and non-zero.
- Active HPP must be unique per product/effective period.
- Effective BOM must be unique per product/effective period.
- NPWP/NIK fingerprints must support duplicate detection.
- Supplier bank fingerprints must support duplicate prevention.
- Reference code must be unique by domain and scope.

## Required mechanisms

- Composite foreign keys.
- Unique indexes.
- Exclusion constraints for date ranges.
- Check constraints.
- Constraint triggers for cross-table integrity.
- Partial indexes for active values.
- Reconciliation queries.
- Migration tests.

---

# 19. Infrastructure and Release Audit

## Critical package finding

The audited workspace ZIP contains:

- `.env`.
- `.git`.
- `node_modules`.
- Runtime storage.
- Logs.
- Smoke-test screenshots.
- Generated PDF/XLSX artifacts.
- 17 PostgreSQL dump files.
- Development metadata.

This workspace must not be used as a deployment or vendor-sharing package.

## Existing clean-release result

The clean-release builder successfully produced:

- 297 release files.
- Latest migration: `039_account_roles_tax_rates.sql`.
- SHA-256 release fingerprint.

This clean-release mechanism should become the only approved packaging path.

## Secret-scanner limitation

The secret scanner reported:

```text
452 files scanned
0 findings
```

However, the scanner excludes several high-risk locations and file types, including `.env`, storage, dumps, PDFs, spreadsheets, images, and ZIP files.

Therefore, `0 findings` does not prove the workspace package is safe.

## Required pipeline

```text
Source Scan
→ Dependency Scan
→ Unit Test
→ Integration Test
→ Security Test
→ Build Clean Release
→ Final Artifact/DLP Scan
→ Generate SBOM
→ Sign Manifest
→ Verify Hash
→ Deploy UAT
→ Smoke Test
→ Data Reconciliation
→ UAT Approval
→ Production Release
```

VPS/cloud activation remains the final phase after all modules, security, backup, restore, migration rehearsal, and internal UAT pass.

---

# 20. Test Results

## Tests completed

Static and architecture-oriented tests:

```text
16 passed
0 failed
```

Coverage included:

- Application shell.
- Accessibility foundation.
- Semantic design tokens.
- Responsive behavior.
- Security headers.
- Path traversal protection.
- Fingerprinted release assets.
- Authorization matrix.
- 195 handler authorization coverage.
- Public endpoint allowlist.
- Migration sequencing and checksum.
- Backup encryption round-trip.
- Audit-partition contract.
- Modular frontend/backend architecture.

## Database-dependent tests

Relevant Master Data integration tests were attempted, but PostgreSQL was unavailable:

```text
ECONNREFUSED 127.0.0.1:5432
```

Result:

- 1 static permission test passed.
- 6 database-dependent tests were blocked.

These tests are **not validated** and must not be treated as passed.

Required rerun:

- Branch isolation.
- Employee data scope.
- Master lifecycle.
- Supplier bank maker-checker.
- Employee compensation maker-checker.
- Quality scan.
- Import.
- Duplicate detection.
- Migration integrity.
- RLS allow/deny.
- Cross-master IDOR.

---

# 21. Final Implementation Priority

## P0 — Stop-Ship Security

1. Remove secrets, dumps, runtime data, and development artifacts from release.
2. Rotate exposed credentials and encryption keys.
3. Audit all database dumps.
4. Enforce clean-release-only packaging.
5. Fix Employee list data exposure.
6. Enforce Employee branch and own-record scope.
7. Add PostgreSQL RLS.
8. Add central audit redaction.
9. Encrypt sensitive bank and personal fields.
10. Replace broad/static permissions with granular data policies.
11. Move exchange rate to maker-checker.
12. Rerun all PostgreSQL integration and IDOR tests.

## P1 — Production Complete

1. Implement generic Change Request Engine.
2. Block direct critical changes to active masters.
3. Add explicit API projections.
4. Create Reference Data Hub.
5. Build Import Staging Workbench.
6. Add server-side pagination for all tabs.
7. Add field-level access.
8. Add legal-entity/site usage.
9. Remove supplier legacy bank fields.
10. Add quality issue owner, SLA, waiver, and verification.
11. Redesign Master Data Overview and list/detail pages.
12. Add complete audit/data lineage.

## P2 — Tier-1 MDM

1. Unified Party/Business Partner.
2. Customer and Supplier account/site roles.
3. Duplicate Resolution Workbench.
4. Golden record.
5. Survivorship rules.
6. Cross-master fuzzy matching.
7. Customer hierarchy.
8. Supplier qualification.
9. Product classification and dimension groups.
10. Released-product legal-entity/site usage.
11. Configurable data-quality engine.
12. Scheduled activation and master-data distribution events.

## P3 — Advanced Enterprise Capabilities

1. External tax and legal-identity verification.
2. Bank-account verification integration.
3. Sanction/watchlist integration.
4. Address/geocoding validation.
5. MDM stewardship analytics.
6. Data-quality anomaly detection.
7. Master Data API/integration registry.
8. Cross-system source priority.
9. Data-retention and consent controls.
10. Advanced governance evidence packs.

---

# 22. Acceptance Gate

Master Data may be declared complete for MAT only when all conditions below pass.

```text
[ ] Unified Business Partner implemented or formally phased with compatibility layer
[ ] Critical active-master changes require Change Request
[ ] Duplicate resolution and golden-record controls operational
[ ] Employee list/detail/subresource scope secure
[ ] Field-level security operational
[ ] PostgreSQL RLS operational
[ ] Sensitive data encrypted
[ ] Audit redaction operational
[ ] FX maker-checker operational
[ ] Import staging and reconciliation operational
[ ] Data-quality rules configurable
[ ] Server-side pagination operational
[ ] Reference Data Hub operational
[ ] Product classification and dimensions operational
[ ] Customer/Supplier legal-entity usage operational
[ ] Critical and high security findings: zero unresolved
[ ] Integration tests pass
[ ] Migration tests pass
[ ] Backup and restore pass
[ ] Clean release pass
[ ] Internal UAT signed off
```

---

# 23. Final Conclusion

MAT ERP Master Data does **not need to be rebuilt from zero**.

The existing foundation is valuable and should be retained:

- Lifecycle.
- Effective dating.
- Supplier bank maker-checker.
- Employee compensation approval.
- Supplier performance scoring.
- BOM and HPP revisions.
- Product cost trace.
- Data-quality scan.
- Import worker.
- Audit.
- Idempotency.
- Clean-release builder.

The correct next step is to upgrade the system from a collection of mature master modules into one integrated **Master Data Governance platform**.

The five most important upgrades are:

1. **Unified Party/Business Partner**
2. **Change Request staging and activation**
3. **Duplicate resolution and golden record**
4. **Granular field/row security with PostgreSQL RLS**
5. **Governed data quality, import, lineage, and release controls**

After P0 and P1 are complete, Master Data can be considered production-ready for internal MAT use.

After P0–P3 are complete, the realistic target is:

> **95–97% enterprise-ready against the relevant Master Data Governance patterns used by SAP, Oracle, and Dynamics 365, while remaining lighter and easier to maintain.**
