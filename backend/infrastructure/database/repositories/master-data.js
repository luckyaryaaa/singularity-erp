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
        cols: ['user_id','role','org_scope','access_start','access_end','review_note'] },
      'goals': { table: 'employee_goals', fk: 'employee_id', order: 'created_at DESC',
        cols: ['period','category','objective','key_results','metric','weight','progress','status','start_date','due_date'] }
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
async function overview(client, master, id, user, options = {}) {
  const { m } = spec(master);
  // Self-service: id berasal dari sesi (user.employeeId), bukan input klien →
  // izin view penuh HR tidak diperlukan; guard IDOR ada di endpoint.
  if (!options.self) assertPermission(user, `${m.module}.view`);
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
      (SELECT count(*)::int FROM app_users WHERE employee_id=$1 AND active) active_user_accounts,
      (SELECT row_to_json(x) FROM (
         SELECT sup.name AS supervisor_name, sup.id AS supervisor_id,
           (SELECT position_title FROM employee_positions WHERE employee_id=sup.id AND effective_from<=current_date AND (effective_to IS NULL OR effective_to>=current_date) ORDER BY effective_from DESC LIMIT 1) AS supervisor_title
         FROM employee_positions p1 JOIN employees sup ON sup.id=p1.supervisor_employee_id
         WHERE p1.employee_id=$1 AND p1.supervisor_employee_id IS NOT NULL AND p1.effective_from<=current_date AND (p1.effective_to IS NULL OR p1.effective_to>=current_date)
         ORDER BY p1.effective_from DESC LIMIT 1)x) supervisor,
      (SELECT count(DISTINCT employee_id)::int FROM employee_positions WHERE supervisor_employee_id=$1 AND effective_from<=current_date AND (effective_to IS NULL OR effective_to>=current_date)) direct_reports`,[id])).rows[0];
    const required=[parent.nik,parent.name,parent.department,parent.branchId,parent.joinDate,summary.current_position,summary.employment,summary.tax,summary.payroll_bank];
    parent.completeness={score:Math.round(required.filter(Boolean).length/required.length*100),completed:required.filter(Boolean).length,total:required.length};
    if (summary.payroll_bank) decryptSensitive(
      { encrypted: { field: 'account_number', purpose: 'employee_bank.account_number' } },
      summary.payroll_bank, id);
    const enterprise=runtime.camel(summary);
    // row_to_json mengembalikan snake_case; runtime.camel hanya dangkal, jadi
    // objek nested (posisi, kompensasi, pajak, bank) di-camel-kan satu tingkat.
    for(const k of ['currentPosition','employment','compensation','tax','payrollBank','supervisor'])if(enterprise[k]&&typeof enterprise[k]==='object')enterprise[k]=runtime.camel(enterprise[k]);
    if(!canSeeSalary(user)){parent.baseSalary=maskMoney();if(enterprise.compensation){enterprise.compensation.baseSalary=maskMoney();enterprise.compensation.fixedAllowance=maskMoney();enterprise.compensation.variableAllowance=maskMoney();}}
    if(enterprise.payrollBank&&!canSeeBank(user))enterprise.payrollBank.accountNumber=maskAccount(enterprise.payrollBank.accountNumber);
    parent.enterpriseSummary=enterprise;
  }
  if (master === 'customers') {
    // Credit cockpit: eksposur AR (faktur belum lunas) vs batas kredit + aging —
    // pola SAP FSCM credit management. OUT = sisa tagihan (amount - paid numerik).
    const OUT = "(amount - COALESCE(NULLIF(payload->>'paid','')::numeric,0))";
    const OPEN = "status NOT IN('CLOSED','CANCELLED','VOID','REJECTED')";
    const cp = runtime.camel((await client.query(`SELECT
      count(*) FILTER(WHERE ${OPEN})::int open_invoices,
      COALESCE(SUM(${OUT}) FILTER(WHERE ${OPEN}),0)::bigint exposure,
      COALESCE(SUM(${OUT}) FILTER(WHERE ${OPEN} AND due_date < current_date),0)::bigint overdue,
      COALESCE(SUM(${OUT}) FILTER(WHERE ${OPEN} AND (due_date IS NULL OR due_date >= current_date)),0)::bigint bucket_current,
      COALESCE(SUM(${OUT}) FILTER(WHERE ${OPEN} AND due_date BETWEEN current_date-30 AND current_date-1),0)::bigint bucket_1_30,
      COALESCE(SUM(${OUT}) FILTER(WHERE ${OPEN} AND due_date BETWEEN current_date-60 AND current_date-31),0)::bigint bucket_31_60,
      COALESCE(SUM(${OUT}) FILTER(WHERE ${OPEN} AND due_date BETWEEN current_date-90 AND current_date-61),0)::bigint bucket_61_90,
      COALESCE(SUM(${OUT}) FILTER(WHERE ${OPEN} AND due_date < current_date-90),0)::bigint bucket_over90,
      COALESCE(SUM(amount) FILTER(WHERE status='CLOSED' AND created_at >= current_date - interval '365 days'),0)::bigint sales12m
      FROM business_documents WHERE document_type='INVOICE' AND party_id=$1`, [id])).rows[0]);
    const limit = Number(parent.creditLimitAmount) || 0, exposure = Number(cp.exposure);
    cp.creditLimit = limit;
    cp.available = limit > 0 ? limit - exposure : null;
    cp.utilizationPct = limit > 0 ? Math.round(exposure / limit * 100) : null;
    cp.status = (limit > 0 && exposure > limit) ? 'OVER_LIMIT' : Number(cp.overdue) > 0 ? 'OVERDUE' : (cp.utilizationPct != null && cp.utilizationPct >= 80) ? 'WATCH' : 'OK';
    cp.aging = { current: Number(cp.bucketCurrent) || 0, d1_30: Number(cp.bucket_1_30) || 0, d31_60: Number(cp.bucket_31_60) || 0, d61_90: Number(cp.bucket_61_90) || 0, over90: Number(cp.bucketOver90) || 0 };
    parent.creditProfile = cp;
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
    s.single
      ? `SELECT * FROM ${s.table} WHERE ${s.fk}=$1 LIMIT 1`
      : `SELECT * FROM ${s.table} WHERE ${s.fk}=$1 ORDER BY ${s.order || 'id'} LIMIT 200`, [id]
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

  if (s.single) payload.updated_by = user.id;
  const keys = Object.keys(payload);
  const inserted = (await client.query(
    s.single
      ? `INSERT INTO ${s.table}(${s.fk},${keys.join(',')}) VALUES($1,${keys.map((_, i) => `$${i + 2}`).join(',')})
         ON CONFLICT (${s.fk}) DO UPDATE SET ${keys.map((k) => `${k}=EXCLUDED.${k}`).join(',')}, updated_at=now() RETURNING *`
      : `INSERT INTO ${s.table}(${s.fk},${keys.join(',')}) VALUES($1,${keys.map((_, i) => `$${i + 2}`).join(',')}) RETURNING *`,
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
    userId: user.id, action: s.single ? 'UPDATE' : 'CREATE', module: m.module, entityType: `${master}.${sub}`.toUpperCase(),
    entityId: inserted.id || id, newValue: auditedPayload,
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
  if (!['customers', 'suppliers', 'products', 'employees'].includes(master)) throw new AppError('VALIDATION_ERROR', 'Foto profil hanya tersedia untuk Customer, Supplier, Produk, dan Karyawan.');
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

// Otomasi profil pajak karyawan: dari status kawin + tanggungan (+ penghasilan
// istri digabung → K/I) + gaji bruto → status PTKP, kategori TER (A/B/C), tarif
// TER bulanan sesuai tabel referensi perusahaan (TER PPH). Preview selalu, dan
// bila apply=true dibuat profil pajak effective-dated baru.
async function autoTaxProfile(client, employeeId, body, user, requestId) {
  assertPermission(user, 'employee.edit');
  const emp = (await client.query('SELECT id,base_salary FROM employees WHERE id=$1', [employeeId])).rows[0];
  if (!emp) throw new AppError('RESOURCE_NOT_FOUND', 'Karyawan tidak ditemukan.');
  const idTax = require('../../../core/id-tax');
  const monthlyGross = Number(body.monthlyGross) > 0 ? Number(body.monthlyGross) : Number(emp.base_salary) || 0;
  const calc = idTax.autoTaxProfile({ maritalStatus: body.maritalStatus, dependents: body.dependents, monthlyGross });
  if (body.apply) {
    // Tanggal berlaku default = current_date (zona bisnis via withTransaction),
    // BUKAN tanggal UTC klien — konsisten dengan aturan tanggal bisnis tunggal.
    const eff = body.effectiveFrom || null;
    await client.query('UPDATE employee_tax_profiles SET effective_to=COALESCE($2::date,current_date) - 1 WHERE employee_id=$1 AND (effective_to IS NULL OR effective_to>=COALESCE($2::date,current_date))', [employeeId, eff]);
    const row = (await client.query("INSERT INTO employee_tax_profiles(id,employee_id,npwp,tax_scheme,ptkp_status,ter_category,ter_rate,tax_method,effective_from) VALUES(gen_random_uuid(),$1,$2,'PPH21',$3,$4,$5,COALESCE(NULLIF($6,''),'GROSS'),COALESCE($7::date,current_date)) RETURNING effective_from::text ef",
      [employeeId, body.npwp || null, calc.ptkpStatus, calc.terCategory, calc.terRate, body.taxMethod, eff])).rows[0];
    await runtime.audit(client, { userId: user.id, action: 'AUTO_TAX', module: 'employee', entityType: 'EMPLOYEE_TAX_PROFILE', entityId: employeeId, newValue: { ...calc, effectiveFrom: row.ef }, requestId, branchId: user.branchId });
    calc.applied = true; calc.effectiveFrom = row.ef;
  }
  return calc;
}

// ── Employee Self-Service (maker-checker pengkinian identitas) ─────────────
// Karyawan hanya boleh mengubah field NON-sensitif; NIK KTP tetap jalur HR.
const SELF_FIELDS = ['birthPlace', 'birthDate', 'gender', 'maritalStatus', 'religion', 'bloodType', 'phone', 'personalEmail', 'address'];

async function myProfile(client, user) {
  if (!user.employeeId) throw new AppError('RESOURCE_NOT_FOUND', 'Akun Anda belum tertaut ke data karyawan. Hubungi HR.');
  const ov = await overview(client, 'employees', user.employeeId, user, { self: true });
  const prow = (await client.query(`SELECT * FROM employee_personal_profiles WHERE employee_id=$1 LIMIT 1`, [user.employeeId])).rows[0];
  let personal = {};
  if (prow) { personal = runtime.camel(decryptSensitive(REGISTRY.employees.subs.personal, prow, user.employeeId)); if (personal.nikKtp) personal.nikKtp = maskIdentifier(personal.nikKtp); }
  const requests = (await client.query(
    `SELECT id, proposed, status, requested_at, decided_at, decision_reason
       FROM employee_self_updates WHERE employee_id=$1 ORDER BY requested_at DESC LIMIT 8`, [user.employeeId])).rows.map(runtime.camel);
  return { ...ov, personal, selfUpdates: requests };
}

async function submitIdentityRequest(client, user, body, requestId) {
  if (!user.employeeId) throw new AppError('RESOURCE_NOT_FOUND', 'Akun Anda belum tertaut ke data karyawan. Hubungi HR.');
  const proposed = {};
  for (const k of SELF_FIELDS) if (body[k] !== undefined && body[k] !== null && String(body[k]).trim() !== '') proposed[k] = body[k];
  if (!Object.keys(proposed).length) throw new AppError('VALIDATION_ERROR', 'Tidak ada perubahan yang diajukan.');
  if (proposed.gender && !['MALE', 'FEMALE'].includes(proposed.gender)) throw new AppError('VALIDATION_ERROR', 'Jenis kelamin tidak valid.');
  const row = (await client.query(
    `INSERT INTO employee_self_updates(employee_id, proposed, requested_by) VALUES($1,$2,$3) RETURNING *`,
    [user.employeeId, JSON.stringify(proposed), user.id])).rows[0];
  await runtime.audit(client, {
    userId: user.id, action: 'CREATE', module: 'employee', entityType: 'EMPLOYEE.SELF_UPDATE',
    entityId: row.id, newValue: { employeeId: user.employeeId, proposed }, requestId, branchId: user.branchId
  });
  return runtime.camel(row);
}

async function listSelfUpdates(client, user, status) {
  assertPermission(user, 'employee.edit');
  const rows = (await client.query(
    `SELECT s.id, s.employee_id, s.proposed, s.status, s.requested_at, s.requested_by, s.decided_at, s.decision_reason,
            e.name AS employee_name, e.nik, ru.username AS requested_by_name
       FROM employee_self_updates s JOIN employees e ON e.id=s.employee_id
       LEFT JOIN app_users ru ON ru.id=s.requested_by
      WHERE ($1::text IS NULL OR s.status=$1) ORDER BY s.requested_at DESC LIMIT 100`, [status || null])).rows;
  return rows.map(runtime.camel);
}

async function decideSelfUpdate(client, { id, decision, reason, user, requestId }) {
  assertPermission(user, 'employee.approve');
  const row = (await client.query(`SELECT * FROM employee_self_updates WHERE id=$1 FOR UPDATE`, [id])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Permintaan pengkinian tidak ditemukan.');
  if (row.status !== 'PENDING') throw new AppError('VALIDATION_ERROR', 'Permintaan sudah diputuskan sebelumnya.');
  if (row.requested_by === user.id) throw new AppError('SOD_CONFLICT', 'Pemohon tidak boleh menyetujui permintaannya sendiri (maker ≠ checker).');
  const status = decision === 'approve' ? 'APPROVED' : 'REJECTED';
  if (decision === 'approve') {
    const proposed = row.proposed || {};
    const snake = (k) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    const payload = {};
    for (const [k, v] of Object.entries(proposed)) if (SELF_FIELDS.includes(k) && v !== undefined && v !== null && String(v).trim() !== '') payload[snake(k)] = v;
    payload.updated_by = user.id;
    const keys = Object.keys(payload);
    await client.query(
      `INSERT INTO employee_personal_profiles(employee_id,${keys.join(',')}) VALUES($1,${keys.map((_, i) => `$${i + 2}`).join(',')})
        ON CONFLICT (employee_id) DO UPDATE SET ${keys.map((k) => `${k}=EXCLUDED.${k}`).join(',')}, updated_at=now()`,
      [row.employee_id, ...keys.map((k) => payload[k])]);
    await masterGovernance.refreshQuality(client, 'employees', row.employee_id);
  }
  const updated = (await client.query(
    `UPDATE employee_self_updates SET status=$2, decided_by=$3, decided_at=now(), decision_reason=$4 WHERE id=$1 RETURNING *`,
    [id, status, user.id, reason || null])).rows[0];
  await runtime.audit(client, {
    userId: user.id, action: decision === 'approve' ? 'APPROVE' : 'REJECT', module: 'employee', entityType: 'EMPLOYEE.SELF_UPDATE',
    entityId: id, oldValue: { status: 'PENDING' }, newValue: { status, proposed: row.proposed }, reason: reason || null, requestId, branchId: user.branchId
  });
  return runtime.camel(updated);
}

// Timeline karier: gabungan kronologis dari seluruh tabel riwayat karyawan.
// Kompensasi hanya menampilkan nominal bila pengguna berhak (payroll.view).
async function employeeTimeline(client, id, user) {
  assertPermission(user, 'employee.view');
  const emp = runtime.camel(await parentRow(client, 'employees', id));
  const events = [];
  if (emp.joinDate) events.push({ date: emp.joinDate, type: 'HIRED', title: 'Bergabung', detail: 'Mulai bekerja di perusahaan' });
  (await client.query(`SELECT employment_type,employment_status,event_date,event_reason FROM employee_employment_history WHERE employee_id=$1`, [id])).rows
    .forEach((r) => events.push({ date: r.event_date, type: 'EMPLOYMENT', title: r.employment_status || 'Perubahan status', detail: [r.employment_type, r.event_reason].filter(Boolean).join(' · ') || null }));
  (await client.query(`SELECT position_title,division,work_location,salary_grade,effective_from FROM employee_positions WHERE employee_id=$1`, [id])).rows
    .forEach((r) => events.push({ date: r.effective_from, type: 'POSITION', title: r.position_title || 'Posisi baru', detail: [r.division, r.work_location, r.salary_grade && `Grade ${r.salary_grade}`].filter(Boolean).join(' · ') || null }));
  (await client.query(`SELECT contract_number,contract_type,start_date,end_date FROM employee_contracts WHERE employee_id=$1`, [id])).rows
    .forEach((r) => events.push({ date: r.start_date, type: 'CONTRACT', title: `Kontrak ${r.contract_type || ''}`.trim(), detail: [r.contract_number, r.end_date ? `berakhir ${new Date(r.end_date).toISOString().slice(0, 10)}` : 'tanpa batas akhir'].filter(Boolean).join(' · ') }));
  const canSalary = canSeeSalary(user);
  (await client.query(`SELECT base_salary,fixed_allowance,variable_allowance,effective_from,approval_status FROM employee_compensation_history WHERE employee_id=$1`, [id])).rows
    .forEach((r) => { const total = (Number(r.base_salary) || 0) + (Number(r.fixed_allowance) || 0) + (Number(r.variable_allowance) || 0); events.push({ date: r.effective_from, type: 'COMPENSATION', title: 'Revisi kompensasi', detail: r.approval_status || null, amount: canSalary ? total : null }); });
  return events.filter((e) => e.date).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Compensation Management — analisis grade gaji (band min–mid–max), compa-ratio,
// position-in-range, kuartil. SAP/Oracle-style. Butuh izin payroll (canSeeSalary).
async function compensationAnalysis(client, id, user) {
  assertPermission(user, 'employee.view');
  if (!canSeeSalary(user)) throw new AppError('PERMISSION_DENIED', 'Analisis kompensasi membutuhkan izin payroll.');
  await parentRow(client, 'employees', id);
  const comp = (await client.query(`SELECT base_salary, fixed_allowance, variable_allowance, salary_grade FROM employee_compensation_history WHERE employee_id=$1 ORDER BY effective_from DESC LIMIT 1`, [id])).rows[0] || {};
  const pos = (await client.query(`SELECT salary_grade FROM employee_positions WHERE employee_id=$1 AND effective_from<=current_date AND (effective_to IS NULL OR effective_to>=current_date) ORDER BY effective_from DESC LIMIT 1`, [id])).rows[0] || {};
  const grade = pos.salary_grade || comp.salary_grade || null;
  const base = Number(comp.base_salary) || 0;
  const bandRow = grade ? (await client.query(`SELECT * FROM salary_grades WHERE grade_code=$1 AND active ORDER BY effective_from DESC LIMIT 1`, [grade])).rows[0] : null;
  const band = bandRow ? runtime.camel(bandRow) : null;
  const grades = (await client.query(`SELECT grade_code, grade_name, min_salary, mid_salary, max_salary FROM salary_grades WHERE active ORDER BY min_salary`)).rows.map(runtime.camel);
  let compaRatio = null, positionInRange = null, quartile = null, status = 'NO_BAND';
  if (band && base > 0) {
    const min = Number(band.minSalary), mid = Number(band.midSalary), max = Number(band.maxSalary);
    compaRatio = mid > 0 ? Number((base / mid).toFixed(3)) : null;
    positionInRange = max > min ? Math.max(0, Math.min(1, (base - min) / (max - min))) : null;
    quartile = positionInRange == null ? null : positionInRange <= 0.25 ? 'Q1' : positionInRange <= 0.5 ? 'Q2' : positionInRange <= 0.75 ? 'Q3' : 'Q4';
    status = base < min ? 'BELOW_RANGE' : base > max ? 'ABOVE_RANGE' : compaRatio < 0.9 ? 'BELOW_MID' : compaRatio > 1.1 ? 'ABOVE_MID' : 'AT_MID';
  }
  return { grade, base, fixedAllowance: Number(comp.fixed_allowance) || 0, variableAllowance: Number(comp.variable_allowance) || 0, band, grades, compaRatio, positionInRange, quartile, status };
}

// Workforce Analytics Cockpit — agregasi lintas karyawan (menghormati RLS cabang).
async function workforceAnalytics(client, user) {
  assertPermission(user, 'employee.view');
  const kpi = runtime.camel((await client.query(`SELECT
    count(*)::int total,
    count(*) FILTER (WHERE active)::int active,
    count(*) FILTER (WHERE bpjs)::int bpjs_covered,
    COALESCE(round(avg(data_quality_score)),0)::int avg_quality,
    count(*) FILTER (WHERE join_date >= current_date - interval '90 days')::int new_hires_90d
    FROM employees`)).rows[0]);
  const byDept = (await client.query(`SELECT COALESCE(NULLIF(department,''),'(Tanpa Dept)') label, count(*)::int value FROM employees GROUP BY 1 ORDER BY value DESC, label LIMIT 8`)).rows;
  const tenure = runtime.camel((await client.query(`SELECT
    count(*) FILTER (WHERE join_date > current_date - interval '1 year')::int lt1,
    count(*) FILTER (WHERE join_date <= current_date - interval '1 year' AND join_date > current_date - interval '3 years')::int y1to3,
    count(*) FILTER (WHERE join_date <= current_date - interval '3 years' AND join_date > current_date - interval '5 years')::int y3to5,
    count(*) FILTER (WHERE join_date <= current_date - interval '5 years')::int gt5
    FROM employees WHERE join_date IS NOT NULL`)).rows[0]);
  const gender = (await client.query(`SELECT CASE gender WHEN 'MALE' THEN 'Laki-laki' WHEN 'FEMALE' THEN 'Perempuan' ELSE '—' END label, count(*)::int value FROM employee_personal_profiles GROUP BY gender ORDER BY value DESC`)).rows;
  const byGrade = (await client.query(`SELECT COALESCE(p.salary_grade,'—') label, count(DISTINCT p.employee_id)::int value FROM employee_positions p WHERE p.effective_from<=current_date AND (p.effective_to IS NULL OR p.effective_to>=current_date) GROUP BY 1 ORDER BY 1`)).rows;
  const spanRow = (await client.query(`SELECT count(DISTINCT supervisor_employee_id)::int managers, count(*)::int reports FROM employee_positions WHERE supervisor_employee_id IS NOT NULL AND effective_from<=current_date AND (effective_to IS NULL OR effective_to>=current_date)`)).rows[0];
  const span = Number(spanRow.managers) ? Number((Number(spanRow.reports) / Number(spanRow.managers)).toFixed(1)) : 0;
  return { kpi, byDept, tenure, gender, byGrade, span };
}

// Performance & Talent — 9-box (baris = performance rendah/med/tinggi,
// kolom = potential rendah/med/tinggi). Label standar talent management.
const NINE_BOX_LABELS = [
  ['Underperformer', 'Inconsistent Player', 'Enigma / Rough Diamond'],
  ['Effective', 'Core Player', 'High Potential'],
  ['Trusted Professional', 'High Performer', 'Star / Top Talent']
];
const NINE_BOX_TONE = [['coral', 'coral', 'amber'], ['amber', 'blue', 'emerald'], ['blue', 'emerald', 'emerald']];
const TALENT_FIELDS = ['performance_rating', 'potential', 'flight_risk', 'succession_readiness', 'review_period', 'goals_total', 'goals_completed', 'notes'];

async function employeeTalent(client, id, user) {
  assertPermission(user, 'employee.view');
  await parentRow(client, 'employees', id);
  const row = runtime.camel((await client.query(`SELECT * FROM employee_talent WHERE employee_id=$1`, [id])).rows[0] || {});
  const perf = Number(row.performanceRating) || null;
  const pot = row.potential || null;
  let box = null, boxLabel = null, boxTone = null;
  if (perf && pot) {
    const pl = perf <= 2 ? 0 : perf === 3 ? 1 : 2;
    const ptl = { LOW: 0, MEDIUM: 1, HIGH: 2 }[pot];
    if (ptl != null) { box = { perf: pl, pot: ptl }; boxLabel = NINE_BOX_LABELS[pl][ptl]; boxTone = NINE_BOX_TONE[pl][ptl]; }
  }
  return { ...row, box, boxLabel, boxTone };
}

async function updateTalent(client, id, body, user, requestId) {
  assertPermission(user, 'employee.edit');
  await parentRow(client, 'employees', id);
  const snake = (k) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
  const payload = {};
  for (const [k, v] of Object.entries(body)) { const c = snake(k); if (TALENT_FIELDS.includes(c) && v !== undefined && v !== '' && v !== null) payload[c] = v; }
  if (!Object.keys(payload).length) throw new AppError('VALIDATION_ERROR', 'Tidak ada data talent untuk disimpan.');
  payload.updated_by = user.id;
  const keys = Object.keys(payload);
  const row = (await client.query(
    `INSERT INTO employee_talent(employee_id,${keys.join(',')}) VALUES($1,${keys.map((_, i) => `$${i + 2}`).join(',')})
      ON CONFLICT (employee_id) DO UPDATE SET ${keys.map((k) => `${k}=EXCLUDED.${k}`).join(',')}, updated_at=now() RETURNING *`,
    [id, ...keys.map((k) => payload[k])])).rows[0];
  await runtime.audit(client, { userId: user.id, action: 'UPDATE', module: 'employee', entityType: 'EMPLOYEE.TALENT', entityId: id, newValue: runtime.camel(row), requestId, branchId: user.branchId });
  return runtime.camel(row);
}

// PPh 21 TER engine — bulanan (TER) + tahunan/Desember (progresif UU HPP) dengan
// biaya jabatan, iuran BPJS (JHT/JP) karyawan, PTKP, dan surcharge non-NPWP.
const PTKP_ANNUAL = { 'TK/0': 54000000, 'TK/1': 58500000, 'TK/2': 63000000, 'TK/3': 67500000, 'K/0': 58500000, 'K/1': 63000000, 'K/2': 67500000, 'K/3': 72000000 };
const TER_TABLE = {
  A: [[5400000, 0], [5650000, 0.0025], [5950000, 0.005], [6300000, 0.0075], [6750000, 0.01], [7500000, 0.0125], [8550000, 0.015], [9650000, 0.0175], [10050000, 0.02], [10350000, 0.0225], [10700000, 0.025], [11050000, 0.03], [11600000, 0.035], [12500000, 0.04], [13750000, 0.05], [15100000, 0.06], [16950000, 0.07], [19750000, 0.08], [24150000, 0.09], [26450000, 0.1], [28000000, 0.11], [30050000, 0.12], [32400000, 0.13], [35400000, 0.14], [39100000, 0.15], [43850000, 0.16], [47800000, 0.17], [51400000, 0.18], [56300000, 0.19], [62200000, 0.2], [68600000, 0.21], [77500000, 0.22], [89000000, 0.23], [103000000, 0.24], [125000000, 0.25], [157000000, 0.26], [206000000, 0.27], [337000000, 0.28], [454000000, 0.29], [550000000, 0.3], [695000000, 0.31], [910000000, 0.32], [1400000000, 0.33], [Infinity, 0.34]],
  B: [[6200000, 0], [6500000, 0.0025], [6850000, 0.005], [7300000, 0.0075], [9200000, 0.01], [10750000, 0.015], [11250000, 0.02], [11600000, 0.025], [12600000, 0.03], [13600000, 0.04], [14950000, 0.05], [16400000, 0.06], [18450000, 0.07], [21850000, 0.08], [26000000, 0.09], [27700000, 0.1], [29350000, 0.11], [31450000, 0.12], [33950000, 0.13], [37100000, 0.14], [41100000, 0.15], [45800000, 0.16], [49500000, 0.17], [53800000, 0.18], [58500000, 0.19], [64000000, 0.2], [71000000, 0.21], [80000000, 0.22], [93000000, 0.23], [109000000, 0.24], [129000000, 0.25], [163000000, 0.26], [211000000, 0.27], [374000000, 0.28], [459000000, 0.29], [555000000, 0.3], [704000000, 0.31], [957000000, 0.32], [1405000000, 0.33], [Infinity, 0.34]],
  C: [[6600000, 0], [6950000, 0.0025], [7350000, 0.005], [7800000, 0.0075], [8850000, 0.01], [9800000, 0.0125], [10950000, 0.015], [11200000, 0.0175], [12050000, 0.02], [12950000, 0.03], [14150000, 0.04], [15550000, 0.05], [17050000, 0.06], [19500000, 0.07], [22700000, 0.08], [26600000, 0.09], [28100000, 0.1], [30100000, 0.11], [32600000, 0.12], [35400000, 0.13], [38900000, 0.14], [43000000, 0.15], [47400000, 0.16], [51200000, 0.17], [55800000, 0.18], [60400000, 0.19], [66700000, 0.2], [74500000, 0.21], [83200000, 0.22], [95600000, 0.23], [110000000, 0.24], [134000000, 0.25], [169000000, 0.26], [221000000, 0.27], [390000000, 0.28], [463000000, 0.29], [561000000, 0.3], [709000000, 0.31], [965000000, 0.32], [1419000000, 0.33], [Infinity, 0.34]]
};
const terMonthlyRate = (cat, bruto) => { const t = TER_TABLE[cat] || TER_TABLE.A; for (const [cap, r] of t) if (bruto <= cap) return r; return 0.34; };
const ptkpToCatBE = (p) => { p = String(p || '').toUpperCase(); if (['TK/0', 'TK/1', 'K/0'].includes(p)) return 'A'; if (['TK/2', 'TK/3', 'K/1', 'K/2'].includes(p)) return 'B'; if (p === 'K/3') return 'C'; return 'A'; };
const progressiveAnnual = (pkp) => {
  if (pkp <= 0) return 0;
  const brackets = [[60000000, 0.05], [250000000, 0.15], [500000000, 0.25], [5000000000, 0.30], [Infinity, 0.35]];
  let tax = 0, prev = 0;
  for (const [cap, rate] of brackets) { const slice = Math.min(pkp, cap) - prev; if (slice > 0) tax += slice * rate; prev = cap; if (pkp <= cap) break; }
  return tax;
};
async function pph21Annual(client, id, body, user) {
  assertPermission(user, 'employee.view');
  if (!canSeeSalary(user)) throw new AppError('PERMISSION_DENIED', 'Kalkulasi pajak membutuhkan izin payroll.');
  await parentRow(client, 'employees', id);
  const base = Number(body.base) || 0, fixed = Number(body.fixed) || 0, variable = Number(body.variable) || 0, bonus = Number(body.bonus) || 0;
  const ptkp = body.ptkp || 'TK/0', cat = ptkpToCatBE(ptkp), hasNpwp = body.npwp !== false && body.npwp !== 'false', method = body.method || 'GROSS';
  const monthlyBruto = base + fixed + variable;
  const grossAnnual = monthlyBruto * 12 + bonus;
  const biayaJabatan = Math.min(grossAnnual * 0.05, 6000000);
  // Potongan BPJS karyawan yang mengurangi penghasilan neto (JHT + JP) diambil
  // dari KONFIGURASI BPJS tersimpan agar pajak mengikuti realita: skema
  // "ditanggung perusahaan" → porsi karyawan 0 → PKP naik. Kesehatan (1%) BUKAN
  // pengurang PPh 21. Tanpa konfigurasi → asumsi standar JHT 2% + JP 1%.
  let jht = 0, jp = 0;
  const bpjsRows = (await client.query(`SELECT program, wage_base, employee_pct, ceiling_amount FROM employee_bpjs_profiles WHERE employee_id=$1 AND program IN ('JHT','JP') AND (active_to IS NULL OR active_to>=current_date)`, [id])).rows;
  if (bpjsRows.length) {
    for (const r of bpjsRows) {
      const wb = Number(r.wage_base) || 0, pct = (Number(r.employee_pct) || 0) / 100, cap = Number(r.ceiling_amount) || 0;
      const annual = (cap ? Math.min(wb, cap) : wb) * pct * 12;
      if (r.program === 'JHT') jht = annual; else jp = annual;
    }
  } else {
    jht = base * 0.02 * 12;
    jp = Math.min(base, 10042300) * 0.01 * 12;
  }
  const bpjsDeduct = jht + jp;
  const ptkpAmt = PTKP_ANNUAL[ptkp] || 54000000;
  const pkp = Math.max(0, Math.floor((grossAnnual - biayaJabatan - bpjsDeduct - ptkpAmt) / 1000) * 1000);
  const npwpFactor = hasNpwp ? 1 : 1.2;
  const pphAnnual = Math.round(progressiveAnnual(pkp) * npwpFactor);
  const terRate = terMonthlyRate(cat, monthlyBruto);
  const monthlyTer = Math.round(monthlyBruto * terRate * npwpFactor);
  const terJanNov = monthlyTer * 11;
  const december = Math.max(0, pphAnnual - terJanNov);
  return { monthlyBruto, grossAnnual, biayaJabatan: Math.round(biayaJabatan), jht: Math.round(jht), jp: Math.round(jp), bpjsDeduct: Math.round(bpjsDeduct), ptkp, ptkpAmt, pkp, terRate, monthlyTer, terJanNov, pphAnnual, december, hasNpwp, cat, method };
}

// ── Kasbon / Pinjaman Karyawan ─────────────────────────────────────────────
// Pengajuan → persetujuan (maker-checker, SoD) → potongan payroll otomatis via
// payroll_components (kind=DEDUCTION, recurring) yang SUDAH dibaca payroll run.
// Lunas/batal → komponen dinonaktifkan. Tidak menyentuh engine payroll.
const LOAN_TYPES = ['KASBON', 'INSTALLMENT', 'EMERGENCY'];
const LOAN_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'SETTLED', 'CANCELLED'];
const loanTotals = (principal, interestRate, tenor) => {
  const p = Math.max(0, Number(principal) || 0), r = Math.max(0, Number(interestRate) || 0), n = Math.max(1, Math.min(120, Number(tenor) || 1));
  const total = Math.round(p * (1 + r)); return { total, installment: Math.round(total / n), tenor: n };
};

async function listLoans(client, user, filters = {}) {
  assertPermission(user, 'employee.view');
  const params = [], where = [];
  if (user.role === 'employee') {
    if (!user.employeeId) throw new AppError('RESOURCE_NOT_FOUND', 'Akun belum ditautkan ke data karyawan.');
    params.push(user.employeeId); where.push(`l.employee_id = $${params.length}`);
  } else if (!canSeeSalary(user)) { throw new AppError('PERMISSION_DENIED', 'Data pinjaman membutuhkan izin payroll.'); }
  if (filters.status && LOAN_STATUSES.includes(filters.status)) { params.push(filters.status); where.push(`l.status = $${params.length}`); }
  const rows = (await client.query(`SELECT l.*, e.name employee_name, e.nik, e.department FROM employee_loans l JOIN employees e ON e.id = l.employee_id ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY l.created_at DESC`, params)).rows.map(runtime.camel);
  const summary = rows.reduce((o, r) => {
    if (r.status === 'PENDING') o.pending += 1;
    if (r.status === 'ACTIVE' || r.status === 'APPROVED') { o.active += 1; o.outstanding += Number(r.outstandingAmount) || 0; o.monthly += Number(r.installmentAmount) || 0; }
    return o;
  }, { pending: 0, active: 0, outstanding: 0, monthly: 0 });
  return { items: rows, summary };
}

async function requestLoan(client, body, user, requestId) {
  assertPermission(user, 'employee.view');
  const employeeId = body.employeeId || (user.role === 'employee' ? user.employeeId : null);
  if (!employeeId) throw new AppError('VALIDATION_ERROR', 'Karyawan wajib dipilih.');
  if (user.role === 'employee') { if (employeeId !== user.employeeId) throw new AppError('PERMISSION_DENIED', 'Hanya dapat mengajukan untuk diri sendiri.'); }
  else if (!canSeeSalary(user)) { throw new AppError('PERMISSION_DENIED', 'Pengajuan pinjaman atas nama karyawan membutuhkan izin payroll.'); }
  await parentRow(client, 'employees', employeeId);
  const type = LOAN_TYPES.includes(body.loanType) ? body.loanType : 'KASBON';
  const principal = Number(body.principalAmount) || 0;
  if (principal <= 0) throw new AppError('VALIDATION_ERROR', 'Jumlah pinjaman harus lebih dari 0.');
  const interest = Math.max(0, Number(body.interestRate) || 0);
  const { total, installment, tenor } = loanTotals(principal, interest, body.tenorMonths);
  const startPeriod = /^\d{4}-\d{2}$/.test(body.startPeriod || '') ? body.startPeriod : new Date().toISOString().slice(0, 7);
  const cnt = (await client.query(`SELECT count(*)::int c FROM employee_loans WHERE created_at >= date_trunc('month', now())`)).rows[0].c;
  const loanNumber = `KSB-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String(cnt + 1).padStart(3, '0')}`;
  const row = (await client.query(`INSERT INTO employee_loans (employee_id, loan_number, loan_type, principal_amount, tenor_months, installment_amount, interest_rate, purpose, start_period, status, outstanding_amount, requested_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'PENDING',$10,$11) RETURNING *`,
    [employeeId, loanNumber, type, principal, tenor, installment, interest, body.purpose || null, startPeriod, total, user.id])).rows[0];
  await runtime.audit(client, { userId: user.id, action: 'LOAN_REQUEST', module: 'employee', entityType: 'EMPLOYEE_LOAN', entityId: row.id, newValue: { loanNumber, principal, tenor, installment, type }, requestId, branchId: user.branchId });
  return runtime.camel(row);
}

async function decideLoan(client, { id, decision, note, user, requestId }) {
  assertPermission(user, 'employee.view');
  if (!canSeeSalary(user)) throw new AppError('PERMISSION_DENIED', 'Persetujuan pinjaman membutuhkan izin payroll.');
  const loan = (await client.query(`SELECT * FROM employee_loans WHERE id = $1 FOR UPDATE`, [id])).rows[0];
  if (!loan) throw new AppError('RESOURCE_NOT_FOUND', 'Pinjaman tidak ditemukan.');
  if (loan.status !== 'PENDING') throw new AppError('VALIDATION_ERROR', 'Hanya pengajuan berstatus PENDING yang dapat diputuskan.');
  if (decision === 'reject') {
    const row = (await client.query(`UPDATE employee_loans SET status='REJECTED', approved_by=$2, decided_at=now(), decision_note=$3, updated_at=now() WHERE id=$1 RETURNING *`, [id, user.id, note || null])).rows[0];
    await runtime.audit(client, { userId: user.id, action: 'LOAN_REJECT', module: 'employee', entityType: 'EMPLOYEE_LOAN', entityId: id, newValue: { note: note || null }, requestId, branchId: user.branchId });
    return runtime.camel(row);
  }
  if (loan.requested_by && loan.requested_by === user.id) throw new AppError('PERMISSION_DENIED', 'Segregation of Duties: penyetuju tidak boleh sama dengan pengaju.');
  const code = `LOAN-${loan.loan_number}`.slice(0, 30);
  await client.query(`INSERT INTO payroll_components (employee_id, code, name, kind, amount, recurring, active) VALUES ($1,$2,$3,'DEDUCTION',$4,true,true) ON CONFLICT (employee_id, code) DO UPDATE SET amount=EXCLUDED.amount, name=EXCLUDED.name, active=true, updated_at=now()`,
    [loan.employee_id, code, `Cicilan pinjaman ${loan.loan_number}`, loan.installment_amount]);
  const row = (await client.query(`UPDATE employee_loans SET status='ACTIVE', approved_by=$2, decided_at=now(), decision_note=$3, deduction_code=$4, updated_at=now() WHERE id=$1 RETURNING *`, [id, user.id, note || null, code])).rows[0];
  await runtime.audit(client, { userId: user.id, action: 'LOAN_APPROVE', module: 'employee', entityType: 'EMPLOYEE_LOAN', entityId: id, newValue: { installment: Number(loan.installment_amount), deductionCode: code }, requestId, branchId: user.branchId });
  return runtime.camel(row);
}

async function closeLoan(client, { id, action, user, requestId }) {
  assertPermission(user, 'employee.view');
  if (!canSeeSalary(user)) throw new AppError('PERMISSION_DENIED', 'Aksi pinjaman membutuhkan izin payroll.');
  const loan = (await client.query(`SELECT * FROM employee_loans WHERE id=$1 FOR UPDATE`, [id])).rows[0];
  if (!loan) throw new AppError('RESOURCE_NOT_FOUND', 'Pinjaman tidak ditemukan.');
  if (!['ACTIVE', 'APPROVED'].includes(loan.status)) throw new AppError('VALIDATION_ERROR', 'Hanya pinjaman aktif yang dapat dilunasi/dibatalkan.');
  const newStatus = action === 'cancel' ? 'CANCELLED' : 'SETTLED';
  const outstanding = newStatus === 'SETTLED' ? 0 : Number(loan.outstanding_amount) || 0;
  if (loan.deduction_code) await client.query(`UPDATE payroll_components SET active=false, updated_at=now() WHERE employee_id=$1 AND code=$2`, [loan.employee_id, loan.deduction_code]);
  const row = (await client.query(`UPDATE employee_loans SET status=$2, outstanding_amount=$3, updated_at=now() WHERE id=$1 RETURNING *`, [id, newStatus, outstanding])).rows[0];
  await runtime.audit(client, { userId: user.id, action: newStatus === 'SETTLED' ? 'LOAN_SETTLE' : 'LOAN_CANCEL', module: 'employee', entityType: 'EMPLOYEE_LOAN', entityId: id, requestId, branchId: user.branchId });
  return runtime.camel(row);
}

// ── BPJS — simpan konfigurasi kepesertaan (program + skema iuran) ke profil ──
// Tarif kanonik di server; skema FULL_COMPANY memindahkan porsi karyawan ke
// perusahaan (employee_pct=0). Disimpan sebagai % (mis. 4.000) agar konsisten
// dengan sub-resource 'bpjs'. Tidak menyentuh engine payroll.
const BPJS_PROGRAMS_BE = {
  KESEHATAN: { erPct: 0.04, eePct: 0.01, cap: 12000000 },
  JHT: { erPct: 0.037, eePct: 0.02, cap: 0 },
  JKK: { erPct: 0.0024, eePct: 0, cap: 0, risk: true },
  JKM: { erPct: 0.003, eePct: 0, cap: 0 },
  JP: { erPct: 0.02, eePct: 0.01, cap: 10042300 }
};
async function saveBpjsConfig(client, employeeId, body, user, requestId) {
  assertPermission(user, 'employee.edit');
  if (!canSeeSalary(user)) throw new AppError('PERMISSION_DENIED', 'Konfigurasi BPJS membutuhkan izin payroll.');
  await parentRow(client, 'employees', employeeId);
  const scheme = body.scheme === 'FULL_COMPANY' ? 'FULL_COMPANY' : 'SPLIT';
  const wageBase = Number(body.wageBase) || 0;
  const jkkRisk = Number(body.jkkRisk) || 0.0024;
  const eff = /^\d{4}-\d{2}-\d{2}$/.test(body.effectiveFrom || '') ? body.effectiveFrom : new Date().toISOString().slice(0, 10);
  const active = (Array.isArray(body.programs) ? body.programs : []).map((k) => String(k).toUpperCase()).filter((k) => BPJS_PROGRAMS_BE[k]);
  // Tutup seluruh profil aktif lama pada/ setelah tanggal efektif (histori utuh).
  await client.query(`UPDATE employee_bpjs_profiles SET active_to=$2::date-1 WHERE employee_id=$1 AND (active_to IS NULL OR active_to>=$2::date)`, [employeeId, eff]);
  const saved = [];
  for (const prog of active) {
    const def = BPJS_PROGRAMS_BE[prog];
    const erFrac = def.risk ? jkkRisk : def.erPct;
    let erPct = erFrac * 100, eePct = def.eePct * 100;
    if (scheme === 'FULL_COMPANY') { erPct += eePct; eePct = 0; }
    await client.query(`INSERT INTO employee_bpjs_profiles (id, employee_id, program, wage_base, risk_category, employer_pct, employee_pct, ceiling_amount, active_from)
      VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (employee_id, program, active_from) DO UPDATE SET wage_base=EXCLUDED.wage_base, risk_category=EXCLUDED.risk_category, employer_pct=EXCLUDED.employer_pct, employee_pct=EXCLUDED.employee_pct, ceiling_amount=EXCLUDED.ceiling_amount, active_to=NULL`,
      [employeeId, prog, wageBase, def.risk ? String(jkkRisk) : null, erPct.toFixed(3), eePct.toFixed(3), def.cap || null, eff]);
    saved.push(prog);
  }
  await runtime.audit(client, { userId: user.id, action: 'BPJS_CONFIG', module: 'employee', entityType: 'EMPLOYEE_BPJS', entityId: employeeId, newValue: { scheme, programs: saved, wageBase, effectiveFrom: eff }, requestId, branchId: user.branchId });
  return { scheme, programs: saved, wageBase, effectiveFrom: eff };
}

// ── Keluarga & Tanggungan ──────────────────────────────────────────────────
// PTKP diturunkan dari status kawin (profil pribadi) + jumlah tanggungan
// (is_dependent, maks 3) → bisa diterapkan ke profil pajak. bpjs_covered untuk
// kepesertaan BPJS Kesehatan keluarga.
const FAMILY_RELATIONS = ['SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER'];
const derivePtkp = (maritalStatus, dependents) => {
  const married = String(maritalStatus || '').toUpperCase() === 'KAWIN';
  const d = Math.max(0, Math.min(3, Number(dependents) || 0));
  return `${married ? 'K' : 'TK'}/${d}`;
};
async function listFamily(client, id, user) {
  assertPermission(user, 'employee.view');
  await parentRow(client, 'employees', id);
  const rows = (await client.query(`SELECT * FROM employee_family_members WHERE employee_id=$1 ORDER BY relationship, birth_date NULLS LAST, created_at`, [id])).rows.map(runtime.camel);
  const personal = (await client.query(`SELECT marital_status FROM employee_personal_profiles WHERE employee_id=$1 LIMIT 1`, [id])).rows[0] || {};
  // Pasangan tidak dihitung tanggungan (sudah tercermin di K vs TK); hanya
  // anak/lainnya yang ditandai tanggungan (maks 3) yang menambah PTKP.
  const dependents = rows.filter((r) => r.isDependent && r.relationship !== 'SPOUSE').length;
  return { items: rows, maritalStatus: personal.marital_status || null, dependents, bpjsCovered: rows.filter((r) => r.bpjsCovered).length, derivedPtkp: derivePtkp(personal.marital_status, dependents) };
}
async function saveFamily(client, id, body, user, requestId) {
  assertPermission(user, 'employee.edit');
  await parentRow(client, 'employees', id);
  const rel = FAMILY_RELATIONS.includes(String(body.relationship || '').toUpperCase()) ? String(body.relationship).toUpperCase() : 'CHILD';
  const name = String(body.fullName || '').trim();
  if (!name) throw new AppError('VALIDATION_ERROR', 'Nama anggota keluarga wajib diisi.');
  const gender = ['MALE', 'FEMALE'].includes(String(body.gender || '').toUpperCase()) ? String(body.gender).toUpperCase() : null;
  const isDependent = body.isDependent !== false && body.isDependent !== 'false';
  const bpjsCovered = body.bpjsCovered === true || body.bpjsCovered === 'true';
  let row;
  if (body.id) {
    row = (await client.query(`UPDATE employee_family_members SET full_name=$3, relationship=$4, gender=$5, birth_date=$6, is_dependent=$7, bpjs_covered=$8, occupation=$9, notes=$10, updated_at=now() WHERE id=$2 AND employee_id=$1 RETURNING *`, [id, body.id, name, rel, gender, body.birthDate || null, isDependent, bpjsCovered, body.occupation || null, body.notes || null])).rows[0];
    if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Anggota keluarga tidak ditemukan.');
  } else {
    row = (await client.query(`INSERT INTO employee_family_members (employee_id, full_name, relationship, gender, birth_date, is_dependent, bpjs_covered, occupation, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [id, name, rel, gender, body.birthDate || null, isDependent, bpjsCovered, body.occupation || null, body.notes || null])).rows[0];
  }
  await runtime.audit(client, { userId: user.id, action: body.id ? 'FAMILY_UPDATE' : 'FAMILY_ADD', module: 'employee', entityType: 'EMPLOYEE_FAMILY', entityId: id, newValue: { name, relationship: rel, isDependent }, requestId, branchId: user.branchId });
  return runtime.camel(row);
}
async function deleteFamily(client, id, memberId, user, requestId) {
  assertPermission(user, 'employee.edit');
  await parentRow(client, 'employees', id);
  const row = (await client.query(`DELETE FROM employee_family_members WHERE id=$2 AND employee_id=$1 RETURNING id`, [id, memberId])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Anggota keluarga tidak ditemukan.');
  await runtime.audit(client, { userId: user.id, action: 'FAMILY_DELETE', module: 'employee', entityType: 'EMPLOYEE_FAMILY', entityId: id, requestId, branchId: user.branchId });
  return { deleted: memberId };
}

// ── Offboarding & Pesangon (UU Cipta Kerja / PP 35/2021) ───────────────────
// Pengali pesangon (UP) & penghargaan masa kerja (UPMK) per alasan PHK; UPH =
// nilai cuti belum diambil; uang pisah untuk resign/mangkir/pelanggaran berat.
const OFFB_REASONS = {
  RESIGN: { up: 0, upmk: 0, sep: true, label: 'Mengundurkan diri' },
  TERM_EFISIENSI: { up: 0.5, upmk: 1, label: 'PHK efisiensi (perusahaan rugi)' },
  TERM_CEGAH_RUGI: { up: 1, upmk: 1, label: 'PHK efisiensi (mencegah kerugian)' },
  PENSIUN: { up: 1.75, upmk: 1, label: 'Pensiun' },
  MENINGGAL: { up: 2, upmk: 1, label: 'Meninggal dunia' },
  SAKIT_LAMA: { up: 2, upmk: 1, label: 'Sakit berkepanjangan' },
  END_CONTRACT: { up: 0, upmk: 0, label: 'Berakhir kontrak (PKWT)' },
  PELANGGARAN_BERAT: { up: 0, upmk: 0, sep: true, label: 'Pelanggaran berat' },
  MANGKIR: { up: 0, upmk: 0, sep: true, label: 'Mangkir' },
  LAINNYA: { up: 1, upmk: 1, label: 'Lainnya' }
};
const upMultiplier = (y) => { y = Number(y) || 0; if (y < 1) return 1; if (y < 8) return Math.floor(y) + 1; return 9; };
const upmkMultiplier = (y) => { y = Number(y) || 0; if (y < 3) return 0; if (y < 6) return 2; if (y < 9) return 3; if (y < 12) return 4; if (y < 15) return 5; if (y < 18) return 6; if (y < 21) return 7; if (y < 24) return 8; return 10; };
function pesangonCompute(reason, tenureYears, monthlyWage, unusedLeaveDays) {
  const r = OFFB_REASONS[reason] || OFFB_REASONS.LAINNYA, wage = Math.max(0, Number(monthlyWage) || 0);
  const up = Math.round(r.up * upMultiplier(tenureYears) * wage);
  const upmk = Math.round(r.upmk * upmkMultiplier(tenureYears) * wage);
  const uph = Math.round((wage / 25) * (Number(unusedLeaveDays) || 0));
  const separation = r.sep ? Math.round(wage) : 0;
  return { up, upmk, uph, separation, total: up + upmk + uph + separation, label: r.label, upX: r.up * upMultiplier(tenureYears), upmkX: r.upmk * upmkMultiplier(tenureYears) };
}
async function offboardingBasis(client, emp) {
  const tenure = emp.join_date ? Number(((Date.now() - new Date(emp.join_date).getTime()) / (365.25 * 86400000)).toFixed(2)) : 0;
  const comp = (await client.query(`SELECT base_salary, fixed_allowance FROM employee_compensation_history WHERE employee_id=$1 AND approval_status='APPROVED' ORDER BY effective_from DESC LIMIT 1`, [emp.id])).rows[0] || {};
  const wage = (Number(comp.base_salary) || Number(emp.base_salary) || 0) + (Number(comp.fixed_allowance) || 0);
  const leave = (await client.query(`SELECT (entitlement-used) rem FROM leave_balances WHERE employee_id=$1 AND year=extract(year from current_date)::int LIMIT 1`, [emp.id])).rows[0];
  return { tenureYears: tenure, monthlyWage: wage, unusedLeaveDays: leave ? Math.max(0, Number(leave.rem) || 0) : 0, joinDate: emp.join_date, name: emp.name, status: emp.lifecycle_status };
}
async function getOffboarding(client, id, user) {
  assertPermission(user, 'employee.view');
  if (!canSeeSalary(user)) throw new AppError('PERMISSION_DENIED', 'Data pesangon membutuhkan izin payroll.');
  const emp = await parentRow(client, 'employees', id);
  const record = (await client.query(`SELECT * FROM employee_offboarding WHERE employee_id=$1 ORDER BY created_at DESC LIMIT 1`, [id])).rows[0];
  const basis = await offboardingBasis(client, emp);
  return { record: record ? runtime.camel(record) : null, basis, reasons: Object.entries(OFFB_REASONS).map(([k, v]) => [k, v.label]) };
}
async function initiateOffboarding(client, id, body, user, requestId) {
  assertPermission(user, 'employee.edit');
  if (!canSeeSalary(user)) throw new AppError('PERMISSION_DENIED', 'Proses offboarding membutuhkan izin payroll.');
  const emp = await parentRow(client, 'employees', id);
  const open = (await client.query(`SELECT id FROM employee_offboarding WHERE employee_id=$1 AND status IN ('DRAFT','CLEARANCE')`, [id])).rows[0];
  if (open) throw new AppError('DUPLICATE_REQUEST', 'Proses offboarding aktif sudah ada untuk karyawan ini.');
  const reason = OFFB_REASONS[body.reason] ? body.reason : 'LAINNYA';
  const eff = /^\d{4}-\d{2}-\d{2}$/.test(body.effectiveDate || '') ? body.effectiveDate : new Date().toISOString().slice(0, 10);
  const basis = await offboardingBasis(client, emp);
  const p = pesangonCompute(reason, basis.tenureYears, basis.monthlyWage, basis.unusedLeaveDays);
  const row = (await client.query(`INSERT INTO employee_offboarding
    (employee_id, reason, effective_date, last_working_date, tenure_years, monthly_wage, unused_leave_days, up_amount, upmk_amount, uph_amount, separation_pay, total_amount, status, notes, initiated_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'CLEARANCE',$13,$14) RETURNING *`,
    [id, reason, eff, body.lastWorkingDate || eff, basis.tenureYears, basis.monthlyWage, basis.unusedLeaveDays, p.up, p.upmk, p.uph, p.separation, p.total, body.notes || null, user.id])).rows[0];
  await runtime.audit(client, { userId: user.id, action: 'OFFBOARDING_INIT', module: 'employee', entityType: 'EMPLOYEE_OFFBOARDING', entityId: id, newValue: { reason, effectiveDate: eff, total: p.total }, requestId, branchId: user.branchId });
  return { ...runtime.camel(row), breakdown: p };
}
async function updateOffboardingClearance(client, id, offbId, body, user, requestId) {
  assertPermission(user, 'employee.edit');
  if (!canSeeSalary(user)) throw new AppError('PERMISSION_DENIED', 'Aksi offboarding membutuhkan izin payroll.');
  await parentRow(client, 'employees', id);
  const row = (await client.query(`UPDATE employee_offboarding SET clearance=$3::jsonb, notes=COALESCE($4,notes), updated_at=now() WHERE id=$2 AND employee_id=$1 AND status IN ('DRAFT','CLEARANCE') RETURNING *`, [id, offbId, JSON.stringify(body.clearance || {}), body.notes || null])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Proses offboarding tidak ditemukan / sudah selesai.');
  return runtime.camel(row);
}
async function decideOffboarding(client, id, offbId, action, user, requestId) {
  assertPermission(user, 'employee.edit');
  if (!canSeeSalary(user)) throw new AppError('PERMISSION_DENIED', 'Aksi offboarding membutuhkan izin payroll.');
  await parentRow(client, 'employees', id);
  const offb = (await client.query(`SELECT * FROM employee_offboarding WHERE id=$2 AND employee_id=$1 FOR UPDATE`, [id, offbId])).rows[0];
  if (!offb) throw new AppError('RESOURCE_NOT_FOUND', 'Proses offboarding tidak ditemukan.');
  if (action === 'cancel') {
    if (offb.status === 'COMPLETED') throw new AppError('VALIDATION_ERROR', 'Offboarding yang sudah selesai tidak dapat dibatalkan.');
    const row = (await client.query(`UPDATE employee_offboarding SET status='CANCELLED', updated_at=now() WHERE id=$1 RETURNING *`, [offbId])).rows[0];
    await runtime.audit(client, { userId: user.id, action: 'OFFBOARDING_CANCEL', module: 'employee', entityType: 'EMPLOYEE_OFFBOARDING', entityId: id, requestId, branchId: user.branchId });
    return runtime.camel(row);
  }
  if (offb.status !== 'CLEARANCE' && offb.status !== 'DRAFT') throw new AppError('VALIDATION_ERROR', 'Hanya proses aktif yang dapat diselesaikan.');
  const row = (await client.query(`UPDATE employee_offboarding SET status='COMPLETED', completed_by=$2, completed_at=now(), updated_at=now() WHERE id=$1 RETURNING *`, [offbId, user.id])).rows[0];
  await client.query(`UPDATE employees SET active=false, lifecycle_status='ARCHIVED', updated_at=now() WHERE id=$1`, [id]);
  await runtime.audit(client, { userId: user.id, action: 'OFFBOARDING_COMPLETE', module: 'employee', entityType: 'EMPLOYEE_OFFBOARDING', entityId: id, newValue: { reason: offb.reason, total: Number(offb.total_amount) }, requestId, branchId: user.branchId });
  return runtime.camel(row);
}

// ── Surat Peringatan (SP) & Disiplin ───────────────────────────────────────
const SP_LEVELS = ['TEGURAN', 'SP1', 'SP2', 'SP3'];
async function listDisciplinary(client, id, user) {
  assertPermission(user, 'employee.view');
  await parentRow(client, 'employees', id);
  await client.query(`UPDATE employee_disciplinary SET status='EXPIRED', updated_at=now() WHERE employee_id=$1 AND status='ACTIVE' AND expiry_date IS NOT NULL AND expiry_date < current_date`, [id]);
  const rows = (await client.query(`SELECT * FROM employee_disciplinary WHERE employee_id=$1 ORDER BY issued_date DESC, created_at DESC`, [id])).rows.map(runtime.camel);
  const active = rows.filter((r) => r.status === 'ACTIVE');
  const highest = ['SP3', 'SP2', 'SP1', 'TEGURAN'].find((lv) => active.some((r) => r.level === lv)) || null;
  return { items: rows, activeCount: active.length, highestActive: highest };
}
// Agregasi notifikasi proaktif lintas domain: kontrak, probation, SP aktif, dokumen & sertifikasi kadaluarsa.
async function employeeAlerts(client, id, user) {
  assertPermission(user, 'employee.view');
  await parentRow(client, 'employees', id);
  const alerts = [];
  const daysTo = (d) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  const tone = (d) => (d < 0 || d <= 30) ? 'coral' : d <= 60 ? 'amber' : 'blue';
  const c = (await client.query(`SELECT contract_number, contract_type, end_date, probation_end, permanent_date
    FROM employee_contracts WHERE employee_id=$1 ORDER BY start_date DESC NULLS LAST LIMIT 1`, [id])).rows[0];
  if (c && !c.permanent_date && c.end_date) {
    const days = daysTo(c.end_date);
    if (days <= 90) alerts.push({ kind: 'CONTRACT', tab: 'employment', severity: tone(days), days,
      title: days < 0 ? 'Kontrak PKWT sudah berakhir' : `Kontrak PKWT berakhir ${days} hari lagi`,
      detail: `${(c.contract_type || 'PKWT')} ${(c.contract_number || '')} — ${days < 0 ? 'segera proses status kepegawaian' : 'proses perpanjangan / pengangkatan tetap'}`.trim() });
  }
  if (c && c.probation_end) {
    const days = daysTo(c.probation_end);
    if (days >= 0 && days <= 30) alerts.push({ kind: 'PROBATION', tab: 'employment', severity: 'blue', days,
      title: `Masa percobaan berakhir ${days} hari lagi`, detail: 'Jadwalkan evaluasi akhir masa percobaan.' });
  }
  (await client.query(`SELECT level, violation, expiry_date FROM employee_disciplinary
    WHERE employee_id=$1 AND status='ACTIVE' AND (expiry_date IS NULL OR expiry_date >= current_date)
    ORDER BY issued_date DESC`, [id])).rows.forEach((s) => {
    const days = s.expiry_date ? daysTo(s.expiry_date) : null;
    alerts.push({ kind: 'DISCIPLINARY', tab: 'letters', severity: 'amber', days,
      title: `${s.level} aktif`, detail: `${(s.violation || '').slice(0, 120)}${s.expiry_date ? ` — berlaku s.d. ${new Date(s.expiry_date).toISOString().slice(0, 10)}` : ''}`.trim() });
  });
  (await client.query(`SELECT title, document_type, expiry_date FROM employee_documents
    WHERE employee_id=$1 AND expiry_date IS NOT NULL AND expiry_date < current_date + interval '90 days'
    ORDER BY expiry_date ASC`, [id])).rows.forEach((d) => {
    const days = daysTo(d.expiry_date);
    alerts.push({ kind: 'DOCUMENT', tab: 'documents', severity: tone(days), days,
      title: days < 0 ? `Dokumen kadaluarsa: ${d.title}` : `Dokumen akan kadaluarsa: ${d.title}`,
      detail: `${(d.document_type || 'Dokumen')} — ${days < 0 ? `lewat ${Math.abs(days)} hari` : `${days} hari lagi`}` });
  });
  (await client.query(`SELECT name, issuer, expiry_date FROM employee_certifications
    WHERE employee_id=$1 AND expiry_date IS NOT NULL AND expiry_date < current_date + interval '90 days'
    ORDER BY expiry_date ASC`, [id])).rows.forEach((r) => {
    const days = daysTo(r.expiry_date);
    alerts.push({ kind: 'CERTIFICATION', tab: 'documents', severity: tone(days), days,
      title: days < 0 ? `Sertifikasi kadaluarsa: ${r.name}` : `Sertifikasi akan kadaluarsa: ${r.name}`,
      detail: `${(r.issuer || '')} — ${days < 0 ? `lewat ${Math.abs(days)} hari` : `${days} hari lagi`}`.trim() });
  });
  const rank = { coral: 0, amber: 1, blue: 2 };
  alerts.sort((a, b) => (rank[a.severity] - rank[b.severity]) || ((a.days ?? 9999) - (b.days ?? 9999)));
  const counts = { coral: 0, amber: 0, blue: 0 };
  alerts.forEach((a) => { counts[a.severity] += 1; });
  return { items: alerts, total: alerts.length, counts };
}
// Goals/OKR — daftar + ringkasan pencapaian berbobot (weighted attainment).
const GOAL_STATUS = ['DRAFT', 'ON_TRACK', 'AT_RISK', 'DONE', 'CANCELLED'];
async function listGoals(client, id, user) {
  assertPermission(user, 'employee.view');
  await parentRow(client, 'employees', id);
  const rows = (await client.query(`SELECT * FROM employee_goals WHERE employee_id=$1 ORDER BY
    CASE status WHEN 'AT_RISK' THEN 0 WHEN 'ON_TRACK' THEN 1 WHEN 'DRAFT' THEN 2 WHEN 'DONE' THEN 3 ELSE 4 END,
    due_date NULLS LAST, created_at DESC`, [id])).rows.map(runtime.camel);
  const scored = rows.filter((r) => r.status !== 'CANCELLED');
  const totalWeight = scored.reduce((a, r) => a + (Number(r.weight) || 0), 0);
  const attainment = totalWeight > 0
    ? Math.round(scored.reduce((a, r) => a + (Number(r.weight) || 0) * (Number(r.progress) || 0), 0) / totalWeight)
    : (scored.length ? Math.round(scored.reduce((a, r) => a + (Number(r.progress) || 0), 0) / scored.length) : 0);
  return { items: rows, attainment, totalWeight, active: scored.length,
    atRisk: rows.filter((r) => r.status === 'AT_RISK').length, done: rows.filter((r) => r.status === 'DONE').length };
}
async function updateGoalProgress(client, id, goalId, body, user, requestId) {
  assertPermission(user, 'employee.edit');
  await parentRow(client, 'employees', id);
  const hasProgress = body.progress !== undefined && body.progress !== null && body.progress !== '';
  const progress = hasProgress ? Math.max(0, Math.min(100, Math.round(Number(body.progress)))) : null;
  if (hasProgress && !Number.isFinite(progress)) throw new AppError('VALIDATION_ERROR', 'Progres harus 0–100.');
  let status = GOAL_STATUS.includes(String(body.status || '').toUpperCase()) ? String(body.status).toUpperCase() : null;
  if (progress !== null && progress >= 100 && !status) status = 'DONE';
  if (progress === null && !status) throw new AppError('VALIDATION_ERROR', 'Progres atau status wajib diisi.');
  const sets = [], vals = [id, goalId]; let n = 2;
  if (progress !== null) { sets.push(`progress=$${++n}`); vals.push(progress); }
  if (status) { sets.push(`status=$${++n}`); vals.push(status); }
  const row = (await client.query(`UPDATE employee_goals SET ${sets.join(',')}, updated_at=now()
    WHERE employee_id=$1 AND id=$2 RETURNING *`, vals)).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND');
  await runtime.audit(client, { userId: user.id, action: 'GOAL_UPDATE', module: 'employee', entityType: 'EMPLOYEE_GOAL',
    entityId: goalId, newValue: { progress: row.progress, status: row.status }, requestId, branchId: user.branchId });
  return runtime.camel(row);
}
async function addDisciplinary(client, id, body, user, requestId) {
  assertPermission(user, 'employee.edit');
  await parentRow(client, 'employees', id);
  const level = SP_LEVELS.includes(String(body.level || '').toUpperCase()) ? String(body.level).toUpperCase() : 'SP1';
  const violation = String(body.violation || '').trim();
  if (!violation) throw new AppError('VALIDATION_ERROR', 'Uraian pelanggaran wajib diisi.');
  const issued = /^\d{4}-\d{2}-\d{2}$/.test(body.issuedDate || '') ? body.issuedDate : new Date().toISOString().slice(0, 10);
  const expiry = /^\d{4}-\d{2}-\d{2}$/.test(body.expiryDate || '') ? body.expiryDate : null;
  const row = (await client.query(`INSERT INTO employee_disciplinary (employee_id, level, violation, issued_date, expiry_date, notes, issued_by, status)
    VALUES ($1,$2,$3,$4::date, COALESCE($5::date, ($4::date + interval '6 months')::date), $6, $7, 'ACTIVE') RETURNING *`,
    [id, level, violation, issued, expiry, body.notes || null, user.id])).rows[0];
  await runtime.audit(client, { userId: user.id, action: 'DISCIPLINARY_ADD', module: 'employee', entityType: 'EMPLOYEE_DISCIPLINARY', entityId: id, newValue: { level, violation }, requestId, branchId: user.branchId });
  return runtime.camel(row);
}
async function decideDisciplinary(client, id, spId, action, user, requestId) {
  assertPermission(user, 'employee.edit');
  await parentRow(client, 'employees', id);
  const row = (await client.query(`UPDATE employee_disciplinary SET status='REVOKED', updated_at=now() WHERE id=$2 AND employee_id=$1 RETURNING id`, [id, spId])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Surat peringatan tidak ditemukan.');
  await runtime.audit(client, { userId: user.id, action: 'DISCIPLINARY_REVOKE', module: 'employee', entityType: 'EMPLOYEE_DISCIPLINARY', entityId: id, requestId, branchId: user.branchId });
  return { revoked: spId };
}

module.exports = { REGISTRY, overview, listSub, createSub, approveSupplierBank, decideSupplierDocument, decideEmployeeSensitive, employeeAudit, setProfilePhoto, autoTaxProfile, activateCostRevision, promoteRevision, lifecycle, myProfile, submitIdentityRequest, listSelfUpdates, decideSelfUpdate, employeeTimeline, compensationAnalysis, workforceAnalytics, employeeTalent, updateTalent, pph21Annual, listLoans, requestLoan, decideLoan, closeLoan, saveBpjsConfig, terMonthlyRate, ptkpToCatBE, BPJS_PROGRAMS_BE, listFamily, saveFamily, deleteFamily, getOffboarding, initiateOffboarding, updateOffboardingClearance, decideOffboarding, listDisciplinary, addDisciplinary, decideDisciplinary, employeeAlerts, listGoals, updateGoalProgress };
