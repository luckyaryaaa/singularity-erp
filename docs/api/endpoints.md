# API MAT ERP V2

Semua endpoint berada di `/api`. Sesi memakai cookie HttpOnly `mat_session`.
Mutasi wajib `X-CSRF-Token`; operasi kritis wajib `Idempotency-Key`. Error
selalu berbentuk `{ code, message, detail? }`.

## Publik (tanpa autentikasi)

- `GET /api/live` — liveness: proses hidup, tanpa menyentuh database.
- `GET /api/health` — readiness: termasuk cek database; untuk uptime monitor
  dan load balancer; hanya `{ ok, db, at }`, dibatasi rate limit per IP;
  503 bila database tumbang.

## Ruang kerja (Sprint 8B)

- `GET /api/my-work` — inbox lintas modul (§10.7): menunggu persetujuan saya,
  dibuat saya yang masih berjalan, dikembalikan untuk revisi, dokumen jatuh
  tempo (ber-scope cabang), job gagal, notifikasi perlu tindakan.
- `GET /api/approvals` — Approval Center 2.0 (§10.8): tiap item kini menyertakan
  `policyVersion` (versi snapshot kebijakan approval) dan `credit` (hold,
  limit, exposure, projected, overLimit) untuk dokumen pelanggan.

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

### Master data enterprise (R014/R015)

- `GET /api/masters/{employees|customers|suppliers|products}/:id` — overview + subCounts
- `POST /api/masters/{master}/:id/lifecycle` — `{action, reason?}` DRAFT→…→ARCHIVED
- `GET|POST /api/masters/{master}/:id/{sub}` — sub-resource per tab (kontak, alamat,
  kontrak, kompensasi ber-izin payroll, pajak, BPJS, bank, dokumen, dst.)
- `POST /api/masters/suppliers/:id/bank-accounts/:bankId/approve` — maker-checker (SoD)
- `POST /api/masters/products/:id/cost-revisions/:revId/{review|approve|lock|activate}` — HPP versioning; activate menjadikan Active HPP + snapshot `products.hpp`
- `POST /api/masters/products/:id/bom/:bomId/{review|approve|effective}` — BOM revision

Masking server-side: nomor rekening & gaji tertutup bila peran tanpa izin
finance/payroll. Harga supplier append-only (revisi bertambah, tidak menimpa).
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
- `GET /api/governance/roles`
- `GET|POST /api/governance/assignments`
- `POST /api/governance/assignments/:id/{approve|reject|revoke}` — maker-checker; Owner approval/revoke memakai PIN
- `GET /api/governance/sod`
- `GET|POST /api/governance/overrides` — emergency access Owner + PIN, maksimum 24 jam
- `GET|POST /api/governance/approval-policies`
- `POST /api/governance/approval-policies/:id/activate` — checker berbeda dan overlap guard
- `GET|POST /api/governance/access-reviews`
- `GET /api/governance/access-reviews/:id`
- `POST /api/governance/access-reviews/items/:id/decide`
- `POST /api/governance/access-reviews/:id/complete`
- `GET /api/organization` — profil legal entity + skor kelengkapan + jumlah hierarchy
- `PATCH /api/organization/:id` — identitas versioned, Owner + PIN + alasan
- `GET /api/organization/:id/hierarchy`
- `GET|POST /api/organization/:id/{assets|signatories|tax-identities|bank-accounts}`
- `POST /api/organization/:id/bank-accounts/:bankId/{approve|reject}` — Owner PIN + MFA terbaru + maker ≠ checker
- `GET /api/masters/employees/:id/audit`
- `POST /api/masters/employees/:id/{bank-accounts|compensation}/:rowId/{approve|reject}` — maker-checker employee
- `GET|POST /api/jobs`
- `GET /api/artifacts`
- `GET /api/artifacts/:id` — unduhan privat milik pemohon
- `GET|POST /api/files`
- `GET|DELETE /api/files/:id`
- `GET /api/system/users|settings|monitoring|self-test`
- `PATCH /api/system/settings/company` — compatibility facade ke Organization Master; rekening wajib melalui maker-checker
- `POST /api/system/users/:id/reset-password`
- `GET /api/events` — SSE terautentikasi

## Wave 2 — Source-to-Pay & credit control

- `GET /api/credit/:customerId` — status kredit (hold, limit, eksposur, sisa plafon)
- `POST /api/documents/:id/credit-override` — override kredit (finance, ber-alasan)
- `GET|POST /api/rfq/:id/quotes` — daftar/tambah kuota supplier (landed cost otomatis)
- `POST /api/rfq/:id/quotes/:quoteId/select` — pilih supplier (ber-alasan, audit)
- `POST /api/rfq/:id/create-po` — konversi RFQ terpilih → Purchase Order (idempoten)
- `GET|POST /api/supplier-invoices/:id/match` — three-way match (PO vs GR vs invoice)
- `POST /api/payment-proposals` — buat batch usulan pembayaran tagihan jatuh tempo
- `GET /api/payment-proposals/:id/lines` — baris usulan (rekening belum verifikasi ditahan)

Kontrol otomatis: submit SO/Invoice diblokir `409 CREDIT_HOLD` bila pelanggan
hold/over-limit tanpa override; approve Supplier Invoice diblokir `409 MATCH_FAILED`
bila three-way match EXCEPTION tanpa `matchOverrideReason`.

Job Sprint 4: `IMPORT_CSV`, `RECONCILIATION`, `PAYROLL_SLIPS`,
`REPORT_GENERATE`, `EXPORT_EXCEL`, `GENERATE_PDF`, dan `BACKUP_RUN`.

Rate limit: read 120/menit, write 30/menit, login 5/15 menit per akun+IP,
export 3/menit. HTTP 429 menyertakan `Retry-After`. Baseline dapat dituning
per lingkungan via env `MAT_RATE_READ_PER_MIN`, `MAT_RATE_WRITE_PER_MIN`,
`MAT_RATE_LOGIN_PER_15MIN`, `MAT_RATE_PDF_PER_MIN`, `MAT_RATE_EXPORT_PER_MIN`.
