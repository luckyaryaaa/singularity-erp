BEGIN;

-- 105 · Login ter-scope tenant — username unik PER-TENANT (bukan global).
--
-- Semula app_users.username UNIQUE global; 097 sengaja menundanya karena login
-- me-resolve user by-username secara global (is_platform='on'). Kini login di-scope
-- ke tenant host: routes/auth.js men-set konteks RLS ke tenant hasil
-- resolveTenantByHost SEBELUM auth.login, sehingga RLS app_users otomatis
-- mem-filter query login ke tenant itu (query SQL login tak berubah).
--
-- Dampak: username boleh sama antar tenant (dua perusahaan sama-sama punya
-- "admin"), dan login TIDAK bisa lintas-tenant. lower(username) = unik
-- case-insensitive, konsisten dgn lookup login (lower(username)=lower($1)).

ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_username_key;
CREATE UNIQUE INDEX ux_app_users_tenant_username
  ON app_users(tenant_id, lower(username));

COMMIT;
