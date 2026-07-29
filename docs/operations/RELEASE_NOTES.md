# Release Notes — v0.39.0

**Tanggal:** 2026-07-28 · **Branch:** `review/codex-claude-consolidation`  
**Migrasi:** 001–074 · **Status:** engineering release candidate.

Rilis ini menutup Stage 3 Finance End-to-End secara engineering. Production
tetap fail-closed sampai evidence dan persetujuan manusia lengkap.

## Sorotan

### Coding block fail-closed

- Mode journal dimension default `HARD`; nilai tidak dikenal juga kembali ke
  `HARD`, bukan melemahkan enforcement.
- Policy per kategori akun memiliki version dan audit. Cost center, profit
  center, dan project WBS tersedia pada jurnal manual.
- Posting otomatis memilih master aktif dari legal entity/cabang secara
  deterministik, menyimpan header dimension dan snapshot sumber resolusi, lalu
  tetap menolak bila master wajib memang tidak tersedia.

### Reconciliation dan closing evidence

- Enam evidence type: `BANK`, `INVENTORY`, `PAYROLL`, `TAX`, `AR`, dan `AP`.
- Snapshot rekonsiliasi immutable, ber-versi, memiliki SHA-256, maker-checker,
  reject reason, RLS, dan audit trail.
- Period close wajib `Idempotency-Key` dan alasan. Close package disimpan
  immutable; reopen menutup lifecycle tanpa menghapus bukti terdahulu.
- Close ditolak sampai versi terbaru keenam evidence berstatus `APPROVED`,
  SHA-256 valid, dan bukan `NOT_RUN`; exception approval wajib beralasan.
- Closing Cockpit menampilkan checklist, evidence terbaru, approval action, dan
  riwayat close package.

### Laporan keuangan resmi

- Prepare → Review → Sign-off tersedia end-to-end pada UI dan API.
- Sign-off memerlukan periode `CLOSED`, neraca seimbang, SHA valid, dan pemisahan
  maker/reviewer/signer.
- Tax Center menampilkan GL ↔ tax subledger serta evidence reconciliation.
- OpenAPI 1.4 mencakup endpoint baru; authorization matrix mencakup 291 handler.

## Database dan keamanan

- **Migration 074:** `finance_reconciliation_evidence`,
  `accounting_period_close_runs`, metadata version pada coding policy, RLS,
  immutable trigger, dan privilege runtime minimum.
- Audit data protection lulus: 31/31 tabel RLS, runtime non-owner/
  non-`BYPASSRLS`, empat encryption constraint valid, nol plaintext, sembilan
  histori tanpa `DELETE/TRUNCATE`.

## Urutan deployment

```powershell
npm.cmd run db:migrate
npm.cmd run db:grant-runtime
npm.cmd run db:validate
npm.cmd run security:data-audit
npm.cmd run predeploy
```

Seluruh migration mempunyai pasangan `.down.sql`. Migration rollback harus
diuji pada database disposable, bukan pada database bisnis.

## Gate yang tetap terbuka

Rilis ini **bukan production approval**. Go-live tetap diblokir sampai:

- `SEC-UAT-001` diretest operator dan berstatus `CLOSED`;
- UAT 13 role dan training evidence lengkap;
- enam rekonsiliasi aktual disetujui Finance/Owner pada release SHA yang sama;
- actual RTO/RPO serta immutable offsite backup evidence disetujui;
- Owner menandatangani versi, SHA, dan migration yang sama.

Detail teknis: [v0.39-finance-end-to-end-closure.md](v0.39-finance-end-to-end-closure.md),
[MIGRATION_NOTES.md](MIGRATION_NOTES.md), dan
[TEST_EVIDENCE.md](TEST_EVIDENCE.md).
