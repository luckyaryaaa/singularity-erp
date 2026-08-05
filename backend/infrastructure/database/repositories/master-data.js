'use strict';
// Master data enterprise (R014/R015): sub-resource ber-whitelist, lifecycle MDM,
// maker-checker bank supplier, aktivasi HPP, dan masking field sensitif di server.

const { AppError } = require('../../../core/errors');
const { assertPermission, hasPermission } = require('../../../core/permissions');
const fieldEncryption = require('../../../core/field-encryption');
const runtime = require('./runtime');
const masterGovernance = require('./master-governance');

const maskAccount = (value) => value ? `••••${String(value).slice(-4)}` : value;
const maskMoney = () => 'Rp ••••••••';
const maskIdentifier = (value) => value
  ? `${String(value).slice(0, 2)}••••••${String(value).slice(-4)}`
  : value;
const canSeeSalary = (user) => hasPermission(user, 'payroll.view') || hasPermission(user, '*');
const canSeeBank = (user) => ['owner','finance_manager','accounting'].includes(user.role) || hasPermission(user, '*');

// Registry sub-resource: tabel, kolom yang boleh ditulis, urutan, dan masking.
const REGISTRY = {
  employees: {
    module: 'employee', parent: 'employees',
    subs: {
      'personal': { table: 'employee_personal_profiles', fk: 'employee_id', single: true,
        cols: ['nik_ktp','birth_place','birth_date','gender','marital_status','religion','address','phone','personal_email','blood_type'],
        encrypted: { field: 'nik_ktp', purpose: 'employee_personal.nik_ktp', blind: true },
        guard: (u) => assertPermission(u, 'employee.edit'),
        mask: (row, u) => canSeeSalary(u) ? row : { ...row, nikKtp: maskIdentifier(row.nikKtp) } },
      'positions': { table: 'employee_positions', fk: 'employee_id', order: 'effective_from DESC',
        cols: ['department_id','division','position_title','supervisor_employee_id','branch_id','work_location','shift_group','salary_grade','payroll_frequency','commission_eligible','effective_from','effective_to'] },
      'employment-history': { table: 'employee_employment_history', fk: 'employee_id', order: 'event_date DESC',
        cols: ['employment_type','employment_status','event_date','event_reason'] },
      'contracts': { table: 'employee_contracts', fk: 'employee_id', order: 'start_date DESC',
        cols: ['contract_number','contract_type','start_date','end_date','probation_end','permanent_date','file_id','status'] },
      'compensation': { table: 'employee_compensation_history', fk: 'employee_id', order: 'effective_from DESC',
        cols: ['base_salary','fixed_allowance','variable_allowance','salary_grade','effective_from','effective_to','approval_reason'],
        viewGuard: (u) => { if (!canSeeSalary(u)) throw new AppError('PERMISSION_DENIED', 'Data kompensasi membutuhkan izin payroll.'); },
        reason: true, makerChecker: true, workflow: 'compensation' },
      'tax-profiles': { table: 'employee_tax_profiles', fk: 'employee_id', order: 'effective_from DESC',
        cols: ['npwp','tax_subject','tax_scheme','ptkp_status','ter_category','ter_rate','tax_method','previous_employer_income','effective_from','effective_to','calculation_version'],
        encrypted: { field: 'npwp', purpose: 'employee_tax.npwp', blind: true },
        mask: (row, u) => canSeeSalary(u) ? row : { ...row, npwp: maskIdentifier(row.npwp) } },
      'bpjs': { table: 'employee_bpjs_profiles', fk: 'employee_id', order: 'program',
        cols: ['program','membership_number','wage_base','risk_category','employer_pct','employee_pct','ceiling_amount','floor_amount','active_from','active_to','calculation_version'],
        encrypted: { field: 'membership_number', purpose: 'employee_bpjs.membership_number', blind: true },
        mask: (row, u) => canSeeSalary(u) ? row : { ...row, membershipNumber: maskIdentifier(row.membershipNumber) } },
      'insurance': { table: 'employee_insurance_profiles', fk: 'employee_id', order: 'effective_from DESC',
        cols: ['insurer','policy_number','coverage_type','family_covered','premium','employer_contribution','employee_contribution','effective_from','expiry_date','file_id'] },
      'insurance-claims': { table: 'employee_insurance_claim_history', fk: 'employee_id', order: 'claim_date DESC',
        cols: ['insurance_profile_id','claim_number','claim_date','claim_type','amount','status','notes'] },
      'bank-accounts': { table: 'employee_bank_accounts', fk: 'employee_id', order: 'created_at DESC',
        cols: ['bank_name','account_number','account_holder','currency','effective_from','effective_to','is_primary','change_reason'],
        encrypted: { field: 'account_number', purpose: 'employee_bank.account_number', blind: true },
        reason: true, makerChecker: true, workflow: 'employeeBank',
        mask: (row, u) => canSeeBank(u) ? row : { ...row, accountNumber: maskAccount(row.accountNumber) } },
      'documents': { table: 'employee_documents', fk: 'employee_id', order: 'created_at DESC',
        cols: ['document_type','title','file_id','expiry_date','verified'] },
      'certifications': { table: 'employee_certifications', fk: 'employee_id', order: 'expiry_date',
        cols: ['name','issuer','certificate_number','issued_date','expiry_date','file_id','skill_tags'] },
      'emergency-contacts': { table: 'employee_emergency_contacts', fk: 'employee_id', order: 'name',
        cols: ['name','relationship','phone','address','restricted_notes','confidentiality'],
        encrypted: { field: 'restricted_notes', purpose: 'employee_emergency.restricted_notes' },
        viewGuard: (u) => assertPermission(u, 'employee.edit') },
      'restricted-records': { table: 'employee_restricted_records', fk: 'employee_id', order: 'created_at DESC',
        cols: ['record_type','title','restricted_notes','file_id','effective_from','effective_to'],
        encrypted: { field: 'restricted_notes', purpose: 'employee_restricted.restricted_notes' },
        guard: (u) => assertPermission(u,'employee.edit'), viewGuard: (u) => assertPermission(u,'employee.edit') },
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
        cols: ['product_id','price','currency','effective_from','expiry_date','status'], overlap: { from:'effective_from', to:'expiry_date', key:'product_id' } }
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
        encrypted: { field: 'account_number', purpose: 'supplier_bank.account_number', blind: true },
        reason: true, makerChecker: true,
        mask: (row, u) => canSeeBank(u) ? row : { ...row, accountNumber: maskAccount(row.accountNumber) } },
      'materials': { table: 'supplier_materials', fk: 'supplier_id', order: 'category',
        cols: ['product_id','category','grade_spec','brand','supplier_part_number','uom','moq','lead_time_days','certification','approved_status','valid_from','valid_to'], overlap: { from:'valid_from', to:'valid_to', key:'category' } },
      'price-history': { table: 'supplier_price_history', fk: 'supplier_id', order: 'effective_from DESC',
        cols: ['product_id','material_desc','grade','specification','uom','currency','price','tax_included','freight_included','lead_time_days','moq','supplier_part_number','effective_from','expiry_date','source_quotation'],
        appendOnly: true },
      'evaluations': { table: 'supplier_evaluations', fk: 'supplier_id', order: 'period DESC',
        cols: ['period','on_time_delivery_pct','quality_acceptance_pct','rejection_rate_pct','price_competitiveness','responsiveness','document_compliance','overall_score','risk_level','approved_vendor','notes'] },
      'documents': { table: 'supplier_documents', fk: 'supplier_id', order: 'expiry_date NULLS LAST, created_at DESC',
        cols: ['document_type','document_number','title','file_id','issue_date','expiry_date','required','notes'], makerChecker: true, workflow: 'supplierDocument' }
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
        cols: ['revision_no','cost_raw_material','cost_consumable','cost_bought_out','cost_subcontract','cost_labor','cost_machine','cost_tooling','cost_electricity','cost_overhead','cost_packaging','cost_freight','cost_qc','cost_other','calculation_notes'] },
      'variants': { table: 'product_variants', fk: 'parent_product_id', order: 'variant_code',
        cols: ['variant_product_id','variant_code','variant_name','attributes','uom','price','status','effective_from','effective_to'] }
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

