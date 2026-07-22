BEGIN;
DELETE FROM role_permissions WHERE source='BASELINE' AND permission_code LIKE 'business_partner.%';
-- Restore the 051 function by re-running its definition is intentionally not
-- useful: that version is known-bad. Rollback of the entire feature uses 051 down.
COMMIT;
