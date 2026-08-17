<!--
  Requirement baseline (arsitektur). Bukan bukti implementasi.
  Companion dari: BLUEPRINT_VNEXT_TIER1_PARITY_MAT_ERP_V2_2026-08-09.md
  Induk kanonis: FINAL_BLUEPRINT_UPDATE_UPGRADE_MAT_ERP_V2_ENTERPRISE_2026-07-21.md
-->

# BLUEPRINT — SINGULARITY PLATFORM

## Multi-Tenant SaaS ERP · "One point. Infinite possibilities."

- **Tanggal**: 2026-08-09
- **Vendor / pemilik platform**: **PT Singularity Teknofastindo**
- **Nama produk**: **Singularity** (ERP platform yang disewakan / SaaS)
- **Codebase asal**: MAT ERP V2 (v0.49.0, migration 001–084, 322 handler, PostgreSQL RLS)
- **Tenant #001 (reference client)**: **Mandiri Abadi Teknik (MAT)** — manufaktur/trading
- **Sifat dokumen**: reframe arsitektural. MAT bukan lagi "produk", melainkan **tenant pertama** di atas platform Singularity.

---

# 0. Framing — dari "ERP MAT" menjadi "Platform Singularity"

Logo Singularity adalah **satu titik pusat dengan empat spark memancar**, dengan tagline *"One point. Infinite possibilities."* Itu persis modelnya:

```text
                 ✦  (Tenant: perusahaan B)
                  \
   (Tenant: MAT) ✦ — ◉ SINGULARITY — ✦ (Tenant: perusahaan C)
                  /   (control plane)
                 ✦  (Tenant: perusahaan D)
```

- **◉ Titik pusat** = **Singularity Platform** (satu codebase, satu control plane, satu tim operasi).
- **✦ Spark** = **tenant** = perusahaan yang menyewa. Tak terbatas jumlahnya, terisolasi satu sama lain.
- **MAT = tenant pertama**, sekaligus *design partner* & *industry pack* manufaktur/trading (konfigurasinya jadi template untuk klien sejenis).

**Prinsip terkunci**: satu codebase melayani semua tenant (**single code, multi-tenant**). Tidak ada fork per klien. Perbedaan antar-perusahaan diselesaikan lewat **konfigurasi & entitlements sebagai data**, bukan cabang kode.

**Kabar baik arsitektural**: MAT ERP sudah punya 80% fondasi multi-tenant tanpa disadari — **PostgreSQL RLS**, **security context ber-scope** (legal entity/branch/plant/warehouse), **Configuration-as-data engine**, **Numbering engine**, **field encryption**, **encrypted backup**, **audit immutable**, **Import Staging**. Multi-tenancy = **menambah satu scope terluar: `tenant_id`**, di atas semua yang sudah ada. Ini **evolusi, bukan rewrite** (lihat §11–12).

---

# 1. Keputusan Inti — Model Multi-Tenancy

Pertanyaan #1 setiap SaaS: **seberapa terisolasi data antar-tenant?**

| Model | Isolasi | Biaya/efisiensi | Ops | Cocok untuk |
|---|---|---|---|---|
| **A. Shared DB + shared schema + `tenant_id` + RLS** | Logis (RLS) | ★★★★★ termurah | Termudah | Mayoritas tenant (SMB/menengah) |
| **B. Shared DB + schema-per-tenant** | Kuat (schema) | ★★★☆ | Sedang | Tenant menengah-besar |
| **C. Database-per-tenant** | Terkuat (fisik) | ★★ termahal | Terberat | Enterprise/regulated/high-volume |

### Rekomendasi terkunci: **HYBRID "Pooled-first, Siloed-ready"**

1. **Default = Model A (Pooled)** — shared DB, shared schema, kolom `tenant_id`, **RLS fail-closed**. Alasan:
   - **Memakai ulang investasi RLS + security context** yang sudah matang (tinggal tambah `tenant_id` sebagai policy terluar).
   - Termurah & paling efisien → langsung bisa onboard klien ke-2, ke-3 setelah MAT.
   - "Tidak cepat penuh" ditangani lewat **partisi per (tenant, tanggal)** + ILM (lihat §10).
2. **Siloed (Model B/C) untuk tenant tertentu** — enterprise besar, kebutuhan regulasi/residency ketat, atau volume ekstrem. Diberi **schema/DB terpisah**, backup & tuning sendiri.
3. **Abstraksi Tenant Resolver** membuat aplikasi **tidak peduli** tenant itu pooled atau siloed. Promosi pooled → siloed dilakukan **tanpa mengubah kode aplikasi** (hanya routing koneksi + migrasi data tenant).

