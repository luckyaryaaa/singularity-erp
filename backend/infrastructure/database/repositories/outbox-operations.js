'use strict';
// Operasi terbatas untuk observability dan recovery transactional outbox.
// Payload sengaja tidak diekspos agar data domain sensitif tidak bocor melalui
// layar administrasi; operator melihat metadata, error, dan jadwal retry.
const { AppError } = require('../../../core/errors');
const runtime = require('./runtime');

const STATUSES = new Set(['PENDING', 'PUBLISHED', 'DEAD_LETTER']);

async function list(client, { status = 'DEAD_LETTER', limit = 50 } = {}) {
  const normalized = String(status || 'DEAD_LETTER').toUpperCase();
  if (!STATUSES.has(normalized)) throw new AppError('VALIDATION_ERROR', 'Status outbox tidak valid.');
  const capped = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const summary = (await client.query(
    `SELECT delivery_status,count(*)::int total
     FROM domain_event_outbox GROUP BY delivery_status`)).rows;
  const items = (await client.query(
    `SELECT id,event_type,event_version,entity_id,branch_id,delivery_status,
       attempts,last_error,next_attempt_at,created_at,published_at,dead_lettered_at
     FROM domain_event_outbox WHERE delivery_status=$1
     ORDER BY COALESCE(dead_lettered_at,created_at) DESC LIMIT $2`,
    [normalized, capped])).rows.map(runtime.camel);
  return {
    status: normalized,
    summary: Object.fromEntries(summary.map((row) => [row.delivery_status, Number(row.total)])),
    items
  };
}

async function retry(client, { id, reason, user, requestId }) {
  const explanation = String(reason || '').trim();
  if (explanation.length < 10) {
    throw new AppError('REASON_REQUIRED', 'Alasan retry dead-letter minimal 10 karakter.');
  }
  const row = (await client.query(
    `SELECT id,event_type,event_version,entity_id,branch_id,delivery_status,
       attempts,last_error,dead_lettered_at
     FROM domain_event_outbox WHERE id=$1 FOR UPDATE`, [id])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Event outbox tidak ditemukan.');
  if (row.delivery_status !== 'DEAD_LETTER') {
    throw new AppError('STATUS_INVALID',
      `Event berstatus ${row.delivery_status}; hanya DEAD_LETTER yang dapat di-retry.`);
  }
  const updated = (await client.query(
    `UPDATE domain_event_outbox
     SET delivery_status='PENDING',attempts=0,next_attempt_at=now(),
       dead_lettered_at=NULL,last_error=NULL,published_at=NULL
     WHERE id=$1 RETURNING id,event_type,event_version,entity_id,branch_id,
       delivery_status,attempts,next_attempt_at`, [id])).rows[0];
  await runtime.audit(client, {
    userId: user.id, action: 'OUTBOX_RETRY', module: 'system',
    entityType: 'DOMAIN_EVENT', entityId: row.id, documentNumber: row.event_type,
    oldValue: { status: row.delivery_status, attempts: row.attempts, lastError: row.last_error },
    newValue: { status: 'PENDING', attempts: 0 },
    reason: explanation, requestId, branchId: row.branch_id || user.branchId
  });
  return runtime.camel(updated);
}

module.exports = { list, retry, STATUSES };
