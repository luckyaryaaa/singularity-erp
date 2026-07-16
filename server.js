'use strict';
const envCore=require('./backend/core/env');envCore.loadEnv();
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
const environment=envCore.assertEnvironment({forBoot:production});
const demoMode = process.env.MAT_DEMO_MODE === '1' || !production;
const ephemeral = process.env.MAT_EPHEMERAL === '1' || !!process.env.NODE_TEST_CONTEXT || process.env.NODE_ENV === 'test';
const postgresMode = process.env.MAT_DB_MODE === 'postgres' && !ephemeral;
// Fail-fast: di luar mode uji, runtime WAJIB PostgreSQL. Adapter in-memory tidak
// boleh menyala diam-diam hanya karena env lupa diset (mis. di VPS baru).
if (!ephemeral && !postgresMode && process.env.MAT_ALLOW_MEMORY_RUNTIME !== '1') {
  throw new Error('RUNTIME_MODE_BLOCKED: set MAT_DB_MODE=postgres (runtime produksi) atau MAT_ALLOW_MEMORY_RUNTIME=1 untuk demo in-memory secara eksplisit.');
}
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
  'Content-Security-Policy': "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; img-src 'self' data:; connect-src 'self'",
  ...(production?{'Strict-Transport-Security':'max-age=31536000; includeSubDomains'}:{})
};

const PUBLIC_EXACT = new Set(['/index.html', '/favicon.svg']);
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
    'Cache-Control': /[\\/]assets[\\/]build[\\/]/.test(file)
      ? 'public, max-age=31536000, immutable'
      : 'no-cache',
    'Vary': 'Accept-Encoding',
    ...SECURITY_HEADERS
  };
  const accepted = req.headers['accept-encoding'] || '';
  if (/\bbr\b/.test(accepted) && fs.existsSync(`${file}.br`)) {
    headers['Content-Encoding'] = 'br';
    res.writeHead(200, headers);
    return fs.createReadStream(`${file}.br`).pipe(res);
  }
  if (/\bgzip\b/.test(accepted) && fs.existsSync(`${file}.gz`)) {
    headers['Content-Encoding'] = 'gzip';
    res.writeHead(200, headers);
    return fs.createReadStream(`${file}.gz`).pipe(res);
  }
  const raw = fs.readFileSync(file);
  if (raw.length > 1024 && /\bgzip\b/.test(accepted) && ['.html', '.css', '.js', '.svg', '.json'].includes(ext)) {
    headers['Content-Encoding'] = 'gzip';
    res.writeHead(200, headers);
    return res.end(zlib.gzipSync(raw));
  }
  res.writeHead(200, headers);
  res.end(raw);
});

// HTTP hardening (§5.1 dokumen terpadu): batasi umur request/header/socket
// agar koneksi macet atau slowloris tidak menggantung event loop.
server.requestTimeout = Number(process.env.MAT_HTTP_REQUEST_TIMEOUT_MS) || 30_000;
server.headersTimeout = Number(process.env.MAT_HTTP_HEADERS_TIMEOUT_MS) || 15_000;
server.keepAliveTimeout = Number(process.env.MAT_HTTP_KEEPALIVE_TIMEOUT_MS) || 7_000;
server.maxRequestsPerSocket = Number(process.env.MAT_HTTP_MAX_REQUESTS_PER_SOCKET) || 1_000;

async function boot() {
  let worker = null;
  if (postgresMode) {
    if (production && (!process.env.MAT_MFA_ENCRYPTION_KEY || process.env.MAT_MFA_ENCRYPTION_KEY.startsWith('CHANGE_ME'))) throw new Error('PRODUCTION_BOOT_BLOCKED: MAT_MFA_ENCRYPTION_KEY wajib berupa secret kuat.');
    // Gate aktivasi produksi (§34 master update): R026 hanya setelah checklist
    // ditandatangani; nilai 1 di-set manual saat go-live, bukan default.
    if (production && process.env.MAT_PRODUCTION_ACTIVATION_ALLOWED !== '1') {
      throw new Error('PRODUCTION_BOOT_BLOCKED: MAT_PRODUCTION_ACTIVATION_ALLOWED belum 1 — production gate R026 belum ditandatangani.');
    }
    const { getPool, close } = require('./backend/infrastructure/database/pool');
    const outbox = require('./backend/infrastructure/database/outbox-dispatcher');
    // Gate dinamis: bandingkan dengan file migrasi terbaru di repo, bukan nama hardcode.
    const expected = require('./backend/infrastructure/database/migrations').migrationFiles().at(-1);
    const latest = (await getPool().query('SELECT filename FROM schema_migrations ORDER BY filename DESC LIMIT 1')).rows[0]?.filename;
    if (latest !== expected) throw new Error(`DATABASE_MIGRATION_REQUIRED: applied=${latest || 'none'} expected=${expected}`);
    worker = require('./backend/workers/postgres-worker').start();
    outbox.start();
    const shutdown = () => { worker.stop(); outbox.stop(); server.close(() => close().finally(() => process.exit(0))); };
    process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
  }
  const port=Number(process.env.PORT)||4173,host=process.env.MAT_BIND_HOST||'127.0.0.1';
  server.listen(port, host, () =>
    console.log(JSON.stringify({ level:'info', service:'mat-erp-v2', message:`MAT ERP V2 · http://127.0.0.1:${port}`, at:new Date().toISOString() })));
}
if (require.main === module) boot().catch((error) => {
  console.error(JSON.stringify({ level:'fatal', service:'mat-erp-v2', error:error.message, at:new Date().toISOString() }));
  process.exitCode = 1;
});
module.exports = server;
