# MAT ERP V2 — Audit Menyeluruh & Blueprint Enterprise

**Tanggal audit:** 31 Juli 2026
**Rilis dasar:** v0.49.0 (terminal grain-flip) · commit UI `4e3a986`
**Auditor:** Claude (Opus 4.8) — orientasi via knowledge graph `graphify-out/`
**Tujuan:** Menilai kesesuaian sistem terhadap kelas SAP / Oracle E-Business / Microsoft Dynamics 365, lalu menetapkan standar baku agar setiap update berikutnya konsisten.

> Cara pakai dokumen ini: bagian **§2–§9** adalah temuan _as-built_ (dengan bukti file), **§10** benchmark paritas, **§11** daftar aksi berprioritas, **§12** standar rekayasa yang wajib diikuti update berikutnya, **§13** roadmap. Setiap PR baru harus lulus checklist di §12.

---

## 0. Ringkasan Eksekutif

MAT ERP V2 adalah **modular monolith kelas enterprise** yang, secara pola rekayasa, sudah setara mid-market SAP/Oracle/D365: satu security context (RBAC+ABAC+RLS), transaction yang menyatukan dokumen/numbering/audit/idempotency/outbox, optimistic locking, worker persisten `FOR UPDATE SKIP LOCKED`, dan chain migrasi 84 langkah reversibel. Zero runtime dependency (Node murni + PostgreSQL 16) — jejak serangan kecil, kontrol penuh.

**Verdict per dimensi (skala 5):**

| Dimensi | Skor | Ringkas |
|---|---:|---|
| Modul & Fitur | 4.5 | Cakupan O2C/P2P/WMS/MRP/Finance/HR/MDM/BI lengkap; sebagian fitur dalam mode RC/gated |
| Arsitektur | 4.5 | Pola enterprise sangat kuat; monolith by-design (belum horizontal scale) |
| Infrastruktur & Ops | 4.0 | Backup 3-2-1, predeploy gate, SBOM, DR RTO/RPO; masih single-node, belum HA |
| Keamanan | 4.5 | RLS+RBAC+ABAC+CSRF+rate-limit+MFA+SoD+field-encryption+CSP strict; gap: SSO/SAML, secrets vault |
| Efisiensi Database & Storage | 4.0 | 245 indeks, partisi audit; gap: audit bloat/unused index, tiering arsip, partisi tabel transaksi |
| Efisiensi Server & Backend | 4.0 | Pool + statement_timeout + worker + brotli/gzip; gap: HTTP caching API (ETag), read-replica, cache hasil |
| **Frontend Performance** | **3.0** | debounce+paginasi server+request-cancel+content-visibility bagus; **TAPI 18 modul ~560 KB dimuat di muka — belum code-split** ← gap utama |
| UI/UX | 4.5 | Baru di-redesign premium (liquid glass, clay 3D, framer-motion); gap: virtualisasi list JS, skeleton, audit a11y |

**Kesimpulan singkat untuk pertanyaan Anda:**
- **Sudah sesuai SAP/Oracle/D365?** Pola arsitektur & governance **YA (paritas mid-market ~85%)**. Yang belum: pemuatan modul frontend, sebagian integrasi enterprise (SSO, EDI/API gateway, read-replica scale-out), dan aktivasi produksi (masih engineering RC, gate manusia belum lulus).
- **Throttle/debounce/optimasi "enteng & smooth" sudah?** **Sebagian.** Debounce, paginasi server, pembatalan request, dan virtualisasi baris (CSS `content-visibility`) sudah ada. **Belum ada:** code-splitting per-rute, throttle scroll/resize, `IntersectionObserver` lazy-load, prefetch, dan `requestIdleCallback` batching. Ini prioritas **P0** performa (lihat §8 & §11).

---

## 1. Metodologi & Cakupan

