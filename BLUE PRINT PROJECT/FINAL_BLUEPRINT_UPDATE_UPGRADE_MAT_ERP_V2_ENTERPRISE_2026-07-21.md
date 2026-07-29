> **BLUEPRINT KANONIS.** Dokumen ini adalah requirement baseline. Status
> implementasi dan evidence aktual berada di
> `../docs/audit/enterprise-blueprint-audit-2026-07-29.md`.

# FINAL BLUEPRINT UPDATE & UPGRADE MAT ERP V2

## Enterprise Integration Blueprint menuju pola SAP / Oracle / Dynamics 365

**Dokumen:** Final Enterprise Upgrade Blueprint  
**Aplikasi:** MAT ERP V2  
**Versi source yang diaudit:** 0.29.0  
**Tanggal:** 21 Juli 2026  
**Target penggunaan:** Internal Mandiri Abadi Teknik  
**Strategi deployment:** Development dan UAT melalui localhost/LAN; VPS/cloud production diaktifkan paling akhir setelah seluruh gate lulus.

---

# 1. Executive Summary

MAT ERP V2 **tidak perlu dibangun ulang dari nol**. Fondasi yang sekarang sudah mempunyai banyak komponen enterprise yang nyata:

- Modular monolith berbasis Node.js dan PostgreSQL.
- Lifecycle dokumen bisnis dan Master Data.
- Double-entry accounting dan posting profile.
- Quotation revision yang immutable.
- Purchase Request, RFQ, Purchase Order, Goods Receipt, QC, inventory ledger, Work Order, Delivery, Invoice, Payment, dan RMA.
- Maker-checker pada beberapa objek sensitif.
- MFA TOTP, session security, CSRF protection, rate limiting, dan audit trail.
- Event outbox, background jobs, migration checksum, backup, restore test, dan clean release builder.
- UI shell yang responsive, accessible, dan konsisten.

Namun sistem masih terlihat seperti **kumpulan modul yang berfungsi baik secara individual**, belum sepenuhnya menjadi satu platform ERP enterprise dengan:

1. Satu identitas pihak melalui **Business Partner / Party**.
2. Satu struktur organisasi dan security scope.
3. Satu generic Change Request dan Approval Engine.
4. Satu Work Item/Task Engine untuk Workspace.
5. Satu Document Graph untuk seluruh transaksi.
6. Satu Posting Engine dan subledger reconciliation.
7. Satu Semantic KPI dan Reporting Layer.
8. Satu dynamic authorization model berbasis role, duty, privilege, permission, dan data scope.
9. Satu immutable audit/evidence layer.
10. Satu deployment, observability, backup, dan disaster-recovery standard.

## 1.1 Status readiness saat ini

| Kategori | Kondisi Saat Ini | Target Setelah Blueprint |
|---|---:|---:|
| Workspace | 67/100 | 95–97/100 |
| Master Data | 68/100 | 95–97/100 |
| Organization | 74/100 | 95–97/100 |
| Sales | 65/100 | 95–97/100 |
| Operations | 66/100 | 95–97/100 |
| Finance | 71/100 | 95–97/100 |
| System | 72/100 | 95–97/100 |
| **Overall platform** | **69/100** | **95–97/100** |

## 1.2 Arti “100%” untuk MAT ERP

Setelah seluruh P0 dan P1 selesai, serta P2 yang relevan dengan operasi MAT diterapkan, sistem dapat dinyatakan:

> **100% complete untuk scope operasional internal MAT, enterprise-governed, production-ready, dan terintegrasi lintas kategori.**

Pernyataan tersebut **bukan berarti menyalin seluruh fitur SAP, Oracle, atau Dynamics 365**. Targetnya adalah mengambil pola kontrol yang relevan dari platform tier-1 tanpa membawa kompleksitas, biaya, dan beban pemeliharaan yang tidak diperlukan MAT.

---

# 2. Prinsip Arsitektur Final

## 2.1 Pertahankan Modular Monolith

Arsitektur final tetap:

```text
Browser / Optional Electron
        │
        ▼
MAT ERP Application
├── Workspace & Experience
├── Master Data Management
├── Organization Administration
├── Sales & Order Management
├── Operations & Supply Chain
├── Finance & Accounting
└── System & Platform Administration
        │
        ▼
PostgreSQL
├── Transactional tables
├── Read models / materialized views
├── Audit partitions
├── Event outbox
├── Job queue
└── Row-Level Security policies
```

Microservices **belum diperlukan** karena:

- Transaksi inventory, production, procurement, finance, dan tax membutuhkan konsistensi kuat.
- Deployment LAN menjadi lebih sederhana.
- Debugging, backup, dan restore lebih mudah.
- Tidak menambah network latency dan distributed-transaction complexity.
- Lebih ringan untuk infrastruktur MAT.

## 2.2 Shared Enterprise Engines

Semua kategori harus memakai mesin bersama berikut:

```text
Shared Enterprise Engines
├── Identity & Authorization Engine
├── Organization Scope Engine
├── Master Data Governance Engine
├── Change Request Engine
├── Workflow & Approval Engine
├── Work Item / Task Engine
├── Document Lifecycle Engine
├── Document Graph Engine
├── Numbering Engine
├── Pricing Engine
├── Credit & Risk Engine
├── Inventory Ledger Engine
├── Posting & Accounting Engine
├── Notification Engine
├── Audit & Evidence Engine
├── File & Document Engine
├── Semantic KPI Engine
├── Reporting Engine
└── Integration & Event Engine
```

Tidak boleh ada modul yang membuat versi sendiri dari approval, audit, numbering, scope, notifikasi, atau attachment tanpa alasan teknis yang kuat.

## 2.3 Satu Security Context

Setiap request backend membawa security context:

```text
Security Context
├── User ID
├── Session ID
├── Active Roles
├── Duties & Privileges
├── Legal Entity Scope
├── Business Unit Scope
├── Branch Scope
├── Plant Scope
├── Warehouse Scope
├── Department Scope
├── Project Scope
├── Field Classification Access
├── Privileged Session Status
└── Recent MFA Status
```

Context tersebut dipakai oleh:

- API authorization.
- Query filtering.
- PostgreSQL RLS.
- Field masking.
- Approval routing.
- Report authorization.
- Notification recipient resolution.
- Audit trail.
- Export and reveal control.

---

# 3. Final Information Architecture / Sidebar

