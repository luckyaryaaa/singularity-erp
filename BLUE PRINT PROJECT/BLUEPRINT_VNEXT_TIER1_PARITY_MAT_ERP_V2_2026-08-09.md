<!--
  Status governance: dokumen ini adalah REQUIREMENT BASELINE (delta vNext),
  bukan bukti implementasi. Status hanya berubah lewat audit source, migration,
  test, release artifact, dan evidence manusia pada release SHA yang sama.
  Kanonis induk: FINAL_BLUEPRINT_UPDATE_UPGRADE_MAT_ERP_V2_ENTERPRISE_2026-07-21.md
-->

# BLUEPRINT vNEXT — TIER-1 ENTERPRISE PARITY

## MAT ERP V2 · Jalur menuju pola SAP S/4HANA · Oracle Fusion · Dynamics 365

- **Tanggal**: 2026-08-09
- **Baseline engineering**: v0.49.0 · migration 001–084 · 322 authorization handler
- **Induk kanonis**: `FINAL_BLUEPRINT_UPDATE_UPGRADE_MAT_ERP_V2_ENTERPRISE_2026-07-21.md`
- **Sifat dokumen**: **DELTA / additive**. Tidak mengganti blueprint induk. Menambah gelombang upgrade berikutnya di atas fondasi yang sudah landing.

> **Reframe platform (2026-08-09)**: sistem ini menjadi produk SaaS **Singularity** (oleh PT Singularity Teknofastindo) yang **disewakan ke banyak perusahaan**, dengan **MAT sebagai Tenant #001**. Seluruh fitur/modul di dokumen ini berjalan **per-tenant** di atas arsitektur multi-tenant. Lihat companion: `BLUEPRINT_SINGULARITY_PLATFORM_MULTITENANT_2026-08-09.md`. Tema white-label per-tenant = DS 4.0 §4.6.

---

# 0. Cara membaca dokumen ini

Blueprint induk (2026-07-21) menargetkan **platform ter-governance** (satu Party, satu security context, satu posting engine, satu audit layer). Sebagian besar P0/P1-nya sudah landing sampai v0.49.

Dokumen ini menargetkan lompatan berikut: dari *governed platform* → **intelligent tier-1 platform**. Enam pilar sesuai permintaan:

| Pilar | Fokus | Seksi |
|---|---|---|
| A · **Fitur** | Kapabilitas lintas-modul (AI, workflow designer, BI, kolaborasi) | §2 |
| B · **Modul** | Ekspansi fungsional ke cakupan tier-1 (CRM, S&OP, HCM, lokalisasi pajak) | §3 |
| C · **Visual & UI/UX** | DS 4.0 — Claymorphism Professional · White Premium Luxury | §4 |
| D · **Database & Server** | Skala ratusan–ribuan user, tetap efisien & tidak cepat penuh | §5 |
| E · **Teknologi & Performa** | Ringan, enteng, smooth (throttle, debounce, virtualisasi, observability) | §6 |
| F · **Security** | Benteng: passkeys, ABAC, PAM, DLP, UU PDP, immutable audit | §7 |

Setiap item diberi prioritas **P0** (fondasi wajib), **P1** (parity inti), **P2** (diferensiasi/lanjutan) dan penanda dependency. Filosofi induk dipertahankan: **modular monolith dulu, VPS terakhir, dependensi ramping, server-authoritative**.

---

# 1. Executive Summary

MAT ERP V2 sudah melewati fase "kumpulan modul rapi". Yang membedakan platform tier-1 (SAP/Oracle/D365) dari ERP menengah bukan jumlah tabel — melainkan **lima lapis di atas transaksi**:

1. **Intelligence layer** — copilot, anomaly detection, forecasting, document intake otomatis (Joule / Copilot / Oracle AI).
2. **Front-office lengkap** — CRM & pipeline, service, portal pelanggan/supplier/karyawan.
3. **Planning layer** — S&OP / demand & supply planning / APS di atas MRP.
4. **Localization & compliance** — pajak Indonesia (Coretax/e-Faktur/e-Bupot), BPJS, UU PDP, PSAK/IFRS.
5. **Operational excellence** — observability, elastisitas database, keamanan zero-trust, DR teruji.

Fondasi MAT sudah kuat untuk semuanya. Tugas vNext adalah **menambah kelima lapis itu tanpa merusak kesederhanaan** yang membuat sistem ini ringan dan aman.

## 1.1 Scorecard — target vNext

