# SOP-07 — Release, Deployment & Rollback

## Tujuan

Mengirim release atomik, terverifikasi, dan dapat dibatalkan tanpa deploy parsial.

## Pemilik dan frekuensi

Release Manager; setiap minor/patch release.

## Prosedur

1. Pastikan version/changelog/docs/migration/rollback/test menyatu dan diff bersih
   dari secret atau tooling noise.
2. Jalankan `npm.cmd run predeploy`; seluruh blocking gate harus hijau.
3. Jalankan `npm.cmd run release:build` dan `release:verify-assets`; simpan SHA-256.
4. Ambil backup sebelum migration, instal release baru melalui symlink atomik,
   migrate, health-check, dan smoke authenticated.
5. Catat release ID, checksum, migration latest, operator, dan waktu aktivasi.

## Evidence

Predeploy result, manifest, SHA-256, backup ID, migration checksum, health, smoke,
dan approval stage. LOCAL/LAN-UAT tidak boleh disebut production-ready.

## Eskalasi dan rollback

Health/smoke gagal mengembalikan symlink code sebelumnya. Jangan menjalankan
down migration destructive otomatis; ikuti `deploy/rollback-release.sh` dan
review kompatibilitas schema sebelum perubahan database.
