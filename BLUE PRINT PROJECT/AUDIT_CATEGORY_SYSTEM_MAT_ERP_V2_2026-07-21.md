# AUDIT CATEGORY SYSTEM — MAT ERP V2

**Tanggal audit:** 21 Juli 2026  
**Versi aplikasi:** MAT ERP V2 v0.29.0  
**Ruang lingkup:** System Administration, Identity & Access Management, authentication, authorization, audit, monitoring, background jobs, backup/restore, configuration, release, infrastructure, dan UI/UX.

---

## 1. Executive Verdict

MAT ERP V2 sudah memiliki fondasi platform yang jauh lebih matang daripada ERP CRUD biasa. Sistem telah mempunyai session persistence, CSRF protection, TOTP MFA, maker-checker role assignment, segregation of duties, access review, approval-policy versioning, audit log, persistent background jobs, quarantine file, backup/restore drill, migration checksum, atomic release, serta systemd hardening.

Namun kategori **SYSTEM belum setara penuh dengan SAP S/4HANA, Oracle Fusion Cloud, atau Dynamics 365 Finance & Operations**. Gap terbesarnya adalah runtime authorization masih bergantung pada role-permission map statis di source code, hanya satu primary role yang aktif, emergency access belum diintegrasikan ke authorization runtime, privileged MFA belum diwajibkan secara menyeluruh, audit belum sepenuhnya tamper-evident, observability masih in-process, serta backup dan configuration transport belum mencapai standar enterprise.

**Status paling tepat:**

> Strong Enterprise Platform Foundation — IAM Runtime, Privileged Security, Audit Integrity, Observability, and Disaster Recovery Still Incomplete.

### Skor Audit

| Area | Saat ini | Target final |
|---|---:|---:|
| Struktur menu dan fitur System | 77/100 | 96/100 |
| Identity & Access Management | 66/100 | 97/100 |
| Authentication & Session Security | 82/100 | 97/100 |
| SoD, Access Review & Governance | 76/100 | 96/100 |
| Audit & Compliance | 68/100 | 97/100 |
| Monitoring & Observability | 60/100 | 94/100 |
| Backup & Disaster Recovery | 72/100 | 96/100 |
| Configuration & Release Management | 70/100 | 96/100 |
| Arsitektur aplikasi | 82/100 | 95/100 |
| Infrastruktur deployment | 78/100 | 97/100 |
| Visual UI/UX | 74/100 | 95/100 |
| **Overall System readiness** | **72/100** | **95–97/100** |

---

## 2. Struktur Menu System Saat Ini

Kategori System saat ini mencakup:

- Pengguna & Peran
- IAM & Role Assignment
- SoD Conflict Center
- Approval Policy
- Access Review
- Log Audit
- Monitoring
- Job Latar Belakang
- Self Test
- Template Dokumen
- Pengaturan

Struktur ini sudah mempunyai komponen governance penting, tetapi masih mencampur identity, security, workflow, configuration, platform operations, audit, dan release dalam satu daftar datar. Belum ada pusat kontrol terpadu untuk backup, incident, integration, API client, configuration transport, environment, dan release registry.

---

## 3. Kontrol yang Sudah Bagus

### Authentication dan Session

- Password disimpan menggunakan scrypt dengan salt.
- Session token dan CSRF token disimpan dalam bentuk hash.
- HttpOnly cookie, SameSite Strict, dan Secure cookie pada production.
- Idle timeout dan absolute timeout.
- Login rate limiting, failed-attempt counter, dan account lockout.
- Pending authentication challenge disimpan persisten dan bersifat one-time.
- TOTP MFA terenkripsi AES-256-GCM.
- Recent-MFA check pada beberapa aksi sensitif.
- CSRF dan origin validation.
- CSP, HSTS production, X-Frame-Options, nosniff, Referrer-Policy, serta Permissions-Policy.
- Request, header, keep-alive, dan socket timeout.

### IAM dan Governance

