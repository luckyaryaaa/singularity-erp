'use strict';
// Applies the complete migration chain to an isolated disposable database,
// then proves the latest production migrations can be rolled back in order.
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

async function main() {
  const admin = new Client({ connectionString: adminUrl.toString() });
  let isolated;
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${database}"`);
    isolated = new Client({ connectionString: testUrl.toString() });
    await isolated.connect();
    for (const filename of migrationFiles()) {
      await isolated.query(fs.readFileSync(path.join(migrationsDir, filename), 'utf8'));
    }
    const wave2 = (await isolated.query(`SELECT
      to_regclass('customer_link_drafts') customer_link,
      to_regclass('supplier_documents') supplier_documents,
      to_regclass('supplier_score_policies') score_policies,
      EXISTS(SELECT 1 FROM pg_constraint WHERE conname='ck_supplier_document_checker') document_sod`)).rows[0];
    if (!wave2.customer_link || !wave2.supplier_documents || !wave2.score_policies || !wave2.document_sod) {
      throw new Error('Migration 025/026 tidak menghasilkan schema governance yang diharapkan.');
    }
    await isolated.query(fs.readFileSync(path.join(migrationsDir, '026_supplier_document_sod_guard.down.sql'), 'utf8'));
    await isolated.query(fs.readFileSync(path.join(migrationsDir, '025_customer_link_supplier_performance.down.sql'), 'utf8'));
    const wave2Removed = (await isolated.query(`SELECT
      to_regclass('customer_link_drafts') customer_link,
      to_regclass('supplier_documents') supplier_documents,
      to_regclass('supplier_score_policies') score_policies,
      EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='performance_hold') performance_hold`)).rows[0];
    if (wave2Removed.customer_link || wave2Removed.supplier_documents || wave2Removed.score_policies || wave2Removed.performance_hold) {
      throw new Error('Rollback 025/026 tidak membersihkan seluruh schema Sprint 8C Wave 2.');
    }
    await isolated.query(fs.readFileSync(path.join(migrationsDir, '025_customer_link_supplier_performance.sql'), 'utf8'));
    await isolated.query(fs.readFileSync(path.join(migrationsDir, '026_supplier_document_sod_guard.sql'), 'utf8'));
    const applied = (await isolated.query(`SELECT
      to_regclass('work_order_operations') operations,
      to_regclass('qc_inspections') quality,
      to_regclass('mrp_suggestions') mrp,
      has_table_privilege('mat_erp_app','qc_inspections','UPDATE') qc_update`)).rows[0];
    if (!applied.operations || !applied.quality || !applied.mrp || applied.qc_update) throw new Error('Migration 021/022 tidak menghasilkan schema atau privilege yang diharapkan.');

    await isolated.query(fs.readFileSync(path.join(migrationsDir, '022_production_security_hardening.down.sql'), 'utf8'));
    const restored = (await isolated.query(`SELECT has_table_privilege('mat_erp_app','qc_inspections','UPDATE') allowed`)).rows[0];
    if (!restored.allowed) throw new Error('Rollback 022 tidak mengembalikan privilege sebelumnya.');
    await isolated.query(fs.readFileSync(path.join(migrationsDir, '021_production_quality_mrp.down.sql'), 'utf8'));
    const removed = (await isolated.query(`SELECT to_regclass('work_order_operations') operations,to_regclass('qc_inspections') quality,to_regclass('mrp_suggestions') mrp`)).rows[0];
    if (removed.operations || removed.quality || removed.mrp) throw new Error('Rollback 021 tidak membersihkan seluruh tabel Sprint 12.');
    process.stdout.write(`Migration rollback verified in disposable database (${migrationFiles().length} up, 026/025 down+up, 022 down, 021 down).\n`);
  } finally {
    if (isolated) await isolated.end().catch(() => {});
    await admin.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()`, [database]).catch(() => {});
    await admin.query(`DROP DATABASE IF EXISTS "${database}"`).catch(() => {});
    await admin.end().catch(() => {});
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
