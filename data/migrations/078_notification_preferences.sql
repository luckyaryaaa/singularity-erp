BEGIN;
-- 078 — Notification preferences (§5.2 #6/#7, audit Workspace 6.7).
--
-- Notifikasi sudah per-recipient dengan read receipt per pengguna
-- (notification_receipts), tetapi pengguna belum bisa MEMILIH kategori mana yang
-- ingin diterima. Tabel ini menyimpan preferensi per pengguna per kategori:
-- kategori yang di-mute disaring dari tampilan in-app pengguna itu (tanpa
-- menghapus notifikasinya), dan email per kategori dapat dimatikan.
--
-- Preferensi bersifat per-pengguna, bukan per-cabang; RLS mengunci ke pemiliknya
-- (dengan bypass sistem untuk worker/test).

CREATE TABLE notification_preferences (
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  category varchar(20) NOT NULL
    CHECK (category IN ('ACTION_REQUIRED','WARNING','INFORMATION','SUCCESS','SYSTEM_ALERT')),
  muted boolean NOT NULL DEFAULT false,
  email_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES app_users(id),
  PRIMARY KEY (user_id, category)
);

-- RLS: setiap pengguna hanya melihat/mengubah preferensinya sendiri; worker dan
-- migrasi (is_system) memperoleh akses penuh.
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_user ON notification_preferences
  USING (current_setting('app.is_system', true) = 'on'
         OR user_id = NULLIF(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (current_setting('app.is_system', true) = 'on'
         OR user_id = NULLIF(current_setting('app.user_id', true), '')::uuid);

COMMIT;
