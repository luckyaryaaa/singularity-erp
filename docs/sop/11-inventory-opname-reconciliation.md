# SOP-11 — Inventory Opname & Reconciliation

## Tujuan

Menjaga kuantitas, lot/heat number, nilai persediaan, dan GL dapat ditelusuri.

## Pemilik dan frekuensi

Warehouse Supervisor sebagai maker dan Accounting sebagai checker; cycle count
bulanan dan full opname minimal kuartalan.

## Prosedur

1. Tetapkan gudang dan cut-off; hentikan movement selama snapshot opname aktif.
2. Buat Stock Opname, hitung fisik tanpa melihat expected qty bila blind count.
3. Masukkan count, review selisih/lot/heat/certificate, lalu checker menyetujui.
4. Posting adjustment menghasilkan movement serta jurnal profile OPNAME-DEFAULT.
5. Jalankan Self Test inventory reconciliation dan review subledger vs akun 1300.

## Evidence

Nomor OPN, snapshot time, counter/checker, count lines, variance qty/value,
movement IDs, journal document, dan reason setiap selisih material.

## Eskalasi dan rollback

Negative stock, reserved > on-hand, lot > balance, atau selisih tanpa sebab
memblokir posting. Koreksi menggunakan opname/reversal baru; dilarang mengedit
saldo atau menghapus movement append-only.
