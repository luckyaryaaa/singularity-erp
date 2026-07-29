'use strict';
// Backfill and rotate sensitive fields without ever persisting key material.
require('../backend/core/env').loadEnv();
const { Client } = require('pg');
const fields = require('../backend/core/field-encryption');

const APPLY = process.argv.includes('--apply');
const connectionString = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error('MIGRATION_DATABASE_URL atau DATABASE_URL wajib.');

const BANKS = [
  { table: 'company_bank_accounts', id: 'id', scope: 'legal_entity_id',
    legacy: 'account_number', cipher: 'account_number_ciphertext',
    key: 'account_number_key_id', blind: 'account_number_blind_index',
    purpose: 'company_bank.account_number' },
  { table: 'supplier_bank_accounts', id: 'id', scope: 'supplier_id',
    legacy: 'account_number', cipher: 'account_number_ciphertext',
    key: 'account_number_key_id', blind: 'account_number_blind_index',
    purpose: 'supplier_bank.account_number' },
  { table: 'employee_bank_accounts', id: 'id', scope: 'employee_id',
    legacy: 'account_number', cipher: 'account_number_ciphertext',
    key: 'account_number_key_id', blind: 'account_number_blind_index',
    purpose: 'employee_bank.account_number' },
  { table: 'suppliers', id: 'id', scope: 'id',
    legacy: 'bank_account', cipher: 'bank_account_ciphertext',
    key: 'bank_account_key_id', blind: 'bank_account_blind_index',
    purpose: 'supplier_legacy.bank_account', nullable: true }
];
const IDENTIFIERS = [
  { table: 'employee_personal_profiles', id: 'employee_id', scope: 'employee_id',
    legacy: 'nik_ktp', cipher: 'nik_ktp_ciphertext',
    key: 'nik_ktp_key_id', blind: 'nik_ktp_blind_index',
    purpose: 'employee_personal.nik_ktp', nullable: true },
  { table: 'employee_tax_profiles', id: 'id', scope: 'employee_id',
    legacy: 'npwp', cipher: 'npwp_ciphertext',
    key: 'npwp_key_id', blind: 'npwp_blind_index',
    purpose: 'employee_tax.npwp', nullable: true },
  { table: 'employee_bpjs_profiles', id: 'id', scope: 'employee_id',
    legacy: 'membership_number', cipher: 'membership_number_ciphertext',
    key: 'membership_number_key_id', blind: 'membership_number_blind_index',
    purpose: 'employee_bpjs.membership_number', nullable: true },
  { table: 'organization_tax_identities', id: 'id', scope: 'legal_entity_id',
    legacy: 'identity_number', cipher: 'identity_number_ciphertext',
    key: 'identity_number_key_id', blind: 'identity_number_blind_index',
    purpose: 'organization_tax.identity_number' }
];
const NOTES = [
  { table: 'employee_emergency_contacts', id: 'id', scope: 'employee_id',
    legacy: 'restricted_notes', cipher: 'restricted_notes_ciphertext',
    key: 'restricted_notes_key_id', purpose: 'employee_emergency.restricted_notes' },
  { table: 'employee_restricted_records', id: 'id', scope: 'employee_id',
    legacy: 'restricted_notes', cipher: 'restricted_notes_ciphertext',
    key: 'restricted_notes_key_id', purpose: 'employee_restricted.restricted_notes' }
];

function plaintext(row, spec) {
  if (row[spec.cipher]) {
    return fields.decrypt(row[spec.cipher], { purpose: spec.purpose, scope: row[spec.scope] });
  }
  const legacy = row[spec.legacy];
  if (legacy === null || legacy === undefined || legacy === '') return null;
  if (String(legacy).startsWith('ENC:') || legacy === '[ENCRYPTED]') {
    throw new Error(`${spec.table}.${row[spec.id]} memiliki token tanpa ciphertext.`);
  }
  return String(legacy);
}

async function pendingCounts(client) {
  const cfg = fields.configuration();
  const result = {};
  for (const spec of [...BANKS, ...IDENTIFIERS, ...NOTES]) {
    const column = spec.cipher;
    const key = spec.key;
    const row = (await client.query(
      `SELECT count(*) FILTER(WHERE ${spec.legacy} IS NOT NULL AND ${column} IS NULL)::int plaintext,
              count(*) FILTER(WHERE ${column} IS NOT NULL AND ${key}<>$1)::int old_key
         FROM ${spec.table}`, [cfg.currentId])).rows[0];
    result[spec.table] = row;
  }
  return result;
}

