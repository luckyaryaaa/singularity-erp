# MASTER FIX PROMPT — UAT, MFA, PASSWORD RESET & PRIVILEGED ACCOUNT SECURITY
# MAT ERP V2

## PERAN

Bertindaklah sebagai:

- Principal Application Security Engineer
- Senior Full-Stack Engineer
- PostgreSQL Security Architect
- IAM/PAM Architect
- QA Automation Engineer
- UAT and Release Engineer

Tugas Anda **bukan hanya mengaudit atau memberi rekomendasi**.

Tugas Anda adalah:

1. Membaca source code aktual MAT ERP V2.
2. Mereproduksi seluruh masalah UAT dan MFA yang dijelaskan di bawah.
3. Memperbaiki backend, frontend, database policy, permission, audit, dan test.
4. Menjalankan migration bila diperlukan.
5. Menulis automated test.
6. Menjalankan regression.
7. Memperbaiki seluruh kegagalan.
8. Menghasilkan bukti retest dan clean release.

Jangan berhenti setelah membuat laporan.

---

# 1. SOURCE DAN KONTEKS

Gunakan source terbaru:

```text
MAT ERP V2(3).zip
```

Arsitektur yang harus dipertahankan:

```text
Modular Monolith + PostgreSQL
```

Jangan mengubah project menjadi microservices.

Pertahankan:

- Satu authentication engine.
- Satu authorization engine.
- Satu session engine.
- Satu MFA engine.
- Satu audit engine.
- Satu user-management module.
- Satu release pipeline.
- Satu self-test/release-gate framework.

Jangan membuat implementasi kedua atau patch sementara yang menumpuk.

---

# 2. INCIDENT DAN TEMUAN UAT YANG WAJIB DIPERBAIKI

## SEC-UAT-001 — CRITICAL

Role `system_admin` berhasil melakukan:

```http
POST /api/system/users/{OWNER_USER_ID}/reset-password
```

dan backend mengembalikan temporary password akun Owner.

Expected:

```text
403 Forbidden
```

Actual:

```text
200 Success
Temporary password Owner dibuat
Session Owner dicabut
```

Dampak:

> System Administrator dapat mengambil alih akun Owner.

Temuan ini adalah **CRITICAL / STOP-SHIP**.

UAT dan release tidak boleh dilanjutkan sebelum masalah ini ditutup dan diretest.

---

## AUTH-UAT-002 — Host/session inconsistency

Login/session sempat menggunakan:

```text
http://localhost:4173
```

sementara request MFA atau API terkirim ke:

```text
http://127.0.0.1:4173
```

Akibatnya:

- Cookie session tidak terkirim.
- `/api/auth/mfa/enable` mengembalikan 401.
- User mengira password atau kode MFA salah.

Target:

- Satu canonical origin.
- Seluruh frontend API menggunakan relative URL.
- Alternate host diarahkan ke canonical host.
- Cookie/session behavior konsisten.
- Tidak ada hard-coded `localhost` atau `127.0.0.1` pada API helper.

---

## AUTH-UAT-003 — CSRF stale setelah login/MFA

Setelah login ulang atau aktivasi MFA, request sensitif menghasilkan:

```text
403 Token keamanan tidak valid
```

Target:

- CSRF token diperbarui setelah login, MFA verify, password change, session refresh, dan role/session rotation.
- API helper tidak memakai CSRF token lama.
- Error code harus spesifik, bukan pesan generik.
- UI memberi instruksi aman.
- Retry hanya boleh dilakukan satu kali dan harus aman/idempotent.

---

## AUTH-UAT-004 — Dashboard lama tetap tampil saat session 401

`GET /api/auth/session` mengembalikan:

```text
401 Unauthorized
```

tetapi Dashboard lama masih terlihat dari state/cache frontend.

Ini adalah risiko information disclosure.

Target:

```text
401 pada protected endpoint
→ clear user state
→ clear permission state
→ clear CSRF
→ close SSE
→ clear protected cache
→ clear workspace DOM
→ redirect ke login
```

Data lama tidak boleh tetap terlihat.

---

## UI-UAT-005 — Modal Edit Pengguna kosong

Modal:

```text
Edit Pengguna & Peran
```

terbuka tanpa field, tetapi tombol:

```text
Simpan perubahan
```

masih aktif.

Target:

- Form harus terhidrasi dari data user.
- Loading state jelas.
- Error state jelas.
- Save disabled selama loading/error/empty form.
- Security actions dipisahkan dari profile editing.

---

## MFA-UAT-006 — Enrollment masih melalui Console

MFA berhasil diaktifkan melalui Console, tetapi alur production tidak boleh bergantung pada DevTools.

Target UI:

```text
Profil Saya
→ Keamanan Akun
→ Autentikasi Multifaktor
→ Daftarkan MFA
```

Untuk privileged admin:

```text
System
→ Identity & Access
→ MFA & Passkeys
```

UI harus mendukung:

- Setup.
- QR code.
- Manual setup key.
- Verification.
- Status.
- Recovery codes.
- Reset/recovery workflow.
- Audit.
- Notification.

Jangan menulis secret MFA ke browser console atau application log.

---

# 3. IMMEDIATE CONTAINMENT

Sebelum perubahan kode:

1. Tandai `SEC-UAT-001` sebagai CRITICAL OPEN.
2. Rotasi password Owner melalui script server resmi.
3. Cabut seluruh session Owner.
4. Rotasi temporary password Employee/akun lain yang tampil pada screenshot.
5. Hapus temporary password dari evidence UAT.
6. Pastikan MFA Owner tetap aktif.
7. Jangan lanjut UAT role lain sebelum patch selesai.
8. Jangan menyimpan password, MFA secret, TOTP code, CSRF token, atau session cookie dalam:
   - Log.
   - Audit.
   - Screenshot.
   - Git.
   - Test fixture.
   - Dokumen UAT.
   - Error response.

Jangan menampilkan secret aktual dalam laporan.

---

# 4. TARGET PASSWORD RESET POLICY

Gunakan klasifikasi akun:

```text
OWNER
PRIVILEGED_ADMIN
STANDARD_USER
SERVICE_ACCOUNT
API_CLIENT
```

Mapping minimum:

```text
owner          → OWNER
system_admin   → PRIVILEGED_ADMIN
security_admin → PRIVILEGED_ADMIN
finance_manager/controller tertentu → PRIVILEGED_ADMIN bila ditetapkan
role lain      → STANDARD_USER
```

Jangan hanya membaca satu kolom legacy `app_users.role`.

Gunakan:

- Effective role assignments.
- Multiple active roles.
- Privileged-role catalog.
- Assignment validity.
- Temporary roles.
- Revoked/expired assignments.

## Matriks final

### Owner account

```text
Owner account tidak boleh di-reset melalui endpoint aplikasi.
```

Satu-satunya recovery:

```powershell
npm.cmd run security:rotate-owner
```

Syarat:

- Hanya server/operator resmi.
- Audit khusus.
- Session revoke.
- MFA tetap aktif atau recovery procedure terkontrol.
- Tidak menghasilkan password pada audit/log.
- Procedure documented.

### System Administrator

Boleh:

- Reset STANDARD_USER.
- Unlock STANDARD_USER.
- Revoke STANDARD_USER sessions.

Tidak boleh:

- Reset Owner.
- Reset Security Administrator.
- Reset System Administrator lain.
- Reset diri sendiri melalui admin endpoint.
- Mengubah privilege sendiri.
- Menonaktifkan MFA privileged account lain.

### Security Administrator

Boleh:

- Reset STANDARD_USER.
- Membuat request reset privileged account.

Tidak boleh langsung:

- Reset Owner.
- Reset Security Administrator lain.
- Reset diri sendiri melalui admin endpoint.

