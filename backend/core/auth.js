'use strict';
// Satu mesin autentikasi: scrypt hashing, sesi cookie HttpOnly, CSRF token,
// idle + absolute timeout, lockout brute-force, riwayat login, daftar perangkat.

const crypto = require('node:crypto');
const { store } = require('../infrastructure/database/store');
const { hashPassword, verifyPassword } = require('./password');
const { uid, token, sha256, nowIso } = require('./util');
const { AppError } = require('./errors');
const audit = require('./audit');
const totp = require('./totp');

const SESSION_IDLE_MS = 60 * 60 * 1000;        // 60 menit idle
const SESSION_ABSOLUTE_MS = 8 * 60 * 60 * 1000; // 8 jam absolut
const LOCK_THRESHOLD = 5;                       // 5 kegagalan → kunci
const LOCK_WINDOW_MS = 15 * 60 * 1000;          // per 15 menit

function publicUser(user) {
  const { passwordHash, ownerPinHash, failedLoginCount, lockedUntil, totpSecret, totpSecretPending, ...safe } = user;
  return { ...safe, mfaActive: !!(user.mfaEnabled && user.totpSecret) };
}

// Token tertunda (MFA / ganti sandi wajib) — umur 5 menit, maksimum 5 percobaan.
const PENDING_TTL_MS = 5 * 60 * 1000;
function createPending(kind, userId) {
  const plainToken = token(24);
  const row = { id: uid(), kind, userId, tokenHash: sha256(plainToken), attempts: 0, expiresAt: new Date(Date.now() + PENDING_TTL_MS).toISOString() };
  store.collection('auth_pending').insert(row);
  return plainToken;
}
function findPending(kind, pendingToken) {
  const rows = store.collection('auth_pending');
  const candidateHash = sha256(String(pendingToken || ''));
  const row = rows.findOne((r) => r.kind === kind && r.tokenHash === candidateHash);
  if (!row) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) { rows.delete(row.id); return null; }
  return row;
}

function createSession(user, ip, device) {
  const plainToken = token(32);
  const session = {
    id: uid(), tokenHash: sha256(plainToken), csrfToken: token(16), userId: user.id,
    createdAt: nowIso(), lastSeenAt: nowIso(),
    expiresAt: new Date(Date.now() + SESSION_ABSOLUTE_MS).toISOString(),
    ip: ip || null, device: device || 'unknown', active: true
  };
  store.collection('sessions').insert(session);
  audit.record({ user, action: 'LOGIN', module: 'auth', entityType: 'user', entityId: user.id, sessionId: session.id, ip, device });
  return { ...session, token: plainToken };
}

function login({ username, password, ip, device }) {
  const users = store.collection('users');
  const user = users.findOne((row) => row.username === username && row.active);
  const fail = (code, detail) => {
    audit.record({ action: 'LOGIN_FAILED', module: 'auth', entityType: 'user', entityId: user ? user.id : null, ip, device, newValue: { username } });
    throw new AppError(code, detail);
  };
  if (!user) fail('AUTH_FAILED');
  if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
    fail('ACCOUNT_LOCKED', `Akun terkunci hingga ${new Date(user.lockedUntil).toLocaleTimeString('id-ID')}.`);
  }
  if (!verifyPassword(password, user.passwordHash)) {
    const count = (user.failedLoginCount || 0) + 1;
    const patch = { failedLoginCount: count };
    if (count >= LOCK_THRESHOLD) { patch.lockedUntil = new Date(Date.now() + LOCK_WINDOW_MS).toISOString(); patch.failedLoginCount = 0; }
    users.update(user.id, patch);
    fail('AUTH_FAILED');
  }
  users.update(user.id, { failedLoginCount: 0, lockedUntil: null, lastLoginAt: nowIso() });

  // Sandi benar — cek gerbang lanjutan sebelum sesi diberikan.
  if (user.mustChangePassword) {
    return { passwordChangeRequired: true, changeToken: createPending('password_change', user.id) };
  }
  if (user.mfaEnabled && user.totpSecret) {
    return { mfaRequired: true, mfaToken: createPending('mfa', user.id) };
  }
  return { session: createSession(user, ip, device), user: publicUser(user) };
}

