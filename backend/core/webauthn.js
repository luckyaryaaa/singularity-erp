'use strict';
// WebAuthn (passkey / fingerprint) — verifikasi zero-dependency.
// Mendukung authenticator platform umum (Windows Hello, Touch ID, Android):
// algoritma ES256 (-7) dan RS256 (-257). Attestation 'none'/self diterima tanpa
// verifikasi rantai sertifikat (praktik lazim untuk passkey), namun tanda tangan
// assertion tetap diverifikasi penuh terhadap kunci publik yang tersimpan.
const crypto = require('crypto');
const { AppError } = require('./errors');

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (str) => Buffer.from(String(str).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest();

// ── Minimal CBOR decoder (subset yang dipakai WebAuthn) ──────────────────────
function decodeItem(buf, pos) {
  const first = buf[pos]; const major = first >> 5; const info = first & 0x1f; pos += 1;
  let len = info;
  if (info === 24) { len = buf[pos]; pos += 1; }
  else if (info === 25) { len = buf.readUInt16BE(pos); pos += 2; }
  else if (info === 26) { len = buf.readUInt32BE(pos); pos += 4; }
  else if (info === 27) { len = Number(buf.readBigUInt64BE(pos)); pos += 8; }
  switch (major) {
    case 0: return [len, pos];                       // unsigned int
    case 1: return [-1 - len, pos];                  // negative int
    case 2: { const v = buf.subarray(pos, pos + len); return [v, pos + len]; }            // byte string
    case 3: { const v = buf.subarray(pos, pos + len).toString('utf8'); return [v, pos + len]; } // text
    case 4: { const arr = []; for (let i = 0; i < len; i++) { const [v, np] = decodeItem(buf, pos); arr.push(v); pos = np; } return [arr, pos]; }
    case 5: { const map = new Map(); for (let i = 0; i < len; i++) { const [k, kp] = decodeItem(buf, pos); const [v, vp] = decodeItem(buf, kp); map.set(k, v); pos = vp; } return [map, pos]; }
    case 7: { if (info === 20) return [false, pos]; if (info === 21) return [true, pos]; if (info === 22) return [null, pos]; return [undefined, pos]; }
    default: throw new AppError('VALIDATION_ERROR', 'Format kredensial tidak dikenal.');
  }
}
const decodeCbor = (buf) => decodeItem(buf, 0)[0];

// ── authenticatorData ────────────────────────────────────────────────────────
function parseAuthData(buf) {
  if (buf.length < 37) throw new AppError('VALIDATION_ERROR', 'authenticatorData tidak valid.');
  const rpIdHash = buf.subarray(0, 32);
  const flags = buf[32];
  const signCount = buf.readUInt32BE(33);
  const out = { rpIdHash, flags, userPresent: !!(flags & 0x01), userVerified: !!(flags & 0x04), signCount };
  if (flags & 0x40) { // AT: attested credential data present
    const credIdLen = buf.readUInt16BE(53);
    out.credId = buf.subarray(55, 55 + credIdLen);
    const [cose] = decodeItem(buf, 55 + credIdLen);
    out.cose = cose;
  }
  return out;
}

// ── COSE key → JWK ───────────────────────────────────────────────────────────
function coseToJwk(cose) {
  const kty = cose.get(1);
  if (kty === 2) { // EC2 (ES256 P-256)
    return { kty: 'EC', crv: 'P-256', x: b64url(cose.get(-2)), y: b64url(cose.get(-3)), alg: cose.get(3) || -7 };
  }
  if (kty === 3) { // RSA (RS256)
    return { kty: 'RSA', n: b64url(cose.get(-1)), e: b64url(cose.get(-2)), alg: cose.get(3) || -257 };
  }
  throw new AppError('VALIDATION_ERROR', 'Tipe kunci authenticator tidak didukung.');
}
function jwkToKeyObject(jwk) {
  return crypto.createPublicKey({ key: { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, n: jwk.n, e: jwk.e }, format: 'jwk' });
}

function checkClientData(clientDataJSON, type, expectedChallenge, expectedOrigin) {
  let data;
  try { data = JSON.parse(Buffer.from(clientDataJSON).toString('utf8')); } catch { throw new AppError('VALIDATION_ERROR', 'clientData tidak valid.'); }
  if (data.type !== type) throw new AppError('VALIDATION_ERROR', 'Tipe ceremony WebAuthn tidak sesuai.');
  if (data.challenge !== expectedChallenge) throw new AppError('AUTH_FAILED', 'Challenge passkey tidak cocok.');
  if (expectedOrigin && data.origin !== expectedOrigin) throw new AppError('AUTH_FAILED', 'Origin passkey tidak dipercaya.');
  return data;
}

// ── Registration (enrol passkey) ────────────────────────────────────────────
function verifyRegistration({ attestationObject, clientDataJSON, expectedChallenge, expectedOrigin, rpId }) {
  const cdj = fromB64url(clientDataJSON);
  checkClientData(cdj, 'webauthn.create', expectedChallenge, expectedOrigin);
  const att = decodeCbor(fromB64url(attestationObject));
  const authData = parseAuthData(att.get('authData'));
  if (!authData.userPresent) throw new AppError('AUTH_FAILED', 'Kehadiran pengguna tidak terverifikasi.');
  if (Buffer.compare(authData.rpIdHash, sha256(Buffer.from(rpId))) !== 0) throw new AppError('AUTH_FAILED', 'RP ID passkey tidak cocok.');
  if (!authData.credId || !authData.cose) throw new AppError('VALIDATION_ERROR', 'Data kredensial tidak lengkap.');
  const jwk = coseToJwk(authData.cose);
  jwkToKeyObject(jwk); // validasi kunci dapat diimpor
  return { credentialId: b64url(authData.credId), publicKeyJwk: jwk, signCount: authData.signCount, userVerified: authData.userVerified };
}

// ── Assertion (login dengan passkey) ─────────────────────────────────────────
function verifyAssertion({ authenticatorData, clientDataJSON, signature, publicKeyJwk, expectedChallenge, expectedOrigin, rpId, storedSignCount }) {
  const cdj = fromB64url(clientDataJSON);
  checkClientData(cdj, 'webauthn.get', expectedChallenge, expectedOrigin);
  const authData = fromB64url(authenticatorData);
  const parsed = parseAuthData(authData);
  if (!parsed.userPresent) throw new AppError('AUTH_FAILED', 'Kehadiran pengguna tidak terverifikasi.');
  if (Buffer.compare(parsed.rpIdHash, sha256(Buffer.from(rpId))) !== 0) throw new AppError('AUTH_FAILED', 'RP ID passkey tidak cocok.');
  const signedData = Buffer.concat([authData, sha256(cdj)]);
  const key = jwkToKeyObject(publicKeyJwk);
  const alg = publicKeyJwk.alg;
  const sig = fromB64url(signature);
  let ok = false;
  if (publicKeyJwk.kty === 'EC') ok = crypto.verify('sha256', signedData, { key, dsaEncoding: 'der' }, sig);
  else if (publicKeyJwk.kty === 'RSA') ok = crypto.verify('sha256', signedData, key, sig);
  if (!ok) throw new AppError('AUTH_FAILED', 'Tanda tangan passkey tidak valid.');
  // Cegah cloning: sign count harus naik (kecuali authenticator yang selalu 0).
  if (parsed.signCount !== 0 && storedSignCount !== 0 && parsed.signCount <= storedSignCount) {
    throw new AppError('AUTH_FAILED', 'Passkey terdeteksi digunakan ulang (sign count mundur).');
  }
  void alg;
  return { newSignCount: parsed.signCount, userVerified: parsed.userVerified };
}

const randomChallenge = () => b64url(crypto.randomBytes(32));

module.exports = { b64url, fromB64url, verifyRegistration, verifyAssertion, randomChallenge };
