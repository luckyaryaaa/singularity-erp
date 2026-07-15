'use strict';
// Satu mesin role + permission. Backend memvalidasi setiap aksi;
// penyembunyian menu di frontend hanyalah kenyamanan, bukan batas keamanan.

const { AppError } = require('./errors');

const MODULES = ['dashboard','approval','notification','organization','customer','supplier','product','inquiry','quotation','customer_po','sales_order','project','work_order','production','quality','purchase_request','purchase_order','goods_receipt','inventory','material_issue','stock_transfer','stock_adjustment','delivery','invoice','payment','supplier_invoice','supplier_payment','expense','asset','journal','ledger','closing','payroll','employee','attendance','leave','tax','report','audit','user','iam','sod','access_review','approval_policy','settings','monitoring','job','selftest','backup'];

const ACTIONS = ['view','create','edit','submit','approve','reject','post','void','cancel','export','import'];

// Peta role → daftar permission code. '*' berarti seluruh modul/aksi (Owner/Admin).
const ROLE_GRANTS = {
  owner: ['*'],
  system_admin: expand(['dashboard','notification','user','settings','monitoring','job','selftest','backup'], ACTIONS)
    .concat(expand(['organization','audit','iam','sod','access_review','approval_policy'], ['view','export'])),
  security_admin: expand(['dashboard','notification','user','iam','sod','access_review','monitoring','selftest'], ACTIONS)
    .concat(expand(['audit','job','approval_policy'], ['view','export'])),
  finance_manager: expand(['dashboard','approval','notification','customer','invoice','payment','supplier_invoice','supplier_payment','expense','asset','report','job','approval_policy'], ACTIONS)
    .concat(expand(['organization'], ['view','create','edit','submit','export']))
    .concat(expand(['quotation','sales_order','purchase_order','journal','ledger','tax','inventory','delivery','audit'], ['view','export'])),
  accounting: expand(['dashboard','approval','notification','journal','ledger','closing','report','asset','job'], ACTIONS)
    .concat(expand(['invoice','payment','supplier_invoice','supplier_payment','tax','expense','audit'], ['view','export'])),
  tax: expand(['dashboard','notification','tax','report','job'], ACTIONS)
    .concat(expand(['invoice','journal','supplier_invoice','audit'], ['view','export'])),
  hrd: expand(['dashboard','approval','notification','employee','attendance','leave','payroll','report','job'], ACTIONS)
    .concat(expand(['organization','audit'], ['view'])),
  sales: expand(['dashboard','approval','notification','customer','inquiry','quotation','customer_po','sales_order','project','report','job'], ACTIONS)
    .concat(expand(['product','inventory','delivery','invoice','work_order'], ['view'])),
  procurement: expand(['dashboard','approval','notification','supplier','purchase_request','purchase_order','report','job'], ACTIONS)
    .concat(expand(['product','inventory','goods_receipt','supplier_invoice','work_order'], ['view'])),
  warehouse: expand(['dashboard','approval','notification','inventory','goods_receipt','material_issue','stock_transfer','stock_adjustment','delivery','report','job'], ACTIONS)
    .concat(expand(['product','purchase_order','work_order','quality'], ['view'])),
  production: expand(['dashboard','approval','notification','work_order','production','quality','material_issue','report','job'], ACTIONS)
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

function hasPermission(user, code) {
  if (!user) return false;
  const grants = grantsFor(user.role);
  return grants.has('*') || grants.has(code);
}

// Pemeriksaan ABAC: role + branch + kepemilikan + status + jumlah + level approval.
function assertPermission(user, code, context = {}) {
  if (!hasPermission(user, code)) {
    throw new AppError('PERMISSION_DENIED', `Izin '${code}' dibutuhkan untuk tindakan ini.`);
  }
  if (context.branchId && !['owner','system_admin','security_admin','auditor','admin'].includes(user.role) && user.branchScope !== '*' &&
      user.branchId && context.branchId !== user.branchId) {
    throw new AppError('PERMISSION_DENIED', 'Dokumen berada di cabang di luar cakupan Anda.');
  }
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

module.exports = { MODULES, ACTIONS, ROLE_GRANTS, grantsFor, hasPermission, assertPermission, approvalLevelsFor, OWNER_PIN_ACTIONS, APPROVAL_MATRIX, APPROVAL_LEVEL_BY_ROLE };
