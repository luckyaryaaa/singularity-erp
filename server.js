'use strict';
require('./backend/core/env').loadEnv();
// Entry point tunggal: static app shell + API modular monolith.
// Produksi: letakkan di belakang reverse proxy HTTPS; PostgreSQL tidak dipublikkan.

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { seed, hasDefaultCredentials } = require('./backend/modules/seed');
const { store } = require('./backend/infrastructure/database/store');
const persistence = require('./backend/infrastructure/database/persistence');

// Mode uji: ephemeral (seed segar, tanpa tulis disk). Mode normal: durable —
// muat snapshot bila ada, seed hanya saat pertama kali, lalu pantau perubahan.
const production = process.env.NODE_ENV === 'production';
const demoMode = process.env.MAT_DEMO_MODE === '1' || !production;
const ephemeral = process.env.MAT_EPHEMERAL === '1' || !!process.env.NODE_TEST_CONTEXT || process.env.NODE_ENV === 'test';
const postgresMode = process.env.MAT_DB_MODE === 'postgres' && !ephemeral;
const api = postgresMode ? require('./backend/api-postgres') : require('./backend/api');
if (postgresMode) {
  // PostgreSQL adalah sumber kebenaran; snapshot JSON tidak boleh ikut dimuat.
} else if (ephemeral) {
  seed();
} else {
  const loaded = persistence.init(store, path.join(__dirname, 'data', 'runtime', 'state.json'));
  if (!loaded && demoMode) { seed(); persistence.flush(); }
  if (!loaded && production) {
    throw new Error('PRODUCTION_BOOT_BLOCKED: database production belum diprovisioning; fallback seed demo dilarang.');
  }
}
if (!postgresMode && production && hasDefaultCredentials(store)) {
  throw new Error('PRODUCTION_BOOT_BLOCKED: kredensial demo/default terdeteksi. Ganti seluruh kredensial sebelum startup production.');
}

const root = __dirname;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.json': 'application/json' };
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; img-src 'self' data:; connect-src 'self'"
};

const PUBLIC_EXACT = new Set(['/index.html']);
const PUBLIC_PREFIXES = ['/src/', '/assets/'];
function resolvePublicFile(rawUrl) {
  let pathname;
  try { pathname = decodeURIComponent(new URL(rawUrl, 'http://localhost').pathname); } catch { return null; }
  if (pathname === '/') pathname = '/index.html';
  if (!PUBLIC_EXACT.has(pathname) && !PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;
  const relative = pathname.replace(/^\/+/, '');
  const file = path.resolve(root, relative);
  const rel = path.relative(root, file);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel) || rel.split(path.sep).some((part) => part.startsWith('.'))) return null;
  return file;
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) return api.handle(req, res);

  const file = resolvePublicFile(req.url);
  if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'application/json', ...SECURITY_HEADERS });
    return res.end(JSON.stringify({ code: 'RESOURCE_NOT_FOUND', message: 'Resource tidak ditemukan.' }));
  }
  const ext = path.extname(file);
  const headers = {
    'Content-Type': types[ext] || 'application/octet-stream',
    // Asset tanpa fingerprint: selalu revalidasi (304 murah di LAN) agar rilis baru langsung terpakai.
    'Cache-Control': 'no-cache',
    ...SECURITY_HEADERS
  };
  const raw = fs.readFileSync(file);
  if (raw.length > 1024 && /\bgzip\b/.test(req.headers['accept-encoding'] || '') && ['.html', '.css', '.js', '.svg', '.json'].includes(ext)) {
    headers['Content-Encoding'] = 'gzip';
    res.writeHead(200, headers);
    return res.end(zlib.gzipSync(raw));
  }
  res.writeHead(200, headers);
  res.end(raw);
});

async function boot() {
  let worker = null;
  if (postgresMode) {
    if (production && (!process.env.MAT_MFA_ENCRYPTION_KEY || process.env.MAT_MFA_ENCRYPTION_KEY.startsWith('CHANGE_ME'))) throw new Error('PRODUCTION_BOOT_BLOCKED: MAT_MFA_ENCRYPTION_KEY wajib berupa secret kuat.');
    const { getPool, close } = require('./backend/infrastructure/database/pool');
    const outbox = require('./backend/infrastructure/database/outbox-dispatcher');
    const latest = (await getPool().query('SELECT filename FROM schema_migrations ORDER BY filename DESC LIMIT 1')).rows[0]?.filename;
    if (latest !== '010_employee_self_service.sql') throw new Error(`DATABASE_MIGRATION_REQUIRED: latest=${latest || 'none'}`);
    worker = require('./backend/workers/postgres-worker').start();
    outbox.start();
    const shutdown = () => { worker.stop(); outbox.stop(); server.close(() => close().finally(() => process.exit(0))); };
    process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
  }
  const port=Number(process.env.PORT)||4173;
  server.listen(port, '127.0.0.1', () =>
    console.log(JSON.stringify({ level:'info', service:'mat-erp-v2', message:`MAT ERP V2 · http://127.0.0.1:${port}`, at:new Date().toISOString() })));
}
if (require.main === module) boot().catch((error) => {
  console.error(JSON.stringify({ level:'fatal', service:'mat-erp-v2', error:error.message, at:new Date().toISOString() }));
  process.exitCode = 1;
});
module.exports = server;