```text
WORKSPACE
├── My Home
├── My Work
├── Approvals
├── Notifications
├── Reports & Insights
├── Calendar & Deadlines
├── Favorites & Recent
└── Workspace Settings

MASTER DATA
├── Master Data Control Center
├── Business Partners
├── Customers
├── Suppliers
├── Products & Services
├── Employees
├── Product Classification & Variants
├── BOM & Costing
├── Unit of Measure
├── Reference Data
├── Currency & Exchange Rates
├── Data Quality
├── Duplicate Management
├── Import & Data Migration
├── Change Requests
└── Master Data Audit & Governance

ORGANIZATION
├── Organization Control Center
├── Corporate Group / Enterprise
├── Legal Entities
├── Business Units
├── Branches & Locations
├── Plants / Workshops
├── Warehouses & Storage Structures
├── Departments & Value Streams
├── Positions & Job Structures
├── Cost Centers & Profit Centers
├── Ledgers & Fiscal Calendars
├── Purchasing & Sales Responsibilities
├── Organization Hierarchy Designer
├── Bank & Tax Identity
├── Signatory & Delegation of Authority
├── Documents & Licenses
├── Intercompany Relationships
├── Organization Change Requests
└── Organization Audit & Governance

SALES
├── Sales Control Tower
├── Accounts & Relationships
├── Pipeline
├── Inquiry & Quotation
├── Pricing & Margin
├── Customer PO
├── Sales Orders
├── Order Promising
├── Fulfilment Visibility
├── Contracts & Agreements
├── Customer Projects
├── Returns, Warranty & Claims
├── Credit & Collection Visibility
├── Sales Commission
├── Sales Analytics
└── Sales Configuration

OPERATIONS
├── Operations Control Tower
├── Demand & Supply Planning
├── Procurement & Sourcing
├── Production & Service Execution
├── Quality Management
├── Inventory Management
├── Warehouse Execution
├── Delivery & Logistics
├── Project Operations
├── Maintenance / EAM
└── Operations Configuration

FINANCE
├── Finance Control Center
├── Accounts Receivable
├── Accounts Payable
├── Cash & Bank
├── General Ledger
├── Fixed Assets
├── Budgeting & Forecast
├── Tax Control Center
├── Financial Close
├── Financial Reporting
└── Finance Configuration

PEOPLE & HR
├── Employee Administration
├── Attendance
├── Shift & Work Calendar
├── Leave
├── Payroll
├── Performance & Competency
└── Employee Self Service

SYSTEM
├── System Control Center
├── Identity & Access
├── Security Governance
├── Workflow Governance
├── Configuration Management
├── Integration Center
├── Platform Operations
├── Audit & Compliance
├── Release & Environment
└── Self Test & Diagnostics
```

## 3.1 Aturan navigasi

- Sidebar menampilkan **domain utama**, bukan daftar setiap jenis dokumen kecil.
- Submenu yang jarang digunakan ditempatkan dalam tab/detail workspace.
- “Payment Proposal” tidak berada di Operations; masuk Finance/AP/Treasury.
- Employee Master berada pada Master Data/People, sementara attendance, leave, dan payroll berada pada People & HR.
- Bank account dan Tax Identity dapat dibuka dari Organization, tetapi governance tetap memakai shared Change Request dan Approval Engine.
- Report sensitif tidak cukup disembunyikan di UI; backend harus memakai permission per report.

---

# 4. Arsitektur Penghubung Antar-Kategori

## 4.1 Unified Business Partner / Party

Satu perusahaan atau orang tidak boleh dicatat berkali-kali tanpa relasi.

```text
PARTY / BUSINESS PARTNER
├── Party ID
├── Type: Organization / Person
├── Legal & Display Names
├── Identifiers: NPWP, NIK, NIB, Registration
├── Addresses
├── Contacts
├── Tax Registrations
├── Bank Accounts
├── Relationships
├── Data Quality
├── Lifecycle
└── Roles
    ├── Customer
    ├── Supplier
    ├── Employee
    ├── Contact
    ├── Prospect
    ├── Carrier
    └── Service Provider
```

### Integrasi

- Sales memakai Customer role.
- Procurement memakai Supplier role.
- HR memakai Employee role.
- Finance memakai payer/payee and tax roles.
- Organization memakai legal entity and contact relationships.
- Workspace menampilkan task berdasarkan party dan ownership.

## 4.2 Organization Context

Setiap transaksi wajib memiliki konteks organisasi yang jelas:

```text
Enterprise
└── Legal Entity
    ├── Ledger
    ├── Business Unit
    ├── Branch / Site
    ├── Plant / Workshop
    ├── Warehouse
    ├── Department
    ├── Cost Center
    ├── Profit Center
    └── Project WBS
```

Tidak boleh menggunakan Branch sebagai Warehouse. Warehouse harus mempunyai storage location dan bin sendiri.

## 4.3 Document Graph

Semua dokumen harus terhubung melalui relational link, bukan hanya nomor atau JSON payload.

```text
Inquiry
→ Quotation Revision
→ Customer PO
→ Sales Order
→ Fulfilment Plan
├── Project
├── Work Order
├── Purchase Order
└── Stock Allocation
→ Delivery
→ Invoice
→ Receipt / Payment Allocation
→ Close
```

```text
MRP / Purchase Request
→ RFQ
→ Supplier Quotation
→ Award Decision
→ Purchase Order
→ Goods Receipt
→ Quality Inspection
→ Inventory
→ Supplier Invoice
→ Three-Way Match
→ Payment Proposal
→ Payment
```

Document Graph wajib mendukung:

- One-to-many.
- Many-to-one.
- Partial quantity.
- Multiple deliveries.
- Multiple receipts.
- Multiple invoices.
- Revision and replacement.
- Cancellation and reversal.
- Line-level lineage.
- Full audit trail.

## 4.4 Work Item / Task Engine

Approval, exception, review, correction, and operational tasks harus menjadi objek formal.

```text
WORK ITEM
├── Type
├── Source Module
├── Source Entity / Line
├── Assignee User / Team / Role
├── Organization Scope
├── Priority
├── Risk
├── Due Date / SLA
├── Status
├── Claim State
├── Required Actions
├── Completion Condition
├── Evidence
└── Audit History
```

Notifikasi hanya memberi tahu. Membaca notifikasi **tidak boleh** menutup pekerjaan.

## 4.5 Event and Integration Model

Setiap perubahan penting menghasilkan versioned domain event melalui transactional outbox.

Contoh:

```text
BusinessPartnerActivated
CustomerCreditChanged
QuotationApproved
SalesOrderReleased
MaterialShortageDetected
PurchaseOrderApproved
GoodsReceived
QualityInspectionFailed
LotReleased
ProductionCompleted
DeliveryPosted
InvoicePosted
PaymentApplied
AccountingPeriodClosed
RoleAssignmentActivated
HierarchyPublished
```

Consumer event:

- Workspace task/read model.
- Notification.
- Accounting posting.
- Audit evidence.
- Reporting/KPI projection.
- Integration connector.

---

# 5. Final Update — Workspace

## 5.1 Target Workspace

Workspace menjadi satu pintu masuk personal, bukan dashboard angka yang sama untuk seluruh user.

### My Home

- Role-based and permission-based cards.
- Legal Entity/Branch selector.
- Today, Needs Attention, Operational Pulse, Quick Actions.
- Data freshness and last refresh.
- Favorites and recent records.
- Card personalization.

### My Work

- Assigned to Me.
- Claimed by Me.
- Created by Me.
- Returned for Revision.
- Overdue and At Risk.
- Following.
- Completed Recently.

### Approvals

- Approve.
- Reject.
- Return for Revision.
- Request Information.
- Delegate.
- Reassign.
- Claim/Unclaim.
- Put on Hold.
- Escalate.
- View evidence and before/after diff.

