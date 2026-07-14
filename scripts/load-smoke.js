'use strict';
// Uji beban ringan terhadap runtime PostgreSQL sungguhan.
//   node scripts/load-smoke.js [totalRequest=300] [konkurensi=12]
// Skenario per iterasi: dashboard, daftar dokumen berpaginasi, approvals —
// endpoint terberat yang dipakai pengguna setiap hari.
// Target (LAN/localhost): p95 list API < 500 ms, tanpa error non-429.

require('../backend/core/env').loadEnv();
const { spawn } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const TOTAL = Number(process.argv[2]) || 300;
const CONCURRENCY = Number(process.argv[3]) || 12;
const TARGET_P95_MS = 500;

const USERNAME = process.env.MAT_LOAD_USERNAME || process.env.MAT_BOOTSTRAP_OWNER_USERNAME;
const PASSWORD = process.env.MAT_LOAD_PASSWORD || process.env.MAT_BOOTSTRAP_OWNER_PASSWORD;

async function main() {
  if (!USERNAME || !PASSWORD) throw new Error('Set MAT_LOAD_USERNAME/MAT_LOAD_PASSWORD atau bootstrap owner di .env.');
  const port = 41000 + Math.floor(Math.random() * 9000);
  const child = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    // Batas baca dinaikkan hanya pada proses uji ini — satu sesi mensimulasikan
    // gabungan trafik banyak pengguna; baseline produksi tidak berubah.
    env: { ...process.env, PORT: String(port), MAT_BACKUP_SCHEDULE_ENABLED: '0', MAT_RATE_READ_PER_MIN: '100000' },
    stdio: ['ignore', 'ignore', 'pipe']
  });
  let bootError = '';
  child.stderr.on('data', (d) => { bootError += d; });
  const base = `http://127.0.0.1:${port}`;

  try {
    // Tunggu sehat.
    let up = false;
    for (let i = 0; i < 30 && !up; i++) {
      await new Promise((r) => setTimeout(r, 500));
      up = await fetch(`${base}/api/health`).then((r) => r.ok).catch(() => false);
    }
    if (!up) throw new Error(`Server tidak sehat. ${bootError.split('\n').slice(-2).join(' ')}`);

    // Login sekali; sesi dipakai bersama (beban baca — rate limit read 120/mnt/user
    // sengaja dinaikkan lewat banyak virtual user bila tersedia akun UAT).
    const login = await fetch(`${base}/api/auth/login`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: USERNAME, password: PASSWORD })
    });
    const loginBody = await login.json();
    if (login.status !== 200 || !loginBody.csrfToken) throw new Error(`Login beban gagal (${login.status}): ${loginBody.message || ''}`);
    const cookie = login.headers.get('set-cookie').split(';')[0];

    const scenarios = [
      '/api/dashboard',
      '/api/documents?type=INVOICE&page=1&limit=25&sort=updatedAt:desc',
      '/api/documents?type=WORK_ORDER&page=1&limit=25',
      '/api/approvals?page=1&limit=25',
      '/api/inventory?page=1&limit=25'
    ];
    const latencies = [];
    const failures = new Map();
    let done = 0; let rateLimited = 0;

    async function worker() {
      while (done < TOTAL) {
        const index = done++;
        const url = scenarios[index % scenarios.length];
        const started = Date.now();
        try {
          const res = await fetch(base + url, { headers: { cookie } });
          const ms = Date.now() - started;
          if (res.status === 200) latencies.push(ms);
          else if (res.status === 429) { rateLimited++; await new Promise((r) => setTimeout(r, 700)); }
          else failures.set(`${res.status} ${url}`, (failures.get(`${res.status} ${url}`) || 0) + 1);
          await res.arrayBuffer();
        } catch (error) {
          failures.set(error.message, (failures.get(error.message) || 0) + 1);
        }
      }
    }
    const startedAt = Date.now();
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    const wallMs = Date.now() - startedAt;

    latencies.sort((a, b) => a - b);
    const pct = (p) => latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * p))] : 0;
    const report = {
      totalRequests: TOTAL, concurrency: CONCURRENCY, wallSeconds: Math.round(wallMs / 100) / 10,
      throughputRps: Math.round(TOTAL / (wallMs / 1000) * 10) / 10,
      okCount: latencies.length, rateLimited429: rateLimited,
      failures: Object.fromEntries(failures),
      latencyMs: { p50: pct(0.5), p95: pct(0.95), p99: pct(0.99), max: latencies.at(-1) || 0 },
      targetP95Ms: TARGET_P95_MS,
      passed: failures.size === 0 && pct(0.95) < TARGET_P95_MS && latencies.length > 0
    };
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.passed ? 0 : 1;
  } finally {
    child.stderr.destroy();
    child.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 400));
    if (child.exitCode === null) child.kill('SIGKILL');
    process.exit(process.exitCode || 0);
  }
}

main().catch((error) => { console.error('Load smoke gagal:', error.message); process.exit(1); });
