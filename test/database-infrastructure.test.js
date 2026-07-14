'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const migrations = require('../backend/infrastructure/database/migrations');

test('migration runner menemukan migrasi up berurutan dan mengabaikan down', () => {
  const files = migrations.migrationFiles();
  assert.deepEqual(files, [...files].sort());
  assert.ok(files.includes('001_core_foundation.sql'));
  assert.ok(files.includes('002_business_modules.sql'));
  assert.ok(files.every((name) => !name.endsWith('.down.sql')));
});

test('seluruh migration memiliki checksum stabil dan transaction boundary', () => {
  for (const filename of migrations.migrationFiles()) {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'data', 'migrations', filename), 'utf8');
    assert.equal(migrations.checksum(sql), migrations.checksum(sql));
    assert.match(sql, /BEGIN;/i); assert.match(sql, /COMMIT;/i);
  }
});

test('konfigurasi pool menolak production tanpa DATABASE_URL', () => {
  const before = process.env.DATABASE_URL; delete process.env.DATABASE_URL;
  const pool = require('../backend/infrastructure/database/pool');
  assert.throws(() => pool.config(), /DATABASE_URL wajib/);
  if (before) process.env.DATABASE_URL = before;
});

test('enkripsi backup offsite: roundtrip AES-256-GCM dan penolakan kunci salah', () => {
  const backupCrypto = require('../backend/infrastructure/database/backup-crypto');
  const passphrase = 'kunci-uji-minimal-enam-belas-karakter';
  const payload = Buffer.from('PGDMP dump simulasi \x00\x01\x02 isi biner backup MAT ERP V2');
  const encrypted = backupCrypto.encrypt(payload, passphrase);
  assert.ok(encrypted.subarray(0, 6).equals(Buffer.from('MATBK1')), 'magic header offsite');
  assert.ok(!encrypted.includes(Buffer.from('PGDMP dump')), 'isi tidak boleh terbaca polos');
  assert.deepEqual(backupCrypto.decrypt(encrypted, passphrase), payload, 'roundtrip identik');
  assert.throws(() => backupCrypto.decrypt(encrypted, 'kunci-salah-tapi-panjangnya-cukup'), /unable to authenticate|Unsupported state/i);
  assert.throws(() => backupCrypto.encrypt(payload, 'pendek'), /minimal 16 karakter/);
});

test('migrasi 011 menyediakan partisi audit multi-tahun + DEFAULT + fungsi maintenance', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'data', 'migrations', '011_audit_partition_lifecycle.sql'), 'utf8');
  assert.match(sql, /FOR y IN 2027\.\.2031/);
  assert.match(sql, /PARTITION OF audit_logs DEFAULT/);
  assert.match(sql, /audit_partition_maintenance/);
  assert.match(sql, /SECURITY DEFINER/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION audit_partition_maintenance\(\) TO mat_erp_app/);
});
