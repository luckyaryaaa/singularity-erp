'use strict';
// Wave 20 — Unified Work Item engine (§4.4/§5.2), migrasi 077.
// Pekerjaan lintas modul menjadi entitas bertipe dengan siklus hidup nyata:
// ditugaskan, diklaim, dikerjakan, diselesaikan dengan evidence, dikembalikan,
// didelegasikan, dieskalasi — optimistic-locked, teraudit, ber-scope cabang.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const wi = require('../backend/infrastructure/database/repositories/work-items');

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
async function secondUser(client, notId) {
  const r = (await client.query(`SELECT id,role,branch_id FROM app_users WHERE active AND id<>$1 LIMIT 1`, [notId])).rows[0];
  return r ? { id: r.id, role: r.role, branchId: r.branch_id, branchScope: r.branch_id } : null;
}
const base = (user, over = {}) => ({ itemType: 'REVIEW', title: 'Tinjau selisih rekonsiliasi', branchId: user.branchId, ...over });

dbTest('Wave 20: work item punya siklus hidup penuh dengan evidence', async () => rollback(async (client) => {
  const user = await owner(client);
  const created = await wi.createWorkItem(client, base(user, { itemType: 'CORRECTION', assigneeUserId: user.id, priority: 'HIGH', slaMinutes: 120 }), user, randomUUID());
  assert.equal(created.status, 'OPEN');
  assert.equal(created.version, 1);
  assert.ok(created.dueAt, 'SLA menit menurunkan due date');

  const list = await wi.listWorkItems(client, user, { branchId: user.branchId });
  assert.ok(list.items.some((w) => w.id === created.id));
  assert.equal(list.summary.open >= 1, true);

  const claimed = await wi.claimItem(client, { id: created.id, expectedVersion: 1, user, requestId: randomUUID() });
  assert.equal(claimed.status, 'CLAIMED');
  assert.equal(claimed.version, 2);

  const started = await wi.startItem(client, { id: created.id, expectedVersion: 2, user, requestId: randomUUID() });
  assert.equal(started.status, 'IN_PROGRESS');

  const done = await wi.completeItem(client, { id: created.id, expectedVersion: 3, note: 'Selisih dijelaskan.', evidence: { ref: 'GL-2026-07' }, user, requestId: randomUUID() });
  assert.equal(done.status, 'DONE');
  assert.deepEqual(done.evidence, { ref: 'GL-2026-07' }, 'evidence penyelesaian tersimpan');
}));

dbTest('Wave 20: transisi optimistic-locked — versi salah ditolak', async () => rollback(async (client) => {
  const user = await owner(client);
  const item = await wi.createWorkItem(client, base(user, { assigneeUserId: user.id }), user, randomUUID());
  await assert.rejects(() => wi.claimItem(client, { id: item.id, expectedVersion: 99, user, requestId: randomUUID() }),
    (e) => e.code === 'DOCUMENT_CONFLICT');
}));

dbTest('Wave 20: hanya pemilik/berwenang yang boleh menutup — bukan sembarang pengguna', async () => rollback(async (client) => {
  const user = await owner(client);
  const item = await wi.createWorkItem(client, base(user, { assigneeUserId: user.id }), user, randomUUID());
  const claimed = await wi.claimItem(client, { id: item.id, expectedVersion: 1, user, requestId: randomUUID() });
  // Pengguna lain di cabang sama, bukan pemilik & bukan lintas cabang.
  const intruder = { id: randomUUID(), role: 'warehouse', branchId: user.branchId, branchScope: user.branchId };
  await assert.rejects(() => wi.completeItem(client, { id: item.id, expectedVersion: claimed.version, user: intruder, requestId: randomUUID() }),
    (e) => e.code === 'PERMISSION_DENIED', 'bukan pemilik tidak boleh menutup');
}));

dbTest('Wave 20: klaim menghormati penargetan — item milik peran lain tidak dapat diklaim', async () => rollback(async (client) => {
  const user = await owner(client);
  const item = await wi.createWorkItem(client, base(user, { assigneeRole: 'finance_manager', itemType: 'APPROVAL' }), user, randomUUID());
  const other = { id: randomUUID(), role: 'warehouse', branchId: user.branchId, branchScope: user.branchId };
  await assert.rejects(() => wi.claimItem(client, { id: item.id, expectedVersion: 1, user: other, requestId: randomUUID() }),
    (e) => e.code === 'PERMISSION_DENIED', 'item peran lain tidak boleh diklaim pengguna non-berwenang');
}));