- Orientasi struktur via knowledge graph (`graphify query`) — bukan tebak manual.
- Bukti dikutip sebagai `path:line`. Angka dihitung langsung dari repo (bukan klaim doc).
- Cakupan: seluruh `backend/`, `src/`, `data/migrations/`, `server.js`, `docs/`, `scripts/`.
- Tidak menjalankan test destruktif; baseline test = **418/418** (78 file test) per rilis dasar.

**Angka terverifikasi (31 Jul 2026):**

| Metrik | Nilai | Sumber |
|---|---:|---|
| Migrasi (up, reversibel) | 84 | `data/migrations/*.sql` |
| Indeks DB dideklarasikan | 245 | `CREATE [UNIQUE] INDEX` di migrasi |
| File test | 78 | `test/*.test.js` |
| Handler terdaftar di authz-matrix | 322 | doc v0.49 |
| Modul frontend | 18 skrip | `index.html:122-140` |
| Total JS frontend (uncompressed) | ~560 KB | `find src -name '*.js'` |
| Runtime npm dependency | 0 | `package.json` |
| Pool DB | max 15, timeout 20 s | `backend/infrastructure/database/pool.js:17-20` |

---

## 2. Modul & Fitur (as-built)

13 modul domain frontend (`src/modules/`) + repository backend per domain (`backend/infrastructure/database/repositories/`). Cakupan pilar ERP:

| Pilar | Modul MAT | Padanan SAP / Oracle / D365 | Status |
|---|---|---|---|
| **Order-to-Cash** | sales.js (inquiry, quotation, customer PO, sales order, commercial control, projects, RMA) | SD / Order Mgmt / D365 Sales | ✅ + pricing engine server-authoritative, ATP/CTP, credit exposure, contracts, RMA |
| **Procure-to-Pay** | procurement.js (sourcing, contracts, credit control) | MM / Procurement / D365 SCM | ✅ SoD guard, supplier performance |
| **Inventory & WMS** | inventory.js (lots, opname, reservations, canonical ledger, WMS task engine, delivery) | WM/EWM / Inventory / D365 WMS | ✅ canonical warehouse ledger (grain-flip v0.49) |
| **Production & MRP** | production.js (work orders, capacity, quality/CAPA, site-aware MRP) | PP / Manufacturing / D365 SCM | ✅ operations control tower |
| **Finance & GL** | finance.js (AP, AR, GL, fixed assets, budget, tax, closing, financial reporting, posting profiles) | FI-CO / Financials / D365 Finance | ✅ posting profiles, period close, tax control |
| **HR & Payroll** | hr.js + organization.js (employees, jobs/positions, attendance, leave/roster, payroll rules, ESS, DoA) | HCM / HR / D365 HR | ✅ versioned hierarchy |
| **Master Data Mgmt** | master-data.js (business partner/party, customer, supplier, product, FX, data quality, golden record, import staging) | MDG / TCA / D365 MDM | ✅ change request engine, dedupe |
| **BI / Executive** | executive-reporting.js (cockpit, operating pulse, semantic layer) | SAC / OBIEE / Power BI embed | ✅ semantic layer aktif |
| **Governance / IT** | governance.js (IAM, RBAC, SoD conflict center, approval policy, access review, data retention, audit log, monitoring, self-test, template dokumen) | GRC / Access Governance | ✅ sangat lengkap |
| **Work & Collab** | my-work.js, workspace.js, documents.js (unified work item/task engine, approvals, notifications, documents & licenses) | Fiori Inbox / Workflow | ✅ |

**Temuan:** Cakupan **luas dan koheren** — tidak ada pilar ERP inti yang hilang. Kedalaman fitur bahkan melebihi banyak produk mid-market (server-authoritative pricing, SoD conflict center, canonical ledger, outbox/idempotency).
**Gap paritas enterprise-atas:** belum ada (a) **integrasi eksternal terstandar** (EDI, konektor bank/pajak, API gateway ber-versi + rate-plan), (b) **process orchestration/BPM** visual, (c) **multi-currency consolidation** lintas entitas legal penuh, (d) **variant configuration** (produk kompleks). Ini fitur SAP/Oracle tier-1, bukan blocker mid-market.

