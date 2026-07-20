# SOP-18 — LAN-UAT, Training & Owner Sign-off

## Tujuan

Membuktikan ERP dapat dipakai lintas divisi pada LAN sebelum aktivasi VPS.

## Pemilik dan frekuensi

UAT Coordinator bersama Owner; satu siklus penuh sebelum go-live dan setiap
major change yang memengaruhi workflow kritis.

## Prosedur

1. Gunakan database/seed UAT terpisah; jangan memakai production opening data.
2. Jalankan predeploy LAN-UAT, load 10/25 user, backup/restore, dan self-test.
3. Latih Owner, Finance, Sales, Procurement, Warehouse, Production, Quality,
   HR, Auditor, dan administrator sesuai skenario per role.
4. Rekam PASS/FAIL, severity, screenshot/request ID, issue owner, retest, dan
   acceptance setiap divisi.
5. Owner sign-off hanya setelah critical issue 0 dan evidence final lengkap.

## Evidence

Environment, build/version/SHA, peserta, role scenarios, test results, issue
register, training attendance, reconciliation, restore drill, dan signed approval.

## Eskalasi dan rollback

Critical issue, data mismatch, unauthorized access, atau restore failure menahan
sign-off dan VPS. Kembali ke build UAT terakhir yang hijau; production activation
hanya mengikuti R026 setelah file sign-off tervalidasi gate.