function decryptSensitive(s, row, parentId) {
  if (!row || !s.encrypted) return row;
  const field = s.encrypted.field;
  const cipher = row[`${field}_ciphertext`];
  if (cipher) {
    row[field] = fieldEncryption.decrypt(cipher,
      { purpose: s.encrypted.purpose, scope: parentId });
  }
  delete row[`${field}_ciphertext`];
  delete row[`${field}_key_id`];
  delete row[`${field}_blind_index`];
  return row;
}

function encryptSensitive(s, payload, parentId) {
  if (!s.encrypted || payload[s.encrypted.field] === undefined) return null;
  const field = s.encrypted.field;
  const plaintext = String(payload[field]);
  const protectedValue = fieldEncryption.protect(plaintext,
    { purpose: s.encrypted.purpose, scope: parentId, blind: Boolean(s.encrypted.blind) });
  payload[field] = protectedValue.legacyToken;
  payload[`${field}_ciphertext`] = protectedValue.ciphertext;
  payload[`${field}_key_id`] = protectedValue.keyId;
  if (s.encrypted.blind) payload[`${field}_blind_index`] = protectedValue.blindIndex;
  return plaintext;
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
  if (master === 'employees') {
    const summary=(await client.query(`SELECT
      (SELECT row_to_json(x) FROM (SELECT position_title,division,work_location,salary_grade,effective_from FROM employee_positions WHERE employee_id=$1 AND effective_from<=current_date AND (effective_to IS NULL OR effective_to>=current_date) ORDER BY effective_from DESC LIMIT 1)x) current_position,
      (SELECT row_to_json(x) FROM (SELECT employment_type,employment_status,event_date FROM employee_employment_history WHERE employee_id=$1 ORDER BY event_date DESC LIMIT 1)x) employment,
      (SELECT row_to_json(x) FROM (SELECT base_salary,fixed_allowance,variable_allowance,salary_grade,effective_from,approval_status FROM employee_compensation_history WHERE employee_id=$1 ORDER BY effective_from DESC LIMIT 1)x) compensation,
      (SELECT row_to_json(x) FROM (SELECT ptkp_status,ter_category,ter_rate,tax_scheme,tax_method,effective_from FROM employee_tax_profiles WHERE employee_id=$1 AND effective_from<=current_date AND (effective_to IS NULL OR effective_to>=current_date) ORDER BY effective_from DESC LIMIT 1)x) tax,
      (SELECT count(*)::int FROM employee_bpjs_profiles WHERE employee_id=$1 AND active_from<=current_date AND (active_to IS NULL OR active_to>=current_date)) bpjs_programs,
      (SELECT count(*)::int FROM employee_insurance_profiles WHERE employee_id=$1 AND COALESCE(effective_from,current_date)<=current_date AND (expiry_date IS NULL OR expiry_date>=current_date)) insurance_policies,
      (SELECT row_to_json(x) FROM (SELECT bank_name,account_number,account_number_ciphertext,account_number_key_id,account_holder,currency,verification_status FROM employee_bank_accounts WHERE employee_id=$1 ORDER BY is_primary DESC,created_at DESC LIMIT 1)x) payroll_bank,
      (SELECT count(*)::int FROM employee_documents WHERE employee_id=$1 AND expiry_date BETWEEN current_date AND current_date+interval '90 days') expiring_documents,
      (SELECT count(*)::int FROM attendance_records WHERE employee_id=$1 AND work_date>=date_trunc('month',current_date)) attendance_days,
      (SELECT jsonb_build_object('entitlement',entitlement,'used',used,'remaining',entitlement-used) FROM leave_balances WHERE employee_id=$1 AND year=extract(year from current_date)) leave_balance,
      (SELECT count(*)::int FROM app_users WHERE employee_id=$1 AND active) active_user_accounts`,[id])).rows[0];
    const required=[parent.nik,parent.name,parent.department,parent.branchId,parent.joinDate,summary.current_position,summary.employment,summary.tax,summary.payroll_bank];
    parent.completeness={score:Math.round(required.filter(Boolean).length/required.length*100),completed:required.filter(Boolean).length,total:required.length};
    if (summary.payroll_bank) decryptSensitive(
      { encrypted: { field: 'account_number', purpose: 'employee_bank.account_number' } },
      summary.payroll_bank, id);
    const enterprise=runtime.camel(summary);
    // row_to_json mengembalikan snake_case; runtime.camel hanya dangkal, jadi
    // objek nested (posisi, kompensasi, pajak, bank) di-camel-kan satu tingkat.
    for(const k of ['currentPosition','employment','compensation','tax','payrollBank'])if(enterprise[k]&&typeof enterprise[k]==='object')enterprise[k]=runtime.camel(enterprise[k]);
    if(!canSeeSalary(user)){parent.baseSalary=maskMoney();if(enterprise.compensation){enterprise.compensation.baseSalary=maskMoney();enterprise.compensation.fixedAllowance=maskMoney();enterprise.compensation.variableAllowance=maskMoney();}}
    if(enterprise.payrollBank&&!canSeeBank(user))enterprise.payrollBank.accountNumber=maskAccount(enterprise.payrollBank.accountNumber);
    parent.enterpriseSummary=enterprise;
  }
  if (master === 'suppliers') {
    // Kepatuhan dokumen vendor (sertifikat/kontrak) dgn deteksi kedaluwarsa —
    // pola SAP vendor compliance: kadaluwarsa, ≤90 hari, wajib belum verified.
    parent.documentCompliance = runtime.camel((await client.query(`SELECT
      count(*)::int total,
      count(*) FILTER(WHERE expiry_date IS NOT NULL AND expiry_date < current_date)::int expired,
      count(*) FILTER(WHERE expiry_date BETWEEN current_date AND current_date + interval '90 days')::int expiring,
      count(*) FILTER(WHERE verification_status='VERIFIED')::int verified,
      count(*) FILTER(WHERE required AND COALESCE(verification_status,'') <> 'VERIFIED')::int required_pending
      FROM supplier_documents WHERE supplier_id=$1`, [id])).rows[0]);
    parent.expiringDocumentList = (await client.query(`SELECT title,document_type,expiry_date,verification_status
      FROM supplier_documents WHERE supplier_id=$1 AND expiry_date IS NOT NULL AND expiry_date < current_date + interval '90 days'
      ORDER BY expiry_date ASC LIMIT 5`, [id])).rows.map(runtime.camel);
  }
  return { ...parent, subCounts: counts };
}

