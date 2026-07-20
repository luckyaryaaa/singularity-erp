# SOP-12 — Sales, Order-to-Cash, Collection & RMA

## Tujuan

Mengendalikan alur inquiry hingga kas diterima dan menangani retur/garansi tanpa
memutus traceability dokumen maupun stok.

## Pemilik dan frekuensi

Sales Manager dan Finance; per transaksi, dengan collection review mingguan.

## Prosedur

1. Validasi customer, credit limit/hold, harga, pajak, dan margin sebelum submit.
2. Revisi quotation membuat snapshot immutable; konversi mengikuti relation.
3. SO/proyek/WO/delivery/invoice memakai status dan approval resmi.
4. Jalankan dunning sesuai policy; Finance menyetujui credit override beralasan.
5. RMA memvalidasi masa garansi, source delivery/invoice, disposition, lot retur,
   credit posting, dan tindakan perbaikan.

## Evidence

Document chain, approval snapshot, credit exposure, delivery proof, invoice,
payment allocation, dunning level, RMA/lot/journal, dan audit reason.

## Eskalasi dan rollback

Over-limit/hold, margin exception, warranty invalid, atau duplicate conversion
diblokir. Gunakan revise, cancel sebelum posted, atau correction/RMA setelah
posted; jangan menghapus dokumen sumber.
