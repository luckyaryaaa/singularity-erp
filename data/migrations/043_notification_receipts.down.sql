BEGIN;
-- Rollback 043 — kembalikan status baca ke kolom tunggal notifications.read_at.
UPDATE notifications n SET read_at = r.read_at
FROM notification_receipts r WHERE r.notification_id = n.id AND n.user_id = r.user_id;
DROP INDEX IF EXISTS ix_notifications_branch;
ALTER TABLE notifications DROP COLUMN IF EXISTS branch_id;
DROP TABLE IF EXISTS notification_receipts;
COMMIT;
