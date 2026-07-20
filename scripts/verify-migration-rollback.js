'use strict';
// Full-chain up/down verification in an isolated disposable database.
// Migration 001 is the irreversible root; every later migration must provide
// a down file and survive reverse-order rollback followed by forward reapply.
require('../backend/core/env').loadEnv();
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const { migrationFiles } = require('../backend/infrastructure/database/migrations');

const sourceUrl = process.env.MIGRATION_DATABASE_URL;
if (!sourceUrl) throw new Error('MIGRATION_DATABASE_URL wajib untuk verifikasi rollback terisolasi.');
const database = `mat_erp_rollback_${Date.now().toString(36)}`;
if (!/^mat_erp_rollback_[a-z0-9]+$/.test(database)) throw new Error('Nama database rollback tidak aman.');
const migrationsDir = path.resolve(__dirname, '..', 'data', 'migrations');
const adminUrl = new URL(sourceUrl); adminUrl.pathname = '/postgres';
const testUrl = new URL(sourceUrl); testUrl.pathname = `/${database}`;
const sql = (name) => fs.readFileSync(path.join(migrationsDir, name), 'utf8');

async function main() {
  const admin = new Client({ connectionString: adminUrl.toString() });
  let isolated;
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${database}"`);
    isolated = new Client({ connectionString: testUrl.toString() });
    await isolated.connect();
    const up = migrationFiles();
    for (const filename of up) await isolated.query(sql(filename));
    const reversible = up.slice(1);
    const missing = reversible.filter((name) => !fs.existsSync(path.join(migrationsDir, name.replace(/\.sql$/, '.down.sql'))));
    if (missing.length) throw new Error(`Down migration wajib belum tersedia: ${missing.join(', ')}`);

    for (const filename of [...reversible].reverse()) await isolated.query(sql(filename.replace(/\.sql$/, '.down.sql')));
    const root = (await isolated.query(`SELECT to_regclass('branches') branches,to_regclass('business_documents') documents`)).rows[0];
    if (!root.branches || !root.documents) throw new Error('Rollback merusak irreversible root migration 001.');
    const removed = (await isolated.query(`SELECT to_regclass('employees') employees,to_regclass('fixed_assets') fixed_assets,to_regclass('employee_rosters') rosters`)).rows[0];
    if (removed.employees || removed.fixed_assets || removed.rosters) throw new Error('Full rollback tidak membersihkan schema migration 002+.');

    for (const filename of reversible) await isolated.query(sql(filename));
    const restored = (await isolated.query(`SELECT
      to_regclass('employees') employees,
      to_regclass('fixed_assets') fixed_assets,
      to_regclass('employee_rosters') rosters,
      EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='business_documents' AND column_name='official_signature') official_signature,
      NOT has_table_privilege('mat_erp_app','fixed_assets','DELETE') asset_delete_denied,
      NOT has_table_privilege('mat_erp_app','dunning_notices','DELETE') dunning_delete_denied`)).rows[0];
    if (!Object.values(restored).every(Boolean)) throw new Error(`Forward reapply/privilege verification gagal: ${JSON.stringify(restored)}`);
    process.stdout.write(`Migration rollback verified in disposable database (${up.length} up, ${reversible.length} down, ${reversible.length} re-up).\n`);
  } finally {
    if (isolated) await isolated.end().catch(() => {});
    await admin.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()`, [database]).catch(() => {});
    await admin.query(`DROP DATABASE IF EXISTS "${database}"`).catch(() => {});
    await admin.end().catch(() => {});
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
