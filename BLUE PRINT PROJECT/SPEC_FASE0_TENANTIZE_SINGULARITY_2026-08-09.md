<!--
  Spec teknis (requirement baseline). Bukan bukti implementasi.
  Parent: BLUEPRINT_SINGULARITY_PLATFORM_MULTITENANT_2026-08-09.md (Fase 0)
  Grounding kode (dibaca 2026-08-09):
    backend/infrastructure/database/transaction.js  (setRlsContext, withTransaction)
    data/migrations/045_rls_tranche1.sql            (app_branch_visible, pola policy)
    backend/core/data-scope.js                      (SCOPES, hasGlobalScope)
    backend/core/permissions.js                     (CROSS_BRANCH_ROLES)
    scripts/grant-runtime.js                        (runtime role + pola verifikasi leak)
-->

# SPEC — FASE 0 "TENANTIZE"

## Singularity Platform · fondasi multi-tenant di atas codebase MAT ERP

- **Tanggal**: 2026-08-09
- **Baseline**: migration 001–089, runtime role `mat_erp_app`, RLS branch aktif (tranche 045/064/070/071)
- **Tujuan fase**: menambah **satu scope terluar `tenant_id`** ke seluruh data & jalur akses, **backfill MAT → Tenant #001**, tanpa mengubah perilaku fungsional MAT. Setelah fase ini, sistem **secara struktural multi-tenant** meski baru satu tenant.
- **Definisi sukses**: MAT berjalan **identik** seperti sebelumnya; sebuah tenant kedua yang di-seed **tidak bisa** melihat/menyentuh satu baris pun milik MAT (dibuktikan test lintas-tenant hijau + predeploy gate).

---

# 0. Invariant (tidak boleh dilanggar)

1. **Setiap tabel bisnis punya `tenant_id NOT NULL`** yang mereferensi `tenants(id)`.
2. **Tidak ada transaksi non-platform tanpa tenant context** — ditolak di aplikasi (fail-closed) *dan* di database (RLS).
3. **Bypass cross-branch ≠ bypass cross-tenant.** Peran owner/admin/auditor tetap **terkurung di tenant-nya**. Hanya operasi **platform** (migrasi, control-plane, job lintas-tenant sadar-tenant) yang boleh melintas.
4. **Isolasi gagal-tertutup**: bila `app.tenant_id` kosong dan bukan platform → **nol baris**, bukan "semua baris".
5. **Reversibel**: tiap migrasi punya `.down.sql`; MAT bisa dikembalikan ke perilaku pra-tenant.

---

# 1. Model Data — tabel `tenants` + kolom `tenant_id`

## 1.1 Tabel kontrol `tenants` (minimal untuk Fase 0)

```sql
CREATE TABLE tenants (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code           varchar(32)  NOT NULL UNIQUE CHECK (code ~ '^[a-z][a-z0-9_-]{1,31}$'),
  name           varchar(160) NOT NULL,
  status         varchar(16)  NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','suspended','offboarding')),
  isolation      varchar(8)   NOT NULL DEFAULT 'pooled'
                   CHECK (isolation IN ('pooled','siloed')),
  residency      varchar(8)   NOT NULL DEFAULT 'ID',
  primary_domain varchar(190) UNIQUE,
  created_at     timestamptz  NOT NULL DEFAULT now(),
  version        integer      NOT NULL DEFAULT 1   -- optimistic lock (pola existing)
);

-- Tenant #001 — MAT. Code stabil dipakai sebagai anchor backfill.
INSERT INTO tenants (code, name, primary_domain)
VALUES ('mat', 'Mandiri Abadi Teknik', NULL);
```

> Fase 0 hanya butuh tabel + baris MAT. Plan/entitlements/billing menyusul di Fase 2. `status`/`isolation` sudah disiapkan agar suspend & promosi siloed tidak perlu ALTER schema nanti.

## 1.2 Kolom `tenant_id` di setiap tabel bisnis

