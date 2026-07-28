BEGIN;
DROP TABLE IF EXISTS mfa_recovery_codes;
DROP TABLE IF EXISTS password_reset_requests;
DELETE FROM permission_catalog
  WHERE code IN('user.reset_password','user.approve_password_reset');
COMMIT;
