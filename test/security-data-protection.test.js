'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');
require('../backend/core/env').loadEnv();

const fields = require('../backend/core/field-encryption');
const masterData = require('../backend/infrastructure/database/repositories/master-data');
const organization = require('../backend/infrastructure/database/repositories/organization');
const dbTest = process.env.DATABASE_URL ? test : test.skip;
const migration = fs.readFileSync(path.join(__dirname, '..', 'data', 'migrations',
  '070_security_data_protection_tranche2.sql'), 'utf8');
const strictScopeMigration = fs.readFileSync(path.join(__dirname, '..', 'data', 'migrations',
  '071_employee_null_scope_fail_closed.sql'), 'utf8');
const privilegeMigration = fs.readFileSync(path.join(__dirname, '..', 'data', 'migrations',
  '072_sensitive_history_least_privilege.sql'), 'utf8');
const tokenCapacityMigration = fs.readFileSync(path.join(__dirname, '..', 'data', 'migrations',
  '073_identifier_token_capacity.sql'), 'utf8');

const RLS_TABLES = [
  'financial_reports', 'accounting_periods', 'company_bank_accounts',
  'organization_tax_identities', 'employees', 'tax_records',
  'payroll_items', 'attendance_records', 'leave_balances', 'payroll_components',
  'employee_personal_profiles', 'employee_positions',
  'employee_employment_history', 'employee_contracts',
  'employee_compensation_history', 'employee_tax_profiles',
  'employee_bpjs_profiles', 'employee_insurance_profiles',
  'employee_bank_accounts', 'employee_documents', 'employee_certifications',
  'employee_emergency_contacts', 'employee_access_assignments',
  'employee_insurance_claim_history', 'employee_restricted_records',
  'employee_rosters', 'attendance_corrections', 'leave_accrual_entries',
  'position_assignments'
];

async function session(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    await fn(client);
  } finally {
    await client.query('ROLLBACK').catch(() => {});
    await client.end();
  }
}
const asSystem = (client) => client.query("SELECT set_config('app.is_system','on',true),set_config('app.is_platform','on',true),set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true)");
async function asBranch(client, branchId) {
  await client.query("SELECT set_config('app.is_system','off',true)");
  await client.query("SELECT set_config('app.cross_branch','off',true)");
  await client.query("SELECT set_config('app.branch_id',$1,true)", [branchId]);
}
async function asCrossBranch(client) {
  await client.query("SELECT set_config('app.is_system','off',true)");
  await client.query("SELECT set_config('app.cross_branch','on',true)");
}

