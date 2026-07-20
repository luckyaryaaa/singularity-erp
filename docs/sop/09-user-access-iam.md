# SOP-09 — User Access, IAM & Segregation of Duties

## Tujuan

Menjalankan joiner/mover/leaver, access review, dan emergency access dengan
least privilege serta maker-checker.

## Pemilik dan frekuensi

Security Administrator bersama Owner; setiap perubahan personel dan review
bulanan.

## Prosedur

1. Pemohon membuat Role Assignment dengan scope, alasan, dan masa berlaku.
2. Checker berbeda memeriksa kebutuhan bisnis dan konflik SoD.
3. Owner PIN/recent MFA digunakan untuk aksi yang diwajibkan policy.
4. Perubahan primary role mencabut sesi lama; pengguna login ulang.
5. Review assignment aktif, dormant user, privileged user, override, dan expiry.

## Evidence

Assignment/review ID, requester, approver, scope, reason, effective dates,
conflict/override decision, session revocation, dan audit request ID.

## Eskalasi dan rollback

Konflik SoD diblokir kecuali emergency override terukur maksimal 24 jam. Salah
scope segera direvoke, sesi dicabut, dan akses lama dipulihkan hanya melalui
workflow baru—bukan update langsung database.
