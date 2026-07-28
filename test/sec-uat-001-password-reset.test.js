'use strict';
// SEC-UAT-001 — reproduksi dan penutupan: role privileged mereset akun Owner.
//
// Insiden UAT: system_admin berhasil POST reset-password terhadap Owner dan
// menerima kata sandi sementara. Endpoint memeriksa izin & MFA AKTOR tetapi
// tidak pernah mengklasifikasi TARGET. Uji ini menegakkan matriks reset penuh.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const policy = require('../backend/infrastructure/database/repositories/password-reset');
const auth = require('../backend/infrastructure/database/repositories/auth');
const { verifyPassword } = require('../backend/core/password');

const dbTest = process.env.DATABASE_URL ? test : test.skip;
async function rollback(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try { await client.query('BEGIN'); await client.query("SELECT set_config('app.is_system','on',true)"); await fn(client); }
  finally { await client.query('ROLLBACK').catch(() => {}); await client.end(); }
}
let seq = 0;
async function makeUser(client, role) {
  const branch = (await client.query('SELECT id FROM branches WHERE active ORDER BY code LIMIT 1')).rows[0];
  const id = randomUUID();
  await client.query(
    `INSERT INTO app_users(id,username,password_hash,display_name,branch_id,role,branch_scope,must_change_password,mfa_enabled)
     VALUES($1,$2,$3,$4,$5,$6,'*',false,true)`,
    [id, `sec-${role}-${(seq += 1)}-${Date.now().toString(36)}`, auth.hashPassword('InitialPass1!'), `Uji ${role}`, branch.id, role]);
  // Assignment aktif supaya peran efektif (bukan hanya kolom legacy) terbaca.
  await client.query(
    `INSERT INTO user_role_assignments(id,user_id,role_code,scope_type,status,is_primary,reason,approved_at)
     VALUES($1,$2,$3,'GLOBAL','ACTIVE',true,'Uji SEC-UAT-001',now())`,
    [randomUUID(), id, role]);
  return { id, role, branchId: branch.id, branchScope: '*', displayName: `Uji ${role}` };
}

// Reset lewat layanan kebijakan — jalur yang sama dengan route setelah gate MFA.
const attempt = (client, actor, target, reason = 'Uji reset terkontrol.') =>
  policy.reset(client, { actor, targetId: target.id, reason, requestId: randomUUID() });

dbTest('SEC-UAT-001: system_admin TIDAK dapat mereset Owner (reproduksi + tutup)', async () => rollback(async (client) => {
  const owner = await makeUser(client, 'owner');
  const sysadmin = await makeUser(client, 'system_admin');

  // Inti insiden: dulu mengembalikan tempPassword. Kini WAJIB ditolak.
  await assert.rejects(() => attempt(client, sysadmin, owner),
    (e) => e.code === 'PERMISSION_DENIED' && e.extra.reasonCode === 'OWNER_PASSWORD_RESET_SERVER_ONLY',
    'system_admin mereset Owner wajib ditolak (server-only)');

  // Kata sandi Owner TIDAK berubah.
  assert.equal(verifyPassword('InitialPass1!', (await client.query('SELECT password_hash FROM app_users WHERE id=$1', [owner.id])).rows[0].password_hash), true,
    'kata sandi Owner tidak boleh berubah setelah upaya reset ditolak');
  // Penolakan tercatat di audit — tanpa kata sandi.
  const denied = (await client.query(
    `SELECT new_value FROM audit_logs WHERE entity_id=$1 AND action='PASSWORD_RESET_DENIED' ORDER BY occurred_at DESC LIMIT 1`, [owner.id])).rows[0];
  assert.equal(denied.new_value.reasonCode, 'OWNER_PASSWORD_RESET_SERVER_ONLY');
}));

