# API MAT ERP V2

Semua endpoint berada di `/api`. Sesi memakai cookie HttpOnly `mat_session`.
Mutasi wajib `X-CSRF-Token`; operasi kritis wajib `Idempotency-Key`. Error
selalu berbentuk `{ code, message, detail? }`.

## Publik (tanpa autentikasi)

- `GET /api/health` — untuk uptime monitor eksternal; hanya
  `{ ok, db, at }`, dibatasi rate limit per IP; 503 bila database tumbang.

## Auth

- `POST /api/auth/login`
- `POST /api/auth/mfa`
- `POST /api/auth/change-password-required`
- `POST /api/auth/change-password`
- `POST /api/auth/mfa/setup`
- `POST /api/auth/mfa/enable`
- `POST /api/auth/mfa/disable`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all`
- `GET /api/auth/session`
- `GET /api/auth/devices`

## Workspace dan transaksi

- `GET /api/dashboard`
- `GET /api/approvals`
- `GET /api/notifications`
- `POST /api/notifications/:id/read`
- `POST /api/notifications/read-all`
- `GET|POST /api/documents`
- `GET|PATCH /api/documents/:id`
- `POST /api/documents/:id/action`
- `POST /api/documents/:id/convert`

Aksi dokumen: `submit`, `approve`, `reject`, `revise`, `start`, `complete`,
`close`, `cancel`, dan `void` sesuai status serta permission modul.

## Master, ringkasan, dan sistem

- `GET|POST /api/customers|suppliers|products|employees`
- `PATCH /api/customers|suppliers|products|employees/:id`
- `GET /api/inventory`
- `GET /api/accounting/summary`
- `GET /api/accounting/accounts`
- `GET /api/accounting/ledger`
- `GET /api/accounting/reconciliation`
- `POST /api/accounting/period/close`
- `POST /api/accounting/period/reopen` — Owner + PIN + alasan
- `POST /api/payments/allocate`
- `GET /api/tax/summary`
- `POST /api/tax/sync`
- `POST /api/tax/records/:id/report`
- `GET|POST /api/hr/attendance`
- `GET /api/hr/leave-balances`
- `POST /api/payroll/runs`
- `GET /api/payroll/runs/:id/items`
- `GET /api/payroll/my` — hanya data employee yang sedang login
- `GET /api/audit`
- `GET|POST /api/jobs`
- `GET /api/artifacts`
- `GET /api/artifacts/:id` — unduhan privat milik pemohon
- `GET|POST /api/files`
- `GET|DELETE /api/files/:id`
- `GET /api/system/users|settings|monitoring|self-test`
- `PATCH /api/system/settings/company` — Owner + PIN + alasan
- `POST /api/system/users/:id/reset-password`
- `GET /api/events` — SSE terautentikasi

Job Sprint 4: `IMPORT_CSV`, `RECONCILIATION`, `PAYROLL_SLIPS`,
`REPORT_GENERATE`, `EXPORT_EXCEL`, `GENERATE_PDF`, dan `BACKUP_RUN`.

Rate limit: read 120/menit, write 30/menit, login 5/15 menit per akun+IP,
export 3/menit. HTTP 429 menyertakan `Retry-After`. Baseline dapat dituning
per lingkungan via env `MAT_RATE_READ_PER_MIN`, `MAT_RATE_WRITE_PER_MIN`,
`MAT_RATE_LOGIN_PER_15MIN`, `MAT_RATE_PDF_PER_MIN`, `MAT_RATE_EXPORT_PER_MIN`.
