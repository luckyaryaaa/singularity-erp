'use strict';
// Pemulih SEED KONFIGURASI (bukan data bisnis): katalog permission, matriks
// approval, kebijakan skor supplier, dan bin gudang default. Idempoten —
// hanya mengisi bila tabel kosong, sehingga aman dijalankan kapan pun
// (mis. setelah purge yang terlanjur mengosongkannya).
// Jalankan: npm run data:restore-config
require('../backend/core/env').loadEnv();
const { Client } = require('pg');
const fs = require('node:fs');
const path = require('node:path');

// Template dokumen resmi di-seed migrasi 036. Diekstrak dari file migrasi (bukan
// diduplikasi) agar isi seed pemulihan selalu identik dengan sumber aslinya.
function documentTemplatesSeed() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'data', 'migrations', '036_document_templates.sql'), 'utf8');
    const match = sql.match(/INSERT INTO document_templates[\s\S]*?;/);
    if (!match) return null;
    return match[0].replace(/;\s*$/, ' ON CONFLICT (document_type,version) DO NOTHING;');
  } catch { return null; }
}

// Peta peran-akun (CASH_BANK, AR/AP_CONTROL, COGS, dst) → bagan akun. Di-seed
// lintas migrasi 039/062/068; wajib ada agar Executive Cockpit & posting jalan.
function accountRolesSeed() {
  try {
    const stmts = [];
    for (const f of ['039_account_roles_tax_rates.sql', '062_perpetual_inventory_cogs.sql', '068_tax_reconciliation_role.sql']) {
      const sql = fs.readFileSync(path.join(__dirname, '..', 'data', 'migrations', f), 'utf8');
      for (const m of (sql.match(/INSERT INTO account_roles[\s\S]*?;/gi) || [])) stmts.push(m);
    }
    return stmts.length ? stmts.join('\n') : null;
  } catch { return null; }
}

const SEEDS = [
  {
    table: 'permission_catalog',
    // Sumber: migrasi 016 — kombinasi modul × aksi (sensitif untuk aksi kritis).
    sql: `INSERT INTO permission_catalog(code,module,action,sensitive,description)
      SELECT m||'.'||a, m, a, a IN('approve','post','void','edit'), initcap(m)||' — '||a
      FROM unnest(ARRAY['dashboard','approval','notification','organization','customer','supplier','product','inquiry',
        'quotation','customer_po','sales_order','project','work_order','production','quality','purchase_request','rfq',
        'purchase_order','goods_receipt','inventory','material_issue','stock_transfer','stock_adjustment','stock_opname',
        'delivery','rma','invoice','payment','payment_proposal','supplier_invoice','supplier_payment','expense','asset',
        'budget','journal','ledger','closing','credit','payroll','employee','attendance','leave','tax','report','audit',
        'user','iam','sod','access_review','approval_policy','settings','monitoring','job','selftest','backup']) m
      CROSS JOIN unnest(ARRAY['view','create','edit','submit','approve','reject','post','void','cancel','export','import']) a
      ON CONFLICT DO NOTHING`
  },
  {
    table: 'approval_matrix',
    // Sumber: migrasi 002 — matriks nilai → jenjang persetujuan.
    sql: `INSERT INTO approval_matrix (document_type, min_amount, max_amount, approval_levels) VALUES
      ('*', 0, 5000000, '{supervisor}'),
      ('*', 5000001, 50000000, '{supervisor,finance}'),
      ('*', 50000001, NULL, '{supervisor,finance,owner}')
      ON CONFLICT DO NOTHING`
  },
  {
    table: 'supplier_score_policies',
    // Sumber: migrasi 025 — bobot skor kinerja supplier.
    sql: `INSERT INTO supplier_score_policies(code,version,effective_from,delivery_weight,quality_weight,price_weight,compliance_weight)
      VALUES('DEFAULT',1,'2026-01-01',35,35,20,10) ON CONFLICT DO NOTHING`
  },
  {
    table: 'warehouse_bins',
    // Sumber: migrasi 012 — satu bin default per storage location.
    sql: `INSERT INTO warehouse_bins(storage_location_id,code)
      SELECT sl.id,'A-01-01' FROM storage_locations sl ON CONFLICT DO NOTHING`
  }
];

// Sumber: migrasi 036 — template dokumen resmi (kop, warna, T&C, tanda tangan).
const tplSeedSql = documentTemplatesSeed();
if (tplSeedSql) SEEDS.push({ table: 'document_templates', sql: tplSeedSql });
// Sumber: migrasi 039/062/068 — peta peran akun → bagan akun.
const accRoleSql = accountRolesSeed();
if (accRoleSql) SEEDS.push({ table: 'account_roles', sql: accRoleSql });

(async () => {
  const client = new Client({ connectionString: process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL });
  await client.connect();
  const report = [];
  try {
    for (const seed of SEEDS) {
      const exists = (await client.query('SELECT to_regclass($1) t', [`public.${seed.table}`])).rows[0].t;
      if (!exists) { report.push(`${seed.table}: tabel tidak ada — dilewati`); continue; }
      const before = Number((await client.query(`SELECT count(*)::int n FROM "${seed.table}"`)).rows[0].n);
      if (before > 0) { report.push(`${seed.table}: sudah terisi ${before} baris — dilewati`); continue; }
      await client.query(seed.sql);
      const after = Number((await client.query(`SELECT count(*)::int n FROM "${seed.table}"`)).rows[0].n);
      report.push(`${seed.table}: dipulihkan ${after} baris`);
    }
  } catch (error) {
    console.error('GAGAL:', error.message);
    process.exitCode = 1;
  } finally { await client.end(); }
  console.log('RESTORE SEED KONFIGURASI');
  for (const line of report) console.log('  ' + line);
})();