> Aturan emas: **satu kolom `tenant_id` di setiap tabel bisnis**, **satu RLS policy tenant** yang fail-closed, dan **tidak ada query yang boleh berjalan tanpa tenant context**. Kebocoran lintas-tenant = insiden severity-1.

---

# 2. Control Plane vs Data Plane

Pemisahan paling penting di SaaS. Dua bidang berbeda, dua model keamanan berbeda.

```text
┌──────────────────────── CONTROL PLANE (Singularity) ────────────────────────┐
│  Operator platform (Singularity Teknofastindo)                              │
│  • Tenant lifecycle: provision · suspend · resume · offboard                 │
│  • Katalog plan & entitlements · feature flag per-tenant                     │
│  • Billing & metering · invoice sewa · dunning                               │
│  • Observability global (label per-tenant) · status & SLA                    │
│  • Break-glass access (audited + tenant-consented)                           │
└──────────────────────────────────────────────────────────────────────────────┘
                                   │ provisioning & entitlement API
                                   ▼
┌──────────────────────── DATA PLANE (per tenant) ────────────────────────────┐
│  ERP Singularity — modul yang dipakai MAT hari ini, ter-scope `tenant_id`    │
│  • Users, roles, SoD, approval, posting, inventory, finance, HR, dst.        │
│  • Tenant admin mengelola perusahaannya sendiri (bukan platform)             │
└──────────────────────────────────────────────────────────────────────────────┘
```

Aturan kepercayaan (trust) yang **wajib**:
- **Operator platform TIDAK melihat data bisnis tenant secara default.** Ini fondasi kepercayaan menyewakan sistem.
- Akses dukungan/darurat = **break-glass**: butuh alasan, approval, **persetujuan tenant** (atau kebijakan kontrak), berdurasi, dan **ter-audit penuh** (extend PAM §7.3 vNext).
- **Tiga tingkat admin**: `PlatformOwner/Operator` (control plane) → `TenantAdmin` (kelola 1 perusahaan) → `TenantUser` (peran ERP biasa). Tidak ada eskalasi lintas-tenant.

---

# 3. Identitas Tenant, Routing & Domain White-Label

- **Resolusi tenant** di edge, lalu diinjeksi ke security context sebagai **scope terluar**:
  - Subdomain: `mat.singularity.id`, `client2.singularity.id`.
  - **Custom domain (white-label)**: `erp.mandiriabaditeknik.co.id` → dipetakan ke tenant MAT (TLS otomatis per domain).
- **Identitas ter-isolasi per tenant**: user milik satu tenant; email sama boleh ada di dua tenant sebagai identitas berbeda. **Tidak ada** sesi/token yang valid lintas-tenant.
- **SSO per tenant** (§7.1 vNext): tiap perusahaan boleh sambung IdP sendiri (OIDC/SAML) + SCIM provisioning.
- Security context (§2.3 induk) diperluas paling atas:

```text
Security Context
├── Tenant ID          ← BARU (scope terluar, fail-closed)
├── User ID / Session
├── Roles / Duties / Privileges
├── Legal Entity / Branch / Plant / Warehouse Scope
├── Field Classification Access
└── Privileged / Recent MFA Status
```

---

# 4. Isolasi & Keamanan Tenant

Perluas keamanan yang sudah ada ke **dimensi tenant**:

| Lapis | Sudah ada | Tambahan multi-tenant |
|---|---|---|
| **Data** | RLS per legal-entity/branch | **RLS `tenant_id` fail-closed** di semua tabel & read model; tenant policy dievaluasi lebih dulu |
| **Query** | Query filtering by scope | Tenant guard di connection/session (`SET app.tenant_id`), ditolak bila kosong |
| **File/Dokumen** | File engine | Namespacing per tenant + **kunci enkripsi per tenant (KMS)**; opsi BYOK untuk enterprise |
| **Rahasia** | Secret rotation | Key hierarchy per tenant; rotasi terpusat via KMS |
| **Audit** | Audit immutable | Setiap entri ber-`tenant_id`; audit control-plane terpisah dari audit tenant |
| **Isolasi beban** | Rate limit | **Quota & rate limit per tenant** (anti noisy-neighbor, §10) |
| **Uji kebocoran** | Test IDOR/authorization (322 handler) | **Matriks uji lintas-tenant**: tenant A tidak boleh baca apa pun milik tenant B (jadi CI gate) |

