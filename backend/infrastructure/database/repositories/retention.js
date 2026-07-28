'use strict';

const { randomUUID } = require('node:crypto');
const { AppError } = require('../../../core/errors');
const { camel } = require('./runtime');

// Closed allowlist. No caller-controlled table, column, or predicate reaches SQL.
const RESOURCE_SPECS = Object.freeze({
  AUTH_CHALLENGE: {
    table: 'auth_pending',
    age: 't.expires_at',
    predicate: 't.expires_at < $1'
  },
  IDEMPOTENCY: {
    table: 'idempotency_records',
    age: 't.expires_at',
    predicate: 't.expires_at < $1'
  },
  USER_SESSION: {
    table: 'user_sessions',
    age: 'coalesce(t.ended_at,t.expires_at)',
    predicate: 'NOT t.active AND coalesce(t.ended_at,t.expires_at) < $1'
  },
  EVENT_OUTBOX: {
    table: 'domain_event_outbox',
    age: 't.published_at',
    predicate: 't.published_at IS NOT NULL AND t.published_at < $1'
  },
  NOTIFICATION_DELIVERY: {
    table: 'notification_deliveries',
    age: 'coalesce(t.sent_at,t.created_at)',
    predicate: "t.status IN('SENT','SKIPPED') AND coalesce(t.sent_at,t.created_at) < $1"
  },
  BACKGROUND_JOB: {
    table: 'background_jobs',
    age: 'coalesce(t.finished_at,t.created_at)',
    predicate: "t.status IN('SUCCEEDED','FAILED','CANCELLED','DEAD_LETTER','COMPLETED') AND coalesce(t.finished_at,t.created_at) < $1"
  }
});

function specFor(resourceType) {
  const code = String(resourceType || '').trim().toUpperCase();
  const spec = RESOURCE_SPECS[code];
  if (!spec) throw new AppError('VALIDATION_ERROR', 'Resource retention tidak termasuk allowlist teknis.');
  return { code, ...spec };
}

function requireReason(value, label = 'Alasan') {
  const reason = String(value || '').trim();
  if (reason.length < 10 || reason.length > 1000) {
    throw new AppError('REASON_REQUIRED', `${label} wajib berisi 10–1000 karakter.`);
  }
  return reason;
}

function policySnapshot(row) {
  return {
    id: row.id,
    resourceType: row.resource_type,
    retentionDays: Number(row.retention_days),
    batchSize: Number(row.batch_size),
    status: row.status,
    legalBasis: row.legal_basis,
    version: Number(row.version),
    effectiveFrom: row.effective_from
  };
}

function runDto(row) {
  return camel({
    ...row,
    candidate_count: Number(row.candidate_count),
    planned_count: Number(row.planned_count),
    affected_count: Number(row.affected_count)
  });
}

async function countCandidates(client, resourceType, cutoffAt) {
  const spec = specFor(resourceType);
  const result = await client.query(
    `SELECT count(*)::bigint AS count
       FROM ${spec.table} t
      WHERE ${spec.predicate}
        AND NOT EXISTS (
          SELECT 1 FROM data_retention_holds h
           WHERE h.resource_type=$2
             AND h.resource_id IN(t.id::text,'*')
             AND h.status='ACTIVE'
             AND (h.expires_at IS NULL OR h.expires_at>now())
        )`,
    [cutoffAt, spec.code]
  );
  return Number(result.rows[0].count);
}

async function listPolicies(client) {
  const rows = (await client.query(
    `SELECT p.*,
      (SELECT count(*)::int FROM data_retention_holds h
        WHERE h.resource_type=p.resource_type AND h.status='ACTIVE'
          AND (h.expires_at IS NULL OR h.expires_at>now())) active_hold_count,
      (SELECT max(r.finished_at) FROM data_retention_runs r
        WHERE r.policy_id=p.id AND r.mode='EXECUTE' AND r.status='SUCCEEDED') last_executed_at
     FROM data_retention_policies p ORDER BY p.resource_type`
  )).rows;
  return rows.map((row) => camel({
    ...row,
    retention_days: Number(row.retention_days),
    batch_size: Number(row.batch_size),
    active_hold_count: Number(row.active_hold_count)
  }));
}

