BEGIN;

-- 090 · Singularity multi-tenant foundation (Fase 0 · Tenantize).
--
-- Codebase MAT ERP menjadi produk SaaS "Singularity" yang disewakan ke banyak
-- perusahaan; MAT adalah Tenant #001. Migrasi ini memasang FONDASI-nya saja:
--   1) registry tenant (control-plane),
--   2) predikat RLS tenant yang fail-closed,
--   3) isolasi baris pada registry itu sendiri.
-- Kolom `tenant_id` + policy pada tabel BISNIS menyusul pada tranche 091–093,
-- lalu FORCE RLS + verifikasi pada 095. Migrasi 090 aman berdiri sendiri:
-- belum ada tabel bisnis yang bergantung padanya.
--
-- Konteks dibaca dari SET LOCAL per transaksi (transaction.js, menyusul):
--   app.is_platform = 'on'  → migrasi / control-plane / job lintas-tenant sadar-tenant
--   app.tenant_id           → tenant pemanggil
-- Bila keduanya kosong, predikat menutup akses: gagal tertutup, bukan terbuka.

-- ── Registry tenant (control-plane) ──────────────────────────────────────────
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
  updated_at     timestamptz  NOT NULL DEFAULT now(),
  version        integer      NOT NULL DEFAULT 1
);

COMMENT ON TABLE tenants IS
  'Singularity control-plane tenant registry; each row = one company renting the platform. MAT = Tenant #001.';

-- Tenant #001 — MAT. UUID TETAP/well-known agar seed, test helper, dan konteks
-- platform dapat mereferensikannya langsung tanpa subquery ke tenants (yang
-- ber-RLS). Baris bootstrap/reference dengan ID tetap adalah pola lazim.
-- `code='mat'` tetap anchor untuk backfill tranche 091–093.
INSERT INTO tenants (id, code, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'mat', 'Mandiri Abadi Teknik');

-- ── Predikat RLS tenant (fail-closed) ────────────────────────────────────────
-- Mirror app_branch_visible (045), dengan satu perbedaan disengaja: target NULL
-- TIDAK terlihat global. Setiap baris bisnis wajib bertenant; hanya konteks
-- platform yang boleh melintas antar-tenant.
CREATE OR REPLACE FUNCTION app_tenant_visible(target uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT current_setting('app.is_platform', true) = 'on'
      OR ( target IS NOT NULL
           AND NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL
           AND target = NULLIF(current_setting('app.tenant_id', true), '')::uuid );
$$;

COMMENT ON FUNCTION app_tenant_visible(uuid) IS
  'Fail-closed tenant RLS predicate: true only for the calling tenant (app.tenant_id) or platform context (app.is_platform=on).';

-- ── Isolasi registry itu sendiri ─────────────────────────────────────────────
-- Tenant hanya melihat barisnya sendiri; platform melihat semua. Tenant resolver
-- (domain/subdomain → tenant) berjalan dalam konteks platform, sehingga tetap
-- bisa memetakan request SEBELUM tenant context terbentuk. Tidak di-FORCE:
-- owner/migrasi tetap dapat mengelola registry (seed INSERT MAT di atas berjalan
-- sebelum RLS diaktifkan, jadi tidak terhalang).
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_self ON tenants
  USING (app_tenant_visible(id))
  WITH CHECK (app_tenant_visible(id));

COMMIT;