- Enterprise roles dan user-role assignment.
- Maker-checker role assignment.
- Effective date dan expiration date assignment.
- Session invalidation setelah perubahan akses.
- SoD rule dan conflict event.
- Access-review campaign dengan retain/revoke decision.
- Approval-policy versioning.
- Maker tidak dapat mengaktifkan policy buatannya sendiri.
- Emergency-access record maksimal 24 jam dan memerlukan Owner PIN.

### Platform Operations

- Persistent background-job queue.
- Lease, heartbeat, retry, dead-letter, cancel, dan retry endpoint.
- File quarantine dan malware-scanner integration.
- Migration checksum dan rollback verification.
- Backup run, retention, offsite encrypted copy, dan restore drill.
- Atomic release dengan symlink dan rollback.
- Release fingerprint dan content-hashed assets.
- Caddy reverse-proxy/TLS configuration.
- Systemd hardening.
- Self-test dan release-gate foundation.

---

## 4. Critical Findings

### Critical 1 — Runtime Authorization Masih Statis di Source Code

`backend/core/permissions.js` memuat `ROLE_GRANTS` secara hard-coded. Fungsi `hasPermission()` hanya membaca `user.role` dan peta statis tersebut.

Dampak:

- Role dan permission di database belum menjadi sumber kebenaran runtime.
- Custom role tidak dapat dirancang secara aman tanpa mengubah code dan redeploy.
- Role versioning dan permission changes pada UI tidak otomatis mengubah enforcement.
- Sulit membuat kombinasi duty/privilege yang granular.
- Sulit menguji effective permission secara dinamis.

Target:

```text
Role
└── Duty
    └── Privilege
        └── Resource + Operation
            └── Data Access Policy
```

Runtime authorization harus membaca compiled permission grants dari database/cache terkontrol, mempunyai version number, invalidation, audit, deny override, dan policy simulation.

### Critical 2 — Hanya Satu Primary Role

Repository role assignment secara eksplisit menolak additional role. Runtime memakai tepat satu primary role per user.

Dampak:

- User lintas fungsi harus diberi role yang terlalu besar.
- Least privilege sulit diterapkan.
- Tanggung jawab tambahan sementara tidak dapat diberikan secara terkontrol.
- Mendorong pembuatan “super role”.

Target:

- Multiple business roles per user.
- Duty/privilege composition.
- Scope per assignment.
- Effective date dan expiration.
- Temporary role.
- Conflict validation sebelum activation.
- Effective-access report.

### Critical 3 — Emergency Access Belum Diintegrasikan ke Authorization Runtime

Emergency override tersimpan dalam `emergency_access_overrides`, tetapi jalur `hasPermission()` tidak membaca override aktif tersebut.

Artinya, fitur saat ini berfungsi sebagai governance record, tetapi belum terlihat sebagai sumber izin runtime yang benar-benar memberikan akses sementara.

Target:

- Dedicated break-glass account atau privileged session.
- Time-bound permission.
- Ticket/reason wajib.
- Approval terpisah.
- Recent MFA/passkey.
- Session banner.
- Automatic expiration.
- Command/action audit.
- Post-use review.
- Immediate revocation.

### Critical 4 — Privileged MFA Belum Mandatory

MFA tersedia, tetapi belum dipaksa untuk semua role privileged. User juga dapat menonaktifkan MFA menggunakan password tanpa existing-factor verification.

Target:

- MFA mandatory untuk Owner, System Admin, Security Admin, Finance Controller, dan auditor tertentu.
- Existing MFA factor required sebelum disable/change.
- Risk-based check untuk device/location baru.
- Out-of-band notification saat factor berubah.
- Recovery code atau admin recovery workflow.
- Passkey/WebAuthn atau hardware security key.
- Step-up authentication untuk export, reveal, role approval, backup restore, configuration activation, dan emergency access.

### Critical 5 — Parameter Password Hashing Perlu Ditingkatkan

Konfigurasi scrypt saat ini:

```text
N = 2^14
r = 8
p = 1
```

Target minimum modern perlu dinaikkan secara bertahap, misalnya Argon2id atau scrypt dengan work factor lebih tinggi. Implementasikan password-hash versioning dan rehash-on-login agar migrasi tidak memaksa reset seluruh user.