| Kategori | Induk (target 07-21) | Realistis @ v0.49 | Target vNext (v1.0) |
|---|---:|---:|---:|
| Workspace & Experience | 95–97 | ~88 | 97 + AI/kolaborasi |
| Master Data & MDG | 95–97 | ~90 | 97 + data-quality score |
| Organization & IAM | 95–97 | ~92 | 98 + SSO/SCIM/ABAC |
| Sales & **CRM** | 95–97 | ~85 (back-office) | 96 + front-office pipeline |
| Operations & **Planning** | 95–97 | ~86 | 96 + S&OP/APS/MES |
| Finance & **Controlling** | 95–97 | ~88 | 97 + multi-currency/konsolidasi/revrec |
| **HCM & Payroll** | (parsial) | ~55 | 92 (payroll ID penuh) |
| **Tax & Localization ID** | (parsial) | ~40 | 95 (Coretax/e-Faktur/BPJS) |
| System · Security · Platform | 95–97 | ~90 | 98 + passkeys/PAM/SIEM |
| **Intelligence / AI** | (belum) | ~5 | 80 (copilot + anomaly + intake) |
| **Overall** | 95–97 | **~84** | **95+ tier-1 parity** |

## 1.2 Arti "tier-1 parity" untuk MAT

> Mengadopsi **pola kontrol & pengalaman** tier-1 yang relevan untuk operasi manufaktur/trading MAT — **bukan** menyalin seluruh permukaan produk SAP/Oracle. Kompleksitas yang tidak memberi nilai bagi MAT sengaja **tidak** diambil.

---

# 2. PILAR A — FITUR (Kapabilitas Lintas-Modul)

Fitur di sini dipakai **semua modul** lewat shared engine (konsisten dengan §2.2 induk: tidak ada modul bikin versi sendiri).

## 2.1 MAT Copilot — Intelligence Layer `P1`

Pembeda utama ERP 2026. Setara **SAP Joule / D365 Copilot / Oracle AI**.

| Kapabilitas | Deskripsi | Grounding |
|---|---|---|
| **Natural-language query** | "Tampilkan PO overdue supplier X bulan ini" → query ter-scope + tabel | Wajib lewat security context §2.3 induk; hasil sama seperti user buka sendiri |
| **In-app assistant** | Jelaskan field, ringkas dokumen 360, sarankan next-best-action | Read-only default; aksi sensitif tetap maker-checker + step-up MFA |
| **Document intake (OCR→draft)** | Foto/scan invoice supplier → draft AP invoice + three-way match | Manusia approve; posting tetap server-authoritative |
| **Anomaly & fraud detection** | Deteksi jurnal ganjil, harga di luar band, duplikat vendor/bank | Feed ke Work Item Engine sebagai exception |
| **Forecasting** | Demand, cashflow, aging AR — feed ke S&OP & Finance | Model statistik dulu, ML belakangan |
| **Narrative reporting** | Auto-draft komentar variance & MD&A close bulanan | Draft, bukan angka; angka tetap dari posting engine |

**Guardrail arsitektural**: Copilot **tidak pernah** jadi jalur otoritatif. Ia *proposer*, bukan *poster*. Semua tulisan tetap lewat API ber-authorization + audit. Model dapat berjalan sebagai worker terpisah / eksternal dengan payload-minimal (audit tanpa data sensitif, sesuai pola outbox §4.5 induk).

## 2.2 Visual Workflow & Business Rules Engine `P1`

Blueprint induk sudah punya Approval/Workflow Engine (code-driven). vNext = **designer visual** (setara SAP Flexible Workflow / Power Automate).

- Graphical flow builder: trigger → kondisi → langkah approval → eskalasi → SLA timer.
- **Business Rules Engine** deklaratif: pricing band, credit rule, SoD rule, dunning ladder — data-driven, versioned, effective-dated (reuse pola §13.2 induk).
- Simulasi "what-if" sebelum aktivasi; audit tiap perubahan rule.

## 2.3 Embedded BI & Semantic Analytics `P1`

Naikkan "Semantic KPI Engine" induk → **embedded analytics** ala SAP Analytics Cloud / Oracle OTBI.

- **Semantic model** terpusat (metric, dimension, hierarki) — satu definisi "revenue", "margin", "aging".
- Self-service report builder ber-scope (tidak bisa lihat data di luar security context).
- Dashboard drag-drop + drill-to-transaction.
- Read dari **materialized view / read model** (§13.4 induk), bukan tabel transaksi — lihat §5.4.
- Export ber-permission + watermark + audit (anti-DLP).

## 2.4 Global Search & Command Palette `P1`

- **Cmd/Ctrl-K** command palette: navigasi, aksi, entity lookup, saved views — satu kotak.
- Global search ter-scope lintas Party/Document/Product/Order dengan ranking relevansi.
- Server-side, ter-index, debounce 200–250ms, hasil ter-authorize (tidak bocorkan judul dokumen di luar scope).

