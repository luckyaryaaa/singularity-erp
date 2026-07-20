'use strict';

const crypto = require('node:crypto');

const SCRYPT = Object.freeze({ N: 16384, r: 8, p: 1, keylen: 64 });

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(password, salt, SCRYPT.keylen, SCRYPT);
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

function verifyPassword(password, stored) {
  const [, salt, hex] = String(stored).split(':');
  if (!salt || !hex) return false;
  const derived = crypto.scryptSync(password, salt, SCRYPT.keylen, SCRYPT);
  const expected = Buffer.from(hex, 'hex');
  return expected.length === derived.length && crypto.timingSafeEqual(derived, expected);
}

module.exports = { SCRYPT, hashPassword, verifyPassword };
