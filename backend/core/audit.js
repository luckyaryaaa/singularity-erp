'use strict';
// Satu mesin audit. Append-only: tidak ada endpoint ubah/hapus untuk log audit.

const { store } = require('../infrastructure/database/store');
const { uid, nowIso } = require('./util');

const ACTIONS = ['CREATE','UPDATE','SUBMIT','APPROVE','REJECT','REQUEST_REVISION','POST','PAY','VOID','CANCEL','ARCHIVE','RESTORE','EXPORT','DOWNLOAD','LOGIN','LOGIN_FAILED','LOGOUT','PERMISSION_CHANGE','SETTINGS_CHANGE','JOB'];

// Perubahan sensitif wajib menyertakan alasan tertulis.
const REASON_REQUIRED = new Set(['VOID','CANCEL','PERMISSION_CHANGE','SETTINGS_CHANGE','REQUEST_REVISION','REJECT']);

function record(entry) {
  const row = {
    id: uid(),
    occurredAt: nowIso(),
    userId: entry.user ? entry.user.id : null,
    userName: entry.user ? entry.user.displayName : 'system',
    role: entry.user ? entry.user.role : 'system',
    action: ACTIONS.includes(entry.action) ? entry.action : 'UPDATE',
    module: entry.module || 'system',
    entityType: entry.entityType || entry.module || 'system',
    entityId: entry.entityId || null,
    documentNumber: entry.documentNumber || null,
    oldValue: entry.oldValue ?? null,
    newValue: entry.newValue ?? null,
    reason: entry.reason || null,
    requestId: entry.requestId || uid(),
    sessionId: entry.sessionId || null,
    device: entry.device || null,
    ip: entry.ip || null,
    branchId: entry.branchId || (entry.user ? entry.user.branchId : null)
  };
  store.collection('audit_logs').insert(row);
  return row;
}

function forEntity(entityId, limit = 20) {
  return store.collection('audit_logs')
    .find((row) => row.entityId === entityId)
    .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
    .slice(0, limit);
}

module.exports = { record, forEntity, ACTIONS, REASON_REQUIRED };