## 2.5 Notification & Collaboration Hub `P2`

- Notification center terpadu (in-app + email + mobile push) dengan preferensi per-kategori (sudah ada Notification Preferences — perluas).
- **@mention & komentar** kontekstual pada dokumen 360 (audit-trailed, ter-scope).
- Activity feed & watch/subscribe pada objek.

## 2.6 E-Signature & Document Intake `P2`

- Tanda tangan elektronik + **e-Meterai** (regulasi ID) pada kontrak/PO/approval bernilai tinggi.
- Retensi & arsip sesuai kebijakan (link ke DMS §3.13 & retensi §5.6).

## 2.7 Personalization & Saved Views `P1`

- Saved views per-user/role (filter, kolom, sort) — sudah disebut di template List induk, jadikan first-class + shareable + default-per-role.
- Personal home layout, favorit, recent, pinned.

---

# 3. PILAR B — MODUL (Ekspansi ke Cakupan Tier-1)

Format: **modul → padanan tier-1 → cakupan MAT → prioritas**. Semua tetap di modular monolith, pakai shared engine.

## 3.1 CRM & Front-Office Sales `P1`
Padanan: *SAP Sales Cloud · D365 Sales · Oracle CX*. MAT punya Sales back-office (quotation→order→invoice) tapi belum front-office.
- Lead → Opportunity → Pipeline (stage, probabilitas, forecast).
- Activity management (call, meeting, task) + timeline pada Party 360.
- Campaign & sumber lead; konversi opportunity → quotation (reuse pricing engine §8.2 induk).
- Sales forecast feed ke S&OP (§3.3).

## 3.2 Customer Service & Case Management `P2`
Padanan: *D365 Customer Service*. Ticket/case, SLA, knowledge base, link ke RMA/warranty (§8.8 induk) & Maintenance.

## 3.3 Sales & Operations Planning (S&OP) + APS `P1`
Padanan: *SAP IBP · Oracle Demand/Supply Planning*. Di atas "Site-Aware MRP" (§9.2 induk).
- **Demand planning**: baseline statistik + input CRM forecast + manual override.
- **Supply planning / MPS**: rencana induk produksi, rough-cut capacity.
- **S&OP cycle**: rekonsiliasi demand-supply-finansial bulanan, skenario.
- **APS** (finite capacity scheduling) untuk shop floor — opsional P2.

## 3.4 Manufacturing Execution (MES) `P2`
Padanan: *SAP DM · D365 Manufacturing*. Perluas Production/Shop Floor (§9.6 induk).
- Shop floor terminal, OEE, downtime/Andon, scrap & yield.
- Subcontracting, co-product/by-product, batch/process order.
- Genealogi lot penuh (link ke canonical warehouse LOT/HU yang sudah ada).

## 3.5 Warehouse Management — Advanced `P1`
Fondasi WMS MAT sudah kuat (canonical warehouse, LOT/BIN/HU, FEFO, RLS, scan session). Lanjutkan:
- Wave/zone/batch picking, slotting optimization, cross-dock, replenishment rules.
- Labor & task interleaving, cycle counting terjadwal, yard/dock scheduling.

## 3.6 Transportation & Logistics (TMS-lite) `P2`
Padanan: *SAP TM*. Shipment, muatan, carrier, ongkos/freight, bukti kirim (POD), track & trace. Ringan sesuai skala MAT.

## 3.7 Procurement / Source-to-Pay Advanced `P1`
Perluas Procurement (§9.3 induk) ke S2P penuh:
- **Sourcing events** (RFQ terstruktur/lelang terbalik), scorecard supplier (sebagian sudah ada — vendor scorecard di commit terakhir).
- **Supplier Lifecycle Mgmt**: onboarding, kualifikasi, dokumen (expiry compliance sudah ada), risk & performance.
- **Contract Management** (harga kontrak, komitmen, call-off) + catalog/punchout ringan.
- **Supplier Portal** (§3.14).

## 3.8 Human Capital Management (HCM) + Payroll Indonesia `P0→P1`
MAT baru punya HR dasar + auto PPh 21 (PTKP/TER — commit terakhir). Ini **gap terbesar** vs tier-1 & paling bernilai lokal.
- **Core HR**: org chart, position/job (§7.3 induk sudah ada), employee 360, movement/riwayat.
- **Time & Attendance**: shift, absensi, lembur, cuti/leave, kalender kerja.
- **Payroll Indonesia**: gaji, tunjangan, potongan, **PPh 21 (TER 2024)**, **BPJS Ketenagakerjaan & Kesehatan**, THR, slip gaji, bank file.
- **Talent**: recruitment, performance, learning — P2.
- **ESS/MSS**: self-service (§3.14 portal) — absensi, cuti, slip, klaim.

