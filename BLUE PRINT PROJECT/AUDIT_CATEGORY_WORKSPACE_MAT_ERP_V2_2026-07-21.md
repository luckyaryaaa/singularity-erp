# AUDIT CATEGORY WORKSPACE — MAT ERP V2

**Project:** MAT ERP V2  
**Build audited:** v0.29.0  
**Audit date:** 21 July 2026  
**Scope:** Dashboard, My Work, Approval Center, Report Factory, Notifications, global navigation/search, personalization, data scope, performance, infrastructure, and security.

---

## 1. Executive Verdict

MAT ERP V2 already has a real cross-module workspace foundation:

- Executive dashboard.
- My Work inbox.
- Approval Center.
- Notification Center.
- Report Factory and scheduled reports.
- Command palette.
- SSE-driven refresh.
- Responsive desktop/mobile shell.
- Saved report filters.
- Background jobs and generated artifacts.

However, it is not yet equivalent to the full workspace experience of SAP My Home / SAP Task Center, Oracle Fusion Worklist / Approvals, or Dynamics 365 workspaces.

The current state is best described as:

> **Strong Workspace Foundation — Data Entitlement, Unified Task Model, Personalization, Notification Semantics, and Workspace Performance Still Incomplete.**

### Readiness score

| Area | Current | Final target |
|---|---:|---:|
| Workspace menu and operating model | 76/100 | 96/100 |
| Executive dashboard | 70/100 | 95/100 |
| My Work / task inbox | 62/100 | 96/100 |
| Approval Center | 72/100 | 96/100 |
| Notification Center | 55/100 | 95/100 |
| Report Factory | 64/100 | 95/100 |
| Personalization and navigation | 58/100 | 94/100 |
| Visual UI/UX | 80/100 | 95/100 |
| Architecture and performance | 69/100 | 95/100 |
| Security and data scope | 52/100 | 97/100 |
| Infrastructure and release | 68/100 | 97/100 |
| **Overall Workspace readiness** | **67/100** | **95–97/100** |

---

## 2. Current Workspace Structure

```text
RUANG KERJA
├── Dashboard
├── My Work
├── Persetujuan saya
├── Laporan
└── Notifikasi
```

This is a good initial structure. It correctly groups cross-module experiences outside Sales, Operations, Finance, HR, Master Data, and System.

The main problem is not the number of menus. The problem is that the pages still behave as separate summaries rather than one governed enterprise work hub.

---

## 3. What Is Already Strong

### 3.1 Dashboard

Current strengths:

- Role/permission-controlled menu visibility.
- Branch filtering for most business-document data.
- Executive greeting and current-date context.
- Approval attention banner.
- Revenue, AR, AP, order book, inventory, and production indicators.
- Active-work table with drill-through drawer.
- Manual refresh.
- Cache with stale-time control.
- AbortController when changing routes.
- SSE event invalidation.
- Refresh on browser-tab focus instead of aggressive polling.
- Executive cockpit backed by a materialized reporting layer for users with report permission.

### 3.2 My Work

Current sections:

- Waiting for my approval.
- Created by me and still running.
- Returned for revision.
- Overdue documents.
- Failed background jobs.
- Action-required notifications.

This is a useful cross-module starting point.

### 3.3 Approval Center

Current strengths:

- Pagination and enterprise table component.
- Search and view controls.
- Sort by value.
- Applicant, value, approval level, credit exposure, age, and risk.
- Quick approve/reject.
- Drawer drill-through.
- Approval-policy version snapshot.
- Creator-versus-approver SoD check.
- Idempotency on document actions.
- Audit trail and approval-chain display.

### 3.4 Report Factory

Current strengths:

- Report catalog.
- XLSX/PDF job generation.
- Scheduled daily/weekly/monthly reports.
- Optimistic locking on schedules.
- User/branch scope in reporting queries.
- Materialized executive KPI view.
- Reporting refresh history.
- Saved private filters for executive cockpit.
- Generated-artifact audit on download.

### 3.5 Notification and Runtime

Current strengths:

- In-app notification persistence.
- Email-delivery foundation.
- Delivery-attempt records.
- Notification deduplication.
- Background-job retries and dead-letter status.
- SSE badge refresh.
- Read-all and individual read actions.

