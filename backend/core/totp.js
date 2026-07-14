'use strict';
// TOTP (RFC 6238) tanpa dependensi: HMAC-SHA1, langkah 30 detik, 6 digit.
// Kompatibel Google Authenticator / Microsoft Authenticator / Aegis.

const crypto = require('node:crypto');

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer) {
  let bits = 0, value = 0, output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { output += BASE32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(text) {
  const clean = String(text).toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0, value = 0;
  const bytes = [];
  for (const char of clean) {
    value = (value << 5) | BASE32.indexOf(char); bits += 5;
    if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(bytes);
}

function generateSecret() { return base32Encode(crypto.randomBytes(20)); }

function hotp(secret, counter) {
  const key = base32Decode(secret);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', key).update(message).digest();
  const offset = digest[digest.length - 1] & 0xf;
  const code = ((digest[offset] & 0x7f) << 24) | (digest[offset + 1] << 16) | (digest[offset + 2] << 8) | digest[offset + 3];
  return String(code % 1_000_000).padStart(6, '0');
}

// Terima jendela ±1 langkah (toleransi selisih jam perangkat).
function verify(secret, token, at = Date.now()) {
  if (!/^\d{6}$/.test(String(token || '').trim())) return false;
  const counter = Math.floor(at / 1000 / 30);
  return [-1, 0, 1].some((skew) => {
    const expected = hotp(secret, counter + skew);
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(token).trim()));
  });
}

function otpauthUrl(secret, account, issuer = 'MAT ERP V2') {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`;
}

module.exports = { generateSecret, hotp, verify, otpauthUrl };
