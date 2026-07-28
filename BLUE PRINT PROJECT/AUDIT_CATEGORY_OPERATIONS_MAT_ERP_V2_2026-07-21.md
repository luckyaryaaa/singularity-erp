# AUDIT CATEGORY OPERATIONS — MAT ERP V2

**Tanggal audit:** 21 Juli 2026  
**Versi repository:** 0.28.1  
**Scope:** menu Operations, procurement, production, MRP, quality, inventory, warehouse, receiving, delivery, project execution, architecture, infrastructure, security, UI/UX, testing, dan release hygiene.

---

## Executive Verdict

MAT ERP V2 sudah memiliki operational transaction core yang nyata: document lifecycle, approval, idempotency pada banyak mutasi, RFQ comparison, PO change order, budget check, three-way-match foundation, work-order planning, BOM reservation, material issue, time logging, production costing, lot/heat traceability, stock opname, QC quarantine, MRP suggestion, dan audit trail.

Namun kategori Operations belum dapat dianggap setara dengan SAP S/4HANA, Oracle Fusion Cloud SCM, atau Dynamics 365 Supply Chain Management. Status yang paling tepat:

> **Strong Operational ERP Core — Planning, WMS, Quality Governance, Project Operations, and Security Scope Still Incomplete.**

### Scorecard

| Area | Kondisi saat ini | Target final |
|---|---:|---:|
| Menu dan process architecture | 70/100 | 96/100 |
| Source-to-Pay / Procurement | 75/100 | 95/100 |
| Production execution | 68/100 | 95/100 |
| MRP / Supply planning | 45/100 | 94/100 |
| Quality management | 57/100 | 94/100 |
| Inventory management | 69/100 | 95/100 |
| Warehouse & logistics execution | 48/100 | 93/100 |
| Project operations | 38/100 | 92/100 |
| Technical architecture | 73/100 | 95/100 |
| Security & SoD | 65/100 | 96/100 |
| Infrastructure & release | 68/100 | 97/100 |
| UI/UX | 74/100 | 95/100 |
| **Overall Operations readiness** | **66/100** | **95–97/100** |

---

## 1. Current Operations Menu

```text
OPERASIONAL
├── Work Order
├── Quality Control
├── MRP & Kebutuhan
├── Purchase Request
├── RFQ & Perbandingan
├── Purchase Order
├── Usulan Pembayaran
├── Anggaran Pengadaan
├── Persediaan
├── Penerimaan Barang
├── Mutasi Stok
└── Pengiriman
```

Cross-functional functions are located elsewhere:

```text
PENJUALAN
├── Sales Order
├── Project
└── RMA

KEUANGAN
├── Supplier Invoice
├── Supplier Payment
└── Accounting

ORGANISASI
├── Plant
├── Warehouse
└── Work Center
```

The current grouping is functional, but it mixes planning, production, procurement, warehouse, logistics, and finance actions in one flat menu. Payment Proposal should be moved to Finance/Treasury. Procurement budget may remain visible in Procurement but should be governed by Finance Budget Control.

---

## 2. What Is Already Strong

### Unified document lifecycle

Operations documents use one status engine and one permission model:

```text
DRAFT → WAITING_APPROVAL → APPROVED → IN_PROCESS → COMPLETED/CLOSED
```

The engine also supports revision, hold, cancellation, void, archive, optimistic locking, approval routing, official document snapshots, and audit trail.

### Procurement controls

Implemented controls include:

- Purchase Request and Purchase Order lifecycle.
- Procurement budget check.
- Finance override with reason and audit.
- RFQ supplier comparison and landed-cost calculation.
- Supplier performance hold when creating a PO.
- PO change order with maker-checker constraint.
- Supplier bank verification before payment proposal.
- Three-way-match foundation.

### Production execution

Implemented controls include:

- Work Order lifecycle.
- BOM revision snapshot.
- Work-center rate snapshot.
- Material reservation.
- FIFO material issue.
- Append-only time logs.
- Operation status.
- Actual material and labor costing.
- Finished-goods receipt and lot creation.
- Cost variance against active HPP.

### Inventory and traceability

Implemented controls include:

- On-hand and reserved quantity.
- Lot, heat number, mill certificate, and lot lineage.
- FIFO consumption.
- Lot block/quarantine.
- Transfers with child-lot lineage.
- Stock opname and accounting adjustment.
- Inventory movement partitioning.
- Valuation comparison between aggregate balance and lot layers.

