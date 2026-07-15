'use strict';
// Master data enterprise (R014/R015): sub-resource ber-whitelist, lifecycle MDM,
// maker-checker bank supplier, aktivasi HPP, dan masking field sensitif di server.

const { AppError } = require('../../../core/errors');
const { assertPermission, hasPermission } = require('../../../core/permissions');
const runtime = require('./runtime');

const maskAccount = (value) => value ? `••••${String(value).slice(-4)}` : value;
const maskMoney = () => 'Rp ••••••••';
const canSeeSalary = (user) => hasPermission(user, 'payroll.view') || hasPermission(user, '*');
const canSeeBank = (user) => ['owner', 'admin', 'finance'].includes(user.role) || hasPermission(user, '*');

// Registry sub-resource: tabel, kolom yang boleh ditulis, urutan, dan masking.
const REGISTRY = {
  employees: {
    module: 'employee', parent: 'employees',
    subs: {
      'personal': { table: 'employee_personal_profiles', fk: 'employee_id', single: true,
        cols: ['nik_ktp','birth_place','birth_date','gender','marital_status','religion','address','phone','personal_email','blood_type'],
        guard: (u) => assertPermission(u, 'employee.edit'),
        mask: (row, u) => canSeeSalary(u) ? row : { ...row, nikKtp: row.nikKtp ? `${String(row.nikKtp).slice(0,2)}••••••••••${String(row.nikKtp).slice(-4)}` : null } },
      'positions': { table: 'employee_positions', fk: 'employee_id', order: 'effective_from DESC',
        cols: ['department_id','division','position_title','supervisor_employee_id','branch_id','work_location','shift_group','salary_grade','payroll_frequency','commission_eligible','effective_from','effective_to'] },
      'employment-history': { table: 'employee_employment_history', fk: 'employee_id', order: 'event_date DESC',
        cols: ['employment_type','employment_status','event_date','event_reason'] },
      'contracts': { table: 'employee_contracts', fk: 'employee_id', order: 'start_date DESC',
        cols: ['contract_number','contract_type','start_date','end_date','probation_end','permanent_date','file_id','status'] },
      'compensation': { table: 'employee_compensation_history', fk: 'employee_id', order: 'effective_from DESC',
        cols: ['base_salary','fixed_allowance','variable_allowance','salary_grade','effective_from','approval_reason'],
        viewGuard: (u) => { if (!canSeeSalary(u)) throw new AppError('PERMISSION_DENIED', 'Data kompensasi membutuhkan izin payroll.'); },
        reason: true },
      'tax-profiles': { table: 'employee_tax_profiles', fk: 'employee_id', order: 'effective_from DESC',
        cols: ['npwp','tax_subject','tax_scheme','ptkp_status','ter_category','tax_method','previous_employer_income','effective_from'] },
      'bpjs': { table: 'employee_bpjs_profiles', fk: 'employee_id', order: 'program',
        cols: ['program','membership_number','wage_base','risk_category','employer_pct','employee_pct','ceiling_amount','floor_amount','active_from','active_to','calculation_version'] },
      'insurance': { table: 'employee_insurance_profiles', fk: 'employee_id', order: 'effective_from DESC',
        cols: ['insurer','policy_number','coverage_type','family_covered','premium','employer_contribution','employee_contribution','effective_from','expiry_date','file_id'] },
      'bank-accounts': { table: 'employee_bank_accounts', fk: 'employee_id', order: 'created_at DESC',
        cols: ['bank_name','account_number','account_holder','effective_from','is_primary'],
        reason: true,
        mask: (row, u) => canSeeSalary(u) ? row : { ...row, accountNumber: maskAccount(row.accountNumber) } },
      'documents': { table: 'employee_documents', fk: 'employee_id', order: 'created_at DESC',
        cols: ['document_type','title','file_id','expiry_date','verified'] },
      'certifications': { table: 'employee_certifications', fk: 'employee_id', order: 'expiry_date',
        cols: ['name','issuer','certificate_number','issued_date','expiry_date','file_id','skill_tags'] },
      'emergency-contacts': { table: 'employee_emergency_contacts', fk: 'employee_id', order: 'name',
        cols: ['name','relationship','phone','address','restricted_notes','confidentiality'],
        viewGuard: (u) => assertPermission(u, 'employee.edit') },
      'access': { table: 'employee_access_assignments', fk: 'employee_id', order: 'access_start DESC',
        cols: ['user_id','role','org_scope','access_start','access_end','review_note'] }
    }
  },
  customers: {
    module: 'customer', parent: 'customers',
    subs: {
      'contacts': { table: 'customer_contacts', fk: 'customer_id', order: 'is_primary DESC, name',
        cols: ['name','position_title','department','phone','email','whatsapp','is_primary','active'] },
      'addresses': { table: 'customer_addresses', fk: 'customer_id', order: 'address_type, is_default DESC',
        cols: ['address_type','label','address','city','province','postal_code','is_default','active'] },
      'prices': { table: 'customer_product_prices', fk: 'customer_id', order: 'effective_from DESC',
        cols: ['product_id','price','currency','effective_from','expiry_date','status'] }
    }
  },
  suppliers: {
    module: 'supplier', parent: 'suppliers',
    subs: {
      'contacts': { table: 'supplier_contacts', fk: 'supplier_id', order: 'is_primary DESC, name',
        cols: ['name','position_title','phone','email','whatsapp','is_primary','active'] },
      'addresses': { table: 'supplier_addresses', fk: 'supplier_id', order: 'address_type',
        cols: ['address_type','address','city','province','is_default','active'] },
      'bank-accounts': { table: 'supplier_bank_accounts', fk: 'supplier_id', order: 'proposed_at DESC',
        cols: ['bank_name','account_number','account_holder','currency','effective_from','change_reason'],
        reason: true, makerChecker: true,
        mask: (row, u) => canSeeBank(u) ? row : { ...row, accountNumber: maskAccount(row.accountNumber) } },
      'materials': { table: 'supplier_materials', fk: 'supplier_id', order: 'category',
        cols: ['product_id','category','grade_spec','brand','supplier_part_number','uom','moq','lead_time_days','certification','approved_status','valid_from','valid_to'] },
      'price-history': { table: 'supplier_price_history', fk: 'supplier_id', order: 'effective_from DESC',
        cols: ['product_id','material_desc','grade','specification','uom','currency','price','tax_included','freight_included','lead_time_days','moq','supplier_part_number','effective_from','expiry_date','source_quotation'],
        appendOnly: true },
      'evaluations': { table: 'supplier_evaluations', fk: 'supplier_id', order: 'period DESC',
        cols: ['period','on_time_delivery_pct','quality_acceptance_pct','rejection_rate_pct','price_competitiveness','responsiveness','document_compliance','overall_score','risk_level','approved_vendor','notes'] }
    }
  },
  products: {
    module: 'product', parent: 'products',
    subs: {
      'uom-conversions': { table: 'product_uom_conversions', fk: 'product_id', order: 'from_uom',
        cols: ['from_uom','to_uom','factor'] },
      'files': { table: 'product_files', fk: 'product_id', order: 'created_at DESC',
        cols: ['file_id','title','file_type','revision','confidentiality','customer_owned'] },
      'bom': { table: 'bom_headers', fk: 'product_id', order: 'revision_no DESC',
        cols: ['revision_no','bom_type','effective_date','notes'] },
      'cost-revisions': { table: 'product_cost_revisions', fk: 'product_id', order: 'revision_no DESC',
        cols: ['revision_no','cost_raw_material','cost_consumable','cost_bought_out','cost_subcontract','cost_labor','cost_machine','cost_tooling','cost_electricity','cost_overhead','cost_packaging','cost_freight','cost_qc','cost_other','calculation_notes'] }
    }
  }
};

