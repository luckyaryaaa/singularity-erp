'use strict';
// Boot LAN-UAT (Sprint 18 / SOP-18): memaksa MAT_ENVIRONMENT=LAN-UAT,
// memvalidasi environment, menampilkan alamat akses LAN untuk staf, lalu
// menyalakan server pada 0.0.0.0. Jalankan: npm run uat:lan
process.env.MAT_ENVIRONMENT = 'LAN-UAT';
process.env.MAT_BIND_HOST = process.env.MAT_BIND_HOST || '0.0.0.0';   // listen LAN
require('../backend/core/env').loadEnv();
process.env.MAT_ENVIRONMENT = 'LAN-UAT'; // menang atas .env
process.env.MAT_BIND_HOST = process.env.MAT_BIND_HOST || '0.0.0.0';
const { validateEnvironment } = require('../backend/core/env');
const os = require('node:os');

const check = validateEnvironment(process.env);
if (!check.valid) { console.error('ENVIRONMENT BLOCKED:', check.errors.join(' ')); process.exit(1); }

const port = Number(process.env.PORT) || 4173;
const ips = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
console.log('════════════════════════════════════════════════════');
console.log(' MAT ERP V2 — LAN-UAT (Sprint 18 / SOP-18)');
console.log('════════════════════════════════════════════════════');
console.log(` Environment : ${check.name}`);
console.log(` Akses staf  : ${ips.length ? ips.map((ip) => `http://${ip}:${port}`).join('  |  ') : `http://<IP-LAN>:${port}`}`);
console.log(' Checklist   : 1) npm run db:seed:uat (sekali)  2) firewall Windows izinkan port');
console.log('               3) staf login akun UAT per divisi  4) isi form sign-off SOP-18');
console.log(' Catatan     : seed development DILARANG di LAN-UAT (guard aktif).');
console.log('════════════════════════════════════════════════════');
// server.js memakai guard require.main — jalankan sebagai child process agar
// boot() terpicu; env LAN-UAT diwariskan, log server tampil di terminal ini.
const { spawn } = require('node:child_process');
const path = require('node:path');
const child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], { stdio: 'inherit', env: process.env });
child.on('exit', (code) => process.exit(code ?? 0));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