Privileged reset harus:

```text
Request
→ Independent approval
→ Recent MFA
→ Reset
→ Post-action review
```

### Owner

Boleh:

- Reset STANDARD_USER.
- Reset privileged admin lain dengan recent MFA dan reason.
- Tidak boleh reset akun Owner melalui API.

### User biasa

- Mengubah password sendiri melalui self-service.
- Tidak boleh memakai admin reset endpoint.

---

# 5. PERMISSION MODEL

Pecah permission broad:

```text
user.edit
```

menjadi minimal:

```text
user.profile.view
user.profile.edit
user.account.activate
user.account.deactivate
user.account.unlock
user.session.revoke
user.password.reset.standard
user.password.reset.privileged.request
user.password.reset.privileged.approve
user.mfa.view_status
user.mfa.recovery.request
user.mfa.recovery.approve
user.audit.view
```

Jangan buat permission:

```text
user.password.rotate_owner
```

untuk role aplikasi.

Owner recovery adalah **server-only operation**.

Tambahkan data policy:

- Same Legal Entity.
- Same Branch atau assigned scope.
- Target privilege class.
- Own-account restriction.
- Effective role assignment.
- Recent MFA requirement.
- Maker-checker conflict.

---

# 6. BACKEND PATCH

Cari seluruh implementasi password reset, termasuk:

- PostgreSQL route.
- Governance route.
- Auth core.
- Fallback/in-memory mode.
- Test helper.
- Legacy endpoint.
- CLI/recovery script.

Tidak boleh ada satu jalur yang melewati policy.

Buat satu centralized service:

```text
PasswordResetPolicyService
PasswordResetService
PrivilegedAccountRecoveryService
```

## Required flow

```text
Authenticate actor
→ Resolve actor effective roles
→ Resolve actor permissions
→ Resolve actor data scope
→ Load target user FOR UPDATE
→ Resolve target effective roles
→ Classify target privilege
→ Check self-reset restriction
→ Check Owner protection
→ Check privileged reset policy
→ Check recent MFA
→ Check reason
→ Check maker-checker if required
→ Generate temp password
→ Hash password
→ Set must_change_password
→ Clear failed login/lock
→ Revoke sessions
→ Revoke pending auth challenges
→ Commit
→ Audit redacted result
```

Use transaction and row lock:

```sql
SELECT ...
FROM app_users
WHERE id = $1
FOR UPDATE
```

## Required Owner protection

Pseudo-rule:

```javascript
if (targetPrivilegeClass === 'OWNER') {
  throw forbidden('OWNER_PASSWORD_RESET_SERVER_ONLY');
}
```

This rule applies even when actor is Owner.

## Self-reset protection

```javascript
if (actor.id === target.id) {
  throw forbidden('USE_SELF_SERVICE_PASSWORD_CHANGE');
}
```

## Standard user reset

Require:

- `user.password.reset.standard`
- recent MFA for privileged actor
- mandatory reason
- target within allowed scope
- idempotency key

## Privileged reset

Require:

- request/approval workflow
- independent checker
- recent MFA
- target not Owner
- audit and notification

---

# 7. RESET RESPONSE SECURITY

Temporary password:

- Shown exactly once.
- Never stored in plaintext.
- Never returned by list/read endpoints.
- Never written to audit.
- Never written to application log.
- Never written to job payload.
- Never included in exception telemetry.
- Automatically expires.
- Requires password change at first login.
- Revokes all prior sessions.
- Clears account lock.
- Invalidates pending login/MFA challenges.

Response example:

```json
{
  "ok": true,
  "resetOperationId": "opaque-id",
  "tempPassword": "shown-once-only",
  "expiresAt": "ISO timestamp",
  "mustChangePassword": true
}
```

Do not include target sensitive profile data unnecessarily.

Use:

- `Cache-Control: no-store`
- `Pragma: no-cache`
- `X-Content-Type-Options: nosniff`

---

