<!--
  DOKUMEN KANONIS PUNCAK (master). Merangkum & menautkan seluruh blueprint
  Singularity. Requirement baseline — bukan bukti implementasi. Status berubah
  hanya lewat audit source, migration, test, release artifact, dan evidence
  manusia pada release SHA yang sama.
  Companion detail:
    • BLUEPRINT_SINGULARITY_PLATFORM_MULTITENANT_2026-08-09.md  (arsitektur SaaS)
    • BLUEPRINT_VNEXT_TIER1_PARITY_MAT_ERP_V2_2026-08-09.md      (fitur/modul tier-1)
    • SPEC_FASE0_TENANTIZE_SINGULARITY_2026-08-09.md             (spec teknis Fase 0)
    • FINAL_BLUEPRINT_UPDATE_UPGRADE_..._2026-07-21.md           (blueprint induk)
-->

# 🌌 BLUEPRINT MASTER — SINGULARITY

## Enterprise SaaS ERP · "One point. Infinite possibilities."

> **Singularity** — platform ERP enterprise multi-tenant oleh **PT Singularity Teknofastindo**, disewakan ke banyak perusahaan. **Mandiri Abadi Teknik (MAT) = Tenant #001.** Setara pola kontrol & pengalaman **SAP S/4HANA · Oracle Fusion · Dynamics 365**, tanpa kompleksitas yang tak berguna.

- **Tanggal**: 2026-08-09
- **Baseline engineering**: migration 001–089 (090 tenant-foundation drafted), 322 authorization handler, ~209 tabel, PostgreSQL RLS, DS 3.0
- **Brand**: monokrom (spark 4-titik memancar dari satu pusat) + aksen **champagne gold**. Logo: `Videos/LOGO SINGULAR.svg`, `LOGO APLIKASI.svg`, `LOGO WEB.svg`
- **Sifat**: dokumen kanonis puncak. Delapan pilar. Detail terdalam ada di companion (ditautkan per pilar).

---

# 0. Visi & Framing

Logo Singularity = **satu titik pusat, empat spark memancar**. Itu arsitekturnya:

```text
        ✦ Tenant B
         \
 MAT ✦ ── ◉ SINGULARITY ── ✦ Tenant C      ◉ = platform (1 codebase, 1 control plane)
         /   control plane                   ✦ = perusahaan penyewa (tenant, terisolasi)
        ✦ Tenant D
```

Tiga pergeseran yang mendefinisikan Singularity vs "ERP internal MAT":
1. **Produk, bukan proyek** — satu codebase melayani banyak perusahaan (**single code, multi-tenant**; beda antar-klien = konfigurasi + entitlements + white-label, **bukan fork**).
2. **Governed → Intelligent** — menambah lima lapis tier-1 di atas transaksi: **Intelligence (AI), Front-office (CRM/Portal), Planning (S&OP), Localization (pajak ID), Operational excellence (observability/HA/zero-trust)**.
3. **Evolusi, bukan rewrite** — ~80% mesin isolasi/governance sudah ada (RLS, security context, config-as-data, audit immutable, numbering, field-encryption, backup). Tenantize = menambah **satu scope terluar `tenant_id`**.

## 0.1 Readiness scorecard

| Kategori | @ baseline | Target Singularity v1.0 |
|---|---:|---:|
| Arsitektur & Multi-tenancy | ~30 (single-tenant) | 96 (pooled+siloed, control-plane) |
| Infrastruktur & Observability | ~55 (single-node) | 95 (cloud scale-out, OTel, HA) |
| Fitur lintas-modul (AI/BI/workflow) | ~10 | 85 (Copilot, BI, designer) |
| Modul fungsional | ~78 (back-office kuat) | 95 (+CRM/S&OP/HCM/Tax ID) |
| Visual & UI/UX | ~85 (DS 3.0) | 97 (DS 4.0 + white-label) |
| Database & skala | ~72 | 95 (partisi/ILM/replica/cache) |
| Teknologi & performa | ~70 | 95 (PWA/virtualisasi/perf-gate) |
| Security & compliance | ~88 | 98 (passkeys/ABAC/PAM/UU PDP) |
| **Overall** | **~68** | **95+ tier-1 SaaS** |

