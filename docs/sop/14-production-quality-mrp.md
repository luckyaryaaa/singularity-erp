# SOP-14 — Production, Quality & MRP

## Tujuan

Menjaga material, waktu aktual, costing, quality decision, dan finished goods
terhubung ke work order secara penuh.

## Pemilik dan frekuensi

Production Manager dan Quality Supervisor; setiap work order dan run MRP.

## Prosedur

1. Release WO dari routing/BOM version snapshot dan work-center rate aktif.
2. Plan membuat material reservation; issue memakai FIFO lot dan warehouse scope.
3. Operator mencatat waktu append-only dan menyelesaikan operation berurutan.
4. QC mencatat sample/pass/fail; FAIL/PARTIAL membuat NCR/karantina/CAPA.
5. Finish WO hanya jika material, operation, dan quality gate lengkap; catat
   actual cost serta finished-goods lot.
6. MRP melakukan netting on-hand/reserved/safety stock dan konversi idempoten ke PR.

## Evidence

WO, BOM/routing snapshot, reservation, material issue/lot lineage, time logs,
QC/NCR/CAPA, costing, FG lot, MRP suggestion, dan PR relation.

## Eskalasi dan rollback

Negative stock, lot blocked, QC fail terbuka, operation belum selesai, atau
duplicate MRP memblokir finish/convert. Gunakan release reservation, adjustment,
NCR disposition, atau WO correction—bukan edit ledger.