## 3.9 Project & Portfolio (PPM / PSA) `P2`
Padanan: *Oracle PPM · D365 Project Ops*. Perluas "Project Operations" (§9.9 induk): WBS, budget vs actual, resource, timesheet, project billing, revenue recognition proyek.

## 3.10 Enterprise Asset Management (EAM) `P2`
Perluas Maintenance/EAM (§9.10 induk): master aset, preventive/predictive maintenance, meter-based, work order maintenance, spare parts planning, downtime cost.

## 3.11 Finance & Controlling — Advanced `P1`
Perluas Finance (§10 induk) ke standar tier-1:
- **Multi-currency**: transaksi & revaluasi valas, gain/loss, rate table effective-dated.
- **Multi-company & Consolidation**: intercompany posting, eliminasi, konsolidasi grup, mata uang pelaporan.
- **Controlling (CO)**: cost center/profit center, activity-based costing, **CO-PA** (profitability by product/customer/region).
- **Revenue Recognition** (PSAK 72 / IFRS 15) & **Lease Accounting** (PSAK 73 / IFRS 16).
- **Treasury-lite**: cash position, cashflow forecast (feed dari AI §2.1).

## 3.12 Tax & Indonesia Localization `P0`
**Diferensiasi terbesar untuk pasar Indonesia** — SAP/Oracle jual mahal untuk ini.
- **PPN / e-Faktur** + integrasi **Coretax DJP** (faktur pajak keluaran/masukan, e-Faktur).
- **e-Bupot** PPh 23/26/4(2), **PPh 21** (sudah ada auto profile — sambungkan ke e-Bupot 21).
- **SPT** periodik, rekap pajak, kode objek pajak.
- **e-Meterai**, format Rupiah & terbilang, kalender fiskal ID.
- Kepatuhan **UU PDP** (lihat §7.9) — bagian legal, bukan hanya pajak.

## 3.13 Document Management (DMS/ECM) `P2`
Naikkan Document Graph + File Engine induk (§14.3) → DMS: versioning, check-in/out, OCR full-text, klasifikasi, retensi/legal-hold, arsип, e-sign (§2.6).

## 3.14 Portals (Customer · Supplier · Employee) `P1`
Padanan: *Ariba/Fieldglass · Customer portals*. Satu shell portal ber-scope ketat (RLS + minimal-surface):
- **Customer**: status order, invoice, pembayaran, RMA, dokumen.
- **Supplier**: PO acknowledgement, ASN, invoice submission, dokumen kualifikasi.
- **Employee (ESS/MSS)**: absensi, cuti, slip, approval (mobile-first §4.9).

## 3.15 Governance, Risk & Compliance (GRC) `P2`
Naikkan SoD (§12.1 induk) → GRC: access risk analysis, control monitoring berkelanjutan, risk register, audit management, kebijakan retensi/compliance dashboard.

## 3.16 Integration Platform / API Management `P1`
Naikkan Integration Center (§11.7 induk):
- API gateway internal (rate-limit per-consumer, key/scope), webhook keluar, **EDI/host-to-host bank**, konektor (Coretax, BPJS, marketplace).
- Message/queue-based B2B di atas event outbox yang sudah ada.

---

# 4. PILAR C — VISUAL DESIGN & UI/UX

## Design System 4.0 — "Claymorphism Professional · White Premium Luxury"

DS 3.0 saat ini sudah "full-white premium · liquid glass · clay 3D" (token di `src/design-system/tokens.css`). DS 4.0 **menyempurnakan**, bukan mengganti — nama token dipertahankan (parity), nilai & lapisan diperkaya.

## 4.1 Prinsip DS 4.0
- **Claymorphism profesional, bukan mainan**: kedalaman clay dipakai sebagai *hierarki sentuh* (tombol primer, KPI, kartu aksi), bukan menutupi tabel padat/angka finansial (aturan §15.4 induk tetap berlaku).
- **White premium luxury**: kanvas pearl/ivory, hairline halus, aksen **champagne gold** untuk otoritas/approval, bayangan lembut berlapis (bukan drop-shadow keras).
- **Formula global** (revisi dari §15.1): `82% Clean Enterprise · 12% Pearl Glass · 6% Clay & Motion`. Layar Finance/Audit turun clay ke 2–3%.

