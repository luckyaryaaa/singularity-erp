# LAN-UAT Evidence Pack

Direktori ini adalah paket bukti R025/Sprint 18. Template tidak boleh diubah
menjadi PASS tanpa pengujian manusia dan evidence yang dapat ditelusuri.

## Urutan eksekusi

1. Pastikan `MAT_UAT_DEFAULT_PASSWORD` tersedia melalui environment lokal yang
   tidak di-commit. Jangan menuliskan password ke evidence.
2. Jalankan `npm run uat:technical`. Perintah ini memakai database staf
   `mat_erp_v2_lan_uat`, menjalankan migration/seed/backup/restore/gate, dan
   memakai database disposable terpisah untuk regression test.
3. Setelah hasil teknis hijau, jalankan `npm run uat:lan` untuk sesi staf.
4. Setiap role menjalankan skenario pada `UAT_PLAN.json`. Catat hasil di
   `UAT_RESULTS.json`, bukti screenshot/request ID, serta issue di register.
5. Lengkapi training attendance, rekonsiliasi Finance, dan restore drill.
6. Salin `FINAL_SIGNOFF.example.json` menjadi `FINAL_SIGNOFF.json` hanya setelah
   seluruh skenario PASS dan issue CRITICAL/HIGH sudah CLOSED.
7. Jalankan `npm run uat:validate`. Production gate tetap diblokir bila salah
   satu evidence hilang, stale, atau belum disetujui Owner.

Password, PIN, token, database URL, dan data pribadi dilarang masuk ke evidence.
Gunakan referensi file internal, request ID, atau checksum artefak.