async function preview(client, { policyId, user }) {
  const policy = (await client.query(
    `SELECT * FROM data_retention_policies
      WHERE id=$1 AND status='ACTIVE' AND effective_from<=now() FOR SHARE`,
    [policyId]
  )).rows[0];
  if (!policy) throw new AppError('RESOURCE_NOT_FOUND', 'Policy retention aktif tidak ditemukan.');
  specFor(policy.resource_type);
  const cutoffAt = new Date(Date.now() - Number(policy.retention_days) * 86400000);
  const candidateCount = await countCandidates(client, policy.resource_type, cutoffAt);
  const plannedCount = Math.min(candidateCount, Number(policy.batch_size));
  const id = randomUUID();
  const row = (await client.query(
    `INSERT INTO data_retention_runs
      (id,policy_id,mode,status,cutoff_at,candidate_count,planned_count,
       affected_count,policy_snapshot,requested_by,expires_at)
     VALUES($1,$2,'PREVIEW','SUCCEEDED',$3,$4,$5,0,$6,$7,now()+interval '30 minutes')
     RETURNING *`,
    [id, policy.id, cutoffAt, candidateCount, plannedCount, policySnapshot(policy), user.id]
  )).rows[0];
  return runDto(row);
}

async function execute(client, {
  previewId, expectedCandidateCount, idempotencyKey, reason, user
}) {
  const key = String(idempotencyKey || '').trim();
  if (key.length < 12 || key.length > 160) {
    throw new AppError('VALIDATION_ERROR', 'Idempotency key eksekusi wajib 12–160 karakter.');
  }
  const writtenReason = requireReason(reason, 'Alasan eksekusi');
  const duplicate = (await client.query(
    `SELECT * FROM data_retention_runs
      WHERE requested_by=$1 AND idempotency_key=$2 AND mode='EXECUTE'`,
    [user.id, key]
  )).rows[0];
  if (duplicate) return { ...runDto(duplicate), duplicate: true };

  const previewRow = (await client.query(
    `SELECT r.*,p.status policy_status,p.version current_policy_version,
            p.batch_size current_batch_size
       FROM data_retention_runs r
       JOIN data_retention_policies p ON p.id=r.policy_id
      WHERE r.id=$1 AND r.mode='PREVIEW' AND r.status='SUCCEEDED'
      FOR UPDATE OF r,p`,
    [previewId]
  )).rows[0];
  if (!previewRow) throw new AppError('RESOURCE_NOT_FOUND', 'Preview retention tidak ditemukan.');
  if (String(previewRow.requested_by) !== String(user.id)) {
    throw new AppError('PERMISSION_DENIED', 'Preview hanya dapat dieksekusi oleh pembuat preview.');
  }
  if (previewRow.policy_status !== 'ACTIVE' ||
      Number(previewRow.current_policy_version) !== Number(previewRow.policy_snapshot.version)) {
    throw new AppError('DOCUMENT_CONFLICT', 'Policy berubah setelah preview. Buat preview baru.');
  }
  if (new Date(previewRow.expires_at).getTime() <= Date.now()) {
    throw new AppError('DOCUMENT_CONFLICT', 'Preview sudah kedaluwarsa. Buat preview baru.');
  }
  const expected = Number(expectedCandidateCount);
  if (!Number.isSafeInteger(expected) || expected !== Number(previewRow.candidate_count)) {
    throw new AppError('DOCUMENT_CONFLICT', 'Jumlah kandidat tidak sama dengan preview yang dikonfirmasi.');
  }

  const resourceType = previewRow.policy_snapshot.resourceType;
  const currentCount = await countCandidates(client, resourceType, previewRow.cutoff_at);
  if (currentCount !== expected) {
    throw new AppError('DOCUMENT_CONFLICT',
      `Kandidat berubah dari ${expected} menjadi ${currentCount}. Buat preview baru.`);
  }
  const limit = Math.min(Number(previewRow.planned_count), Number(previewRow.current_batch_size));
  const affected = limit === 0 ? 0 : Number((await client.query(
    'SELECT execute_data_retention($1,$2,$3) AS affected',
    [resourceType, previewRow.cutoff_at, limit]
  )).rows[0].affected);
  if (affected !== limit) {
    throw new AppError('DOCUMENT_CONFLICT',
      'Sebagian kandidat sedang diproses transaksi lain. Eksekusi dibatalkan; buat preview baru.');
  }

  const id = randomUUID();
  const row = (await client.query(
    `INSERT INTO data_retention_runs
      (id,policy_id,preview_id,mode,status,cutoff_at,candidate_count,planned_count,
       affected_count,policy_snapshot,reason,idempotency_key,requested_by)
     VALUES($1,$2,$3,'EXECUTE','SUCCEEDED',$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [id, previewRow.policy_id, previewRow.id, previewRow.cutoff_at,
      expected, limit, affected, previewRow.policy_snapshot, writtenReason, key, user.id]
  )).rows[0];
  return { ...runDto(row), remainingEstimate: Math.max(0, expected - affected), duplicate: false };
}

async function listHolds(client, { resourceType, status } = {}) {
  const values = [];
  const where = [];
  if (resourceType) {
    values.push(specFor(resourceType).code);
    where.push(`h.resource_type=$${values.length}`);
  }
  if (status) {
    const normalized = String(status).toUpperCase();
    if (!['ACTIVE', 'RELEASED'].includes(normalized)) {
      throw new AppError('VALIDATION_ERROR', 'Status legal hold tidak valid.');
    }
    values.push(normalized);
    where.push(`h.status=$${values.length}`);
  }
  return (await client.query(
    `SELECT h.*,u.display_name placed_by_name,r.display_name released_by_name
       FROM data_retention_holds h
       LEFT JOIN app_users u ON u.id=h.placed_by
       LEFT JOIN app_users r ON r.id=h.released_by
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY h.placed_at DESC LIMIT 500`,
    values
  )).rows.map(camel);
}

async function createHold(client, {
  resourceType, resourceId, reason, referenceNumber, expiresAt, user
}) {
  const spec = specFor(resourceType);
  const id = String(resourceId || '').trim();
  if (id !== '*' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new AppError('VALIDATION_ERROR', 'Resource ID legal hold harus UUID atau * untuk hold seluruh resource.');
  }
  if (id !== '*') {
    const exists = await client.query(`SELECT 1 FROM ${spec.table} WHERE id=$1`, [id]);
    if (!exists.rowCount) throw new AppError('RESOURCE_NOT_FOUND', 'Record untuk legal hold tidak ditemukan.');
  }
  const expiry = expiresAt ? new Date(expiresAt) : null;
  if (expiry && (!Number.isFinite(expiry.getTime()) || expiry.getTime() <= Date.now())) {
    throw new AppError('VALIDATION_ERROR', 'Tanggal kedaluwarsa hold harus di masa depan.');
  }
  const row = (await client.query(
    `INSERT INTO data_retention_holds
      (id,resource_type,resource_id,reason,reference_number,placed_by,expires_at)
     VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [randomUUID(), spec.code, id, requireReason(reason, 'Alasan legal hold'),
      String(referenceNumber || '').trim() || null, user.id, expiry]
  )).rows[0];
  return camel(row);
}

async function releaseHold(client, id, { reason, user }) {
  const row = (await client.query(
    `UPDATE data_retention_holds
        SET status='RELEASED',released_by=$2,released_at=now(),release_reason=$3
      WHERE id=$1 AND status='ACTIVE'
      RETURNING *`,
    [id, user.id, requireReason(reason, 'Alasan pelepasan hold')]
  )).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Legal hold aktif tidak ditemukan.');
  return camel(row);
}

async function listRuns(client, { policyId } = {}) {
  const values = [];
  let where = '';
  if (policyId) {
    values.push(policyId);
    where = 'WHERE r.policy_id=$1';
  }
  return (await client.query(
    `SELECT r.*,p.resource_type
       FROM data_retention_runs r JOIN data_retention_policies p ON p.id=r.policy_id
       ${where} ORDER BY r.started_at DESC LIMIT 200`,
    values
  )).rows.map(runDto);
}

module.exports = {
  RESOURCE_SPECS, specFor, countCandidates, listPolicies, preview, execute,
  listHolds, createHold, releaseHold, listRuns
};
