# SOP-10 — Financial Close & Reconciliation

## Tujuan

Memastikan jurnal seimbang, subledger AR/AP/payroll konsisten, dan periode hanya
ditutup setelah seluruh exception diputuskan.

## Pemilik dan frekuensi

Finance Manager dengan Accounting sebagai maker; setiap akhir bulan.

## Prosedur

1. Pastikan seluruh dokumen periode selesai diposting dan tidak ada draft jurnal
   atau job finance gagal.
2. Jalankan bank reconciliation, AR/AP vs GL, payroll total vs items, inventory
   subledger vs GL, depreciation, dan tax summary.
3. Periksa Closing Cockpit; selesaikan `FAIL`, dokumentasikan `WARNING`.
4. Finance melakukan review; Owner menyetujui close sesuai approval policy.
5. Reopen hanya dengan alasan, PIN Owner, jurnal koreksi/reversal, dan audit.

## Evidence

Period, reconciliation run ID, difference, aging, trial balance, closing
checklist, approver, close timestamp, dan dokumen exception.

## Eskalasi dan rollback

Jurnal tidak seimbang atau mismatch payroll adalah blocker. Selisih opening
inventory harus memiliki approved opening journal/cutover decision. Jangan
mengubah balance langsung; gunakan correction/reversal.
