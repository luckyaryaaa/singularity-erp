# Migration Notes — 063 → 074

**Rilis:** v0.39.0 · **Seluruh migration memiliki `.down.sql`.**

Terapkan berurutan dengan `npm run db:migrate`; checksum divalidasi melalui
`npm run db:validate`.

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

## Urutan aman

`062 (existing) → 063 → 064 → 065 → 066 → 067 → 068 → 069 → 070 → 071 → 072 → 073 → 074 → 075 → 076 → 077`

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