# 8. MFA FINAL DESIGN

## Privileged MFA enforcement

MFA mandatory for:

- Owner.
- System Administrator.
- Security Administrator.
- Finance Controller/Manager where policy requires.
- Backup Operator.
- Release Approver.

Behavior:

```text
Password valid
+ privileged role
+ MFA not enrolled
→ MFA_ENROLLMENT_REQUIRED
```

Do not grant full privileged session before enrollment.

## MFA enrollment UI

Implement proper UI.

Flow:

```text
Start enrollment
→ Re-authenticate password
→ Recent MFA if changing existing factor
→ Generate encrypted pending secret
→ Display QR/manual key
→ Verify TOTP
→ Activate factor
→ Generate recovery codes
→ Revoke old pending secret
→ Audit
→ Notify user
```

Requirements:

- Pending secret expires.
- One active enrollment transaction per user.
- Secret encrypted at rest.
- Never logged.
- QR is not cached.
- Setup response has `Cache-Control: no-store`.
- Manual key masked after initial display.
- Enrollment bound to current user/session.
- Rate limit verification attempts.
- Time drift tolerance controlled.
- Recovery codes hashed.
- Recovery codes shown once.

## MFA change/disable

Require:

- Existing MFA factor.
- Recent MFA.
- Password re-authentication.
- Reason.
- Notification.
- Audit.
- Recovery approval if factor unavailable.

Privileged users cannot disable MFA without approved recovery flow.

## Host/origin canonicalization

Add configuration:

```env
MAT_CANONICAL_ORIGIN=http://127.0.0.1:4173
```

or choose `localhost`, but only one canonical value.

Requirements:

- Redirect alternate host to canonical origin.
- Use relative frontend API paths.
- Validate trusted origin.
- Use host-only secure cookies appropriately.
- Do not alternate between `localhost` and `127.0.0.1`.
- Add automated test.

---

# 9. CSRF AND SESSION FIX

## CSRF lifecycle

Refresh CSRF after:

- Login.
- MFA verification.
- Password change.
- Password reset login.
- Session refresh.
- Role assignment change.
- Session rotation.
- Privileged step-up authentication.

`window.MAT.api()` or equivalent must use the latest CSRF token.

Server error codes:

```text
CSRF_TOKEN_MISSING
CSRF_TOKEN_INVALID
CSRF_TOKEN_EXPIRED
ORIGIN_NOT_ALLOWED
SESSION_EXPIRED
RECENT_MFA_REQUIRED
```

Do not map all errors to:

```text
Nama pengguna atau kata sandi salah
```

## Safe retry

For `CSRF_TOKEN_EXPIRED` only:

1. Fetch `/api/auth/session`.
2. Update CSRF token.
3. Retry once.
4. Preserve the same `Idempotency-Key`.
5. Never retry repeatedly.
6. Never retry if session is invalid.

## Session loss

On 401 protected endpoint:

```javascript
state.user = null;
state.permissions = [];
state.csrfToken = null;
state.unread = 0;
closeSSE();
clearProtectedCache();
clearProtectedDOM();
navigateToLogin();
```

Exclude only authentication-attempt endpoints that intentionally return 401.

Dashboard or protected data must not remain visible.

---

# 10. FRONTEND USER MANAGEMENT FIX

## Fix blank Edit User modal

The modal must have explicit states:

```text
LOADING
READY
ERROR
PERMISSION_DENIED
```

Save button enabled only in `READY` state with valid dirty form.

Required fields:

- Username/read-only where appropriate.
- Display name.
- Account status.
- Legal Entity scope.
- Branch scope.
- Department scope.
- Effective roles.
- Effective dates.
- Expiration.
- MFA status.
- Last login.
- Lock status.

Do not combine all security actions into generic edit.

## Separate security actions

```text
View User
Edit Profile
Manage Roles & Scope
Reset Password
Revoke Sessions
Unlock Account
Lock Account
Activate/Deactivate
View MFA Status
Request MFA Recovery
View Security Audit
```

