'use strict';
// B1/B2 — otorisasi runtime bersumber database dan mendukung multi-peran.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const permissions = require('../backend/core/permissions');
const auth = require('../backend/infrastructure/database/repositories/auth');
const iamGrants = require('../backend/infrastructure/database/repositories/iam-grants');

const dbTest = process.env.DATABASE_URL ? test : test.skip;
async function rollback(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try { await client.query('BEGIN'); await client.query("SELECT set_config('app.is_system','on',true),set_config('app.is_platform','on',true),set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true)"); await fn(client); }
  finally { await client.query('ROLLBACK').catch(() => {}); await client.end(); }
}
async function ensurePrimaryAssignment(client, user, ownerId) {
  const valid = (await client.query(`SELECT 1 FROM user_role_assignments
    WHERE user_id=$1 AND role_code=$2 AND is_primary AND status='ACTIVE'
      AND effective_from<=now() AND (effective_until IS NULL OR effective_until>now())`, [user.id, user.role])).rowCount;
  if (valid) return;
  await client.query(`INSERT INTO user_role_assignments(id,user_id,role_code,scope_type,scope_id,status,is_primary,reason,requested_by,approved_by,approved_at)
    VALUES($1,$2,$3,$4,$5,'ACTIVE',true,'Fixture otorisasi runtime',$6,$6,now())`,
  [randomUUID(), user.id, user.role, user.branch_id ? 'BRANCH' : 'GLOBAL', user.branch_id || null, ownerId]);
}

test('B1: tanpa grant database, baseline ROLE_GRANTS tetap dipakai (fail-safe)', () => {
  const legacy = { id: 'u', role: 'sales', branchId: 'b', branchScope: 'b' };
  assert.equal(permissions.hasPermission(legacy, 'quotation.create'), true);
  assert.equal(permissions.hasPermission(legacy, 'ledger.post'), false);
  assert.deepEqual(permissions.effectiveGrants({ role: 'sales' }), permissions.grantsFor('sales'));

  // Grant dari database menang atas baseline role.
  const fromDb = { ...legacy, grants: ['ledger.post', 'dashboard.view'] };
  assert.equal(permissions.hasPermission(fromDb, 'ledger.post'), true, 'grant database wajib berlaku');
  assert.equal(permissions.hasPermission(fromDb, 'quotation.create'), false, 'grant database menggantikan, bukan menambah, baseline role');
});

dbTest('B1: baseline ter-seed dan idempoten; penyesuaian admin tidak ditimpa', async () => rollback(async (client) => {
  const before = Number((await client.query('SELECT count(*)::int n FROM role_permissions')).rows[0].n);
  assert.ok(before > 0, 'baseline wajib sudah ter-seed oleh db:migrate');

  // Menjalankan ulang tidak menambah apa pun (seed sekali per peran).
  const again = await iamGrants.syncBaseline(client);
  assert.equal(again.inserted, 0, 'sinkronisasi baseline wajib idempoten');

  // Admin mencabut satu izin; sinkronisasi berikutnya TIDAK boleh mengembalikannya.
  await client.query(`UPDATE role_permissions SET active=false WHERE role='sales' AND permission_code='quotation.create'`);
  await iamGrants.syncBaseline(client);
  const row = (await client.query(`SELECT active FROM role_permissions WHERE role='sales' AND permission_code='quotation.create'`)).rows[0];
  assert.equal(row.active, false, 'pencabutan oleh admin tidak boleh dikembalikan baseline');

  // Grant tiap peran benar-benar sesuai ROLE_GRANTS saat pertama di-seed.
  const salesDb = new Set((await client.query(`SELECT permission_code FROM role_permissions WHERE role='sales'`)).rows.map((r) => r.permission_code));
  for (const code of permissions.grantsFor('sales')) assert.ok(salesDb.has(code), `baseline kehilangan ${code}`);
}));

