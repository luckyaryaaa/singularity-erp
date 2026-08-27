BEGIN;

-- 118 · Kode Karyawan (EMP-<TENANT>-<urutan>) — identitas utama karyawan yang
-- NON-sensitif, menggantikan tampilan NIK di list/detail/dokumen. NIK KTP tetap
-- terenkripsi + blind-index di employee_personal (tak berubah). Prefix tenant
-- diambil dari tenants.code (mis. "mat" → MAT) → EMP-MAT-0001.
-- Konteks platform di-set agar backfill LINTAS-TENANT tidak terhalang RLS.
SELECT set_config('app.is_platform', 'on', true);

ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_code varchar(40);

-- Penghitung urutan per-tenant (UPSERT atomik → anti-balapan saat create).
CREATE TABLE IF NOT EXISTS tenant_employee_seq (
  tenant_id uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  last_no integer NOT NULL DEFAULT 0
);
ALTER TABLE tenant_employee_seq ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tenant_employee_seq AS RESTRICTIVE
  USING (app_tenant_visible(tenant_id)) WITH CHECK (app_tenant_visible(tenant_id));
CREATE POLICY tenant_access ON tenant_employee_seq
  USING (app_tenant_visible(tenant_id)) WITH CHECK (app_tenant_visible(tenant_id));

-- Backfill kode karyawan lama: urut created_at per tenant, prefix dari tenants.code.
WITH ranked AS (
  SELECT e.id,
         'EMP-' || left(COALESCE(NULLIF(upper(regexp_replace(t.code, '[^a-zA-Z0-9]', '', 'g')), ''), 'TNT'), 8)
              || '-' || lpad(row_number() OVER (PARTITION BY e.tenant_id ORDER BY e.created_at, e.id)::text, 4, '0') AS code
  FROM employees e JOIN tenants t ON t.id = e.tenant_id
  WHERE e.employee_code IS NULL
)
UPDATE employees e SET employee_code = r.code FROM ranked r WHERE e.id = r.id;

-- Inisialisasi penghitung = jumlah karyawan per tenant (kode berikutnya = +1).
INSERT INTO tenant_employee_seq (tenant_id, last_no)
SELECT tenant_id, count(*) FROM employees GROUP BY tenant_id
ON CONFLICT (tenant_id) DO UPDATE SET last_no = GREATEST(tenant_employee_seq.last_no, EXCLUDED.last_no);

-- Unik per tenant (kode selalu huruf besar, jadi aman tanpa lower()).
CREATE UNIQUE INDEX IF NOT EXISTS ux_employees_tenant_code
  ON employees (tenant_id, employee_code) WHERE employee_code IS NOT NULL;

COMMIT;