## Reset Password dialog

Display:

- Target user.
- Privilege class.
- Actor permission.
- Mandatory reason.
- Consequences.
- Recent MFA status.
- Approval requirement.
- Warning for privileged target.

Owner target:

```text
Reset action unavailable.
Use documented server recovery procedure.
```

The button must be disabled, not merely hidden.

---

# 11. UAT 13 ROLE COMPLETION

Ensure all required UAT accounts exist:

```text
owner
system_admin
security_admin
finance_manager
accounting
tax
hrd
sales
procurement
warehouse
production
auditor
employee
```

If Security Administrator or Auditor is missing, create through governed UAT seed/migration—not ad-hoc production data edits.

## UAT reset matrix

Automate and manually verify:

| Actor | Target | Expected |
|---|---|---|
| Owner | Employee | ALLOW |
| Owner | System Admin | ALLOW with recent MFA |
| Owner | Security Admin | ALLOW with recent MFA |
| Owner | Owner | DENY server-only |
| System Admin | Employee | ALLOW |
| System Admin | Sales/HR/Finance standard account | ALLOW if scoped |
| System Admin | Owner | DENY |
| System Admin | System Admin | DENY |
| System Admin | Security Admin | DENY |
| Security Admin | Employee | ALLOW |
| Security Admin | Owner | DENY |
| Security Admin | Security Admin | DENY |
| Any user | Self through admin endpoint | DENY |
| User | Self-service change password | ALLOW |

---

# 12. AUTOMATED TESTS — MANDATORY

Add tests for every backend implementation path.

## Password reset policy

```text
[PASS] Owner resets standard user
[PASS] System Admin resets standard user
[PASS] Security Admin resets standard user where policy allows

[DENY] Owner resets Owner through API
[DENY] System Admin resets Owner
[DENY] Security Admin resets Owner
[DENY] System Admin resets System Admin
[DENY] System Admin resets Security Admin
[DENY] Security Admin resets Security Admin
[DENY] Any user resets self through admin endpoint
[DENY] Reset without recent MFA
[DENY] Reset without reason
[DENY] Reset outside data scope
```

## Reset effects

```text
[PASS] Password hash changes
[PASS] must_change_password = true
[PASS] failed-login counter cleared
[PASS] account lock cleared
[PASS] sessions revoked
[PASS] pending auth challenges revoked
[PASS] temp password expires
[PASS] temp password works exactly as intended
[PASS] old password fails
[PASS] temp password never enters audit/log
[PASS] audit records actor/target/result/reason
```

## MFA

```text
[PASS] Privileged login requires enrolled MFA
[PASS] MFA setup requires authenticated session
[PASS] MFA setup bound to current user
[PASS] Pending setup expires
[PASS] Wrong TOTP rejected
[PASS] Rate limiting enforced
[PASS] Correct TOTP activates MFA
[PASS] MFA secret encrypted
[PASS] MFA secret absent from logs/audit
[PASS] Recovery codes hashed
[PASS] Disable MFA requires existing factor/recovery approval
```

## Session/CSRF/origin

```text
[PASS] localhost/127 alternate host redirects to canonical origin
[PASS] API calls use relative URL
[PASS] Login refreshes CSRF
[PASS] MFA verify refreshes CSRF
[PASS] Password change refreshes session/CSRF
[PASS] CSRF stale error refreshes once safely
[PASS] Invalid session clears protected UI
[PASS] Dashboard not visible after session 401
[PASS] No infinite retry loop
```

## Frontend

```text
[PASS] Edit User modal loads fields
[PASS] Save disabled while loading
[PASS] Save disabled on error/empty form
[PASS] Owner reset action disabled
[PASS] System Admin cannot see privileged reset action as executable
[PASS] Reset dialog displays consequences
[PASS] MFA enrollment works without DevTools
[PASS] Sensitive secrets are never printed to Console
```

---