async function listSub(client, master, id, sub, user) {
  const { m, s } = spec(master, sub);
  assertPermission(user, `${m.module}.view`);
  if (s.viewGuard) s.viewGuard(user);
  await parentRow(client, master, id);
  const rows = (await client.query(
    `SELECT * FROM ${s.table} WHERE ${s.fk}=$1 ORDER BY ${s.order || 'id'} LIMIT 200`, [id]
  )).rows.map((row) => runtime.camel(decryptSensitive(s, row, id)));
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
  const sensitivePlaintext = encryptSensitive(s, payload, id);

  if (s.overlap && payload[s.overlap.from]) {
    const { from, to, key, activeOnly } = s.overlap;
    const params=[id,payload[from],payload[to]||null];
    let where=`${s.fk}=$1 AND daterange(${from},COALESCE(${to},'infinity'::date),'[]') && daterange($2::date,COALESCE($3::date,'infinity'::date),'[]')`;
    if(key && payload[key]){params.push(payload[key]);where+=` AND ${key}=$${params.length}`;}
    if(key && !payload[key])where+=` AND ${key} IS NULL`;
    if(activeOnly)where+=` AND status='ACTIVE'`;
    if((await client.query(`SELECT 1 FROM ${s.table} WHERE ${where} LIMIT 1`,params)).rowCount)
      throw new AppError('VALIDATION_ERROR','Periode efektif tumpang tindih dengan data yang sudah ada.');
  }

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
  if (s.makerChecker && s.workflow === 'employeeBank') { payload.proposed_by = user.id; payload.verification_status = 'PENDING_VERIFICATION'; }
  if (s.makerChecker && s.workflow === 'compensation') { payload.created_by = user.id; payload.approval_status = 'PENDING_APPROVAL'; }
  if (s.makerChecker && s.workflow === 'supplierDocument') { payload.created_by = user.id; payload.verification_status = 'PENDING'; }
  if (s.makerChecker && !s.workflow) { payload.proposed_by = user.id; payload.payment_hold = true; payload.verification_status = 'PENDING_VERIFICATION'; }
  if (s.cols.includes('created_by') || ['employee_positions','employee_contracts','employee_documents','customer_contacts','product_files'].includes(s.table)) payload.created_by = user.id;
  if (s.table === 'employee_compensation_history') { payload.created_by = user.id; payload.approval_reason = body.change_reason || body.changeReason || payload.approval_reason; }

  const keys = Object.keys(payload);
  const inserted = (await client.query(
    `INSERT INTO ${s.table}(${s.fk},${keys.join(',')}) VALUES($1,${keys.map((_, i) => `$${i + 2}`).join(',')}) RETURNING *`,
    [id, ...keys.map((k) => payload[k])])).rows[0];

  const auditedPayload = { parent: id, ...payload };
  if (s.encrypted) {
    const field = s.encrypted.field;
    delete auditedPayload[`${field}_ciphertext`];
    delete auditedPayload[`${field}_key_id`];
    delete auditedPayload[`${field}_blind_index`];
    auditedPayload[field] = field === 'account_number' && sensitivePlaintext
      ? maskAccount(sensitivePlaintext)
      : sensitivePlaintext ? 'REDACTED' : auditedPayload[field];
  }
  if (payload.base_salary !== undefined) auditedPayload.base_salary = 'REDACTED';
  if (payload.fixed_allowance !== undefined) auditedPayload.fixed_allowance = 'REDACTED';
  if (payload.variable_allowance !== undefined) auditedPayload.variable_allowance = 'REDACTED';
  await runtime.audit(client, {
    userId: user.id, action: 'CREATE', module: m.module, entityType: `${master}.${sub}`.toUpperCase(),
    entityId: inserted.id, newValue: auditedPayload,
    reason: body.change_reason || body.changeReason || null, requestId, branchId: user.branchId
  });
  await masterGovernance.refreshQuality(client, master, id);
  return runtime.camel(decryptSensitive(s, inserted, id));
}