// Langkah kedua login ketika TOTP aktif.
function completeMfa({ mfaToken, code, ip, device }) {
  const pending = findPending('mfa', mfaToken);
  if (!pending) throw new AppError('SESSION_EXPIRED', 'Sesi verifikasi MFA kedaluwarsa. Masuk ulang dari awal.');
  const user = store.collection('users').get(pending.userId);
  if (!user || !totp.verify(user.totpSecret, code)) {
    const attempts = pending.attempts + 1;
    if (attempts >= 5) store.collection('auth_pending').delete(pending.id);
    else store.collection('auth_pending').update(pending.id, { attempts });
    audit.record({ action: 'LOGIN_FAILED', module: 'auth', entityType: 'user', entityId: pending.userId, ip, device, newValue: { reason: 'kode MFA salah' } });
    throw new AppError('AUTH_FAILED', 'Kode autentikator tidak valid.');
  }
  store.collection('auth_pending').delete(pending.id);
  return { session: createSession(user, ip, device), user: publicUser(user) };
}

function assertPasswordPolicy(newPassword) {
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    throw new AppError('VALIDATION_ERROR', 'Kata sandi baru minimal 8 karakter.');
  }
}

// Ganti sandi wajib (setelah reset admin) — token sekali pakai lalu auto-login.
function changePasswordWithToken({ changeToken, newPassword, ip, device }) {
  const pending = findPending('password_change', changeToken);
  if (!pending) throw new AppError('SESSION_EXPIRED', 'Tautan ganti sandi kedaluwarsa. Masuk ulang dari awal.');
  assertPasswordPolicy(newPassword);
  const users = store.collection('users');
  const user = users.get(pending.userId);
  users.update(user.id, { passwordHash: hashPassword(newPassword), mustChangePassword: false });
  store.collection('auth_pending').delete(pending.id);
  audit.record({ user, action: 'SETTINGS_CHANGE', module: 'auth', entityType: 'user', entityId: user.id, reason: 'Ganti sandi wajib setelah reset', ip, device });
  const fresh = users.get(user.id);
  if (fresh.mfaEnabled && fresh.totpSecret) return { mfaRequired: true, mfaToken: createPending('mfa', user.id) };
  return { session: createSession(fresh, ip, device), user: publicUser(fresh) };
}

function changeOwnPassword(user, currentPassword, newPassword) {
  const users = store.collection('users');
  const fresh = users.get(user.id);
  if (!verifyPassword(currentPassword || '', fresh.passwordHash)) throw new AppError('AUTH_FAILED', 'Kata sandi saat ini salah.');
  assertPasswordPolicy(newPassword);
  users.update(user.id, { passwordHash: hashPassword(newPassword) });
  audit.record({ user, action: 'SETTINGS_CHANGE', module: 'auth', entityType: 'user', entityId: user.id, reason: 'Ganti kata sandi mandiri' });
}

// Reset oleh admin/owner: sandi sementara sekali tampil + wajib ganti saat masuk.
function adminResetPassword(admin, targetUserId, reason) {
  if (!reason) throw new AppError('REASON_REQUIRED');
  const users = store.collection('users');
  const target = users.get(targetUserId);
  if (!target) throw new AppError('RESOURCE_NOT_FOUND', 'Pengguna tidak ditemukan.');
  // SEC-UAT-001: adapter in-memory tidak boleh menjadi jalan pintas kebijakan.
  // Owner server-only, dan reset diri sendiri lewat endpoint admin dilarang —
  // aturan yang sama dengan jalur PostgreSQL (password-reset.js).
  if (target.role === 'owner') throw new AppError('PERMISSION_DENIED', 'Akun Owner tidak dapat direset melalui aplikasi. Gunakan prosedur pemulihan server.', { reasonCode: 'OWNER_PASSWORD_RESET_SERVER_ONLY' });
  if (String(admin.id) === String(target.id)) throw new AppError('PERMISSION_DENIED', 'Reset akun sendiri lewat endpoint admin tidak diizinkan.', { reasonCode: 'USE_SELF_SERVICE_PASSWORD_CHANGE' });
  if (['system_admin', 'security_admin', 'admin'].includes(target.role) && admin.role !== 'owner') throw new AppError('PERMISSION_DENIED', 'Reset akun administrator lain hanya dapat dilakukan Owner.', { reasonCode: 'PRIVILEGED_RESET_REQUIRES_OWNER' });
  const tempPassword = `MAT-${crypto.randomBytes(4).toString('hex')}`;
  users.update(target.id, { passwordHash: hashPassword(tempPassword), mustChangePassword: true, failedLoginCount: 0, lockedUntil: null });
  const sessions = store.collection('sessions');
  for (const row of sessions.find((s) => s.userId === target.id && s.active)) {
    sessions.update(row.id, { active: false, endedAt: nowIso(), endReason: 'password_reset' });
  }
  audit.record({ user: admin, action: 'SETTINGS_CHANGE', module: 'user', entityType: 'user', entityId: target.id, reason, newValue: { event: 'password_reset', target: target.username } });
  return tempPassword;
}