---

## 3. Arsitektur

**Pola:** modular monolith berlapis (dari `docs/architecture/overview.md` + graph):

```
Browser SPA ──HTTP+SSE──► server.js
   └► routes/*  (auth, sales, procurement, inventory, finance, hr, masters, operations, documents)
        └► core/*  (permissions RBAC+ABAC, data-scope, request-context, errors, ratelimit, business-date)
             └► infrastructure/database/repositories/*  (per-domain)
                  └► transaction.js (dokumen+numbering+audit+idempotency+outbox, optimistic lock)
                       └► PostgreSQL 16 + RLS
   worker: backend/workers/postgres-worker.js (persistent queue, FOR UPDATE SKIP LOCKED, lease/heartbeat/retry)
```

**Kekuatan (setara/atas paritas):**
- **Satu transaction consistency boundary** menyatukan dokumen, penomoran, audit, idempotency, dan outbox — mencegah state parsial.
- **Optimistic locking** anti silent-overwrite (memori proyek: "tanpa timpa-menimpa data").
- **Outbox + domain events** → integrasi async yang andal (`core/events.js`, FK `source_event_id`).
- **Worker persisten** dengan lease/heartbeat/retry/expired-lease recovery — kelas produksi.
- **Memory adapter hanya untuk test**, bukan fallback runtime → tidak ada drift perilaku.

**Gap arsitektur:**
- **Monolith single-process** — belum ada pemisahan read/write (CQRS ringan), belum stateless-multi-instance untuk horizontal scale. SSE & worker in-process mengikat ke satu node.
- **Belum ada API gateway / kontrak versi** (`/v1`, deprecation policy) untuk konsumen eksternal.
- Modul frontend **belum lazy per-rute** (lihat §8) — bukan arsitektur backend, tapi arsitektur delivery.

---

## 4. Infrastruktur & Operasi

**As-built (dari `package.json` scripts + docs):**
- **Backup 3-2-1**: `backup:run / restore-test / decrypt / encrypt-local` (`scripts/backup-postgres.js`).
- **Migrasi**: chain 84, up+down, checksum-verified; `db:migrate/validate/status/rollback-verify`.
- **Release**: `release:build → verify-artifact → sbom` (SBOM ada — supply-chain hygiene).
- **Predeploy gate** (`scripts/predeploy-gate.js`), **secret scan**, **rotasi** (owner/runtime/field-encryption).
- **Kualitas**: `test:visual` (CDP smoke), `test:a11y`, `load:smoke/lan`, `uat:*` (evidence/technical).
- **Asset build**: brotli/gzip precompress (`assets:build`).

**Gap:**
- **Single-node**: belum ada HA (failover Postgres, health-based restart, blue/green). DR RTO/RPO didokumentasikan tapi gate manusia belum lulus.
- **Observability**: ada `Monitoring` workspace (latensi p95, pool, SSE, rate limiter), tapi **belum metrics/tracing terstandar** (OpenTelemetry, histogram latensi per-endpoint, log terstruktur ter-ship ke sink).
- **Repo hygiene**: `graphify-out/cache/ast/**` (ribuan file) muncul untied di working tree — sebaiknya masuk `.gitignore` agar repo & diff tidak membengkak.

---

## 5. Keamanan

**As-built — sangat kuat:**
- **AuthN**: session + **MFA/TOTP** (`repositories/auth.js`, `totp.js`), lockout 5x/15 menit (terlihat di login), password hashing (`core/password.js`).
- **AuthZ**: **RBAC + ABAC** (`core/permissions.js`, `assertPermission()`) + **RLS PostgreSQL** dengan session context (`set_config app.branch/is_system`, memori: koneksi tanpa konteks tak melihat satu baris pun) + **branch isolation** multi-cabang.
- **Kontrak authz-matrix**: menambah handler HTTP **wajib** update 4 titik atau `authorization-matrix.test.js` gagal — mencegah endpoint tak-terlindungi (322 handler tercakup).
- **SoD** (segregation of duties) conflict center + **approval matrix** berjenjang.
- **Data protection**: **field-level encryption** + rotasi (`security:rotate-fields`), **audit trail permanen** (partisi lifecycle, mig 011).
- **Transport/Web**: **CSP ketat** `default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'` (tanpa inline, tanpa eksternal), **HSTS**, CSRF, **rate limit** (`core/ratelimit.js`), IP-trust hardening (r012).

