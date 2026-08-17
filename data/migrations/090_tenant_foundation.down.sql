BEGIN;

-- Balikan 090. Dijalankan dalam rantai rollback terbalik: tranche 091–093
-- (kolom tenant_id + FK + policy yang memakai app_tenant_visible) sudah turun
-- lebih dahulu, sehingga DROP di bawah tidak terhalang dependency.
-- DROP TABLE ikut menghapus policy `tenant_self`; fungsi di-drop setelahnya.

DROP TABLE IF EXISTS tenants;
DROP FUNCTION IF EXISTS app_tenant_visible(uuid);

COMMIT;
