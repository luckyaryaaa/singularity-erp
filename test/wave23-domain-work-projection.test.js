'use strict';
// Wave 23 — Domain Event → Unified Work Item (migrasi 081).
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const runtime = require('../backend/infrastructure/database/repositories/runtime');
const projector = require('../backend/infrastructure/database/domain-work-projector');
const warehouseTasks = require('../backend/infrastructure/database/repositories/warehouse-tasks');
const dispatcher = require('../backend/infrastructure/database/outbox-dispatcher');
const outboxOperations = require('../backend/infrastructure/database/repositories/outbox-operations');

const dbTest = process.env.DATABASE_URL ? test : test.skip;
async function rollback(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.is_system','on',true),set_config('app.is_platform','on',true),set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true)");
    await fn(client);
  } finally {
    await client.query('ROLLBACK').catch(() => {});
    await client.end();
  }
}
async function owner(client) {
  const r = (await client.query(
    `SELECT u.* FROM app_users u JOIN branches b ON b.id=u.branch_id
     WHERE u.role='owner' AND b.legal_entity_id IS NOT NULL LIMIT 1`)).rows[0];
  return { id: r.id, role: r.role, branchId: r.branch_id,
    branchScope: '*', displayName: r.display_name };
}
async function outboxRow(client, id) {
  return (await client.query('SELECT * FROM domain_event_outbox WHERE id=$1', [id])).rows[0];
}

dbTest('Wave 23: action-required diproyeksikan idempoten, bernotifikasi, dan teraudit', async () => rollback(async (client) => {
  const user = await owner(client);
  const sourceId = randomUUID();
  const actionKey = `test-action:${sourceId}`;
  const eventId = await runtime.actionRequired(client, {
    actionKey, actorUserId: user.id, branchId: user.branchId,
    itemType: 'EXCEPTION', title: 'Uji exception lintas modul',
    sourceModule: 'test', sourceEntityType: 'TEST_EXCEPTION', sourceEntityId: sourceId,
    assigneeUserId: user.id, priority: 'HIGH', risk: 'MEDIUM',
    requiredAction: 'Tinjau exception dan selesaikan.',
    completionCondition: 'Exception dinyatakan selesai.', slaMinutes: 60,
    link: '#/my-work'
  });
  const row = await outboxRow(client, eventId);
  const first = await projector.projectEvent(client, row);
  const replay = await projector.projectEvent(client, row);
  assert.equal(first.action, 'created');
  assert.equal(replay.action, 'deduplicated');
  assert.equal(Number((await client.query(
    'SELECT count(*) n FROM work_items WHERE automation_key=$1', [actionKey])).rows[0].n), 1);
  assert.equal(Number((await client.query(
    "SELECT count(*) n FROM notifications WHERE dedupe_key=$1 AND category='ACTION_REQUIRED'",
    [`wi:${actionKey}`])).rows[0].n), 1);
  assert.equal(Number((await client.query(
    "SELECT count(*) n FROM audit_logs WHERE entity_id=$1 AND action='PROJECT'",
    [first.workItemId])).rows[0].n), 1);
}));

dbTest('Wave 23: action-resolved menutup work item otomatis dan replay aman', async () => rollback(async (client) => {
  const user = await owner(client);
  const sourceId = randomUUID();
  const actionKey = `test-resolve:${sourceId}`;
  const requiredId = await runtime.actionRequired(client, {
    actionKey, actorUserId: user.id, branchId: user.branchId,
    itemType: 'TASK', title: 'Uji auto-resolution',
    sourceModule: 'test', sourceEntityType: 'TEST_TASK', sourceEntityId: sourceId,
    assigneeUserId: user.id, requiredAction: 'Selesaikan sumber.'
  });
  await projector.projectEvent(client, await outboxRow(client, requiredId));
  const resolvedId = await runtime.actionResolved(client, {
    actionKey, actorUserId: user.id, branchId: user.branchId,
    sourceEntityType: 'TEST_TASK', sourceEntityId: sourceId,
    resolutionNote: 'Sumber uji sudah selesai.'
  });
  const first = await projector.projectEvent(client, await outboxRow(client, resolvedId));
  const replay = await projector.projectEvent(client, await outboxRow(client, resolvedId));
  assert.equal(first.action, 'resolved');
  assert.equal(replay.action, 'already-resolved');
  const item = (await client.query(
    'SELECT status,version,completed_by,completion_note FROM work_items WHERE automation_key=$1',
    [actionKey])).rows[0];
  assert.equal(item.status, 'DONE');
  assert.equal(Number(item.version), 2);
  assert.equal(item.completed_by, user.id);
  assert.match(item.completion_note, /sudah selesai/);
}));

