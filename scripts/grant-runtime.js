'use strict';
require('../backend/core/env').loadEnv();
const { Client } = require('pg');

const appUser = process.env.PGUSER || 'mat_erp_app';
if (!/^[a-z_][a-z0-9_]*$/.test(appUser)) throw new Error('PGUSER tidak aman.');
const q = `"${appUser}"`;
(async () => {
  const client = new Client({ connectionString: process.env.MIGRATION_DATABASE_URL });
  await client.connect();
  try {
    await client.query(`GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO ${q}`);
    await client.query(`GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO ${q}`);
    await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO ${q}`);
    await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE,SELECT ON SEQUENCES TO ${q}`);
    await client.query(`REVOKE CREATE ON SCHEMA public FROM ${q}`);
    // D2 — jejak audit INSERT-only pada SELURUH partisi, ditemukan dinamis.
    // Sebelumnya hanya `audit_logs` dan `audit_logs_2026` yang di-revoke secara
    // hardcode, sementara partisi 2027–2031, DEFAULT, dan setiap partisi baru
    // hasil maintenance tetap mewarisi broad grant di atas — artinya runtime
    // user bisa MENGUBAH dan MENGHAPUS jejak audit tahun-tahun berikutnya.
    const auditTables = (await client.query(`SELECT c.relname FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind IN('r','p') AND c.relname LIKE 'audit_logs%'
      ORDER BY c.relname`)).rows.map((r) => `"${r.relname}"`);
    if (!auditTables.length) throw new Error('Tabel audit_logs tidak ditemukan — hardening tidak dapat diterapkan.');
    await client.query(`REVOKE UPDATE,DELETE,TRUNCATE ON ${auditTables.join(',')} FROM ${q}`);
    await client.query(`REVOKE UPDATE,DELETE,TRUNCATE ON schema_migrations FROM ${q}`);
    await client.query(`REVOKE INSERT,UPDATE,DELETE,TRUNCATE ON field_encryption_rotations FROM ${q}`);
    // Selalu terapkan ulang deny-list setelah broad grant. Ini menjaga script
    // idempotent tanpa membatalkan hardening tabel append-only/controlled flow.
    await client.query(`REVOKE UPDATE,DELETE ON work_order_time_logs FROM ${q}`);
    await client.query(`REVOKE DELETE ON work_order_operations,work_order_materials,mrp_suggestions FROM ${q}`);
    await client.query(`REVOKE UPDATE,DELETE ON qc_inspections FROM ${q}`);
    await client.query(`REVOKE DELETE ON attendance_corrections,dunning_notices,fixed_assets,po_change_orders,notification_deliveries FROM ${q}`);
    await client.query(`REVOKE INSERT,UPDATE,DELETE,TRUNCATE ON reporting_refresh_runs FROM ${q}`);
    await client.query(`REVOKE DELETE,TRUNCATE ON report_schedules FROM ${q}`);
    // Financial statements and HR/payroll histories are lifecycle/append-only
    // evidence. Corrections use a new version/effective date, never deletion.
    const protectedHistories = [
      'financial_reports', 'accounting_periods', 'employee_compensation_history',
      'employee_tax_profiles', 'employee_bpjs_profiles', 'payroll_items',
      'tax_records', 'finance_reconciliation_evidence', 'accounting_period_close_runs'
    ];
    await client.query(`REVOKE DELETE,TRUNCATE ON ${protectedHistories.map((name) => `"${name}"`).join(',')} FROM ${q}`);
    await client.query(`GRANT SELECT ON mv_executive_monthly_kpis TO ${q}`);
    await client.query(`GRANT EXECUTE ON FUNCTION refresh_executive_reporting() TO ${q}`);
    await client.query(`GRANT EXECUTE ON FUNCTION inventory_partition_maintenance(integer) TO ${q}`);
    await client.query(`GRANT EXECUTE ON FUNCTION execute_data_retention(varchar,timestamptz,integer) TO ${q}`);

    // Verifikasi, bukan asumsi: pastikan tidak ada partisi audit yang masih
    // dapat diubah/dihapus oleh runtime user setelah seluruh grant diterapkan.
    const leaks = (await client.query(`SELECT c.relname FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind IN('r','p') AND c.relname LIKE 'audit_logs%'
        AND (has_table_privilege($1,c.oid,'UPDATE') OR has_table_privilege($1,c.oid,'DELETE')
          OR has_table_privilege($1,c.oid,'TRUNCATE'))`, [appUser])).rows.map((r) => r.relname);
    if (leaks.length) throw new Error(`Partisi audit masih dapat diubah/dihapus oleh ${appUser}: ${leaks.join(', ')}`);
    const historyLeaks = (await client.query(`SELECT c.relname FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=ANY($2)
        AND (has_table_privilege($1,c.oid,'DELETE') OR has_table_privilege($1,c.oid,'TRUNCATE'))`,
    [appUser, protectedHistories])).rows.map((r) => r.relname);
    if (historyLeaks.length) throw new Error(`Riwayat sensitif masih dapat dihapus oleh ${appUser}: ${historyLeaks.join(', ')}`);
    var auditProtected = auditTables.length;
  } finally { await client.end(); }
  console.log(JSON.stringify({ granted: true, role: appUser, createSchema: false,
    auditTablesProtected: auditProtected, sensitiveHistoriesProtected: 9 }));
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
