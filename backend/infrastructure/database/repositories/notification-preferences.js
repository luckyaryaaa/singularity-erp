'use strict';
// Preferensi notifikasi per pengguna (migrasi 078) — pengguna memilih kategori
// mana yang diterima. Kategori yang di-mute disaring dari tampilan in-app
// pengguna itu (di operations.listNotifications/unreadCount) tanpa menghapus
// notifikasinya; email per kategori dapat dimatikan. Selalu terkunci ke
// pemiliknya (RLS + repo).
const { AppError } = require('../../../core/errors');
const permissions = require('../../../core/permissions');
const runtime = require('./runtime');

const CATEGORIES = ['ACTION_REQUIRED', 'WARNING', 'INFORMATION', 'SUCCESS', 'SYSTEM_ALERT'];
// Default masuk akal: semua kategori tampil in-app; email mati kecuali dinyalakan.
const DEFAULT = { muted: false, emailEnabled: false };

async function getPreferences(client, user) {
  permissions.assertPermission(user, 'notification.view');
  const rows = (await client.query(
    'SELECT category, muted, email_enabled FROM notification_preferences WHERE user_id = $1',
    [user.id])).rows;
  const byCat = new Map(rows.map((r) => [r.category, { muted: r.muted, emailEnabled: r.email_enabled }]));
  return {
    items: CATEGORIES.map((category) => ({ category, ...(byCat.get(category) || DEFAULT) }))
  };
}

async function setPreference(client, user, { category, muted, emailEnabled }, requestId) {
  permissions.assertPermission(user, 'notification.view');
  const cat = String(category || '').toUpperCase();
  if (!CATEGORIES.includes(cat)) {
    throw new AppError('VALIDATION_ERROR', `Kategori notifikasi tidak dikenal: ${category}.`, { allowed: CATEGORIES });
  }
  // SYSTEM_ALERT tidak boleh dimatikan — peringatan sistem harus selalu sampai.
  const wantMuted = Boolean(muted);
  if (cat === 'SYSTEM_ALERT' && wantMuted) {
    throw new AppError('VALIDATION_ERROR', 'Peringatan sistem (SYSTEM_ALERT) tidak dapat dimatikan.');
  }
  const wantEmail = Boolean(emailEnabled);
  const prev = (await client.query(
    'SELECT muted, email_enabled FROM notification_preferences WHERE user_id = $1 AND category = $2',
    [user.id, cat])).rows[0] || DEFAULT;
  const row = (await client.query(
    `INSERT INTO notification_preferences (user_id, category, muted, email_enabled, updated_by)
     VALUES ($1, $2, $3, $4, $1)
     ON CONFLICT (user_id, category)
     DO UPDATE SET muted = $3, email_enabled = $4, updated_at = now(), updated_by = $1
     RETURNING category, muted, email_enabled`,
    [user.id, cat, wantMuted, wantEmail])).rows[0];
  await runtime.audit(client, { userId: user.id, action: 'UPDATE', module: 'notification',
    entityType: 'NOTIFICATION_PREFERENCE', entityId: user.id,
    oldValue: { category: cat, muted: prev.muted ?? false, emailEnabled: prev.email_enabled ?? false },
    newValue: { category: cat, muted: row.muted, emailEnabled: row.email_enabled },
    requestId, branchId: user.branchId });
  return { category: row.category, muted: row.muted, emailEnabled: row.email_enabled };
}

module.exports = { getPreferences, setPreference, CATEGORIES };