### Quality foundation

Implemented controls include:

- Incoming, in-process, and final inspection type.
- Sampled, passed, and failed quantity validation.
- NCR number on failure.
- Root-cause capture.
- Automatic lot quarantine.
- Immutable QC inspection records at database privilege level.

### Platform controls

Implemented controls include:

- RBAC and branch-aware guards on many routes.
- Idempotency on many critical document actions.
- PostgreSQL transaction and advisory locks.
- Persistent audit log.
- Event outbox.
- Security headers, CSRF protection, session controls, MFA foundations.
- Clean release builder.
- Responsive design and accessibility controls.

---

## 3. Critical Findings

### P0-01 — Inventory still uses Branch as Warehouse

The database already contains independent `org_warehouses`, `storage_locations`, and `warehouse_bins`. However operational balances, lots, and inventory posting still use:

```text
inventory_balances.warehouse_id → branches.id
stock_lots.warehouse_id → branches.id
```

Production code explicitly states that the inventory ledger still treats a branch as a warehouse. The UI also loads Branches as the warehouse selector.

**Impact:**

- One branch cannot safely operate multiple warehouses.
- Raw material, finished goods, quarantine, consignment, scrap, and service stock cannot be isolated correctly.
- Storage location and bin are not used during operational posting.
- Warehouse-specific security and accountability cannot be enforced.

**Required remediation:**

1. Migrate all inventory ledgers to `org_warehouse_id`.
2. Add mandatory storage location and optional bin dimensions.
3. Provide compatibility mapping for historical branch-based balances.
4. Rebuild stock transfer, receipt, issue, opname, reservation, and valuation around warehouse/location/bin.
5. Remove legacy branch-as-warehouse behavior after reconciliation and cutover.

### P0-02 — Stock Opname has cross-branch scope gaps

Direct opname endpoints check permission but do not consistently assert warehouse/branch access:

- Create opname accepts any `warehouseId`.
- Read opname lines does not receive user scope.
- Enter count does not enforce warehouse scope.

The opname start route also lacks idempotency protection.

**Impact:** possible IDOR/cross-branch viewing or modification when a user knows another document or warehouse UUID.

**Required remediation:** central `WarehouseScopePolicyService`, branch/warehouse assertion on every endpoint, PostgreSQL RLS, mandatory idempotency, and scope regression tests.

### P0-03 — MRP is global, synchronous, and not site-aware

Current MRP:

- Uses one global advisory lock.
- Aggregates demand and supply across all branches and warehouses.
- Produces suggestions without legal entity, plant, warehouse, or required date.
- Lists all open suggestions without user scope.
- Converts a global suggestion into a PR using the current user's branch.
- Dismisses every previous OPEN suggestion globally when a new run completes.
- Executes synchronous per-product SQL queries.

**Impact:**

- Stock in another branch can incorrectly offset a local shortage.
- One branch can supersede another branch's planning suggestions.
- PR can be created for the wrong branch.
- Planning can time out as product volume grows.

**Required target:** versioned, background MRP runs scoped by legal entity/plant/warehouse, demand date, supply date, lead time, lot-sizing rule, safety stock, order multiple, make/buy source, supplier, transfer possibility, and capacity.

### P0-04 — Three-way match is header-level, not a complete three-way match

Current check mainly verifies:

- PO exists.
- One Goods Receipt exists.
- Supplier Invoice total versus PO total is within tolerance.

The configured quantity tolerance is not applied, GR amount is recorded but not used as a decision criterion, and line-level product/quantity/price matching is absent.

**Impact:** an invoice may be marked MATCHED even when the received items or quantities differ materially from the PO.

**Required target:** line-level PO–receipt–invoice matching, cumulative receipts, accepted/rejected quantity, service acceptance, price/quantity/tax/freight tolerance, split invoice, partial receipt, exception ownership, hold/release workflow, and full evidence.

### P0-05 — Generic conversion allows only one PO-to-GR child

The generic conversion engine returns the first existing child for a relation. Therefore a PO effectively has one generated Goods Receipt through the standard conversion route.

**Impact:** partial receipt, multiple delivery dates, backorder, over/under receipt, and cumulative receipt control are not enterprise-complete.

