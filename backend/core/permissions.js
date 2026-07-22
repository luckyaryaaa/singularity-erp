'use strict';
// Satu mesin role + permission. Backend memvalidasi setiap aksi;
// penyembunyian menu di frontend hanyalah kenyamanan, bukan batas keamanan.

const { AppError } = require('./errors');

const MODULES = ['dashboard','approval','notification','organization','business_partner','customer','supplier','product','inquiry','quotation','customer_po','sales_order','project','work_order','production','quality','purchase_request','rfq','purchase_order','goods_receipt','inventory','material_issue','stock_transfer','stock_adjustment','stock_opname','delivery','rma','invoice','payment','payment_proposal','supplier_invoice','supplier_payment','expense','asset','budget','journal','ledger','closing','credit','payroll','employee','attendance','leave','tax','report','audit','user','iam','sod','access_review','approval_policy','settings','monitoring','job','selftest','backup'];

const ACTIONS = ['view','create','edit','submit','approve','reject','post','void','cancel','export','import'];

// Peta role → daftar permission code. '*' berarti seluruh modul/aksi (Owner/Admin).
const ROLE_GRANTS = {
  owner: ['*'],
  system_admin: expand(['dashboard','notification','business_partner','user','settings','monitoring','job','selftest','backup'], ACTIONS)
    .concat(expand(['organization','audit','iam','sod','access_review','approval_policy'], ['view','export'])),
  security_admin: expand(['dashboard','notification','user','iam','sod','access_review','monitoring','selftest'], ACTIONS)
    .concat(expand(['business_partner'], ['view','export']))
    .concat(expand(['audit','job','approval_policy'], ['view','export'])),
  finance_manager: expand(['dashboard','approval','notification','business_partner','customer','invoice','payment','payment_proposal','supplier_invoice','supplier_payment','expense','asset','budget','report','job','approval_policy','credit'], ACTIONS)
    .concat(expand(['organization'], ['view','create','edit','submit','export']))
    .concat(expand(['quotation','sales_order','purchase_order','rfq','journal','ledger','tax','inventory','delivery','rma','audit'], ['view','export'])),
  accounting: expand(['dashboard','approval','notification','journal','ledger','closing','report','asset','job'], ACTIONS)
    .concat(expand(['business_partner'], ['view','export']))
    .concat(expand(['invoice','payment','supplier_invoice','supplier_payment','tax','expense','audit'], ['view','export'])),
  tax: expand(['dashboard','notification','tax','report','job'], ACTIONS)
    .concat(expand(['business_partner'], ['view','export']))
    .concat(expand(['invoice','journal','supplier_invoice','audit'], ['view','export'])),
  hrd: expand(['dashboard','approval','notification','employee','attendance','leave','payroll','report','job'], ACTIONS)
    .concat(expand(['organization'], ['view','create','edit','submit','export']))
    .concat(expand(['audit'], ['view'])),
  sales: expand(['dashboard','approval','notification','business_partner','customer','inquiry','quotation','customer_po','sales_order','project','rma','report','job'], ACTIONS)
    .concat(expand(['credit'], ['view']))
    .concat(expand(['product','inventory','delivery','invoice','work_order'], ['view'])),
  procurement: expand(['dashboard','approval','notification','business_partner','supplier','purchase_request','rfq','purchase_order','report','job'], ACTIONS)
    .concat(expand(['product','inventory','goods_receipt','supplier_invoice','work_order','budget'], ['view'])),
  warehouse: expand(['dashboard','approval','notification','inventory','goods_receipt','material_issue','stock_transfer','stock_adjustment','stock_opname','delivery','rma','report','job'], ACTIONS)
    .concat(expand(['business_partner'], ['view']))
    .concat(expand(['product','purchase_order','work_order','quality'], ['view'])),
  production: expand(['dashboard','approval','notification','work_order','production','quality','material_issue','report','job'], ACTIONS)
    .concat(expand(['business_partner'], ['view']))
    .concat(expand(['product','inventory','project','sales_order'], ['view'])),
  auditor: expand(MODULES, ['view','export']),
  employee: expand(['dashboard','notification','leave','attendance'], ['view','create','submit'])
    .concat(['payroll.view_self','employee.view_self']),
  // Alias hanya untuk adapter legacy/in-memory; database migration 016
  // memindahkan seluruh akun ke role enterprise di atas.
  admin: expand(['dashboard','notification','user','settings','monitoring','job','selftest','backup'], ACTIONS),
  finance: expand(['dashboard','approval','notification','customer','invoice','payment','supplier_invoice','supplier_payment','expense','asset','report','job'], ACTIONS)
};

function expand(modules, actions) {
  const out = [];
  for (const mod of modules) for (const act of actions) out.push(`${mod}.${act}`);
  return out;
}

function grantsFor(role) {
  const grants = ROLE_GRANTS[role];
  if (!grants) return new Set();
  if (grants.includes('*')) return new Set(['*']);
  return new Set(grants);
}

// B1/B2 — kewenangan efektif. `user.grants` diisi dari database saat sesi
// di-resolve (union seluruh peran AKTIF, bukan hanya peran primary). Bila tidak
// tersedia — adapter in-memory, unit test, jalur boot — ROLE_GRANTS di source
// dipakai sebagai baseline yang sama persis dengan yang di-seed ke DB.
function effectiveGrants(user) {
  if (Array.isArray(user.grants) && user.grants.length) return new Set(user.grants);
  return grantsFor(user.role);
}