const LIFECYCLE_ACTIONS = {
  submit:  { from: ['DRAFT'], to: 'PENDING_REVIEW' },
  approve: { from: ['PENDING_REVIEW'], to: 'APPROVED', perm: 'approve' },
  activate:{ from: ['APPROVED','SUSPENDED'], to: 'ACTIVE', perm: 'approve' },
  suspend: { from: ['ACTIVE'], to: 'SUSPENDED', reason: true },
  block:   { from: ['ACTIVE','SUSPENDED'], to: 'BLOCKED', reason: true, perm: 'approve' },
  obsolete:{ from: ['ACTIVE','SUSPENDED','BLOCKED'], to: 'OBSOLETE', reason: true, perm: 'approve' },
  archive: { from: ['OBSOLETE','BLOCKED'], to: 'ARCHIVED', reason: true, perm: 'approve' }
};

function spec(master, sub) {
  const m = REGISTRY[master];
  if (!m) throw new AppError('RESOURCE_NOT_FOUND', `Master '${master}' tidak dikenal.`);
  if (sub === undefined) return { m };
  const s = m.subs[sub];
  if (!s) throw new AppError('RESOURCE_NOT_FOUND', `Sub-resource '${sub}' tidak tersedia untuk ${master}.`);
  return { m, s };
}

