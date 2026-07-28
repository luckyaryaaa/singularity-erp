# Kebijakan MFA & Recovery Code

**Versi:** v0.36.0 · **Migrasi terkait:** `063_security_reset_mfa_recovery` ·
**Status:** rekayasa selesai, ditegakkan oleh `test/sec-uat-001-password-reset.test.js` dan `test/postgres-auth.integration.test.js`.

## 1. Ruang lingkup

Dokumen ini menetapkan kebijakan Multi-Factor Authentication (MFA) TOTP dan
recovery code untuk MAT ERP V2, serta bagaimana faktor dipulihkan tanpa
membuka jalur bypass. Melengkapi [security-model.md](security-model.md) dan
[PASSWORD_RESET_POLICY.md](PASSWORD_RESET_POLICY.md).

## 2. Faktor MFA

- **TOTP RFC 6238.** Secret di-generate server, disimpan terenkripsi
  **AES-256-GCM** (`totp_secret_ciphertext`), tidak pernah dikembalikan plaintext
  setelah enrollment.
- **Enrollment** (`startMfaSetup` → `enableMfa`) memverifikasi satu kode TOTP
  valid sebelum faktor diaktifkan; enrollment yang belum diverifikasi tidak
  memberi akses.
- **Wajib faktor** untuk peran privileged (`PRIVILEGED_ROLES`): Owner,
  System Admin, Security Admin. Login peran ini mengembalikan MFA challenge,
  bukan sesi langsung.

## 3. Recovery code

- **Sepuluh** recovery code diterbitkan saat enrollment dan setiap regenerasi
  (`replaceRecoveryCodes`).
- Disimpan **hanya sebagai SHA-256**, **sekali pakai**, dan dihapus setelah
  dikonsumsi. Plaintext hanya tampil satu kali di layar penerbitan.
- **Regenerasi** (`regenerateRecoveryCodes`) mewajibkan **recent MFA**
  (`assertRecentMfa`) — pengguna harus baru saja lolos MFA dalam jendela waktu,
  bukan hanya memegang sesi lama.
- `recoveryCodeStatus` memaparkan **jumlah sisa** kode (bukan nilainya) agar
  pengguna tahu kapan harus meregenerasi.

## 4. Perubahan/penonaktifan faktor

- **Disable MFA** (`disableMfa`) mewajibkan password **dan** kode TOTP/recovery
  yang valid — tidak bisa dinonaktifkan hanya dengan sesi.
- Perubahan postur MFA mencabut sesi sesuai policy dan **mengirim notifikasi
  keamanan** ke pengguna.
- Recovery bukan bypass: memakai recovery code tetap menghasilkan sesi
  ter-MFA; tidak ada jalur "lupa MFA" yang melewati verifikasi faktor.

## 5. Pemulihan privileged (maker-checker)

Reset kredensial peran administratif **tidak** memakai self-service. Alurnya
maker-checker (lihat [PASSWORD_RESET_POLICY.md](PASSWORD_RESET_POLICY.md)):
Security/System Admin mengusulkan, **Owner** menyetujui dengan **recent MFA**,
maker ≠ checker, tautan sekali pakai berlaku 30 menit, dan seluruh keputusan
(termasuk **DENY**) tercatat append-only tanpa menulis secret ke audit.
Reset Owner bersifat **server-only**.

## 6. Kontrol yang ditegakkan otomatis

| Kontrol | Bukti |
|---|---|
| Recovery code SHA-256, sekali pakai | `test/sec-uat-001-password-reset.test.js` |
| Regenerasi menuntut recent MFA | `test/postgres-auth.integration.test.js` |
| Disable menuntut password + kode | `test/postgres-auth.integration.test.js` |
| Maker ≠ checker, DENY teraudit | `test/sec-uat-001-password-reset.test.js`, `test/postgres.http.test.js` |
| Perubahan faktor mencabut sesi | `test/postgres-auth.integration.test.js` |

## 7. Gate manusia yang masih terbuka

Penutupan `SEC-UAT-001` menuntut operator memverifikasi secara manual bahwa
System Admin **ditolak** saat mereset Owner dan alur maker-checker administrator
non-Owner berjalan. Automation tidak menutup gate manusia ini — lihat
[../uat/UAT_RETEST_PLAN.md](../uat/UAT_RETEST_PLAN.md).