### Notifications

- Per-recipient delivery/read state.
- Legal Entity, Branch, Plant, Warehouse, Department, and Project scope.
- Category and urgency.
- Acknowledgement for critical alert.
- Notification preferences.
- Email/WA/push delivery status.

### Reports & Insights

- Permission per report.
- View/export/schedule/share permissions separated.
- Restricted report watermark.
- Export reason and recent MFA.
- Saved filters and scheduled delivery.

## 5.2 Critical updates

1. Replace global dashboard permission with card-level KPI entitlements.
2. Close cross-branch inventory KPI leakage.
3. Create one Semantic KPI Catalog.
4. Implement unified work-item engine.
5. Separate notification read from task completion.
6. Create per-recipient notification table.
7. Add delegation, vacation, SLA, and escalation.
8. Make global search permission-aware and scope-aware.
9. Replace mobile approval tables with approval cards.
10. Create dedicated Workspace read models/materialized views.

## 5.3 Linking

- Every module creates Work Items and notifications through shared services.
- Workspace never calculates business facts independently.
- KPI values come from Finance/Operations/Sales semantic projections.
- Approval actions call the source-module command handler.
- Global search points to the same security policy as source detail pages.

---

# 6. Final Update — Master Data

## 6.1 Master Data Control Center

- Total records by domain.
- Data quality score.
- Pending Change Requests.
- Duplicate candidates.
- Expired documents.
- Unverified bank/tax data.
- Steward workload.
- Quality trend.

## 6.2 Business Partner

Implement unified Party model with role activation:

- Customer Account.
- Supplier Account.
- Contact.
- Employee link.
- Multiple addresses and usages.
- Multiple tax registrations.
- Relationship hierarchy.
- Effective dating.

## 6.3 Generic Change Request Engine

Active master data cannot be edited directly for sensitive fields.

```text
Draft Change
→ Validate
→ Duplicate Check
→ Impact Analysis
→ Review
→ Approve
→ Scheduled Activation
→ Active Version
→ Immutable Audit
```

Functions:

- Before/after comparison.
- Supporting documents.
- Rework.
- Reject.
- Withdraw.
- Delegate.
- SLA and escalation.
- Conflict detection.
- Activation rollback.

## 6.4 Duplicate and Golden Record

- Exact and fuzzy matching.
- Cross-master customer/supplier comparison.
- Name, tax ID, address, email, and phone similarity.
- Confidence score.
- Merge/link/unmerge.
- Survivorship rules.
- Source priority.
- Transaction relinking.
- Golden Record history.

## 6.5 Product and Service Master

Add:

- Structured classification.
- Attribute groups.
- Product template.
- Variant dimensions.
- Barcode/GTIN.
- Manufacturer and MPN.
- HS code and country of origin.
- Tracking dimensions.
- Lot/serial profile.
- Procurement and inventory settings per site.
- Safety stock and reorder policy.
- Quality inspection profile.
- Engineering Change Order.

## 6.6 Reference Data Hub

Govern:

- Department and position values.
- Product category/material/grade.
- UoM and conversions.
- Payment terms.
- Tax codes.
- Bank codes.
- Document types.
- Reason codes.
- Countries and geographic references.
- Status translations.

Every value needs owner, effective date, lifecycle, usage count, multilingual label, and audit.

## 6.7 Import Staging

```text
Upload
→ Map Columns
→ Preview
→ Validate
→ Duplicate Check
→ Correct Errors
→ Review
→ Atomic Commit
→ Reconciliation
→ Audit
```

Never import directly into active master tables.

## 6.8 Linking

- Sales and Procurement reference Party and Product IDs, not duplicated names.
- Organization and Employee share Position/Department references.
- Finance references Party account roles and tax profiles.
- Every transaction stores a stable ID plus printable snapshot.
- Product/BOM/HPP activation emits events to Operations and Sales Pricing.

---

# 7. Final Update — Organization

## 7.1 Workbenches to complete

Create full CRUD + governance for:

- Corporate Group / Enterprise.
- Legal Entity.
- Business Unit.
- Branch/Location.
- Plant/Workshop.
- Warehouse/Storage/Bin.
- Department/Value Stream.
- Cost Center/Profit Center.
- Job/Position.
- Ledger/Fiscal Calendar.
- Purchasing and Sales responsibilities.

## 7.2 Versioned Purpose-Based Hierarchy

Hierarchy is a managed object, not only `parent_id`.

Purposes:

- Legal structure.
- Management reporting.
- Financial reporting.
- HR reporting.
- Procurement responsibility.
- Sales responsibility.
- Approval authority.
- Security scope.
- Cost allocation.

Lifecycle:

```text
Draft
→ Validate
→ Review
→ Approve
→ Schedule Publication
→ Publish
→ Active
→ Superseded
```

Add:

- Effective-date simulation.
- Draft versus active comparison.
- Cycle detection.
- Employee impact.
- Open transaction impact.
- Security-access impact.
- Rollback.

## 7.3 Job, Position, and Assignment

```text
JOB
├── Job Family
├── Grade
├── Competencies
└── Standard Responsibilities

POSITION
├── Department
├── Reports-to Position
├── Cost Center
├── Location
├── Authorized Headcount
├── Approval Authority
└── Effective Dates

POSITION ASSIGNMENT
├── Employee
├── Position
├── Start / End Dates
├── Primary / Acting / Additional
└── Assignment Status
```

## 7.4 Delegation of Authority

Authority based on:

- Legal Entity.
- Branch.
- Document type.
- Transaction type.
- Amount range.
- Position.
- Employee delegate.
- Effective dates.
- Required MFA.
- Approval sequence.

## 7.5 Bank, Tax, Signatory, and License Governance

- Maker-checker.
- Recent MFA for approval/reveal.
- Encrypted sensitive fields.
- Lifecycle Draft → Submitted → Verified → Approved → Active.
- Expiry reminders.
- Versioned supporting evidence.
- Reveal/export audit.

## 7.6 Linking

- Organization scope drives every module’s data access.
- Ledger and fiscal calendar drive Finance periods.
- Plant and Warehouse drive Operations planning and stock.
- Sales/Purchasing responsibility drives document ownership and approval.
- Position hierarchy drives approval routing and user access.
- Cost/Profit Center flows to journal dimensions and reporting.

---

# 8. Final Update — Sales

## 8.1 Sales Control Tower

KPI:

- Pipeline value.
- Weighted forecast.
- Quotation value and win rate.
- Order intake and order book.
- Gross margin.
- Expiring quotations.
- Credit holds.
- Orders at risk.
- Late promises.
- Open returns/warranty claims.

## 8.2 Server-Authoritative Pricing Engine

Pricing must be calculated in backend from:

```text
Customer / Contract
+ Product or Service
+ Quantity and UoM
+ Currency
+ Price List
+ Effective Date
+ Discount / Surcharge
+ Freight
+ Tax
+ Margin Policy
= Authoritative Price
```

Controls:

- Header and line reconciliation.
- HPP snapshot.
- Minimum margin.
- Price override workflow.
- Customer-specific and quantity-break pricing.
- Contract price priority.
- Currency rate snapshot.
- Effective dating.