### 3.6 UI and Accessibility

Selective testing completed successfully:

- 31/31 application, authorization, and architecture tests passed.
- 18/18 accessibility checks passed.
- Security headers and traversal protection passed.
- Fingerprinted/precompressed release assets passed.
- Clean release build succeeded with 297 files.

The interface already uses:

- Semantic design tokens.
- Deep-navy navigation.
- White enterprise workspace.
- Good typography hierarchy.
- Responsive cards.
- Keyboard-accessible command palette.
- Focus management and inert drawer background.
- Reduced-motion support.

---

## 4. Critical Security and Data-Governance Findings

## Critical 1 — Dashboard Financial Data Is Too Broadly Available

`dashboard.view` is granted to nearly every role, including `employee`, `system_admin`, and `security_admin`.

The PostgreSQL dashboard endpoint returns:

- Revenue.
- AR outstanding.
- AP outstanding.
- Inventory value.
- Order book.
- Active orders.
- Production progress.

Therefore, users who only need a basic landing page can receive commercial and financial aggregates outside their job need.

### Required correction

Replace the single broad `dashboard.view` permission with KPI-level entitlements:

```text
dashboard.open
workspace.executive.view
workspace.finance_kpi.view
workspace.sales_kpi.view
workspace.operations_kpi.view
workspace.hr_kpi.view
workspace.security_kpi.view
workspace.own_tasks.view
```

The API must assemble dashboard cards from an authorized KPI catalog. Hidden frontend cards are not sufficient.

---

## Critical 2 — Inventory KPI Ignores Branch Scope

In `backend/routes/workspace.js`, inventory is queried globally:

```sql
SELECT count(*) sku_count,
       sum(value_idr) value,
       count(*) FILTER (WHERE qty_on_hand < min_qty) critical
FROM inventory_balances
```

No branch or warehouse condition is applied.

A branch-scoped user can therefore receive company-wide inventory count, value, and critical-stock count on the dashboard.

### Required correction

Every workspace aggregate must receive a resolved scope context:

```text
User
→ Legal Entity Scope
→ Business Unit Scope
→ Branch Scope
→ Plant/Warehouse Scope
→ KPI Permission
```

Add PostgreSQL RLS as defense-in-depth.

---

## Critical 3 — Report-Level Authorization Is Missing

The permission model grants broad `report.view`, `report.create`, and `report.export` rights to many roles.

The report catalog includes:

- Payroll and BPJS recap.
- Financial statements.
- AR/AP aging.
- Project profitability.
- Inventory movement.
- Production and quality reports.

The report-generation job validates only generic `report.export`, not the specific report classification.

This means a Sales, Procurement, Warehouse, Production, or HR user may potentially request reports outside their functional responsibility, subject only to branch scope.

### Required correction

Use report-specific permissions and data classifications:

```text
report.sales_customer.view
report.ar_ap_aging.view
report.project_profitability.view
report.production_performance.view
report.inventory_movement.view
report.payroll_bpjs.view
report.financial_statement.view
report.quality_analytics.view
```

Also apply:

- Column-level masking.
- Export permission separate from view.
- Schedule permission separate from ad-hoc export.
- Recipient and delivery-channel controls.
- Export reason for restricted reports.
- Recent MFA for payroll or confidential financial exports.

---

## Critical 4 — Role Notifications Share One Read State

The `notifications` table has one `read_at` field on the notification itself.

A role-targeted notification is retrieved with:

```sql
target_role IN (user.role, '*')
```

When one recipient marks that notification as read, the shared row is updated. The notification can then become read for every other user in the same role.

### Impact

- One warehouse user can clear a warehouse warning for all warehouse users.
- One approver can remove a role-targeted notification from another approver's unread list.
- Read history cannot prove which recipient actually viewed the message.

### Required architecture

```text
notifications
├── Notification content
├── Category
├── Source event
├── Scope
└── Expiry

notification_recipients
├── Notification ID
├── User ID
├── Delivered At
├── Read At
├── Acknowledged At
├── Dismissed At
└── Channel status
```

Role, team, and branch targeting must be expanded into recipient rows or evaluated through a secure recipient mapping.

---

## Critical 5 — Role Notifications Have No Branch or Legal-Entity Scope