**Gap:**
- **SSO enterprise** (SAML/OIDC), directory sync (SCIM) — wajib untuk korporasi besar; kini auth internal saja.
- **Secrets management**: kunci via env; belum vault (KMS/HashiCorp) dengan rotasi terkelola.
- **Gate manusia belum lulus**: UAT 13 role, security retest manual, pen-test, Owner sign-off — status masih **engineering RC**, bukan izin produksi.

---

## 6. Efisiensi Database & Storage

**As-built:**
- **245 indeks** — kepadatan tinggi, mendukung query bertarget (hindari seq-scan).
- **Partisi audit + lifecycle** (mig 011) — audit besar tidak menggembungkan tabel panas.
- **Data retention** module + `data:purge` — kebijakan hapus terkendali.
- **Canonical warehouse ledger** (grain-flip v0.49) — satu-saldo-per-(produk,gudang), mengurangi duplikasi baris saldo.
- **statement_timeout 20 s** — query liar tidak mengunci storage/IO tak terbatas.

**Gap & rekomendasi efisiensi:**
1. **Audit indeks tak-terpakai / duplikat**: dengan 245 indeks, jalankan `pg_stat_user_indexes` (idx_scan=0) → drop yang mati (indeks juga makan storage + memperlambat write). *Tambahkan skrip `db:index-health`.*
2. **Partisi tabel transaksi besar** (jurnal GL, inventory ledger, outbox, sessions) by range (bulan) seperti audit — bukan cuma audit. Mempercepat purge & vacuum.
3. **BRIN index** untuk kolom append-only monoton (created_at, posting_date) → jauh lebih kecil dari B-tree.
4. **Autovacuum tuning** per tabel panas (outbox, jobs, sessions) — cegah bloat.
5. **Arsip tiering**: pindah partisi lama ke tablespace "cold" / kompresi; ledger tutup-buku ke tabel arsip read-only.
6. **`TOAST`/tipe**: pastikan JSONB payload besar (event/outbox) di-compress; pertimbangkan `pg_repack` terjadwal.

---

## 7. Efisiensi Server & Backend Performance

**As-built (bagus):**
- **Connection pool** (`pool.js`): max 15 (env-tunable 2–50), idle 30 s, connect 5 s, **statement_timeout 20 s** + `SET LOCAL` per-transaksi.
- **Kompresi**: brotli (`.br`) → gzip (`.gz`) precompressed → on-the-fly gzip untuk teks >1 KB.
- **Cache statis**: `assets/build/**` → `public, max-age=31536000, immutable` (fingerprinted).
- **Worker** memindahkan kerja berat (CSV import, job) keluar dari request path.
- **SSE** untuk realtime (hemat polling).

**Gap & rekomendasi:**
1. **HTTP caching untuk API data**: belum ada **ETag / Last-Modified / 304** pada GET list & master data. Tambah ETag (hash halaman + versi data) → hemat bandwidth & render. *Prioritas tinggi, murah.*
2. **Cache hasil query panas** (in-process LRU / Postgres materialized view untuk cockpit/semantic layer) dengan invalidasi via outbox.
3. **Read replica** untuk beban baca berat (reporting) — pisahkan dari write path.
4. **N+1 audit** di repository (loop query per baris) — verifikasi pakai `EXPLAIN` di jalur list terpanas; batch dengan `= ANY($1)`.
5. **Keep-alive & HTTP/2** (via reverse proxy) untuk multipleks SSE + statis.
6. **Backpressure** pada SSE (batas koneksi/klien, heartbeat) — cegah kebocoran memori pada banyak tab.