### Critical 6 — Audit Partition Privilege Belum Aman Sepenuhnya

Grant runtime database memberikan SELECT/INSERT/UPDATE/DELETE secara luas, kemudian mencabut UPDATE/DELETE hanya pada sebagian tabel audit. Future/default audit partitions tidak seluruhnya tercakup oleh explicit deny-list.

Dampak:

- Database runtime credential yang disalahgunakan berpotensi mengubah atau menghapus audit partition yang tidak dicabut haknya.
- Klaim append-only belum sepenuhnya terjamin.

Target:

- Allowlist database grants, bukan broad grant lalu revoke sebagian.
- Runtime hanya INSERT pada seluruh audit parent/partitions.
- Tidak ada UPDATE/DELETE/TRUNCATE untuk application role.
- Default privilege otomatis aman untuk partition baru.
- Cryptographic hash chain atau signed batch.
- Immutable offsite/WORM copy.
- Audit setiap read/export audit log.

### Critical 7 — Audit Log Berisiko Menyimpan Data Sensitif

Runtime audit menerima `oldValue` dan `newValue` tanpa central redaction. Beberapa route dapat mengirim objek penuh.

Risiko:

- Bank account.
- Tax identity.
- Salary.
- Personal data.
- Authentication metadata.
- Confidential configuration.

Target:

- Central AuditRedactionService.
- Field classification: public/internal/confidential/restricted/secret.
- Mask/hash/encrypt sebelum insert.
- Separate security audit dan business audit.
- Read permission granular.
- Export approval.
- Retention dan legal hold.

### Critical 8 — Belum Ada PostgreSQL Row-Level Security

Authorization masih dominan di application layer. Belum ditemukan RLS policy pada tabel utama.

RLS diperlukan sebagai defense-in-depth untuk:

- Users dan role assignments.
- Audit data.
- Employee and restricted data.
- Finance data.
- Legal entity/branch-scoped transactions.
- Configuration dan approval records.

Policy harus menggunakan legal entity, branch, business unit, role assignment, dan session security context.

### Critical 9 — User Lifecycle Belum Lengkap

System menyediakan list, activate/deactivate, branch update, dan reset password. Belum tersedia lifecycle penuh:

```text
Joiner → Provision → Assign → Certify → Move → Suspend → Terminate → Retain Evidence
```

Belum ada:

- Create-user workflow.
- Employee-to-user provisioning.
- SSO/OIDC/SAML.
- SCIM provisioning.
- Service account/API client lifecycle.
- Dormant account policy.
- Manager attestation.
- Leaver automation.
- Account ownership dan sponsor.

### Critical 10 — Temporary Password Ditampilkan Langsung

Reset password mengembalikan temporary password ke UI. Walaupun hanya sekali, pola ini berisiko masuk screenshot, clipboard, screen recording, atau support chat.

Target:

- Identity-provider reset link.
- One-time secure reveal dengan expiry sangat singkat.
- Copy action diaudit.
- No display ulang.
- Notification terpisah.
- Mandatory change dan MFA enrollment.

### Critical 11 — Self-Test Memiliki Risiko False Assurance

Sebagian self-test menggunakan status PASS statis untuk menyatakan keberadaan fitur, bukan active probe.

Contoh kategori:

- Session token hashing.
- Persistent job queue.
- Authentication challenge persistence.
- Transaction ledger.

Target:

- Active functional probe.
- Evidence ID.
- Timestamp.
- Environment.
- Dependency status.
- Expected-versus-actual.
- Test owner.
- Expiry of evidence.
- Release gate hanya menerima fresh evidence.

### Critical 12 — Backup Lokal Masih Plaintext

Backup lokal `.dump` tidak terenkripsi; enkripsi baru diterapkan pada salinan offsite.

Target:

- Encrypt local backup at rest.
- KMS/Vault-managed key.
- Immutable backup copy.
- Offsite copy.
- Separate backup credential.
- Restore access approval.
- Backup access audit.
- RPO/RTO dashboard.

