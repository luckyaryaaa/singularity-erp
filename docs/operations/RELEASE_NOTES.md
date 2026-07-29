# Release Notes — v0.47.0

**Tanggal:** 2026-07-29 · **Branch:** `review/codex-claude-consolidation`

**Migrasi:** 001–082 · **Status:** technical release candidate.

Rilis ini menyelesaikan Canonical Warehouse Stage 2A dan WMS Mobility:
canonical-dimension guard, health reconciliation, handling unit/license plate,
serta bukti scan LOT/BIN/HU append-only yang menjadi completion gate tugas.

Rilis ini menghubungkan transactional Domain Event ke Unified Work Item,
sekaligus mempertahankan Warehouse Execution, Notification Preferences,
Advanced Pricing, dan fresh-database warehouse invariant. Production tetap
fail-closed sampai evidence dan persetujuan manusia lengkap.

## Sorotan

### Work orchestration lintas modul

- `work.action-required.v1` membuat Work Item + notifikasi secara idempoten;
  `work.action-resolved.v1` menutupnya otomatis.
- Approval, Warehouse Task, CAPA/QC, reconciliation exception, dunning, dan
  credit hold menjadi sumber action-required awal.
- Outbox memiliki version, retry/backoff, dead-letter, dedupe, audit, metadata
  observability tanpa payload, dan controlled retry dengan recent MFA.

### Warehouse execution dan canonical ledger

- WMS task lifecycle RECEIVE/PUTAWAY/PICK/PACK/SHIP/COUNT dengan RLS,
  optimistic lock, assignment, prioritas, SLA, dan audit.
- `stock_lots.org_warehouse_id`, ledger `security_invoker`, serta self-healing
  gudang lot menjaga scope cabang.
- Migration 080 menjamin setiap cabang aktif yang dibuat setelah migration 076
  langsung memperoleh tepat satu gudang default aktif.

### Unified work dan notification preferences

- Work item lintas modul memiliki lifecycle, evidence, delegasi, eskalasi,
  ownership, SLA, dan My Work berbasis data nyata.
- Preferensi notifikasi per pengguna dapat mematikan kategori in-app/email
  tanpa menghapus record; `SYSTEM_ALERT` selalu aktif.

### Advanced pricing Stage 1

- Condition records BASE_PRICE, DISCOUNT_PCT, DISCOUNT_AMT, dan SURCHARGE_PCT
  dengan scope produk/pelanggan/kategori, quantity scale, validity, priority,
  optimistic lock, dan audit.
- Resolver server-authoritative memilih base price paling spesifik lalu
  menerapkan discount/surcharge yang berlaku.

### Visual dan accessibility

- Baseline visual v8 mencakup 31 halaman × desktop/mobile = **62/62 PASS**.
- Lima capability terbaru mempunyai selector terarah, bukan hanya smoke pada
  container umum.
- Accessibility static **18/18 PASS**.

## Database dan keamanan

- Migration **001–081** valid dan applied; rollback disposable **81 up, 80
  down, 80 re-up PASS**. Migration 001 adalah baseline foundation; migration
  incremental 002–081 mempunyai pasangan down.
- Authorization matrix: **14 router, 310 handler PASS**.
- Data protection: **31/31 RLS**, runtime non-owner/non-`BYPASSRLS`, empat
  encryption constraint valid, nol plaintext, sembilan history protected.
- Secret scan terakhir: nol finding. Nilai hitungan file final tercatat pada
  [TEST_EVIDENCE.md](TEST_EVIDENCE.md).

## Urutan deployment

```powershell
npm.cmd run db:migrate
npm.cmd run db:grant-runtime
npm.cmd run db:validate
npm.cmd run security:data-audit
npm.cmd run predeploy
```

Rollback wajib diuji pada database disposable, bukan database bisnis.

## Gate yang tetap terbuka

Technical RC ini **bukan production approval**. Go-live tetap diblokir sampai:

- `SEC-UAT-001` diretest operator dan berstatus `CLOSED`;
- UAT serta training 13 role lengkap;
- enam rekonsiliasi aktual disetujui Finance/Owner pada release SHA yang sama;
- actual RTO/RPO dan immutable offsite backup evidence disetujui;
- Owner menandatangani versi, SHA, dan migration yang sama.

Detail: [v0.46-domain-event-work-orchestration.md](v0.46-domain-event-work-orchestration.md),
[v0.45-fresh-database-warehouse-invariant.md](v0.45-fresh-database-warehouse-invariant.md),
[MIGRATION_NOTES.md](MIGRATION_NOTES.md), dan
[TEST_EVIDENCE.md](TEST_EVIDENCE.md).