Notifications only carry:

- `user_id`, or
- `target_role`.

They do not carry:

- Legal Entity.
- Branch.
- Department.
- Plant.
- Warehouse.
- Project.

A role-targeted message can therefore be visible to users of that role across unrelated branches.

Add scope fields and enforce the same ABAC/RLS policy used by the source document.

---

## Critical 6 — “Action Required” Is Confused with “Unread”

My Work builds action-required work from unread notifications.

Marking a notification as read removes it from the action-required list even when the underlying business action is still incomplete.

Reading is not task completion.

### Correct model

```text
Notification status
→ unread / read / dismissed

Work item status
→ open / claimed / in progress / completed / cancelled / expired
```

A task should disappear only when its source condition is resolved or the task itself is completed.

---

## Critical 7 — No PostgreSQL RLS for Workspace Data

No Row-Level Security policy was found for:

- Notifications.
- Notification recipients.
- Work items.
- Approval queue data.
- Saved views.
- Report schedules.
- Generated artifacts.
- Dashboard aggregates.

Application-level checks remain necessary, but Workspace is a cross-module data surface. A failure in one aggregate query can expose data from several domains at once.

Use RLS with default-deny policies for scoped tables and secure views.

---

## 5. Data Accuracy and Trust Findings

## 5.1 Two Dashboard Calculation Engines

MAT ERP currently has:

1. A basic `/api/dashboard` calculation based primarily on business documents.
2. An executive cockpit based on General Ledger, subledger, and materialized reporting.

This can produce different definitions for the same executive term.

Examples in the PostgreSQL basic dashboard:

- `revenueGrowthPct` is hard-coded to zero.
- `cashPosition` is hard-coded to zero.
- Revenue is based on invoice documents rather than GL revenue.

The executive cockpit, by contrast, uses GL-derived metrics.

### Required correction

Create one governed semantic KPI service:

```text
KPI Definition
├── Code
├── Business meaning
├── Formula
├── Source tables
├── Currency
├── Scope dimensions
├── Freshness SLA
├── Owner
├── Data classification
└── Version
```

All dashboards must consume the same KPI definitions.

---

## 5.2 “SLA Risk” Is Not Actually SLA Risk

The dashboard counts high-value approval items as `slaRisk`, but approval risk is currently based only on amount thresholds:

```text
> Rp100 million = high
> Rp25 million = medium
otherwise = low
```

This is a financial-value risk score, not SLA risk.

A proper SLA score should include:

- Assigned time.
- Due time.
- Remaining time.
- Escalation stage.
- Document priority.
- Business impact.
- Replacement approver availability.

---

## 5.3 My Work Totals Are Inconsistent

Some My Work totals are full database counts. Others use the number of items returned after `LIMIT 5`.

Affected sections include:

- Returned for revision.
- Failed jobs.
- Action-required notifications.

The UI can show a total of 5 when there are more than 5 items.

All sections need independent count queries or a unified task-summary view.

---

## 6. Missing Enterprise Workspace Capabilities

## 6.1 No Unified Work-Item Model

Current My Work is assembled ad hoc from:

- Business documents.
- Approval queries.
- Background jobs.
- Notifications.

There is no central task entity.

Create:

```text
work_items
├── ID
├── Work type
├── Source module
├── Source entity ID
├── Title and summary
├── Assignee user/team/role
├── Scope
├── Priority
├── Risk
├── Status
├── Created At
├── Due At
├── SLA policy
├── Claim/lock
├── Action schema
├── Completion condition
└── Version
```

Related tables:

- `work_item_actions`
- `work_item_comments`
- `work_item_attachments`
- `work_item_watchers`
- `work_item_delegations`
- `work_item_history`
- `work_item_escalations`

---

## 6.2 No Delegation, Substitution, or Vacation Rules

Enterprise approval workspaces need:

- Temporary delegation.
- Vacation substitution.
- Delegation by document type.
- Effective dates.
- Maximum amount.
- Scope restriction.
- Delegate acceptance.
- SoD revalidation.
- Automatic return after expiry.
- Audit and post-review.

---

## 6.3 Approval Actions Are Too Limited

Current quick actions are mainly:

- Approve.
- Reject.

Add:

