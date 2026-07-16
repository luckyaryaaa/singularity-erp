'use strict';
const path = require('node:path');
const { spawn } = require('node:child_process');

async function verify() {
  const cwd = path.resolve(__dirname, '..', 'release', 'MAT-ERP-V2-RELEASE');
  const port = 4199;
  const child = spawn(process.execPath, ['server.js'], {
    cwd,
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', MAT_EPHEMERAL: '1', MAT_DB_MODE: 'memory' },
    windowsHide: true,
    stdio: 'ignore'
  });
  try {
    for (let i = 0; i < 50; i += 1) {
      try { if ((await fetch(`http://127.0.0.1:${port}/index.html`)).ok) break; } catch { /* boot */ }
      if (i === 49) throw new Error('Server paket release tidak siap.');
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const html = await fetch(`http://127.0.0.1:${port}/index.html`).then((response) => response.text());
    const asset = html.match(/assets\/build\/[^"']+\.js/)?.[0];
    if (!asset) throw new Error('Referensi JavaScript fingerprint tidak ditemukan.');
    const response = await fetch(`http://127.0.0.1:${port}/${asset}`, { headers: { 'accept-encoding': 'br' } });
    const result = { status: response.status, asset, cache: response.headers.get('cache-control'), encoding: response.headers.get('content-encoding'), vary: response.headers.get('vary') };
    if (result.status !== 200 || result.encoding !== 'br' || !result.cache?.includes('immutable') || result.vary !== 'Accept-Encoding') throw new Error(`Header asset release tidak valid: ${JSON.stringify(result)}`);
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  } finally { child.kill(); }
}

verify().catch((error) => { console.error(error.message); process.exitCode = 1; });
