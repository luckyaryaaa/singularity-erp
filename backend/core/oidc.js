'use strict';
// Provider-agnostic OpenID Connect / OAuth2 (Authorization Code) helper for social
// login. Google & Microsoft plug in purely via env credentials; a dev-only mock
// IdP (MAT_MOCK_IDP=1, non-production) lets the whole flow be exercised locally.
//
// Token exchange + userinfo run SERVER-SIDE (the client secret never reaches the
// browser); the frontend only performs a top-level redirect to the provider, so
// the strict CSP (connect-src 'self') is fully respected.
const crypto = require('node:crypto');
const { AppError } = require('./errors');

const PRODUCTION = process.env.NODE_ENV === 'production';

// Known OIDC endpoints. clientId/secret come from env; a provider is "enabled"
// only when both are present. '__self__' in the mock URLs is resolved to the
// running origin at request time.
function registry() {
  const msTenant = process.env.MICROSOFT_OAUTH_TENANT || 'common';
  return {
    google: {
      label: 'Google', icon: 'google',
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userinfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
      scope: 'openid email profile',
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
    },
    microsoft: {
      label: 'Microsoft', icon: 'microsoft',
      authUrl: `https://login.microsoftonline.com/${msTenant}/oauth2/v2.0/authorize`,
      tokenUrl: `https://login.microsoftonline.com/${msTenant}/oauth2/v2.0/token`,
      userinfoUrl: 'https://graph.microsoft.com/oidc/userinfo',
      scope: 'openid email profile',
      clientId: process.env.MICROSOFT_OAUTH_CLIENT_ID || '',
      clientSecret: process.env.MICROSOFT_OAUTH_CLIENT_SECRET || '',
    },
    mock: {
      label: 'Test IdP', icon: 'shield', dev: true,
      authUrl: '__self__/api/mock-idp/authorize',
      tokenUrl: '__self__/api/mock-idp/token',
      userinfoUrl: '__self__/api/mock-idp/userinfo',
      scope: 'openid email profile',
      clientId: 'mock-client', clientSecret: 'mock-secret',
    },
  };
}

function isEnabled(cfg) {
  if (!cfg) return false;
  if (cfg.dev) return !PRODUCTION && process.env.MAT_MOCK_IDP === '1';
  return Boolean(cfg.clientId && cfg.clientSecret);
}

function enabledProviders() {
  return Object.entries(registry())
    .filter(([, c]) => isEnabled(c))
    .map(([id, c]) => ({ id, label: c.label, icon: c.icon || id }));
}

function providerConfig(id) {
  const cfg = registry()[id];
  if (!isEnabled(cfg)) throw new AppError('VALIDATION_ERROR', `Provider login '${id}' tidak tersedia.`);
  return cfg;
}

function resolve(url, origin) { return String(url || '').startsWith('__self__') ? origin + url.slice('__self__'.length) : url; }

// ── Signed state (HMAC) — no server storage; bound to a per-request browser nonce ──
function stateSecret() {
  return process.env.OAUTH_STATE_SECRET || process.env.MAT_MFA_ENCRYPTION_KEY || 'dev-oauth-state-secret-change-me';
}
function b64url(input) { return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function fromB64url(s) { return Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64'); }
function signState(payload) {
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(crypto.createHmac('sha256', stateSecret()).update(body).digest());
  return `${body}.${sig}`;
}
function verifyState(token) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) throw new AppError('VALIDATION_ERROR', 'State OAuth tidak valid.');
  const expect = b64url(crypto.createHmac('sha256', stateSecret()).update(body).digest());
  const a = Buffer.from(sig); const b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new AppError('VALIDATION_ERROR', 'State OAuth gagal verifikasi.');
  const payload = JSON.parse(fromB64url(body).toString());
  if (!payload.t || Date.now() > payload.t) throw new AppError('SESSION_EXPIRED', 'Sesi login OAuth kedaluwarsa. Ulangi.');
  return payload;
}
function newNonce() { return crypto.randomBytes(16).toString('hex'); }

function redirectUriFor(id, origin) { return `${origin}/api/auth/oauth/${id}/callback`; }

function authorizeUrl(id, { redirectUri, state, nonce, origin, extra = {} }) {
  const cfg = providerConfig(id);
  const q = new URLSearchParams({
    response_type: 'code', client_id: cfg.clientId, redirect_uri: redirectUri,
    scope: cfg.scope, state, nonce, prompt: 'select_account', ...extra,
  });
  return `${resolve(cfg.authUrl, origin)}?${q.toString()}`;
}

async function exchangeCode(id, { code, redirectUri, origin }) {
  const cfg = providerConfig(id);
  const res = await fetch(resolve(cfg.tokenUrl, origin), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: cfg.clientId, client_secret: cfg.clientSecret }).toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new AppError('AUTH_FAILED', `Tukar kode ${cfg.label} gagal.`);
  return data;
}

async function fetchUserinfo(id, accessToken, origin) {
  const cfg = providerConfig(id);
  const res = await fetch(resolve(cfg.userinfoUrl, origin), { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !(data.sub || data.email)) throw new AppError('AUTH_FAILED', `Ambil profil ${cfg.label} gagal.`);
  return {
    provider: id,
    subject: String(data.sub || data.oid || data.email),
    email: (data.email || data.preferred_username || '').toLowerCase() || null,
    name: data.name || data.given_name || (data.email ? data.email.split('@')[0] : 'Pengguna'),
    picture: data.picture || null,
    raw: data,
  };
}

module.exports = {
  registry, isEnabled, enabledProviders, providerConfig,
  signState, verifyState, newNonce, redirectUriFor, authorizeUrl, exchangeCode, fetchUserinfo,
};