**Required target:** receipt transactions per PO line with cumulative ordered/received/accepted/rejected/returned quantities and close tolerance.

### P0-06 — Quality gate is not enforced before Production completion

The documented SOP states that quality gate must be complete before finishing a Work Order. The implementation checks operations, material issue, and finished-goods receipt, but does not require final QC pass or closed NCR.

**Impact:** a Work Order can complete while final QC is absent or failed.

**Required remediation:** product/operation quality plan, required inspection points, final-release status, NCR/CAPA disposition, and backend enforcement before report-as-finished or Work Order completion.

### P0-07 — Operation sequence is not enforced

The SOP states operations should complete sequentially, but `completeOperation()` only validates the selected operation and Work Order status. It does not require earlier operations to be complete.

**Required target:** predecessor relationships, overlap rules, parallel operations, queue/setup/run time, operation confirmation, rework route, and controlled skip reason.

### P0-08 — No PostgreSQL Row-Level Security

No `ENABLE ROW LEVEL SECURITY` or operational RLS policies were found.

Application guards are useful but insufficient as the only boundary for sensitive multi-branch operations.

RLS should cover at minimum:

- Business documents.
- Inventory balances and movements.
- Lots and opname.
- Work Orders, operations, materials, and time logs.
- QC inspections and NCR/CAPA.
- RFQ and quote data.
- Procurement budgets.
- MRP runs and suggestions.

### P0-09 — Release workspace contains secrets and runtime data

The supplied workspace contains:

- `.env`.
- `.git`.
- `node_modules`.
- runtime storage.
- 17 PostgreSQL dump files.
- screenshots and generated artifacts.

The clean release builder works and generated 297 files with a SHA-256 manifest, but the supplied ZIP is a workspace archive rather than a distribution package.

The secret scanner reported zero findings but excludes `.env`, storage, dumps, PDF, spreadsheets, images, ZIP, and release directories. It therefore cannot certify the final package.

---

## 4. Functional Gap by Domain

### Operations Control Tower

Missing:

- One control center for demand, supply, production, procurement, warehouse, quality, delivery, and operational exceptions.
- Exception queue and SLA ownership.
- Late-order and material-shortage heatmap.
- Plant/warehouse selector and effective-date context.
- Real-time drill-through from KPI to transaction evidence.

### Demand and Supply Planning

Missing:

- Forecast and demand plan.
- Sales-order demand dates.
- Planned orders.
- Planning horizon and time fences.
- Site/warehouse planning scope.
- Lead-time scheduling.
- Lot sizing and order multiples.
- Make/buy/transfer sourcing rule.
- Supplier capacity and calendar.
- Capacity requirements planning.
- Pegging and demand-to-supply traceability.
- Rescheduling, expedite, defer, and cancel messages.
- Planning simulation and approval before release.

### Procurement and Sourcing

Missing or incomplete:

- Requisition category and accounting distribution.
- Buyer/purchasing-group ownership.
- Sourcing policy and RFQ requirement by threshold/category.
- Conflict-of-interest declaration at quote selection.
- Maker-checker between quote entry and supplier selection.
- Supplier qualification and document compliance gate at RFQ/PO level.
- Purchase agreement/framework contract.
- Blanket PO and release order.
- Service procurement with milestone/acceptance sheet.
- Partial receipt and cumulative matching.
- Return-to-vendor.
- Supplier confirmation and ASN.
- Supplier portal and collaboration.

### Production and Shop-Floor Execution

Missing or incomplete:

- Production scheduling board and finite capacity.
- Routing master version rather than manual operation entry per Work Order.
- Operation dependencies.
- Setup/run/queue/move time.
- Operator assignment and skill validation.
- Machine assignment and availability.
- Shift/calendar capacity.
- Partial confirmation and partial finished-goods receipt.
- Scrap, yield, co-product, by-product, and rework.
- Backflush and staged material.
- Subcontract operation.
- WIP accounting and detailed variance categories.
- Machine/overhead/subcontract costing.
- OEE, downtime, cycle time, efficiency, and schedule adherence.
- Tablet/mobile shop-floor execution screen.

### Quality Management

Missing or incomplete:

- Quality plan and inspection characteristics.
- Sampling plan/AQL.
- Specification limits and measurement values.
- Inspection lot generation rules.
- Usage decision and material disposition.
- NCR lifecycle.
- CAPA task assignment, due date, verification, and closure.
- Deviation/concession approval.
- Certificate of Analysis/Conformity.
- Gauge/tool calibration.
- Supplier corrective action request.
- Quality cost and defect analytics.