**Prinsip**: isolasi harus **default-on & fail-closed**. Bila `tenant_id` tidak ada di context → request ditolak, bukan "lihat semua".

---

# 5. Konfigurasi per-Tenant, Entitlements & White-Label

Perbedaan antar perusahaan = **data**, bukan kode. Memakai Configuration-as-data + Change Request engine yang sudah ada.

- **Config per-tenant**: Chart of Accounts, numbering, workflow/approval (visual designer §2.2 vNext), pricing rules, kalender fiskal, bahasa, mata uang, modul aktif.
- **Entitlements / Feature flags** per plan:

| Plan | Modul | Batas | Sasaran |
|---|---|---|---|
| **Starter** | Sales, Inventory, Finance inti | user & transaksi kecil | UKM |
| **Business** | + Procurement, Production, HR/Payroll, CRM | menengah | perusahaan tumbuh |
| **Enterprise** | + Multi-company, S&OP, MES, BI, SSO, siloed DB | tinggi/kustom | grup/korporasi |

- **White-label (DS 4.0 §4.6 vNext)**: brand token per tenant — logo, warna aksen, gold tint, domain, template dokumen (invoice/PO). Default brand = **Singularity** (monokrom + spark + tagline); tenant seperti MAT tampil dengan brand sendiri.
- **Extensibility metadata-driven**: custom field & custom workflow per tenant **tanpa fork** kode. Objek inti tetap dikelola platform.
- **Industry Pack**: konfigurasi MAT (manufaktur/trading) dikemas jadi **template siap pakai** untuk klien sejenis → onboarding kilat.

---

# 6. Onboarding & Provisioning Tenant

Alur "menyewakan sistem" harus mulus:

```text
Signup/kontrak → Create Tenant (control plane)
→ Pilih Industry Pack (mis. Manufaktur — dari MAT)
→ Seed config (COA, roles, numbering, workflow, pajak ID)
→ Undang Tenant Admin (email) → Setup Wizard terpandu
→ Import data awal (Import Staging §6.7 induk: master, saldo, opening inventory)
→ UAT tenant → Go-live → Aktif (billing mulai)
```

- **Self-service** (Starter/Business) atau **assisted** (Enterprise).
- **Provisioning idempoten**: buat schema/policy/seed dalam satu transaksi ter-audit; bisa rollback.
- MAT sebagai **reference tenant** → kualitas onboarding klien berikut terukur dari kemiripan dengan MAT.

---

# 7. Subscription & Billing (Menyewakan Sistem)

Control plane butuh mesin komersial:
- **Katalog plan** + harga (bulanan/tahunan) + add-on modul.
- **Metering**: jumlah user aktif, transaksi, storage, modul terpakai.
- **Invoicing sewa** + pajak (e-Faktur ID §3.12 vNext — Singularity menagih tenant), **trial**, **upgrade/downgrade prorata**, **dunning**.
- **Entitlement enforcement** terikat status bayar: telat bayar → **suspend graceful** (read-only/kunci login), **data tetap aman**, tidak dihapus. Offboard = ekspor + purge terjadwal (hak hapus UU PDP §7.9 vNext).
- Pemisahan uang: **billing platform** (Singularity menagih tenant) ≠ **AR/AP tenant** (transaksi bisnis MAT). Dua domain berbeda.

---

# 8. Infrastruktur & Topologi Cloud

Evolusi dari single-node LAN → cloud multi-tenant. Tetap **modular monolith** (di-scale-out sebagai replika stateless), bukan microservices.

