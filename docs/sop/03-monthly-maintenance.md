# SOP-03 — Monthly Platform Maintenance

## Tujuan

Menjaga database, partisi, retensi, indeks, storage, dan dokumentasi tetap sehat.

## Pemilik dan frekuensi

System Administrator; bulanan setelah closing dan backup tervalidasi.

## Prosedur

1. Jalankan restore drill, access review, dormant-user review, dan privileged
   account review.
2. Pastikan partisi audit tahun berjalan/berikutnya serta inventory bulan
   berjalan/berikutnya tersedia melalui Self Test.
3. Review ukuran tabel/index, dead tuple, slow query, dan kebutuhan `ANALYZE`.
4. Bersihkan artefak kedaluwarsa melalui lifecycle aplikasi; jangan menghapus
   file storage secara manual.
5. Review retention matrix, kapasitas backup, SOP, API docs, dan schema docs.

## Evidence

Catat checksum backup, hasil restore, daftar partisi, statistik storage/index,
access-review ID, serta perubahan dokumentasi.

## Eskalasi dan rollback

Orphan record, partisi hilang, atau restore gagal berstatus blocking. Jangan
menjalankan cleanup massal; pulihkan dari backup atau gunakan migration/runbook
yang telah direview.