### Inventory and Warehouse Management

Missing or incomplete:

- Independent warehouse/storage/bin posting.
- Inventory status by location.
- License plate/handling unit.
- Put-away and picking rules.
- Wave/batch picking.
- Pick, pack, stage, load, and ship confirmation.
- Cycle count classes and count schedule.
- Blind count; current UI shows system quantity during count.
- Count freeze or movement lock during snapshot.
- Lot split/merge/translate.
- Serial lifecycle and component genealogy.
- Expiry/shelf-life and FEFO.
- Reservation priority and allocation.
- Consignment and customer/vendor-owned stock.
- Negative inventory policy by warehouse/item.
- Mobile barcode/QR workflow.

### Delivery and Logistics

Current Delivery is still mainly a generic document list.

Missing:

- Delivery order line fulfillment.
- Picking and packing.
- Shipment and load.
- Carrier, vehicle, driver, and route.
- Shipping label and packing list.
- Proof of delivery.
- Partial delivery and backorder.
- Freight cost.
- Delivery exception and failed-delivery workflow.
- Transportation planning and tracking.

### Project Operations

A `project_wbs` table exists, but no complete project workbench was found.

Missing:

- Project/WBS maintenance.
- Milestone and schedule.
- Resource assignment.
- Project procurement.
- Project inventory reservation.
- Budget, commitment, actual, and forecast.
- Progress and earned-value reporting.
- Timesheet and project cost capture.
- Change order and customer variation.
- Billing milestone and profitability.

### Maintenance / EAM

No complete maintenance domain was found.

For MAT's workshop and manufacturing environment, add:

- Equipment and functional-location master.
- Preventive-maintenance plan.
- Maintenance request/order.
- Breakdown and downtime.
- Spare-parts reservation.
- Meter/counter reading.
- Calibration and certification.
- Maintenance cost and reliability KPI.

---

## 5. Security and Governance Upgrade

### Granular permissions

Replace broad module permissions with action-specific controls, for example:

```text
production.plan
production.release
production.confirm_time
production.confirm_operation
production.report_finished
production.cost_view
production.cost_approve

quality.inspect
quality.ncr_create
quality.disposition
quality.capa_manage
quality.release_lot

inventory.onhand_view
inventory.lot_view
inventory.lot_block
inventory.lot_release
inventory.transfer
inventory.opname_count
inventory.opname_review
inventory.opname_post

procurement.requisition_create
procurement.rfq_manage
procurement.quote_enter
procurement.quote_select
procurement.po_create
procurement.po_approve
procurement.po_change
procurement.receipt
```

### Preventive SoD

Required separations:

```text
Requester ≠ PR Approver
RFQ Quote Entry ≠ Supplier Selection
PO Creator ≠ PO Approver
Receiver ≠ Supplier Invoice Approver
Opname Counter ≠ Opname Approver
QC Inspector ≠ Lot Release Approver for failed lot
Production Reporter ≠ Production Cost Reviewer
Warehouse Picker ≠ Shipment Confirmation for high-risk transactions
```

### Step-up authentication

Require recent MFA for:

- Inventory write-off over threshold.
- Lot release after quarantine.
- PO change over threshold.
- Match override.
- Budget override.
- Production variance override.
- QC concession/deviation.
- Backdated posting.

### Audit gaps

Add explicit audit records for:

- Time-log entry and correction.
- Operation completion/reopen.
- MRP exception disposition.
- Lot release.
- Blind-count reveal.
- Pick/pack/ship actions.
- QC usage decision and CAPA closure.

---

## 6. Architecture Recommendation

Do not rebuild as microservices. Keep:

> **Modular Monolith + PostgreSQL**

Refactor into explicit bounded contexts:

```text
Operations Platform
├── Operations Control Tower
├── Supply Planning
├── Procurement & Sourcing
├── Manufacturing & Service Execution
├── Quality Management
├── Inventory Management
├── Warehouse Execution
├── Delivery & Logistics
├── Project Operations
├── Maintenance Management
└── Operational Costing & Analytics
```

### Recommended services