dbTest('SEC-UAT-001: Owner tidak dapat direset oleh siapa pun, termasuk Owner lain', async () => rollback(async (client) => {
  const owner = await makeUser(client, 'owner');
  const owner2 = await makeUser(client, 'owner');
  const secadmin = await makeUser(client, 'security_admin');

  for (const actor of [owner, owner2, secadmin]) {
    await assert.rejects(() => attempt(client, actor, owner),
      (e) => e.code === 'PERMISSION_DENIED' && e.extra.reasonCode === 'OWNER_PASSWORD_RESET_SERVER_ONLY',
      `${actor.role} mereset Owner wajib ditolak`);
  }
}));

dbTest('SEC-UAT-001: reset admin memakai maker-checker dua Owner berbeda', async () => rollback(async (client) => {
  const owner = await makeUser(client, 'owner');
  const checker = await makeUser(client, 'owner');
  const sysadmin = await makeUser(client, 'system_admin');
  const secadmin = await makeUser(client, 'security_admin');

  // system_admin → security_admin: DENY.
  await assert.rejects(() => attempt(client, sysadmin, secadmin),
    (e) => e.extra.reasonCode === 'PRIVILEGED_RESET_REQUIRES_OWNER');
  // system_admin → system_admin lain: DENY.
  const sysadmin2 = await makeUser(client, 'system_admin');
  await assert.rejects(() => attempt(client, sysadmin, sysadmin2),
    (e) => e.extra.reasonCode === 'PRIVILEGED_RESET_REQUIRES_OWNER');
  // Security Admin boleh mengajukan, tetapi jalur reset langsung tidak pernah mengeksekusi.
  const secadmin2 = await makeUser(client, 'security_admin');
  await assert.rejects(() => attempt(client, secadmin, secadmin2),
    (e) => e.code === 'STATUS_INVALID' && e.extra.reasonCode === 'PRIVILEGED_RESET_APPROVAL_REQUIRED');

  // Jalur reset langsung juga tidak boleh melewati maker-checker.
  await assert.rejects(() => attempt(client, owner, sysadmin),
    (e) => e.code === 'STATUS_INVALID' && e.extra.reasonCode === 'PRIVILEGED_RESET_APPROVAL_REQUIRED');

  const request = await policy.requestPrivileged(client, {
    actor: secadmin,
    targetId: sysadmin.id,
    reason: 'Pemulihan akun administrator setelah verifikasi identitas.',
    requestId: randomUUID()
  });
  assert.equal(request.status, 'PENDING');

  const result = await policy.approveRequest(client, {
    actor: owner,
    id: request.id,
    reason: 'Identitas dan tiket insiden sudah diverifikasi.',
    requestId: randomUUID()
  });
  assert.equal(result.ok, true);
  assert.ok(result.resetOperationId);
  assert.equal(result.mustChangePassword, true);
  assert.equal(result.request.status, 'COMPLETED');
  assert.ok(result.resetToken);
  assert.equal(verifyPassword('InitialPass1!',
    (await client.query('SELECT password_hash FROM app_users WHERE id=$1', [sysadmin.id])).rows[0].password_hash), false);
  await auth.changePasswordWithToken(client, {
    changeToken: result.resetToken,
    newPassword: 'Fresh!Admin-Reset-Password-9281',
    ip: '127.0.0.1',
    device: 'SEC-UAT-001'
  });
  assert.equal(verifyPassword('Fresh!Admin-Reset-Password-9281',
    (await client.query('SELECT password_hash FROM app_users WHERE id=$1', [sysadmin.id])).rows[0].password_hash), true);

  const ownerMade = await policy.requestPrivileged(client, {
    actor: owner,
    targetId: secadmin2.id,
    reason: 'Pemulihan akun administrator kedua untuk uji SoD.',
    requestId: randomUUID()
  });
  await assert.rejects(() => policy.approveRequest(client, {
    actor: owner,
    id: ownerMade.id,
    reason: 'Menyetujui permintaan sendiri.',
    requestId: randomUUID()
  }), (e) => e.code === 'SOD_CONFLICT');
  await policy.rejectRequest(client, {
    actor: checker,
    id: ownerMade.id,
    reason: 'Menutup fixture maker-checker setelah bukti SoD.',
    requestId: randomUUID()
  });
}));