## 4.2 Token & spesifikasi claymorphism (DS 4.0)
Perkaya `tokens.css` dengan lapisan clay yang lebih presisi:
- **Dual-shadow clay**: inner-light + inner-dark + outer-soft (sudah ada `--shadow-clay`; tambah varian `-sm/-lg/-pressed`).
- **Tactile states**: `default → hover (naik) → pressed (masuk/inset)` untuk tombol & toggle clay.
- **Gold authority tier**: token `--gold`/`--gold-soft` sudah ada; formalkan sebagai *approval/premium tier* (badge approver, sign-off, KPI otoritatif).
- **Elevation scale bernama** sudah ada (`--elevation-xs…floating`) — petakan ke komponen resmi.
- Radius premium: `--r-card:22px` dipertahankan; tambah `--r-hero` untuk control-center.

## 4.3 Motion system `P1`
- Kurva sudah ada (`--ease*`). Formalkan **motion language**: enter/exit, spring untuk clay press, stagger list, shared-element transition antar halaman 360.
- **Reduced-motion** wajib dihormati (accessibility).
- Skeleton + shimmer loader premium (bukan spinner polos) untuk perceived performance.

## 4.4 Dark mode — "Graphite Luxury" `P1`
- Varian gelap mewah: kanvas graphite, clay gelap dengan sheen halus, gold tetap sebagai aksen. Token via `:root[data-theme="dark"]` + `prefers-color-scheme`.
- Kontras teks WCAG AA minimum (AAA untuk teks utama).

## 4.5 Density modes `P1`
- **Compact / Comfortable / Spacious** — penting untuk tier-1 (operator entry butuh compact, executive butuh spacious). Toggle via token spacing scale yang sudah ada (`--space-*`).

## 4.6 Theming / White-label per Legal Entity `P2`
- Brand token (logo, warna aksen, gold tint) per legal entity — konsisten dengan multi-company §3.11. Pipeline token (Style-Dictionary-like) → build CSS var.

## 4.7 Component Library & Living Docs `P1`
- Katalog komponen resmi (button, input, card, table, drawer, dialog, clay-icon/orb, KPI, badge, stepper, command palette) dengan state & do/don't — satu halaman `/design` internal (Storybook-like tanpa dependency berat).
- Mencegah drift: modul hanya boleh pakai komponen & `var(--token)` resmi (aturan sudah ada di header `styles.css`).

## 4.8 Data-Visualization System `P1`
- Palet chart aksesibel (light+dark), konsisten dengan semantic color (mint=success, coral=danger, amber=warn, gold=highlight).
- Komponen: KPI tile, sparkline, trend, bar/line, heatmap, gauge — semua tabular-numeric, tanpa clay di area angka.

## 4.9 Mobile & PWA `P1`
- Pertahankan prinsip task-oriented (§15.5 induk): approval card, warehouse scan, QC, ESS, delivery.
- **PWA**: installable, offline shell, push notification (link §6.4). Bukan sekadar tabel desktop diperkecil.

## 4.10 Accessibility AAA-lean `P1`
- Sudah ada fondasi (skip-link, focus-visible, sr-only, `test:a11y`). Naikkan target: kontras AAA teks utama, navigasi keyboard penuh, ARIA pada komponen kompleks (command palette, drawer, tree), audit a11y masuk CI gate.

## 4.11 Page template refresh (DS 4.0)
Empat template induk (Control Center / List / Detail 360 / Workbench) dipertahankan, ditambah:
- **Empty/onboarding state** clay-illustrated (sesuai §15.4).
- **Global command palette** (§2.4) di semua template.
- **Inline AI assist** panel opsional (§2.1) di Detail 360 & Workbench.

---

# 5. PILAR D — DATABASE & SERVER MANAGEMENT (Skala Ratusan–Ribuan User)

Target: efisien, tidak cepat penuh, stabil saat konkuren tinggi — tanpa meninggalkan PostgreSQL tunggal (konsisten filosofi induk).

## 5.1 Connection pooling & concurrency `P0`
- **PgBouncer** (transaction pooling) di depan Postgres — ribuan koneksi klien → puluhan koneksi DB.
- Pool sizing per-worker, statement/idle-in-transaction timeout, `application_name` per-scope untuk observability.

## 5.2 Read replica & read/write split `P1`
- Streaming replica untuk beban baca (report, BI §2.3, list besar) → lepas dari primary.
- Router baca ke replica hanya untuk read model/report; transaksi tetap ke primary (hindari read-after-write pada jalur kritis).

## 5.3 Partitioning & indexing strategy `P0`
- Audit sudah partitioned (§2.1 induk). Perluas **partition by range (tanggal)** untuk tabel volume tinggi: audit, event outbox, inventory_movements, journal lines, notifikasi.
- **BRIN index** untuk kolom waktu-terurut besar; composite index sesuai pola query; hindari over-indexing (biaya tulis).
- `pg_stat_statements` aktif → identifikasi top query.

