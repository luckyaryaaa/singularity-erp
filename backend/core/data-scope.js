'use strict';

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

module.exports = { SCOPES, hasGlobalScope, snapshot, canAccessBranch };
