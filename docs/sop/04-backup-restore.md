# SOP-04 — Backup & Restore

## Tujuan

Memastikan backup PostgreSQL terenkripsi, dapat diverifikasi, dan benar-benar
dapat dipulihkan tanpa menyentuh database lain.

## Pemilik dan frekuensi

System Administrator; backup harian dan restore drill minimal bulanan.

## Prosedur

1. Pastikan target, encryption key, dan direktori offsite berasal dari secret
   environment, bukan source code.
2. Jalankan `npm.cmd run backup:run`; verifikasi status, ukuran, dan SHA-256.
3. Salin artefak terenkripsi ke lokasi offsite terkontrol.
4. Jalankan `npm.cmd run backup:restore-test` pada database disposable.
5. Bandingkan migration latest, jumlah tabel, dan hasil health setelah restore.

## Evidence

Simpan backup ID, started/finished time, ukuran, checksum, target, restore DB
disposable, dan `restore_tested_at`. Jangan mencatat password atau key.

## Eskalasi dan rollback

Backup/restore gagal memblokir release. Pertahankan backup valid sebelumnya,
hentikan rotasi/cleanup, periksa ruang dan credential, lalu ulangi pada target
disposable. Jangan restore menimpa database aktif tanpa persetujuan Owner.