## 5.4 CQRS read models & materialized views `P1`
- Perkuat read model (§13.4 induk): dashboard/KPI/list berat baca dari materialized view, **bukan** tabel transaksi.
- Strategi refresh: incremental via event outbox (sudah ada), `REFRESH ... CONCURRENTLY` terjadwal untuk agregat.

## 5.5 Caching layer `P1`
- **Redis** (atau Postgres UNLOGGED untuk deploy minimal) untuk: session store, read model panas, hasil pricing/ATP, rate-limit counter, lock ringan.
- Cache key **wajib** menyertakan `user/scope/permission` (aturan §15.6 induk) → tidak ada kebocoran lintas-scope.
- Stale-while-revalidate untuk dashboard non-kritis; approval kritis selalu baca current.

## 5.6 Data lifecycle / ILM & retensi `P0`
Inti "tidak cepat penuh":
- **Tiered data**: hot (operasional) → warm (partisi lama) → cold (arsip terkompresi/offsite).
- **Retention policy** per domain (audit, notifikasi, event, dokumen) — job purge/archive terjadwal (sudah ada `data:purge`), diformalkan jadi kebijakan versioned.
- Detach & archive partisi tua ke storage murah; ringkas notifikasi/event yang sudah closed.
- Bloat/vacuum: autovacuum tuning per tabel panas, monitoring dead tuples.

## 5.7 High Availability & recovery `P1`
- **PITR** (WAL archiving) di atas encrypted backup yang sudah ada.
- Standby + failover (Patroni-style) — "Optional Standby (later)" di §16.4 induk dinaikkan jadi P1 saat mendekati produksi.
- **DR drill** terjadwal dengan RTO/RPO nyata (tetap gate go-live induk).

## 5.8 Capacity & multi-tenant strategy `P2`
- Model tetap **single-DB, multi-legal-entity via RLS** (bukan sharding) — cukup untuk skala MAT.
- Sharding-by-legal-entity hanya jika volume ekstrem; disiapkan sebagai opsi arsitektural, tidak diimplementasi dini (hindari over-engineering).

---

# 6. PILAR E — TEKNOLOGI & PERFORMA (Ringan · Enteng · Smooth)

## 6.1 Frontend performance `P0`
| Teknik | Penerapan |
|---|---|
| **Debounce** | Search box, filter, autosave draft, resize handler (200–300ms) |
| **Throttle** | Scroll, drag, real-time counter, event stream UI (60–100ms) |
| **Virtualisasi** | Tabel/list panjang (windowing) — wajib untuk grid ribuan baris |
| **Code-splitting / lazy module** | Muat aset per modul saat dibuka (sudah jadi prinsip §15.6) |
| **Prefetch on intent** | Hover/focus nav → prefetch data halaman berikut |
| **Optimistic UI** | Aksi ringan tampil instan, rekonsiliasi async |
| **Request coalescing / batching** | Gabungkan permintaan sejenis; hindari N panggilan |
| **Web Worker** | Komputasi berat (parse, agregasi klien) keluar dari main thread |
| **IndexedDB cache** | Cache read model & data referensi untuk offline/PWA |

## 6.2 Backend & API performance `P0`
- **Cursor/keyset pagination** untuk list besar (bukan OFFSET dalam) — server pagination sudah jadi prinsip.
- **Field selection / sparse fieldset** → payload minimal.
- **ETag / conditional request** + **Brotli/gzip** untuk response.
- **Idempotency key** (sudah ada §13.3) diperluas ke semua POST kritis.
- **Statement timeout** + slow-query log; eliminasi N+1 (prepared statement).
- Streaming untuk export besar (hindari materialisasi memori penuh).
- Backpressure & antrean untuk job berat (worker pool sudah ada).

## 6.3 Observability `P0`
Fondasi tier-1 — tanpa ini, "aman & lancar" hanya klaim.
- **OpenTelemetry**: traces (request→query), metrics, structured JSON logs — korelasi via trace-id.
- **RUM** (real user monitoring): Web Vitals (LCP/INP/CLS) per halaman.
- **SLO / error budget** + alerting; health/readiness probe; synthetic checks.
- Dashboard operasional (latency p95/p99, error rate, pool saturation, replica lag, cache hit).

## 6.4 PWA / offline & realtime `P1`
- Service worker: shell offline, precache aset fingerprinted, background sync untuk approval/scan.
- **Push notification** (Web Push) untuk approval & exception.
- Realtime ringan (SSE/WebSocket) untuk notifikasi & Work Item — di atas event outbox.