```text
                         Users (banyak perusahaan)
                               │ HTTPS (per-tenant domain)
                    ┌──────────▼──────────┐
                    │  Edge / CDN + WAF   │  TLS otomatis · tenant routing
                    │  Reverse Proxy (LB) │  security headers · DDoS
                    └──────────┬──────────┘
             ┌─────────────────┼─────────────────┐
        ┌────▼────┐       ┌────▼────┐       ┌────▼────┐   App tier STATELESS
        │ App #1  │  ...  │ App #2  │  ...  │ App #N  │   (monolith, di-scale
        └────┬────┘       └────┬────┘       └────┬────┘    horizontal)
             └───────┬─────────┴────────┬────────┘
                     │                  │
              ┌──────▼──────┐    ┌───────▼───────┐
              │   Redis     │    │   PgBouncer   │  pooling koneksi
              │ session·    │    └───────┬───────┘
              │ cache·      │            │
              │ rate-limit· │   ┌────────┴─────────┬──────────────┐
              │ queue       │   │                  │              │
              └─────────────┘   ▼                  ▼              ▼
                          ┌───────────┐    ┌──────────────┐  ┌─────────────┐
                          │ PG Primary│    │ Read Replica │  │ Siloed DB   │
                          │ (POOLED:  │───▶│ (report/BI)  │  │ per tenant  │
                          │ semua     │    └──────────────┘  │ enterprise  │
                          │ tenant    │                      └─────────────┘
                          │ + RLS)    │
                          └─────┬─────┘
        Object Storage (S3)     │ WAL/PITR
        files per-tenant  ◀─────┤
                          ┌─────▼───────────────────────────────┐
                          │ Backup terenkripsi · Offsite immutable│
                          └───────────────────────────────────────┘

 Worker pool (background jobs, outbox) · scaled terpisah
 Observability: OTel → Metrics/Logs/Traces (label tenant) · Alert · SLO
 Secrets: Vault/KMS (kunci per tenant)
```

Catatan infrastruktur:
- **App stateless** → sesi di Redis → bisa tambah replika sesuai beban (auto-scale).
- **Data residency Indonesia** (UU PDP): region utama di ID. Desain siap multi-region belakangan.
- **Deploy** blue/green atau rolling; zero-downtime; per-tenant maintenance window untuk siloed.
- Awal boleh **satu node kuat** (hemat), tetapi arsitektur logis di atas sudah dipisah agar scale-out tinggal menambah replika — **tanpa refactor**.

---

# 9. Migrasi Tenant-Aware & Operasi Lifecycle

- **Migrasi skema** (sistem checksum migration 001–084 yang sudah ada) jadi **tenant-aware**:
  - *Pooled*: migrasi dijalankan **sekali** (shared schema) → berlaku semua tenant.
  - *Siloed*: orkestrasi migrasi per schema/DB, versinya dilacak per tenant.
- **Backup/restore per tenant**:
  - *Pooled*: ekspor logis ber-`tenant_id` (untuk restore/pindah/offboard 1 tenant tanpa ganggu lainnya).
  - *Siloed*: full backup DB tenant.
- **Point-in-time**: PITR global (pooled) + snapshot per siloed.
- **Offboarding**: ekspor data tenant (portabilitas) → purge terjadwal + bukti penghapusan (UU PDP).
- **Tenant clone/sandbox**: buat lingkungan UAT/training dari config tenant (tanpa data sensitif) — berguna untuk onboarding & pelatihan.

---

# 10. Skala & Efisiensi ("Tidak Cepat Penuh", Ratusan–Ribuan User)

Menggabungkan §5 (DB) & §6 (perf) vNext dengan dimensi tenant:
- **Partisi per (tenant, tanggal)** pada tabel volume tinggi (audit, movement, journal, notifikasi) → query cepat, arsip mudah, "tidak cepat penuh".
- **ILM per tenant**: retensi & arsip sesuai plan; tenant besar bisa punya kebijakan berbeda.
- **Noisy-neighbor guard**: quota per tenant (koneksi, rate, worker share, storage), statement timeout, fairness di PgBouncer.
- **Cache key wajib `tenant_id`** (di atas user/scope) → mustahil bocor lintas-tenant dari cache.
- **Read model/BI dari replica** → beban laporan tenant tidak menekan primary.
- **Promosi ke siloed** saat satu tenant tumbuh dominan (isolasi performa & blast-radius).

---

# 11. Jalur Migrasi — MAT → Tenant #001 (Tanpa Rewrite)

Bertahap, tiap fase punya gate (test/migration/security), MAT tetap jalan sepanjang proses.

| Fase | Isi | Hasil |
|---|---|---|
| **Fase 0 — Tenantize** | Tabel `tenants`; kolom `tenant_id` di semua tabel bisnis; **RLS tenant policy**; Tenant Resolver; backfill seluruh data MAT → `tenant_id = MAT`; `SET app.tenant_id` per sesi | Single-tenant berjalan **identik**, tapi sudah tenant-aware di bawah kap |
| **Fase 1 — Control Plane** | Tenant lifecycle (create/suspend/offboard); tiga tingkat admin; break-glass audited; onboard **tenant #2 (pooled)** dengan Industry Pack MAT | Bisa terima klien ke-2 |
| **Fase 2 — Komersial & White-label** | Plan/entitlements, metering, billing sewa, self-service onboarding, DS 4.0 white-label + custom domain | Bisa **menyewakan** secara mandiri |
| **Fase 3 — Enterprise Scale** | Siloed tier (schema/DB per tenant), read replica, multi-region, SSO/SCIM per tenant, SIEM | Siap klien enterprise & skala besar |

