BEGIN;
DROP INDEX IF EXISTS ux_notification_delivery_target;
GRANT DELETE ON notification_deliveries TO mat_erp_app;
COMMIT;
