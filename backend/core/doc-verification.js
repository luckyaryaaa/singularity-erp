'use strict';
// Sprint 15 (R022) — verifikasi keaslian dokumen resmi tanpa penyimpanan
// tambahan. Kode verifikasi = HMAC-SHA256(secret, documentNumber) dipangkas.
// Dicetak pada dokumen (kode + QR) dan diverifikasi ulang oleh endpoint publik
// dengan membandingkan HMAC — sehingga dokumen palsu tidak dapat memalsukan
// kode tanpa mengetahui secret runtime.
const { createHmac } = require('node:crypto');

// Secret khusus verifikasi; jatuh ke secret runtime lain agar tidak pernah
// kosong (kode tetap konsisten selama secret sama).
function secret() {
  return process.env.MAT_DOC_VERIFY_SECRET
    || process.env.MAT_MFA_ENCRYPTION_KEY
    || process.env.MAT_BACKUP_ENCRYPTION_KEY
    || 'mat-erp-doc-verify-fallback-secret';
}

// Kode ringkas huruf-besar+angka (tanpa karakter ambigu) panjang 12.
function codeFor(documentNumber) {
  const digest = createHmac('sha256', secret()).update(String(documentNumber || '')).digest('hex');
  const alphabet = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // tanpa I/O
  let out = '';
  for (let i = 0; i < 12; i++) out += alphabet[parseInt(digest.slice(i * 2, i * 2 + 2), 16) % alphabet.length];
  return out;
}

function verify(documentNumber, code) {
  if (!documentNumber || !code) return false;
  const expected = codeFor(documentNumber);
  const given = String(code).toUpperCase().replace(/[^0-9A-Z]/g, '');
  // Perbandingan konstan-waktu sederhana.
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

module.exports = { codeFor, verify };
