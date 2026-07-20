# SOP-05 — Disaster Recovery

## Tujuan

Memulihkan layanan dan data secara terkendali setelah kehilangan server,
database, atau storage.

## Pemilik dan frekuensi

Owner sebagai incident commander dan System Administrator sebagai recovery
lead; tabletop triwulanan dan saat disaster.

## Prosedur

1. Deklarasikan severity, waktu kejadian, sistem terdampak, RTO, dan RPO.
2. Bekukan deployment serta perubahan data non-esensial; amankan log dan bukti.
3. Provision host bersih, bind database/application sesuai network policy, lalu
   pulihkan backup offsite terakhir yang checksum-nya valid.
4. Jalankan migration validate, self-test, reconciliation, smoke, dan role UAT.
5. Alihkan trafik hanya setelah Owner menyetujui hasil dan data cut-off.

## Evidence

Timeline insiden, backup/checksum, host baru, migration status, data difference,
hasil self-test/UAT, keputusan cutover, serta actual RTO/RPO.

## Eskalasi dan rollback

Jika rekonsiliasi atau integrity check gagal, batalkan cutover dan pertahankan
mode read-only/offline. Kembali ke host terakhir yang tervalidasi tanpa menimpa
salinan evidence maupun backup sumber.
