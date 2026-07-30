# Migration Notes — 063 → 084

**Rilis:** v0.47.0 · migration incremental 002–082 memiliki `.down.sql`;
001 adalah baseline foundation dan tidak di-rollback.

Terapkan berurutan dengan `npm run db:migrate`; checksum divalidasi melalui
`npm run db:validate`.

## 082 — `warehouse_stage2a_mobility`

- Menambahkan canonical warehouse guard pada balance, movement, reservation,
  lot, dan Warehouse Task.
- Menambahkan expiry date, location ledger, dan health reconciliation view.
- Menambahkan handling unit/license plate, item, scan session, serta scan event
  append-only dengan RLS dan trigger lintas-dimensi.
- Rollback menghapus objek Stage 2A dan mengembalikan resolver lot Stage 1.

## 081 — `domain_event_work_item_projection`

- Menambah `event_version`, `delivery_status`, `next_attempt_at`, dan
  `dead_lettered_at` pada transactional outbox.
- Menambah `automation_key`, `source_event_id`, `source_event_type`, serta
  `auto_managed` pada Unified Work Item.
- Unique partial index menjamin replay event/business key tidak membuat Work
  Item ganda.
- Down migration melepas index/kolom secara terbalik dan memulihkan index
  unpublished lama.
- Rollback disposable tervalidasi **81 up, 80 down, 80 re-up**.

## 063–064 — Security recovery dan execution hardening

- Privileged password reset maker-checker, MFA recovery, RLS execution,
  `security_invoker` view, optimistic version, dan replay guard.

## 065–066 — Field encryption dan retention

- AES-256-GCM, purpose/scope AAD, blind index HMAC, key ring, rotation ledger.
- Rekening bank dan restricted HR notes dilindungi.
- Retention allowlist, legal hold, preview, exact-count batch, recent MFA,
  idempotency, dan execution ledger.

## 067–069 — Finance control depth

- Journal coding dimensions/policy, GL-to-tax reconciliation, closing
  integration, dan financial report prepare→review→sign-off/reject dengan SoD.

## 070 — `security_data_protection_tranche2`

- RLS pada 29 tabel sensitif Finance, organization, HR, payroll, attendance,
  dan tax.
- `app_employee_visible` menurunkan scope child aggregate dari branch employee.
- Kolom ciphertext/key/blind-index untuk KTP, NPWP employee, nomor BPJS, dan
  identitas pajak organisasi.
- Constraint dibuat `NOT VALID` agar migration online; rotation melakukan
  backfill lalu validasi atomik.
- Unique plaintext index diganti dengan unique blind-index.

## 071 — `employee_null_scope_fail_closed`

- Employee tanpa branch tidak terlihat oleh sesi branch.
- System dan authorized cross-branch context tetap dapat melakukan maintenance.

## 072 — `sensitive_history_least_privilege`

- Mencabut `DELETE/TRUNCATE` runtime pada financial reports, accounting
  periods, compensation, employee tax/BPJS, payroll items, dan tax records.
- Koreksi wajib melalui versioning, reversal, atau effective-dated row.

## 073 — `identifier_token_capacity`

- Memperbesar kolom legacy KTP/NPWP/BPJS menjadi `varchar(48)`.
- Token kompatibilitas `ENC:` + 36 karakter dapat disimpan tanpa truncation.
- Scoped repository test memverifikasi ciphertext at rest, plaintext berizin,
  dan audit redaction.

## 074 — `finance_end_to_end_closure`

- Menambah `version` dan `updated_by` pada policy coding block.
- Mengaktifkan kewajiban profit center pada transaction dimension policy
  Finance yang relevan.
- Menambah evidence rekonsiliasi BANK/INVENTORY/PAYROLL/TAX/AR/AP yang
  immutable, ber-versi, memiliki SHA-256, RLS, maker-checker, dan reject reason.
- Menambah period-close package immutable beserta alasan, waiver, snapshot
  checklist, SHA-256, dan lifecycle reopen.
- Runtime hanya memperoleh privilege minimum; update/delete snapshot bukti
  ditolak trigger dan privilege.

## 075 — `warehouse_task_engine`

- Menambah tabel `warehouse_tasks`: mesin tugas eksekusi gudang bertipe
  (RECEIVE/PUTAWAY/PICK/PACK/SHIP/COUNT) dengan status
  OPEN→CLAIMED→IN_PROGRESS→DONE/CANCELLED, prioritas, jatuh tempo, penugasan,
  dan `version` optimistic lock.
- Constraint struktural: put-away wajib `lot_id` + `to_bin_id`; pick wajib
  `lot_id`; tugas tertutup wajib membawa jejak penyelesaian/pembatalan.
- RLS `branch_scope` memakai `app_branch_visible(branch_id)` sebagai pertahanan
  kedua isolasi cabang. Berdiri di atas model lot/bin (058); ledger stok tidak
  diubah. Rollback aman penuh — `075.down.sql` menghapus tabel beserta policy
  dan index.

## 076 — `canonical_warehouse_ledger`