dbTest('SEC-UAT-001: reset diri sendiri lewat endpoint admin dilarang', async () => rollback(async (client) => {
  for (const role of ['system_admin', 'security_admin', 'owner']) {
    const u = await makeUser(client, role);
    await assert.rejects(() => attempt(client, u, u),
      (e) => e.extra.reasonCode === (role === 'owner' ? 'OWNER_PASSWORD_RESET_SERVER_ONLY' : 'USE_SELF_SERVICE_PASSWORD_CHANGE'),
      `${role} reset diri sendiri wajib ditolak`);
  }
}));

dbTest('SEC-UAT-001: reset user standar berhasil dan menerapkan seluruh efeknya', async () => rollback(async (client) => {
  const sysadmin = await makeUser(client, 'system_admin');
  const target = await makeUser(client, 'sales');
  // Kunci akun + sesi + tantangan menggantung untuk membuktikan semuanya dibersihkan.
  await client.query(`UPDATE app_users SET failed_login_count=5,locked_until=now()+interval '10 min' WHERE id=$1`, [target.id]);
  await client.query(`INSERT INTO user_sessions(id,user_id,token_hash,csrf_token_hash,expires_at,ip,device,last_ip,last_device)
    VALUES($1,$2,$3,$4,now()+interval '1 hour','127.0.0.1','t','127.0.0.1','t')`, [randomUUID(), target.id, randomUUID(), randomUUID()]);
  await client.query(`INSERT INTO auth_pending(id,kind,user_id,token_hash,expires_at) VALUES($1,'mfa',$2,$3,now()+interval '5 min')`, [randomUUID(), target.id, randomUUID()]);

  const before = (await client.query('SELECT password_hash FROM app_users WHERE id=$1', [target.id])).rows[0].password_hash;
  const result = await attempt(client, sysadmin, target, 'Karyawan lupa kata sandi, verifikasi identitas via HR.');
  assert.equal(result.ok, true);

  const after = (await client.query('SELECT password_hash,must_change_password,failed_login_count,locked_until FROM app_users WHERE id=$1', [target.id])).rows[0];
  assert.notEqual(after.password_hash, before, 'hash kata sandi wajib berubah');
  assert.equal(after.must_change_password, true, 'wajib ganti sandi saat masuk');
  assert.equal(after.failed_login_count, 0, 'penghitung gagal login dibersihkan');
  assert.equal(after.locked_until, null, 'kunci akun dibuka');
  assert.equal(Number((await client.query("SELECT count(*) n FROM user_sessions WHERE user_id=$1 AND active", [target.id])).rows[0].n), 0, 'seluruh sesi dicabut');
  assert.equal(Number((await client.query("SELECT count(*) n FROM auth_pending WHERE user_id=$1 AND kind='password_change'", [target.id])).rows[0].n), 1, 'satu token reset ter-hash diterbitkan');
  // Kata sandi lama gagal; token sekali pakai menetapkan sandi baru.
  assert.equal(verifyPassword('InitialPass1!', after.password_hash), false, 'kata sandi lama wajib gagal');
  await auth.changePasswordWithToken(client, {
    changeToken: result.resetToken,
    newPassword: 'Fresh!Standard-Reset-Password-9281',
    ip: '127.0.0.1',
    device: 'SEC-UAT-001'
  });
  assert.equal(verifyPassword('Fresh!Standard-Reset-Password-9281',
    (await client.query('SELECT password_hash FROM app_users WHERE id=$1', [target.id])).rows[0].password_hash), true);
  await assert.rejects(() => auth.changePasswordWithToken(client, {
    changeToken: result.resetToken,
    newPassword: 'Another!Password-For-Replay-9281'
  }), (e) => e.code === 'SESSION_EXPIRED', 'token reset wajib sekali pakai');
}));

