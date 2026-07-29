'use strict';
require('../backend/core/env').loadEnv();
const { Client } = require('pg');

const connectionString = process.env.MIGRATION_DATABASE_URL;
if (!connectionString) throw new Error('MIGRATION_DATABASE_URL wajib untuk audit data protection.');
const appUser = process.env.PGUSER || 'mat_erp_app';
if (!/^[a-z_][a-z0-9_]*$/.test(appUser)) throw new Error('PGUSER tidak aman.');

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
  'position_assignments', 'finance_reconciliation_evidence',
  'accounting_period_close_runs'
];
const ENCRYPTION_CONSTRAINTS = [
  'ck_employee_ktp_encrypted', 'ck_employee_npwp_encrypted',
  'ck_employee_bpjs_encrypted', 'ck_organization_tax_id_encrypted'
];
const PROTECTED_HISTORIES = [
  'financial_reports', 'accounting_periods', 'employee_compensation_history',
  'employee_tax_profiles', 'employee_bpjs_profiles', 'payroll_items',
  'tax_records', 'finance_reconciliation_evidence', 'accounting_period_close_runs'
];

(async () => {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const rls = (await client.query(`SELECT c.relname,c.relrowsecurity,
        pg_get_userbyid(c.relowner)=$2 owns,
        (SELECT count(*)::int FROM pg_policy p WHERE p.polrelid=c.oid) policies
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relname=ANY($1)`,
    [RLS_TABLES, appUser])).rows;
    const missingRls = RLS_TABLES.filter((name) =>
      !rls.some((row) => row.relname === name && row.relrowsecurity && row.policies > 0));
    const runtimeOwns = rls.filter((row) => row.owns).map((row) => row.relname);
    const bypass = (await client.query(
      'SELECT rolbypassrls FROM pg_roles WHERE rolname=$1', [appUser])).rows[0]?.rolbypassrls;

    const constraints = (await client.query(`SELECT conname,convalidated
      FROM pg_constraint WHERE conname=ANY($1)`, [ENCRYPTION_CONSTRAINTS])).rows;
    const invalidConstraints = ENCRYPTION_CONSTRAINTS.filter((name) =>
      !constraints.some((row) => row.conname === name && row.convalidated));

    const plaintext = (await client.query(`SELECT
      (SELECT count(*)::int FROM employee_personal_profiles
        WHERE nik_ktp IS NOT NULL AND (nik_ktp NOT LIKE 'ENC:%'
          OR nik_ktp_ciphertext IS NULL OR nik_ktp_key_id<>$1)) ktp,
      (SELECT count(*)::int FROM employee_tax_profiles
        WHERE npwp IS NOT NULL AND (npwp NOT LIKE 'ENC:%'
          OR npwp_ciphertext IS NULL OR npwp_key_id<>$1)) npwp,
      (SELECT count(*)::int FROM employee_bpjs_profiles
        WHERE membership_number IS NOT NULL AND (membership_number NOT LIKE 'ENC:%'
          OR membership_number_ciphertext IS NULL OR membership_number_key_id<>$1)) bpjs,
      (SELECT count(*)::int FROM organization_tax_identities
        WHERE identity_number NOT LIKE 'ENC:%' OR identity_number_ciphertext IS NULL
          OR identity_number_key_id<>$1) organization_tax`,
    [process.env.MAT_FIELD_ENCRYPTION_KEY_ID || 'local-v1'])).rows[0];

    const deletable = (await client.query(`SELECT c.relname FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relname=ANY($2)
       AND (has_table_privilege($1,c.oid,'DELETE')
         OR has_table_privilege($1,c.oid,'TRUNCATE'))`,
    [appUser, PROTECTED_HISTORIES])).rows.map((row) => row.relname);
    const plaintextTotal = Object.values(plaintext).reduce((sum, value) => sum + Number(value), 0);
    const ok = missingRls.length === 0 && runtimeOwns.length === 0 && bypass === false
      && invalidConstraints.length === 0 && plaintextTotal === 0 && deletable.length === 0;
    console.log(JSON.stringify({
      ok, rls: { expected: RLS_TABLES.length, active: rls.length, missing: missingRls,
        runtimeOwns, runtimeBypassRls: bypass },
      encryption: { constraintsValidated: ENCRYPTION_CONSTRAINTS.length - invalidConstraints.length,
        invalidConstraints, plaintext },
      leastPrivilege: { protectedHistories: PROTECTED_HISTORIES.length, deletable }
    }, null, 2));
    if (!ok) process.exitCode = 1;
  } finally {
    await client.end();
  }
})().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }));
  process.exit(1);
});