- Menambah `org_warehouses.is_default` + partial unique index (maksimal satu
  default per cabang) dan backfill: setiap cabang aktif memperoleh gudang default
  deterministik (dibuat bila belum ada; plant di-resolve bila cabang punya satu).
- Menambah `stock_lots.org_warehouse_id` (FK org_warehouses) + trigger
  `resolve_stock_lot_warehouse` self-healing: gudang lot selalu berada di
  cabangnya (NULL/lintas-cabang → gudang default cabang). Backfill lot lama.
- Menambah view `stock_warehouse_ledger` (security_invoker) Legal Entity → Plant
  → Warehouse + ringkasan stok. Kunci isolasi tetap cabang (Stage 1); grain-flip
  penuh adalah cutover berikutnya. Rollback aman — down membalik seluruh objek
  skema; baris gudang default hasil backfill dibiarkan dan re-up idempoten.

## 077 — `unified_work_items`

- Menambah tabel `work_items`: engine pekerjaan lintas modul bertipe
  (APPROVAL/EXCEPTION/REVIEW/CORRECTION/TASK/FOLLOW_UP) dengan status
  OPEN→CLAIMED→IN_PROGRESS→RETURNED/ON_HOLD→DONE/CANCELLED, prioritas, risiko,
  SLA/jatuh tempo, delegasi, eskalasi, evidence jsonb, dan `version` optimistic.
- `source_entity_id` sengaja tanpa FK (menunjuk banyak tabel: dokumen, tugas
  gudang, rekonsiliasi). Isolasi via RLS `branch_scope` (`app_branch_visible`).
- Additive murni; tidak mengubah tabel lain. Rollback aman penuh — `077.down.sql`
  menghapus tabel beserta policy dan index.

## 078 — `notification_preferences`

- Menambah tabel `notification_preferences` (PK user_id+category): mute in-app dan
  email per kategori, per pengguna. RLS `own_user` mengunci ke pemiliknya (bypass
  `app.is_system`). Filter mute dijahit di jalur baca notifikasi (operations.js),
  bukan jalur tulis. `SYSTEM_ALERT` tidak dapat dimatikan (dijaga repo).
- Additive murni; rollback aman penuh (`078.down.sql` menghapus tabel + policy).

## 079 — `pricing_conditions`

- Menambah tabel `pricing_conditions`: condition records harga (BASE_PRICE/
  DISCOUNT_PCT/DISCOUNT_AMT/SURCHARGE_PCT) per legal entity, cakupan produk/
  pelanggan/kategori, `min_qty` (skala), effective-dated, prioritas, `version`.
  Constraint: minimal satu dimensi cakupan, validity konsisten, persen ≤ 100.
- Tanpa RLS cabang (master pricing per legal entity; scope ditegakkan repo +
  peran lintas cabang). Additive murni; rollback aman penuh.

## 080 — `branch_default_warehouse_guard`

- Menutup celah lifecycle migration 076: cabang aktif yang dibuat setelah
  migration kini otomatis memiliki tepat satu gudang default aktif.
- Trigger memilih default existing, mempromosikan warehouse existing, atau
  membuat warehouse default baru. Fungsi `SECURITY DEFINER` memakai
  `search_path` terkunci.
- Backfill memperbaiki cabang aktif yang terlanjur belum mempunyai default.
- Down migration menghapus trigger/fungsi; baris warehouse yang sudah terbentuk
  tetap dipertahankan sebagai data organisasi.

## 083 — `warehouse_stage2b_read_switch`

- Fase RECONCILE + READ-SWITCH cutover kanonik, reversibel. Menambah view
  `warehouse_read_switch_reconciliation` (per produk×cabang: total grain cabang
  vs grain org_warehouse) + `warehouse_read_switch_health` (ringkasan gate), dan
  seed `system_settings.warehouse.read_grain='BRANCH'`.
- Additive murni; `warehouse_id` tetap kunci scope/RLS. `listInventory` grain-aware
  (default BRANCH identik). Rollback aman penuh (drop view + hapus setting).

## Urutan aman

## 084 — `warehouse_terminal_grain_flip`

- Grain otoritatif TULIS saldo persediaan → gudang kanonik: `posting.applyBalance`
  dan `syncBalance` meng-key `inventory_balances` pada `(product, org_warehouse)`.
  Menambah keunikan `(product_id, org_warehouse_id)`; keunikan cabang
  `(product_id, warehouse_id)` dipertahankan (kompatibilitas + 1:1). Additive,
  value-preserving, rollback aman (lepas keunikan kanonik).

## Urutan aman

`062 (existing) → 063 → 064 → 065 → 066 → 067 → 068 → 069 → 070 → 071 → 072 → 073 → 074 → 075 → 076 → 077 → 078 → 079 → 080 → 081 → 082 → 083 → 084`

Setelah migration 070:

```powershell
npm.cmd run security:rotate-fields
npm.cmd run db:grant-runtime
npm.cmd run security:data-audit
```

Rollback full-chain wajib dijalankan di database disposable dengan
`npm run db:rollback-verify`. Rollback 070 yang menghapus kolom ciphertext
hanya aman sebelum data production dirotasi; setelah rotation, gunakan forward
fix atau prosedur decrypt/export terkontrol, bukan down migration langsung.
