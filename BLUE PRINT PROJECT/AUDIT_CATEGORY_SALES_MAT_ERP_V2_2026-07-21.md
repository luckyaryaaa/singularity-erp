# AUDIT CATEGORY SALES — MAT ERP V2

**Project:** MAT ERP V2  
**Version audited:** 0.29.0  
**Audit date:** 21 July 2026  
**Audit scope:** Sales menu, Order-to-Cash, quotation, customer PO, sales order, project, delivery/invoice integration, credit control, collection/dunning, RMA/warranty, architecture, database, UI/UX, security, testing, and release hygiene.

---

## 1. Executive Verdict

MAT ERP V2 already contains a real and usable Order-to-Cash foundation. The implementation is not a simple CRUD prototype. It includes inquiry, quotation wizard, approval, immutable quotation revisions, customer PO recording, sales order conversion, projects, credit checks, collection/dunning, RMA/warranty, document relations, official PDF issuance, audit trail, idempotency on several critical mutations, and branch-based access checks.

However, the Sales category is **not yet equivalent to a complete enterprise Sales and Order Management suite** such as the relevant capabilities in SAP S/4HANA, Oracle Fusion Order Management, or Microsoft Dynamics 365.

Current status:

> **Strong Order-to-Cash Foundation — Pricing, Order Promising, Fulfilment Orchestration, Credit Exposure, Change Governance, and Sales Security Still Incomplete.**

### Engineering assessment

| Area | Current score | Target after upgrade |
|---|---:|---:|
| Menu structure and Sales operating model | 70/100 | 96/100 |
| Inquiry and quotation | 74/100 | 95/100 |
| Pricing and margin governance | 48/100 | 95/100 |
| Customer PO and order capture | 61/100 | 95/100 |
| Sales Order management | 58/100 | 95/100 |
| Availability and order promising | 30/100 | 93/100 |
| Fulfilment orchestration | 45/100 | 95/100 |
| Credit management | 68/100 | 95/100 |
| Collection and dunning | 73/100 | 94/100 |
| Returns and warranty | 57/100 | 94/100 |
| Project-based selling | 42/100 | 92/100 |
| Sales analytics and forecasting | 55/100 | 94/100 |
| Visual UI/UX | 76/100 | 95/100 |
| Architecture and database | 71/100 | 95/100 |
| Security and preventive SoD | 66/100 | 96/100 |
| Infrastructure and release | 68/100 | 97/100 |
| **Overall Sales enterprise readiness** | **65/100** | **95–97/100** |

This is an engineering gap assessment, not official vendor certification.

---

## 2. Current Sales Menu

The current sidebar contains:

```text
SALES
├── Inquiry
├── Quotation
├── Customer PO
├── Sales Order
├── Project
└── Returns & Warranty
```

The following Sales-related functions are placed in other categories:

```text
MASTER DATA
├── Customer
├── Product & Service
└── Customer-specific commercial data

OPERATIONS
├── Work Order
├── Inventory
├── Quality Control
└── Delivery

FINANCE
├── Invoice
├── Customer Payment
├── Collection & Dunning
└── Tax Invoice

REPORTING
└── Executive Cockpit / Sales by Customer / Project Profitability
```

The distribution is workable, but the user experience remains document-oriented rather than control-tower and exception-oriented.

---

## 3. Capabilities Already Implemented Well

### 3.1 Inquiry to quotation foundation

The application supports:

- Customer inquiry documents.
- Quotation creation wizard.
- Product and service lines.
- Quantity and displayed product price.
- Discount and tax input.
- Payment terms.
- Delivery/lead-time estimate.
- Customer-facing notes.
- Local draft recovery.
- Idempotent document creation.
- Submit and multilevel approval.

### 3.2 Immutable quotation revision

Quotation revision is one of the strongest parts of Sales:

- The document number is retained.
- Previous title, value, status, payload, and lines are frozen.
- Revision reason is mandatory.
- Approval is reset after revision.
- Revision history is stored in a dedicated table.
- The application role cannot update or delete frozen revision rows.
- A converted quotation cannot be revised.

This is a good enterprise pattern and should be retained.

### 3.3 Customer PO recording

The system records a customer-issued PO with:

- Internal CPO number.
- Customer PO number.
- Customer PO date.
- Customer and value.
- Optional quotation reference.
- Difference between PO value and quotation value.
- Difference reason.
- Requested delivery/due date.
- Document approval and conversion to Sales Order.

### 3.4 Document chain and official output

The document engine supports:

- Inquiry, quotation, customer PO, sales order, project, work order, delivery, invoice, payment, and RMA document types.
- Document relations.
- Branch-aware numbering.
- Organization identity snapshots.
- Official signed payload snapshots.
- QR/verification-capable official PDF.
- Versioned document templates.
- Email delivery with delivery log.
- Audit history.