## 8.3 Customer PO Governance

- Approved quotation only.
- Customer must match quotation.
- Unique PO number per customer/legal entity.
- Attachment and malware scan.
- Line-level comparison.
- Discrepancy workflow.
- Amendment versions.
- Formal relational link.

## 8.4 Typed Sales Order and Fulfilment Lines

Each line stores:

- Product/service.
- Requested date.
- Promised date.
- Source plant/warehouse.
- Fulfilment mode: Stock, Make, Buy, Service, Project.
- Ordered, allocated, shipped, invoiced, returned quantities.
- Backorder quantity.
- Credit/delivery/billing hold.
- Pricing and tax snapshot.

## 8.5 ATP / CTP / Order Promising

- Available-to-Promise from inventory and inbound supply.
- Capable-to-Promise from production capacity.
- Supplier lead time.
- Plant and warehouse calendars.
- Partial delivery rules.
- Complete-delivery rule.
- Promise revision with customer notification.

## 8.6 Credit Exposure

```text
Open AR
+ Open Sales Orders
+ Unbilled Deliveries
+ Billing Commitments
+ Current Order
- Guarantees / Collateral
= Total Exposure
```

Checks at:

- SO submit.
- Order change.
- Delivery release.
- Invoice posting.

Use customer concurrency lock and maker-checker credit release.

## 8.7 Contracts and Agreements

- Blanket order.
- Quantity/value commitment.
- Contract price.
- Effective dates.
- Release orders.
- Amendment and renewal.
- SLA and penalty.
- Utilization monitoring.

## 8.8 Returns, Warranty, and Claims

Maximum returnable:

```text
Delivered Quantity
- Completed Returns
- Open RMA
= Available Return Quantity
```

RMA flow:

```text
Request
→ Eligibility Check
→ Return Authorization
→ Return Receipt
→ Inspection
→ Disposition
├── Restock
├── Repair Work Order
├── Replace Sales Order
├── Scrap
└── Supplier Recovery
→ Credit Memo / Closure
```

## 8.9 Linking

- Quotation uses Product, Customer, HPP, Pricing, Tax, and Approval engines.
- SO creates fulfilment demand for Operations.
- Delivery updates credit exposure and invoicing availability.
- Invoice and receipt are handled by Finance.
- RMA links to original delivery, invoice, lot/serial, QC, and accounting credit memo.

---

# 9. Final Update — Operations

## 9.1 Operations Control Tower

KPI:

- Material shortages.
- Capacity overload.
- Late Work Orders.
- QC holds.
- Receiving backlog.
- Put-away backlog.
- Picking backlog.
- Shipment delay.
- Inventory accuracy.
- Supplier delivery risk.
- Production variance.

## 9.2 Site-Aware MRP

MRP Run context:

- Legal Entity.
- Plant.
- Warehouse.
- Planning horizon.
- Demand/supply cut-off.
- Calendar.
- Planning parameters.
- Frozen snapshot/version.

Output:

- Planned Purchase Order.
- Planned Production Order.
- Planned Transfer Order.
- Reschedule in/out.
- Cancel/expedite suggestion.
- Shortage exception.
- Capacity exception.
- Pegging from demand to supply.

Run MRP asynchronously through background jobs.

## 9.3 Procurement and Sourcing

Add:

- Procurement category.
- Buyer assignment.
- Supplier agreement and blanket PO.
- Supplier confirmation.
- ASN.
- Weighted RFQ award criteria.
- Maker-checker award.
- Landed-cost allocation.
- Procurement exception queue.
- Purchase return and supplier claim.

## 9.4 Line-Level Three-Way Match

```text
PO Line
↔ Goods Receipt Line
↔ Supplier Invoice Line
```

Validate:

- Product/service.
- Quantity.
- UoM conversion.
- Unit price.
- Tax.
- Discount.
- Freight.
- Currency.
- Tolerance.
- QC accepted quantity.

## 9.5 Partial and Multiple Receipt

Support:

- Multiple GR per PO line.
- Open quantity.
- Over/under delivery tolerance.
- Partial acceptance.
- Delivery-complete flag.
- Receipt correction/reversal.
- Return to vendor.

## 9.6 Production and Shop Floor

Add:

- Routing master and revisions.
- Operation sequence and predecessor.
- Parallel/overlap operations.
- Setup/run/queue/move time.
- Work-center calendars and capacity.
- Production scheduling/Gantt.
- Partial confirmations.
- Material staging.
- Backflush.
- Scrap/reason.
- Rework route/order.
- Subcontract operations.
- Co-product/by-product.
- WIP accounting.
- OEE and downtime.

Completion gate:

```text
Operations Completed
+ Materials Reconciled
+ Finished Goods Reported
+ Final QC Passed
+ Critical NCR Closed
+ Lot Released
+ Costing Completed
= Work Order Completed
```

## 9.7 Quality Management

Implement:

- Quality plans.
- Inspection stages and characteristics.
- Specification limits.
- Sampling plans/AQL.
- Measurement methods.
- Numeric results.
- Usage decision.
- NCR lifecycle.
- Root cause analysis.
- CAPA.
- Concession/deviation.
- Supplier corrective action.
- CoA/CoC.
- Calibration.
- Quality-cost analytics.

## 9.8 Inventory and Warehouse

Migrate from Branch-as-Warehouse to:

```text
Plant
└── Warehouse
    └── Storage Location
        └── Bin
```

Implement:

- Receiving.
- Inspection.
- Put-away.
- Replenishment.
- Reservation.
- Picking.
- Packing.
- Staging.
- Loading.
- Shipping.
- Barcode/QR.
- Lot/serial.
- FEFO.
- Cycle count.
- Handling units/license plates.
- Mobile warehouse task.

Stock opname:

- Blind count.
- Movement freeze/controlled window.
- Count and recount.
- Variance threshold.
- Counter cannot approve.
- Reason code and evidence.

## 9.9 Project Operations

- WBS designer.
- Schedule and milestone.
- Resource plan.
- Project procurement and inventory.
- Budget and forecast.
- Time and expense.
- Progress and earned value.
- Milestone billing.
- Change orders.
- Project profitability and close.

## 9.10 Maintenance / EAM

- Equipment master.
- Functional locations.
- Preventive maintenance plans.
- Breakdown Work Orders.
- Meter readings.
- Spare-part reservations.
- Technician assignment.
- Calibration.
- Downtime.
- MTBF/MTTR.
- Maintenance cost.

## 9.11 Linking

- Sales demand feeds planning.
- MRP creates planned orders, not direct uncontrolled documents.
- Procurement receipts feed QC and inventory.
- Production consumption and output update inventory and Finance.
- Delivery consumes stock and updates Sales fulfilment.
- All material movements generate accounting events based on posting profile.

---

# 10. Final Update — Finance

## 10.1 Finance Control Center

Context:

- Legal Entity.
- Ledger.
- Accounting period.
- Reporting currency.
- Close status.
- Data freshness.

KPI:

- Cash position.
- AR/AP outstanding.
- Overdue receivables.
- Payments due.
- Unreconciled bank lines.
- Unposted journals.
- Budget variance.
- Tax exposure.
- Close readiness.

## 10.2 General Ledger

Add:

- Chart of Accounts workbench.
- Account hierarchy.
- Account type/subtype.
- Control account flag.
- Open-item management.
- Posting block.
- Journal batches.
- Journal source/category.
- Recurring journals.
- Accrual and deferral.
- Auto-reversal.
- Allocation journals.
- FX revaluation.
- Currency translation.
- Intercompany journals.
- Adjustment periods.
- Year-end retained earnings.
- Parallel ledgers when required.
- Dimensions at journal-line level.

Posted journals are append-only. Corrections use reversal and repost.

## 10.3 Accounting Period

Make period specific to:

```text
Legal Entity
+ Ledger
+ Fiscal Calendar
+ Module: GL/AR/AP/FA/Inventory/Tax
+ Period
```

Backend close must enforce full closing checklist, not only trial balance/unposted documents.

## 10.4 Accounts Receivable

- Credit/debit memo.
- Customer prepayment.
- Unapplied/on-account receipt.
- Short payment/overpayment.
- Write-off.
- Receipt batch.
- Customer statement.
- Dispute management.
- Promise to pay.
- Collector work queue.
- Installments.
- Configurable aging.
- Realized FX gain/loss.

Payment allocation must be idempotent and concurrency-safe.

## 10.5 Accounts Payable

- Invoice distribution lines.
- Two/three-way-match exceptions.
- Holds and release.
- Supplier prepayments.
- Debit/credit memo.
- Duplicate invoice scoring.
- Recurring invoices.
- Payment proposal.
- Payment run.
- Bank selection.
- Payment method/file.
- Remittance advice.
- Withholding tax per line.

## 10.6 Cash and Bank

- Bank statement header and lines.
- Account-level reconciliation.
- Opening/closing statement balances.
- Configurable match rules and tolerances.
- One-to-one, one-to-many, many-to-one matching.
- Bank fee and interest.
- Internal transfer.
- Cash positioning.
- Liquidity forecast.
- Reconciliation approval.

## 10.7 Fixed Assets

- Corporate and tax books.
- Multiple depreciation methods and conventions.
- Capitalization/CIP.
- Transfer.
- Split/merge.
- Reclassification.
- Impairment.
- Revaluation.
- Disposal with proceeds linkage.
- Reinstatement.
- Physical verification.
- Barcode/QR.
- Component assets.

## 10.8 Budgeting and Forecasting

- Operating budget.
- Revenue and expense budget.
- CAPEX.
- Headcount.
- Project budget.
- Scenarios and versions.
- Workflow.
- Transfer.
- Commitment/encumbrance.
- Actual vs budget.
- Rolling forecast.
- Variance explanation.
- Owner sign-off.

## 10.9 Tax

- Tax master effective dating.
- Maker-checker tax-rate changes.
- Tax-to-GL reconciliation.
- PPN and withholding reconciliation.
- Faktur Pajak lifecycle.
- Replacement/cancellation.
- Export evidence.
- Tax-period close.

## 10.10 Financial Close

```text
Run Checklist
→ Freeze Evidence Snapshot
→ Resolve Failures
→ Review Warnings/Waivers
→ Finance Approval
→ Controller Approval
→ Owner Approval
→ Close Module
→ Close Ledger Period
→ Publish Reports
```

## 10.11 Financial Reporting

- Cash Flow Statement.
- Changes in Equity.
- Comparative P&L/Balance Sheet.
- Budget vs Actual.
- Cost/profit center reports.
- Project/customer/product profitability.
- Segment reporting.
- Report layout designer.
- Drill-through to journal/source document.
- Report package and sign-off.
- Consolidation/elimination when needed.

Unmapped account must block publication; it must not be silently added to Equity.

## 10.12 Linking

- Sales/Operations emit accounting events.
- Posting Engine uses immutable configuration snapshots.
- AR/AP subledgers reconcile to GL control accounts.
- Inventory and Work Order variance post automatically.
- Tax derives from source lines and reconciles to GL.
- Financial reports drill down to journal, source line, approval, and audit.

---

# 11. Final Update — System

## 11.1 Dynamic Authorization

Replace static source-code role grants with database-backed model:

```text
ROLE
└── DUTY
    └── PRIVILEGE
        └── PERMISSION
            ├── Resource
            ├── Operation
            ├── Data Scope
            └── Conditions
```

Support:

- Multiple roles per user.
- Effective dates.
- Temporary role.
- Data scope per assignment.
- Versioned role publication.
- Effective-access report.
- SoD simulation before activation.

## 11.2 Identity Lifecycle

```text
Joiner
→ Provision
→ Assign Roles
→ Certify
→ Move/Transfer
→ Suspend
→ Terminate
→ Retain Evidence
```

Add:

- Employee-to-user provisioning.
- Start-date activation.
- Auto-disable at termination.
- Manager/sponsor.
- Dormant-account policy.
- Service-account owner.
- API client lifecycle.
- Access expiry.
- SSO OIDC/SAML and SCIM in later phase.

## 11.3 Privileged Access

- Mandatory MFA for Owner/System/Security/Finance privileged users.
- Passkey/WebAuthn and hardware key in P2.
- Dedicated privileged session.
- Time-bound emergency access.
- Approval and ticket/reason.
- Full action recording.
- Automatic expiry.
- Post-use review.

Emergency access must be integrated into runtime authorization or disabled until complete.

## 11.4 Audit and Evidence

- Central AuditRedactionService.
- Field classification: Public, Internal, Confidential, Restricted, Secret.
- INSERT-only runtime privilege for audit tables.
- No update/delete/truncate.
- Safe default privileges for future partitions.
- Hash chain or signed audit batch.
- Immutable offsite copy/WORM.
- Audit every reveal, export, and audit-log access.

Separate:

- Authentication audit.
- Security administration audit.
- Data-access audit.
- Business transaction audit.
- Configuration audit.
- Export/reveal audit.

## 11.5 Authentication

- Upgrade password hashing with versioned migration.
- Mandatory MFA enrollment for privileged accounts.
- Existing factor required to disable/change MFA.
- Recovery codes.
- Factor-change notification.
- One-time secure password reset link.
- Avoid showing temporary password in general UI.
- Risk-based authentication in later phase.

## 11.6 Configuration Management

Separate configuration domains:

- Organization.
- Finance.
- Tax.
- Document.
- Security.
- Integration.
- Platform.

Configuration lifecycle:

```text
Draft
→ Validate
→ Impact Analysis
→ Review
→ Approve
→ Schedule
→ Activate
→ Verify
→ Rollback
```

Add environment comparison, configuration packages, feature flags, and Dev → UAT → Production promotion.

## 11.7 Integration Center

- API clients.
- OAuth/service credentials.
- Webhooks.
- Email/WA providers.
- Device/attendance connectors.
- File imports.
- Connector health.
- Retry/dead-letter.
- Rate limits.
- Mapping/version.
- Integration audit.

## 11.8 Platform Operations

