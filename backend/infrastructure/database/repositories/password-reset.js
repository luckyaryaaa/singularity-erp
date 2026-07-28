'use strict';
// SEC-UAT-001 — satu layanan kebijakan untuk seluruh reset kata sandi.
// Kelas target memakai union assignment aktif; Owner server-only dan reset
// administrator memakai maker-checker dua Owner yang berbeda.
const { randomBytes, randomUUID } = require('node:crypto');
const { AppError } = require('../../../core/errors');
const iamGrants = require('./iam-grants');

const OWNER_ROLES = new Set(['owner']);
const PRIVILEGED_ROLES = new Set(['owner', 'admin', 'system_admin', 'security_admin']);

async function effectiveRoles(client, userId, legacyRole) {
  const roles = new Set();
  if (legacyRole) roles.add(legacyRole);
  for (const r of await iamGrants.rolesForUser(client, userId)) roles.add(r.role);
  return roles;
}

function classify(roles) {
  for (const role of roles) if (OWNER_ROLES.has(role)) return 'OWNER';
  for (const role of roles) if (PRIVILEGED_ROLES.has(role)) return 'PRIVILEGED_ADMIN';
  return 'STANDARD_USER';
}
const classifyActor = (roles) => classify(roles);

function decide({ actorId, actorClass, actorCanRequestPrivileged = false, targetId, targetClass }) {
  if (targetClass === 'OWNER') {
    return {
      allowed: false,
      code: 'OWNER_PASSWORD_RESET_SERVER_ONLY',
      message: 'Akun Owner tidak dapat direset melalui aplikasi. Gunakan prosedur pemulihan server (security:rotate-owner).'
    };
  }
  if (String(actorId) === String(targetId)) {
    return {
      allowed: false,
      code: 'USE_SELF_SERVICE_PASSWORD_CHANGE',
      message: 'Reset akun sendiri lewat endpoint admin tidak diizinkan. Gunakan ubah kata sandi mandiri.'
    };
  }
  if (targetClass === 'PRIVILEGED_ADMIN') {
    if (actorClass !== 'OWNER' && !actorCanRequestPrivileged) {
      return {
        allowed: false,
        code: 'PRIVILEGED_RESET_REQUIRES_OWNER',
        message: 'Reset akun administrator hanya dapat diajukan Security Admin dan diputuskan Owner.'
      };
    }
    return {
      allowed: true,
      requiresRecentMfa: true,
      requiresMakerChecker: true,
      targetClass
    };
  }
  return { allowed: true, requiresRecentMfa: true, requiresMakerChecker: false, targetClass };
}

async function evaluate(client, { actor, targetId }) {
  const target = (await client.query(
    'SELECT id,username,role,active FROM app_users WHERE id=$1 FOR UPDATE', [targetId])).rows[0];
  if (!target) throw new AppError('RESOURCE_NOT_FOUND', 'Pengguna target tidak ditemukan.');
  const actorRoles = await effectiveRoles(client, actor.id, actor.role);
  const targetRoles = await effectiveRoles(client, target.id, target.role);
  const actorClass = classifyActor(actorRoles);
  const targetClass = classify(targetRoles);
  return {
    target,
    decision: decide({
      actorId: actor.id,
      actorClass,
      actorCanRequestPrivileged: actorRoles.has('security_admin'),
      targetId: target.id,
      targetClass
    }),
    targetClass,
    actorClass
  };
}

async function recordDenied(client, { actor, target, targetClass, code, reason, requestId }) {
  return runtime().audit(client, {
    userId: actor.id,
    action: 'PASSWORD_RESET_DENIED',
    module: 'user',
    entityType: 'USER',
    entityId: target.id,
    reason: String(reason || '').trim() || null,
    newValue: { reasonCode: code, targetClass },
    requestId,
    branchId: actor.branchId
  });
}

async function performReset(client, { actor, target, targetClass, reason, requestId }) {
  // Password lama dibuat tidak dapat digunakan; pemilik menetapkan password
  // baru melalui token sekali pakai yang hanya disimpan sebagai hash.
  const unusablePassword = `Mat!${randomBytes(24).toString('base64url')}9a`;
  const { hashPassword, logoutAll, issuePasswordReset } = require('./auth');
  await client.query(
    `UPDATE app_users
     SET password_hash=$2,must_change_password=true,failed_login_count=0,
       locked_until=NULL,updated_at=now()
     WHERE id=$1`,
    [target.id, hashPassword(unusablePassword)]);
  await logoutAll(client, target.id);
  await client.query(
    "DELETE FROM auth_pending WHERE user_id=$1 AND kind IN('mfa','password_change')",
    [target.id]);
  const reset = await issuePasswordReset(client, target.id);

  const operationId = randomUUID();
  await runtime().audit(client, {
    userId: actor.id,
    action: 'PASSWORD_RESET_SUCCEEDED',
    module: 'user',
    entityType: 'USER',
    entityId: target.id,
    reason,
    newValue: {
      resetOperationId: operationId,
      targetClass,
      mustChangePassword: true,
      oneTimeResetLinkIssued: true
    },
    requestId,
    branchId: actor.branchId
  });
  return {
    ok: true,
    resetOperationId: operationId,
    resetToken: reset.resetToken,
    expiresAt: reset.expiresAt,
    mustChangePassword: true
  };
}