# 13. TEST EXECUTION

Run at minimum:

```powershell
npm.cmd test
npm.cmd run db:status
npm.cmd run db:migrate
npm.cmd run self-test
npm.cmd run release:build
npm.cmd run release:verify
```

Use disposable PostgreSQL for:

- Up migration.
- Down migration.
- Up again.
- Integration tests.
- RLS tests.
- IDOR tests.
- Concurrent reset tests.
- Session revoke tests.

Do not count blocked database tests as PASS.

---

# 14. AUDIT REQUIREMENTS

Audit successful reset:

```text
PASSWORD_RESET_SUCCEEDED
Actor ID
Target ID
Actor roles
Target privilege class
Reason
Result
Timestamp
Correlation ID
Session ID/hash reference
```

Audit denied reset:

```text
PASSWORD_RESET_DENIED
Actor ID
Target ID
Reason code
Target privilege class
Timestamp
Correlation ID
```

Never audit:

- Temporary password.
- Password hash.
- MFA secret.
- TOTP code.
- Recovery code plaintext.
- CSRF token.
- Session token.
- Cookie.

---

# 15. REQUIRED DELIVERABLES

Produce:

```text
SECURITY_INCIDENT_SEC-UAT-001.md
PASSWORD_RESET_POLICY.md
MFA_RECOVERY_POLICY.md
AUTH_ORIGIN_CSRF_SESSION_DESIGN.md
UAT_RETEST_PLAN.md
UAT_RETEST_RESULTS.md
FILES_CHANGED.md
MIGRATION_NOTES.md
TEST_EVIDENCE.md
RELEASE_NOTES.md
```

If database migration is added:

- Up migration.
- Down migration.
- Backfill.
- Reconciliation.
- Migration test.

---

# 16. CHECKPOINT REPORT FORMAT

At each checkpoint report:

```text
Phase:
Issue addressed:
Root cause:
Files changed:
Database changes:
Permission changes:
Frontend changes:
Tests added:
Tests executed:
PASS:
FAIL:
BLOCKED:
Security impact:
Data impact:
Remaining risk:
Next step:
```

Do not expose real secrets in checkpoint output.

---

# 17. ACCEPTANCE GATE

The fix is complete only when:

```text
[ ] Owner password rotated after incident
[ ] Exposed temporary passwords invalidated
[ ] System Admin reset Owner returns 403
[ ] Security Admin reset Owner returns 403
[ ] Owner reset Owner through API returns 403
[ ] Server recovery script still works
[ ] Standard-user reset works
[ ] Recent MFA enforced
[ ] Privileged reset maker-checker works
[ ] CSRF lifecycle fixed
[ ] Canonical origin fixed
[ ] Session 401 clears protected UI
[ ] Edit User modal fixed
[ ] MFA enrollment UI works
[ ] Recovery codes implemented or documented as explicit blocker
[ ] No secret in log/audit/console
[ ] Automated security tests PASS
[ ] Full regression PASS
[ ] Database tests PASS
[ ] RLS/IDOR tests PASS
[ ] Clean release PASS
[ ] UAT-SYS-01 retest PASS
[ ] SEC-UAT-001 CLOSED
```

Critical and High findings must be zero before continuing UAT role berikutnya.

---

# 18. START COMMAND

Mulai dengan:

1. Extract project.
2. Map all password-reset/MFA/session/CSRF implementations.
3. Reproduce `SEC-UAT-001`.
4. Create immediate containment checklist.
5. Implement centralized reset policy.
6. Patch all code paths.
7. Build proper MFA UI.
8. Fix CSRF/session/origin behavior.
9. Fix Edit User modal.
10. Add tests.
11. Run full regression.
12. Produce retest evidence.

Jangan meminta konfirmasi untuk keputusan teknis minor.

Jangan mengklaim selesai tanpa bukti test.

Jangan lanjut ke fitur ERP lain sebelum `SEC-UAT-001` ditutup.
