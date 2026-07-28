# Password Reset Policy — MAT ERP V2

Sumber kebenaran kebijakan berada di
`backend/infrastructure/database/repositories/password-reset.js`. Runtime
production PostgreSQL, route HTTP, dan test kontrak wajib melewati layanan ini.

Tidak ada password, token reset, secret MFA, recovery code, cookie, atau CSRF
plaintext yang boleh masuk log maupun audit.

## Klasifikasi target

Kelas dihitung dari seluruh `user_role_assignments` aktif dan primary role.
Kelas tertinggi selalu menang.

| Kelas | Role |
|---|---|
| `OWNER` | `owner` |
| `PRIVILEGED_ADMIN` | `admin`, `system_admin`, `security_admin` |
| `STANDARD_USER` | role lain |

## Matriks kebijakan

| Target | Maker | Checker/eksekutor | Hasil |
|---|---|---|---|
| Owner | siapa pun | — | Ditolak; pemulihan hanya dari server |
| Diri sendiri | siapa pun | — | Ditolak; gunakan ubah password mandiri |
| Administrator | Security Admin | Owner lain dari maker | Permintaan 30 menit, MFA terbaru, maker-checker |
| Administrator | Owner | Owner lain | Permintaan 30 menit, MFA terbaru, maker-checker |
| Administrator | System Admin | — | Ditolak |
| User standar | aktor berizin | — | Langsung, alasan dan MFA terbaru sesuai kelas aktor |

Permission reset dipisahkan dari edit profil:

- `user.reset_password`: membuat reset user standar atau mengusulkan reset
  administrator.
- `user.approve_password_reset`: memutuskan reset administrator. Runtime juga
  memverifikasi checker adalah Owner.

## Workflow administrator

1. Maker mengisi alasan minimal delapan karakter.
2. Server mengklasifikasi target dan mengunci baris target.
3. `password_reset_requests` dibuat berstatus `PENDING`, berlaku 30 menit.
4. Permintaan duplikat untuk target yang sama ditolak.
5. Checker Owner melakukan MFA step-up.
6. Maker dan checker harus berbeda; constraint database dan service sama-sama
   menegakkan SoD.
7. Approval mencabut semua sesi target, membuat password lama tidak berlaku,
   dan menerbitkan tautan reset sekali pakai.
8. Reject tidak mengubah kredensial target.

## Tautan reset sekali pakai

- Token acak hanya dikembalikan satu kali dalam URL.
- Database hanya menyimpan SHA-256 token pada `auth_pending`.
- Masa berlaku 30 menit.
- Satu token hanya dapat dipakai sekali.
- Address bar dibersihkan dengan `history.replaceState` segera setelah klien
  memindahkan token ke memori.
- Password baru wajib memenuhi policy minimal 12 karakter: huruf besar, huruf
  kecil, angka, dan simbol.
- Respons reset memakai `Cache-Control: no-store`, `Pragma: no-cache`, dan
  `X-Content-Type-Options: nosniff`.

## Audit wajib

| Event | Isi aman |
|---|---|
| `PASSWORD_RESET_DENIED` | aktor, target, kelas target, reason code |
| `PASSWORD_RESET_REQUESTED` | maker, target, expiry, alasan |
| `PASSWORD_RESET_APPROVED` | maker, checker, target, operation ID |
| `PASSWORD_RESET_REJECTED` | maker, checker, target, alasan |
| `PASSWORD_RESET_SUCCEEDED` | aktor eksekutor, target, operation ID |

Penolakan kebijakan HTTP dikembalikan sebagai respons terkontrol agar transaksi
audit tetap di-commit. Token dan password tidak pernah menjadi old/new value.

## Pemulihan Owner

Owner tidak dapat direset dari aplikasi. Operator server menggunakan:

```bash
npm run security:rotate-owner
```

Prosedur ini mencabut sesi dan challenge, menulis secret hanya ke `.env`, serta
tidak mencetak nilai password.

## Kontrak API

- `POST /api/system/users/{id}/reset-password`
- `GET /api/system/password-reset-requests`
- `POST /api/system/password-reset-requests/{id}/approve`
- `POST /api/system/password-reset-requests/{id}/reject`
- `POST /api/auth/change-password-required`

Reset user standar mengembalikan `200` dengan `resetUrl`; reset administrator
mengembalikan `202` sampai checker memutuskan. Approval mengembalikan
`resetUrl` satu kali. Tidak ada kontrak `tempPassword` pada runtime PostgreSQL.

## Gate manusia

Perbaikan teknis tidak menutup issue UAT. `SEC-UAT-001` tetap
`READY_FOR_RETEST` sampai operator mengulang UAT-SYS-01, melampirkan evidence
403, dan mengisi `closedBy`.
