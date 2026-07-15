BEGIN;
ALTER TABLE business_documents DROP COLUMN IF EXISTS approval_policy_snapshot,DROP COLUMN IF EXISTS approval_policy_version_id;
DROP TABLE IF EXISTS approval_policy_versions;
DROP TABLE IF EXISTS access_review_items;
DROP TABLE IF EXISTS access_reviews;
DROP TABLE IF EXISTS emergency_access_overrides;
DROP TABLE IF EXISTS sod_conflict_events;
DROP TABLE IF EXISTS sod_rules;
DROP TABLE IF EXISTS user_role_assignments;
DROP TABLE IF EXISTS permission_catalog;
DROP TABLE IF EXISTS enterprise_roles;
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS ck_app_users_role;
UPDATE app_users SET role='admin' WHERE role IN('system_admin','security_admin');
UPDATE app_users SET role='finance' WHERE role='finance_manager';
UPDATE app_users SET role='employee' WHERE role='auditor';
ALTER TABLE app_users ADD CONSTRAINT ck_app_users_role CHECK(role IN
  ('owner','admin','finance','accounting','tax','hrd','sales','procurement','warehouse','production','employee'));
COMMIT;
