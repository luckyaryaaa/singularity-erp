'use strict';
// P0 Wave 4 — C17 (kebocoran gaji), D1 (redaksi audit), B4 (MFA wajib &
// perlindungan perubahan MFA + step-up yang benar-benar ditegakkan).
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const runtime = require('../backend/infrastructure/database/repositories/runtime');
const operations = require('../backend/infrastructure/database/repositories/operations');
const auth = require('../backend/infrastructure/database/repositories/auth');

const dbTest = process.env.DATABASE_URL ? test : test.skip;
async function rollback(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try { await client.query('BEGIN'); await client.query("SELECT set_config('app.is_system','on',true),set_config('app.is_platform','on',true),set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true)"); await fn(client); }
  finally { await client.query('ROLLBACK').catch(() => {}); await client.end(); }
}
async function owner(client) {
  const r = (await client.query(`SELECT u.*,b.legal_entity_id FROM app_users u JOIN branches b ON b.id=u.branch_id WHERE u.role='owner' AND b.legal_entity_id IS NOT NULL LIMIT 1`)).rows[0];
  return { id: r.id, role: r.role, branchId: r.branch_id, branchScope: '*', displayName: r.display_name };
}

test('D1: rahasia diredaksi dan data pribadi disamarkan sebelum masuk audit', () => {
  const redacted = runtime.redactAudit({
    username: 'andi', password: 'RahasiaSekali123!', ownerPinHash: 'abc', csrfToken: 'tok',
    tempPassword: 'Mat!xyz', totpSecret: 'JBSWY3DPEHPK3PXP',
    npwp: '09.254.294.5-407.000', nik: '3201234567890003', baseSalary: 25_000_000,
    nested: { bankAccount: '1234567890', note: 'aman' },
    lines: [{ description: 'baja', salary: 9_000_000 }]
  });
  // Rahasia: dihapus total.
  for (const key of ['password', 'ownerPinHash', 'csrfToken', 'tempPassword', 'totpSecret']) {
    assert.equal(redacted[key], '[REDACTED]', `${key} wajib diredaksi penuh`);
  }
  // Data pribadi/keuangan: disamarkan sebagian agar tetap bisa dicocokkan.
  assert.equal(redacted.npwp, '[REDACTED].000');
  assert.equal(redacted.nik, '[REDACTED]0003');
  assert.match(String(redacted.baseSalary), /^\[REDACTED\]/);
  assert.match(String(redacted.nested.bankAccount), /^\[REDACTED\]/);
  assert.match(String(redacted.lines[0].salary), /^\[REDACTED\]/);
  // Yang tidak sensitif lewat apa adanya.
  assert.equal(redacted.username, 'andi');
  assert.equal(redacted.nested.note, 'aman');
  assert.equal(redacted.lines[0].description, 'baja');
  // Nilai kosong dan tipe primitif tidak merusak.
  assert.equal(runtime.redactAudit(null), null);
  assert.equal(runtime.redactAudit('teks'), 'teks');
});

dbTest('D1: audit_logs benar-benar menyimpan nilai yang sudah diredaksi', async () => rollback(async (client) => {
  const user = await owner(client);
  const requestId = randomUUID();
  await runtime.audit(client, {
    userId: user.id, action: 'UPDATE', module: 'user', entityType: 'USER', entityId: user.id, requestId,
    newValue: { password: 'JanganTersimpan1!', nik: '3201234567890003', displayName: 'Andi' }
  });
  const row = (await client.query('SELECT new_value FROM audit_logs WHERE request_id=$1', [requestId])).rows[0];
  assert.equal(row.new_value.password, '[REDACTED]');
  assert.equal(row.new_value.nik, '[REDACTED]0003');
  assert.equal(row.new_value.displayName, 'Andi');
  const raw = JSON.stringify(row.new_value);
  assert.ok(!raw.includes('JanganTersimpan1!'), 'kata sandi tidak boleh tersimpan permanen di jejak audit');
}));

dbTest('C17: base_salary tidak ikut pada daftar karyawan tanpa izin payroll', async () => rollback(async (client) => {
  const admin = await owner(client);
  const withPayroll = await operations.listMaster(client, 'employees', { limit: 5 }, { ...admin, role: 'hrd' });
  const withoutPayroll = await operations.listMaster(client, 'employees', { limit: 5 }, { ...admin, role: 'sales' });
  assert.ok(withoutPayroll.items.length, 'butuh minimal satu karyawan');

  assert.ok(withPayroll.items.every((e) => 'baseSalary' in e), 'HRD tetap melihat gaji');
  assert.ok(withoutPayroll.items.every((e) => !('baseSalary' in e)), 'pemegang employee.view tanpa payroll.view tidak boleh melihat gaji');
  assert.ok(withoutPayroll.items.every((e) => !('bpjs' in e)), 'data BPJS ikut ditahan');
  // Kolom identitas tetap ada supaya daftarnya masih berguna.
  assert.ok(withoutPayroll.items.every((e) => e.nik !== undefined && e.name !== undefined));
}));

