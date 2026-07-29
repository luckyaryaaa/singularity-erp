'use strict';
// Penjaga cakupan gerbang visual.
//
// Sampai v3, gerbang visual berjalan dengan MAT_DB_MODE=memory — adapter lama
// backend/api.js yang hanya melayani sembilan endpoint — sementara produksi
// memakai PostgreSQL dengan ratusan handler. Akibatnya mayoritas halaman tidak
// pernah dirender oleh pemeriksaan otomatis apa pun, dan sejumlah cacat lama
// (hitungan organisasi selalu nol, total dokumen "Rp NaN", rute persediaan yang
// hilang) baru ketahuan lewat pemeriksaan browser manual.
//
// Uji ini menahan agar cakupan itu tidak menyusut diam-diam lagi.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'test/visual-baseline.json'), 'utf8'));
const smoke = fs.readFileSync(path.join(root, 'scripts/ui-smoke-cdp.js'), 'utf8');

test('gerbang visual berjalan terhadap PostgreSQL secara default', () => {
  assert.match(smoke, /MAT_UI_SMOKE_DB \|\| 'postgres'/,
    'default WAJIB postgres — backend yang sebenarnya dipakai produksi');
  assert.match(smoke, /MAT_DB_MODE: 'postgres'/, 'mode postgres wajib tersedia');
  // server.js memaksa in-memory bila NODE_ENV=test; mode postgres tidak boleh
  // memakai flag itu atau gerbang kembali menguji sembilan endpoint.
  assert.ok(!/NODE_ENV: 'test', MAT_EPHEMERAL: usePostgres/.test(smoke),
    'mode postgres tidak boleh dipaksa ephemeral oleh NODE_ENV=test');
  assert.match(smoke, /MAT_BOOTSTRAP_OWNER_USERNAME/, 'login postgres memakai kredensial bootstrap dari env');
});

test('cakupan halaman tidak boleh menyusut di bawah ambang', () => {
  const pages = baseline.pages;
  assert.ok(pages.length >= 26, `cakupan turun menjadi ${pages.length} halaman — minimal 26`);
  // Modul inti wajib terwakili; inilah yang dulu tidak pernah tersentuh.
  for (const wajib of ['dashboard', 'organization', 'inventory', 'customers', 'products', 'work-orders', 'quotations', 'data-retention', 'accounting-coding-block', 'tax-reconciliation', 'financial-statements', 'closing-cockpit']) {
    assert.ok(pages.some((p) => p.name === wajib), `halaman '${wajib}' wajib masuk cakupan visual`);
  }
  // Halaman yang butuh backend penuh ditandai eksplisit, bukan diam-diam gagal.
  const pgOnly = pages.filter((p) => p.memorySafe === false);
  assert.ok(pgOnly.length >= 6, 'halaman yang menuntut PostgreSQL wajib ditandai memorySafe:false');
  for (const p of pages) {
    assert.ok(p.name && p.hash && p.selector, `halaman ${p.name || '(tanpa nama)'} tidak lengkap`);
    assert.match(p.hash, /^#\//, `hash halaman ${p.name} tidak valid`);
  }
});

test('ambang mutu visual tidak boleh dilonggarkan', () => {
  // Menurunkan ambang lebih berbahaya daripada tidak menguji: gerbang tetap
  // hijau sementara halamannya rusak.
  assert.ok(baseline.maxHorizontalOverflow <= 1, 'toleransi overflow horizontal tidak boleh dilonggarkan');
  assert.ok(baseline.minMainWidth.desktop >= 900, 'lebar minimum desktop tidak boleh diturunkan');
  assert.ok(baseline.minMainWidth.mobile >= 320, 'lebar minimum mobile tidak boleh diturunkan');
  assert.ok(baseline.viewports.some((v) => v.mobile), 'viewport mobile wajib diuji');
  assert.ok(baseline.viewports.some((v) => !v.mobile), 'viewport desktop wajib diuji');
});