async function reset(client, { actor, targetId, reason, requestId }) {
  const text = String(reason || '').trim();
  const { target, decision, targetClass } = await evaluate(client, { actor, targetId });
  if (!decision.allowed) {
    await recordDenied(client, {
      actor, target, targetClass, code: decision.code, reason: text, requestId
    });
    throw new AppError('PERMISSION_DENIED', decision.message, { reasonCode: decision.code });
  }
  if (!text) {
    await recordDenied(client, {
      actor, target, targetClass, code: 'REASON_REQUIRED', reason: text, requestId
    });
    throw new AppError('REASON_REQUIRED', 'Alasan reset wajib diisi.');
  }
  if (decision.requiresMakerChecker) {
    throw new AppError(
      'STATUS_INVALID',
      'Reset akun administrator wajib diajukan dan disetujui oleh Owner lain melalui maker-checker.',
      { reasonCode: 'PRIVILEGED_RESET_APPROVAL_REQUIRED' }
    );
  }
  return performReset(client, { actor, target, targetClass, reason: text, requestId });
}

async function expireRequests(client) {
  await client.query(`UPDATE password_reset_requests
    SET status='EXPIRED',updated_at=now()
    WHERE status='PENDING' AND expires_at<=now()`);
}

async function requestPrivileged(client, { actor, targetId, reason, requestId }) {
  const text = String(reason || '').trim();
  const result = await evaluate(client, { actor, targetId });
  const { target, decision, targetClass } = result;
  if (!decision.allowed) {
    await recordDenied(client, {
      actor, target, targetClass, code: decision.code, reason: text, requestId
    });
    throw new AppError('PERMISSION_DENIED', decision.message, { reasonCode: decision.code });
  }
  if (!decision.requiresMakerChecker || targetClass !== 'PRIVILEGED_ADMIN')
    throw new AppError('STATUS_INVALID', 'Target ini tidak membutuhkan workflow reset privileged.');
  if (text.length < 8) {
    await recordDenied(client, {
      actor, target, targetClass, code: 'REASON_REQUIRED', reason: text, requestId
    });
    throw new AppError('REASON_REQUIRED', 'Alasan reset minimal 8 karakter.');
  }
  await expireRequests(client);
  const existing = (await client.query(
    `SELECT id,expires_at FROM password_reset_requests
     WHERE target_user_id=$1 AND status='PENDING' FOR UPDATE`,
    [target.id])).rows[0];
  if (existing) {
    throw new AppError(
      'DUPLICATE_REQUEST',
      'Permintaan reset untuk pengguna ini masih menunggu keputusan.',
      { resetRequestId: existing.id, expiresAt: existing.expires_at }
    );
  }
  const row = (await client.query(
    `INSERT INTO password_reset_requests(target_user_id,target_class,reason,requested_by)
     VALUES($1,$2,$3,$4) RETURNING *`,
    [target.id, targetClass, text, actor.id])).rows[0];
  await runtime().audit(client, {
    userId: actor.id,
    action: 'PASSWORD_RESET_REQUESTED',
    module: 'user',
    entityType: 'PASSWORD_RESET_REQUEST',
    entityId: row.id,
    reason: text,
    newValue: {
      targetUserId: target.id,
      targetClass,
      status: row.status,
      expiresAt: row.expires_at
    },
    requestId,
    branchId: actor.branchId
  });
  return runtime().camel(row);
}

async function listRequests(client, { status } = {}) {
  await expireRequests(client);
  const values = [];
  const where = status ? 'WHERE r.status=$1' : '';
  if (status) values.push(String(status).toUpperCase());
  return (await client.query(
    `SELECT r.*,t.username target_username,t.display_name target_name,t.role target_role,
       maker.display_name requested_by_name,checker.display_name decided_by_name
     FROM password_reset_requests r
     JOIN app_users t ON t.id=r.target_user_id
     JOIN app_users maker ON maker.id=r.requested_by
     LEFT JOIN app_users checker ON checker.id=r.decided_by
     ${where}
     ORDER BY CASE WHEN r.status='PENDING' THEN 0 ELSE 1 END,r.requested_at DESC
     LIMIT 100`,
    values)).rows.map(runtime().camel);
}

