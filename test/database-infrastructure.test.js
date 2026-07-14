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
