'use strict';
// Gerbang pre-deploy: satu perintah yang WAJIB hijau sebelum deploy/rilis.
//   npm run predeploy
// Urutan: (1) validasi migrasi + checksum, (2) suite tes penuh,
// (3) boot server runtime PostgreSQL sungguhan, (4) probe /api/health,
// (5) verifikasi backup terakhir + restore drill tercatat sukses.
// Keluar dengan kode != 0 bila satu saja gagal — cocok untuk hook CI/CD.

require('../backend/core/env').loadEnv();
const { spawnSync, spawn } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const results = [];
const step = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✔' : '✖'} ${name}${detail ? ` — ${detail}` : ''}`);
  return ok;
};

function runSync(name, commandLine) {
  // Satu string + shell: kompatibel npm.cmd Windows tanpa peringatan DEP0190.
  const res = spawnSync(commandLine, { cwd: ROOT, shell: true, encoding: 'utf8', timeout: 300_000 });
  const output = `${res.stdout || ''}${res.stderr || ''}`;
  return step(name, res.status === 0, res.status === 0 ? '' : output.split('\n').filter(Boolean).slice(-3).join(' | '));
}

async function probeHealth() {
  const port = 40000 + Math.floor(Math.random() * 10_000);
  // process.execPath tanpa shell: child = node asli, kill() efektif di Windows.
  const child = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), MAT_BACKUP_SCHEDULE_ENABLED: '0' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let bootLog = '';
  child.stdout.on('data', (d) => { bootLog += d; });
  child.stderr.on('data', (d) => { bootLog += d; });
  try {
    let healthy = false; let detail = '';
    for (let attempt = 0; attempt < 20 && !healthy; attempt++) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/health`);
        const body = await res.json();
        healthy = res.status === 200 && body.ok === true && body.db === 'up';
        detail = `HTTP ${res.status}, db=${body.db}`;
      } catch (error) { detail = error.message; }
    }
    if (!healthy && bootLog) detail += ` | boot: ${bootLog.split('\n').filter(Boolean).slice(-2).join(' ')}`;
    return step('Boot runtime PostgreSQL + /api/health', healthy, detail);
  } finally {
    child.stdout.destroy(); child.stderr.destroy(); // pipe tidak boleh menahan event loop
    child.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 400));
    if (child.exitCode === null) child.kill('SIGKILL');
  }
}

async function verifyBackupFreshness() {
  const { getPool, close } = require('../backend/infrastructure/database/pool');
  try {
    const row = (await getPool().query(
      `SELECT started_at, restore_tested FROM backup_runs WHERE status='COMPLETED' ORDER BY finished_at DESC LIMIT 1`
    )).rows[0];
    if (!row) return step('Backup terakhir + restore drill', false, 'Belum ada backup COMPLETED.');
    const ageHours = (Date.now() - new Date(row.started_at).getTime()) / 3_600_000;
    const drill = (await getPool().query(
      `SELECT count(*)::int n FROM backup_runs WHERE restore_tested = true`
    )).rows[0];
    const ok = ageHours <= 48 && drill.n > 0;
    return step('Backup terakhir + restore drill', ok, `umur backup ${ageHours.toFixed(1)} jam (maks 48), drill sukses tercatat: ${drill.n}`);
  } finally { await close(); }
}

(async () => {
  console.log('=== MAT ERP V2 — Gerbang pre-deploy ===');
  runSync('Validasi migrasi + checksum', 'npm run db:validate');
  runSync('Suite tes otomatis', 'npm test');
  await probeHealth();
  await verifyBackupFreshness();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${failed.length ? `❌ DEPLOY DIBLOKIR — ${failed.length} pemeriksaan gagal.` : '✅ SEMUA HIJAU — layak deploy.'}`);
  process.exit(failed.length ? 1 : 0); // eksplisit: jangan bergantung pada event loop kosong
})().catch((error) => { console.error('Gerbang pre-deploy error:', error.message); process.exit(1); });
