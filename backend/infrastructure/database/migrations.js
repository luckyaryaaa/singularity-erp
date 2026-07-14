'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { getPool } = require('./pool');

const DIR = path.join(__dirname, '..', '..', '..', 'data', 'migrations');
const LOCK_ID = 620260714;
const checksum = (value) => crypto.createHash('sha256').update(value).digest('hex');

function migrationFiles() {
  return fs.readdirSync(DIR).filter((name) => /^\d+_.+\.sql$/.test(name) && !name.endsWith('.down.sql')).sort();
}

async function ensureTable(client) {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename text PRIMARY KEY, checksum_sha256 char(64) NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now(), execution_ms integer NOT NULL
  )`);
}

async function status() {
  const client = await getPool().connect();
  try {
    await ensureTable(client);
    const applied = new Map((await client.query('SELECT filename, checksum_sha256, applied_at FROM schema_migrations')).rows.map((r) => [r.filename, r]));
    return migrationFiles().map((filename) => {
      const sql = fs.readFileSync(path.join(DIR, filename), 'utf8');
      const currentChecksum = checksum(sql); const row = applied.get(filename);
      return { filename, state: !row ? 'pending' : row.checksum_sha256 === currentChecksum ? 'applied' : 'checksum_mismatch', checksum: currentChecksum, appliedAt: row && row.applied_at };
    });
  } finally { client.release(); }
}

async function up() {
  const client = await getPool().connect();
  const applied = [];
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
    await ensureTable(client);
    for (const item of await status()) {
      if (item.state === 'checksum_mismatch') throw new Error(`Checksum migration berubah setelah diterapkan: ${item.filename}`);
      if (item.state === 'applied') continue;
      const sql = fs.readFileSync(path.join(DIR, item.filename), 'utf8'); const started = Date.now();
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(filename,checksum_sha256,execution_ms) VALUES($1,$2,$3)', [item.filename,item.checksum,Date.now()-started]);
      applied.push(item.filename);
    }
    return applied;
  } finally {
    try { await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]); } finally { client.release(); }
  }
}

async function validate() {
  const items = await status();
  const invalid = items.filter((x) => x.state !== 'applied');
  if (invalid.length) throw new Error(`Schema belum siap: ${invalid.map((x) => `${x.filename}:${x.state}`).join(', ')}`);
  return items;
}

module.exports = { status, up, validate, migrationFiles, checksum };
