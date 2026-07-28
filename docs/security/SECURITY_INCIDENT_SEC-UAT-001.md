# SECURITY INCIDENT — SEC-UAT-001

**Klasifikasi:** CRITICAL / STOP-SHIP  
**Skenario:** UAT-SYS-01  
**Status:** READY_FOR_RETEST  
**Checkpoint teknis:** 27 Juli 2026

Dokumen ini tidak memuat password, token reset, secret MFA, recovery code,
cookie, PIN, atau CSRF plaintext.

## Insiden

`system_admin` pernah dapat menjalankan
`POST /api/system/users/{OWNER_ID}/reset-password`, menerima credential
sementara, dan mencabut sesi Owner. Root cause: endpoint hanya memeriksa izin
dan MFA aktor, tetapi tidak mengklasifikasi target.

## Remediasi terpasang

- Target diklasifikasi dari seluruh role assignment efektif.
- Owner selalu ditolak oleh API dan hanya dapat dipulihkan dari server.
- Reset diri lewat endpoint admin ditolak.
- Permission `user.reset_password` dipisahkan dari `user.edit`.
- Penolakan HTTP di-audit dan tetap di-commit.
- Reset administrator memakai request 30 menit:
  Security Admin/Owner sebagai maker, Owner sebagai checker, maker ≠ checker.
- Password lama langsung dibuat tidak berlaku dan semua sesi dicabut.
- Credential sementara diganti tautan reset 30 menit; hanya hash token disimpan.
- MFA memiliki recovery code sekali pakai, regenerasi terkontrol, dan
  notifikasi perubahan faktor.
- UI Owner tidak menyediakan tombol reset Owner; workbench menampilkan queue
  maker-checker dan secure handoff satu kali.

Skema pendukung berada pada migration
`063_security_reset_mfa_recovery.sql`.

## Bukti otomatis

- `test/sec-uat-001-password-reset.test.js`
  - Owner server-only.
  - System Admin tidak dapat mereset Owner/admin.
  - Security Admin maker + Owner checker.
  - Maker tidak dapat menjadi checker.
  - Token reset sekali pakai dan tidak masuk audit.
  - Efek sesi, lockout, password lama, dan reason tervalidasi.
- `test/postgres.http.test.js`
  - Respons HTTP Owner-reset adalah 403.
  - Event `PASSWORD_RESET_DENIED` tetap tersimpan setelah respons.
  - MFA recovery code sekali pakai dan replay ditolak.
- Visual baseline v4 memeriksa workbench pengguna dan keamanan akun di desktop
  serta mobile setelah login MFA.

Hasil final suite dan hash release dicatat pada
`docs/operations/v0.35-enterprise-execution-identity.md`.

## Dampak data

Tidak ada data bisnis yang dihapus. Migration 063 menambah:

- `password_reset_requests`
- `mfa_recovery_codes`
- permission catalog reset/approval

Token dan recovery code disimpan dalam bentuk SHA-256. Secret TOTP tetap
terenkripsi AES-256-GCM.

## Status penutupan

Remediasi rekayasa selesai, tetapi issue tidak boleh diubah menjadi `CLOSED`
oleh automation. Operator UAT wajib:

1. login sebagai System Admin;
2. mencoba reset Owner;
3. memastikan respons 403 dan password/sesi Owner tidak berubah;
4. melampirkan evidence pada `docs/uat/ISSUE_REGISTER.json`;
5. mengisi `retestEvidence` dan `closedBy`.

Sampai langkah tersebut dilakukan manusia, status tetap `READY_FOR_RETEST` dan
go-live tetap diblokir.

Lihat [PASSWORD_RESET_POLICY.md](PASSWORD_RESET_POLICY.md) untuk kontrak penuh.