---

# PILAR 1 · ARSITEKTUR
*Detail: `BLUEPRINT_SINGULARITY_PLATFORM_MULTITENANT.md` + `SPEC_FASE0_TENANTIZE.md`*

**Tetap Modular Monolith** (di-scale-out sebagai replika stateless) — bukan microservices. Transaksi inventory/finance/tax butuh konsistensi kuat; monolith lebih ringan, mudah backup/restore/debug.

**Shared Enterprise Engines** (tak boleh ada modul bikin versi sendiri): Identity/Authorization · Org Scope · Master Data Governance · Change Request · Workflow/Approval · Work Item · Document Lifecycle & Graph · Numbering · Pricing · Credit/Risk · Inventory Ledger · Posting/Accounting · Notification · Audit/Evidence · File · Semantic KPI · Reporting · Integration/Event.

**Multi-Tenancy — Hybrid "Pooled-first, Siloed-ready"** (keputusan terkunci):
- **Pooled** (default): shared DB + kolom `tenant_id` + **RLS fail-closed**. Memakai ulang RLS/security-context existing; termurah & efisien.
- **Siloed** (enterprise/regulated/volume ekstrem): schema/DB per tenant. Promosi pooled→siloed **tanpa rewrite** (Tenant Resolver mengabstraksi routing).
- **`tenant_id` = scope terluar** di security context; RLS **RESTRICTIVE** (di-AND dengan branch); `app.is_platform` terpisah dari `app.is_system` (cross-branch ≠ cross-tenant).

**Control Plane ⟂ Data Plane**: operator platform (lifecycle tenant, billing, entitlement) **terpisah** dari ERP tenant; operator **tidak lihat data tenant** kecuali break-glass ter-audit & ter-consent. Tiga tingkat admin: `PlatformOperator` → `TenantAdmin` → `TenantUser`.

**Pola data**: typed core tables · effective-dating · optimistic locking · idempotency · event outbox · CQRS read models (materialized view untuk dashboard/BI, lepas dari tabel transaksi).

---

# PILAR 2 · INFRASTRUKTUR
*Detail: `BLUEPRINT_SINGULARITY_PLATFORM_MULTITENANT.md §8`*

Evolusi dari single-node LAN → cloud multi-tenant. **Region utama Indonesia** (residency UU PDP).

```text
Users (banyak perusahaan, per-tenant domain)
  │ HTTPS
Edge / CDN + WAF + Reverse Proxy (TLS otomatis · tenant routing · DDoS)
  │
App tier STATELESS ×N (monolith, auto-scale)  ──►  Redis (session·cache·rate-limit·queue)
  │                                                    
PgBouncer (pooling)                          Object Storage S3 (file per-tenant prefix)
  │
PostgreSQL Primary (POOLED: semua tenant + RLS)  ──►  Read Replica (report/BI)
  │                                                    └► Siloed DB (per tenant enterprise)
  ├─ WAL/PITR · Encrypted Backup · Offsite Immutable
Worker pool (outbox/jobs, scaled terpisah)
Observability: OpenTelemetry → Metrics/Logs/Traces (label per-tenant) · Alert · SLO
Secrets: Vault/KMS (kunci per-tenant)
```

- **App stateless** → sesi di Redis → tambah replika sesuai beban.
- **CI/CD**: source-scan → dep-scan → unit → integration → **authorization/IDOR/RLS (+lintas-tenant)** → security → UI/a11y → build → SBOM → sign → verify hash → deploy UAT → smoke/reconcile → approve → prod → post-verify. **Predeploy gate** memblok rilis (termasuk `tenant:verify`).
- **Environments**: Local → LAN Integration → LAN UAT → RC → Production Gate → Cloud. **VPS terakhir**.
- **Tenant provisioning infra**: idempoten (schema/policy/seed dalam 1 transaksi ter-audit); backup/restore per-tenant (pooled=logis, siloed=full); offboard=ekspor+purge (UU PDP).