---

## 8. Frontend Performance — "enteng & smooth" (GAP UTAMA)

**As-built (sudah ada):**
- **debounce** util (`core.js:37`) dipakai: pencarian tabel **400 ms** (`enterprise-table.js:127`), autosave wizard **1000 ms** (`sales.js:129`), refresh SSE ter-debounce (`core.js:115`).
- **Paginasi server + pembatalan request** untuk semua daftar (`pages.js:3`).
- **Virtualisasi baris via CSS**: `content-visibility:auto; contain-intrinsic-size` (`styles.css:273`) — render off-screen ditunda.
- **defer** pada semua skrip (tidak blok parse HTML).

**Gap kritis (inilah sebab belum "seringan" D365):**

1. **TIDAK ADA CODE-SPLITTING** ⚠️ **P0.** `index.html:122-140` memuat **ke-18 modul (~560 KB)** di setiap cold load, walau user hanya buka Dashboard. Biaya parse/compile besar di perangkat lemah.
   → **Solusi**: lazy-load modul **per-rute**. Router memuat `modules/finance.js` hanya saat masuk `#/finance/*` (injeksi `<script>` dinamis atau `import()` bila pindah ke ES modules). Target initial bundle: core+components+workspace+app (~65 KB), sisanya on-demand. Ini **penurunan ~85% initial JS**.
2. **Tidak ada throttle** untuk scroll/resize/mousemove — bila ada handler global, bungkus dengan `throttle` (rAF-based). Saat ini `debounce` ada, `throttle` belum → tambah ke `core.js`.
3. **Tidak ada `IntersectionObserver`** untuk lazy-load gambar/section berat & infinite-scroll → tambahkan untuk daftar panjang & panel di bawah fold.
4. **Tidak ada `requestIdleCallback`** untuk kerja non-kritis (prefetch modul rute berikut, warm cache) saat idle.
5. **Tidak ada prefetch/preconnect** — prefetch modul rute yang kemungkinan diklik (mis. dari Dashboard → My Work).
6. **Virtualisasi JS untuk list sangat panjang**: `content-visibility` membantu paint, tapi ribuan node DOM tetap dibuat. Untuk list >200 baris, pakai windowing (render hanya baris terlihat).
7. **rAF batching untuk animasi**: animasi baru (framer-motion-like) sudah CSS (bagus, di GPU), tetapi pastikan tak ada layout-thrash dari update JS beruntun.

**Verdict:** fondasi bagus, tapi **belum sesuai** target "enteng & smooth" sampai code-splitting (P0) + throttle/IO/prefetch (P1) diterapkan.

---

## 9. UI/UX

**As-built (baru di-redesign — Design System 3.0 + Layer 1–4, commit `4e3a986`):**
- Tema **full-white premium luxury**, **liquid glass** (backdrop-filter), **clay 3D** (shadow-clay), **framer-motion-like** entrance (spring easing) + reduced-motion guard.
- Ikon nav **clay-3D via CSS** pada glyph SVG (bukan raster) — konsisten dengan tema.
- Topbar kaca (command/branch pill), **enterprise table** (header kaca sticky, hover baris), status **chip → pil kaca + dot menyala** (global), **aksen emas** page-head, scrollbar premium.
- Token terpusat (`src/design-system/tokens.css`) — satu sumber warna/spasi/elevasi; CSP-safe (tanpa inline style).

**Gap:**
- **Skeleton/loading state** terstandar saat fetch (kini kosong→isi).
- **Virtualisasi list JS** (lihat §8.6) untuk grid besar.
- **Command palette** (Ctrl-K sudah ada shell) perlu pencarian aksi/rute penuh + fuzzy.
- **Audit a11y** menyeluruh (`test:a11y` ada — jadikan gate CI): fokus ring (sudah), kontras token emas di atas kaca, ARIA untuk drawer/dialog/toast.
- **Density toggle** (compact/comfortable) — ekspektasi power-user ERP (SAP GUI/Fiori punya).
- **Konsistensi entrance saat re-render**: pastikan animasi tidak memicu ulang pada refresh SSE (sudah dimitigasi `backwards` fill; verifikasi lintas modul).

