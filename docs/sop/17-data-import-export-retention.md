# SOP-17 — Data Import, Export & Retention

## Tujuan

Mengendalikan data masuk/keluar, file privat, artefak, dan retention tanpa
melewati scope atau memenuhi disk dengan file liar.

## Pemilik dan frekuensi

Data Steward; setiap batch import/export dan review retention bulanan.

## Prosedur

1. Gunakan template resmi, validasi MIME/size, quarantine, scan, dan scope dokumen.
2. Jalankan import async; review success/error rows dan perbaiki sumber, bukan DB.
3. Export memvalidasi permission, period, branch, dan ownership saat enqueue serta
   execute; XLSX maksimal 50.000 baris dan PDF harus full pagination.
4. Unduhan memverifikasi checksum serta dicatat pada audit trail.
5. Hapus hanya artefak expired melalui lifecycle; pertahankan metadata/audit.

## Evidence

File/job/batch/artifact ID, checksum, scanner result, row count, error sample,
scope, requester, download audit, expiry, dan cleanup run.

## Eskalasi dan rollback

Malware/spoof, checksum mismatch, cross-branch export, atau mass error memblokir
proses. Karantina file dan retry dari sumber bersih; jangan memindah/menghapus
storage manual tanpa metadata transaction.
