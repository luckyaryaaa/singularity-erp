# SOP-01 — Daily Operations & Monitoring

## Tujuan

Memastikan runtime, PostgreSQL, queue, storage, backup, dan security event siap
sebelum pengguna memulai pekerjaan harian.

## Pemilik dan frekuensi

System Administrator; setiap hari kerja sebelum jam operasional dan setelah
insiden layanan.

## Prosedur

1. Buka Sistem → Monitoring dan pastikan database `up`, pool tidak menunggu,
   error rate terkendali, serta disk di bawah 75%.
2. Jalankan `npm.cmd run db:health` dan periksa `/api/health` dari localhost.
3. Periksa job `FAILED/DEAD_LETTER`, file karantina, failed login, dan alert.
4. Pastikan backup `COMPLETED` terakhir berumur kurang dari 48 jam.
5. Jalankan Self Test; status `FAIL` atau `BLOCKED` menghentikan release.

## Evidence

Catat waktu, operator, hasil health, jumlah failed job, kapasitas disk, ID backup,
dan request ID self-test pada log operasi harian.

## Eskalasi dan rollback

Disk ≥75% menjadi warning; ≥90%, database down, backup gagal, atau critical
self-test dieskalasikan ke Owner. Hentikan worker/deploy baru, pertahankan log,
dan ikuti SOP-04/SOP-06 sesuai penyebab.