---

# PILAR 3 · FITUR (lintas-modul)
*Detail: `BLUEPRINT_VNEXT_TIER1_PARITY.md §2`*

| Fitur | Deskripsi | Prioritas |
|---|---|---|
| **🤖 Singularity Copilot** | NLQ ("PO overdue supplier X bulan ini"), document intake OCR→draft AP, anomaly/fraud detection, forecasting, narrative reporting. **Proposer, bukan poster** — posting tetap server-authoritative + step-up MFA | P1 |
| **Visual Workflow & Rules Engine** | Designer alur approval/eskalasi/SLA + business rules deklaratif (pricing band, credit, dunning) — versioned, effective-dated, simulasi what-if | P1 |
| **Embedded BI & Semantic Model** | Satu definisi metric/dimension; self-service report ber-scope; drill-to-transaction; baca dari read model | P1 |
| **Global Search + Command Palette** | Cmd/Ctrl-K: navigasi/aksi/lookup ter-scope, debounce, hasil ter-authorize | P1 |
| **Notification & Collaboration Hub** | In-app + email + push; @mention & komentar kontekstual (audit-trailed); watch/subscribe | P2 |
| **E-Signature & Intake** | TTD elektronik + **e-Meterai**; retensi & arsip | P2 |
| **Personalization & Saved Views** | Saved views per-user/role (shareable, default-per-role), home layout, pinned | P1 |

---

# PILAR 4 · MODUL
*Detail: `BLUEPRINT_VNEXT_TIER1_PARITY.md §3`*