---

## 10. Benchmark vs SAP / Oracle / Dynamics 365

| Kapabilitas | MAT ERP V2 | Mid-market SAP/Oracle/D365 | Paritas |
|---|---|---|---|
| Modular domain lengkap (O2C/P2P/WMS/MRP/Fin/HR/MDM) | ✅ | ✅ | **Setara** |
| Security context tunggal (RBAC+ABAC+RLS+SoD) | ✅ | ✅ | **Setara/atas** |
| Document graph + numbering + audit + idempotency + outbox | ✅ | ✅ | **Setara** |
| Optimistic locking / anti-overwrite | ✅ | ✅ | **Setara** |
| Approval matrix berjenjang + DoA | ✅ | ✅ | **Setara** |
| Server-authoritative pricing / ATP-CTP / credit exposure | ✅ | ✅ | **Setara** |
| Audit partitioning + retention | ✅ | ✅ | **Setara** |
| **SSO/SAML/OIDC + SCIM** | ❌ | ✅ | **Gap** |
| **EDI / bank / tax connector + API gateway ber-versi** | ❌ | ✅ | **Gap** |
| **Horizontal scale / HA / read-replica** | ❌ | ✅ | **Gap** |
| **BPM/workflow designer visual** | ⚠️ (approval saja) | ✅ | **Gap sebagian** |
| **Frontend lazy/code-split (enteng)** | ❌ | ✅ | **Gap (P0)** |
| Multi-entity legal consolidation + multi-currency penuh | ⚠️ | ✅ | **Gap sebagian** |
| Observability (metrics/tracing terstandar) | ⚠️ | ✅ | **Gap sebagian** |

**Skor paritas keseluruhan ≈ 85% mid-market.** Kesenjangan bukan pada _core ERP_ (sudah setara), melainkan pada **integrasi enterprise (SSO/EDI/API), skalabilitas (HA/replica), dan delivery frontend (code-split)**.

---

## 11. Temuan Prioritas & Rekomendasi

### P0 — kerjakan lebih dulu (dampak besar, risiko rendah)
1. **Code-splitting modul frontend per-rute** (§8.1) — turunkan initial JS ~85%. Terbesar untuk "enteng & smooth".
2. **Tambah `throttle` + `IntersectionObserver` + `requestIdleCallback`** ke `core.js` dan pakai di scroll/resize, lazy-section, prefetch.
3. **ETag/304 untuk GET list & master** (§7.1) — hemat bandwidth/render, murah.
4. **`.gitignore` `graphify-out/cache/`** (§4) — hygiene repo.

### P1 — berikutnya
5. **Windowing/virtual list JS** untuk grid >200 baris (§8.6) + **skeleton loaders** (§9).
6. **Index health + partisi tabel transaksi + BRIN + autovacuum tuning** (§6).
7. **Cache hasil query panas** (cockpit/semantic) dengan invalidasi outbox (§7.2).
8. **Observability**: OpenTelemetry (trace request→query), histogram latensi p95/p99 per-endpoint, log terstruktur.
9. **Audit a11y** jadikan gate CI (`test:a11y`).

### P2 — strategis (paritas enterprise-atas)
10. **SSO SAML/OIDC + SCIM**, **secrets vault**.
11. **Read replica + stateless multi-instance** (pindah SSE/worker ke layanan terkoordinasi).
12. **API gateway ber-versi** + konektor EDI/bank/pajak.
13. **BPM/workflow designer**, multi-entity consolidation, variant configuration.

### Gate manusia (tetap fail-closed, di luar rekayasa)
UAT 13 role · security retest/pen-test · persetujuan rekonsiliasi · training · DR RTO/RPO drill · offsite proof · Owner sign-off. **Status tetap engineering RC — bukan izin produksi.**