dbTest('SEC-UAT-001: reset tanpa alasan ditolak dan tidak mengubah apa pun', async () => rollback(async (client) => {
  const sysadmin = await makeUser(client, 'system_admin');
  const target = await makeUser(client, 'sales');
  const before = (await client.query('SELECT password_hash FROM app_users WHERE id=$1', [target.id])).rows[0].password_hash;
  await assert.rejects(() => policy.reset(client, { actor: sysadmin, targetId: target.id, reason: '  ', requestId: randomUUID() }),
    (e) => e.code === 'REASON_REQUIRED');
  assert.equal((await client.query('SELECT password_hash FROM app_users WHERE id=$1', [target.id])).rows[0].password_hash, before);
}));

dbTest('SEC-UAT-001: token reset TIDAK pernah masuk audit', async () => rollback(async (client) => {
  const sysadmin = await makeUser(client, 'system_admin');
  const target = await makeUser(client, 'warehouse');
  const result = await attempt(client, sysadmin, target, 'Reset terkontrol untuk uji audit.');
  const audits = (await client.query(
    `SELECT action,reason,old_value,new_value FROM audit_logs WHERE entity_id=$1`, [target.id])).rows;
  const blob = JSON.stringify(audits);
  assert.ok(!blob.includes(result.resetToken), 'token reset tidak boleh muncul di audit');
  assert.ok(audits.some((a) => a.action === 'PASSWORD_RESET_SUCCEEDED'), 'keberhasilan wajib tercatat');
  const success = audits.find((a) => a.action === 'PASSWORD_RESET_SUCCEEDED');
  assert.equal(success.new_value.targetClass, 'STANDARD_USER');
  assert.ok(success.new_value.resetOperationId);
}));

test('SEC-UAT-001: klasifikasi memakai peran efektif, kelas tertinggi menang', () => {
  assert.equal(policy.classify(new Set(['sales'])), 'STANDARD_USER');
  assert.equal(policy.classify(new Set(['system_admin'])), 'PRIVILEGED_ADMIN');
  assert.equal(policy.classify(new Set(['sales', 'security_admin'])), 'PRIVILEGED_ADMIN', 'satu peran privileged cukup untuk mengangkat kelas');
  assert.equal(policy.classify(new Set(['owner', 'sales'])), 'OWNER', 'owner menang atas peran lain');
  // Keputusan murni dapat diuji tanpa DB — dipakai UI menonaktifkan tombol.
  assert.equal(policy.decide({ actorId: 'a', actorClass: 'PRIVILEGED_ADMIN', targetId: 'o', targetClass: 'OWNER' }).code, 'OWNER_PASSWORD_RESET_SERVER_ONLY');
  assert.equal(policy.decide({ actorId: 'x', actorClass: 'PRIVILEGED_ADMIN', targetId: 'x', targetClass: 'STANDARD_USER' }).code, 'USE_SELF_SERVICE_PASSWORD_CHANGE');
  assert.equal(policy.decide({ actorId: 'a', actorClass: 'PRIVILEGED_ADMIN', targetId: 'b', targetClass: 'PRIVILEGED_ADMIN' }).code, 'PRIVILEGED_RESET_REQUIRES_OWNER');
  assert.equal(policy.decide({ actorId: 'a', actorClass: 'PRIVILEGED_ADMIN', actorCanRequestPrivileged: true, targetId: 'b', targetClass: 'PRIVILEGED_ADMIN' }).requiresMakerChecker, true);
  assert.equal(policy.decide({ actorId: 'a', actorClass: 'OWNER', targetId: 'b', targetClass: 'PRIVILEGED_ADMIN' }).requiresMakerChecker, true);
  assert.equal(policy.decide({ actorId: 'a', actorClass: 'PRIVILEGED_ADMIN', targetId: 'b', targetClass: 'STANDARD_USER' }).allowed, true);
});