dbTest('Wave 23: warehouse assignment menerbitkan action-required dan penyelesaian event', async () => rollback(async (client) => {
  const user = await owner(client);
  const task = await warehouseTasks.createTask(client, {
    taskType: 'RECEIVE', branchId: user.branchId, assignedTo: user.id,
    priority: 'HIGH', reference: 'Uji integrasi WMS ke My Work'
  }, user, randomUUID());
  const required = (await client.query(
    `SELECT * FROM domain_event_outbox
     WHERE event_type=$1 AND payload->>'actionKey'=$2`,
    [projector.REQUIRED_EVENT, `warehouse-task:${task.id}`])).rows[0];
  assert.ok(required, 'pembuatan warehouse task wajib menerbitkan action-required');
  await projector.projectEvent(client, required);
  const wi = (await client.query(
    'SELECT * FROM work_items WHERE automation_key=$1', [`warehouse-task:${task.id}`])).rows[0];
  assert.equal(wi.assignee_user_id, user.id);
  assert.equal(wi.status, 'OPEN');

  const claimed = await warehouseTasks.claimTask(client, {
    id: task.id, expectedVersion: task.version, user, requestId: randomUUID()
  });
  await warehouseTasks.completeTask(client, {
    id: task.id, expectedVersion: claimed.version, note: 'Penerimaan selesai.',
    user, requestId: randomUUID()
  });
  const resolved = (await client.query(
    `SELECT * FROM domain_event_outbox
     WHERE event_type=$1 AND payload->>'actionKey'=$2`,
    [projector.RESOLVED_EVENT, `warehouse-task:${task.id}`])).rows[0];
  assert.ok(resolved, 'penyelesaian warehouse task wajib menerbitkan action-resolved');
  await projector.projectEvent(client, resolved);
  assert.equal((await client.query(
    'SELECT status FROM work_items WHERE id=$1', [wi.id])).rows[0].status, 'DONE');
}));

dbTest('Wave 23: dead-letter terlihat tanpa payload dan retry wajib beralasan + teraudit', async () => rollback(async (client) => {
  const user = await owner(client);
  const eventId = await runtime.outbox(client, projector.REQUIRED_EVENT, {
    entityId: randomUUID(), branchId: user.branchId, intentionally: 'sensitive-payload'
  });
  await client.query(
    `UPDATE domain_event_outbox
     SET delivery_status='DEAD_LETTER',attempts=5,last_error='contract invalid',
       dead_lettered_at=now()
     WHERE id=$1`, [eventId]);
  const board = await outboxOperations.list(client, { status: 'DEAD_LETTER' });
  const listed = board.items.find((item) => item.id === eventId);
  assert.ok(listed, 'dead-letter wajib terlihat pada observability board');
  assert.equal(Object.hasOwn(listed, 'payload'), false, 'payload domain tidak boleh terekspos');
  await assert.rejects(
    () => outboxOperations.retry(client, { id: eventId, reason: 'pendek', user }),
    (error) => error.code === 'REASON_REQUIRED');
  const retried = await outboxOperations.retry(client, {
    id: eventId, reason: 'Kontrak sumber sudah diperbaiki.', user, requestId: randomUUID()
  });
  assert.equal(retried.deliveryStatus, 'PENDING');
  assert.equal(Number(retried.attempts), 0);
  assert.equal(Number((await client.query(
    "SELECT count(*) n FROM audit_logs WHERE entity_id=$1 AND action='OUTBOX_RETRY'",
    [eventId])).rows[0].n), 1);
}));

test('Wave 23: kontrak migrasi, retry/dead-letter, dan semua sumber awal terpasang', () => {
  const up = fs.readFileSync('data/migrations/081_domain_event_work_item_projection.sql', 'utf8');
  const down = fs.readFileSync('data/migrations/081_domain_event_work_item_projection.down.sql', 'utf8');
  const sources = [
    'backend/infrastructure/database/repositories/runtime.js',
    'backend/infrastructure/database/repositories/warehouse-tasks.js',
    'backend/infrastructure/database/repositories/quality-capa.js',
    'backend/infrastructure/database/repositories/finance-reports.js',
    'backend/infrastructure/database/repositories/sales-o2c.js'
  ].map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  assert.match(up, /event_version/);
  assert.match(up, /delivery_status/);
  assert.match(up, /dead_lettered_at/);
  assert.match(up, /ux_work_items_automation_key/);
  assert.match(down, /DROP COLUMN IF EXISTS automation_key/);
  assert.match(sources, /approval:/);
  assert.match(sources, /warehouse-task:/);
  assert.match(sources, /capa:/);
  assert.match(sources, /reconciliation:/);
  assert.match(sources, /dunning:/);
  assert.deepEqual(
    [1, 2, 3, 4, 5, 7].map(dispatcher.retryDelaySeconds),
    [5, 10, 20, 40, 80, 300]);
});
