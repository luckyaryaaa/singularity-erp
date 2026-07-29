# Rencana Retest UAT — v0.46.0

**Tujuan:** menutup `SEC-UAT-001` dan menyiapkan bukti UAT 13 role yang wajib
dieksekusi **manusia**, semuanya menunjuk SHA/migrasi/versi yang sama.
**Rekayasa:** selesai & terbukti otomatis. **Gate ini:** eksekusi operator.

## 1. Basis retest

| Item | Nilai |
|---|---|
| Versi | v0.46.0 |
| Migrasi | 001–081 |
| Branch | review/codex-claude-consolidation |
| Prasyarat | `npm run predeploy` hijau pada SHA yang diretest |

## 2. SEC-UAT-001 — retest wajib (P0 blocker)

Skenario yang **harus** diverifikasi operator (bukan automation):

1. **Reset Owner ditolak.** System Admin mencoba mereset password Owner via
   endpoint admin → **wajib ditolak** (`PERMISSION_DENIED`), tidak ada perubahan
   kredensial, penolakan tercatat audit tanpa secret.
2. **Maker-checker administrator non-Owner.** Security Admin mengusulkan reset
   admin lain → Owner menyetujui dengan **recent MFA** → maker ≠ checker
   ditegakkan; pengusul tidak bisa menyetujui usulannya sendiri.
3. **Tautan sekali pakai.** Tautan reset berlaku 30 menit, ditolak pada
   penggunaan kedua atau setelah kedaluwarsa.
4. **Recovery code sekali pakai.** Kode dikonsumsi tidak dapat dipakai ulang;
   regenerasi menuntut recent MFA.
5. **Pencabutan sesi.** Reset sukses mencabut sesi/challenge target.

**Kriteria tutup:** kelima lulus manual → isi `retestEvidence` + `closedBy` di
`ISSUE_REGISTER.json`, ubah status `READY_FOR_RETEST` → `CLOSED`.

## 3. UAT 13 role

Setiap role menjalankan skenario end-to-end pada release yang sama. Role wajib
(`scripts/uat-evidence.js` `REQUIRED_ROLES`): **owner, system_admin,
security_admin, finance_manager, accounting, tax, hrd, sales, procurement,
warehouse, production, auditor, employee**.

Tiap skenario mencatat: role, langkah, hasil (PASS/FAIL), bukti (screenshot/ID
transaksi), dan penolakan yang diharapkan (negative test) untuk membuktikan
least-privilege. Hasil masuk `UAT_PLAN.json` / `UAT_RESULTS.json`.

## 4. Rekonsiliasi (evidence + approval manusia)

Enam rekonsiliasi wajib bertanda tangan (`RECONCILIATION.json`):
`TRIAL_BALANCE`, `AR_GL`, `AP_GL`, `INVENTORY_GL`, `PAYROLL_GL`, `TAX`.
Masing-masing: sumber angka, selisih, penjelasan, approver.

Gunakan workbench `#/tax`, `#/accounting/closing`, dan
`#/accounting/statements` untuk menghasilkan evidence aplikasi. Maker,
reviewer/approver, dan signer harus pengguna berbeda sesuai policy.

## 5. DR & sign-off

- **Restore drill** dengan RTO/RPO **aktual** + bukti operator (`RESTORE_DRILL.json`).
- **Training attendance** 13 role (`TRAINING_ATTENDANCE.json`).
- **Owner final sign-off** (`FINAL_SIGNOFF.json`) menunjuk versi/SHA/migrasi
  yang identik dengan seluruh evidence di atas.

## 6. Exit gate

`uat:validate --final` hijau **dan** `SEC-UAT-001 = CLOSED` **dan** 0 Critical/
High terbuka. Hasil dituliskan ke [UAT_RETEST_RESULTS.md](UAT_RETEST_RESULTS.md).