- Persistent metrics/time-series.
- Structured logs.
- Distributed traces/correlation IDs.
- CPU, memory, disk, event-loop, and DB pool metrics.
- Slow query and lock monitoring.
- Queue age/dead-letter trend.
- Backup/restore status.
- Certificate expiry.
- SLI/SLO and alert escalation.

## 11.9 Backup and Recovery

- Encrypt local and offsite backup.
- Key rotation and recovery procedure.
- Immutable backup copy.
- Business-aware restore test:
  - Row counts.
  - Referential integrity.
  - Trial balance.
  - AR/AP reconciliation.
  - Inventory reconciliation.
  - Role integrity.
  - Attachment consistency.
  - Application smoke test.
- Record actual RPO/RTO.

## 11.10 Self Test

Self-test must produce evidence, not hard-coded PASS:

- Test name.
- Build and migration version.
- Expected/actual result.
- Environment.
- Evidence ID.
- Start/end time.
- Owner.
- Evidence expiry.

Release gate accepts only current evidence matching the release build.

---

# 12. Shared Security Blueprint

## 12.1 Preventive Separation of Duties

Examples:

```text
Create ≠ Approve
Approve ≠ Pay
Pay ≠ Reconcile
Reconcile ≠ Close
Close ≠ Audit
Quotation Preparer ≠ Pricing Approver
Buyer ≠ RFQ Award Approver
Receiver ≠ Supplier Invoice Approver
Stock Counter ≠ Opname Approver
QC Inspector ≠ Failed-Lot Release Approver
Role Requester ≠ Role Approver
Configuration Maker ≠ Configuration Activator
```

## 12.2 Field-Level Security

Fields requiring separate permission/masking:

- Salary and compensation.
- Bank account number.
- Tax identity.
- Employee restricted record.
- Supplier bank.
- Customer credit data.
- Cost/HPP and margin.
- Security configuration.
- Encryption/secret metadata.

## 12.3 PostgreSQL Row-Level Security

Apply to sensitive transaction/master tables based on:

- Legal Entity.
- Branch.
- Plant.
- Warehouse.
- Department.
- Project.
- Ownership/team assignment.

Use default-deny, test both API and direct-database policies, and ensure backup/administrative roles have explicit handling.

## 12.4 Step-Up Authentication

Recent MFA required for:

- Bank reveal/change/approval.
- Salary and restricted employee data.
- Credit override.
- High-value PO/payment approval.
- Inventory adjustment.
- Failed-lot release.
- Period close/reopen.
- Role/permission activation.
- Emergency access.
- Backup restore.
- Sensitive export.

## 12.5 Encryption and Secrets

- No `.env` or secrets in distribution ZIP.
- Rotate all secrets exposed in workspaces.
- Use field-level encryption for bank/restricted data.
- Use deterministic fingerprint only for duplicate checking.
- Use Vault/KMS when production is activated.
- Separate application runtime, migration, backup, and audit DB users.

---

# 13. Data Architecture and Database Upgrade

## 13.1 Typed Core Tables

Generic `business_documents` may remain as shared lifecycle/registry, but critical domains need typed tables:

- Sales order headers/lines/schedules.
- Fulfilment lines.
- Purchase order lines/schedules.
- Goods receipt lines.
- Supplier invoice distributions.
- MRP runs/demand/supply/planned orders/pegging.
- Production routing/operations/confirmations.
- Quality plans/results/NCR/CAPA.
- Warehouse tasks/handling units.
- Journal batches/lines/dimensions.
- Work items.
- Notifications/recipients.
- Change requests/proposed values.
- Hierarchy versions/nodes.
- Business partner roles/relationships.

## 13.2 Effective Dating

All critical setup/master assignments use:

- `valid_from`.
- `valid_to`.
- `version`.
- `status`.
- `change_request_id`.
- `approved_by`.
- `activated_at`.

Prevent overlapping active periods through constraints.

## 13.3 Optimistic Locking and Idempotency

Every write endpoint that may be retried needs:

- Version/ETag.
- Idempotency-Key.
- Request fingerprint.
- Unique operation ID.
- Conflict response.
- Concurrency tests.

Mandatory for:

- Document creation/conversion.
- Payment allocation.
- Inventory movement.
- Goods receipt.
- Production confirmation.
- Approval actions.
- Import commit.
- Change Request activation.

## 13.4 Read Models

Create dedicated projections/materialized views for:

- Workspace cards.
- Executive dashboard.
- Sales Control Tower.
- Operations Control Tower.
- Finance Control Center.
- Data Quality.
- Aging.
- Close readiness.

Do not load all business documents and aggregate them repeatedly in Node.js.

---

# 14. API and Integration Standards

## 14.1 API

- Version endpoints under `/api/v1`.
- Runtime request/response schema validation.
- Consistent error codes.
- Correlation ID.
- Pagination, filtering, sorting, and field selection.
- Idempotency standard.
- ETag/version conflict.
- Permission and scope checks centralized.
- OpenAPI documentation generated from contract.

## 14.2 Domain Events

Event envelope:

```json
{
  "eventId": "uuid",
  "eventType": "SalesOrderReleased.v1",
  "occurredAt": "ISO-8601",
  "aggregateType": "SALES_ORDER",
  "aggregateId": "uuid",
  "legalEntityId": "uuid",
  "branchId": "uuid",
  "actorId": "uuid",
  "correlationId": "uuid",
  "payload": {}
}
```

## 14.3 File and Document Management

- Malware scan/quarantine.
- MIME and signature validation.
- File classification.
- Versioning.
- Retention and legal hold.
- Access scope.
- Download/reveal audit.
- Document snapshot for issued commercial/legal documents.
- Object storage abstraction for future cloud migration.

---

# 15. UI/UX Enterprise Design System

## 15.1 Visual Formula

Global:

```text
85% Clean Enterprise
10% Pearl Glass
5% Cute Clay & Motion
```

System/Finance screens may reduce clay to 2–3%. Master Data/Organization/Workspace may use 5–10% for onboarding, empty states, and KPI icons.

## 15.2 Palette

- Pearl White and Cloud White: background.
- Deep Navy: structure and navigation.
- Azure Blue: primary interaction.
- Champagne Gold: authority, approval, premium accent.
- Mint Green: active, posted, reconciled, success.
- Amber: warning and review.
- Coral: critical, rejected, overdue.
- Lavender: information and planning.

## 15.3 Page Templates

### Control Center

- Context selector.
- KPI cards.
- Exception panels.
- Trends.
- Quick actions.
- Recent activities.
- Role-based content.

### List Page

- Breadcrumb and title.
- KPI summary.
- Saved views.
- Search and advanced filter.
- Column chooser.
- Server pagination.
- Bulk actions.
- Export permissions.

### Detail 360

- Entity header.
- Lifecycle status.
- Quality/risk score.
- Scope and owner.
- Last verified/updated.
- Pending Change Request.
- Sticky tabs and actions.
- Related document graph.
- Audit timeline.

### Workbench

- Queue/list.
- Main detail.
- Evidence/validation drawer.
- Decision actions.
- Keyboard shortcuts.
- Autosave draft.

