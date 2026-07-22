'use strict';

const crypto = require('node:crypto');

// B6 — parameter hash BER-VERSI. Format lama `scrypt:<salt>:<hex>` tidak
// menyimpan parameternya sama sekali, sehingga menaikkan biaya kerja akan
// membuat SELURUH sandi lama gagal diverifikasi (semua orang terkunci).
// Format baru menuliskan parameternya di dalam hash, jadi cost dapat dinaikkan
// kapan saja tanpa memutus akun yang sudah ada — hash lama tetap terbaca dengan
// parameternya sendiri dan di-upgrade diam-diam saat pemiliknya berhasil masuk.
//
//   v2  →  scrypt$2$N=<N>,r=<r>,p=<p>,l=<keylen>$<salt>$<hex>
//   v1  →  scrypt:<salt>:<hex>            (diasumsikan N=16384,r=8,p=1,l=64)
const SCRYPT = Object.freeze({ N: 65536, r: 8, p: 1, keylen: 64, maxmem: 128 * 65536 * 8 * 2 });
const LEGACY_SCRYPT = Object.freeze({ N: 16384, r: 8, p: 1, keylen: 64 });
const CURRENT_VERSION = 2;

const derive = (password, salt, params) =>
  crypto.scryptSync(password, salt, params.keylen, { N: params.N, r: params.r, p: params.p, maxmem: params.maxmem || 128 * params.N * params.r * 2 });

function format(salt, params, derived) {
  return `scrypt$${CURRENT_VERSION}$N=${params.N},r=${params.r},p=${params.p},l=${params.keylen}$${salt}$${derived.toString('hex')}`;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return format(salt, SCRYPT, derive(password, salt, SCRYPT));
}

// Mengurai kedua format. Mengembalikan null bila tidak dikenal supaya
// verifikasi gagal tertutup, bukan melempar.
function parseHash(stored) {
  const value = String(stored || '');
  if (value.startsWith('scrypt$')) {
    const [, version, paramText, salt, hex] = value.split('$');
    if (!salt || !hex) return null;
    const params = { ...LEGACY_SCRYPT };
    for (const pair of String(paramText || '').split(',')) {
      const [key, raw] = pair.split('=');
      const num = Number(raw);
      if (!Number.isFinite(num)) return null;
      if (key === 'N') params.N = num; else if (key === 'r') params.r = num;
      else if (key === 'p') params.p = num; else if (key === 'l') params.keylen = num;
    }
    return { version: Number(version) || 1, params, salt, hex };
  }
  const [scheme, salt, hex] = value.split(':');
  if (scheme !== 'scrypt' || !salt || !hex) return null;
  return { version: 1, params: { ...LEGACY_SCRYPT }, salt, hex };
}

function verifyPassword(password, stored) {
  const parsed = parseHash(stored);
  if (!parsed) return false;
  let derived;
  try { derived = derive(password, parsed.salt, parsed.params); } catch { return false; }
  const expected = Buffer.from(parsed.hex, 'hex');
  return expected.length === derived.length && crypto.timingSafeEqual(derived, expected);
}

// True bila hash tersimpan memakai versi/parameter di bawah standar sekarang.
// Pemanggil (jalur login) memakainya untuk menulis ulang hash setelah kata
// sandi terbukti benar — satu-satunya saat plaintext tersedia.
function needsRehash(stored) {
  const parsed = parseHash(stored);
  if (!parsed) return false;
  return parsed.version < CURRENT_VERSION || parsed.params.N < SCRYPT.N
    || parsed.params.r < SCRYPT.r || parsed.params.keylen < SCRYPT.keylen;
}

module.exports = { SCRYPT, LEGACY_SCRYPT, CURRENT_VERSION, hashPassword, verifyPassword, needsRehash, parseHash };