- Request information.
- Return for revision.
- Delegate.
- Reassign.
- Claim/unclaim.
- Put on hold.
- Withdraw by requester.
- Escalate.
- Add comment.
- Open source evidence.
- Compare before/after values.
- View policy/routing explanation.

Bulk approval should only be available for explicitly low-risk, homogeneous tasks.

---

## 6.4 No Role-Based Workspace Composition

Every user receives essentially the same dashboard structure, with a richer block for users who have `report.view`.

Enterprise target:

```text
Owner Workspace
Finance Workspace
Sales Workspace
Operations Workspace
HR Workspace
Warehouse Workspace
Employee Self-Service Workspace
System Administration Workspace
```

Each workspace should contain only authorized and job-relevant:

- KPIs.
- Tasks.
- Exceptions.
- Quick actions.
- Lists.
- Reports.
- Links.

---

## 6.5 Limited Personalization

Saved filters currently exist only for the executive cockpit.

Missing:

- Pin to workspace.
- Favorites.
- Recently opened pages.
- Recently opened records.
- User-selected initial page.
- Reorder cards.
- Resize cards.
- Hide/show cards.
- Saved My Work views.
- Saved Approval views.
- Role-published workspace templates.
- Reset to default.
- Admin-published mandatory cards.

---

## 6.6 Command Palette Is Navigation-Only

The top search currently searches module and group labels.

It does not search:

- Document number.
- Customer.
- Supplier.
- Product.
- Employee.
- Project.
- Work Order.
- Report.
- Action.
- Help content.

Create permission-aware enterprise search with:

- Server-side search.
- Result type grouping.
- Branch/legal-entity scope.
- Recent search.
- Search analytics.
- No sensitive preview without field permission.

---

## 6.7 Notification Preferences Are Missing

Add user controls for:

- In-app.
- Email.
- Daily digest.
- Immediate critical alert.
- Category mute.
- Quiet hours.
- Escalation channel.
- Language.
- Timezone.
- Retention.

Critical compliance or security alerts must not be user-mutable unless policy allows it.

---

## 7. Performance and Architecture Findings

## 7.1 Dashboard Loads All Scoped Business Documents

The basic PostgreSQL dashboard starts with:

```sql
SELECT *
FROM business_documents
WHERE is_archived = false
  AND scope condition
ORDER BY updated_at DESC
```

The application then filters and aggregates the full result in Node.js.

This will degrade as transaction volume grows.

### Replace with

- Aggregated SQL queries.
- Dedicated read models.
- Materialized views.
- Incremental KPI snapshots.
- Selective indexes.
- Role/scope cache keys.

Do not cache data across incompatible security scopes.

---

## 7.2 Full Dashboard Re-Renders on Any Active-Page Event

`dashboard.onEvent()` does not distinguish event type. Any routed SSE event can trigger a full dashboard render when the dashboard is active.

Use:

- Event-to-widget dependency mapping.
- Partial card refresh.
- Debounced aggregate refresh.
- Stale-while-revalidate.
- Visible-widget loading.

---

## 7.3 Workspace Read Models Need a Dedicated Module

Recommended bounded context:

```text
WORKSPACE & EXPERIENCE
├── Workspace Composition
├── Task and Worklist
├── Approval Experience
├── Notification and Delivery
├── Search and Navigation
├── Personalization
├── KPI and Insight Delivery
└── Workspace Security
```

Recommended services:

- `WorkspaceCompositionService`
- `WorkItemService`
- `ApprovalWorklistService`
- `NotificationService`
- `RecipientResolutionService`
- `WorkspaceSearchService`
- `PersonalizationService`
- `KpiEntitlementService`
- `WorkspaceScopePolicyService`
- `WorkspaceAuditService`

Continue using a modular monolith with PostgreSQL. Microservices are not required for MAT at this stage.

---

## 8. Recommended Final Menu