### 3.5 Credit-control foundation

Implemented controls include:

- Customer credit limit.
- Credit term.
- Customer credit hold.
- Outstanding invoice exposure.
- Credit check when submitting Sales Order or Invoice.
- Finance credit override with reason and expiry.
- Credit exposure in Approval Center.
- Dunning-triggered credit hold.

### 3.6 Collection and dunning

Implemented capabilities include:

- Effective-dated dunning policies.
- Multiple overdue levels.
- Idempotent notice per invoice and level.
- Outstanding balance calculation.
- Automatic customer credit hold at configured level.
- Branch scope.
- Notice resolution with mandatory reason.
- Audit trail.

### 3.7 Returns and warranty

Implemented capabilities include:

- RMA based on Delivery or Invoice.
- Warranty duration from Product Master.
- Warranty expiry check.
- Return reason.
- RESTOCK, SCRAP, and REPAIR dispositions.
- Inventory receipt for restocked returns.
- Return lot traceability.
- Contra-revenue accounting profile.
- Document relation to source transaction.

### 3.8 Reporting foundation

Sales information already appears in:

- Executive cockpit.
- Order intake.
- Order book.
- Order-to-cash document funnel.
- Sales by customer.
- Project profitability.
- AR aging.
- Overdue action queue.
- Scheduled report factory.

---

## 4. Critical Findings

## Critical 1 — Server is not the authoritative pricing engine

The quotation wizard calculates subtotal, discount, tax, and total in the browser. The API receives both:

- Header amount.
- Payload lines.
- Header discount/tax values.

The backend validates line quantity, price, discount, and tax ranges, but it does not recalculate the authoritative document header amount and compare it with the submitted value.

The quotation wizard lines also carry product prices without a centralized server-side pricing determination process.

### Risk

A modified client or direct API call can submit:

```text
Header amount: Rp10,000,000
Line total:    Rp100,000,000
```

or use an unauthorized product price, discount, tax, or currency value.

This creates risk in:

- Approval thresholds.
- Margin calculation.
- Credit exposure.
- Quotation output.
- Sales Order conversion.
- Invoice and tax values.
- Revenue reporting.

### Mandatory remediation

Create a server-side `PricingService`:

```text
Customer
+ Product / Service
+ Quantity
+ UoM
+ Currency
+ Price List
+ Agreement
+ Effective Date
+ Site / Sales Organization
+ Discount / Surcharge Rules
+ Tax Determination
+ Margin Floor
= Authoritative Price Result
```

The backend must:

1. Resolve the applicable price list.
2. Calculate base price, quantity break, discounts, surcharges, freight, and tax.
3. Calculate each line and document total.
4. Reject client totals that do not match.
5. Store a pricing-condition snapshot.
6. Require independent approval for manual price override or margin exception.

---

## Critical 2 — Credit exposure is incomplete and can be bypassed by multiple open orders

Current customer exposure is based mainly on unpaid Invoice documents.

It does not fully include:

- Approved Sales Orders not yet invoiced.
- Deliveries not yet invoiced.
- Open billing plans.
- Customer guarantees or collateral.
- Customer group exposure.
- Pending high-risk orders.

Credit check occurs when submitting Sales Order and Invoice, but not as a formal checkpoint during delivery release.

### Risk scenario

```text
Credit limit: Rp100 million
Open invoices: Rp0
SO A: Rp80 million → passes
SO B: Rp80 million → also passes
Total committed exposure: Rp160 million
```

Because approved open Sales Orders are not included in exposure, multiple orders can exceed the limit.

Concurrent submissions also require a per-customer lock to prevent race conditions.

### Mandatory remediation

Create a centralized Credit Management engine:

```text
Open AR
+ Unbilled Delivery
+ Approved/Open Sales Orders
+ Pending Billing Plan
+ Current Request
- Approved Collateral / Guarantee
= Total Credit Exposure
```

Required controls:

- Advisory or row lock per customer during credit decision.
- Credit check at quotation approval where required.
- Sales Order submission.
- Order change.
- Delivery release.
- Invoice posting.
- Configurable checkpoint rules.
- Credit segment/legal-entity/customer-group scope.
- Risk class and score.
- Hold and release workflow.
- Override maker-checker.
- Step-up MFA for high-risk releases.

---

## Critical 3 — Customer PO validation is predominantly frontend-only

The Customer PO dialog performs discrepancy validation in the browser.

Problems found:

- A quotation in `WAITING_APPROVAL` can be selected.
- The quotation list is not filtered by the selected customer.
- The backend generic document endpoint does not independently validate the quotation/customer/value relationship.
- The quotation relationship is stored in JSON payload rather than a strongly validated document relation.
- No database uniqueness control was found for customer PO number per customer.

### Risks

- A Customer PO for Customer A can reference Customer B's quotation.
- An unapproved quotation can become a commercial reference.
- A direct API call can bypass discrepancy confirmation.
- The same customer PO number can be recorded more than once.
- The formal QUOTATION → CUSTOMER PO → SALES ORDER chain is incomplete at relational level.

### Mandatory remediation

Create a dedicated Customer Order Capture service:

- Only approved and valid quotations are eligible.
- Quotation customer must equal Customer PO customer.
- Currency and line data must be compared server-side.
- Value, quantity, product, payment term, tax, and delivery date differences must be classified.
- Difference outside tolerance creates an exception/change request.
- Create a formal `QUOTATION_TO_CUSTOMER_PO` relation.
- Enforce customer PO uniqueness, normally by:

```text
Legal Entity + Customer + Customer PO Number
```

- Add Customer PO amendment/revision history.
- Require document upload and malware scanning for the original customer PO file.

---

## Critical 4 — One-to-one generic conversion cannot support enterprise fulfilment

Current conversions are hardcoded as:

```text
Quotation → Sales Order
Customer PO → Sales Order
Sales Order → Project
Project → Work Order
Delivery → Invoice
```

The conversion engine returns the first existing child and prevents another child for the same relation.

### Limitations

It cannot properly support:

- One Sales Order with multiple Work Orders.
- Partial fulfilment.
- Multiple deliveries.
- Split delivery by plant/warehouse/date.
- Multiple invoices.
- Milestone/progress billing.
- One invoice covering several deliveries.
- Direct stock fulfilment without Project.
- Service order without manufacturing Work Order.
- Make-to-order and buy-to-order combinations.
- Backorders.
- Drop shipment/direct delivery.

All Sales Orders are structurally encouraged toward `Sales Order → Project → Work Order`, which is not appropriate for every product or service type.

### Mandatory remediation

Replace generic one-child conversion with line-level fulfilment orchestration:

```text
Sales Order Header
└── Sales Order Lines
    ├── Fulfilment Line 1 → Stock / Warehouse
    ├── Fulfilment Line 2 → Work Order
    ├── Fulfilment Line 3 → Purchase / Direct Delivery
    └── Fulfilment Line 4 → Service / Project
```

Add:

- Fulfilment method.
- Source plant/warehouse.
- Requested date.
- Promised ship date.
- Promised arrival date.
- Allocated quantity.
- Shipped quantity.
- Invoiced quantity.
- Cancelled quantity.
- Backorder quantity.
- Line hold.
- Orchestration status.
- Exception reason.

---

## Critical 5 — RMA can exceed actual delivered quantity and value

The RMA service validates that the product exists and that warranty duration is valid, but it does not sufficiently prove that:

- The selected product exists in the source document.
- Returned quantity does not exceed delivered quantity.
- Previous returns are deducted.
- Serial/lot belongs to the source delivery.
- Return unit value matches the source commercial value or approved credit policy.
- Warranty starts from the correct delivery/acceptance/commissioning date.

The RMA unit price is accepted from user input.

### Risk

A user may create returns greater than delivered quantity, use a different product, or assign an excessive credit value.

### Mandatory remediation

Implement return authorization at source-line level:

```text
Delivered Qty
- Previously Returned Qty
- Open RMA Qty
= Maximum Returnable Qty
```

Required controls:

- Source delivery line ID.
- Product, variant, lot, serial, heat number.
- Delivered quantity.
- Previously returned quantity.
- Warranty start event.
- Warranty terms snapshot.
- Inspection requirement.
- Disposition approval.
- Credit memo calculation from original invoice/price conditions.
- Replacement order or repair work order.
- Return receipt at real warehouse/location/bin.
- Refund/credit memo integration.

---

## Critical 6 — Sales role permission is too broad

The `sales` role receives all common actions for:

- Customer.
- Inquiry.
- Quotation.
- Customer PO.
- Sales Order.
- Project.
- RMA.

This includes create, edit, submit, approve, reject, post, void, cancel, export, and import.

The document engine prevents a creator from approving the same document, but another regular Sales user can become the next `supervisor` approver because all Sales users share the same role/approval level.

### Risk

There is no strong differentiation between:

- Sales Representative.
- Sales Administrator.
- Estimator.
- Pricing Analyst.
- Sales Supervisor.
- Sales Manager.
- Contract Manager.
- Credit Analyst.
- Return Approver.

### Mandatory remediation

Introduce granular roles and permissions:

```text
Sales Representative
Sales Administrator
Estimator / Costing Engineer
Pricing Analyst
Sales Supervisor
Sales Manager
Contract Manager
Customer Service
Credit Analyst
RMA Officer
RMA Approver
Sales Auditor
```

Preventive SoD:

```text
Quotation Preparer ≠ Quotation Approver
Price Override Requester ≠ Price Override Approver
Customer PO Recorder ≠ Commercial Exception Approver
Sales Order Creator ≠ Sales Order Approver
Credit Override Requester ≠ Credit Override Approver
RMA Creator ≠ RMA Approver
RMA Inspector ≠ Credit Memo Approver
Sales User ≠ Customer Payment Allocator
```

---

## Critical 7 — PostgreSQL Row-Level Security is not implemented

No active PostgreSQL `ENABLE ROW LEVEL SECURITY` and `CREATE POLICY` implementation was found for Sales transaction tables.

Application-level branch checks exist, but enterprise defense-in-depth should also protect data at database level.

RLS is recommended for:

- Business documents.
- Document lines.
- Quotation revisions.
- Customer PO details.
- Sales Order and fulfilment lines.
- Credit holds/overrides.
- Dunning notices.
- RMA and return lines.
- Customer contracts and price lists.
- Sales forecast and commission data.

Policy scope:

```text
Legal Entity
+ Sales Organization
+ Branch / Sales Office
+ Sales Territory
+ Assigned Salesperson
+ Customer Team
+ Transaction Ownership
```

---

## 5. Functional Gaps by Sales Domain

## 5.1 Presales / CRM

Current Inquiry is still a generic business document.

For a full enterprise Sales suite, add:

- Lead.
- Opportunity.
- Account plan.
- Contact interaction.
- Activity/task/call/meeting.
- Opportunity stage.
- Probability.
- Expected close date.
- Competitor.
- Sales campaign/source.
- Qualification checklist.
- Next action.
- Lost reason.
- Opportunity team.
- Pipeline forecast.

If MAT only targets ERP Order-to-Cash and not CRM, this can remain P2 rather than P0.

## 5.2 Quotation

Add:

- Quotation validity date.
- Expiry automation.
- Sales area/organization.
- Ship-to, bill-to, payer, and contact.
- Incoterms.
- Delivery terms.
- Payment schedule.
- Alternative options.
- Configurable product/service scope.
- Cost estimate and HPP snapshot.
- Gross margin and contribution margin.
- Minimum margin rule.
- Approval by discount/margin, not only transaction value.
- Commercial terms library.
- Assumptions and exclusions.
- Attachment/version comparison.
- Customer acceptance/rejection.
- Digital acceptance.

## 5.3 Pricing

Create a dedicated pricing workbench:

- Base price.
- Customer-specific price.
- Customer group price.
- Product group price.
- Quantity break.
- Contract price.
- Promotional price.
- Surcharge.
- Freight.
- Tax inclusive/exclusive.
- Currency conversion.
- Effective dating.
- Price priority.
- Manual override.
- Approval threshold.
- Margin floor.
- Pricing-condition audit.

## 5.4 Customer PO and Sales Order

Add:

- Original customer PO attachment.
- Amendment history.
- Duplicate detection.
- Line-level quotation comparison.
- Order type.
- Sales organization/office/group.
- Customer reference.
- Ship-to/bill-to/payer.
- Requested delivery date per line.
- Delivery priority.
- Partial delivery rule.
- Complete delivery flag.
- Delivery block.
- Billing block.
- Credit block.
- Reason code.
- Sales agreement reference.
- Change order/version after approval.
- Cancellation and reduction controls.

## 5.5 Order promising and availability

Currently there is no complete ATP/CTP or order-promising engine.

Add:

- Available-to-Promise.
- Capable-to-Promise.
- Current stock.
- Reservations.
- Planned receipts.
- Open production.
- Purchase supply.
- Transfer supply.
- Lead time.
- Plant and warehouse calendar.
- Requested versus promised date.
- Alternative source.
- Partial promise.
- Backorder processing.
- Re-promise after supply changes.
- Delivery jeopardy alerts.

## 5.6 Fulfilment and billing

Add:

- Fulfilment line orchestration.
- Sales Order confirmation.
- Delivery scheduling.
- Pick/pack/ship integration.
- Proof of Delivery.
- Partial/multiple delivery.
- Delivery split.
- Billing plan.
- Milestone billing.
- Progress billing.
- Pro-forma invoice.
- Credit memo/debit memo.
- Customer prepayment/down payment.
- Retention.
- Final billing.
- Revenue recognition linkage where applicable.

## 5.7 Sales agreements and contracts

Add:

- Customer contract.
- Blanket sales agreement.
- Quantity commitment.
- Value commitment.
- Release order.
- Contract price.
- Effective date.
- Renewal reminder.
- SLA.
- Warranty clauses.
- Penalty/liquidated damages.
- Contract utilization.
- Amendment and approval.

## 5.8 Project-based selling

The Project page is currently largely a generic document list. A `project_wbs` foundation exists, but a complete customer project workbench is not available.

Add:

- Project contract.
- WBS designer.
- Milestone.
- Deliverable.
- Customer acceptance.
- Revenue/billing milestone.
- Project budget.
- Cost forecast.
- Change order.
- Variation order.
- Time and expense.
- Project procurement.
- Project inventory.
- Progress claim.
- Retention.
- Project margin and Estimate-at-Completion.
- Project close.

Consider moving operational project execution to `Project Operations`, while Sales retains proposal, contract, commercial change, and customer relationship views.

## 5.9 Credit and collection

Add:

- Credit segment.
- Customer credit group.
- Risk scoring.
- Review date and expiry.
- Collateral/guarantee/insurance.
- Order, delivery, and invoice checkpoints.
- Central credit hold worklist.
- Release workflow.
- Promise to pay.
- Dispute/case management.
- Collector assignment.
- Contact history.
- Dunning letter/email/WhatsApp templates.
- Delivery evidence of notices.
- Legal escalation.
- Collection strategy.

## 5.10 Returns, warranty, and service recovery

Add:

- Return authorization request.
- Customer complaint/case.
- Source line and serial/lot verification.
- Return shipping instruction.
- Inspection result.
- Return receipt.
- Credit memo.
- Replacement order.
- Repair Work Order.
- No-fault-found outcome.
- Supplier recovery.
- Warranty reserve.
- Failure analytics.
- Corrective and preventive action link.

## 5.11 Sales commission

Employee Master has commission eligibility, but no complete Sales commission engine was found.

Add:

- Commission plan.
- Target/quota.
- Revenue or margin basis.
- Split credit.
- Team commission.
- Accelerator.
- Clawback for return/cancellation.
- Commission accrual.
- Approval.
- Payroll settlement.
- Statement to salesperson.

---

## 6. Recommended Final Sidebar

```text
SALES
├── Sales Control Tower
│   ├── Executive Overview
│   ├── My Sales Work
│   ├── Exceptions & Holds
│   └── Approval Inbox
│
├── Accounts & Relationships
│   ├── Customer 360
│   ├── Contacts
│   ├── Activities
│   └── Account Plans
│
├── Pipeline
│   ├── Leads
│   ├── Opportunities
│   ├── Forecast
│   └── Lost / Won Analysis
│
├── Quotation & Pricing
│   ├── Inquiries
│   ├── Quotations
│   ├── Pricing Workbench
│   ├── Margin Exceptions
│   └── Commercial Terms
│
├── Customer Orders
│   ├── Customer PO
│   ├── Sales Orders
│   ├── Order Changes
│   ├── Holds & Exceptions
│   └── Order Promising
│
├── Fulfilment Visibility
│   ├── Allocation & Supply
│   ├── Delivery Status
│   ├── Billing Status
│   └── Customer Commitments
│
├── Contracts & Agreements
├── Customer Projects
├── Returns, Warranty & Claims
├── Credit & Collection Visibility
├── Sales Commission
├── Sales Analytics
└── Sales Configuration
```

For a lighter MAT-internal scope, CRM-heavy menus such as Leads/Campaigns can be deferred, but pricing, Sales Order, credit, fulfilment, and return governance should not be deferred.

---

## 7. Final Architecture Recommendation

Do not rebuild as microservices.

Recommended architecture remains:

> **Modular Monolith + PostgreSQL**

Create a clear Sales bounded context:

```text
Sales
├── Customer Engagement
├── Opportunity & Pipeline
├── Quotation & Pricing
├── Customer Order Capture
├── Sales Order Management
├── Order Promising
├── Fulfilment Orchestration
├── Contracts
├── Credit & Collection Interface
├── Returns & Warranty
└── Sales Analytics
```

### Service layer

```text
SalesInquiryService
QuotationService
PricingService
MarginControlService
CustomerOrderCaptureService
SalesOrderService
OrderPromisingService
FulfilmentOrchestrationService
SalesAgreementService
CreditDecisionService
CollectionCaseService
ReturnAuthorizationService
SalesCommissionService
SalesScopePolicyService
```

### Typed tables to add

Avoid storing all critical sales logic only in `business_documents.payload` JSON.

Add typed tables for:

- Opportunities.
- Sales activities.
- Quotation lines and pricing conditions.
- Customer PO references/amendments.
- Sales Order lines.
- Fulfilment lines.
- Delivery schedules.
- Allocations/reservations.
- Billing schedules.
- Contract lines.
- Credit decisions/holds/releases.
- RMA source lines.
- Customer complaints.
- Sales forecasts.
- Commission plans/results.

### Technical controls

- API versioning `/api/v1`.
- Runtime schema validation.
- Server-authoritative totals.
- Optimistic locking and ETag.
- Mandatory idempotency on all critical mutations.
- Per-customer lock for credit decisions.
- Per-order lock for change and fulfilment.
- Transactional outbox.
- Domain event versioning.
- Background jobs for bulk pricing, promise, dunning, and forecast.
- Structured errors and correlation ID.
- Server-side pagination.
- Saved views.
- Bulk import staging and validation.
- Immutable commercial snapshots after approval.

### Suggested events

```text
OpportunityQualified
QuotationSubmitted
QuotationApproved
QuotationRevised
CustomerPoReceived
SalesOrderConfirmed
SalesOrderChanged
CreditHoldApplied
CreditHoldReleased
OrderPromised
OrderAllocated
DeliveryReleased
DeliveryCompleted
InvoiceRequested
CustomerReturnAuthorized
WarrantyClaimApproved
```

---

## 8. Security Target

## 8.1 Granular permissions

```text
sales.control_tower.view

sales.inquiry.create
sales.inquiry.assign
sales.inquiry.qualify

sales.quotation.create
sales.quotation.edit
sales.quotation.submit
sales.quotation.approve
sales.quotation.revise
sales.quotation.export

sales.pricing.view
sales.pricing.override_request
sales.pricing.override_approve
sales.margin_exception.approve

sales.customer_po.record
sales.customer_po.validate
sales.customer_po.exception_approve

sales.order.create
sales.order.submit
sales.order.approve
sales.order.change
sales.order.cancel
sales.order.hold
sales.order.release

sales.promise.run
sales.promise.override
sales.allocation.manage

sales.contract.manage
sales.contract.approve

sales.rma.create
sales.rma.inspect
sales.rma.approve
sales.rma.credit_approve

credit.view
credit.hold
credit.release
credit.override

sales.forecast.view
sales.forecast.submit
sales.forecast.approve
sales.commission.view
sales.commission.approve
```

## 8.2 Step-up authentication

Recent MFA should be required for:

- High-value quotation approval.
- Margin below floor.
- Manual price override.
- Customer PO discrepancy override.
- Sales Order cancellation after allocation.
- Credit hold release.
- Credit-limit override.
- Backdated commercial document.
- RMA above value/quantity tolerance.
- Credit memo/refund approval.
- Contract amendment.
- Export of high-volume customer commercial data.

## 8.3 Audit requirements

Audit must include:

- Before/after values.
- Pricing-condition snapshot.
- Cost and margin snapshot.
- Actor and delegated authority.
- Legal Entity/Sales Organization/Branch.
- Customer and document chain.
- Approval policy/version.
- Credit exposure at decision time.
- Override reason and evidence.
- Device/session/IP.
- Correlation ID.
- Export/reveal events.

---

## 9. Visual UI/UX Audit

The current Quotation page is clean, readable, responsive, and professionally structured. It already has:

- Deep navy sidebar.
- Clear page title.
- Search and status filter.
- Primary create action.
- Enterprise table.
- Revision status.
- Consistent chips.
- Responsive/mobile smoke coverage.

However, it is still a document list page rather than an enterprise Sales cockpit.

### Current visual gaps

- No Sales Control Tower.
- No KPI/exceptions at Sales landing page.
- No quote validity/expiry warning.
- No margin and discount visibility.
- No requested/promised delivery visibility.
- No credit-risk status in list.
- No quote-to-order conversion rate.
- No sales owner/team/territory.
- No saved view/advanced commercial filters specific to Sales.
- No Kanban/pipeline view.
- No document-chain timeline on main detail page.
- No side-by-side version diff for quotation revisions.
- No fulfilment-line status.
- No customer 360 commercial context.

---

## 10. Final Visual Direction

### Design composition

```text
85% Clean Enterprise
10% Pearl Glass
5% Cute Clay & Motion
```

### Palette

- Pearl white background.
- Deep navy structure.
- Azure interaction.
- Champagne gold for premium deal/approval.
- Mint for won/confirmed/paid.
- Amber for risk/expiring/pending.
- Coral for blocked/overdue/lost.
- Lavender for forecast and intelligence.

### Cute clay elements

Use only as supporting visual accents:

- Handshake/deal.
- Customer building.
- Quotation document.
- Product crate.
- Delivery truck.
- Warranty shield.
- Pipeline telescope.
- Empty/success states.
- Sales assistant.

