'use strict';
// B3 — emergency access (break-glass) benar-benar dibaca runtime.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const permissions = require('../backend/core/permissions');
const auth = require('../backend/infrastructure/database/repositories/auth');

const dbTest = process.env.DATABASE_URL ? test : test.skip;
async function rollback(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try { await client.query('BEGIN'); await client.query("SELECT set_config('app.is_system','on',true)"); await fn(client); }
  finally { await client.query('ROLLBACK').catch(() => {}); await client.end(); }
}

test('B3: hibah darurat memberi izin yang disebut, dan hanya itu', () => {
  const base = { id: 'u', role: 'sales', branchId: 'b', branchScope: 'b' };
  assert.equal(permissions.hasPermission(base, 'ledger.post'), false, 'sales normal tidak boleh posting jurnal');

  const broken = { ...base, emergencyGrants: [{ code: 'ledger.post', scopeType: 'GLOBAL', until: '2030-01-01' }] };
  assert.equal(permissions.hasPermission(broken, 'ledger.post'), true, 'hibah darurat wajib berlaku');
  assert.equal(permissions.hasPermission(broken, 'ledger.void'), false, 'darurat tidak meluas ke aksi lain');
  assert.equal(permissions.hasPermission(broken, 'backup.create'), false, 'darurat bukan wildcard');

  // Wildcard palsu di dalam hibah tidak boleh membuka segalanya.
  const forged = { ...base, emergencyGrants: [{ code: '*' }] };
  assert.equal(permissions.hasPermission(forged, 'ledger.post'), false, "'*' pada hibah tidak boleh diartikan sebagai semua izin");

  // Jejak audit dapat membedakan aksi yang berjalan atas hibah darurat.
  assert.equal(permissions.emergencyGrantFor(broken, 'ledger.post').scopeType, 'GLOBAL');
  assert.equal(permissions.emergencyGrantFor(broken, 'sales_order.view'), null, 'izin yang memang milik role bukan darurat');
  assert.equal(permissions.emergencyGrantFor(base, 'ledger.post'), null);
  assert.equal(permissions.emergencyGrantFor(null, 'ledger.post'), null);
});

dbTest('B3: sesi memuat hibah aktif; yang kedaluwarsa dan yang dicabut tidak berlaku', async () => rollback(async (client) => {
  const owner = (await client.query(`SELECT id,role,branch_id FROM app_users WHERE role='owner' LIMIT 1`)).rows[0];
  const target = (await client.query(`SELECT id FROM app_users WHERE role<>'owner' AND active LIMIT 1`)).rows[0];
  assert.ok(target, 'butuh satu akun non-owner');
  const code = (await client.query(`SELECT code FROM permission_catalog LIMIT 1`)).rows[0]?.code;
  assert.ok(code, 'butuh permission_catalog terisi');

  const token = randomUUID(), sessionId = randomUUID();
  await client.query(`INSERT INTO user_sessions(id,user_id,token_hash,csrf_token_hash,expires_at,ip,device,last_ip,last_device)
    VALUES($1,$2,$3,$4,now()+interval '1 hour','127.0.0.1','t','127.0.0.1','t')`,
  [sessionId, target.id, auth.digest(token), auth.digest(randomUUID())]);

  const grant = async (status, until) => (await client.query(
    `INSERT INTO emergency_access_overrides(id,user_id,permission_code,scope_type,reason,status,effective_from,effective_until,granted_by)
     VALUES($1,$2,$3,'GLOBAL','Uji break-glass',$4,now()-interval '1 minute',$5,$6) RETURNING id`,
    [randomUUID(), target.id, code, status, until, owner.id])).rows[0].id;

  // Aktif dan masih berlaku → dimuat ke sesi.
  const active = await grant('ACTIVE', new Date(Date.now() + 3600_000));
  let resolved = await auth.resolveSession(client, token, { ip: '127.0.0.1', device: 't' });
  assert.ok(resolved, 'sesi wajib ter-resolve');
  assert.ok(resolved.user.emergencyGrants.some((g) => g.code === code), 'hibah aktif wajib termuat ke user');
  assert.equal(permissions.hasPermission(resolved.user, code), true);

  // Dicabut → hilang pada request berikutnya tanpa perlu logout.
  await client.query(`UPDATE emergency_access_overrides SET status='REVOKED' WHERE id=$1`, [active]);
  resolved = await auth.resolveSession(client, token, { ip: '127.0.0.1', device: 't' });
  assert.ok(!resolved.user.emergencyGrants.some((g) => g.code === code), 'hibah yang dicabut wajib berhenti berlaku seketika');

  // Kedaluwarsa → tidak dimuat.
  await grant('ACTIVE', new Date(Date.now() - 1000));
  resolved = await auth.resolveSession(client, token, { ip: '127.0.0.1', device: 't' });
  assert.ok(!resolved.user.emergencyGrants.some((g) => g.code === code), 'hibah kedaluwarsa tidak boleh berlaku');
}));
