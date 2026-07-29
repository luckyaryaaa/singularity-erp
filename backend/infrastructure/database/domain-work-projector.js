'use strict';
// Proyektor idempoten Domain Event → Unified Work Item.
//
// Hanya dua kontrak eksplisit yang diproses. Event informasional lain tetap
// dikirim melalui SSE, tetapi tidak menghasilkan pekerjaan/noise pada My Work.
const { randomUUID } = require('node:crypto');
const runtime = require('./repositories/runtime');

const REQUIRED_EVENT = 'work.action-required.v1';
const RESOLVED_EVENT = 'work.action-resolved.v1';
const ITEM_TYPES = new Set(['APPROVAL', 'EXCEPTION', 'REVIEW', 'CORRECTION', 'TASK', 'FOLLOW_UP']);
const PRIORITIES = new Set(['LOW', 'NORMAL', 'HIGH', 'URGENT']);
const RISKS = new Set(['LOW', 'MEDIUM', 'HIGH']);
const ACTIVE = ['OPEN', 'CLAIMED', 'IN_PROGRESS', 'RETURNED', 'ON_HOLD'];

function requiredText(value, field, max) {
  const text = String(value || '').trim();
  if (!text) throw new Error(`Kontrak action-required tidak valid: ${field} wajib diisi.`);
  return text.slice(0, max);
}

function contract(row) {
  const payload = row.payload || {};
  const version = Number(row.event_version || payload.eventVersion || 1);
  if (version !== 1) throw new Error(`Versi event ${row.event_type} tidak didukung: ${version}.`);
  return {
    ...payload,
    actionKey: requiredText(payload.actionKey, 'actionKey', 160),
    actorUserId: requiredText(payload.actorUserId, 'actorUserId', 36),
    branchId: requiredText(payload.branchId || row.branch_id, 'branchId', 36),
    sourceEntityId: requiredText(payload.sourceEntityId, 'sourceEntityId', 36)
  };
}

async function notifyRequired(client, item, payload) {
  await client.query(
    `INSERT INTO notifications
       (id,user_id,target_role,category,title,body,link,dedupe_key,branch_id)
     VALUES($1,$2,$3,'ACTION_REQUIRED',$4,$5,$6,$7,$8)
     ON CONFLICT DO NOTHING`,
    [randomUUID(), item.assignee_user_id || null,
      item.assignee_user_id ? null : (item.assignee_role || null),
      String(item.title).slice(0, 200),
      String(payload.requiredAction || payload.description || '').slice(0, 2000),
      String(payload.link || '#/my-work').slice(0, 200),
      `wi:${payload.actionKey}`.slice(0, 120), item.branch_id]);
}

async function projectRequired(client, row) {
  const p = contract(row);
  const itemType = String(p.itemType || 'TASK').toUpperCase();
  const priority = String(p.priority || 'NORMAL').toUpperCase();
  const risk = String(p.risk || 'LOW').toUpperCase();
  if (!ITEM_TYPES.has(itemType)) throw new Error(`itemType action-required tidak didukung: ${itemType}.`);
  if (!PRIORITIES.has(priority)) throw new Error(`priority action-required tidak didukung: ${priority}.`);
  if (!RISKS.has(risk)) throw new Error(`risk action-required tidak didukung: ${risk}.`);

  const inserted = (await client.query(
    `INSERT INTO work_items
       (id,item_type,title,description,source_module,source_entity_type,source_entity_id,
        branch_id,assignee_user_id,assignee_role,priority,risk,required_action,
        completion_condition,due_at,sla_minutes,created_by,automation_key,
        source_event_id,source_event_type,auto_managed)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,true)
     ON CONFLICT (automation_key) WHERE automation_key IS NOT NULL DO NOTHING
     RETURNING *`,
    [randomUUID(), itemType, requiredText(p.title, 'title', 300),
      p.description ? String(p.description).slice(0, 2000) : null,
      p.sourceModule ? String(p.sourceModule).slice(0, 30) : null,
      requiredText(p.sourceEntityType, 'sourceEntityType', 40), p.sourceEntityId,
      p.branchId, p.assigneeUserId || null, p.assigneeRole ? String(p.assigneeRole).slice(0, 40) : null,
      priority, risk, p.requiredAction ? String(p.requiredAction).slice(0, 1000) : null,
      p.completionCondition ? String(p.completionCondition).slice(0, 1000) : null,
      p.dueAt || null, p.slaMinutes ? Math.max(1, Math.floor(Number(p.slaMinutes))) : null,
      p.actorUserId, p.actionKey, row.id, row.event_type])).rows[0];

  const item = inserted || (await client.query(
    'SELECT * FROM work_items WHERE automation_key=$1', [p.actionKey])).rows[0];
  if (!item) throw new Error(`Proyeksi work item ${p.actionKey} gagal ditemukan setelah upsert.`);
  if (!inserted) return { action: 'deduplicated', workItemId: item.id };

  await runtime.audit(client, {
    userId: p.actorUserId, action: 'PROJECT', module: 'workspace',
    entityType: 'WORK_ITEM', entityId: item.id, documentNumber: p.actionKey,
    newValue: { sourceEventId: row.id, sourceEventType: row.event_type, itemType, priority, risk },
    requestId: row.id, branchId: p.branchId
  });
  await notifyRequired(client, item, p);
  return { action: 'created', workItemId: item.id };
}

async function projectResolved(client, row) {
  const p = contract(row);
  const item = (await client.query(
    'SELECT * FROM work_items WHERE automation_key=$1 FOR UPDATE', [p.actionKey])).rows[0];
  if (!item) return { action: 'not-found', workItemId: null };
  if (!ACTIVE.includes(item.status)) return { action: 'already-resolved', workItemId: item.id };

  const note = String(p.resolutionNote || 'Sumber pekerjaan telah diselesaikan.').slice(0, 1000);
  const updated = (await client.query(
    `UPDATE work_items
     SET status='DONE',completed_by=$2,completed_at=now(),completion_note=$3,
       version=version+1
     WHERE id=$1 AND status=ANY($4::varchar[]) RETURNING *`,
    [item.id, p.actorUserId, note, ACTIVE])).rows[0];
  if (!updated) return { action: 'already-resolved', workItemId: item.id };

  await runtime.audit(client, {
    userId: p.actorUserId, action: 'AUTO_COMPLETE', module: 'workspace',
    entityType: 'WORK_ITEM', entityId: item.id, documentNumber: p.actionKey,
    oldValue: { status: item.status, version: item.version },
    newValue: { status: 'DONE', version: updated.version, sourceEventId: row.id },
    reason: note, requestId: row.id, branchId: item.branch_id
  });
  return { action: 'resolved', workItemId: item.id };
}

async function projectEvent(client, row) {
  if (row.event_type === REQUIRED_EVENT) return projectRequired(client, row);
  if (row.event_type === RESOLVED_EVENT) return projectResolved(client, row);
  return { action: 'ignored', workItemId: null };
}

module.exports = { projectEvent, REQUIRED_EVENT, RESOLVED_EVENT, ACTIVE };
