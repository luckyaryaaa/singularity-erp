'use strict';
// Mesin notifikasi: kategori jelas, tautan ke dokumen, tanpa duplikat per event.

const { store } = require('../infrastructure/database/store');
const { uid, nowIso } = require('./util');
const events = require('./events');

const CATEGORIES = ['ACTION_REQUIRED','WARNING','INFORMATION','SUCCESS','SYSTEM_ALERT'];

function notify({ userId, role, category, title, body, link, dedupeKey }) {
  const rows = store.collection('notifications');
  if (dedupeKey && rows.findOne((row) => row.dedupeKey === dedupeKey && !row.readAt)) return null; // cegah duplikat
  const row = rows.insert({
    id: uid(),
    userId: userId || null,
    role: role || null, // notifikasi bisa menyasar role (mis. semua finance)
    category: CATEGORIES.includes(category) ? category : 'INFORMATION',
    title, body: body || '', link: link || null,
    dedupeKey: dedupeKey || null,
    createdAt: nowIso(), readAt: null
  });
  events.publish('notification.created', { entityId: row.id, category: row.category, title });
  return row;
}

function listFor(user) {
  return store.collection('notifications')
    .find((row) => row.userId === user.id || (row.role && (row.role === user.role || row.role === '*')))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 60);
}

function unreadCount(user) { return listFor(user).filter((row) => !row.readAt).length; }

function markRead(user, id) {
  const rows = store.collection('notifications');
  const row = rows.get(id);
  if (!row) return null;
  return rows.update(id, { readAt: nowIso() });
}

function markAllRead(user) {
  for (const row of listFor(user)) if (!row.readAt) store.collection('notifications').update(row.id, { readAt: nowIso() });
}

module.exports = { notify, listFor, unreadCount, markRead, markAllRead, CATEGORIES };
