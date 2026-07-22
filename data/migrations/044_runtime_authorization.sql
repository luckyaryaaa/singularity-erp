BEGIN;
-- 044 — B1/B2: otorisasi runtime bersumber dari database, dan satu pengguna
-- boleh memegang lebih dari satu peran.
--
-- B1: ROLE_GRANTS hidup sebagai konstanta di source. Mengubah kewenangan
-- menuntut deploy ulang, dan tabel role_permissions (ada sejak migrasi 002)
-- dibiarkan KOSONG sehingga tidak pernah menjadi sumber kebenaran apa pun.
-- Tabel itu kini menjadi sumber yang dibaca runtime; ROLE_GRANTS tinggal
-- menjadi baseline yang di-seed sekali per peran.
--
-- B2: user_role_assignments sudah mendukung peran non-primary (indeks unik
-- hanya mengikat yang primary), tetapi runtime hanya pernah membaca
-- app_users.role. Peran tambahan yang sah karenanya tidak berpengaruh.

ALTER TABLE role_permissions
  ADD COLUMN active boolean NOT NULL DEFAULT true,
  ADD COLUMN source varchar(20) NOT NULL DEFAULT 'BASELINE'
    CHECK (source IN ('BASELINE','CUSTOM')),
  ADD COLUMN granted_by uuid REFERENCES app_users(id),
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX ix_role_permissions_role ON role_permissions(role) WHERE active;

-- Peran wajib dikenal; grant untuk peran hantu tidak boleh diam-diam ada.
ALTER TABLE role_permissions
  ADD CONSTRAINT role_permissions_role_fk FOREIGN KEY (role)
  REFERENCES enterprise_roles(code) ON UPDATE CASCADE NOT VALID;

COMMIT;
