BEGIN;
-- Rollback 068 — hapus peran akun pajak.
DELETE FROM account_roles WHERE role_key = 'TAX_PAYABLE';
COMMIT;
