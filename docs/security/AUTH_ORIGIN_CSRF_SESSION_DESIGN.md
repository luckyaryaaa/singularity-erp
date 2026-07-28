# Desain Autentikasi: Session, Origin, dan CSRF

**Versi:** v0.36.0 · **Titik penegakan:** `backend/api-postgres.js` (dispatcher),
`backend/infrastructure/database/repositories/auth.js` · **Status:** aktif dan diregresikan.

## 1. Prinsip

Seluruh domain router hanya berjalan **setelah** validasi sesi terpusat di
dispatcher tunggal. Penyembunyian menu di frontend bukan batas keamanan;
backend memvalidasi setiap request. Tanpa konteks sesi, request privat
**gagal tertutup**.

## 2. Session

- **Cookie** `mat_session`: token acak 256-bit, `HttpOnly`, `SameSite=Strict`,
  `Secure` di production/`MAT_COOKIE_SECURE=1`, `Path=/`, `Max-Age` = absolute
  timeout.
- Token sesi dan CSRF **hanya disimpan sebagai SHA-256** (`token_hash`,
  `csrf_token_hash`) — nilai plaintext tidak pernah persisted.
- **Idle timeout 60 menit**, **absolute timeout 8 jam**. `last_seen_at` ditulis
  maksimal sekali per 5 menit; perubahan IP/perangkat dicatat sebagai risk flag.
- Sesi dicabut saat perubahan password, role, status akun, atau postur MFA
  sesuai policy. `logout` dan `logout-all` tersedia.
- Assignment role primary aktif & effective-dated adalah **sumber otorisasi**:
  assignment kedaluwarsa menandai sesi `access_expired` dan mengakhirinya.

## 3. Urutan dispatcher (`dispatch`)

1. **Public allowlist** (`dispatchPublic`): `/api/auth/login`, `/api/auth/mfa`,
   `/api/auth/change-password-required`, `/api/verify`, `/api/runtime` — tanpa sesi.
2. **Resolusi sesi** (`resolveSession`) dari cookie; gagal → `SESSION_EXPIRED`.
3. **RLS context** ditanam ulang dengan identitas nyata (`setRlsContext(resolved.user)`)
   sebelum router privat/domain menyentuh data — memulihkan pertahanan kedua di
   database (temuan **G1**).
4. **Rate limit** per kelas operasi (read/write/export) per user.
5. **Origin check + CSRF** untuk seluruh mutasi (non-GET).
6. Router privat lalu domain.

Urutan ini dikunci oleh `test/authorization-matrix.test.js` (session guard
mendahului domain router; RLS re-seat berada di antara resolveSession dan domain).

## 4. Origin check

`originAllowed`: request non-GET dengan header `Origin` yang **tidak** sama
dengan `${protocol}://${host}` runtime ditolak `CSRF_REJECTED`. Request tanpa
`Origin` (mis. same-origin fetch) diizinkan lalu tetap divalidasi CSRF.
Forwarded IP/protocol/host hanya diterima dari `MAT_TRUSTED_PROXIES`
(exact IP + IPv4 CIDR); spoofing peer lain diabaikan.

## 5. CSRF

- Mutasi wajib membawa header **`X-CSRF-Token`** yang cocok dengan
  `csrf_token_hash` sesi (`verifyCsrf`).
- **Rotasi** (`rotateCsrf`) mempertahankan hash sebelumnya selama **10 menit**
  (`previous_csrf_token_hash` + `previous_csrf_valid_until`) agar beberapa tab
  aktif tidak menghasilkan false 403 saat token berputar.
- Token CSRF dikembalikan pada `GET /api/auth/session` dan respons login sukses.

## 6. Login, lockout, dan MFA challenge

- Login/MFA/change-password-required berjalan pada **transaksi durable**
  (`loginTransaction`): kegagalan `AUTH_FAILED`/`ACCOUNT_LOCKED` tetap
  **di-commit** agar hitungan lockout persisten.
- **Lockout** 5 kegagalan selama 15 menit; rate limit login terpisah per
  `username:ip`.
- Peran privileged mengembalikan **MFA challenge** (bukan sesi) sampai TOTP/
  recovery diselesaikan (`completeMfa`).
- Password-change login challenge berlaku 5 menit, sekali pakai, disimpan hash.

## 7. Header keamanan respons

`Cache-Control: no-store`, `X-API-Version`, `X-Content-Type-Options: nosniff`
pada download; CSP, frame deny, referrer policy, dan permissions policy aktif
pada shell (lihat security-model.md §Authorization).

## 8. Bukti otomatis

`test/postgres.http.test.js` (login→lockout commit, MFA TOTP, change-password),
`test/postgres-auth.integration.test.js`, dan `test/authorization-matrix.test.js`
(urutan guard + public allowlist ↔ kontrak OpenAPI).