```text
DemandSupplyPlanningService
PlannedOrderService
ProcurementPolicyService
PurchaseOrderService
ReceivingService
ThreeWayMatchService
ProductionPlanningService
ShopFloorExecutionService
ProductionCostingService
QualityPlanService
NcrCapaService
InventoryLedgerService
WarehouseExecutionService
ShipmentService
ProjectOperationsService
MaintenanceService
OperationsScopePolicyService
```

### Data-model direction

Keep generic `business_documents` for shared lifecycle and audit, but move critical domain data from unstructured payloads into typed extension tables:

- Purchase order lines and schedules.
- Receipt lines and receipt distributions.
- Production-order headers and operations.
- Material requirements and reservations.
- Quality plans, characteristics, results, NCR, and CAPA.
- Shipment, pick, pack, and proof-of-delivery.
- MRP run, demand, supply, pegging, and recommendation.

Add runtime schema validation, API versioning, mandatory idempotency, optimistic locking, append-only posting ledgers, event versioning, and transactional outbox.

---

## 7. Infrastructure and Performance

### Current strengths

- PostgreSQL transaction boundary.
- Advisory locks for stock and numbering.
- Movement and audit partitioning.
- Persistent jobs and event outbox.
- Gzip, static allowlist, security headers.
- Fingerprinted/precompressed assets.
- Clean release builder.

### Required upgrades

- Run MRP and heavy planning as background jobs.
- Store an immutable MRP run snapshot and status.
- Replace N+1 planning queries with set-based SQL/materialized planning views.
- Add server pagination to MRP, valuation, QC, and large cockpits.
- Add composite indexes by legal entity/plant/warehouse/status/date.
- Add operational observability: queue time, lock wait, stock-post latency, MRP duration, failed event, and exception count.
- Add restore test and operational data reconciliation to deployment gate.
- Scan the final release artifact, not only source files.
- Generate SBOM and signed release manifest.

---

## 8. UI/UX Final Direction

### Design composition

```text
85% clean enterprise
10% pearl-glass depth
5% professional cute-clay accent
```

Use clay for industrial context, not for dense transaction data:

- Miniature factory/workshop.
- Warehouse and forklift.
- QC shield/gauge.
- MRP planning blocks.
- Delivery truck.
- Empty states and guided onboarding.

Keep tables, forms, quantities, cost, approvals, and audit evidence clean and conservative.

### Visual language

- Pearl white canvas.
- Deep navy navigation and hierarchy.
- Azure for actions and planning.
- Champagne gold for approvals and priority.
- Mint for available/completed/pass.
- Amber for shortage/review.
- Coral for late/fail/blocked.
- Lavender for planning/information.

### Final Operations sidebar

```text
OPERATIONS
├── Operations Control Tower
│   ├── Executive Overview
│   ├── Exception Workbench
│   ├── My Operational Work
│   └── Approval Inbox
│
├── Planning
│   ├── Demand Plan
│   ├── MRP Runs
│   ├── Planned Orders
│   ├── Material Shortages
│   ├── Capacity Plan
│   └── Planning Exceptions
│
├── Procurement & Sourcing
│   ├── Purchase Requisitions
│   ├── RFQ & Bid Comparison
│   ├── Purchase Orders
│   ├── Agreements
│   ├── Supplier Confirmations
│   └── Procurement Exceptions
│
├── Production & Service
│   ├── Work Orders
│   ├── Production Schedule
│   ├── Shop Floor Execution
│   ├── Material Staging
│   ├── Production Costing
│   ├── Rework & Subcontract
│   └── Production Analytics
│
├── Quality Management
│   ├── Quality Plans
│   ├── Inspection Orders
│   ├── NCR & CAPA
│   ├── Lot Disposition
│   ├── Certificates
│   └── Quality Analytics
│
├── Inventory & Warehouse
│   ├── On-hand & Availability
│   ├── Lots & Serials
│   ├── Reservations
│   ├── Receiving & Put-away
│   ├── Picking & Packing
│   ├── Transfers
│   ├── Cycle Count & Opname
│   └── Inventory Valuation
│
├── Delivery & Logistics
├── Project Operations
├── Maintenance
└── Operations Configuration
```

Move **Payment Proposal** to Finance > Accounts Payable/Treasury.

### Operations Control Tower page

Header context:

- Legal Entity.
- Plant.
- Warehouse.
- Planning horizon.
- Shift/date.
- Last refresh.