test('tranche 2 declares RLS, fail-closed employee scope, and encrypted identifiers', () => {
  const direct = ['financial_reports', 'accounting_periods', 'company_bank_accounts',
    'organization_tax_identities', 'employees', 'tax_records'];
  for (const table of direct) {
    assert.match(`${migration}\n${strictScopeMigration}`,
      new RegExp(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`));
  }
  for (const table of RLS_TABLES.filter((name) => !direct.includes(name))) {
    assert.match(migration, new RegExp(`'${table}'`), `${table} missing from RLS loop`);
  }
  assert.match(migration, /ALTER TABLE %I ENABLE ROW LEVEL SECURITY/);
  assert.match(strictScopeMigration, /branch_id IS NOT NULL AND app_branch_visible/);
  assert.match(privilegeMigration, /REVOKE DELETE,TRUNCATE ON[\s\S]+financial_reports[\s\S]+FROM mat_erp_app/);
  assert.match(tokenCapacityMigration, /nik_ktp TYPE varchar\(48\)/);
  assert.match(tokenCapacityMigration, /npwp TYPE varchar\(48\)/);
  assert.match(tokenCapacityMigration, /membership_number TYPE varchar\(48\)/);
  for (const column of ['nik_ktp_ciphertext', 'npwp_ciphertext',
    'membership_number_ciphertext', 'identity_number_ciphertext']) {
    assert.match(migration, new RegExp(column));
  }

  const employees = masterData.REGISTRY.employees.subs;
  assert.deepEqual(employees.personal.encrypted,
    { field: 'nik_ktp', purpose: 'employee_personal.nik_ktp', blind: true });
  assert.deepEqual(employees['tax-profiles'].encrypted,
    { field: 'npwp', purpose: 'employee_tax.npwp', blind: true });
  assert.deepEqual(employees.bpjs.encrypted,
    { field: 'membership_number', purpose: 'employee_bpjs.membership_number', blind: true });
});

test('identifier envelope encryption authenticates purpose and scope', () => {
  const env = {
    MAT_ENVIRONMENT: 'LOCAL',
    MAT_FIELD_ENCRYPTION_KEY_ID: 'test-v1',
    MAT_FIELD_ENCRYPTION_KEY: 'identifier-encryption-key-material-2026',
    MAT_FIELD_BLIND_INDEX_KEY: 'identifier-blind-index-key-material-2026'
  };
  const options = { purpose: 'employee_tax.npwp', scope: randomUUID(), blind: true };
  const protectedValue = fields.protect('12.345.678.9-012.345', options, env);
  assert.match(protectedValue.legacyToken, /^ENC:[a-f0-9]{36}$/);
  assert.equal(fields.decrypt(protectedValue.ciphertext, options, env), '12.345.678.9-012.345');
  assert.throws(() => fields.decrypt(protectedValue.ciphertext,
    { ...options, scope: randomUUID() }, env), /AUTHENTICATION_FAILED/);
  assert.doesNotMatch(protectedValue.ciphertext, /12\.345\.678/);
});

dbTest('RLS tranche 2 is active and runtime role cannot bypass it', async () => session(async (client) => {
  await asSystem(client);
  const rows = (await client.query(`SELECT c.relname,c.relrowsecurity,
      pg_get_userbyid(c.relowner)=current_user owns,
      (SELECT count(*)::int FROM pg_policy p WHERE p.polrelid=c.oid) policies
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname=ANY($1)`, [RLS_TABLES])).rows;
  assert.equal(rows.length, RLS_TABLES.length);
  for (const row of rows) {
    assert.equal(row.relrowsecurity, true, `${row.relname} RLS inactive`);
    assert.ok(row.policies > 0, `${row.relname} has no policy`);
    assert.equal(row.owns, false, `${row.relname} owned by runtime user`);
  }
  assert.equal((await client.query(
    'SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0].rolbypassrls, false);
}));

dbTest('employee and payroll rows are isolated by branch; NULL branch fails closed', async () =>
  session(async (client) => {
    await asSystem(client);
    const branches = (await client.query(
      'SELECT id FROM branches WHERE active ORDER BY code LIMIT 2')).rows;
    assert.equal(branches.length, 2, 'two active branches required');
    const [home, other] = branches.map((row) => row.id);
    const suffix = randomUUID().slice(0, 8);
    const createEmployee = async (branchId, label) => (await client.query(
      `INSERT INTO employees(nik,name,department,base_salary,branch_id)
       VALUES($1,$2,'SECURITY',1000000,$3) RETURNING id`,
      [`SEC-${label}-${suffix}`, `Security ${label}`, branchId])).rows[0].id;
    const mine = await createEmployee(home, 'HOME');
    const theirs = await createEmployee(other, 'OTHER');
    const unassigned = await createEmployee(null, 'NULL');
    for (const employeeId of [mine, theirs, unassigned]) {
      await client.query(`INSERT INTO employee_compensation_history(
        employee_id,base_salary,effective_from,approval_reason)
        VALUES($1,1000000,current_date,'RLS test')`, [employeeId]);
    }

    await asBranch(client, home);
    const employeeIds = (await client.query(
      'SELECT id FROM employees WHERE id=ANY($1::uuid[]) ORDER BY id',
      [[mine, theirs, unassigned]])).rows.map((row) => row.id);
    assert.deepEqual(employeeIds, [mine], 'other/null branch employees must be invisible');
    const salaryIds = (await client.query(
      'SELECT employee_id FROM employee_compensation_history WHERE employee_id=ANY($1::uuid[])',
      [[mine, theirs, unassigned]])).rows.map((row) => row.employee_id);
    assert.deepEqual(salaryIds, [mine], 'salary history must inherit employee branch');
    assert.equal((await client.query(
      'UPDATE employee_compensation_history SET base_salary=1 WHERE employee_id=$1',
      [theirs])).rowCount, 0, 'cross-branch salary update must touch zero rows');

    await client.query('SAVEPOINT cross_branch_insert');
    await assert.rejects(() => client.query(
      `INSERT INTO employees(nik,name,department,base_salary,branch_id)
       VALUES($1,'Forbidden','SECURITY',0,$2)`,
      [`SEC-FORBIDDEN-${suffix}`, other]), (error) => error.code === '42501');
    await client.query('ROLLBACK TO SAVEPOINT cross_branch_insert');

    await asCrossBranch(client);
    assert.equal((await client.query(
      'SELECT count(*)::int n FROM employees WHERE id=ANY($1::uuid[])',
      [[mine, theirs, unassigned]])).rows[0].n, 3);
  }));

dbTest('identifier constraints are validated and no plaintext identifier remains', async () =>
  session(async (client) => {
    await asSystem(client);
    const constraints = (await client.query(`SELECT conname,convalidated
      FROM pg_constraint WHERE conname=ANY($1)`, [[
      'ck_employee_ktp_encrypted', 'ck_employee_npwp_encrypted',
      'ck_employee_bpjs_encrypted', 'ck_organization_tax_id_encrypted'
    ]])).rows;
    assert.equal(constraints.length, 4);
    assert.ok(constraints.every((row) => row.convalidated));
    const keyId = process.env.MAT_FIELD_ENCRYPTION_KEY_ID || 'local-v1';
    const row = (await client.query(`SELECT
      (SELECT count(*)::int FROM employee_personal_profiles WHERE nik_ktp IS NOT NULL
        AND (nik_ktp NOT LIKE 'ENC:%' OR nik_ktp_ciphertext IS NULL OR nik_ktp_key_id<>$1)) ktp,
      (SELECT count(*)::int FROM employee_tax_profiles WHERE npwp IS NOT NULL
        AND (npwp NOT LIKE 'ENC:%' OR npwp_ciphertext IS NULL OR npwp_key_id<>$1)) npwp,
      (SELECT count(*)::int FROM employee_bpjs_profiles WHERE membership_number IS NOT NULL
        AND (membership_number NOT LIKE 'ENC:%' OR membership_number_ciphertext IS NULL
          OR membership_number_key_id<>$1)) bpjs,
      (SELECT count(*)::int FROM organization_tax_identities
        WHERE identity_number NOT LIKE 'ENC:%' OR identity_number_ciphertext IS NULL
          OR identity_number_key_id<>$1) organization_tax`, [keyId])).rows[0];
    assert.deepEqual(row, { ktp: 0, npwp: 0, bpjs: 0, organization_tax: 0 });
  }));

dbTest('repositories persist ciphertext, return authorized plaintext, and redact audit', async () =>
  session(async (client) => {
    await asSystem(client);
    const branch = (await client.query(
      'SELECT id,legal_entity_id FROM branches WHERE active AND legal_entity_id IS NOT NULL LIMIT 1')).rows[0];
    const owner = (await client.query(
      `SELECT id,role FROM app_users WHERE role='owner' AND active LIMIT 1`)).rows[0];
    assert.ok(branch && owner, 'seeded branch and owner required');
    owner.branchId = branch.id;
    owner.branchScope = '*';
    const employeeId = (await client.query(
      `INSERT INTO employees(nik,name,department,base_salary,branch_id)
       VALUES($1,'Encryption Repository Test','SECURITY',0,$2) RETURNING id`,
      [`ENC-${randomUUID().slice(0, 8)}`, branch.id])).rows[0].id;
    const requestId = randomUUID();
    const ktp = `3174${Date.now().toString().slice(-12)}`;
    const npwp = `09${Date.now().toString().slice(-13)}`;
    const bpjs = `BPJS${Date.now().toString().slice(-11)}`;
    const orgTax = `NITKU${Date.now().toString().slice(-10)}`;

    const personal = await masterData.createSub(client, 'employees', employeeId,
      'personal', { nikKtp: ktp }, owner, requestId);
    const tax = await masterData.createSub(client, 'employees', employeeId,
      'tax-profiles', { npwp, effectiveFrom: '2026-01-01' }, owner, requestId);
    const membership = await masterData.createSub(client, 'employees', employeeId,
      'bpjs', { program: 'KESEHATAN', membershipNumber: bpjs,
        activeFrom: '2026-01-01' }, owner, requestId);
    const identity = await organization.createResource(client, owner,
      branch.legal_entity_id, 'tax-identities', {
        branchId: branch.id, identityType: 'NITKU', identityNumber: orgTax,
        registeredName: 'MAT Encryption Test'
      }, requestId);

    assert.equal(personal.nikKtp, ktp);
    assert.equal(tax.npwp, npwp);
    assert.equal(membership.membershipNumber, bpjs);
    assert.equal(identity.identityNumber, orgTax);
    const raw = (await client.query(`SELECT
      (SELECT nik_ktp FROM employee_personal_profiles WHERE employee_id=$1) ktp,
      (SELECT npwp FROM employee_tax_profiles WHERE employee_id=$1) npwp,
      (SELECT membership_number FROM employee_bpjs_profiles WHERE employee_id=$1) bpjs,
      (SELECT identity_number FROM organization_tax_identities WHERE id=$2) organization_tax`,
    [employeeId, identity.id])).rows[0];
    for (const value of Object.values(raw)) assert.match(value, /^ENC:/);
    const auditText = (await client.query(
      `SELECT string_agg(COALESCE(new_value::text,''),' ') value
         FROM audit_logs WHERE request_id=$1`, [requestId])).rows[0].value || '';
    for (const secret of [ktp, npwp, bpjs, orgTax]) {
      assert.equal(auditText.includes(secret), false, `${secret} leaked into audit`);
    }
    assert.match(auditText, /REDACTED/);
  }));