const SCOPE_CONTEXT_KEYS = Object.freeze({
  LEGAL_ENTITY: ['legalEntityId'], BUSINESS_UNIT: ['businessUnitId'], BRANCH: ['branchId'],
  PLANT: ['plantId'], WAREHOUSE: ['warehouseId'], DEPARTMENT: ['departmentId'],
  PROJECT: ['projectId', 'projectWbsId'], OWN_RECORD: ['ownerId', 'userId']
});

function emergencyScopeMatches(user, grant, context = {}) {
  const type = String(grant?.scopeType || 'GLOBAL').toUpperCase();
  if (type === 'GLOBAL') return true;
  const keys = SCOPE_CONTEXT_KEYS[type] || [];
  if (!grant?.scopeId || !keys.length) return false;
  if (type === 'OWN_RECORD' && String(context.ownerId || context.userId || '') === String(user?.id || '')) return true;
  return keys.some((key) => context[key] != null && String(context[key]) === String(grant.scopeId));
}

function hasPermission(user, code, context = {}) {
  if (!user) return false;
  const grants = effectiveGrants(user);
  if (grants.has('*') || grants.has(code)) return true;
  if (Array.isArray(user.delegatedGrants) && user.delegatedGrants.some((g) => g?.code === code && emergencyScopeMatches(user, g, context))) return true;
  // B3 — hibah break-glass yang masih berlaku, dimuat dari
  // emergency_access_overrides saat sesi di-resolve. Hanya berlaku untuk
  // permission yang disebut eksplisit: darurat tidak pernah berarti '*'.
  return Array.isArray(user.emergencyGrants) && user.emergencyGrants.some((g) => g?.code === code && emergencyScopeMatches(user, g, context));
}

// Aksi yang berjalan atas hibah darurat wajib dapat dibedakan di jejak audit.
const emergencyGrantFor = (user, code, context = {}) => {
  if (!user) return null;
  const grants = effectiveGrants(user);
  if (grants.has('*') || grants.has(code)) return null;      // memang haknya, bukan darurat
  return (Array.isArray(user.emergencyGrants) ? user.emergencyGrants : []).find((g) => g?.code === code && emergencyScopeMatches(user, g, context)) || null;
};
const delegatedGrantFor = (user, code, context = {}) => {
  if (!user) return null;
  const grants = effectiveGrants(user);
  if (grants.has('*') || grants.has(code)) return null;
  return (Array.isArray(user.delegatedGrants) ? user.delegatedGrants : []).find((g) => g?.code === code && emergencyScopeMatches(user,g,context)) || null;
};

// Role yang secara desain melihat lintas cabang (owner/admin/pengawas).
const CROSS_BRANCH_ROLES = ['owner', 'system_admin', 'security_admin', 'auditor', 'admin'];

function withinBranchScope(user, branchId) {
  if (!user || !branchId) return true;
  if (CROSS_BRANCH_ROLES.includes(user.role) || user.branchScope === '*') return true;
  return !user.branchId || String(branchId) === String(user.branchId);
}

// Penjaga cakupan cabang tunggal — dipakai assertPermission dan repository yang
// menerima branch/warehouse dari klien (mis. stock opname) supaya aturannya
// tidak berganda.
function assertBranchScope(user, branchId, subject = 'Dokumen') {
  if (!withinBranchScope(user, branchId)) {
    throw new AppError('PERMISSION_DENIED', `${subject} berada di cabang di luar cakupan Anda.`);
  }
  return true;
}

// Pemeriksaan ABAC: role + branch + kepemilikan + status + jumlah + level approval.
function assertPermission(user, code, context = {}) {
  if (!hasPermission(user, code, context)) {
    throw new AppError('PERMISSION_DENIED', `Izin '${code}' dibutuhkan untuk tindakan ini.`);
  }
  assertBranchScope(user, context.branchId);
  return true;
}

// Matriks approval terpusat berbasis nilai transaksi (jangan hardcode di halaman).
const APPROVAL_MATRIX = [
  { maxAmount: 5_000_000, levels: ['supervisor'] },
  { maxAmount: 50_000_000, levels: ['supervisor', 'finance'] },
  { maxAmount: Infinity, levels: ['supervisor', 'finance', 'owner'] }
];

function approvalLevelsFor(amount) {
  return APPROVAL_MATRIX.find((tier) => amount <= tier.maxAmount).levels;
}

// Aksi kritis yang wajib PIN Owner / konfirmasi kedua.
const OWNER_PIN_ACTIONS = new Set([
  'payroll.final_approve','invoice.void','payment.void','settings.bank_account',
  'settings.tax_identity','settings.numbering','user.role_change','closing.reopen','backup.factory_reset'
]);

const APPROVAL_LEVEL_BY_ROLE = Object.freeze({
  owner:'owner',finance_manager:'finance',finance:'finance',accounting:'finance',
  sales:'supervisor',procurement:'supervisor',warehouse:'supervisor',production:'supervisor',hrd:'supervisor'
});

module.exports = { MODULES, ACTIONS, ROLE_GRANTS, grantsFor, hasPermission, effectiveGrants, emergencyScopeMatches, emergencyGrantFor, delegatedGrantFor, assertPermission, withinBranchScope, assertBranchScope, CROSS_BRANCH_ROLES, approvalLevelsFor, OWNER_PIN_ACTIONS, APPROVAL_MATRIX, APPROVAL_LEVEL_BY_ROLE };
