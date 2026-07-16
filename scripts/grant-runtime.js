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
    await client.query(`REVOKE UPDATE,DELETE,TRUNCATE ON audit_logs,audit_logs_2026 FROM ${q}`);
    await client.query(`REVOKE UPDATE,DELETE,TRUNCATE ON schema_migrations FROM ${q}`);
    // Selalu terapkan ulang deny-list setelah broad grant. Ini menjaga script
    // idempotent tanpa membatalkan hardening tabel append-only/controlled flow.
    await client.query(`REVOKE UPDATE,DELETE ON work_order_time_logs FROM ${q}`);
    await client.query(`REVOKE DELETE ON work_order_operations,work_order_materials,mrp_suggestions FROM ${q}`);
    await client.query(`REVOKE UPDATE,DELETE ON qc_inspections FROM ${q}`);
  } finally { await client.end(); }
  console.log(JSON.stringify({ granted: true, role: appUser, createSchema: false }));
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