```text
WORKSPACE
├── My Home
│   ├── Today
│   ├── Insights
│   ├── Exceptions
│   └── Quick Actions
│
├── My Work
│   ├── Assigned to Me
│   ├── Claimed by Me
│   ├── Created by Me
│   ├── Returned for Revision
│   ├── Overdue & At Risk
│   ├── Following
│   └── Completed Recently
│
├── Approvals
│   ├── My Approvals
│   ├── Delegated to Me
│   ├── Delegated by Me
│   ├── Waiting for Others
│   ├── Escalations
│   └── Approval History
│
├── Notifications
│   ├── Inbox
│   ├── Action Required
│   ├── System Alerts
│   ├── Mentions
│   └── Preferences
│
├── Reports & Insights
│   ├── My Reports
│   ├── Report Library
│   ├── Scheduled Reports
│   ├── Generated Files
│   └── Saved Views
│
├── Calendar & Deadlines
├── Favorites & Recent
└── Workspace Settings
```

The current `Dashboard` can be renamed **My Home**. Executive analytics should be one authorized workspace composition, not the default experience for every role.

---

## 9. Final UI/UX Direction

### Composition

```text
88% Clean Enterprise
8% Pearl Glass
4% Cute Clay and Motion
```

Workspace can use more friendly visual elements than Finance or System, but the interface must remain task-oriented.

### Visual language

- Pearl-white background.
- Deep-navy sidebar.
- Azure interactive states.
- Champagne-gold for approval/priority.
- Mint for completed/healthy.
- Amber for due soon.
- Coral for overdue/critical.
- Lavender for insight/information.
- Soft pearl-glass cards.
- Minimal animation with reduced-motion support.

### Cute clay can be used for

- Welcome illustration.
- Inbox/task icon.
- Approval stamp.
- Notification bell.
- Report folder.
- Empty states.
- Completed-work celebration.
- Assistant/help illustration.

### Cute clay should not be used for

- Approval evidence.
- Financial values.
- Audit timeline.
- Restricted report data.
- Dense worklists.
- Critical incident data.

---

## 10. Page Design Blueprint

## 10.1 My Home

Header context:

- Legal Entity/Branch.
- Current date/timezone.
- Last refresh.
- Personal workspace view.
- Edit workspace.

Sections:

1. **Today** — work due today, approvals, appointments.
2. **Needs Attention** — overdue, blocked, failed, high-risk.
3. **Operating Pulse** — role-authorized KPIs.
4. **My Processes** — current documents/orders/projects.
5. **Quick Actions** — role-authorized create actions.
6. **Recent & Favorites**.

## 10.2 My Work

Use a unified worklist with:

- View selector.
- Search.
- Priority.
- Status.
- Module.
- Due date.
- Assignee/team.
- Scope.
- Saved views.
- Bulk actions where safe.

Desktop: split view with list and detail panel.  
Mobile: task cards, not a wide table.

## 10.3 Approval Center

Three-column desktop layout:

```text
Queue
→ Decision Context
→ Evidence and Impact
```

Decision context:

- Requester.
- Amount.
- Policy.
- Approval chain.
- Age and SLA.
- Risk explanation.
- Credit/budget/margin impact.
- Previous similar decisions.

Mobile approval must be a card/detail flow. The current mobile screenshot still uses a wide table, so approval level, risk, and action buttons are pushed off-screen.

## 10.4 Notification Center

Tabs:

- All.
- Action required.
- Warnings.
- Information.
- System alerts.

Actions:

- Open source.
- Acknowledge.
- Snooze.
- Dismiss.
- Mute category.
- Mark read/unread.

Read state must be per recipient.

## 10.5 Report Factory

Each report card must show:

- Data classification.
- Required permission.
- Scope.
- Data freshness.
- Owner.
- Last generated.
- Available formats.

Restricted exports must show:

- Reason.
- MFA requirement.
- Watermark.
- Expiry.
- Download audit.

---

## 11. Infrastructure and Release Findings

The audited workspace ZIP still includes:

- `.env`.
- `.git`.
- `node_modules`.
- Runtime storage.
- Screenshots and generated files.
- 17 PostgreSQL dumps, approximately 6.55 MiB.

This is not a safe deployment or vendor-sharing package.

The clean release builder succeeded:

```text
297 release files
Latest migration: 039_account_roles_tax_rates.sql
SHA-256 release fingerprint generated
```

The secret scanner reported:

```text
452 files scanned
0 findings
```

However, the scanner excludes `.env`, storage, database dumps, PDFs, spreadsheets, images, and ZIP files. Final artifact scanning is still mandatory.

Recommended pipeline:

```text
Source Scan
→ Dependency Scan
→ Unit/Integration/Security Test
→ Build Clean Release
→ Final Artifact and DLP Scan
→ SBOM
→ Sign Manifest
→ Hash Verification
→ Deploy
→ Smoke Test
→ KPI/Data-Scope Reconciliation
```

---

## 12. Testing Status

### Passed in this audit

- Application and API selective tests: **31/31 PASS**.
- Accessibility audit: **18/18 PASS**.
- Authorization handler coverage: **195 handlers**.
- Modular frontend/backend architecture: **PASS**.
- Security headers and traversal protection: **PASS**.
- Fingerprinted/precompressed release assets: **PASS**.
- Clean release build: **PASS — 297 files**.

### Not validated

PostgreSQL at `127.0.0.1:5432` was unavailable during this audit. Therefore, database integration tests for:

- Notification recipient semantics.
- Cross-branch dashboard isolation.
- Report subtype authorization.
- Worklist concurrency.
- Approval delegation.
- RLS.

remain **not validated**.

---

## 13. Implementation Priorities

## P0 — Stop-Ship Security and Data Trust

1. Restrict dashboard KPIs by role and field entitlement.
2. Fix global inventory KPI branch leakage.
3. Implement report-specific authorization.
4. Separate restricted report view/export/schedule permissions.
5. Replace shared notification `read_at` with per-recipient state.
6. Add branch/legal-entity scope to notifications.
7. Separate action completion from notification read status.
8. Standardize all dashboard KPIs on one semantic layer.
9. Remove hard-coded/placeholder financial values.
10. Implement PostgreSQL RLS for workspace/report/notification data.
11. Add tests for employee/security-admin dashboard exposure.
12. Run full PostgreSQL integration and IDOR tests.

## P1 — Production-Complete Workspace

1. Create unified `work_items` model.
2. Add delegation, substitution, and vacation rules.
3. Add SLA, escalation, claim, hold, and reassignment.
4. Add role-based workspace compositions.
5. Add saved views for My Work and Approvals.
6. Add favorites, recent pages, and pinned cards.
7. Add permission-aware global business search.
8. Redesign mobile Approval Center as cards/detail flow.
9. Add notification preferences, acknowledgement, snooze, and archive.
10. Replace full-document dashboard scans with read models/materialized summaries.
11. Add partial widget refresh and scope-safe caching.
12. Add report classification, watermarks, expiry, and export evidence.

## P2 — Tier-1 Experience

1. Workspace designer and role-published templates.
2. User-created tiles, lists, links, and KPI cards.
3. Team queues and shared work baskets.
4. AI-assisted prioritization with explainable rules.
5. Situation/exception handling framework.
6. Cross-application task integration.
7. Mobile push notifications.
8. Calendar and deadline orchestration.
9. Collaboration, mentions, and watchers.
10. Workspace analytics: task aging, bottlenecks, completion time, and workload balancing.

---

## 14. Final Verdict

The Workspace category is already one of the cleaner and more usable parts of MAT ERP V2. It has good visual fundamentals, responsive behavior, real work queues, approval context, reports, scheduled jobs, and event-driven refresh.

It is not yet enterprise-final because the cross-module surface currently has several high-impact entitlement and workflow-semantic gaps:

1. Dashboard metrics are too broadly exposed.
2. Inventory KPI is not branch-scoped.
3. Report authorization is not report-specific.
4. Role notifications share read state.
5. Notification read status is incorrectly used as task completion.
6. There is no unified work-item, delegation, SLA, or escalation model.
7. Workspace personalization remains limited.

After P0 and P1 are completed, Workspace can be declared production-ready for internal MAT use.

After P0–P2, the realistic target is:

> **95–97% enterprise-ready based on the relevant SAP, Oracle, and Dynamics 365 workspace patterns, while remaining lighter and easier to maintain.**

---

## Official benchmark references

- SAP Help Portal — SAP Task Center and My Home.
- Oracle Fusion Cloud Applications — Notifications, Approvals, Worklist, and delegation rules.
- Microsoft Learn — Dynamics 365 Finance and Operations workspaces, personalization, tiles, lists, links, and workspace caching.
- PostgreSQL Documentation — Row Security Policies.
- OWASP — Application Security Verification Standard.