Do not use clay on dense pricing conditions, audit logs, commercial values, approval evidence, and transaction lines.

---

## 11. Sales Control Tower Blueprint

### Header context

- Legal Entity.
- Sales Organization.
- Branch/Sales Office.
- Period.
- Currency.
- Sales team.
- Data freshness.

### KPI cards

- Pipeline value.
- Weighted forecast.
- Quotation value.
- Win rate.
- Order intake.
- Order book.
- Gross margin.
- Orders at risk.
- Credit holds.
- Late promises.
- Expiring quotations.
- Open returns/claims.

### Main panels

- Pipeline funnel.
- Forecast versus target.
- Quote aging and expiry.
- Order fulfilment timeline.
- Credit and collection risk.
- Margin exceptions.
- Customer commitments.
- Top customers/products.
- Lost reasons.
- Sales activity queue.
- Approval queue.

### Drill-through

```text
KPI
→ Customer / Opportunity
→ Quotation
→ Price and Margin Conditions
→ Customer PO
→ Sales Order Line
→ Promise / Allocation
→ Delivery
→ Invoice / Payment
→ Return / Warranty
→ Audit Trail
```

---

## 12. Core Screen Blueprints

### 12.1 Quotation 360

Header:

- Document number and revision.
- Customer.
- Status.
- Valid-until date.
- Value and currency.
- Gross margin.
- Discount exception.
- Credit risk.
- Owner.
- Last sent/opened/accepted.

Tabs:

```text
Overview
Customer & Contacts
Items & Pricing
Cost & Margin
Commercial Terms
Delivery & Promise
Attachments
Approval
Revision Comparison
Document Flow
Audit Trail
```

### 12.2 Sales Order 360

Header:

- Order number.
- Customer PO.
- Credit status.
- Confirmation status.
- Requested/promised date.
- Delivery status.
- Billing status.
- Fulfilment risk.

Tabs:

```text
Overview
Order Lines
Promise & Allocation
Production / Procurement Supply
Deliveries
Billing
Customer Communication
Changes & Holds
Document Flow
Audit Trail
```

### 12.3 Customer 360 — Sales view

- Customer profile.
- Sales owner/team.
- Credit exposure.
- Open quotations.
- Open orders.
- Deliveries.
- Outstanding invoices.
- Dunning status.
- Active contracts.
- Returns/warranty.
- Profitability.
- Last interaction.

### 12.4 Returns & Warranty Workbench

- Return request.
- Source delivery/invoice line.
- Returnable quantity.
- Warranty eligibility.
- Serial/lot.
- Inspection.
- Disposition.
- Replacement/repair/credit decision.
- Financial impact.
- Approval and audit.

---

## 13. Mobile UX

Mobile should use task cards, not compressed desktop tables.

```text
My Sales Tasks
├── Follow Up Inquiry
├── Prepare Quotation
├── Review Expiring Quote
├── Submit Customer PO
├── Resolve Order Hold
├── Confirm Customer Commitment
├── Request Credit Release
├── Approve Return
└── Record Customer Visit
```

Recommended mobile capabilities:

- One-action-at-a-time.
- Large touch target.
- Customer call/email/WhatsApp shortcuts.
- Upload Customer PO photo/PDF.
- Approval cards.
- Quote PDF share.
- Offline draft for visit notes.
- Sync indicator.
- Sensitive-value masking.

---

## 14. Infrastructure and Release Audit

The audited workspace ZIP still contains:

- `.env`.
- `.git`.
- `node_modules`.
- Runtime storage.
- Smoke screenshots.
- Generated artifacts.
- 17 PostgreSQL dump files totaling approximately 6.55 MiB.

This workspace ZIP must not be used as a distribution or production deployment artifact.

### Positive finding

The clean release builder completed successfully:

```text
297 release files
Latest migration: 039_account_roles_tax_rates.sql
SHA-256 release fingerprint generated
```

### Scanner limitation

Secret scan result:

```text
452 files scanned
0 findings
```

However, the scanner excludes important artifact categories such as `.env`, storage, database dump, PDF, spreadsheets, images, and ZIP. Therefore, a final artifact/DLP scan remains mandatory.

### Final pipeline

```text
Source Scan
→ Dependency Scan
→ Unit & Integration Test
→ Build Clean Release
→ Final Artifact / DLP Scan
→ Generate SBOM
→ Sign Manifest
→ Verify Hash
→ Deploy
→ Smoke Test
→ O2C Reconciliation
```

---

## 15. Testing Result

