'use strict';
require('../backend/core/env').loadEnv();
const { Client } = require('pg');

const host = process.env.PGHOST || '127.0.0.1';
const port = Number(process.env.PGPORT || 5432);
const adminUser = process.env.POSTGRES_SUPERUSER || 'postgres';
const adminPassword = process.env.POSTGRES_SUPERPASSWORD;
const database = process.env.PGDATABASE || 'mat_erp_v2_dev';
const appUser = process.env.PGUSER || 'mat_erp_app';
const appPassword = process.env.PGPASSWORD;
const ident = (value) => { if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error(`Identifier tidak aman: ${value}`); return `"${value}"`; };
const literal = (value) => `'${String(value).replace(/'/g, "''")}'`;

async function connect(db) {
  const client = new Client({ host, port, database: db, user: adminUser, password: adminPassword, connectionTimeoutMillis: 5000 });
  await client.connect(); return client;
}

(async () => {
  if (!adminPassword || !appPassword) throw new Error('Credential provisioning tidak lengkap di .env.');
  let admin = await connect('postgres');
  try {
    const role = await admin.query('SELECT 1 FROM pg_roles WHERE rolname=$1', [appUser]);
    if (!role.rowCount) await admin.query(`CREATE ROLE ${ident(appUser)} LOGIN PASSWORD ${literal(appPassword)} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION`);
    else await admin.query(`ALTER ROLE ${ident(appUser)} WITH LOGIN PASSWORD ${literal(appPassword)} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION`);
    const db = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [database]);
    if (!db.rowCount) await admin.query(`CREATE DATABASE ${ident(database)} OWNER ${ident(adminUser)} ENCODING 'UTF8' TEMPLATE template0`);
    await admin.query(`REVOKE ALL ON DATABASE ${ident(database)} FROM PUBLIC`);
    await admin.query(`GRANT CONNECT ON DATABASE ${ident(database)} TO ${ident(appUser)}`);
  } finally { await admin.end(); }

  admin = await connect(database);
  try {
    await admin.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await admin.query(`REVOKE CREATE ON SCHEMA public FROM PUBLIC`);
    await admin.query(`GRANT USAGE ON SCHEMA public TO ${ident(appUser)}`);
  } finally { await admin.end(); }
  console.log(JSON.stringify({ provisioned: true, database, appUser, host, port, privileges: ['CONNECT','USAGE'], superuser: false }));
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