**Fase 0 adalah kunci** — sekali `tenant_id` + RLS terpasang dan teruji (matriks lintas-tenant hijau), sisanya bertumpuk aman di atasnya.

---

# 12. Yang Sudah Ada & Tinggal Di-extend (Evolusi, Bukan Rewrite)

| Aset existing MAT ERP | Peran barunya di Singularity |
|---|---|
| PostgreSQL **RLS** | Fondasi isolasi tenant — tambah policy `tenant_id` terluar |
| **Security context** ber-scope | Tambah `Tenant ID` sebagai scope paling atas |
| **Configuration-as-data** + Change Request | Config & kustomisasi per-tenant tanpa fork |
| **Numbering engine** | Penomoran per-tenant (seri terpisah) |
| **Field encryption** + rotation | Kunci per-tenant via KMS |
| **Encrypted backup/restore** | Backup/restore per-tenant (pooled logis / siloed full) |
| **Audit immutable** | Audit ber-`tenant_id`; plus audit control-plane terpisah |
| **Import Staging** | Data onboarding per-tenant |
| **Migration checksum (001–084)** | Migrasi tenant-aware (pooled sekali / siloed orkestrasi) |
| **Event outbox + workers** | Antrean & job ber-tenant, di-scale terpisah |
| **322 authorization handler + test IDOR** | Perluas matriks uji ke **lintas-tenant** (CI gate) |

Inilah alasan platform ini **layak dibangun di atas MAT ERP, bukan dari nol**: 80% mesin isolasi & governance sudah ada.

---

# 13. Non-Goals & Guardrails

1. **Single codebase, no per-client fork.** Perbedaan = config/entitlement/metadata.
2. **Pooled-first.** Siloed hanya saat ada alasan nyata (enterprise/regulasi/volume). Jangan siloed dini (boros).
3. **Tetap modular monolith**, di-scale-out sebagai replika stateless. Microservices bukan default.
4. **Fail-closed tenant isolation.** Tanpa `tenant_id` → tolak. Kebocoran lintas-tenant = severity-1.
5. **Operator platform tidak melihat data tenant** kecuali break-glass ter-audit & ter-consent.
6. **Data residency Indonesia** dulu (UU PDP), multi-region belakangan.
7. **Dependensi ramping** tetap dijaga (Redis, PgBouncer, KMS, object storage = wajar; hindari yang tak berbayar nilai).
8. **Tidak ada status "selesai" tanpa evidence** (audit source + migration + test lintas-tenant + release SHA).

---

# 14. Ringkasan Keputusan Terkunci

| # | Keputusan |
|---|---|
| 1 | Produk = **Singularity** (SaaS ERP) oleh **PT Singularity Teknofastindo**; MAT = **Tenant #001** |
| 2 | Model = **Hybrid Pooled-first, Siloed-ready** (shared DB + `tenant_id` + RLS; siloed untuk enterprise) |
| 3 | **Control plane ⟂ data plane**; operator tidak lihat data tenant (break-glass audited) |
| 4 | Tenant scope = **scope terluar** di security context; RLS `tenant_id` fail-closed |
| 5 | Perbedaan antar-perusahaan = **konfigurasi + entitlements + white-label**, bukan fork |
| 6 | Infra = edge/WAF → app stateless (scale-out) → Redis → PgBouncer → PG primary+replica (+siloed) → object storage → backup offsite; **region ID** |
| 7 | Jalur = **Fase 0 Tenantize** (kunci) → Control Plane → Komersial/White-label → Enterprise Scale |
| 8 | Dibangun **di atas** MAT ERP (RLS/security-context/config/audit sudah ada) — **evolusi, bukan rewrite** |

---

*Requirement baseline arsitektur. Bukan bukti implementasi. Status hanya berubah lewat audit source, migration, test (termasuk matriks lintas-tenant), release artifact, dan evidence manusia pada release SHA yang sama. — Singularity Platform, 2026-08-09.*