// Pendaftaran TOTP: setup → verifikasi kode → aktif.
function startMfaSetup(user) {
  const secret = totp.generateSecret();
  store.collection('users').update(user.id, { totpSecretPending: secret });
  return { secret, otpauthUrl: totp.otpauthUrl(secret, user.username) };
}

function enableMfa(user, code) {
  const fresh = store.collection('users').get(user.id);
  if (!fresh.totpSecretPending) throw new AppError('VALIDATION_ERROR', 'Mulai pendaftaran MFA terlebih dahulu.');
  if (!totp.verify(fresh.totpSecretPending, code)) throw new AppError('AUTH_FAILED', 'Kode autentikator tidak valid. Periksa jam perangkat Anda.');
  store.collection('users').update(user.id, { totpSecret: fresh.totpSecretPending, totpSecretPending: null, mfaEnabled: true });
  audit.record({ user, action: 'SETTINGS_CHANGE', module: 'auth', entityType: 'user', entityId: user.id, reason: 'Mengaktifkan MFA (TOTP)' });
}

function disableMfa(user, password) {
  const fresh = store.collection('users').get(user.id);
  if (!verifyPassword(password || '', fresh.passwordHash)) throw new AppError('AUTH_FAILED', 'Kata sandi salah.');
  store.collection('users').update(user.id, { totpSecret: null, totpSecretPending: null });
  audit.record({ user, action: 'SETTINGS_CHANGE', module: 'auth', entityType: 'user', entityId: user.id, reason: 'Menonaktifkan MFA (TOTP)' });
}

function resolveSession(sessionToken) {
  if (!sessionToken) return null;
  const sessions = store.collection('sessions');
  const candidateHash = sha256(String(sessionToken));
  const session = sessions.findOne((row) => row.tokenHash === candidateHash && row.active);
  if (!session) return null;
  const now = Date.now();
  const idleDeadline = new Date(session.lastSeenAt).getTime() + SESSION_IDLE_MS;
  if (now > idleDeadline || now > new Date(session.expiresAt).getTime()) {
    sessions.update(session.id, { active: false, endedAt: nowIso(), endReason: 'expired' });
    return null;
  }
  sessions.update(session.id, { lastSeenAt: nowIso() });
  const user = store.collection('users').get(session.userId);
  if (!user || !user.active) return null;
  return { session, user };
}

function logout(session, user) {
  store.collection('sessions').update(session.id, { active: false, endedAt: nowIso(), endReason: 'logout' });
  audit.record({ user, action: 'LOGOUT', module: 'auth', entityType: 'user', entityId: user.id, sessionId: session.id });
}

function logoutAll(user) {
  const sessions = store.collection('sessions');
  for (const row of sessions.find((s) => s.userId === user.id && s.active)) {
    sessions.update(row.id, { active: false, endedAt: nowIso(), endReason: 'logout_all' });
  }
  audit.record({ user, action: 'LOGOUT', module: 'auth', entityType: 'user', entityId: user.id, reason: 'Keluar dari semua perangkat' });
}

function deviceList(user) {
  return store.collection('sessions')
    .find((row) => row.userId === user.id)
    .sort((a, b) => (a.lastSeenAt < b.lastSeenAt ? 1 : -1))
    .slice(0, 20)
    .map(({ token: _t, tokenHash: _th, csrfToken: _c, ...safe }) => safe);
}

function verifyOwnerPin(user, pin) {
  if (!user.ownerPinHash || !pin || !verifyPassword(String(pin), user.ownerPinHash)) {
    throw new AppError('PIN_REQUIRED', 'PIN Owner tidak valid untuk tindakan kritis ini.');
  }
  return true;
}

module.exports = { hashPassword, verifyPassword, login, logout, logoutAll, resolveSession, deviceList, publicUser, verifyOwnerPin, completeMfa, changePasswordWithToken, changeOwnPassword, adminResetPassword, startMfaSetup, enableMfa, disableMfa, SESSION_IDLE_MS, SESSION_ABSOLUTE_MS };