**Sudah kuat (existing)**: Workspace · Master Data/MDM · Organization/IAM · Sales O2C (quotation→order→invoice→RMA) · Procurement (PR→RFQ→PO→GR→QC) · Production/Shop Floor · Inventory/**Canonical Warehouse** (LOT/BIN/HU, FEFO, scan mobility) · Finance (GL/AR/AP/Cash/FA/Budget/Close) · HR (+auto PPh21 TER) · System/Security.

**Ekspansi tier-1 (per tenant, aktif via entitlement)**:

| Modul baru | Padanan | Prioritas |
|---|---|---|
| **CRM & Front-Office** | SAP Sales Cloud / D365 Sales | P1 |
| **S&OP + Demand/Supply Planning + APS** | SAP IBP / Oracle Planning | P1 |
| **HCM penuh + Payroll Indonesia** (BPJS TK/Kes, PPh21 TER, THR, slip) | SF/D365 HR | **P0→P1** |
| **Tax & Localization ID** (e-Faktur/e-Bupot/**Coretax**, SPT) | localization | **P0** |
| **Finance advanced** (multi-currency, konsolidasi, intercompany, CO-PA, revrec PSAK72, lease PSAK73) | SAP FI/CO | P1 |
| **Portals** (customer/supplier/employee ESS) | Ariba/Fieldglass | P1 |
| **S2P advanced** (sourcing, SLM, contract, supplier portal) | Ariba | P1 |
| **MES · WMS advanced · TMS · PPM · EAM · DMS · GRC** | — | P2 (Wave 4) |

---

# PILAR 5 · VISUAL DESIGN & UI/UX — DS 4.0
*"Claymorphism Professional · White Premium Luxury" — showcase artifact tersedia · detail `BLUEPRINT_VNEXT §4`*

- **Grounded token** (`src/design-system/tokens.css`): pearl `#fbfcff` · ivory `#ffffff` · graphite ink `#26324a` · **champagne gold `#c8a24d`** (otoritas/approval) · semantic mint/amber/coral/blue/lavender · rumus clay dual-inner-shadow · radius 22px.
- **Formula**: `82% Clean · 12% Pearl Glass · 6% Clay & Motion`. Layar Finance/Audit turun clay ke 2–3%.
- **Claymorphism profesional**: kedalaman clay = **hierarki sentuh** (tombol primer, KPI, kartu otoritas) — **bukan** menutupi tabel/angka. State tactile: default→hover(naik)→pressed(inset).
- **Dark "Graphite Luxury"** (bukan invert naif) · **density modes** (compact/comfortable/spacious) · **motion language** (hormati reduced-motion) · **data-viz system** · **component library + living docs** · **accessibility AA→AAA**.
- **White-label per tenant**: brand token (logo, aksen, gold tint, domain, template dokumen) per perusahaan. Default = brand **Singularity**; MAT tampil dengan brand sendiri.
- **Mobile & PWA**: task-oriented (approval/scan/QC/ESS), installable, offline shell, push.

---

# PILAR 6 · DATABASE & SERVER MANAGEMENT (ratusan–ribuan user, tidak cepat penuh)
*Detail: `BLUEPRINT_VNEXT §5` + `PLATFORM §10`*

- **Connection pooling** PgBouncer (transaction pooling — kompatibel dengan konteks `SET LOCAL` yang sudah dipakai).
- **Partisi per (tenant, tanggal)** untuk tabel volume tinggi (audit, movement, journal, outbox, notifikasi) + **BRIN index**; audit sudah partitioned.
- **ILM / retensi** (inti "tidak cepat penuh"): hot→warm→cold, detach & archive partisi tua, purge/archive terjadwal (kebijakan per-tenant/plan).
- **Read replica** untuk report/BI (lepas dari primary) · **CQRS read models** (materialized view, refresh incremental via outbox).
- **Caching** Redis (session, read model panas, pricing/ATP, rate-limit) — **cache key wajib menyertakan `tenant_id`+user+scope**.
- **HA/DR**: PITR (WAL) di atas encrypted backup · standby/failover · DR drill RTO/RPO nyata.
- **Noisy-neighbor guard**: quota & rate limit per tenant · statement timeout · autovacuum tuning tabel panas.
- **Strategi**: single-DB multi-legal-entity via RLS (cukup untuk skala MAT & mayoritas tenant); sharding hanya bila volume ekstrem (disiapkan, tak diimplementasi dini).

---

# PILAR 7 · TEKNOLOGI & PERFORMA (ringan · enteng · smooth)
*Detail: `BLUEPRINT_VNEXT §6`*

| Frontend | Backend | Observability |
|---|---|---|
| **Debounce** (search/filter/autosave 200–300ms) | **Cursor/keyset pagination** | **OpenTelemetry** (trace→query) |
| **Throttle** (scroll/drag/stream 60–100ms) | **ETag/conditional** + Brotli/gzip | **RUM** Web Vitals (LCP/INP/CLS) |
| **Virtualisasi** tabel panjang | **Idempotency key** semua POST kritis | **SLO / error budget** + alert |
| **Code-split / lazy module** | Statement timeout + eliminasi N+1 | Health/readiness probe · synthetic |
| **Prefetch on intent** · optimistic UI | Streaming export besar | Dashboard p95/p99, pool, replica lag |
| **Web Worker** (komputasi berat) | Backpressure & antrean job | **Perf budget = CI gate** (bundle/TTI/query count/p95) |
| **PWA/offline** + Web Push · IndexedDB cache | Realtime ringan (SSE/WS) atas outbox | Regression performa memblok rilis |

Prinsip: pertahankan **vanilla + design system ramping** (kekuatan MAT). Dependensi baru harus berbayar nilai jelas.

---

# PILAR 8 · SECURITY (benteng zero-trust)
*Detail: `BLUEPRINT_VNEXT §7` + `PLATFORM §4`*

**Fondasi kuat existing**: MFA TOTP, CSRF, RLS, field encryption, SoD, rate limit, audit immutable, secret rotation, step-up, encrypted backup, SBOM. **Passkeys (WebAuthn) sudah mulai** (migration 088).

**Naik ke zero-trust + compliance**:
- **Isolasi tenant fail-closed** (RLS `tenant_id` RESTRICTIVE + FORCE RLS + guard aplikasi). Kebocoran lintas-tenant = **severity-1**; **matriks uji lintas-tenant** jadi CI gate.
- **AuthN**: **passkeys/FIDO2** (anti-phishing) · **SSO OIDC/SAML per tenant** · **SCIM** provisioning · device trust & session anomaly.
- **AuthZ**: **ABAC** di atas RBAC (atribut nilai/waktu/lokasi/klasifikasi).
- **PAM**: JIT elevation + break-glass ter-audit & ter-consent (kunci kepercayaan menyewakan sistem).
- **Data**: klasifikasi + **tokenisasi/masking PII** + DLP export/reveal · **KMS/HSM** (kunci per-tenant, opsi BYOK) · TLS 1.3.
- **App hardening**: CSP ketat + nonce · SRI · HSTS/COOP/COEP · WAF · bot/abuse detection.
- **Audit**: hash-chain/WORM tamper-evident · offsite immutable · verifikasi rantai berkala.
- **Deteksi & respons**: SIEM · anomaly/honeytokens · IR runbook + drill.
- **Compliance**: **UU PDP (UU 27/2022)** — consent, hak subjek data, breach notification, DPO workflow · roadmap **ISO 27001 / SOC 2** · **PSAK/IFRS**.
- **Supply-chain**: SAST/DAST + secret scan sebagai CI gate · signed release · verify hash.

---

# ROADMAP TERPADU — satu program (Tenantize + Tier-1)

Menggabungkan **Fase Tenantize** (platform) dengan **Wave Tier-1** (vNext). Filosofi: **fondasi dulu, komersial, lalu kedalaman; VPS terakhir**.

| Wave | Fokus | Isi utama | Status |
|---|---|---|---|
| **W0 · Tenantize & Foundation** | jadi multi-tenant + fondasi skala | **Fase 0** (`tenant_id`+RLS, control-plane seed) · PgBouncer/partisi/ILM · **observability OTel** · app hardening · **UU PDP** · **Tax + Payroll ID** | **🟡 berjalan** — migration 090 drafted, `transaction.js` patched |
| **W1 · Commercialize** | bisa menyewakan mandiri | Control plane penuh · billing/metering/entitlements · **white-label + custom domain** · self-service onboarding (Industry Pack MAT) | ⬜ |
| **W2 · Front-office & Planning** | lengkap tier-1 | CRM · Portals · S&OP/APS · Finance advanced · workflow designer · embedded BI · command palette | ⬜ |
| **W3 · Intelligence & Experience** | pembeda 2026 | **Copilot** bertahap · rollout **DS 4.0** · PWA/offline/push · passkeys/SSO/SCIM · ABAC · immutable audit | ⬜ (passkeys mulai) |
| **W4 · Enterprise Scale & Depth** | klien besar | Siloed tier · read replica · multi-region · MES/WMS-adv/TMS/PPM/EAM/DMS/GRC · SIEM | ⬜ |

**Gate v1.0** (production-ready, tier-1 SaaS): semua P0 landing + matriks lintas-tenant hijau + UAT 13 role + security retest + enam rekonsiliasi + DR RTO/RPO nyata + offsite immutable evidence + Owner sign-off.

---

# PROGRESS SESI INI (2026-08-09)

| Artefak | Isi | Status |
|---|---|---|
| `BLUEPRINT_SINGULARITY_PLATFORM_MULTITENANT.md` | Arsitektur SaaS multi-tenant (14 seksi) | ✅ |
| `BLUEPRINT_VNEXT_TIER1_PARITY.md` | 6-pilar delta tier-1 + roadmap | ✅ |
| `SPEC_FASE0_TENANTIZE.md` | Spec teknis Fase 0 (RLS restrictive, is_platform, gate) | ✅ |
| **DS 4.0 showcase** (artifact) | Claymorphism pro · light/dark graphite · brand Singularity | ✅ published |
| `migration 090_tenant_foundation` (+`.down`) | Tabel `tenants` + MAT #001 + `app_tenant_visible()` + RLS registry | ✅ drafted (runner-verified) |
| `transaction.js` | `setRlsContext`: `app.tenant_id`+`app.is_platform`+guard bertahap | ✅ patched (14/14 harness) |
| `migration 091_auth_tenant_binding` (+`.down`) | `app_users.tenant_id` (backfill MAT) + RLS restrictive | ✅ drafted (runner-verified) |
| `auth.js` (`publicUser` + `resolveSession`) | user object membawa `tenantId` → mengalir ke `app.tenant_id` | ✅ patched (syntax OK) |
| `migration 092_tenant_tranche_a` (+`.down`) | `tenant_id` + RLS restrictive + **DEFAULT-from-GUC**: `business_documents`, `inventory_balances`, `stock_lots`, `notifications` | ✅ **applied+verified (disposable DB)** |
| **DEFAULT-from-GUC** + MAT UUID tetap `…001` | INSERT tanpa tenant_id auto-terisi dari `app.tenant_id` → **repository TIDAK perlu diubah** | ✅ 090–092 |
| Test helpers (~65 file) + `p0-rls-tranche1` | system-context set `is_platform`+`tenant_id`; branch-context set `tenant_id` | ✅ patched (node --check 0 fail) |
| **Login fix** | `auth.js` butuh `u.tenant_id` tapi dev @089 belum ada kolomnya → `column does not exist` → login rusak. Fix = apply migrasi ke dev. `LOGIN_VERIFY: PASS` (owner tenantId=…001) | ✅ **fixed+verified** |
| `migration 093_tenant_tranche_b` (+`.down`) | 67 tabel bisnis ber-RLS via DO-block eksplisit + fallback-default | ✅ **applied live** |
| `migration 094_tenant_tranche_c` (+`.down`) | 98 tabel bisnis/config non-RLS (enable-RLS pertama: products/customers/suppliers/journal/COA/branches/tax dst); auth/RBAC/platform/reference **dikecualikan (tetap global)** | ✅ **applied live** |
| `migration 095_tenant_audit_logs` (+`.down`) | audit_logs (partitioned, append-only) — isolasi jejak audit per-tenant; audit-write tetap jalan (→MAT via fallback) | ✅ **applied live** |
| **DEV LIVE @ migration 095 — DATA PLANE Fase 0 TUNTAS** | 090–095 applied + grant. **171 `tenant_isolation` policy; 30 tabel sengaja global** (auth/RBAC/platform/reference). Verified tiap step: login **PASS** · audit-write **→MAT** · **read-smoke 171 PASS** (MAT=platform, no-context=0) · `p0-rls-tranche1` **8/9 zero-regression** · `/api/health` ok | ✅ hijau |

**FORCE RLS = TIDAK PERLU (no-op, terkonfirmasi)**: tabel dimiliki `postgres` (superuser, bypassrls) → selalu bypass RLS; FORCE cuma untuk owner non-superuser. Runtime `mat_erp_app` (non-super, non-bypass) sudah kena RLS. `strict` = guard app-layer redundan (RLS DB sudah fail-closed) → biarkan off. **Hardening Fase 0 lengkap tanpa FORCE.**

**✅ FASE 1 CONTROL PLANE — STARTED & LIVE (dev @ 096)**: `096_control_plane` (`platform_operators` + `tenant_provisioning_log`) · repo `control-plane.js` (provision/idempotent · createTenantOwner · list/get/status · **resolveTenantByHost** · operator-gating) · HTTP `routes/platform.js` (`/api/platform/tenants…`) ter-register. **Resolver ter-wire ke pipeline**: dispatch memvalidasi host↔tenant (user hanya boleh lewat domain tenant-nya; suspended diblok; operator bypass; localhost→MAT no-op). Verified: demo **13/13** (provision+onboard Beta+owner-login+**live 2-tenant isolation**), route-test **3/3**, binding-verify **8/8**, login+boot-load ok. (Server perlu restart untuk memuat kode Fase 1.)

**✅ Baseline seed + unique-rescope (dev @ 097)**: `seedTenantBaseline` (legal entity + branch + numbering aktif) + `createTenantOwner` (branch + role assignment) → tenant baru **operasional** (onboard-verify **7/7**, `nextNumber`→`INV-BETAHQ-0826-001`, terisolasi). `097` re-scope 11 unique identity tenant-level ke `(tenant_id,…)` + index `ux_numbering_active` per-tenant (parent-FK-scoped & `app_users.username` dikecualikan).

**✅ Billing & Entitlements (dev @ 098)**: `plans` (Starter/Business/Enterprise + entitlements) + `tenant_subscriptions`; `billing.js` (subscribe · module-gating `assertModuleEnabled` · seat cap · `assertSubscriptionActive`); **suspend-on-non-payment** ter-wire di pipeline. Verified **13/13** (MAT enterprise · starter: sales ya/procurement tidak · suspended blok · upgrade). MAT = enterprise (active).

**✅ HTTP API control-plane + billing** (`routes/platform.js`, operator-gated): `GET /plans` · `GET|POST /tenants` · `POST /:id/{status,baseline,owners,subscription,subscription/status}` · **composite `POST /onboard`** (provision+baseline+owner+subscribe 1-call atomik). Verified **10/10** end-to-end.

**✅ Per-route module-gating** (pipeline `MODULE_BY_PREFIX` + `billing.moduleAllowed`, subscription di-cache saat binding): modul di luar paket ditolak. Verified **14/14** (Starter blok procurement/production/hr/organization/operations; MAT enterprise all-allow; governance/documents/platform non-gated).

**Sisa Fase 1**: (a) baseline lebih kaya (COA/posting/fiscal/tax); (b) metering/invoicing; (c) UI control-plane (frontend); (d) rescope blind-index PII + login ter-scope tenant. Server perlu restart untuk memuat route/pipeline baru.

**Berikutnya = FASE 1 (feature build, deliberate)**: (a) **control plane** — provisioning/lifecycle tenant, 3 tingkat admin, break-glass; (b) **auth resolver** (subdomain/custom-domain → tenant); (c) **re-scope unique constraint** + numbering per-tenant (banyak constraint — syarat tenant #2 bisa reuse kode; aman di single-tenant karena RLS men-scope query); (d) billing/entitlements. Suite 400+ penuh belum dijalankan (1 test RLS butuh seed 2-cabang; dev punya 1).

---

# NON-GOALS & GUARDRAILS

1. **Single codebase, no per-client fork.** Beda = config/entitlement/white-label.
2. **Pooled-first**, siloed hanya saat ada alasan nyata. **Modular monolith** tetap (scale-out replika, bukan microservices).
3. **Server-authoritative selamanya.** AI/Copilot & klien = proposer; posting/authz tetap di server + audit.
4. **Fail-closed & least-privilege** default; **kebocoran lintas-tenant = severity-1**.
5. **Clay = aksen, bukan wallpaper.** Angka finansial & tabel padat tetap clean.
6. **Data residency Indonesia** dulu; **dependensi ramping** (Redis/PgBouncer/KMS/OTel = ya; framework berat = tidak).
7. **Scope MAT+tenant nyata**, bukan katalog SAP. **Tidak ada status "selesai" tanpa evidence** (audit source + migration + test lintas-tenant + release SHA).

---

# PETA DOKUMEN (source of truth)

```text
BLUEPRINT_MASTER_SINGULARITY (dokumen ini · kanonis puncak)
├── ARSITEKTUR/INFRA  → BLUEPRINT_SINGULARITY_PLATFORM_MULTITENANT
│     └── eksekusi     → SPEC_FASE0_TENANTIZE → migration 090 + transaction.js
├── FITUR/MODUL/VISUAL/DB/TECH/SECURITY → BLUEPRINT_VNEXT_TIER1_PARITY
│     └── visual        → DS 4.0 showcase artifact
└── requirement induk  → FINAL_BLUEPRINT_UPDATE_UPGRADE_..._2026-07-21
```

---

*Requirement baseline. Bukan bukti implementasi. — Singularity by PT Singularity Teknofastindo · "One point. Infinite possibilities." · 2026-08-09.*
