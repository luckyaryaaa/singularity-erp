'use strict';

const { AppError } = require('./errors');

const SCOPES = Object.freeze({
  GLOBAL: 'GLOBAL',
  LEGAL_ENTITY: 'LEGAL_ENTITY',
  BUSINESS_UNIT: 'BUSINESS_UNIT',
  BRANCH: 'BRANCH',
  PLANT: 'PLANT',
  WAREHOUSE: 'WAREHOUSE',
  DEPARTMENT: 'DEPARTMENT',
  PROJECT: 'PROJECT',
  OWN_RECORD: 'OWN_RECORD'
});

function hasGlobalScope(user) {
  return !!user && (['owner','system_admin','security_admin','auditor','admin'].includes(user.role) || user.branchScope === '*');
}

function snapshot(user, requestedScope) {
  const scope = requestedScope && Object.values(SCOPES).includes(requestedScope)
    ? requestedScope
    : hasGlobalScope(user) ? SCOPES.GLOBAL : SCOPES.BRANCH;
  return Object.freeze({
    scope,
    branchId: scope === SCOPES.GLOBAL ? null : user?.branchId || null,
    employeeId: user?.employeeId || null
  });
}

function canAccessBranch(user, branchId) {
  return hasGlobalScope(user) || (!!user?.branchId && user.branchId === branchId);
}

function assertBranchAccess(user, branchId, message = 'Data berada di cabang di luar cakupan Anda.') {
  if (!canAccessBranch(user, branchId)) throw new AppError('PERMISSION_DENIED', message);
  return branchId;
}

// Resolve cabang untuk operasi mutasi/batch. User non-global tidak pernah
// boleh menaikkan scope lewat branchId dari request; tanpa branchId selalu
// jatuh ke cabang akun. User global boleh memilih cabang, tetapi default-nya
// tetap cabang akun agar batch tidak diam-diam memproses seluruh perusahaan.
function resolveBranch(user, requestedBranchId) {
  const branchId = requestedBranchId || user?.branchId || null;
  if (!branchId) throw new AppError('VALIDATION_ERROR', 'Cabang wajib ditentukan untuk operasi ini.');
  assertBranchAccess(user, branchId);
  return branchId;
}

function queryScope(user) {
  return Object.freeze({ global: hasGlobalScope(user), branchId: user?.branchId || null });
}

module.exports = { SCOPES, hasGlobalScope, snapshot, canAccessBranch, assertBranchAccess, resolveBranch, queryScope };
