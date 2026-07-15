-- Rollback 014 — staging saja.
BEGIN;
DROP TABLE IF EXISTS numbering_configurations;
COMMIT;
