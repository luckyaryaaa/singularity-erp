'use strict';
// Wave 13 — field-level encryption, key rotation, blind indexes, and
// repository non-disclosure.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const encryption = require('../backend/core/field-encryption');
const organization = require('../backend/infrastructure/database/repositories/organization');
const masterData = require('../backend/infrastructure/database/repositories/master-data');

const SECRET_1 = 'field-encryption-test-secret-v1-32chars';
const SECRET_2 = 'field-encryption-test-secret-v2-32chars';
const BLIND = 'blind-index-test-secret-stable-32chars';
const env = (id, secret, previous = {}) => ({
  MAT_ENVIRONMENT: 'LOCAL-INTEGRATION',
  MAT_FIELD_ENCRYPTION_KEY_ID: id,
  MAT_FIELD_ENCRYPTION_KEY: secret,
  MAT_FIELD_BLIND_INDEX_KEY: BLIND,
  MAT_FIELD_ENCRYPTION_PREVIOUS_KEYS: JSON.stringify(previous)
});

test('Wave 13: AES-GCM mengikat purpose/scope dan key ring dapat membaca key lama', () => {
  const options = { purpose: 'supplier_bank.account_number', scope: 'supplier-1' };
  const oldCipher = encryption.encrypt('0088-1234-5678', options, env('v1', SECRET_1));
  assert.equal(encryption.decrypt(oldCipher, options,
    env('v2', SECRET_2, { v1: SECRET_1 })), '0088-1234-5678');
  assert.throws(() => encryption.decrypt(oldCipher,
    { ...options, scope: 'supplier-2' }, env('v2', SECRET_2, { v1: SECRET_1 })),
  /AUTHENTICATION_FAILED/);
  assert.throws(() => encryption.decrypt(oldCipher, options, env('v2', SECRET_2)),
    /KEY_UNAVAILABLE:v1/);
  assert.equal(
    encryption.blindIndex('0088-1234-5678', options.purpose, env('v1', SECRET_1)),
    encryption.blindIndex('0088 1234 5678', options.purpose, env('v2', SECRET_2))
  );
});

test('Wave 13: production menuntut encryption key dan blind-index key terpisah', () => {
  const base = {
    NODE_ENV: 'production', MAT_ENVIRONMENT: 'PRODUCTION',
    MAT_FIELD_ENCRYPTION_KEY_ID: 'v1',
    MAT_FIELD_ENCRYPTION_KEY: SECRET_1,
    MAT_FIELD_BLIND_INDEX_KEY: SECRET_1
  };
  assert.throws(() => encryption.configuration(base), /wajib terpisah/);
  assert.equal(encryption.configuration({ ...base,
    MAT_FIELD_BLIND_INDEX_KEY: BLIND }).currentId, 'v1');
});

const dbTest = process.env.DATABASE_URL ? test : test.skip;
dbTest('Wave 13: database hanya menyimpan ciphertext/token tetapi repository mengembalikan plaintext berizin', async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query('BEGIN');
  await client.query("SELECT set_config('app.is_system','on',true)");
  try {
    const ownerRow = (await client.query(
      `SELECT * FROM app_users WHERE role='owner' AND active ORDER BY created_at LIMIT 1`)).rows[0];
    const branch = (await client.query(
      `SELECT id,legal_entity_id FROM branches WHERE legal_entity_id IS NOT NULL ORDER BY created_at LIMIT 1`)).rows[0];
    const employee = (await client.query(
      `SELECT id FROM employees ORDER BY created_at LIMIT 1`)).rows[0];
    assert.ok(ownerRow && branch && employee);
    const owner = { id: ownerRow.id, role: 'owner', branchId: branch.id,
      branchScope: '*', displayName: ownerRow.display_name };
    const account = `9911${Date.now()}`;
    const created = await organization.createResource(client, owner, branch.legal_entity_id,
      'bank-accounts', { bankName: 'Bank Cipher', accountNumber: account,
        accountHolder: 'MAT Encryption Test', currency: 'IDR',
        usagePurpose: 'OPERATING', effectiveFrom: '2026-07-27',
        changeReason: 'Field encryption regression evidence' }, randomUUID());
    assert.equal(created.accountNumber, account);
    assert.equal(created.accountNumberCiphertext, undefined);
    const rawBank = (await client.query(
      `SELECT account_number,account_number_ciphertext,account_number_key_id,
              account_number_blind_index
         FROM company_bank_accounts WHERE id=$1`, [created.id])).rows[0];
    assert.match(rawBank.account_number, /^ENC:[0-9a-f]{36}$/);
    assert.match(rawBank.account_number_ciphertext, /^fe1:/);
    assert.equal(rawBank.account_number_ciphertext.includes(account), false);
    assert.equal(rawBank.account_number_blind_index.length, 64);

    const note = 'Catatan medis sangat terbatas untuk regression encryption.';
    const restricted = await masterData.createSub(client, 'employees', employee.id,
      'restricted-records', { recordType: 'MEDICAL', title: 'Restricted test',
        restrictedNotes: note, effectiveFrom: '2026-07-27' }, owner, randomUUID());
    assert.equal(restricted.restrictedNotes, note);
    assert.equal(restricted.restrictedNotesCiphertext, undefined);
    const rawNote = (await client.query(
      `SELECT restricted_notes,restricted_notes_ciphertext,restricted_notes_key_id
         FROM employee_restricted_records WHERE id=$1`, [restricted.id])).rows[0];
    assert.equal(rawNote.restricted_notes, '[ENCRYPTED]');
    assert.match(rawNote.restricted_notes_ciphertext, /^fe1:/);
    assert.equal(rawNote.restricted_notes_ciphertext.includes(note), false);

    const constraints = (await client.query(
      `SELECT conname,convalidated FROM pg_constraint
       WHERE conname=ANY($1)`, [[
        'ck_company_bank_encrypted', 'ck_supplier_bank_encrypted',
        'ck_employee_bank_encrypted', 'ck_emergency_notes_encrypted',
        'ck_restricted_notes_encrypted'
      ]])).rows;
    assert.equal(constraints.length, 5);
    assert.equal(constraints.every((row) => row.convalidated), true);
  } finally {
    await client.query('ROLLBACK').catch(() => {});
    await client.end();
  }
});

test('Wave 13: migration reversible dan rotation script masuk deployment path', () => {
  const fs = require('node:fs');
  const up = fs.readFileSync('data/migrations/065_field_encryption_foundation.sql', 'utf8');
  const down = fs.readFileSync('data/migrations/065_field_encryption_foundation.down.sql', 'utf8');
  const deploy = fs.readFileSync('deploy/install-release.sh', 'utf8');
  assert.match(up, /account_number_ciphertext/);
  assert.match(up, /NOT VALID/);
  assert.match(down, /DROP COLUMN IF EXISTS account_number_ciphertext/);
  assert.match(deploy, /rotate-field-encryption\.js --apply/);
});