dbTest('D2: SELURUH partisi audit INSERT-only bagi runtime user, bukan hanya tahun berjalan', async () => rollback(async (client) => {
  const rows = (await client.query(`SELECT c.relname,
      has_table_privilege(current_user,c.oid,'INSERT') can_insert,
      has_table_privilege(current_user,c.oid,'UPDATE') can_update,
      has_table_privilege(current_user,c.oid,'DELETE') can_delete,
      has_table_privilege(current_user,c.oid,'TRUNCATE') can_truncate
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN('r','p') AND c.relname LIKE 'audit_logs%'`)).rows;
  assert.ok(rows.length >= 2, 'butuh tabel audit beserta partisinya');
  // Dulu hanya audit_logs dan audit_logs_2026 yang di-revoke secara hardcode;
  // partisi tahun berikutnya mewarisi broad grant dan tetap bisa diubah.
  const writable = rows.filter((r) => r.can_update || r.can_delete || r.can_truncate).map((r) => r.relname);
  assert.deepEqual(writable, [], `partisi audit berikut masih dapat diubah/dihapus: ${writable.join(', ')}`);
  assert.ok(rows.every((r) => r.can_insert), 'aplikasi tetap harus dapat menulis jejak audit');
}));

dbTest('B4: MFA tidak dapat dimatikan sendiri oleh akun berkewenangan tinggi', async () => rollback(async (client) => {
  const admin = await owner(client);
  for (const role of auth.PRIVILEGED_ROLES) {
    assert.equal(auth.mfaMandatory(role), true, `${role} wajib MFA`);
    await assert.rejects(() => auth.disableMfa(client, { ...admin, role }, 'apa pun', '000000'),
      (e) => e.code === 'PERMISSION_DENIED' && /tidak dapat dimatikan sendiri/.test(String(e.detail || e.message)),
      `${role} tidak boleh melucuti MFA sendiri`);
  }
  assert.equal(auth.mfaMandatory('sales'), false, 'role operasional tidak dipaksa MFA');
  // Role non-privileged: kata sandi salah tetap ditolak sebelum apa pun berubah.
  await assert.rejects(() => auth.disableMfa(client, { ...admin, role: 'sales' }, 'sandi-salah', '000000'),
    (e) => e.code === 'AUTH_FAILED');
}));

dbTest('B4: step-up MFA benar-benar ditegakkan, bukan sekadar kolom yang ada', async () => rollback(async (client) => {
  const admin = await owner(client);
  const session = (await client.query(`INSERT INTO user_sessions(id,user_id,token_hash,csrf_token_hash,expires_at,ip,device,last_ip,last_device)
    VALUES($1,$2,$3,$4,now()+interval '1 hour','127.0.0.1','test','127.0.0.1','test') RETURNING id`,
  [randomUUID(), admin.id, randomUUID(), randomUUID()])).rows[0];

  // Akun privileged TANPA MFA aktif: aksi kritis ditolak, bukan diloloskan.
  await client.query('UPDATE app_users SET mfa_enabled=false WHERE id=$1', [admin.id]);
  await assert.rejects(() => auth.assertRecentMfa(client, { user: admin, session, action: 'Reset kata sandi pengguna' }),
    (e) => e.code === 'PERMISSION_DENIED' && /wajib mendaftarkan MFA/.test(String(e.detail || e.message)));

  // MFA aktif tetapi sesi belum pernah diverifikasi → tetap ditolak.
  await client.query('UPDATE app_users SET mfa_enabled=true WHERE id=$1', [admin.id]);
  await assert.rejects(() => auth.assertRecentMfa(client, { user: admin, session }),
    (e) => e.code === 'MFA_REQUIRED');

  // Verifikasi kedaluwarsa (16 menit lalu) → ditolak.
  await client.query(`UPDATE user_sessions SET mfa_verified_at=now()-interval '16 minutes' WHERE id=$1`, [session.id]);
  await assert.rejects(() => auth.assertRecentMfa(client, { user: admin, session }),
    (e) => e.code === 'MFA_REQUIRED');

  // Verifikasi baru → lolos.
  await client.query('UPDATE user_sessions SET mfa_verified_at=now() WHERE id=$1', [session.id]);
  assert.equal(await auth.assertRecentMfa(client, { user: admin, session }), true);
}));