- Tipe `uuid NOT NULL`, FK → `tenants(id)`, ter-index (memimpin index komposit: `(tenant_id, created_at)` ramah partisi §10 platform).
- **Tabel global/platform** yang **TIDAK** ber-tenant (allowlist eksplisit, di-review): `schema_migrations`, `tenants`, `field_encryption_rotations`, tabel referensi yang benar-benar lintas-tenant (mis. kode negara/mata uang bila ada). Selain allowlist → **wajib** ber-tenant.
- **Audit partitions** (`audit_logs*`): tambahkan `tenant_id` juga (audit tetap append-only; grant hardening existing dipertahankan). Audit control-plane dipisah dari audit tenant di Fase 1.

---

# 2. Hierarki Scope (tenant di atas segalanya)

`backend/core/data-scope.js` menambah `TENANT` sebagai scope terluar:

```text
TENANT  ← BARU (terluar, fail-closed, tak pernah di-bypass peran tenant)
 └ LEGAL_ENTITY (012) → BUSINESS_UNIT → BRANCH (001) → PLANT → WAREHOUSE → DEPARTMENT → PROJECT → OWN_RECORD
```

`hasGlobalScope()` (data-scope.js:17) tetap ada, tetapi maknanya menjadi **"global di dalam tenant"**. Owner MAT = global untuk MAT, **bukan** untuk tenant lain.

---

# 3. Desain RLS (inti keamanan Fase 0)

## 3.1 Helper fail-closed (mirror `app_branch_visible`)

```sql
CREATE OR REPLACE FUNCTION app_tenant_visible(target uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT current_setting('app.is_platform', true) = 'on'         -- migrasi/control-plane/job lintas-tenant
      OR ( target IS NOT NULL
           AND NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL
           AND target = NULLIF(current_setting('app.tenant_id', true), '')::uuid );
$$;
```

Perbedaan **disengaja** dari branch: `target IS NULL` **tidak** membuat baris terlihat global (branch memaafkan NULL; tenant tidak). Baris tanpa tenant hanya terlihat oleh platform.

## 3.2 Policy **RESTRICTIVE** — kenapa wajib

PostgreSQL menggabungkan **policy permissive dengan OR**, **restrictive dengan AND**. Tabel ber-branch sudah punya policy **permissive** `branch_scope`. Bila tenant ditambah sebagai permissive juga → `branch OR tenant`. Untuk peran cross-branch, `app_branch_visible` = true → `true OR …` = **true untuk semua tenant** = **BOCOR**.

Maka tenant **harus RESTRICTIVE** (di-AND-kan):

```sql
-- Tabel yang SUDAH punya permissive branch_scope (mis. business_documents,
-- inventory_balances, stock_lots, notifications, …): cukup tambah restrictive.
CREATE POLICY tenant_isolation ON business_documents AS RESTRICTIVE
  USING (app_tenant_visible(tenant_id))
  WITH CHECK (app_tenant_visible(tenant_id));
```

Efektif: `branch_scope (permissive) AND tenant_isolation (restrictive)` = harus **satu tenant** *dan* dalam cakupan branch. Tepat.

## 3.3 Baseline permissive untuk tabel tenant-only

Tabel yang **belum** punya policy permissive apa pun butuh baseline (restrictive saja → nol baris):

```sql
ALTER TABLE <t> ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_rows ON <t> USING (true) WITH CHECK (true);          -- permissive baseline
CREATE POLICY tenant_isolation ON <t> AS RESTRICTIVE
  USING (app_tenant_visible(tenant_id)) WITH CHECK (app_tenant_visible(tenant_id));
```

Visibilitas sepenuhnya ditentukan restrictive tenant; permissive hanya "membuka pintu" agar restrictive berlaku.

## 3.4 FORCE RLS

Aktifkan `ALTER TABLE <t> FORCE ROW LEVEL SECURITY` pada tabel bisnis, agar **owner pun** tunduk RLS saat operasi non-migrasi (migrasi tetap set `app.is_platform='on'`). Ini menutup celah bila suatu job keliru jalan sebagai owner.

---

# 4. Konteks Sesi — perluas `setRlsContext` (satu choke-point)

`transaction.js:16` diperluas. Tambah `app.tenant_id` + `app.is_platform`, dan **guard fail-closed**:

```js
async function setRlsContext(client, user, options = {}) {
  const crossBranch = !user || CROSS_BRANCH_ROLES.includes(user.role) || user.branchScope === '*';
  const platform = options.platform === true;                 // migrasi / control-plane / job lintas-tenant
  const tenantId = user?.tenantId || options.tenantId || '';
  // Guard: transaksi non-platform WAJIB membawa tenant. Menutup lubang
  // "job tanpa user diam-diam melintasi semua tenant".
  if (!platform && !tenantId) {
    throw new Error('Tenant context wajib untuk transaksi non-platform.');
  }
  await client.query('SELECT set_config($1,$2,true)', ['app.tenant_id',  tenantId ? String(tenantId) : '']);
  await client.query('SELECT set_config($1,$2,true)', ['app.is_platform', platform ? 'on' : 'off']);
  // ── existing, tidak berubah ──
  await client.query('SELECT set_config($1,$2,true)', ['app.user_id',    user?.id ? String(user.id) : '']);
  await client.query('SELECT set_config($1,$2,true)', ['app.branch_id',  user?.branchId ? String(user.branchId) : '']);
  await client.query('SELECT set_config($1,$2,true)', ['app.cross_branch', crossBranch ? 'on' : 'off']);
  await client.query('SELECT set_config($1,$2,true)', ['app.is_system',  user ? 'off' : 'on']);
}
```

`withTransaction(work, options)` meneruskan `options.platform` & `options.tenantId`. **Catatan penting**: `app.is_system` (bypass branch) tetap ada & tidak berubah; bypass **tenant** kini lewat `app.is_platform` yang **terpisah**. Job internal biasa **bukan** platform — ia harus membawa tenant.

## 4.1 Audit call-site `withTransaction` tanpa user
Setiap pemanggilan `withTransaction(...)` **tanpa** `options.user` (boot, worker, job) harus diklasifikasi:
- **Platform sejati** (migrasi, maintenance lintas-tenant) → `{ platform: true }`.
- **Ter-scope tenant** (outbox tenant X, projector dokumen tenant X) → `{ tenantId: X }` (§7).

Guard di atas akan **melempar** untuk yang belum diklasifikasi — sengaja, agar tidak ada yang lolos diam-diam.

---

# 5. Lapisan Aplikasi

## 5.1 Principal membawa tenant
Object `user` (session→principal) menambah `tenantId`. Diisi saat autentikasi dan **diverifikasi** terhadap tenant yang di-resolve dari request (§5.2). User milik **tepat satu** tenant; token/sesi **tidak** valid lintas-tenant.

## 5.2 Tenant Resolver (edge → context)
- Resolusi dari **subdomain** (`mat.singularity.id`) atau **custom domain** (`erp.mandiriabaditeknik.co.id` → `tenants.primary_domain`).
- Hasil = `tenantId`, diinjeksi ke request context sebelum handler. **Mismatch** (user tenant ≠ resolved tenant) → tolak 403.
- Fase 0 boleh single-tenant (semua ke MAT), tetapi resolver dipasang sekarang agar Fase 1 tinggal menambah baris `tenants`.

## 5.3 data-scope.js
- Tambah `SCOPES.TENANT`.
- Semua helper query menyertakan `tenantId` (walau RLS sudah menjaga, filter aplikasi tetap defense-in-depth & performa).

---

# 6. Rencana Migrasi (tranche, auditable, verified-not-assumed)

Ikuti gaya existing (RLS di-roll per tranche). **Jangan** satu migrasi raksasa; pecah agar tiap tranche terbukti tidak mengganggu.

| Migrasi | Isi |
|---|---|
| **090 — tenants + helper + context** | Tabel `tenants`; baris MAT; `app_tenant_visible()`; (grant fungsi ke `mat_erp_app`) |
| **091 — tenant_id tranche A (core txn)** | `business_documents`, inventory/stock, journal, notifications: add col → backfill MAT → NOT NULL → FK → index → RLS restrictive |
| **092 — tenant_id tranche B (masters/org)** | business partners, products, org/workforce, pricing, dst. |
| **093 — tenant_id tranche C (sisa tabel bisnis)** | seluruh sisa di luar allowlist global |
| **094 — re-scope keunikan & numbering** | ubah unique constraint jadi menyertakan `tenant_id`; sequence/numbering per tenant |
| **095 — FORCE RLS + verifikasi** | `FORCE ROW LEVEL SECURITY`; jalankan gate §9 sebagai bagian migrasi |

