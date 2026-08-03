# MAT ERP V2 → Multi-Tenant SaaS — Blueprint Enterprise

**Tanggal:** 3 Agustus 2026
**Status:** Blueprint arsitektur (belum dieksekusi) — acuan re-arsitektur bertahap
**Tujuan:** Mengubah MAT ERP V2 dari sistem **single-tenant** (satu perusahaan: Mandiri Abadi Teknik) menjadi **multi-tenant SaaS** yang bisa **disewakan ke banyak perusahaan lintas sektor**, dengan isolasi data aman, storage & server efisien, dan sistem tetap enteng walau banyak penyewa.

> Fondasi kita **sangat mendukung** langkah ini: sudah ada RLS (Row-Level Security) per-cabang, modular monolith berlapis, transaction boundary tunggal, dan config-driven document/template. Multi-tenant = **memperluas pola cabang yang sudah ada** ke level tenant — bukan menulis ulang dari nol.

---

## 0. Ringkasan Eksekutif

| Aspek | Rekomendasi |
|---|---|
| **Model tenancy** | **Shared database + `tenant_id` + RLS per-tenant** (bukan DB-per-tenant) |
| **Isolasi** | RLS fail-closed di setiap tabel bisnis (perluas `app_branch_visible` → `app_tenant_visible`) |
| **Routing** | Subdomain per tenant (`acme.materp.app`) → tenant context di sesi |
| **Branding** | White-label penuh per tenant (logo, warna, identitas, template dokumen) |
| **Sektor** | Modul on/off + field & numbering configurable per tenant + template industri |
| **Billing** | Plan/langganan + metering pemakaian + kuota storage |
| **Efisiensi** | Partisi per-tenant, object storage, PgBouncer, read-replica, arsip/kompresi |
| **Eksekusi** | 6 fase bertahap, tiap fase reversibel & terverifikasi |

**Verdict:** Layak dan realistis. Effort besar tetapi **evolusioner** (bukan rewrite). Estimasi 6 fase; Fase 1–3 sudah menghasilkan produk multi-tenant fungsional.

---

## 1. Pilihan Model Tenancy (keputusan inti)

| Model | Isolasi | Efisiensi storage/server | Ops | Cocok? |
|---|---|---|---|---|
| **A. Shared DB + tenant_id + RLS** | Kuat (RLS fail-closed) | **Terbaik** — satu DB, satu pool | Sederhana (1 skema, 1 migrasi) | ✅ **PILIH** |
| B. Schema-per-tenant | Lebih kuat | Sedang (banyak skema) | Migrasi × N skema | Untuk enterprise besar tertentu |
| C. Database-per-tenant | Terkuat | **Terburuk** (N pool/backup/DB) | Berat (provisioning DB) | Hanya untuk tenant regulated |

**Alasan pilih A:** kita SUDAH punya RLS per-cabang (`app_branch_visible(branch_id)`, `set_config('app.branch_id')`, konteks sistem). Menambah `tenant_id` + policy tenant = ekstensi natural. Satu database → **paling hemat** (backup tunggal, pool tunggal, partisi bersama) → mendukung "DB & server tak cepat penuh walau banyak user/tenant".

> Opsi hibrida masa depan: mayoritas tenant di model A; tenant besar/regulated bisa "diangkat" ke DB terpisah tanpa ubah kode aplikasi (kode tetap tenant-aware).

---

## 2. Model Data — `tenant_id` + RLS

**Kolom tenant** di setiap tabel bisnis & konfigurasi milik-tenant:
```sql
ALTER TABLE <tabel> ADD COLUMN tenant_id uuid NOT NULL REFERENCES tenants(id);
CREATE INDEX ix_<tabel>_tenant ON <tabel>(tenant_id);
```
Hierarki: **tenant → legal_entity → branch → …** (branch yang sudah ada menjadi anak tenant).

**Tabel baru:**
- `tenants` (id, slug, name, status, plan_id, created_at, suspended_at)
- `tenant_settings` (branding, modul aktif, numbering, locale, currency default)
- `tenant_subscriptions` (plan, seats, storage_quota_gb, period, status)
- `tenant_usage` (metering: users, docs, storage_bytes, api_calls per periode)

**RLS (perluas pola cabang):**
```sql
-- konteks: set_config('app.tenant_id', <uuid>)  +  app.is_system
CREATE POLICY tenant_isolation ON <tabel>
  USING (tenant_id = current_setting('app.tenant_id')::uuid
         OR current_setting('app.is_system','on')='on');
ALTER TABLE <tabel> FORCE ROW LEVEL SECURITY;  -- owner pun tunduk
```
- `transaction.js` sudah menanam konteks RLS per-transaksi → tinggal tambah `app.tenant_id` di `setRlsContext`.
- **Fail-closed:** tanpa `tenant_id` di sesi (dan bukan sistem) → 0 baris. Uji lewat perluasan `branch-isolation.test.js` → `tenant-isolation.test.js`.

