# Migration Notes — 063 → 066

**Rilis:** v0.36.0 · **Semua migrasi punya `.down.sql` dan teruji rollback.**
Terapkan berurutan dengan `npm run db:migrate`; checksum divalidasi
(`npm run db:validate`).

## 063 — `security_reset_mfa_recovery`
- **Tujuan:** privileged password reset maker-checker + MFA recovery code.
- **Objek utama:** tabel permintaan reset (maker/checker, status, token hash,
  expiry, alasan), recovery code (SHA-256, sekali pakai), audit DENY/APPROVE.
- **Perilaku:** reset Owner server-only; izin granular `user.reset_password`;
  recent-MFA + SoD ditegakkan; secret tidak pernah masuk audit.
- **Rollback:** menurunkan objek tanpa menyentuh sesi/kredensial existing.

## 064 — `execution_rls_concurrency`
- **Tujuan:** defense-in-depth database + concurrency untuk engine eksekusi.
- **Objek utama:** `ENABLE ROW LEVEL SECURITY` + policy `app_branch_visible`/
  join-scope pada `stock_reservations`, `purchase_contract_lines/releases`,
  `work_order_operations/materials/time_logs`, `qc_inspections`, `capa_cases`,
  `measuring_instruments`, `instrument_calibrations`; kolom `version` (optimistic
  lock); unique partial index NULL-safe untuk release replay; view
  `security_invoker`.
- **Catatan:** RLS mengandalkan role runtime non-owner tanpa `BYPASSRLS`
  (ditegakkan `test/p0-rls-tranche1.test.js`). `FORCE ROW LEVEL SECURITY`
  belum dipakai — lihat backlog Wave B residual.

## 065 — `field_encryption_foundation`
- **Tujuan:** enkripsi field sensitif + rotasi kunci.
- **Objek utama:** kolom `*_ciphertext` + `*_key_id` + blind index HMAC pada
  rekening bank (company/supplier/employee), PII/gaji; tabel
  `field_encryption_rotations`.
- **Env baru:** `MAT_FIELD_ENCRYPTION_KEY_ID`, `MAT_FIELD_ENCRYPTION_KEY`,
  `MAT_FIELD_BLIND_INDEX_KEY`, `MAT_FIELD_ENCRYPTION_PREVIOUS_KEYS`
  (placeholder di `.env.example`). Rotasi: `npm run security:rotate-fields`.
- **Predeploy gate** memverifikasi 0 plaintext tersisa + rotasi `SUCCEEDED`.

## 066 — `data_retention_lifecycle`
- **Tujuan:** retensi teknis + legal hold.
- **Objek utama:** `data_retention_policies`, `data_retention_holds`,
  `data_retention_runs` (ledger preview/eksekusi), fungsi
  `execute_data_retention(...)` (SQL statis, allowlist tertutup).
- **Perilaku:** preview tanpa menghapus; legal hold melindungi record; eksekusi
  wajib cocok dengan preview; MFA + idempotency pada eksekusi.
- **Predeploy gate** memverifikasi 6 policy retensi aktif.

## Urutan aman
`062 (existing) → 063 → 064 → 065 → 066`. Rollback terbukti `66 → 65 → 64 → 63`.
Tidak ada perubahan destruktif pada data transaksional existing; seluruh objek
baru bersifat aditif.