## 6.5 Performance budget & CI perf gate `P1`
- Anggaran eksplisit (§15.6 induk) → **CI gate**: ukuran bundle, TTI, query count per endpoint, p95 latency smoke (sudah ada `load:smoke`/`load:lan` — jadikan gate ber-threshold).
- Regression performa memblok release, sejajar dengan security gate.

## 6.6 Frontend architecture hygiene `P2`
- Pertahankan vanilla + design system ramping (kekuatan MAT). Jika komponen makin kompleks, adopsi island/web-components **tanpa** framework berat — jaga bundle kecil.

---

# 7. PILAR F — SECURITY (Benteng Zero-Trust)

Fondasi sudah kuat (MFA TOTP, CSRF, RLS, field encryption, SoD, rate limit, audit, secret rotation, step-up). vNext = naik ke **zero-trust + phishing-resistant + compliance**.

## 7.1 Authentication — Passkeys & SSO `P1`
- **WebAuthn / FIDO2 passkeys** — MFA tahan phishing (lampaui TOTP).
- **SSO OIDC/SAML** untuk integrasi identity korporat; **SCIM** untuk provisioning/deprovisioning otomatis (join/leave → akses).
- Device trust & session anomaly detection (lokasi/perangkat baru → step-up).

## 7.2 Authorization — ABAC di atas RBAC `P1`
- Model induk (role/duty/privilege/permission/scope) diperluas dengan **ABAC** (atribut: nilai transaksi, waktu, lokasi, klasifikasi data) untuk kebijakan dinamis. Tetap fail-closed.

## 7.3 Privileged Access Management (PAM) `P1`
- **JIT elevation** + approval untuk aksi privileged (§11.3 induk), sesi privileged terekam, vault rahasia (rotasi sudah ada → integrasikan ke vault/KMS).

## 7.4 Application hardening `P0`
- **CSP ketat + nonce**, Subresource Integrity, security headers (HSTS, COOP/COEP, X-CTO, Referrer-Policy, Permissions-Policy).
- **WAF** / reverse-proxy rules di depan app (§16.4 induk).
- Bot/abuse detection + rate-limit adaptif per-scope (di atas rate limit yang ada).

## 7.5 Data protection — DLP · PII · KMS `P0`
- Klasifikasi data (§12.2 induk field-level) → **tokenisasi/masking PII**, kebijakan **DLP** pada export/reveal (audit + watermark).
- **KMS/HSM** untuk kunci enkripsi (field encryption & backup sudah ada → pindah kunci ke KMS, rotasi terpusat).
- Encryption in transit (TLS 1.3) & at rest konsisten.

## 7.6 Immutable & tamper-evident audit `P1`
- Audit layer induk → **hash-chain / WORM** (tamper-evident), append-only, offsite immutable (sebagian sudah ada di evidence). Verifikasi rantai berkala.

## 7.7 Supply-chain & pipeline security `P0`
- SBOM sudah ada (`sbom.cdx.json`). Tambah: SAST/DAST + secret scan (sebagian ada `security:scan`) sebagai **CI gate**, dependency pinning + audit, signed release (manifest sign sudah ada), verifikasi hash artefak.

## 7.8 Threat detection & response `P1`
- **SIEM integration** (forward audit/security event), deteksi anomali (login, privilege, data access), honeytokens, alerting.
- **Incident Response runbook** + tabletop drill; breach notification workflow (link UU PDP §7.9).

## 7.9 Compliance — UU PDP & standar `P0`
Kritikal & sering terlewat di ERP lokal:
- **UU PDP (UU 27/2022)** — "GDPR Indonesia": consent management, hak subjek data (akses/koreksi/hapus), **breach notification** (kewajiban lapor), Data Protection Officer workflow, records of processing.
- Roadmap sertifikasi: **ISO 27001**, kesiapan **SOC 2** (kontrol sudah banyak → formalkan evidence).
- **PSAK/IFRS** untuk sisi finansial (§3.11).

---

# 8. Sequencing — Gelombang Rilis vNext

Selaras filosofi induk: **modul dulu, VPS terakhir**; tiap gelombang punya gate (test/migration/security/UAT).

## Wave 1 — Foundation & Scale (v0.50–v0.55) · fokus P0
Fondasi non-fungsional yang dibutuhkan sebelum fitur besar bertambah:
- §5.1 PgBouncer, §5.3 partitioning+index, §5.6 ILM/retensi
- §6.1–6.3 perf frontend/backend + **observability (OTel)**
- §7.4 app hardening, §7.5 DLP/KMS, §7.7 pipeline security, §7.9 **UU PDP**
- **§3.12 Tax & Localization ID** (e-Faktur/e-Bupot/Coretax) + **§3.8 Payroll ID** (nilai lokal tertinggi)

