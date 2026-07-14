'use strict';
const { Pool } = require('pg');

let pool = null;

function intEnv(name, fallback, min, max) {
  const value = Number.parseInt(process.env[name] || fallback, 10);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${name} harus ${min}–${max}.`);
  return value;
}

function config() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL wajib untuk runtime PostgreSQL.');
  return {
    connectionString: process.env.DATABASE_URL,
    min: intEnv('DB_POOL_MIN', 2, 0, 20),
    max: intEnv('DB_POOL_MAX', 15, 2, 50),
    idleTimeoutMillis: intEnv('DB_IDLE_TIMEOUT_MS', 30_000, 1_000, 300_000),
    connectionTimeoutMillis: intEnv('DB_CONNECT_TIMEOUT_MS', 5_000, 500, 60_000),
    statement_timeout: intEnv('DB_QUERY_TIMEOUT_MS', 20_000, 1_000, 120_000),
    application_name: 'mat-erp-v2',
    ssl: process.env.DB_SSL === '1' ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== '0' } : false
  };
}

function getPool() {
  if (!pool) {
    pool = new Pool(config());
    pool.on('error', (error) => console.error(JSON.stringify({ level: 'error', service: 'postgres', message: error.message, at: new Date().toISOString() })));
  }
  return pool;
}

async function healthCheck() {
  const started = Date.now();
  const result = await getPool().query('SELECT current_database() AS database, current_user AS username, version() AS version, now() AS server_time');
  return { ok: true, latencyMs: Date.now() - started, ...result.rows[0], pool: stats() };
}

function stats() {
  if (!pool) return { initialized: false, total: 0, idle: 0, waiting: 0 };
  return { initialized: true, total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount };
}

async function close() { if (pool) { const current = pool; pool = null; await current.end(); } }

module.exports = { getPool, healthCheck, stats, close, config };