## 6.1 Pola per-tabel (dapat di-generate DO-block)

```sql
DO $$
DECLARE t text;
  mat uuid := (SELECT id FROM tenants WHERE code = 'mat');
  targets text[] := ARRAY['business_documents','inventory_balances','stock_lots','notifications'/*…*/];
BEGIN
  FOREACH t IN ARRAY targets LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id uuid', t);
    EXECUTE format('UPDATE %I SET tenant_id=$1 WHERE tenant_id IS NULL', t) USING mat;
    EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL', t);
    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id)', t, t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I_tenant_idx ON %I (tenant_id)', t, t);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    -- baseline permissive hanya bila belum ada permissive lain:
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename=t AND permissive='PERMISSIVE') THEN
      EXECUTE format('CREATE POLICY tenant_rows ON %I USING (true) WITH CHECK (true)', t);
    END IF;
    EXECUTE format('CREATE POLICY tenant_isolation ON %I AS RESTRICTIVE USING (app_tenant_visible(tenant_id)) WITH CHECK (app_tenant_visible(tenant_id))', t);
  END LOOP;
END $$;
```

> Daftar `targets` per tranche **dikurasi & di-review** (bukan "semua tabel" buta) — daftar itu sendiri adalah artefak audit. Migrasi jalan sebagai owner (`app.is_platform` implisit lewat FORCE-exempt saat migrate; UPDATE backfill tetap jalan).

## 6.2 Keunikan & FK harus ter-tenant (095/094)
- Unique lama (mis. nomor dokumen unik per branch) → jadikan `UNIQUE (tenant_id, …)` agar tenant berbeda boleh memakai kode sama.
- Untuk relasi kritis, pertimbangkan **composite FK menyertakan `tenant_id`** (anak.tenant_id = induk.tenant_id) sebagai pertahanan tambahan.
- **Numbering engine**: seri nomor per-tenant (reset/namespace per tenant).

---

# 7. Worker & Job jadi Tenant-Aware

Worker existing (`backend/workers/postgres-worker.js`, `outbox-dispatcher.js`, `domain-work-projector.js`) kini set `app.is_system='on'` (tanpa user). Dalam multi-tenant itu **bukan** izin lintas-tenant.

- **Outbox/event & projector**: setiap event/work-item membawa `tenant_id`; worker memproses **per tenant** dengan `withTransaction(work, { tenantId })`.
- **Maintenance sejati lintas-tenant** (partition maintenance, retensi global): `{ platform: true }` — eksplisit, ter-audit.
- Kolom `tenant_id` ditambahkan ke `event_outbox`, work-item, notification delivery, job queue.

---

# 8. File & Storage per Tenant
`backend/infrastructure/files/private-storage.js` & artifact-storage: namespacing path per `tenant_id` (mis. `tenant/<id>/…`). Kunci enkripsi field per-tenant menyusul (Fase 3/KMS); Fase 0 minimal memisahkan namespace agar tidak ada tabrakan/kebocoran path.

---

# 9. Verifikasi & Test (gate, bukan asumsi)

## 9.1 Predeploy gate — "tidak ada tabel bisnis tanpa proteksi tenant"
Mirror pola verifikasi `scripts/grant-runtime.js` (yang sudah mendeteksi leak audit):

```sql
SELECT c.relname
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r'
  AND c.relname <> ALL ($1)          -- allowlist global/platform
  AND ( NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name=c.relname AND column_name='tenant_id')
     OR NOT c.relrowsecurity
     OR NOT EXISTS (SELECT 1 FROM pg_policies
                    WHERE schemaname='public' AND tablename=c.relname AND policyname='tenant_isolation') );
-- Baris apa pun → GAGALKAN predeploy (tabel bisnis belum ber-tenant).
```
Tambah script `npm run tenant:verify` + masukkan ke `predeploy-gate`.

