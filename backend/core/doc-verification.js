'use strict';
// Sprint 15 (R022) — verifikasi keaslian dokumen resmi tanpa penyimpanan
// tambahan. Kode verifikasi = HMAC-SHA256(secret, documentNumber) dipangkas.
// Dicetak pada dokumen (kode + QR) dan diverifikasi ulang oleh endpoint publik
// dengan membandingkan HMAC — sehingga dokumen palsu tidak dapat memalsukan
// kode tanpa mengetahui secret runtime.
const { createHmac, timingSafeEqual } = require('node:crypto');

// Production wajib memakai key terpisah. Development boleh memakai secret
// runtime lokal agar setup ringan, tetapi tidak ada fallback statis di source.
function secret(env = process.env, requestedKeyId = keyId(env)) {
  if (requestedKeyId !== keyId(env)) {
    if (requestedKeyId === String(env.MAT_DOC_VERIFY_PREVIOUS_KEY_ID || '') && env.MAT_DOC_VERIFY_PREVIOUS_SECRET) return env.MAT_DOC_VERIFY_PREVIOUS_SECRET;
    throw new Error(`Key verifikasi dokumen '${requestedKeyId}' tidak tersedia.`);
  }
  if (env.MAT_DOC_VERIFY_SECRET) return env.MAT_DOC_VERIFY_SECRET;
  if ((env.MAT_ENVIRONMENT || '').toUpperCase() === 'PRODUCTION' || env.NODE_ENV === 'production') {
    throw new Error('MAT_DOC_VERIFY_SECRET wajib dikonfigurasi di production.');
  }
  const local = env.MAT_MFA_ENCRYPTION_KEY || env.MAT_BACKUP_ENCRYPTION_KEY;
  if (!local) throw new Error('Secret verifikasi dokumen belum dikonfigurasi.');
  return local;
}

function keyId(env = process.env) { return String(env.MAT_DOC_VERIFY_KEY_ID || 'v1').slice(0, 40); }

function canonical(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.keys(value).sort().reduce((out, key) => { out[key] = canonical(value[key]); return out; }, {});
  return value ?? null;
}

function compact(digest) {
  const alphabet = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let out = '';
  for (let i = 0; i < 12; i++) out += alphabet[parseInt(digest.slice(i * 2, i * 2 + 2), 16) % alphabet.length];
  return out;
}

function signPayload(payload, env = process.env, requestedKeyId = keyId(env)) {
  const body = JSON.stringify({ keyId: requestedKeyId, payload: canonical(payload) });
  return compact(createHmac('sha256', secret(env, requestedKeyId)).update(body).digest('hex'));
}

// Kode ringkas huruf-besar+angka (tanpa karakter ambigu) panjang 12.
function codeFor(documentNumber) {
  return signPayload({ documentNumber: String(documentNumber || '') });
}

function constantEqual(expected, code) {
  const given = String(code).toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

function verify(documentNumber, code) {
  if (!documentNumber || !code) return false;
  return constantEqual(codeFor(documentNumber), code);
}

function verifyPayload(payload, code, env = process.env, requestedKeyId = keyId(env)) {
  if (!payload || !code) return false;
  return constantEqual(signPayload(payload, env, requestedKeyId), code);
}

module.exports = { codeFor, verify, signPayload, verifyPayload, keyId, canonical };