| Test | Result |
|---|---|
| UI/application shell | **5/5 PASS** |
| Semantic tokens and responsive breakpoint | **PASS** |
| Security headers and traversal prevention | **PASS** |
| Fingerprinted/precompressed release assets | **PASS** |
| Authorization matrix | **3/3 PASS** |
| Router/permission coverage | **195 handlers covered** |
| O2C PostgreSQL integration tests | **Not validated in this audit environment** |
| Secret scan | **0 findings, incomplete coverage** |
| Clean release build | **PASS — 297 files** |

The O2C integration tests could not connect to PostgreSQL:

```text
ECONNREFUSED 127.0.0.1:5432
```

This means the tests are **not validated**, not logically proven failed. Production sign-off requires the full PostgreSQL O2C suite to pass.

---

## 16. Prioritized Roadmap

## P0 — Stop-Ship / Data Integrity

1. Make pricing and tax totals server-authoritative.
2. Recalculate and verify header total against lines.
3. Expand credit exposure to open orders and deliveries.
4. Add per-customer concurrency lock for credit decisions.
5. Add credit checkpoint at delivery release.
6. Move Customer PO validation to backend.
7. Enforce quotation/customer consistency.
8. Enforce unique Customer PO number per Legal Entity/customer.
9. Restrict Customer PO references to approved/current quotations.
10. Validate RMA source line, quantity, prior returns, price, and serial/lot.
11. Implement preventive Sales SoD.
12. Implement Legal Entity/Branch/Sales scope and PostgreSQL RLS.
13. Rotate exposed credentials and audit database dumps.
14. Run all PostgreSQL O2C integration tests.

## P1 — Production Complete

1. Sales Control Tower.
2. Pricing engine and pricing-condition snapshot.
3. Margin control and exception approval.
4. Sales Order typed lines.
5. Order change/version workflow.
6. Line-level fulfilment orchestration.
7. Requested/promised date and ATP.
8. Partial/multiple delivery and invoice.
9. Customer PO amendment workflow.
10. Credit hold/release workbench.
11. Credit memo/debit memo/prepayment.
12. RMA inspection and return receipt workflow.
13. Contract/agreement foundation.
14. Customer 360 Sales view.
15. Granular Sales roles and permissions.

## P2 — Tier-1 Sales Suite

1. Leads and opportunities.
2. Activity and account management.
3. Sales forecast and quota.
4. Advanced ATP/CTP and backorder processing.
5. Sales agreements and release orders.
6. Milestone/progress billing.
7. Full Customer Project operations.
8. Sales commission.
9. Advanced credit scoring and collateral.
10. Customer portal and digital acceptance.
11. Automated communication and engagement history.
12. Sales anomaly, churn, and margin-risk analytics.

---

## 17. Final Acceptance Gate

Sales can be marked `MAT Enterprise Complete` only when:

```text
[ ] Pricing is server-authoritative
[ ] Header and line totals always reconcile
[ ] Margin policy and approval work
[ ] Customer PO validation is backend-enforced
[ ] Duplicate Customer PO is blocked
[ ] Quotation/customer relationship is validated
[ ] Sales Order change workflow works
[ ] Credit exposure includes all commitments
[ ] Delivery credit checkpoint works
[ ] Order promising is plant/warehouse/date aware
[ ] Partial/multiple fulfilment works
[ ] Billing schedule and credit/debit memo work
[ ] RMA cannot exceed delivered quantity
[ ] RMA financial value comes from controlled source
[ ] Preventive Sales SoD passes
[ ] RLS and scope isolation pass
[ ] O2C integration tests pass
[ ] Performance and concurrency tests pass
[ ] Clean release and artifact scan pass
[ ] Internal UAT is signed off
```

---

## 18. Final Conclusion

MAT ERP V2 does not need to be rebuilt from zero. The existing Sales foundation is valuable and should be retained, especially:

- Generic document lifecycle.
- Approval policy snapshots.
- Immutable quotation revisions.
- Document-chain relations.
- Credit-control foundation.
- Dunning policies.
- RMA posting foundation.
- Official document governance.
- Audit and idempotency infrastructure.

The next phase should focus on replacing browser-driven commercial logic and generic one-to-one conversion with controlled enterprise services:

1. Pricing and margin governance.
2. Customer Order Capture validation.
3. Sales Order typed-line model.
4. Order promising and fulfilment orchestration.
5. Complete credit exposure and hold/release workflow.
6. Source-line return and warranty governance.
7. Granular Sales security and PostgreSQL RLS.
8. Sales Control Tower and Customer/Sales Order 360 UX.

After P0 and P1, Sales can be considered production-ready for MAT internal operations. After P0–P2, the module can reach approximately **95–97% enterprise readiness for the SAP/Oracle/Dynamics control patterns relevant to MAT**, while remaining lighter and easier to maintain.
