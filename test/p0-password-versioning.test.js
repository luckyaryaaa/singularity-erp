'use strict';
// B6 — hash kata sandi ber-versi: cost dapat dinaikkan tanpa mengunci akun lama.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const password = require('../backend/core/password');

const legacyHash = (plain, salt = crypto.randomBytes(16).toString('hex')) =>
  `scrypt:${salt}:${crypto.scryptSync(plain, salt, password.LEGACY_SCRYPT.keylen, password.LEGACY_SCRYPT).toString('hex')}`;

test('B6: hash lama tanpa parameter tetap terverifikasi', () => {
  const stored = legacyHash('SandiLamaSaya1!');
  assert.equal(password.verifyPassword('SandiLamaSaya1!', stored), true, 'pengguna lama tidak boleh terkunci');
  assert.equal(password.verifyPassword('SandiSalah1!', stored), false);
  assert.equal(password.needsRehash(stored), true, 'hash lama wajib ditandai untuk di-upgrade');
});

test('B6: hash baru menyimpan parameternya sendiri', () => {
  const stored = password.hashPassword('SandiBaruSaya1!');
  assert.match(stored, /^scrypt\$2\$N=\d+,r=\d+,p=\d+,l=\d+\$/);
  const parsed = password.parseHash(stored);
  assert.equal(parsed.version, password.CURRENT_VERSION);
  assert.equal(parsed.params.N, password.SCRYPT.N);
  assert.equal(password.verifyPassword('SandiBaruSaya1!', stored), true);
  assert.equal(password.verifyPassword('SandiBaruSaya1', stored), false);
  assert.equal(password.needsRehash(stored), false, 'hash terkini tidak perlu di-upgrade');
});

test('B6: parameter tersimpan yang dipakai, bukan parameter global saat ini', () => {
  // Hash dibuat dengan N lebih rendah; verifikasi WAJIB memakai N dari hash itu.
  // Inilah yang membuat kenaikan cost tidak memutus akun yang sudah ada.
  const salt = crypto.randomBytes(16).toString('hex');
  const weak = { N: 4096, r: 8, p: 1, keylen: 64 };
  const derived = crypto.scryptSync('SandiSedang1!', salt, weak.keylen, weak);
  const stored = `scrypt$2$N=${weak.N},r=${weak.r},p=${weak.p},l=${weak.keylen}$${salt}$${derived.toString('hex')}`;
  assert.equal(password.verifyPassword('SandiSedang1!', stored), true);
  assert.equal(password.needsRehash(stored), true, 'N di bawah standar wajib di-upgrade');
});

test('B6: biaya kerja tidak turun dari standar sebelumnya', () => {
  assert.ok(password.SCRYPT.N >= password.LEGACY_SCRYPT.N * 2, 'cost wajib naik, bukan turun');
  assert.ok(password.SCRYPT.keylen >= password.LEGACY_SCRYPT.keylen);
});

test('B6: hash rusak atau tidak dikenal gagal tertutup, tidak melempar', () => {
  for (const bad of ['', null, undefined, 'bukan-hash', 'scrypt:', 'scrypt:salt', 'bcrypt$2$x$y$z', 'scrypt$2$N=abc$salt$ff']) {
    assert.equal(password.verifyPassword('apa pun', bad), false, `hash '${bad}' harus gagal, bukan error`);
    assert.equal(password.needsRehash(bad), false);
  }
});