### Critical 13 — Restore Drill Belum Memvalidasi Bisnis

Restore drill saat ini memeriksa database dapat direstore, jumlah tabel minimal, dan migration terakhir.

Belum memeriksa:

- Row-count baseline.
- Referential integrity.
- Financial balance.
- Inventory reconciliation.
- User/permission integrity.
- Application smoke test.
- File/attachment consistency.
- Hash/checksum evidence.
- Actual recovery time.

### Critical 14 — Monitoring Masih In-Process

API metrics disimpan dalam memory proses sehingga hilang saat restart.

Belum tersedia monitoring enterprise untuk:

- CPU, memory, disk, I/O.
- Event-loop lag dan GC.
- PostgreSQL locks, slow query, connection saturation, WAL, replication.
- Queue age dan dead-letter trend.
- File quarantine trend.
- External dependency health.
- Certificate expiry.
- SLI/SLO/error budget.
- Incident acknowledgement dan escalation.

Target menggunakan OpenTelemetry-compatible tracing/metrics/logging atau stack observability setara.

### Critical 15 — Configuration Governance Terlalu Campur

Menu Pengaturan mencampur:

- Organization identity.
- Account roles dan tax rates.
- Numbering.
- Document templates.
- General settings.

Belum ada generic configuration change lifecycle, environment comparison, package transport, feature flag, impact simulation, dan rollback.

### Critical 16 — Release/Workspace Hygiene

Workspace ZIP masih membawa:

- `.env`
- `.git`
- `node_modules`
- runtime storage
- generated files
- 17 PostgreSQL dump, total sekitar 6.55 MiB

Release builder berhasil membuat paket bersih 297 file dan manifest SHA-256. Namun secret scanner mengecualikan `.env`, storage, dump, PDF, spreadsheet, image, dan ZIP sehingga hasil “0 findings” tidak membuktikan workspace/final attachment aman.

---

## 5. Struktur Menu Final yang Direkomendasikan

```text
SYSTEM / PLATFORM ADMINISTRATION
├── System Control Center
│   ├── Platform Overview
│   ├── Security Posture
│   ├── Environment & Release
│   └── Operational Alerts
│
├── Identity & Access
│   ├── Users
│   ├── Roles, Duties & Privileges
│   ├── Data Access Policies
│   ├── Role Assignments
│   ├── MFA & Passkeys
│   ├── Sessions & Devices
│   ├── Service Accounts
│   └── API Clients
│
├── Security Governance
│   ├── SoD Rules & Violations
│   ├── Privileged Access
│   ├── Emergency Access
│   ├── Access Reviews
│   ├── Security Events
│   └── Incident Center
│
├── Workflow Governance
│   ├── Approval Policies
│   ├── Delegation & Substitution
│   ├── SLA & Escalation
│   └── Workflow Audit
│
├── Configuration Management
│   ├── System Settings
│   ├── Numbering
│   ├── Document Templates
│   ├── Feature Flags
│   ├── Configuration Packages
│   └── Environment Comparison
│
├── Integration Center
│   ├── Connections
│   ├── Webhooks
│   ├── Email & Notifications
│   ├── API Clients
│   ├── Connector Health
│   └── Retry / Dead Letter
│
├── Platform Operations
│   ├── Monitoring & Health
│   ├── Jobs & Queues
│   ├── File Quarantine
│   ├── Backup & Restore
│   ├── Database & Storage
│   └── Maintenance Windows
│
├── Audit & Compliance
│   ├── Security Audit
│   ├── Business Audit
│   ├── Data Access Audit
│   ├── Export & Reveal Audit
│   ├── Retention & Legal Hold
│   └── Evidence Packs
│
├── Release & Environment
│   ├── Release Registry
│   ├── Migration Status
│   ├── UAT / Production Gate
│   ├── Deployment History
│   ├── Rollback
│   └── SBOM & Vulnerability Status
│
└── Self Test & Diagnostics
```

---

## 6. Arsitektur Final

Tetap gunakan **Modular Monolith + PostgreSQL**. Microservices belum dibutuhkan untuk skala dan kebutuhan MAT saat ini.