// Approve bank supplier: checker ≠ maker (SoD juga ditegakkan constraint DB).
async function approveSupplierBank(client, supplierId, bankId, user, requestId) {
  assertPermission(user, 'supplier.approve');
  const row = (await client.query(
    `SELECT * FROM supplier_bank_accounts WHERE id=$1 AND supplier_id=$2`, [bankId, supplierId])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Rekening supplier tidak ditemukan.');
  if (row.proposed_by === user.id) throw new AppError('PERMISSION_DENIED', 'SoD: pengusul tidak boleh menyetujui rekening yang sama (maker ≠ checker).');
  if (row.verification_status === 'VERIFIED') throw new AppError('VALIDATION_ERROR', 'Rekening sudah terverifikasi.');
  const account = decryptSensitive(spec('suppliers', 'bank-accounts').s, { ...row }, supplierId).account_number;
  const updated = (await client.query(
    `UPDATE supplier_bank_accounts SET verification_status='VERIFIED', payment_hold=false, approved_by=$3, approved_at=now()
     WHERE id=$1 AND supplier_id=$2 RETURNING *`, [bankId, supplierId, user.id])).rows[0];
  await runtime.audit(client, {
    userId: user.id, action: 'APPROVE', module: 'supplier', entityType: 'SUPPLIER_BANK', entityId: bankId,
    oldValue: { verificationStatus: row.verification_status, paymentHold: row.payment_hold },
    newValue: { verificationStatus: 'VERIFIED', paymentHold: false, account: maskAccount(account) },
    requestId, branchId: user.branchId
  });
  return runtime.camel(decryptSensitive(spec('suppliers', 'bank-accounts').s, updated, supplierId));
}

async function decideSupplierDocument(client,supplierId,documentId,decision,user,requestId){
  assertPermission(user,'supplier.approve');
  if(!['verify','reject'].includes(decision))throw new AppError('VALIDATION_ERROR');
  const row=(await client.query(`SELECT * FROM supplier_documents WHERE id=$1 AND supplier_id=$2 FOR UPDATE`,[documentId,supplierId])).rows[0];
  if(!row)throw new AppError('RESOURCE_NOT_FOUND');
  if(row.created_by===user.id)throw new AppError('SOD_CONFLICT','Pembuat dokumen supplier tidak boleh menjadi verifier.');
  if(row.verification_status!=='PENDING')throw new AppError('STATUS_INVALID');
  const status=decision==='verify'?'VERIFIED':'REJECTED';
  const updated=(await client.query(`UPDATE supplier_documents SET verification_status=$3,verified_by=$4,verified_at=now() WHERE id=$1 AND supplier_id=$2 RETURNING *`,[documentId,supplierId,status,user.id])).rows[0];
  await runtime.audit(client,{userId:user.id,action:decision==='verify'?'APPROVE':'REJECT',module:'supplier',entityType:'SUPPLIER_DOCUMENT',entityId:documentId,oldValue:{status:row.verification_status},newValue:{status},requestId,branchId:user.branchId});
  await masterGovernance.refreshQuality(client,'suppliers',supplierId);
  return runtime.camel(updated);
}

// Perubahan gaji dan rekening payroll selalu melalui maker-checker.
async function decideEmployeeSensitive(client,{employeeId,kind,rowId,decision,reason,user,requestId}){
  assertPermission(user,decision==='approve'?'employee.approve':'employee.reject');
  const config=kind==='bank-accounts'
    ?{table:'employee_bank_accounts',statusCol:'verification_status',pending:'PENDING_VERIFICATION',approved:'VERIFIED',rejected:'REJECTED',maker:'proposed_by'}
    :kind==='compensation'
      ?{table:'employee_compensation_history',statusCol:'approval_status',pending:'PENDING_APPROVAL',approved:'APPROVED',rejected:'REJECTED',maker:'created_by'}:null;
  if(!config)throw new AppError('VALIDATION_ERROR');
  const row=(await client.query(`SELECT * FROM ${config.table} WHERE id=$1 AND employee_id=$2 FOR UPDATE`,[rowId,employeeId])).rows[0];
  if(!row)throw new AppError('RESOURCE_NOT_FOUND');
  if(row[config.maker]===user.id)throw new AppError('SOD_CONFLICT','Maker tidak boleh menjadi checker untuk perubahan sensitif employee.');
  if(row[config.statusCol]!==config.pending)throw new AppError('STATUS_INVALID');
  if(decision==='reject'&&!String(reason||'').trim())throw new AppError('REASON_REQUIRED');
  if(decision==='approve'&&kind==='bank-accounts'&&row.is_primary){
    await client.query(`UPDATE employee_bank_accounts SET is_primary=false WHERE employee_id=$1 AND verification_status='VERIFIED'`,[employeeId]);
  }
  if(decision==='approve'&&kind==='compensation'){
    await client.query(`UPDATE employee_compensation_history SET approval_status='SUPERSEDED',effective_to=COALESCE(effective_to,$2::date-1) WHERE employee_id=$1 AND approval_status='APPROVED'`,[employeeId,row.effective_from]);
    await client.query('UPDATE employees SET base_salary=$2,updated_at=now() WHERE id=$1',[employeeId,row.base_salary]);
  }
  const sql=decision==='approve'
    ?`UPDATE ${config.table} SET ${config.statusCol}=$2,approved_by=$3,approved_at=now() WHERE id=$1 RETURNING *`
    :`UPDATE ${config.table} SET ${config.statusCol}=$2,rejected_by=$3,rejected_at=now(),rejection_reason=$4 WHERE id=$1 RETURNING *`;
  const updated=(await client.query(sql,decision==='approve'?[rowId,config.approved,user.id]:[rowId,config.rejected,user.id,reason])).rows[0];
  await runtime.audit(client,{userId:user.id,action:decision==='approve'?'APPROVE':'REJECT',module:'employee',entityType:`EMPLOYEE_${kind.toUpperCase()}`,entityId:rowId,oldValue:{status:row[config.statusCol]},newValue:{status:updated[config.statusCol]},reason:reason||row.change_reason||row.approval_reason,requestId,branchId:user.branchId});
  const sensitiveSpec = kind === 'bank-accounts' ? spec('employees', 'bank-accounts').s : null;
  return runtime.camel(sensitiveSpec ? decryptSensitive(sensitiveSpec, updated, employeeId) : updated);
}

async function employeeAudit(client,employeeId,user){
  assertPermission(user,'employee.view'); await parentRow(client,'employees',employeeId);
  return (await client.query(`SELECT id,occurred_at,user_id,action,module,entity_type,old_value,new_value,reason,request_id
    FROM audit_logs WHERE entity_id=$1 OR (module='employee' AND (old_value->>'parent'=$1::text OR new_value->>'parent'=$1::text))
    ORDER BY occurred_at DESC LIMIT 200`,[employeeId])).rows.map(runtime.camel);
}

// Foto Party 360 tetap berada di private storage. Master hanya menyimpan UUID
// file; pengunggah harus sama, modul harus cocok, dan hanya gambar yang boleh
// ditautkan. File belum CLEAN boleh ditautkan tetapi belum dapat ditampilkan
// sampai background malware scan selesai.
async function setProfilePhoto(client, master, id, fileId, user, requestId) {
  const { m } = spec(master);
  if (!['customers', 'suppliers', 'products'].includes(master)) throw new AppError('VALIDATION_ERROR', 'Foto profil hanya tersedia untuk Customer, Supplier, dan Produk.');
  assertPermission(user, `${m.module}.edit`);
  const parent = await parentRow(client, master, id);
  if (!fileId || !/^[0-9a-f-]{36}$/i.test(String(fileId))) throw new AppError('VALIDATION_ERROR', 'File foto profil tidak valid.');
  const file = (await client.query(
    `SELECT id,uploaded_by,related_module,mime_type,scan_status,is_deleted
       FROM file_metadata WHERE id=$1`, [fileId])).rows[0];
  if (!file || file.is_deleted) throw new AppError('RESOURCE_NOT_FOUND', 'File foto tidak tersedia.');
  if (file.uploaded_by !== user.id && !hasPermission(user, '*')) throw new AppError('PERMISSION_DENIED', 'Foto hanya dapat ditautkan oleh pengunggahnya.');
  const allowedPhotoMime = new Set(['image/png', 'image/jpeg', 'image/webp']);
  if (file.related_module !== m.module || !allowedPhotoMime.has(String(file.mime_type || '').toLowerCase())) {
    throw new AppError('VALIDATION_ERROR', `Gunakan PNG, JPG, atau WebP yang diunggah untuk modul ${m.module}.`);
  }
  await client.query(
    `UPDATE file_metadata SET access_level='MASTER_PROFILE',confidentiality='INTERNAL',branch_id=NULL
      WHERE id=$1`, [fileId]);
  const updated = (await client.query(
    `UPDATE ${m.parent} SET profile_file_id=$2,updated_at=now() WHERE id=$1 RETURNING *`,
    [id, fileId])).rows[0];
  await runtime.audit(client, {
    userId: user.id, action: 'UPDATE', module: m.module,
    entityType: `${master}.PROFILE_PHOTO`.toUpperCase(), entityId: id,
    oldValue: { profileFileId: parent.profile_file_id || null },
    newValue: { profileFileId: fileId, scanStatus: file.scan_status },
    requestId, branchId: user.branchId
  });
  return { ...runtime.camel(updated), profileScanStatus: file.scan_status };
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
  if (action === 'approve' && row.data_steward && row.data_steward === user.id) {
    throw new AppError('SOD_CONFLICT', 'Data steward/pengusul tidak boleh menyetujui master yang sama.');
  }
  const updated = (await client.query(
    `UPDATE ${m.parent} SET lifecycle_status=$2, mdm_version=mdm_version+1, change_reason=$3, data_steward=COALESCE(data_steward,$4), updated_at=now() WHERE id=$1 RETURNING *`,
    [id, rule.to, reason || null, user.id])).rows[0];
  await runtime.audit(client, {
    userId: user.id, action: action === 'approve' || action === 'activate' ? 'APPROVE' : 'UPDATE', module: m.module,
    entityType: `${master}.LIFECYCLE`.toUpperCase(), entityId: id,
    oldValue: { lifecycleStatus: row.lifecycle_status }, newValue: { lifecycleStatus: rule.to },
    reason: reason || null, requestId, branchId: user.branchId
  });
  return runtime.camel(updated);
}

// Otomasi profil pajak karyawan: dari status kawin + tanggungan + gaji bruto →
// status PTKP, kategori TER (A/B/C), tarif TER bulanan (PP 58/2023). Preview
// selalu, dan bila apply=true dibuat profil pajak effective-dated baru.
async function autoTaxProfile(client, employeeId, body, user, requestId) {
  assertPermission(user, 'employee.edit');
  const emp = (await client.query('SELECT id,base_salary FROM employees WHERE id=$1', [employeeId])).rows[0];
  if (!emp) throw new AppError('RESOURCE_NOT_FOUND', 'Karyawan tidak ditemukan.');
  const idTax = require('../../../core/id-tax');
  const monthlyGross = Number(body.monthlyGross) > 0 ? Number(body.monthlyGross) : Number(emp.base_salary) || 0;
  const calc = idTax.autoTaxProfile({ maritalStatus: body.maritalStatus, dependents: body.dependents, monthlyGross });
  if (body.apply) {
    const effectiveFrom = body.effectiveFrom || new Date().toISOString().slice(0, 10);
    await client.query('UPDATE employee_tax_profiles SET effective_to=$2::date - 1 WHERE employee_id=$1 AND (effective_to IS NULL OR effective_to>=$2::date)', [employeeId, effectiveFrom]);
    await client.query("INSERT INTO employee_tax_profiles(id,employee_id,npwp,tax_scheme,ptkp_status,ter_category,ter_rate,tax_method,effective_from) VALUES(gen_random_uuid(),$1,$2,'PPH21',$3,$4,$5,COALESCE(NULLIF($6,''),'GROSS'),$7)",
      [employeeId, body.npwp || null, calc.ptkpStatus, calc.terCategory, calc.terRate, body.taxMethod, effectiveFrom]);
    await runtime.audit(client, { userId: user.id, action: 'AUTO_TAX', module: 'employee', entityType: 'EMPLOYEE_TAX_PROFILE', entityId: employeeId, newValue: { ...calc, effectiveFrom }, requestId, branchId: user.branchId });
    calc.applied = true; calc.effectiveFrom = effectiveFrom;
  }
  return calc;
}

module.exports = { REGISTRY, overview, listSub, createSub, approveSupplierBank, decideSupplierDocument, decideEmployeeSensitive, employeeAudit, setProfilePhoto, autoTaxProfile, activateCostRevision, promoteRevision, lifecycle };
