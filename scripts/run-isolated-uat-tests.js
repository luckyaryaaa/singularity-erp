'use strict';
require('../backend/core/env').loadEnv();
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { Client } = require('pg');
const { assertDedicatedUatDatabase } = require('./uat-database-guard');

const ROOT = path.join(__dirname, '..');
const TEST_DATABASE = 'mat_erp_v2_gate_uat';
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('npm_execpath tidak tersedia; jalankan melalui npm run test:uat:isolated.');
if (!process.env.DATABASE_URL || !process.env.MIGRATION_DATABASE_URL) throw new Error('DATABASE_URL dan MIGRATION_DATABASE_URL wajib tersedia.');

const withDatabase = (raw, database) => { const url = new URL(raw); url.pathname = `/${database}`; return url.toString(); };
const childEnv = {
  ...process.env,
  PGDATABASE: TEST_DATABASE,
  DATABASE_URL: withDatabase(process.env.DATABASE_URL, TEST_DATABASE),
  MIGRATION_DATABASE_URL: withDatabase(process.env.MIGRATION_DATABASE_URL, TEST_DATABASE),
  MAT_ENVIRONMENT: 'LAN-UAT',
  MAT_DEPLOY_STAGE: 'LAN-UAT',
  npm_config_offline: process.env.npm_config_offline || 'true',
  npm_config_cache: process.env.npm_config_cache || '.npm-cache'
};
assertDedicatedUatDatabase(childEnv);

async function dropTestDatabase() {
  const adminUrl = new URL(process.env.MIGRATION_DATABASE_URL);
  adminUrl.pathname = '/postgres';
  const admin = new Client({ connectionString: adminUrl.toString(), application_name: 'mat-erp-uat-gate-cleanup' });
  await admin.connect();
  try {
    await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()', [TEST_DATABASE]);
    await admin.query(`DROP DATABASE IF EXISTS "${TEST_DATABASE}"`);
  } finally { await admin.end(); }
}

function run(label, args) {
  const result = spawnSync(process.execPath, [npmCli, ...args], { cwd: ROOT, env: childEnv, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${label} gagal dengan exit ${result.status}.`);
}

(async () => {
  await dropTestDatabase();
  try {
    run('Provision test database', ['run', 'db:provision']);
    run('Migration test database', ['run', 'db:migrate']);
    run('Least-privilege test database', ['run', 'db:grant-runtime']);
    run('Seed test database', ['run', 'db:seed:uat']);
    run('Seed HR/Finance test database', ['run', 'db:seed:uat:sprint4']);
    run('Opening inventory test database', ['run', 'cutover:opening-inventory']);
    run('Backup test database', ['run', 'backup:run']);
    run('Restore drill test database', ['run', 'backup:restore-test']);
    run('Regression suite', ['test']);
    console.log(JSON.stringify({ ok: true, isolated: true, database: TEST_DATABASE }));
  } finally {
    await dropTestDatabase();
  }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