---

## 12. Standar Rekayasa untuk Update Berikutnya (WAJIB)

Setiap PR/update baru **harus** mematuhi berikut agar konsisten:

**Arsitektur & data**
- Semua tulis lewat **transaction.js** (dokumen+numbering+audit+idempotency+outbox) — jangan tulis langsung.
- Semua tabel bisnis **RLS-enabled**; akses selalu lewat session context (`set_config`). Uji dengan `branch-isolation.test.js`.
- Perubahan skema = **migrasi baru ber-nomor + `.down` + checksum**; jangan edit migrasi lama. Jalankan `db:rollback-verify`.
- Tabel yang tumbuh cepat lahir **sudah terpartisi** + indeks minimal yang perlu (hindari over-index).

**Keamanan**
- Handler HTTP baru **wajib** update 4 titik authz-matrix (atau test gagal). Tetapkan permission RBAC+ABAC eksplisit.
- Tidak ada rahasia di kode; input tervalidasi; tidak melemahkan CSP.

**Frontend**
- Modul baru **lazy per-rute** (jangan tambah `<script>` global di `index.html`). Initial bundle tetap ramping.
- List = **paginasi server + debounce 400 ms + pembatalan request + virtualisasi** (windowing bila >200 baris).
- Styling **hanya via stylesheet/token** (CSP `style-src 'self'`, tanpa inline). Pakai `src/design-system/tokens.css`.
- Animasi **CSS/GPU**, resting-state selalu terlihat (`backwards` fill), hormati `prefers-reduced-motion`.
- Kerja non-kritis di `requestIdleCallback`; scroll/resize di `throttle` (rAF).

**Kualitas (gate CI)**
- `npm test` hijau (kini 418+); tambah test untuk perilaku baru.
- Regenerasi knowledge graph: `graphify update .` setelah ubah kode.
- Lolos `test:a11y`, `test:visual` (baseline UI baru perlu di-recapture), `security:scan`, `predeploy`.

---

## 13. Roadmap Bertahap

| Fase | Fokus | Item |
|---|---|---|
| **Wave A (perf frontend)** | Enteng & smooth | Code-split per-rute, throttle/IO/rIC, prefetch, skeleton, windowing |
| **Wave B (efisiensi backend/DB)** | Hemat & cepat | ETag/304, index health, partisi transaksi + BRIN, cache query panas, autovacuum |
| **Wave C (observability)** | Terlihat | OTel trace, metrik p95/p99, log terstruktur, dashboard SLO |
| **Wave D (skala & HA)** | Tahan beban | Read replica, stateless multi-instance, SSE/worker terkoordinasi, failover |
| **Wave E (integrasi enterprise)** | Konektivitas | SSO SAML/OIDC + SCIM, secrets vault, API gateway ber-versi, EDI/bank/pajak |
| **Wave F (fitur tier-1)** | Paritas atas | BPM designer, multi-entity consolidation, variant configuration |
| **Gate produksi** | Manusia | UAT/pen-test/DR/Owner sign-off |

---

### Lampiran — peta file kunci

- Entrypoint & statis/caching: `server.js` (CSP `:48`, cache `:77`, brotli/gzip `:84-98`)
- Pool DB: `backend/infrastructure/database/pool.js:17-20`
- Transaction/RLS: `backend/infrastructure/database/transaction.js`
- Permissions: `backend/core/permissions.js` (`assertPermission()` L142)
- Worker: `backend/workers/postgres-worker.js`
- Router/utility frontend: `src/core.js` (`debounce` L37, SSE refresh L115)
- Tabel enterprise: `src/components/enterprise-table.js` (debounce+paginasi L127)
- Pemuatan modul (target code-split): `index.html:122-140`
- Design tokens: `src/design-system/tokens.css` · komponen: `src/styles.css`
- Migrasi: `data/migrations/` (84, reversibel) · partisi audit: `011_audit_partition_lifecycle.sql`
