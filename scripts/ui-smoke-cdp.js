'use strict';
require('../backend/core/env').loadEnv();
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { DEMO_PASSWORD } = require('../backend/modules/seed');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.MAT_UI_SMOKE_DEBUG_PORT) || 9333;
const base = process.env.MAT_UI_SMOKE_URL || 'http://127.0.0.1:4174';
const edge = process.env.MAT_EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const output = path.join(root, 'storage', 'smoke');
const profile = path.join(os.tmpdir(), `mat-erp-visual-edge-${process.pid}`);
const baselineFile = path.join(root, 'test', 'visual-baseline.json');

async function target() {
  for (let i = 0; i < 50; i += 1) {
    try {
      const list = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
      const page = list.find((item) => item.type === 'page');
      if (page) return page;
    } catch { /* browser belum siap */ }
    await delay(100);
  }
  throw new Error('Edge DevTools tidak siap.');
}

async function run() {
  const baseline = JSON.parse(await fs.readFile(baselineFile, 'utf8'));
  await fs.mkdir(output, { recursive: true });
  const appPort = new URL(base).port || '4174';
  const server = spawn(process.execPath, ['server.js'], { cwd: root, env: { ...process.env, PORT: appPort, NODE_ENV: 'test', MAT_EPHEMERAL: '1', MAT_DB_MODE: 'memory' }, windowsHide: true, stdio: 'ignore' });
  let child;
  let socket;
  try {
    for (let i = 0; i < 80; i += 1) {
      try { if ((await fetch(`${base}/api/runtime`)).ok) break; } catch { /* server belum siap */ }
      if (i === 79) throw new Error('Server visual regression tidak siap.');
      await delay(100);
    }
    child = spawn(edge, [
      `--remote-debugging-port=${port}`, '--headless=new', '--no-sandbox', '--no-first-run', '--disable-extensions',
      '--hide-scrollbars', '--force-color-profile=srgb', `--user-data-dir=${profile}`, base
    ], { windowsHide: true, stdio: 'ignore' });
    const page = await target();
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let seq = 0;
    const pending = new Map();
    const consoleErrors = [];
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && pending.has(data.id)) {
        const task = pending.get(data.id); pending.delete(data.id);
        if (data.error) task.reject(new Error(data.error.message)); else task.resolve(data.result);
      }
      if (data.method === 'Runtime.exceptionThrown') consoleErrors.push(data.params.exceptionDetails?.text || 'JavaScript exception');
      if (data.method === 'Log.entryAdded' && data.params.entry.level === 'error') consoleErrors.push(data.params.entry.text);
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++seq; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) => {
      const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
      return response.result?.value;
    };
    await Promise.all([send('Page.enable'), send('Runtime.enable'), send('Log.enable')]);
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await send('Page.navigate', { url: base });
    for (let i = 0; i < 60; i += 1) {
      const ready = await evaluate(`!!(window.MAT&&window.UI&&document.getElementById('loginLayer')&&!document.getElementById('loginLayer').hidden)`);
      if (ready) break;
      if (i === 59) throw new Error('App shell tidak selesai bootstrap.');
      await delay(100);
    }
    const credentials = JSON.stringify({ username: 'andi', password: DEMO_PASSWORD });
    await evaluate(`(()=>{const c=${credentials},f=document.getElementById('loginForm');f.username.value=c.username;f.password.value=c.password;f.requestSubmit();return true})()`);
    await delay(1500);
    const session = await evaluate(`({url:location.href,ready:document.readyState,appVisible:!document.getElementById('app')?.hidden,loginVisible:!document.getElementById('loginLayer')?.hidden,loginError:document.getElementById('loginError')?.textContent||'',challengeVisible:!document.getElementById('loginChallenge')?.hidden})`);
    if (!session.appVisible) throw new Error(`Login UI gagal: ${JSON.stringify(session)}`);

    const results = [];
    for (const viewport of baseline.viewports) {
      await send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.mobile });
      for (const pageCase of baseline.pages) {
        await evaluate(`location.hash=${JSON.stringify(pageCase.hash)}`);
        await delay(800);
        const metrics = await evaluate(`(()=>{
          const main=document.getElementById('main'),required=document.querySelector(${JSON.stringify(pageCase.selector)});
          const unlabeled=[...document.querySelectorAll('button')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&!el.textContent.trim()&&!el.getAttribute('aria-label')&&!el.getAttribute('title')}).length;
          return {hash:location.hash,title:main.querySelector('h1')?.textContent||'',required:!!required,error:main.querySelector('.error-state')?.textContent||'',bodyOverflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth),mainOverflow:Math.max(0,main.scrollWidth-main.clientWidth),unlabeledButtons:unlabeled,mainWidth:Math.round(main.getBoundingClientRect().width)};
        })()`);
        const file = `${viewport.name}-${pageCase.name}.png`;
        const capture = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        await fs.writeFile(path.join(output, file), Buffer.from(capture.data, 'base64'));
        const passed = metrics.required && !metrics.error && metrics.bodyOverflow <= baseline.maxHorizontalOverflow && metrics.unlabeledButtons === 0 && metrics.mainWidth >= baseline.minMainWidth[viewport.name];
        results.push({ viewport: viewport.name, page: pageCase.name, file, passed, ...metrics });
      }
    }
    const unexpected = consoleErrors.filter((message) => !message.includes('status of 401 (Unauthorized)'));
    const report = { ok: results.every((item) => item.passed) && unexpected.length === 0, baselineVersion: baseline.version, base, results, consoleErrors: unexpected };
    await fs.writeFile(path.join(output, 'visual-regression-report.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
    await send('Browser.close').catch(() => {});
    socket = null;
  } finally {
    if (socket) socket.close();
    if (child && child.exitCode === null) child.kill();
    if (server.exitCode === null) server.kill();
  }
}

run().catch((error) => { console.error(JSON.stringify({ ok: false, error: error.message })); process.exitCode = 1; });