async function rotate(client) {
  const cfg = fields.configuration();
  const counts = {};
  await client.query('BEGIN');
  try {
    await client.query(`SELECT pg_advisory_xact_lock(hashtextextended('field-encryption-rotation',0))`);
    for (const spec of [...BANKS, ...IDENTIFIERS]) {
      const rows = (await client.query(
        `SELECT ${[spec.id, spec.scope, spec.legacy, spec.cipher, spec.key].join(',')}
           FROM ${spec.table}
          WHERE ${spec.legacy} IS NOT NULL
            AND (${spec.cipher} IS NULL OR ${spec.key}<>$1)
          FOR UPDATE`, [cfg.currentId])).rows;
      let changed = 0;
      for (const row of rows) {
        const value = plaintext(row, spec);
        if (value === null) continue;
        const protectedValue = fields.protect(value,
          { purpose: spec.purpose, scope: row[spec.scope], blind: true });
        await client.query(
          `UPDATE ${spec.table}
              SET ${spec.legacy}=$2,${spec.cipher}=$3,${spec.key}=$4,${spec.blind}=$5
            WHERE ${spec.id}=$1`,
          [row[spec.id], protectedValue.legacyToken, protectedValue.ciphertext,
            protectedValue.keyId, protectedValue.blindIndex]);
        changed += 1;
      }
      counts[spec.table] = changed;
    }
    for (const spec of NOTES) {
      const rows = (await client.query(
        `SELECT ${[spec.id, spec.scope, spec.legacy, spec.cipher, spec.key].join(',')}
           FROM ${spec.table}
          WHERE ${spec.legacy} IS NOT NULL
            AND (${spec.cipher} IS NULL OR ${spec.key}<>$1)
          FOR UPDATE`, [cfg.currentId])).rows;
      let changed = 0;
      for (const row of rows) {
        const value = plaintext(row, spec);
        if (value === null) continue;
        const protectedValue = fields.protect(value,
          { purpose: spec.purpose, scope: row[spec.scope] });
        await client.query(
          `UPDATE ${spec.table}
              SET ${spec.legacy}='[ENCRYPTED]',${spec.cipher}=$2,${spec.key}=$3
            WHERE ${spec.id}=$1`,
          [row[spec.id], protectedValue.ciphertext, protectedValue.keyId]);
        changed += 1;
      }
      counts[spec.table] = changed;
    }
    for (const constraint of [
      ['company_bank_accounts', 'ck_company_bank_encrypted'],
      ['supplier_bank_accounts', 'ck_supplier_bank_encrypted'],
      ['employee_bank_accounts', 'ck_employee_bank_encrypted'],
      ['employee_personal_profiles', 'ck_employee_ktp_encrypted'],
      ['employee_tax_profiles', 'ck_employee_npwp_encrypted'],
      ['employee_bpjs_profiles', 'ck_employee_bpjs_encrypted'],
      ['organization_tax_identities', 'ck_organization_tax_id_encrypted'],
      ['employee_emergency_contacts', 'ck_emergency_notes_encrypted'],
      ['employee_restricted_records', 'ck_restricted_notes_encrypted']
    ]) {
      await client.query(`ALTER TABLE ${constraint[0]} VALIDATE CONSTRAINT ${constraint[1]}`);
    }
    await client.query(
      `INSERT INTO field_encryption_rotations(current_key_id,previous_key_ids,status,row_counts,started_at,finished_at,detail)
       VALUES($1,$2,'SUCCEEDED',$3,now(),now(),'Backfill/rotation application-layer AES-256-GCM')`,
      [cfg.currentId, [...cfg.keys.keys()].filter((id) => id !== cfg.currentId),
        JSON.stringify(counts)]);
    await client.query('COMMIT');
    return counts;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

(async () => {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const before = await pendingCounts(client);
    if (!APPLY) {
      console.log(JSON.stringify({ ok: true, mode: 'PREVIEW', currentKeyId: fields.configuration().currentId,
        pending: before }, null, 2));
      return;
    }
    const changed = await rotate(client);
    const after = await pendingCounts(client);
    console.log(JSON.stringify({ ok: true, mode: 'APPLY', currentKeyId: fields.configuration().currentId,
      changed, pending: after }, null, 2));
  } finally { await client.end(); }
})().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }));
  process.exit(1);
});
