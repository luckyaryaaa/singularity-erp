'use strict';

require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');
const retention = require('../backend/infrastructure/database/repositories/retention');

test('Wave 14: retention memakai allowlist tertutup dan menolak resource arbitrer', () => {
  const allowed = Object.keys(retention.RESOURCE_SPECS);
  assert.deepEqual(allowed.sort(), [
    'AUTH_CHALLENGE', 'BACKGROUND_JOB', 'EVENT_OUTBOX', 'IDEMPOTENCY',
    'NOTIFICATION_DELIVERY', 'USER_SESSION'
  ]);
  for (const forbidden of [
    'audit_logs', 'business_documents', 'journal_lines', 'payroll_items',
    'inventory_movements', 'employees', 'suppliers'
  ]) {
    assert.equal(allowed.includes(forbidden.toUpperCase()), false);
    assert.throws(() => retention.specFor(forbidden),
      (error) => error.code === 'VALIDATION_ERROR' && /allowlist teknis/.test(error.detail));
  }
  assert.throws(() => retention.specFor('idempotency_records; DROP TABLE audit_logs'),
    (error) => error.code === 'VALIDATION_ERROR' && /allowlist teknis/.test(error.detail));
});

test('Wave 14: migration menyediakan preview ledger, legal hold, dan primitive SQL statis', () => {
  const up = fs.readFileSync('data/migrations/066_data_retention_lifecycle.sql', 'utf8');
  const down = fs.readFileSync('data/migrations/066_data_retention_lifecycle.down.sql', 'utf8');
  const grants = fs.readFileSync('scripts/grant-runtime.js', 'utf8');
  const route = fs.readFileSync('backend/routes/governance.js', 'utf8');
  assert.match(up, /CREATE TABLE data_retention_policies/);
  assert.match(up, /CREATE TABLE data_retention_holds/);
  assert.match(up, /CREATE TABLE data_retention_runs/);
  assert.match(up, /SECURITY DEFINER/);
  assert.match(up, /REVOKE ALL ON FUNCTION execute_data_retention/);
  assert.doesNotMatch(up, /p_table|EXECUTE format|business_documents t|audit_logs t/);
  assert.match(down, /DROP FUNCTION IF EXISTS execute_data_retention/);
  assert.match(grants, /GRANT EXECUTE ON FUNCTION execute_data_retention/);
  assert.match(route, /auth\.assertRecentMfa[\s\S]*Eksekusi data retention/);
  assert.match(route, /RETENTION_EXECUTE/);
});

const dbTest = process.env.DATABASE_URL ? test : test.skip;
dbTest('Wave 14: legal hold melindungi record dan eksekusi wajib cocok dengan preview', async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query('BEGIN');
  await client.query("SELECT set_config('app.is_system','on',true),set_config('app.is_platform','on',true),set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true)");
  try {
    const userRow = (await client.query(
      `SELECT id,role,branch_id,display_name FROM app_users
        WHERE active AND role='owner' ORDER BY created_at LIMIT 1`
    )).rows[0];
    assert.ok(userRow);
    const user = {
      id: userRow.id, role: userRow.role, branchId: userRow.branch_id,
      branchScope: '*', displayName: userRow.display_name
    };
    const policy = (await client.query(
      `UPDATE data_retention_policies
          SET retention_days=3650,batch_size=50,version=version+1,updated_at=now()
        WHERE resource_type='IDEMPOTENCY' RETURNING *`
    )).rows[0];
    assert.ok(policy);

    const heldId = randomUUID();
    const deletableId = randomUUID();
    for (const [id, suffix] of [[heldId, 'held'], [deletableId, 'delete']]) {
      await client.query(
        `INSERT INTO idempotency_records
          (id,user_id,operation,idempotency_key,request_hash,response_status,
           response_body,created_at,expires_at)
         VALUES($1,$2,$3,$4,$5,200,'{}','2010-01-01','2010-01-02')`,
        [id, user.id, `retention-test-${suffix}`, randomUUID(), 'a'.repeat(64)]
      );
    }
    const hold = await retention.createHold(client, {
      resourceType: 'IDEMPOTENCY', resourceId: heldId,
      reason: 'Litigation hold untuk bukti regression retention.', user
    });
    assert.equal(hold.status, 'ACTIVE');

    const preview = await retention.preview(client, { policyId: policy.id, user });
    assert.equal(preview.candidateCount, 1);
    assert.equal(preview.plannedCount, 1);
    await assert.rejects(() => retention.execute(client, {
      previewId: preview.id, expectedCandidateCount: 2,
      idempotencyKey: `retention-wrong-${randomUUID()}`,
      reason: 'Konfirmasi eksekusi regression dengan jumlah salah.', user
    }), (error) => error.code === 'DOCUMENT_CONFLICT' &&
      /Jumlah kandidat tidak sama/.test(error.detail));

    const execution = await retention.execute(client, {
      previewId: preview.id, expectedCandidateCount: 1,
      idempotencyKey: `retention-ok-${randomUUID()}`,
      reason: 'Konfirmasi eksekusi regression retention yang sah.', user
    });
    assert.equal(execution.affectedCount, 1);
    assert.equal(execution.remainingEstimate, 0);
    assert.equal((await client.query(
      'SELECT count(*)::int n FROM idempotency_records WHERE id=$1', [deletableId]
    )).rows[0].n, 0);
    assert.equal((await client.query(
      'SELECT count(*)::int n FROM idempotency_records WHERE id=$1', [heldId]
    )).rows[0].n, 1);
    assert.equal((await client.query(
      `SELECT count(*)::int n FROM data_retention_runs
        WHERE id=$1 AND mode='EXECUTE' AND status='SUCCEEDED'`, [execution.id]
    )).rows[0].n, 1);
  } finally {
    await client.query('ROLLBACK').catch(() => {});
    await client.end();
  }
});

test('Wave 14: rollback migration retention tersedia dan urutannya aman', () => {
  const down = fs.readFileSync('data/migrations/066_data_retention_lifecycle.down.sql', 'utf8');
  assert.ok(down.indexOf('DROP FUNCTION') < down.indexOf('DROP TABLE IF EXISTS data_retention_runs'));
  assert.ok(down.indexOf('data_retention_runs') < down.indexOf('data_retention_policies'));
});