dbTest('B2: pengguna dengan peran tambahan memperoleh gabungan kewenangan', async () => rollback(async (client) => {
  const target = (await client.query(`SELECT u.id,u.role,u.branch_id FROM app_users u WHERE u.role='sales' AND u.active LIMIT 1`)).rows[0];
  assert.ok(target, 'butuh satu akun sales');
  const owner = (await client.query(`SELECT id FROM app_users WHERE role='owner' LIMIT 1`)).rows[0];
  await ensurePrimaryAssignment(client, target, owner.id);

  const token = randomUUID();
  await client.query(`INSERT INTO user_sessions(id,user_id,token_hash,csrf_token_hash,expires_at,ip,device,last_ip,last_device)
    VALUES($1,$2,$3,$4,now()+interval '1 hour','127.0.0.1','t','127.0.0.1','t')`,
  [randomUUID(), target.id, auth.digest(token), auth.digest(randomUUID())]);

  let resolved = await auth.resolveSession(client, token, { ip: '127.0.0.1', device: 't' });
  assert.equal(resolved.user.grantSource, 'DATABASE', 'kewenangan wajib berasal dari database');
  assert.equal(permissions.hasPermission(resolved.user, 'quotation.create'), true);
  assert.equal(permissions.hasPermission(resolved.user, 'goods_receipt.create'), false, 'sales belum punya kewenangan gudang');
  assert.equal(resolved.user.roles.length, 1);

  // Tambahkan peran kedua (non-primary) — inilah yang dulu tidak pernah berpengaruh.
  await client.query(`INSERT INTO user_role_assignments(id,user_id,role_code,scope_type,status,is_primary,reason,approved_by,approved_at)
    VALUES($1,$2,'warehouse','BRANCH','ACTIVE',false,'Uji multi-peran',$3,now())`, [randomUUID(), target.id, owner.id]);

  resolved = await auth.resolveSession(client, token, { ip: '127.0.0.1', device: 't' });
  assert.equal(permissions.hasPermission(resolved.user, 'goods_receipt.create'), true, 'peran tambahan wajib menambah kewenangan');
  assert.equal(permissions.hasPermission(resolved.user, 'quotation.create'), true, 'kewenangan peran utama tetap ada');
  assert.equal(resolved.user.roles.length, 2);
  assert.ok(resolved.user.roles.some((r) => r.role === 'warehouse' && !r.primary));
  assert.equal(permissions.hasPermission(resolved.user, 'ledger.post'), false, 'gabungan peran tidak boleh melebar ke modul lain');
}));

dbTest('B2: peran tambahan yang kedaluwarsa berhenti berlaku tanpa perlu logout', async () => rollback(async (client) => {
  const target = (await client.query(`SELECT id,role,branch_id FROM app_users WHERE role='sales' AND active LIMIT 1`)).rows[0];
  const owner = (await client.query(`SELECT id FROM app_users WHERE role='owner' LIMIT 1`)).rows[0];
  await ensurePrimaryAssignment(client, target, owner.id);
  const token = randomUUID();
  await client.query(`INSERT INTO user_sessions(id,user_id,token_hash,csrf_token_hash,expires_at,ip,device,last_ip,last_device)
    VALUES($1,$2,$3,$4,now()+interval '1 hour','127.0.0.1','t','127.0.0.1','t')`,
  [randomUUID(), target.id, auth.digest(token), auth.digest(randomUUID())]);
  const assignment = (await client.query(`INSERT INTO user_role_assignments(id,user_id,role_code,scope_type,status,is_primary,reason,approved_by,approved_at,effective_until)
    VALUES($1,$2,'warehouse','BRANCH','ACTIVE',false,'Akses sementara',$3,now(),now()+interval '1 hour') RETURNING id`,
  [randomUUID(), target.id, owner.id])).rows[0].id;

  let resolved = await auth.resolveSession(client, token, { ip: '127.0.0.1', device: 't' });
  assert.equal(permissions.hasPermission(resolved.user, 'goods_receipt.create'), true);

  // Masa berlaku habis → expireAssignments menutupnya dan sesi kehilangan izin.
  await client.query(`UPDATE user_role_assignments SET effective_from=now()-interval '2 hours',effective_until=now()-interval '1 minute' WHERE id=$1`, [assignment]);
  resolved = await auth.resolveSession(client, token, { ip: '127.0.0.1', device: 't' });
  assert.ok(resolved, 'sesi peran utama tetap hidup');
  assert.equal(permissions.hasPermission(resolved.user, 'goods_receipt.create'), false, 'peran kedaluwarsa wajib berhenti berlaku');
  assert.equal(resolved.user.roles.length, 1);

  // Sebaliknya: kehilangan peran PRIMARY memang wajib mengakhiri sesi.
  await client.query(`UPDATE user_role_assignments SET effective_from=now()-interval '2 hours',effective_until=now()-interval '1 minute'
    WHERE user_id=$1 AND is_primary AND status='ACTIVE'`, [target.id]);
  assert.equal(await auth.resolveSession(client, token, { ip: '127.0.0.1', device: 't' }), null,
    'tanpa peran utama, sesi tidak boleh bertahan');
}));
