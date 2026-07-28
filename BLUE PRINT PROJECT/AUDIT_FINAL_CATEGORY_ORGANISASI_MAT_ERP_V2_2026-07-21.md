# AUDIT FINAL KATEGORI ORGANISASI — MAT ERP V2

**Tanggal audit:** 21 Juli 2026  
**Versi aplikasi:** 0.28.1  
**Ruang lingkup:** menu, frontend, backend, PostgreSQL schema, authorization, data scope, audit trail, release hygiene, testing, dan UI/UX.

## Executive Verdict

Fondasi kategori Organisasi MAT ERP V2 sudah kuat untuk custom ERP internal, tetapi belum menjadi Organization Administration Suite yang lengkap seperti pola SAP S/4HANA, Oracle Fusion Cloud, atau Dynamics 365 Finance & Operations.

**Engineering assessment:**

| Area | Saat ini | Target |
|---|---:|---:|
| Data model organisasi | 82/100 | 96/100 |
| Fitur dan governance | 68/100 | 95/100 |
| UI/UX | 72/100 | 95/100 |
| Arsitektur | 80/100 | 94/100 |
| Database integrity | 74/100 | 95/100 |
| Security | 73/100 | 96/100 |
| Release/infrastruktur | 70/100 | 97/100 |
| Overall | 74/100 | 95–97/100 |

Nilai merupakan gap assessment engineering, bukan sertifikasi vendor.

## Kondisi Saat Ini

Sidebar ORGANISASI masih mencampur struktur organisasi dengan transaksi HR:

- Struktur perusahaan
- Karyawan
- Kehadiran
- Shift & kalender
- Cuti
- Payroll

Data model PostgreSQL telah menyediakan:

- Legal Entity
- Ledger dan Fiscal Calendar
- Business Unit
- Branch
- Department
- Cost Center dan Profit Center
- Plant
- Warehouse, Storage Location, Bin
- Work Center
- Project WBS
- Work Location
- Organization Asset
- Tax Identity
- Company Bank Account
- Authorized Signatory
- Effective dating dan MDM version pada sebagian objek
- Snapshot identitas organisasi pada dokumen bisnis

Namun API dan frontend Organisasi baru menyediakan maintenance nyata untuk:

- Identitas Legal Entity
- Company bank account
- Tax identity
- Asset
- Signatory

Business Unit, Branch, Department, Cost Center, Profit Center, Plant, Warehouse, Ledger, dan Fiscal Calendar mayoritas baru dibaca sebagai hierarchy/count, belum mempunyai complete lifecycle workbench.

## Temuan Utama

### 1. Tidak ada Legal Entity List dan Switcher

Endpoint dapat menerima Legal Entity ID, tetapi frontend selalu mengambil entitas default. Belum ada group-level overview, selector, consolidated chart, atau cross-entity relationship.

### 2. Organization API belum menegakkan Legal Entity Scope

Repository memilih legal entity berdasarkan ID tanpa memvalidasi apakah user ditugaskan ke entitas tersebut. Pada implementasi multi-company, permission `organization.view` dapat terlalu luas.

### 3. Belum ada Organization Change Request

Identitas legal entity masih dapat diubah langsung oleh Owner dengan PIN. Tax identity, asset, dan signatory dapat dibuat langsung tanpa workflow review/approval yang konsisten.

Target:

DRAFT → SUBMITTED → VALIDATED → REVIEWED → APPROVED → SCHEDULED → ACTIVE → SUPERSEDED/RETIRED

### 4. Belum ada Versioned Purpose-Based Hierarchy

Dibutuhkan hierarchy terpisah untuk:

- Management reporting
- Financial reporting
- Procurement responsibility
- Sales responsibility
- HR reporting
- Approval authority
- Security scope
- Cost allocation

Setiap hierarchy harus memiliki draft, version, effective date, validation, approval, publication, dan rollback.

### 5. Belum ada Position dan Job Structure Formal

Employee masih menyimpan jabatan sebagai atribut. Target enterprise memisahkan Job, Position, Position Assignment, Reports-to Position, Grade, Headcount, Vacancy, dan Authority.

### 6. Belum ada Sales/Purchasing Responsibility Structure

Tambahkan:

- Purchasing Organization
- Purchasing Group
- Sales Organization
- Sales Office
- Sales Group
- Service Organization

Tidak perlu menyalin kompleksitas SAP secara penuh, tetapi ownership, approval, pricing, dan data scope harus jelas.

### 7. Effective Dating Belum Konsisten

Perlu diterapkan ke seluruh organization unit dan assignment. Perubahan struktur tidak boleh menghapus histori transaksi lama.

### 8. Referential Integrity Masih Perlu Diperketat

Tambahkan validasi/constraint untuk:

- Branch harus milik Legal Entity terkait
- Department/Cost Center/Profit Center harus konsisten
- Plant dan Warehouse harus konsisten dengan Branch
- Tax identity branch harus konsisten dengan Legal Entity
- Signatory employee harus mempunyai active organization assignment
- Effective date tidak overlap
- Department hierarchy tidak cycle

### 9. PostgreSQL Row-Level Security Belum Ada

Tidak ditemukan `ENABLE ROW LEVEL SECURITY` atau `CREATE POLICY` pada tabel organisasi. Tambahkan RLS sebagai defense-in-depth untuk legal entity, branch, bank, tax, signatory, department, cost center, dan employee assignment.

