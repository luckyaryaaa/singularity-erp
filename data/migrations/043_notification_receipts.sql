BEGIN;
-- 043 — P0-R: status baca notifikasi per penerima + cakupan cabang.
-- Notifikasi bertarget role adalah SATU baris dengan SATU read_at. Begitu satu
-- pengguna finance menandainya terbaca, notifikasi itu hilang untuk seluruh
-- pengguna finance lain — pemberitahuan yang menuntut tindakan bisa lenyap
-- sebelum dilihat siapa pun.

CREATE TABLE notification_receipts (
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);
CREATE INDEX ix_notification_receipts_user ON notification_receipts(user_id, read_at DESC);

-- Cakupan cabang: NULL berarti seluruh perusahaan (mis. pengumuman sistem).
ALTER TABLE notifications ADD COLUMN branch_id uuid REFERENCES branches(id);
CREATE INDEX ix_notifications_branch ON notifications(branch_id, created_at DESC);

-- Migrasi status lama: read_at yang sudah ada dipindahkan menjadi tanda baca
-- bagi penerima langsungnya. Notifikasi role yang terlanjur ditandai terbaca
-- dikembalikan menjadi belum terbaca — lebih aman memunculkannya lagi
-- daripada menyembunyikan tindakan yang belum dikerjakan.
INSERT INTO notification_receipts(notification_id, user_id, read_at)
SELECT id, user_id, read_at FROM notifications WHERE user_id IS NOT NULL AND read_at IS NOT NULL
ON CONFLICT DO NOTHING;
UPDATE notifications SET read_at = NULL WHERE user_id IS NULL AND read_at IS NOT NULL;

COMMIT;