## Wave 2 — Front-Office & Planning (v0.56–v0.62) · fokus P1
- §3.1 CRM pipeline, §3.14 Portals, §3.3 S&OP/APS
- §3.7 S2P advanced, §3.11 Finance advanced (multi-currency/konsolidasi)
- §2.2 Workflow designer, §2.3 embedded BI, §2.4 command palette, §2.7 saved views

## Wave 3 — Intelligence & Experience (v0.63–v0.70) · fokus P1–P2
- §2.1 **MAT Copilot** (NLQ → intake → anomaly → forecast) bertahap
- §4 **DS 4.0** rollout (claymorphism pro, dark graphite, density, motion, component docs, data-viz)
- §6.4 PWA/offline/push, §7.1 passkeys/SSO/SCIM, §7.2 ABAC, §7.6 immutable audit

## Wave 4 — Depth & Differentiation (v0.71+) · fokus P2
- §3.4 MES, §3.5 WMS advanced, §3.6 TMS, §3.9 PPM, §3.10 EAM, §3.13 DMS, §3.15 GRC
- §5.2 read replica, §5.7 HA/PITR/standby, §7.8 SIEM

## Gate menuju v1.0 (production-ready, tier-1 parity)
- Semua P0 landing + UAT 13 role + security retest + enam rekonsiliasi + DR RTO/RPO nyata + offsite immutable evidence + Owner sign-off (gate induk tetap berlaku).

---

# 9. Non-Goals & Guardrails (Jangan Over-Engineer)

Untuk menjaga MAT tetap ringan & aman:
1. **Tetap modular monolith.** Microservices hanya jika satu domain benar-benar butuh skala/lifecycle terpisah — bukan default.
2. **Dependensi ramping.** Setiap dep baru harus berbayar nilai jelas (Redis, PgBouncer, OTel = ya; framework frontend berat = tidak).
3. **Server-authoritative selamanya.** AI/Copilot & klien adalah *proposer*; posting/authorization tetap di server + audit.
4. **Clay adalah aksen, bukan wallpaper.** Tabel padat & angka finansial tetap clean (aturan §15.4 induk).
5. **Scope MAT, bukan katalog SAP.** Ambil pola kontrol tier-1 yang relevan; tolak kompleksitas yang tak berguna untuk MAT.
6. **Fail-closed & least-privilege** default di setiap fitur baru.
7. **Tidak ada status "selesai" tanpa evidence** (audit source + migration + test + release SHA).

---

# 10. Ringkasan Delta (What's New vs Blueprint Induk)

| # | Tambahan vNext | Belum ada di induk? |
|---|---|---|
| 1 | MAT Copilot / Intelligence layer (NLQ, intake, anomaly, forecast) | ✅ Baru |
| 2 | CRM front-office & pipeline | ✅ Baru |
| 3 | S&OP / Demand-Supply Planning / APS | ✅ Baru (di atas MRP) |
| 4 | HCM penuh + **Payroll Indonesia (BPJS, PPh21 TER)** | ⬆️ Perluasan besar |
| 5 | **Tax & Localization ID** (e-Faktur/e-Bupot/Coretax) | ✅ Baru |
| 6 | Finance advanced (multi-currency, konsolidasi, CO-PA, revrec) | ⬆️ Perluasan |
| 7 | Portals (customer/supplier/employee) | ✅ Baru |
| 8 | Visual workflow designer + business rules engine | ⬆️ Dari code-driven |
| 9 | Embedded BI + semantic model | ⬆️ Dari KPI engine |
| 10 | **DS 4.0** claymorphism pro · dark graphite · density · motion · component docs | ⬆️ Dari DS 3.0 |
| 11 | Scaling: PgBouncer, replica, partitioning, ILM, Redis, HA/PITR | ⬆️ Dari topologi dasar |
| 12 | Perf: virtualisasi, debounce/throttle, PWA, observability OTel | ⬆️ Dari budget prinsip |
| 13 | Security: passkeys, SSO/SCIM, ABAC, PAM, DLP/KMS, SIEM, **UU PDP** | ⬆️ Dari fondasi kuat |
| 14 | MES · WMS advanced · TMS · PPM · EAM · DMS · GRC | ✅ Baru (Wave 4) |

---

*Dokumen requirement baseline. Bukan bukti implementasi. Perubahan status hanya melalui audit source, migration, test, release artifact, dan evidence manusia pada release SHA yang sama. — MAT ERP V2, 2026-08-09.*