**Migrasi backfill:** semua data existing → tenant "Mandiri Abadi Teknik" (tenant pertama), lalu kolom NOT NULL.

---

## 3. Perubahan Arsitektur

```
Request → resolveTenant (subdomain / header / JWT claim)
  → auth (user ∈ tenant) → set_config app.tenant_id + app.branch_id
    → routes → core (permission tenant-aware) → repositories (RLS tenant)
      → PostgreSQL 16 (shared, partisi per-tenant)
worker: job tenant-scoped; SSE per-tenant channel
```

- **Tenant resolver** (baru, di `server.js` / `request-context.js`): subdomain `slug.materp.app` → `tenants.slug` → `tenant_id`. Fallback header `X-Tenant` (untuk API) atau claim di sesi.
- **Auth tenant-bound:** `app_users` dapat `tenant_id`; login memverifikasi user milik tenant dari subdomain. Sesi menyimpan `tenant_id`.
- **Permission engine:** RBAC+ABAC tetap; role definitions bisa **per-tenant** (tenant boleh kustom role) atau baseline global + override tenant.
- **Numbering, COA, posting-profile, approval-matrix, document-templates:** jadi **per-tenant** (kolom tenant_id) → tiap perusahaan punya penomoran, bagan akun, dan template sendiri.
- **Worker & SSE:** job membawa `tenant_id`; SSE channel di-scope tenant agar realtime tidak bocor antar tenant.

---

## 4. White-Label / Branding per Tenant

Menyambung langsung ke sistem yang sudah ada (document-templates + organization identity):
- `tenant_settings.branding`: logo, warna primer/aksen, nama, favicon, domain kustom.
- **Login & shell**: token CSS (`tokens.css`) di-inject per tenant (warna aksen, logo) — CSP-safe via CSS variables, bukan inline.
- **Dokumen**: `document_templates` + `organization_identity_snapshot` sudah per-entity → tinggal tenant-scope. Tiap tenant atur logo/rekening/NPWP/T&C sendiri (UX config sudah ada).
- **Email/notifikasi**: from-name & template per tenant.
- **Domain kustom** (opsional, plan atas): `erp.perusahaan.com` → CNAME → tenant.

---

## 5. Provisioning & Lifecycle Tenant

- **Onboarding wizard** (self-service atau admin-assisted): buat tenant → seed config default (COA, numbering, roles, approval-matrix, templates via `restore-config-seed` per-tenant) → buat admin pertama → pilih modul/industri.
- **Plan & langganan**: `tenant_subscriptions` (Starter/Growth/Enterprise) → seats, storage quota, modul, fitur (SSO, API, custom domain).
- **Metering**: `tenant_usage` diisi worker (harian) — users, dokumen, storage, API calls → dasar tagihan & enforcement kuota.
- **Suspend/terminate**: status tenant `SUSPENDED` → RLS + login block; `TERMINATED` → retensi lalu purge terjadwal (pakai `data:purge` tenant-scoped).
- **Backup**: per-tenant restore (logical export by tenant_id) di atas backup fisik global.

---

## 6. Keamanan (isolasi & anti-bobol antar tenant)

- **Isolasi data:** RLS `FORCE` fail-closed + test isolasi tenant di CI (wajib, seperti authz-matrix). Tak ada query tanpa tenant context.
- **Cross-tenant leakage guards:** ID selalu di-scope tenant di query; tolak akses objek lintas tenant (404, bukan 403, agar tak membocorkan keberadaan).
- **Per-tenant encryption keys** (envelope): field-encryption yang sudah ada → kunci per tenant (KMS/Vault), rotasi terkelola.
- **SSO per tenant** (SAML/OIDC) + SCIM provisioning + **passkey/WebAuthn** (anti-phishing).
- **Rate-limit & kuota per tenant** (cegah 1 tenant menghabiskan resource — noisy neighbor).
- **Audit per tenant** + anomaly detection (lonjakan authz_denied, mass-export) → alert.
- **Tenant admin ≠ platform admin:** pemisahan peran platform (kita) vs tenant. Platform super-admin lewat `app.is_system` yang teraudit ketat.

---

## 7. Efisiensi Storage & Server (banyak tenant tetap enteng)