### Bounded Context

```text
System Administration
├── Identity & Access Management
├── Security Governance
├── Workflow Governance
├── Configuration Management
├── Platform Operations
├── Audit & Compliance
├── Integration Management
└── Release & Environment Management
```

### Service Layer

- AuthorizationPolicyService
- IdentityLifecycleService
- RoleCompositionService
- PrivilegedAccessService
- AccessCertificationService
- AuditEvidenceService
- ConfigurationChangeService
- IntegrationCredentialService
- ObservabilityService
- BackupRecoveryService
- ReleaseManagementService
- SystemDiagnosticsService

### Technical Requirements

- `/api/v1` versioning.
- Runtime request/response validation.
- Policy-decision point dan policy-enforcement point.
- DB-backed permission versioning.
- Cache invalidation dan session refresh.
- Idempotency untuk seluruh security/configuration write.
- Optimistic locking.
- Transactional outbox.
- Structured error codes.
- Correlation ID end-to-end.
- Security event taxonomy.
- Secrets via Vault/KMS.
- PostgreSQL RLS.
- Append-only and tamper-evident audit.
- OpenTelemetry-compatible observability.

---

## 7. Visual UI/UX Final

Untuk System, unsur cute/clay harus lebih konservatif daripada Master Data atau HR.

```text
90% Clean Enterprise
7% Pearl Glass
3% Cute Clay & Motion
```

### Visual Language

- Pearl white workspace.
- Deep navy navigation.
- Azure blue interaction.
- Champagne gold untuk privileged approval.
- Mint untuk healthy/compliant.
- Amber untuk warning.
- Coral untuk incident/critical.
- Lavender untuk informational/system jobs.

### Cute Clay Digunakan Pada

- Security shield/lock.
- Server/database.
- Backup vault.
- Integration connector.
- Empty state.
- Success/healthy state.
- Guided onboarding.

### Jangan Digunakan Pada

- Audit evidence.
- Permission matrix padat.
- Sensitive configuration.
- Incident timeline.
- Session/device details.
- Raw logs.
- Backup recovery evidence.

### System Control Center

Header context:

- Environment.
- Release version.
- Migration version.
- Security posture.
- Uptime/SLO.
- Last backup.
- Last restore drill.
- Last successful deployment.

KPI:

- Active users.
- Privileged assignments.
- MFA coverage.
- Open SoD conflicts.
- Risky sessions.
- Failed logins.
- Critical security events.
- Failed jobs.
- Quarantined files.
- Backup age.
- Restore-drill age.
- Release-gate status.

Panel:

- Security posture.
- IAM changes.
- SoD/access-review status.
- Platform health.
- Job/queue health.
- Backup/DR readiness.
- Release/migration state.
- Incident alerts.
- Audit activity.

### User 360

Tabs:

- Identity.
- Employment Link.
- Roles & Duties.
- Data Scope.
- MFA & Passkeys.
- Sessions & Devices.
- Access History.
- Certifications.
- Security Events.
- Audit Trail.

### Role Designer

- Visual role → duty → privilege → permission tree.
- Effective-access preview.
- Data-scope policy.
- SoD risk simulation.
- User-impact analysis.
- Version compare.
- Request review.
- Publish and rollback.

### Audit Explorer

- Advanced filter.
- Before/after diff.
- Correlation graph.
- User/session/device context.
- Source request/document.
- Integrity seal.
- Evidence export approval.
- Retention/legal hold.

### Backup & Recovery Center

- RPO/RTO.
- Backup copies.
- Encryption status.
- Offsite/immutable status.
- Restore drill result.
- Recovery dependency map.
- Run backup.
- Request restore.
- Approve restore.
- Recovery evidence.

---

## 8. Testing Result

Selective audit test:

- 28 total tests.
- 23 passed.
- 5 could not complete because PostgreSQL was not running at `127.0.0.1:5432`.

Static/architecture tests passed for:

- Application shell/accessibility.
- Semantic design tokens/responsive behavior.
- Security headers and traversal protection.
- Fingerprinted/precompressed release assets.
- Authorization coverage: 195 handlers.
- Permission allow/deny paths.
- Public endpoint allowlist.
- Migration checksum and transaction contract.
- Backup crypto round-trip.
- Audit partition contract.
- Modular architecture.
- Environment/trusted proxy checks.

Database-dependent checks remain **not validated**, not automatically considered logic failures:

- Session-throttle/CSRF overlap.
- EICAR quarantine integration.
- Final assurance reconciliation.
- Runtime partition maintenance.
- Self-test status semantics.

---

## 9. Priority Roadmap

### P0 — Stop-Ship Security

1. Rotate all secrets exposed in workspace package.
2. Quarantine unsafe ZIP and audit database dumps.
3. Scan final release artifact, not only source allowlist.
4. Replace static runtime authorization with DB-backed effective permissions.
5. Integrate emergency access into runtime or disable it until complete.
6. Support multiple roles/duties with preventive SoD.
7. Make MFA mandatory for privileged accounts.
8. Secure MFA factor change/disable.
9. Upgrade password hash parameters with versioned migration.
10. Fix audit partition grants and enforce append-only privileges.
11. Implement central audit redaction.
12. Implement PostgreSQL RLS.
13. Encrypt local backups.
14. Run complete PostgreSQL security/integration tests.

### P1 — Production Complete

1. User lifecycle provisioning and leaver automation.
2. Role/Duty/Privilege designer.
3. Data-access policy workbench.
4. Effective-access report.
5. Privileged access and post-use review.
6. Passkey/WebAuthn and recovery workflow.
7. Security Incident Center.
8. Tamper-evident centralized audit.
9. Persistent observability and SLO dashboard.
10. Backup & Recovery Center.
11. Business-aware restore drill.
12. Configuration change request and transport.
13. Feature flags and environment comparison.
14. Job retry/cancel actions in UI.
15. Service-account/API-client governance.

### P2 — Tier-1 Platform

1. SSO/OIDC/SAML.
2. SCIM lifecycle provisioning.
3. JIT/PAM privileged access.
4. Hardware security keys.
5. SIEM integration.
6. OpenTelemetry metrics/traces/logs.
7. Immutable/WORM audit and backups.
8. HA PostgreSQL/standby and automated failover.
9. RPO/RTO orchestration.
10. SBOM, SAST, DAST, dependency and container scanning.
11. Signed release provenance.
12. Configuration package promotion Dev → UAT → Production.
13. Compliance evidence packs.
14. Continuous control monitoring.

---

## 10. Final Acceptance Gate

Category System dapat dikunci sebagai **100% complete for MAT scope** hanya jika:

- Runtime permission berasal dari approved database policy.
- Multiple-role and scope model aktif.
- Emergency access benar-benar enforced dan diaudit.
- Privileged MFA/passkey mandatory.
- No critical/high security finding unresolved.
- RLS and field-level access tests pass.
- Audit is append-only, redacted, tamper-evident, and offsite-copied.
- Backup encryption and business-aware restore drill pass.
- SLO, alerts, incident workflow, and persistent monitoring active.
- Configuration transport and rollback tested.
- Clean release and final artifact scan pass.
- Full PostgreSQL integration and disaster recovery tests pass.
- Internal UAT and security sign-off completed.

---

## 11. Final Verdict

Category System **belum 100%** dan **belum setara penuh dengan tier-1 ERP platforms**.

Tidak perlu rebuild dari nol. Fondasi modular monolith, PostgreSQL, session security, TOTP MFA, role-assignment workflow, SoD, access review, approval-policy versioning, background jobs, migration control, backup, and atomic release should be retained.

Setelah P0 dan P1 selesai, System dapat dinyatakan **production-ready untuk penggunaan internal MAT**. Setelah P0–P2 selesai, target realistisnya adalah **95–97% enterprise readiness berdasarkan kontrol SAP, Oracle, dan Dynamics 365 yang relevan**, dengan kompleksitas dan biaya operasional yang tetap lebih ringan.
