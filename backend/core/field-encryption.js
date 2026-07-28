'use strict';
// Centralized application-layer envelope encryption for high-risk fields.
//
// Ciphertext carries a key ID, never the key. AES-256-GCM authenticates both
// the value and its stable purpose/scope so ciphertext cannot be copied to a
// different aggregate unnoticed. Blind indexes use a separate HMAC key so
// equality/uniqueness does not require decrypting every row.
const crypto = require('node:crypto');

const PREFIX = 'fe1';
const KEY_ID = /^[A-Za-z0-9._-]{1,48}$/;
const weak = (value = '') => String(value).length < 24
  || /CHANGE_ME|GENERATED_BY|password/i.test(String(value));

function derive(raw, domain) {
  return crypto.createHash('sha256').update(`${domain}\0${raw}`, 'utf8').digest();
}

function parsePrevious(raw) {
  if (!raw) return {};
  let parsed;
  try { parsed = JSON.parse(raw); } catch {
    throw new Error('FIELD_ENCRYPTION_CONFIG_INVALID: MAT_FIELD_ENCRYPTION_PREVIOUS_KEYS harus JSON object.');
  }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('FIELD_ENCRYPTION_CONFIG_INVALID: previous keys harus object keyId→secret.');
  }
  return parsed;
}

function configuration(env = process.env) {
  const production = (env.MAT_ENVIRONMENT || '').toUpperCase() === 'PRODUCTION'
    || env.NODE_ENV === 'production';
  const currentId = env.MAT_FIELD_ENCRYPTION_KEY_ID || (production ? '' : 'local-v1');
  const currentRaw = env.MAT_FIELD_ENCRYPTION_KEY
    || (production ? '' : env.MAT_MFA_ENCRYPTION_KEY);
  const blindRaw = env.MAT_FIELD_BLIND_INDEX_KEY
    || (production ? '' : env.MAT_MFA_ENCRYPTION_KEY);

  if (!KEY_ID.test(currentId)) {
    throw new Error('FIELD_ENCRYPTION_CONFIG_INVALID: MAT_FIELD_ENCRYPTION_KEY_ID tidak valid.');
  }
  if (weak(currentRaw)) {
    throw new Error('FIELD_ENCRYPTION_CONFIG_INVALID: current field-encryption key belum kuat.');
  }
  if (weak(blindRaw)) {
    throw new Error('FIELD_ENCRYPTION_CONFIG_INVALID: blind-index key belum kuat.');
  }
  if (production && currentRaw === blindRaw) {
    throw new Error('FIELD_ENCRYPTION_CONFIG_INVALID: encryption key dan blind-index key wajib terpisah di production.');
  }

  const keys = new Map([[currentId, derive(currentRaw, 'mat-erp-field-encryption')]]);
  for (const [id, secret] of Object.entries(parsePrevious(env.MAT_FIELD_ENCRYPTION_PREVIOUS_KEYS))) {
    if (!KEY_ID.test(id) || weak(secret)) {
      throw new Error(`FIELD_ENCRYPTION_CONFIG_INVALID: previous key '${id}' tidak valid.`);
    }
    if (!keys.has(id)) keys.set(id, derive(secret, 'mat-erp-field-encryption'));
  }
  return {
    currentId,
    keys,
    blindKey: derive(blindRaw, 'mat-erp-field-blind-index')
  };
}

function context({ purpose, scope }) {
  const p = String(purpose || '').trim();
  const s = String(scope || '').trim();
  if (!p || !s) throw new Error('FIELD_ENCRYPTION_CONTEXT_REQUIRED');
  return Buffer.from(`${p}\0${s}`, 'utf8');
}

function encrypt(value, options, env = process.env) {
  if (value === null || value === undefined) return null;
  const plaintext = String(value);
  const cfg = configuration(env);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', cfg.keys.get(cfg.currentId), iv);
  cipher.setAAD(context(options));
  const body = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return [
    PREFIX,
    cfg.currentId,
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    body.toString('base64url')
  ].join(':');
}

function parseCiphertext(value) {
  const parts = String(value || '').split(':');
  if (parts.length !== 5 || parts[0] !== PREFIX || !KEY_ID.test(parts[1])) {
    throw new Error('FIELD_ENCRYPTION_CIPHERTEXT_INVALID');
  }
  return { keyId: parts[1], iv: parts[2], tag: parts[3], body: parts[4] };
}

function decrypt(value, options, env = process.env) {
  if (value === null || value === undefined) return null;
  const parsed = parseCiphertext(value);
  const cfg = configuration(env);
  const key = cfg.keys.get(parsed.keyId);
  if (!key) throw new Error(`FIELD_ENCRYPTION_KEY_UNAVAILABLE:${parsed.keyId}`);
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(parsed.iv, 'base64url'));
    decipher.setAAD(context(options));
    decipher.setAuthTag(Buffer.from(parsed.tag, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(parsed.body, 'base64url')),
      decipher.final()
    ]).toString('utf8');
  } catch {
    throw new Error('FIELD_ENCRYPTION_AUTHENTICATION_FAILED');
  }
}

function blindIndex(value, purpose, env = process.env) {
  const cfg = configuration(env);
  const normalized = String(value || '').trim().replace(/[\s-]+/g, '').toUpperCase();
  return crypto.createHmac('sha256', cfg.blindKey)
    .update(`${purpose}\0${normalized}`, 'utf8').digest('hex');
}

function protect(value, options, env = process.env) {
  const ciphertext = encrypt(value, options, env);
  const cfg = configuration(env);
  const index = options.blind ? blindIndex(value, options.purpose, env) : null;
  return {
    ciphertext,
    keyId: cfg.currentId,
    blindIndex: index,
    legacyToken: index ? `ENC:${index.slice(0, 36)}` : '[ENCRYPTED]'
  };
}

function keyIdOf(value) { return parseCiphertext(value).keyId; }
function isEncrypted(value) { return String(value || '').startsWith(`${PREFIX}:`); }

module.exports = {
  PREFIX, configuration, encrypt, decrypt, blindIndex, protect, keyIdOf, isEncrypted
};