async function parentRow(client, master, id) {
  const { m } = spec(master);
  const row = (await client.query(`SELECT * FROM ${m.parent} WHERE id=$1`, [id])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Data master tidak ditemukan.');
  return row;
}

// Ringkasan untuk tab Overview: induk + jumlah baris per sub-resource.
async function overview(client, master, id, user) {
  const { m } = spec(master);
  assertPermission(user, `${m.module}.view`);
  const parent = runtime.camel(await parentRow(client, master, id));
  const counts = {};
  for (const [name, s] of Object.entries(m.subs)) {
    counts[name] = Number((await client.query(`SELECT count(*)::int n FROM ${s.table} WHERE ${s.fk}=$1`, [id])).rows[0].n);
  }
  if (master === 'employees' && !canSeeSalary(user)) parent.baseSalary = maskMoney();
  return { ...parent, subCounts: counts };
}

async function listSub(client, master, id, sub, user) {
  const { m, s } = spec(master, sub);
  assertPermission(user, `${m.module}.view`);
  if (s.viewGuard) s.viewGuard(user);
  await parentRow(client, master, id);
  const rows = (await client.query(
    `SELECT * FROM ${s.table} WHERE ${s.fk}=$1 ORDER BY ${s.order || 'id'} LIMIT 200`, [id]
  )).rows.map(runtime.camel);
  return s.mask ? rows.map((row) => s.mask(row, user)) : rows;
}

async function createSub(client, master, id, sub, body, user, requestId) {
  const { m, s } = spec(master, sub);
  assertPermission(user, `${m.module}.edit`);
  if (s.guard) s.guard(user);
  if (s.reason && !body.change_reason && !body.changeReason) throw new AppError('REASON_REQUIRED');
  await parentRow(client, master, id);

  const snake = (k) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
  const payload = {};
  for (const [key, value] of Object.entries(body)) {
    const col = snake(key);
    if (s.cols.includes(col) && value !== undefined && value !== '') payload[col] = value;
  }
  if (!Object.keys(payload).length) throw new AppError('VALIDATION_ERROR', 'Tidak ada kolom valid untuk disimpan.');

  // Riwayat harga supplier: append-only dengan nomor revisi berjalan (§10.5).
  if (s.appendOnly && s.table === 'supplier_price_history') {
    const rev = (await client.query(
      `SELECT COALESCE(max(revision_no),0)+1 rev FROM supplier_price_history WHERE supplier_id=$1 AND material_desc=$2`,
      [id, payload.material_desc || ''])).rows[0].rev;
    payload.revision_no = rev;
    await client.query(
      `UPDATE supplier_price_history SET status='SUPERSEDED' WHERE supplier_id=$1 AND material_desc=$2 AND status='ACTIVE'`,
      [id, payload.material_desc || '']);
  }
  // Bank supplier: maker-checker (§10.3) — masuk sebagai usulan ber-hold.
  if (s.makerChecker) { payload.proposed_by = user.id; payload.payment_hold = true; payload.verification_status = 'PENDING_VERIFICATION'; }
  if (s.cols.includes('created_by') || ['employee_positions','employee_contracts','employee_documents','customer_contacts','product_files'].includes(s.table)) payload.created_by = user.id;
  if (s.table === 'employee_compensation_history') { payload.created_by = user.id; payload.approval_reason = body.change_reason || body.changeReason || payload.approval_reason; }

  const keys = Object.keys(payload);
  const inserted = (await client.query(
    `INSERT INTO ${s.table}(${s.fk},${keys.join(',')}) VALUES($1,${keys.map((_, i) => `$${i + 2}`).join(',')}) RETURNING *`,
    [id, ...keys.map((k) => payload[k])])).rows[0];

  await runtime.audit(client, {
    userId: user.id, action: 'CREATE', module: m.module, entityType: `${master}.${sub}`.toUpperCase(),
    entityId: inserted.id, newValue: { parent: id, ...payload, account_number: payload.account_number ? maskAccount(payload.account_number) : undefined, base_salary: payload.base_salary ? 'REDACTED' : undefined },
    reason: body.change_reason || body.changeReason || null, requestId, branchId: user.branchId
  });
  return runtime.camel(inserted);
}

// Approve bank supplier: checker ≠ maker (SoD juga ditegakkan constraint DB).
async function approveSupplierBank(client, supplierId, bankId, user, requestId) {
  assertPermission(user, 'supplier.approve');
  const row = (await client.query(
    `SELECT * FROM supplier_bank_accounts WHERE id=$1 AND supplier_id=$2`, [bankId, supplierId])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Rekening supplier tidak ditemukan.');
  if (row.proposed_by === user.id) throw new AppError('PERMISSION_DENIED', 'SoD: pengusul tidak boleh menyetujui rekening yang sama (maker ≠ checker).');
  if (row.verification_status === 'VERIFIED') throw new AppError('VALIDATION_ERROR', 'Rekening sudah terverifikasi.');
  const updated = (await client.query(
    `UPDATE supplier_bank_accounts SET verification_status='VERIFIED', payment_hold=false, approved_by=$3, approved_at=now()
     WHERE id=$1 AND supplier_id=$2 RETURNING *`, [bankId, supplierId, user.id])).rows[0];
  await runtime.audit(client, {
    userId: user.id, action: 'APPROVE', module: 'supplier', entityType: 'SUPPLIER_BANK', entityId: bankId,
    oldValue: { verificationStatus: row.verification_status, paymentHold: row.payment_hold },
    newValue: { verificationStatus: 'VERIFIED', paymentHold: false, account: maskAccount(row.account_number) },
    requestId, branchId: user.branchId
  });
  return runtime.camel(updated);
}

// Aktivasi HPP (§11.4): APPROVED → ACTIVE; revisi ACTIVE lama SUPERSEDED;
// products.hpp menjadi snapshot Active HPP untuk transaksi.
async function activateCostRevision(client, productId, revisionId, user, requestId) {
  assertPermission(user, 'product.approve');
  const row = (await client.query(
    `SELECT * FROM product_cost_revisions WHERE id=$1 AND product_id=$2 FOR UPDATE`, [revisionId, productId])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Revisi biaya tidak ditemukan.');
  if (!['APPROVED', 'LOCKED'].includes(row.status)) throw new AppError('STATUS_INVALID', `Aktivasi HPP hanya dari status APPROVED/LOCKED (sekarang ${row.status}).`);
  await client.query(`UPDATE product_cost_revisions SET status='SUPERSEDED' WHERE product_id=$1 AND status='ACTIVE'`, [productId]);
  const updated = (await client.query(
    `UPDATE product_cost_revisions SET status='ACTIVE', activated_at=now() WHERE id=$1 RETURNING *`, [revisionId])).rows[0];
  await client.query(`UPDATE products SET hpp=$2, updated_at=now() WHERE id=$1`, [productId, updated.total_cost]);
  await runtime.audit(client, {
    userId: user.id, action: 'APPROVE', module: 'product', entityType: 'PRODUCT_HPP', entityId: revisionId,
    oldValue: { status: row.status }, newValue: { status: 'ACTIVE', totalCost: Number(updated.total_cost), revisionNo: updated.revision_no },
    reason: 'Aktivasi Active HPP', requestId, branchId: user.branchId
  });
  return runtime.camel(updated);
}

// Approve/promosikan revisi (BOM & HPP): DRAFT→REVIEW→APPROVED (+EFFECTIVE utk BOM).
async function promoteRevision(client, { table, parentCol, parentId, rowId, action, user, requestId, module }) {
  assertPermission(user, `${module}.approve`);
  const flows = {
    bom_headers: { review: ['DRAFT', 'REVIEW'], approve: ['REVIEW', 'APPROVED'], effective: ['APPROVED', 'EFFECTIVE'] },
    product_cost_revisions: { review: ['DRAFT', 'REVIEW'], approve: ['REVIEW', 'APPROVED'], lock: ['APPROVED', 'LOCKED'] }
  };
  const flow = flows[table] && flows[table][action];
  if (!flow) throw new AppError('VALIDATION_ERROR', `Aksi '${action}' tidak dikenal untuk revisi ini.`);
  const row = (await client.query(`SELECT * FROM ${table} WHERE id=$1 AND ${parentCol}=$2 FOR UPDATE`, [rowId, parentId])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND');
  if (row.status !== flow[0]) throw new AppError('STATUS_INVALID', `Transisi ${action} butuh status ${flow[0]} (sekarang ${row.status}).`);
  if (table === 'bom_headers' && action === 'effective') {
    await client.query(`UPDATE bom_headers SET status='SUPERSEDED' WHERE ${parentCol}=$1 AND bom_type=$2 AND status='EFFECTIVE'`, [parentId, row.bom_type]);
  }
  const updated = (await client.query(
    `UPDATE ${table} SET status=$2${['approve','effective','lock'].includes(action) ? ', approved_by=$3, approved_at=now()' : ''} WHERE id=$1 RETURNING *`,
    ['approve','effective','lock'].includes(action) ? [rowId, flow[1], user.id] : [rowId, flow[1]])).rows[0];
  await runtime.audit(client, { userId: user.id, action: 'APPROVE', module, entityType: table.toUpperCase(), entityId: rowId, oldValue: { status: row.status }, newValue: { status: flow[1] }, requestId, branchId: user.branchId });
  return runtime.camel(updated);
}

// Lifecycle MDM (§6) pada master induk.
async function lifecycle(client, master, id, action, reason, user, requestId) {
  const { m } = spec(master);
  const rule = LIFECYCLE_ACTIONS[action];
  if (!rule) throw new AppError('VALIDATION_ERROR', `Aksi lifecycle '${action}' tidak dikenal.`);
  assertPermission(user, `${m.module}.${rule.perm || 'edit'}`);
  if (rule.reason && !reason) throw new AppError('REASON_REQUIRED');
  const row = await parentRow(client, master, id);
  if (!rule.from.includes(row.lifecycle_status)) {
    throw new AppError('STATUS_INVALID', `Lifecycle '${action}' tidak diizinkan dari status ${row.lifecycle_status}.`);
  }
  const updated = (await client.query(
    `UPDATE ${m.parent} SET lifecycle_status=$2, mdm_version=mdm_version+1, change_reason=$3, data_steward=$4, updated_at=now() WHERE id=$1 RETURNING *`,
    [id, rule.to, reason || null, user.id])).rows[0];
  await runtime.audit(client, {
    userId: user.id, action: action === 'approve' || action === 'activate' ? 'APPROVE' : 'UPDATE', module: m.module,
    entityType: `${master}.LIFECYCLE`.toUpperCase(), entityId: id,
    oldValue: { lifecycleStatus: row.lifecycle_status }, newValue: { lifecycleStatus: rule.to },
    reason: reason || null, requestId, branchId: user.branchId
  });
  return runtime.camel(updated);
}

module.exports = { REGISTRY, overview, listSub, createSub, approveSupplierBank, activateCostRevision, promoteRevision, lifecycle };
