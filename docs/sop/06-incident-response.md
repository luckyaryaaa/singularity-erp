# SOP-06 — Security & Service Incident Response

## Tujuan

Menangani insiden secara cepat tanpa menghilangkan bukti atau memperluas dampak.

## Pemilik dan frekuensi

Security Administrator; setiap alert high/critical atau gangguan layanan.

## Prosedur

1. Catat request ID, akun, IP, waktu, modul, gejala, dan klasifikasi severity.
2. Contain: cabut sesi/assignment terdampak, rotasi secret bila bocor, dan
   isolasi endpoint/file tanpa menghapus audit trail.
3. Analisis log terstruktur, audit old/new/reason, outbox, job, dan DB evidence.
4. Perbaiki akar masalah, tambah regression/negative test, lalu jalankan gate.
5. Pulihkan akses bertahap dan lakukan post-incident review.

## Evidence

Incident ID, timeline, indikator kompromi, sesi/role yang dicabut, secret key ID
baru, commit/perubahan, test result, dan approval pemulihan.

## Eskalasi dan rollback

Kebocoran data, privilege escalation, kehilangan integritas, atau outage panjang
segera dieskalasikan ke Owner. Rollback code menggunakan SOP-07; pemulihan data
menggunakan SOP-04/SOP-05.