## 15.4 Cute Clay Usage

Use for:

- Module icons.
- Empty states.
- Onboarding.
- Success state.
- High-level illustrative KPI.
- Organization buildings.
- Warehouse/factory/forklift.
- Approval/security shield.

Do not use for:

- Dense tables.
- Audit evidence.
- Journal lines.
- Tax records.
- Sensitive financial figures.
- Critical approval decisions.

## 15.5 Mobile

Mobile is task-oriented:

- Approval cards.
- Warehouse scan tasks.
- QC inspection cards.
- Attendance/ESS.
- Delivery confirmation.
- Quick status and evidence capture.

Do not simply shrink wide desktop tables.

## 15.6 Performance Budget

- Initial shell should remain lightweight.
- Lazy-load module assets.
- Virtualize long tables.
- Server-side pagination.
- Avoid full-page rerender on every event.
- Cache keys include user/scope/permission.
- Use stale-while-revalidate for non-critical dashboards.
- Critical approvals always load current detail before decision.

---

# 16. Infrastructure and Release Architecture

## 16.1 Environment Strategy

```text
Local Development
→ LAN Integration
→ LAN UAT
→ Release Candidate
→ Production Readiness Gate
→ VPS/Cloud Production Activation
```

VPS remains **last**, after:

- Modules complete.
- Tests pass.
- Security remediation complete.
- Backup/restore validated.
- UAT signed off.
- Clean release generated.

## 16.2 Release Pipeline

```text
Source Scan
→ Dependency Scan
→ Unit Tests
→ Integration Tests
→ Authorization/IDOR/RLS Tests
→ Security Tests
→ UI/A11y Tests
→ Build Assets
→ Build Clean Release
→ Final Artifact/DLP Scan
→ Generate SBOM
→ Sign Manifest
→ Verify Hash
→ Deploy to UAT
→ Smoke & Reconciliation
→ Approval
→ Production Deploy
→ Post-Deployment Verification
```

## 16.3 Release Hygiene

Distribution package must exclude:

- `.env`.
- `.git`.
- `node_modules`.
- Runtime logs.
- Screenshots.
- Database dumps.
- Generated user artifacts.
- Backup folders.
- Agent/tool metadata.

## 16.4 Production Topology

Initial enterprise-ready topology:

```text
Users
  │ HTTPS
Reverse Proxy / TLS
  │
MAT ERP Application Service
  │
PostgreSQL Primary
  ├── Encrypted Backups
  ├── Offsite Immutable Copy
  └── Optional Standby (later)

Observability
├── Metrics
├── Logs
├── Traces
└── Alerts
```

---

# 17. End-to-End Process Integration

## 17.1 Inquiry to Cash

```text
Inquiry
→ Quotation
→ Approval
→ Customer PO
→ Sales Order
→ Credit Check
→ Promise/Fulfilment
→ Production/Procurement/Stock
→ Delivery
→ Invoice
→ Receipt
→ Cash Application
→ Collection
→ Close
```

## 17.2 Source to Pay

```text
Demand / PR
→ Budget Check
→ RFQ
→ Award
→ PO
→ Supplier Confirmation
→ Goods Receipt
→ QC
→ Supplier Invoice
→ Three-Way Match
→ Payment Proposal
→ Approval
→ Payment
→ Bank Reconciliation
```

## 17.3 Plan to Produce

```text
Demand
→ MRP
→ Planned Production Order
→ Work Order
→ Material Staging
→ Operations
→ QC
→ Finished Goods Receipt
→ Costing & Variance
→ Completion
```

## 17.4 Inventory to Deliver

```text
Receive
→ Inspect
→ Put-away
→ Reserve
→ Pick
→ Pack
→ Stage
→ Load
→ Ship
→ Proof of Delivery
```

## 17.5 Project to Profit

```text
Customer Order
→ Project/WBS
→ Budget & Schedule
→ Procurement/Production/Service
→ Time/Expense/Material
→ Progress/Milestone
→ Billing
→ Collection
→ Profitability
→ Close
```

## 17.6 Hire to Retire

```text
Candidate/Employee Master
→ Position Assignment
→ Access Provisioning
→ Attendance/Leave
→ Payroll
→ Transfer/Promotion
→ Performance
→ Termination
→ Access Revocation
→ Evidence Retention
```

## 17.7 Record to Report

```text
Subledger Events
→ Posting
→ Reconciliation
→ Adjustment
→ Period Close
→ Financial Statements
→ Review & Sign-off
→ Audit Evidence
```

---

# 18. Implementation Roadmap

## Phase 0 — Stop-Ship Security and Data Integrity

**Target:** Menutup risiko yang dapat menyebabkan data bocor, double posting, salah scope, atau release tidak aman.

1. Rotate exposed secrets and credentials.
2. Quarantine unsafe workspace ZIP and audit database dumps.
3. Use clean release artifact only.
4. Add final artifact/DLP scan.
5. Enforce Legal Entity/Branch/Plant/Warehouse scope.
6. Implement PostgreSQL RLS for critical tables.
7. Replace static runtime authorization design.
8. Implement multiple role and granular permissions.
9. Fix Workspace KPI/report/notification authorization.
10. Make pricing server-authoritative.
11. Complete Customer PO backend validation.
12. Complete credit exposure and delivery recheck.
13. Fix RMA quantity/value validation.
14. Make MRP site-aware.
15. Migrate Branch-as-Warehouse design.
16. Enforce QC gate and operation sequence.
17. Implement line-level three-way match.
18. Fix Finance period close enforcement.
19. Add payment-allocation idempotency.
20. Scope accounting periods per Legal Entity/Ledger.
21. Enforce audit redaction and immutable privileges.
22. Mandatory MFA for privileged accounts.
23. Encrypt local backups and sensitive fields.
24. Run all PostgreSQL integration/security tests.

## Phase 1 — Integrated Production Complete

**Target:** Seluruh operasional MAT dapat berjalan end-to-end dengan kontrol enterprise.

1. Unified Business Partner.
2. Generic Change Request.
3. Unified Work Item and Approval Engine.
4. Document Graph with line-level lineage.
5. Organization workbenches and hierarchy designer.
6. Job/Position/Assignment.
7. Pricing and Margin Engine.
8. Typed Sales Order/Fulfilment model.
9. Credit Hold/Release workbench.
10. Partial delivery/invoice and multiple receipt.
11. MRP planned orders and pegging.
12. Production routing, scheduling, and QC plan.
13. Warehouse receiving/put-away/pick/pack/ship.
14. GL/AR/AP/Cash/Asset workbenches.
15. Full closing checklist and reconciliation.
16. Semantic KPI and read models.
17. System Control Center and observability.
18. Backup & Recovery Center.
19. Configuration Change Management.
20. UI/UX standardization and mobile task cards.

## Phase 2 — Tier-1 Capabilities Relevant to MAT

