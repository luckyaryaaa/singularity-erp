BEGIN;

DROP INDEX IF EXISTS ux_app_users_tenant_username;
ALTER TABLE app_users ADD CONSTRAINT app_users_username_key UNIQUE (username);

COMMIT;
