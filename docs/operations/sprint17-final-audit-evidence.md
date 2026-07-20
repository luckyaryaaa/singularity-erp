# Evidence Sprint 17 — Final Audit & Assurance

## Keputusan

Sprint 17/R024 dinyatakan **SELESAI** untuk local build pada 20 Juli 2026.
Rilis v0.24.0 adalah **LAN-UAT candidate**, bukan production go-live. Sprint 18
LAN-UAT dan Owner sign-off serta Sprint 19 aktivasi VPS tetap terpisah.

## Ruang lingkup yang ditutup

1. Matriks otorisasi 14 router dan 183 handler, permission allow/deny,
   branch/IDOR coverage, serta public endpoint allowlist eksplisit.
2. Load LAN dua tahap dengan 10 dan 25 sesi independen, request read/write,
   session-cookie, CSRF, cleanup, logout, dan ambang p95.
3. Self-Test 20 kontrol dengan status `pass`, `warning`, `fail`, `blocked` dan
   release blocking hanya untuk pemeriksaan kritis yang gagal/terblokir.
4. Rekonsiliasi financial, inventory, payroll, lifecycle partisi, dan deteksi
   orphan kritis berbasis query PostgreSQL aktual.
5. Maintenance partisi inventory bulan berjalan dan bulan ke depan melalui
   fungsi SECURITY DEFINER dengan execution grant minimum.
6. Katalog 18 SOP di `docs/sop/` lengkap dengan metadata, owner, evidence,
   langkah, kontrol, eskalasi, dan automated catalog validation.

## Hasil terukur

| Gate | Hasil |
|---|---|
| Regression | 136/136 PASS |
| Authorization | 14/14 PASS |
| Security | 5/5 PASS |
| Accessibility | 18/18 PASS |
| Visual desktop/mobile | 10/10 PASS; tanpa overflow, console error, atau kontrol tanpa label |
| Migration | 001–035 checksum-valid |
| Rollback disposable | 35 up, 34 down, 34 re-up PASS |
| LAN load 10 user | 220 request; read p95 28 ms; write p95 18 ms; 0 gagal |
| LAN load 25 user | 550 request; read p95 43 ms; write p95 14 ms; 0 gagal |
| Final Self-Test | 19 PASS, 1 WARNING, 0 FAIL/BLOCKED; `releaseBlocked=false` |
| Secret scan | 434 file; 0 temuan |
| Dependency audit | 0 vulnerability dari npm advisory cache; verifikasi registry online harus diulang saat jaringan gate tersedia |
| Production package | 281 file allowlist; manifest dan SHA-256 tervalidasi |
| Predeploy LOCAL | 13/13 PASS |
| Backup/restore evidence | backup terakhir berumur 3,9 jam; 11 restore drill sukses |

## Warning yang dibawa ke Sprint 18

Data UAT memiliki subledger persediaan Rp300.505.000 dan saldo akun GL inventory
-Rp50.000, sehingga selisih pembukaan Rp300.555.000. Tidak ada kuantitas tidak
valid, nilai negatif, atau lot melebihi balance. Ini bukan kerusakan engine;
dataset opening inventory belum disertai jurnal opening balance yang disetujui.

Tindakan LAN-UAT: Finance menyiapkan rekonsiliasi opening balance, Owner/Finance
menyetujui akun dan nominal, jurnal diposting melalui workflow normal, lalu
Self-Test diulang sampai warning hilang. Dilarang mengubah balance langsung atau
membuat jurnal otomatis hanya untuk membuat indikator hijau.

## Batas keputusan

- R024/Sprint 17: selesai.
- R025/Sprint 18: belum selesai; membutuhkan pilot nyata, UAT per divisi,
  koreksi opening balance, pelatihan, dan Owner sign-off.
- R026/Sprint 19: belum dimulai; VPS dan DNS tidak boleh diaktifkan sebelum gate
  produksi serta sign-off R025 lengkap.
