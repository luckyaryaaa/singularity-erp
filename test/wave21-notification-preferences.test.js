'use strict';
// Wave 21 — Notification preferences (§5.2 #6/#7), migrasi 078.
// Pengguna memilih kategori notifikasi; kategori yang di-mute disaring dari
// tampilan in-app-nya tanpa menghapus notifikasinya. SYSTEM_ALERT tak bisa mati.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const prefs = require('../backend/infrastructure/database/repositories/notification-preferences');
const operations = require('../backend/infrastructure/database/repositories/operations');

const dbTest = process.env.DATABASE_URL ? test : test.skip;
async function rollback(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try { await client.query('BEGIN'); await client.query("SELECT set_config('app.is_system','on',true),set_config('app.is_platform','on',true),set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true)"); await fn(client); }
  finally { await client.query('ROLLBACK').catch(() => {}); await client.end(); }
}
async function owner(client) {
  const r = (await client.query(`SELECT u.*,b.legal_entity_id FROM app_users u JOIN branches b ON b.id=u.branch_id WHERE u.role='owner' AND b.legal_entity_id IS NOT NULL LIMIT 1`)).rows[0];
  return { id: r.id, role: r.role, branchId: r.branch_id, branchScope: '*', displayName: r.display_name };
}
let seq = 0;
const tag = (p) => `${p}${(seq += 1)}${Date.now().toString(36).toUpperCase().slice(-5)}`;

dbTest('Wave 21: preferensi default menampilkan kelima kategori, tak ada yang di-mute', async () => rollback(async (client) => {
  const user = await owner(client);
  // Isolasi dari preferensi apa pun yang mungkin sudah ter-commit di DB bersama
  // (dihapus dalam transaksi rollback ini saja).
  await client.query('DELETE FROM notification_preferences WHERE user_id = $1', [user.id]);
  const p = await prefs.getPreferences(client, user);
  assert.equal(p.items.length, 5);
  assert.ok(p.items.every((x) => x.muted === false && x.emailEnabled === false), 'default: tampil in-app, email mati');
  assert.ok(p.items.some((x) => x.category === 'ACTION_REQUIRED'));
}));

dbTest('Wave 21: kategori yang di-mute disaring dari tampilan in-app dan hitungan', async () => rollback(async (client) => {
  const user = await owner(client);
  const title = tag('WI21-NOTIF-');
  await operations.notify(client, { userId: user.id, category: 'INFORMATION', title, body: 'uji preferensi', branchId: user.branchId });
  let list = await operations.listNotifications(client, user);
  assert.ok(list.some((n) => n.title === title), 'notifikasi muncul sebelum di-mute');
  const unreadBefore = (await operations.unreadCount(client, user)).unread;

  await prefs.setPreference(client, user, { category: 'INFORMATION', muted: true }, randomUUID());
  list = await operations.listNotifications(client, user);
  assert.ok(!list.some((n) => n.title === title), 'notifikasi kategori di-mute disaring dari daftar');
  const unreadAfter = (await operations.unreadCount(client, user)).unread;
  assert.ok(unreadAfter < unreadBefore, 'hitungan belum-baca ikut mengecualikan kategori di-mute');
}));

dbTest('Wave 21: SYSTEM_ALERT tidak dapat dimatikan; kategori asing ditolak', async () => rollback(async (client) => {
  const user = await owner(client);
  await assert.rejects(() => prefs.setPreference(client, user, { category: 'SYSTEM_ALERT', muted: true }, randomUUID()),
    (e) => e.code === 'VALIDATION_ERROR' && /SYSTEM_ALERT/.test(String(e.detail || e.message)));
  await assert.rejects(() => prefs.setPreference(client, user, { category: 'BOGUS', muted: true }, randomUUID()),
    (e) => e.code === 'VALIDATION_ERROR');
  // SYSTEM_ALERT tetap boleh diubah selain mute (mis. email).
  const ok = await prefs.setPreference(client, user, { category: 'SYSTEM_ALERT', muted: false, emailEnabled: true }, randomUUID());
  assert.equal(ok.emailEnabled, true);
}));

dbTest('Wave 21: set preferensi bersifat upsert', async () => rollback(async (client) => {
  const user = await owner(client);
  await prefs.setPreference(client, user, { category: 'WARNING', muted: true, emailEnabled: true }, randomUUID());
  await prefs.setPreference(client, user, { category: 'WARNING', muted: false, emailEnabled: true }, randomUUID());
  const p = (await prefs.getPreferences(client, user)).items.find((x) => x.category === 'WARNING');
  assert.equal(p.muted, false);
  assert.equal(p.emailEnabled, true);
}));

test('Wave 21: preferensi terhubung — migrasi, repo, dan rute merujuknya', () => {
  const fs = require('node:fs');
  const up = fs.readFileSync('data/migrations/078_notification_preferences.sql', 'utf8');
  const repo = fs.readFileSync('backend/infrastructure/database/repositories/operations.js', 'utf8');
  const route = fs.readFileSync('backend/routes/operations.js', 'utf8');
  assert.ok(up.includes('notification_preferences'), 'migrasi wajib membuat tabel preferensi');
  assert.match(up, /ENABLE ROW LEVEL SECURITY/, 'tabel preferensi wajib RLS per-pengguna');
  assert.ok(repo.includes('NOTIF_NOT_MUTED'), 'filter mute wajib terpasang di jalur baca notifikasi');
  assert.match(route, /notifPrefs\.(getPreferences|setPreference)/, 'rute wajib mengekspos preferensi notifikasi');
});