dbTest('Wave 20: kembalikan untuk revisi muncul di inbox pembuat', async () => rollback(async (client) => {
  const user = await owner(client);
  const item = await wi.createWorkItem(client, base(user, { assigneeUserId: user.id }), user, randomUUID());
  const claimed = await wi.claimItem(client, { id: item.id, expectedVersion: 1, user, requestId: randomUUID() });
  const returned = await wi.returnItem(client, { id: item.id, expectedVersion: claimed.version, reason: 'Bukti kurang lengkap, mohon dilengkapi.', user, requestId: randomUUID() });
  assert.equal(returned.status, 'RETURNED');
  const inbox = await wi.myWork(client, user);
  assert.ok(inbox.returnedToMe.some((w) => w.id === item.id), 'item RETURNED muncul di returnedToMe pembuat');
  // Alasan pengembalian terlalu singkat wajib ditolak.
  const fresh = await wi.createWorkItem(client, base(user, { assigneeUserId: user.id }), user, randomUUID());
  await wi.claimItem(client, { id: fresh.id, expectedVersion: 1, user, requestId: randomUUID() });
  await assert.rejects(() => wi.returnItem(client, { id: fresh.id, expectedVersion: 2, reason: 'kurang', user, requestId: randomUUID() }),
    (e) => e.code === 'REASON_REQUIRED');
}));

dbTest('Wave 20: delegasi & eskalasi tercatat', async () => rollback(async (client) => {
  const user = await owner(client);
  const target = await secondUser(client, user.id);
  const item = await wi.createWorkItem(client, base(user, { assigneeUserId: user.id }), user, randomUUID());
  let v = 1;
  if (target) {
    const del = await wi.delegateItem(client, { id: item.id, expectedVersion: v, toUserId: target.id, reason: 'Cuti — dialihkan sementara.', user, requestId: randomUUID() });
    assert.equal(del.delegatedTo, target.id, 'delegasi menyetel penerima');
    v = del.version;
  }
  const esc = await wi.escalateItem(client, { id: item.id, expectedVersion: v, reason: 'Melewati SLA.', user, requestId: randomUUID() });
  assert.equal(esc.escalated, true);
  assert.equal(esc.priority, 'HIGH', 'eskalasi menaikkan prioritas');
}));

dbTest('Wave 20: My Work berbasis work item nyata dan tidak bocor lintas cabang', async () => rollback(async (client) => {
  const user = await owner(client);
  const item = await wi.createWorkItem(client, base(user, { assigneeUserId: user.id }), user, randomUUID());
  const inbox = await wi.myWork(client, user);
  assert.ok(inbox.assignedToMe.some((w) => w.id === item.id), 'item OPEN yang ditugaskan muncul di assignedToMe');

  const other = (await client.query('SELECT id FROM branches WHERE id<>$1 AND active LIMIT 1', [user.branchId])).rows[0];
  const outsider = { ...user, role: 'sales', branchScope: other.id, branchId: other.id };
  await assert.rejects(() => wi.listWorkItems(client, outsider, { branchId: user.branchId }),
    (e) => e.code === 'PERMISSION_DENIED', 'papan kerja cabang lain tidak boleh diintip');
}));

test('Wave 20: engine work item benar-benar terhubung — migrasi, repo, dan rute merujuknya', () => {
  const fs = require('node:fs');
  const up = fs.readFileSync('data/migrations/077_unified_work_items.sql', 'utf8');
  const repo = fs.readFileSync('backend/infrastructure/database/repositories/work-items.js', 'utf8');
  const route = fs.readFileSync('backend/routes/workspace.js', 'utf8');
  for (const token of ['work_items', 'app_branch_visible', 'ENABLE ROW LEVEL SECURITY']) {
    assert.ok(up.includes(token), `migrasi wajib mendefinisikan ${token}`);
  }
  assert.match(route, /workItems\.(listWorkItems|createWorkItem|claimItem|completeItem)/, 'rute wajib memakai engine work item');
  assert.ok(route.includes('workItems:workItemsInbox'), 'My Work wajib menyertakan work item nyata');
  assert.ok(repo.includes('assertActor'), 'penutupan wajib menegakkan kepemilikan');
});
