# SOP-08 — Database Migration

## Tujuan

Menjamin perubahan schema berurutan, checksum-stable, transactional, reversible,
dan dijalankan oleh migration role terpisah.

## Pemilik dan frekuensi

Database Administrator; setiap perubahan schema atau privilege.

## Prosedur

1. Buat pasangan migration `.sql` dan `.down.sql` dengan nomor berikutnya.
2. Gunakan transaction boundary; hindari data loss dan lock panjang.
3. Jalankan `npm.cmd run db:migrate`, `db:validate`, dan `db:grant-runtime`.
4. Jalankan `npm.cmd run db:rollback-verify` pada database disposable.
5. Verifikasi runtime role tanpa CREATE schema dan privilege minimum tetap aktif.

## Evidence

Filename, SHA-256 checksum, waktu apply, hasil rollback/re-up, privilege check,
jumlah row terdampak, dan query plan bila migration menambah index.

## Eskalasi dan rollback

Checksum applied tidak boleh diedit. Buat migration koreksi baru. Down migration
yang berpotensi menghapus data hanya dijalankan dengan backup valid, impact
assessment, downtime plan, dan persetujuan Owner.