async function getPendingRequest(client, id) {
  await expireRequests(client);
  const row = (await client.query(
    `SELECT r.*,u.username target_username,u.display_name target_name,u.role target_role
     FROM password_reset_requests r
     JOIN app_users u ON u.id=r.target_user_id
     WHERE r.id=$1 FOR UPDATE OF r`,
    [id])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Permintaan reset tidak ditemukan.');
  if (row.status !== 'PENDING')
    throw new AppError('STATUS_INVALID', `Permintaan reset berstatus ${row.status} dan tidak dapat diputuskan.`);
  return row;
}

async function assertOwner(client, actor) {
  const roles = await effectiveRoles(client, actor.id, actor.role);
  if (classifyActor(roles) !== 'OWNER')
    throw new AppError('PERMISSION_DENIED', 'Keputusan reset administrator hanya dapat dilakukan Owner.');
}

async function approveRequest(client, { actor, id, reason, requestId }) {
  const text = String(reason || '').trim();
  if (text.length < 8) throw new AppError('REASON_REQUIRED', 'Alasan persetujuan minimal 8 karakter.');
  await assertOwner(client, actor);
  const row = await getPendingRequest(client, id);
  if (String(row.requested_by) === String(actor.id))
    throw new AppError('SOD_CONFLICT', 'Pembuat permintaan tidak boleh menyetujui permintaannya sendiri.');
  const { target, targetClass } = await evaluate(client, { actor, targetId: row.target_user_id });
  if (targetClass !== 'PRIVILEGED_ADMIN')
    throw new AppError('STATUS_INVALID', 'Kelas target berubah; permintaan harus dibatalkan dan dievaluasi ulang.');
  const result = await performReset(client, {
    actor,
    target,
    targetClass,
    reason: `${row.reason} | Approval: ${text}`,
    requestId
  });
  const updated = (await client.query(
    `UPDATE password_reset_requests
     SET status='COMPLETED',decided_by=$2,decided_at=now(),decision_reason=$3,
       reset_operation_id=$4,updated_at=now()
     WHERE id=$1 RETURNING *`,
    [id, actor.id, text, result.resetOperationId])).rows[0];
  await runtime().audit(client, {
    userId: actor.id,
    action: 'PASSWORD_RESET_APPROVED',
    module: 'user',
    entityType: 'PASSWORD_RESET_REQUEST',
    entityId: id,
    reason: text,
    newValue: {
      targetUserId: target.id,
      targetClass,
      status: 'COMPLETED',
      resetOperationId: result.resetOperationId,
      makerUserId: row.requested_by,
      checkerUserId: actor.id
    },
    requestId,
    branchId: actor.branchId
  });
  return { request: runtime().camel(updated), ...result };
}

async function rejectRequest(client, { actor, id, reason, requestId }) {
  const text = String(reason || '').trim();
  if (text.length < 8) throw new AppError('REASON_REQUIRED', 'Alasan penolakan minimal 8 karakter.');
  await assertOwner(client, actor);
  const row = await getPendingRequest(client, id);
  if (String(row.requested_by) === String(actor.id))
    throw new AppError('SOD_CONFLICT', 'Pembuat permintaan tidak boleh menolak permintaannya sendiri.');
  const updated = (await client.query(
    `UPDATE password_reset_requests
     SET status='REJECTED',decided_by=$2,decided_at=now(),decision_reason=$3,updated_at=now()
     WHERE id=$1 RETURNING *`,
    [id, actor.id, text])).rows[0];
  await runtime().audit(client, {
    userId: actor.id,
    action: 'PASSWORD_RESET_REJECTED',
    module: 'user',
    entityType: 'PASSWORD_RESET_REQUEST',
    entityId: id,
    reason: text,
    newValue: {
      targetUserId: row.target_user_id,
      targetClass: row.target_class,
      status: 'REJECTED',
      makerUserId: row.requested_by,
      checkerUserId: actor.id
    },
    requestId,
    branchId: actor.branchId
  });
  return runtime().camel(updated);
}

function runtime() { return require('./runtime'); }

module.exports = {
  classify,
  classifyActor,
  effectiveRoles,
  decide,
  evaluate,
  recordDenied,
  reset,
  requestPrivileged,
  listRequests,
  approveRequest,
  rejectRequest,
  OWNER_ROLES,
  PRIVILEGED_ROLES
};