1. Duplicate merge and Golden Record.
2. Purpose-based hierarchy versions.
3. Contracts and agreements.
4. ATP/CTP.
5. Capacity planning.
6. Advanced quality NCR/CAPA.
7. Advanced WMS/barcode/handling units.
8. Project Operations.
9. Maintenance/EAM.
10. Budgeting and rolling forecast.
11. FX revaluation/translation.
12. Intercompany and consolidation foundation.
13. SSO, SCIM, passkeys, privileged access.
14. Immutable audit and backup storage.
15. SIEM/OpenTelemetry.

## Phase 3 — Optional Advanced Enterprise

Only when justified by real business demand:

- AI-assisted task prioritization.
- Demand forecasting.
- Predictive maintenance.
- Anomaly/fraud detection.
- Supplier/customer portals.
- External tax/bank/API connectors.
- Multi-country localization.
- High availability and automated failover.
- Data warehouse/lakehouse.

---

# 19. Dependency Order

Implement in this order to avoid rework:

```text
1. Security Context + Dynamic Authorization + RLS
2. Organization Scope + Hierarchy + Position
3. Business Partner + Reference Data
4. Change Request + Workflow + Work Item
5. Document Graph + Event Outbox Standard
6. Sales Pricing / Order Lines / Credit
7. Operations Warehouse / MRP / Production / QC
8. Finance Subledgers / Posting / Close
9. Workspace Read Models / KPI / Search
10. System Observability / Backup / Release
11. Advanced Tier-1 Features
```

Do not build Control Towers before semantic metrics and security scope are stable.

---

# 20. Definition of Done — Platform

A category is not “100%” merely because its screens exist.

## 20.1 Functional

- End-to-end happy path works.
- Partial, reversal, cancellation, correction, and retry scenarios work.
- No duplicate transaction during retry.
- Cross-module links are relational and traceable.

## 20.2 Security

- Backend permission checks.
- Data scope checks.
- PostgreSQL RLS.
- Field masking.
- SoD tests.
- MFA step-up.
- IDOR tests.
- Audit redaction.
- No critical/high unresolved findings.

## 20.3 Data Integrity

- Referential constraints.
- Effective-date constraints.
- Optimistic locking.
- Idempotency.
- Reconciliation.
- No orphan document links.
- No unmatched accounting events.

## 20.4 Performance

- Server pagination.
- Required indexes.
- Dashboard read models.
- Load tests for concurrent LAN users.
- No full-table browser aggregation.
- No repeated full render loops.

## 20.5 UX

- Loading, empty, error, permission-denied states.
- Keyboard and focus accessibility.
- Responsive mobile task flow.
- Consistent list/detail/workbench pattern.
- No duplicate scrollbar or flash render.

## 20.6 Operations

- Clean release.
- Migration and rollback validation.
- Backup and restore evidence.
- Monitoring and alerts.
- Runbook.
- UAT sign-off.
- Release notes.

---

# 21. Final Acceptance Gate per Category

## Workspace

- [ ] KPI permission per card.
- [ ] Scope-safe data.
- [ ] Unified work items.
- [ ] Per-recipient notifications.
- [ ] Report-level permissions.
- [ ] Mobile approval cards.

## Master Data

- [ ] Business Partner.
- [ ] Change Request.
- [ ] Duplicate/Golden Record.
- [ ] Data Quality rules.
- [ ] Import staging.
- [ ] Effective dating and audit.

## Organization

- [ ] Multi-Legal Entity selector.
- [ ] Organization workbenches.
- [ ] Versioned hierarchies.
- [ ] Job/Position/Assignment.
- [ ] Authority matrix.
- [ ] Scope propagation.

## Sales

- [ ] Server pricing.
- [ ] Typed SO lines.
- [ ] Complete credit exposure.
- [ ] Fulfilment orchestration.
- [ ] Partial delivery/invoice.
- [ ] Complete RMA governance.

## Operations

- [ ] Real Warehouse/Location/Bin.
- [ ] Site-aware MRP.
- [ ] Routing and capacity.
- [ ] QC completion gate.
- [ ] Line three-way match.
- [ ] Warehouse execution.

## Finance

- [ ] Ledger-based periods.
- [ ] Full close enforcement.
- [ ] AR/AP/Cash completeness.
- [ ] Line dimensions.
- [ ] Tax reconciliation.
- [ ] Financial report sign-off.

## System

- [ ] Dynamic IAM.
- [ ] Multiple roles.
- [ ] Privileged access.
- [ ] Immutable redacted audit.
- [ ] RLS and encryption.
- [ ] Monitoring, DR, and release gate.

---

# 22. Final Decision

## Tidak perlu rebuild total

Fondasi MAT ERP V2 tetap digunakan. Refactor dilakukan melalui:

- Shared engines.
- Typed domain tables.
- Security context.
- Unified workflow/task.
- Data governance.
- Read models.
- Progressive migration.

## Target akhir

Setelah roadmap P0 dan P1 selesai serta seluruh acceptance gate lulus, sistem dapat diberi status:

> **MAT ERP V2 — Enterprise Integrated, Production Ready for Internal MAT**

Setelah kemampuan P2 yang relevan diterapkan:

> **MAT ERP V2 — Tier-1 Pattern Aligned, 95–97% Enterprise Ready**

Kekuatan utamanya bukan mempunyai menu sebanyak SAP, Oracle, atau Dynamics 365, tetapi:

- Setiap data memiliki owner dan lifecycle.
- Setiap transaksi dapat ditelusuri.
- Setiap perubahan memiliki approval dan evidence.
- Setiap angka laporan dapat di-drill-down.
- Setiap user hanya melihat data sesuai tugas dan scope.
- Setiap modul terhubung melalui ID, event, posting, dan document graph yang sama.
- Sistem tetap ringan, cepat, aman, dan mudah dipelihara.

---

# 23. Benchmark References

Dokumen resmi berikut menjadi acuan pola, bukan target untuk disalin seluruhnya:

1. SAP Help — Business Partners: https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/8308e6d301d54584a33cd04a9861bc52/70d2b853dcfcb44ce10000000a174cb4.html
2. SAP Help — Organizational Structures in Accounting: https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/7b24a64d9d0941bda1afa753263d9e39/838ac95360267214e10000000a174cb4.html
3. SAP Task Center — Unified Inbox: https://help.sap.com/doc/ab1cc29fb9aa41889779ce4f699142cd/Cloud/en-US/TaskCenter_PUBLIC_EN_1.pdf
4. Oracle Fusion — Role-Based Security: https://docs.oracle.com/en/cloud/saas/human-resources/faqas/what-s-role-based-security.html
5. Oracle Financials — Workflow Approvals and Notifications: https://docs.oracle.com/en/cloud/saas/financials/25d/faigl/configure-workflow-approvals-and-notifications.html
6. Microsoft Dynamics 365 — Role-Based Security: https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/sysadmin/role-based-security
7. Microsoft Dynamics 365 — Organizational Hierarchies: https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/fin-ops/organization-administration/plan-organizational-hierarchy
8. Microsoft Dynamics 365 — Record to Report: https://learn.microsoft.com/en-us/dynamics365/guidance/business-processes/record-to-report-overview
9. PostgreSQL — Row Security Policies: https://www.postgresql.org/docs/17/ddl-rowsecurity.html

---

**End of Document**