## 9.2 Matriks uji lintas-tenant (CI gate)
Perluas `test/branch-isolation.test.js` & `test/authorization-matrix.test.js` dengan dimensi tenant:
- Seed **Tenant A (MAT)** & **Tenant B**.
- Untuk **setiap router** (322 handler): principal Tenant B **tidak boleh** membaca/menulis satu baris pun milik Tenant A → harapkan 0 baris / 403 / 404, **tak pernah** data A.
- Uji jalur bypass: peran owner/admin Tenant B **tetap** tidak lihat A (buktikan cross-branch ≠ cross-tenant).
- Uji fail-closed: transaksi tanpa tenant context → ditolak (guard §4) & nol baris (RLS).
- Uji is_platform: hanya konteks platform yang boleh lintas-tenant.

## 9.3 Regresi
Seluruh regression existing (mis. 418/418) harus **tetap hijau** dengan MAT sebagai satu-satunya tenant → membuktikan "identik seperti sebelumnya".

---

# 10. Backfill & Cutover MAT → Tenant #001

1. Deploy migrasi 090–095 di lingkungan disposable → jalankan seed, field-encryption, grants, opening inventory (alur existing) → 100% test + gate §9.
2. Semua data MAT ter-`tenant_id = mat` (backfill deterministik lewat `code='mat'`).
3. Resolver dipasang; MAT tetap default tenant.
4. **Reversibel**: `.down.sql` melepas policy/kolom; MAT kembali ke perilaku pra-tenant.

---

# 11. Rollback

- Tiap migrasi 090–095 punya `.down.sql` (lepas `tenant_isolation`/`tenant_rows`, `FORCE`/`ENABLE RLS` tenant, FK, index, kolom; drop helper; drop `tenants`).
- Urutan turun mengikuti rantai existing (verifikasi rollback full-chain seperti pola `db:rollback-verify`).
- `setRlsContext` menoleransi ketiadaan kolom saat rollback (guard hanya set_config; tanpa policy tenant, nilai diabaikan DB).

---

# 12. Definition of Done (gate Fase 0)

- [ ] `tenants` + MAT (#001) ada; resolver aktif.
- [ ] `tenant_id NOT NULL` + FK + index di **semua** tabel bisnis (allowlist global ter-review).
- [ ] `app_tenant_visible()` + policy `tenant_isolation` **RESTRICTIVE** di semua tabel bisnis; baseline permissive tersedia; **FORCE RLS** aktif.
- [ ] `setRlsContext` set `app.tenant_id` + `app.is_platform`; **guard fail-closed** aktif; semua call-site `withTransaction` tanpa user telah diklasifikasi.
- [ ] Worker/outbox/projector tenant-aware; storage namespaced per tenant.
- [ ] Keunikan & numbering ter-scope tenant.
- [ ] **Predeploy gate** `tenant:verify` hijau; **matriks lintas-tenant** hijau; regresi existing tetap hijau.
- [ ] Rollback full-chain terverifikasi.

---

# 13. Risiko & Subtlety (baca sebelum ngoding)

| Risiko | Mitigasi |
|---|---|
| **Permissive vs restrictive** (OR vs AND) → tenant bocor untuk peran cross-branch | Tenant **selalu RESTRICTIVE** (§3.2) |
| **Owner bypass RLS** (job keliru jalan as owner) | `FORCE ROW LEVEL SECURITY` (§3.4); migrasi eksplisit platform |
| **Job tanpa user diam-diam lintas-tenant** | Guard fail-closed di `setRlsContext` (§4); audit call-site (§4.1) |
| **Unique lama tabrakan lintas-tenant** | Re-scope `UNIQUE (tenant_id, …)` (§6.2) |
| **NULL tenant_id terlihat global** | Helper tenant tidak memaafkan NULL (§3.1); NOT NULL setelah backfill |
| **PgBouncer transaction pooling** (rencana scaling) | Aman: konteks pakai **SET LOCAL** (`set_config(...,true)`) — hilang tiap akhir transaksi |
| **cross_branch disangka cross_tenant** | Dua flag terpisah: `app.is_system` (branch) vs `app.is_platform` (tenant) |
| **Backfill di tabel besar** | Backfill dalam tranche; index dibuat setelah backfill; jendela maintenance |

---

*Requirement baseline. Bukan bukti implementasi. Status berubah hanya lewat audit source, migration, test (termasuk matriks lintas-tenant), release artifact, dan evidence manusia pada release SHA yang sama. — Singularity · Fase 0 Tenantize · 2026-08-09.*