**Database:**
- **Partisi**: tabel besar (audit, ledger, outbox, sessions, dokumen) **partisi by-tenant (LIST/HASH) × by-bulan (RANGE)** → query & purge cepat, per-tenant terisolasi fisik.
- **BRIN** untuk kolom append-only; **index-health** (buang indeks mati).
- **Object storage** (S3/MinIO) untuk file/foto/PDF, bukan di DB → DB ramping; lifecycle auto-tier/expire + **kuota storage per tenant**.
- **Arsip tenant lama/nonaktif** → tablespace dingin + kompresi; **autovacuum tuning** + `pg_repack`.
- **PgBouncer** (pooling transaksi) → ribuan koneksi tenant hemat; **read-replica** untuk reporting.

**Aplikasi/Server:**
- **Stateless multi-instance** (pindah SSE/worker ke koordinator) → scale horizontal saat tenant bertambah.
- **Cache per-tenant** (semantic layer/cockpit) dengan invalidasi outbox.
- **Code-splitting frontend** (lazy per-rute) → initial load ringan untuk semua tenant.
- **ETag/304 + brotli** (sudah ada) → hemat bandwidth lintas tenant.

---

## 8. Fleksibilitas Sektor (dipakai macam-macam industri)

- **Modul on/off per tenant** (`tenant_settings.modules`): perusahaan jasa nonaktifkan Produksi/MRP; manufaktur aktifkan semua.
- **Custom fields** per master (extension table `*_custom_fields` JSONB) tanpa ubah skema inti.
- **Numbering & COA & approval-matrix per tenant** (sudah tenant-scoped di §3).
- **Template industri** (preset onboarding): Manufaktur, Trading, Jasa/Kontraktor, Distribusi — set default modul + COA + dokumen.
- **Locale/currency/pajak per tenant** (multi-negara di masa depan).

---

## 9. UI/UX Multi-Tenant

- **Per-tenant theming** (white-label) di shell & login — token CSS per tenant.
- **Tenant switcher** (untuk platform admin / user multi-tenant) + indikator tenant aktif di topbar.
- **Onboarding UX** (wizard) + **admin platform console** (kelola tenant, plan, usage, suspend).
- **Halaman status/health per tenant** (Monitoring sudah ada → tenant-scope).

---

## 10. Roadmap Bertahap (tiap fase reversibel & terverifikasi)

| Fase | Fokus | Output |
|---|---|---|
| **F1 — Tenant foundation** | Tabel `tenants`, kolom `tenant_id` + backfill ke tenant #1, RLS tenant, konteks sesi | Semua data ter-tenant, isolasi lulus test |
| **F2 — Resolver & auth** | Subdomain resolver, auth tenant-bound, tenant switcher | Multi-tenant login fungsional |
| **F3 — Config per-tenant** | COA/numbering/roles/approval/template/branding per tenant + onboarding wizard | Tenant baru bisa di-provision self-service |
| **F4 — Billing & metering** | Plan, subscription, usage metering, kuota, suspend | Model sewa berjalan |
| **F5 — Efisiensi skala** | Partisi per-tenant, object storage, PgBouncer, read-replica, code-split | Enteng untuk banyak tenant |
| **F6 — Enterprise** | SSO/SCIM, passkey, per-tenant keys, custom domain, template industri | Siap enterprise & lintas sektor |

**Gate manusia:** pen-test multi-tenant (fokus cross-tenant leakage), DR per-tenant, kontrak SLA/DPA per tenant, sign-off.

---

## 11. Risiko & Guardrail

- **Cross-tenant leakage** = risiko #1 → RLS FORCE + test isolasi wajib di CI + review setiap query yang tak lewat repository.
- **Noisy neighbor** → kuota + rate-limit per tenant.
- **Migrasi backfill** `tenant_id` di tabel besar → lakukan online (batched) + reversibel.
- **Kompleksitas ops** → observability per tenant (metrik, log terstruktur ber-tenant).
- **Jangan** DB-per-tenant kecuali benar-benar perlu (biaya ops eksponensial).

---

### Catatan penutup
Ini blueprint, **belum dieksekusi**. Fondasi MAT ERP V2 (RLS, modular monolith, transaction boundary, config-driven docs) membuat jalur ini **evolusioner**. Rekomendasi mulai dari **Fase 1 (tenant foundation)** setelah keputusan bisnis (pricing, target sektor) matang. Nyambung ke [ENTERPRISE_AUDIT_BLUEPRINT_2026-07-31.md](ENTERPRISE_AUDIT_BLUEPRINT_2026-07-31.md) (Wave D/E: skala & integrasi enterprise).