KPI cards:

- Orders at risk.
- Material shortages.
- Capacity overload.
- Work Orders late.
- QC holds/NCR overdue.
- Receiving backlog.
- Pick/ship backlog.
- Inventory accuracy.
- Supplier delivery risk.
- Production variance.

Main panels:

- Demand-supply timeline.
- Production Gantt.
- Capacity heatmap.
- Warehouse workload.
- Quality exception queue.
- Procurement exception queue.
- Delivery map/timeline.
- Recent operational events.

### Mobile UX

Current mobile layout is responsive, but wide operational tables are clipped horizontally and do not expose all key values comfortably.

Use mobile task cards for:

- Operator confirmation.
- Material issue.
- QC inspection.
- Lot scan.
- Opname count.
- Receiving.
- Picking.
- Proof of delivery.

Desktop remains the planning and administration workspace; mobile becomes execution-first.

---

## 9. Testing Result

### Passed

- Authorization matrix: 195 handlers covered.
- Permission literal allow/deny paths.
- Public endpoint allowlist.
- App shell and accessibility tests: 5/5.
- Accessibility audit: 18/18.
- Clean release build: 297 files with SHA-256 manifest.

### Not validated because PostgreSQL was unavailable

The following operational integration tests returned `ECONNREFUSED 127.0.0.1:5432`:

- Lot creation and FIFO consumption.
- Lot transfer lineage.
- Stock opname posting and journal.
- Production reservation, issue, costing, and finished goods.
- QC quarantine.
- MRP conversion.
- Production least-privilege database grants.
- RFQ and PO conversion.
- Three-way-match enforcement.
- Credit control.
- Payment proposal.

These tests are **not considered passed or logically failed**; they remain unvalidated until PostgreSQL integration testing runs successfully.

---

## 10. Prioritized Implementation Roadmap

### P0 — Stop-Ship Security and Integrity

1. Enforce stock-opname branch/warehouse scope.
2. Add PostgreSQL RLS for operational tables.
3. Replace global MRP with plant/warehouse-scoped runs.
4. Prevent Work Order completion without required QC release.
5. Implement real line-level three-way match.
6. Support partial and multiple Goods Receipts.
7. Add operation predecessor enforcement.
8. Add mandatory idempotency to opname and remaining mutation endpoints.
9. Rotate exposed secrets and quarantine unsafe workspace ZIP.
10. Run complete PostgreSQL operational integration tests.

### P1 — Production Complete

1. Migrate Branch-as-Warehouse to independent warehouse/location/bin.
2. Create Operations Control Tower.
3. Add planned orders and dated MRP recommendations.
4. Add production scheduling and capacity.
5. Add quality plans, usage decision, NCR/CAPA workflow.
6. Add cumulative receipt and return-to-vendor.
7. Add blind cycle count and movement freeze.
8. Add granular permission and preventive SoD.
9. Add warehouse receiving/put-away/pick/pack/ship flow.
10. Move Payment Proposal to Finance.

### P2 — Tier-1 Operations

1. Forecast and demand planning.
2. Finite-capacity scheduling.
3. Shop-floor execution tablet/mobile.
4. Rework, scrap, subcontract, co/by-products.
5. WIP and detailed production variance accounting.
6. Supplier collaboration, ASN, and agreements.
7. Advanced WMS and barcode execution.
8. Project Operations and WBS costing.
9. Maintenance/EAM.
10. Operational analytics and anomaly detection.

---

## Final Conclusion

The Operations category is **not yet 100% equivalent** to SAP, Oracle, or Dynamics 365. It already has a credible enterprise transaction core, especially document governance, procurement controls, lot traceability, production material flow, and accounting integration.

The largest remaining gaps are not decorative features. They are structural controls:

1. Independent warehouse/location/bin architecture.
2. Site-scoped and dated MRP/planning.
3. Complete partial-receipt and three-way-match model.
4. Enforced quality gate and CAPA governance.
5. Production scheduling and capacity.
6. WMS/logistics execution.
7. Project and maintenance operations.
8. Database-level scope security.
9. Clean release and integration-test validation.

After P0 and P1, the module can be declared production-ready for internal MAT operations. After P0–P2, it can reach approximately **95–97% enterprise readiness for MAT's relevant scope**, while remaining lighter and easier to maintain than a full tier-1 suite.