### 10. Permission Terlalu Umum

Saat ini dominan:

- organization.view
- organization.edit
- organization.approve
- organization.reject

Target granular:

- organization.structure.view/maintain/publish
- organization.legal.view/propose/approve
- organization.bank.view_masked/view_full/propose/approve/reveal/export
- organization.tax.view/propose/approve
- organization.authority.manage
- organization.documents.manage
- organization.audit.view/export

### 11. Rekening Perusahaan Disimpan Plaintext

Masking response dan audit sudah ada, tetapi database masih menyimpan account number plaintext. Target: envelope encryption, masked projection, step-up MFA untuk reveal, dan audit setiap reveal/export.

### 12. Release Package Tidak Bersih

Workspace ZIP masih memuat `.env`, `.git`, `node_modules`, `storage`, log, dan 17 PostgreSQL dump. Release builder sendiri berhasil membuat clean artifact 297 file, tetapi distribusi harus selalu memakai generated release.

Secret scanner melaporkan 0 findings pada 452 file, tetapi scanner mengecualikan `.env`, `storage`, dump, PDF, spreadsheet, image, dan ZIP. Final artifact scanner harus memindai paket hasil distribusi, bukan hanya source allowlist.

## Struktur Menu Final

### ORGANISASI

- Organization Control Center
- Corporate Group / Enterprise
- Legal Entity
- Business Unit
- Branch & Location
- Plant / Workshop
- Warehouse & Storage Structure
- Department & Value Stream
- Position & Job Structure
- Cost Center & Profit Center
- Ledger & Fiscal Calendar
- Purchasing & Sales Responsibility
- Organization Hierarchy Designer
- Bank & Tax Identity
- Signatory & Delegation of Authority
- Documents & Licenses
- Intercompany Relationships
- Organization Change Requests
- Organization Audit & Governance

### PEOPLE & HR

- Employee Master
- Attendance
- Shift & Work Calendar
- Leave
- Payroll
- Employee Self Service

## Arsitektur Target

Tetap gunakan Modular Monolith + PostgreSQL.

Bounded context:

- Enterprise & Legal Structure
- Operational Structure
- Financial Dimensions
- Workforce Structure
- Location & Facility
- Authority & Signatory
- Organization Governance
- Organization Integration

Service target:

- OrganizationQueryService
- OrganizationCommandService
- HierarchyService
- EffectiveDatingService
- OrganizationChangeRequestService
- AuthorityMatrixService
- ScopePolicyService
- OrganizationValidationService
- OrganizationEventPublisher

Tambahkan API versioning, runtime schema validation, optimistic locking, idempotency, server pagination, saved views, import staging, ETag conflict, transactional activation, dan outbox events.

## UI/UX Target

Komposisi:

- 80% clean enterprise
- 15% premium cute clay
- 5% motion

Visual language:

- Pearl white background
- Pearl-glass panel
- Deep navy navigation
- Azure interaction accent
- Champagne-gold approval/authority accent
- Mint success
- Amber warning
- Coral critical
- Lavender informational

Clay hanya untuk KPI icon, facility landmark, empty state, onboarding, approval success, dan warning illustration. Tabel, form, dan workflow tetap clean dan profesional.

### Empat Halaman Utama

1. Organization Control Center
2. Organization Hierarchy Designer
3. Legal Entity 360 & Authority
4. Branch / Plant / Warehouse Governance

Wajib memiliki legal-entity switcher, lifecycle, quality score, pending change indicator, effective date, data steward, relationship graph, before-after diff, impact analysis, audit timeline, server pagination, saved views, bulk actions, permission states, dan mobile approval.

## Hasil Testing Audit

Selective tests:

- App shell/accessibility: PASS
- Semantic design tokens/responsive: PASS
- Security headers/traversal prevention: PASS
- Fingerprinted release assets: PASS
- Authorization matrix 195 handlers: PASS
- Permission allow/deny paths: PASS
- Public endpoint allowlist: PASS
- Branch helper default-deny: PASS
- Modular frontend/backend composition: PASS
- Organization least privilege static test: PASS

Empat PostgreSQL-dependent tests tidak dapat divalidasi karena database pada `127.0.0.1:5432` tidak aktif. Statusnya belum tervalidasi, bukan gagal secara implementasi.

## Roadmap

### P0 — Stop Ship

- Rotate all exposed credentials/secrets
- Audit and quarantine database dumps
- Distribute generated clean release only
- Add final artifact DLP/secret scan
- Enforce legal entity/branch scope
- Implement PostgreSQL RLS

### P1 — Production Complete

- Split Organization and HR Operations
- Add legal entity switcher and list
- Build complete CRUD/workbench for all organization units
- Implement Organization Change Request
- Apply effective dating consistently
- Add granular permissions and field security
- Encrypt bank/tax sensitive values
- Add hierarchy designer and impact validation

### P2 — Tier-1 Pattern

- Corporate Group/Enterprise layer
- Versioned purpose-based hierarchy
- Job/Position/Assignment model
- Delegation of Authority matrix
- Purchasing/Sales responsibility
- Shared services and intercompany
- Reorganization simulation and rollback

## Final Status

**Current:** Strong enterprise organization data foundation, incomplete administration and governance suite.  
**After P0–P2:** 100% complete for MAT internal scope and approximately 95–97% enterprise-ready by relevant control pattern.
