'use strict';
// Sprint 15 (R022) — klien SMTP tanpa dependensi (node:net + node:tls).
// Mendukung implicit TLS (port 465, MAT_SMTP_SECURE=1) dan STARTTLS (587).
// Tanpa MAT_SMTP_HOST modul menjadi no-op aman — pengiriman dicatat SKIPPED,
// perilaku development lama tetap. Aktif hanya bila kredensial diisi.
const net = require('node:net');
const tls = require('node:tls');

function config() {
  const host = process.env.MAT_SMTP_HOST;
  if (!host) return null;
  return {
    host,
    port: Number(process.env.MAT_SMTP_PORT) || 587,
    secure: process.env.MAT_SMTP_SECURE === '1',
    user: process.env.MAT_SMTP_USER || '',
    pass: process.env.MAT_SMTP_PASS || '',
    from: process.env.MAT_SMTP_FROM || process.env.MAT_SMTP_USER || 'no-reply@localhost',
    tlsRejectUnauthorized: process.env.MAT_SMTP_INSECURE !== '1'
  };
}

function isConfigured() { return !!config(); }

// Dialog SMTP minimal berbasis promise, ditulis sebagai urutan async murni.
// `sock` dibungkus objek yang bisa di-upgrade ke TLS (STARTTLS) sambil tetap
// memakai satu antrean pembaca balasan. Deviasi kode = error → FAILED.
function talk(initialSocket, cfg) {
  let sock = initialSocket;
  let buffer = '';
  const waiters = [];                                         // {expect,resolve,reject}
  let closedErr = null;

  function attach(s) {
    s.setEncoding('utf8');
    s.on('data', onData);
    s.on('error', (e) => onClose(e));
    s.on('close', () => onClose(new Error('SMTP koneksi ditutup')));
  }
  function onData(chunk) {
    buffer += chunk;
    let m;
    // Proses setiap balasan lengkap (baris terakhir berformat "NNN ").
    while ((m = buffer.match(/^([\s\S]*?)(\d{3}) [^\r\n]*\r?\n/))) {
      const codeNum = Number(m[2]);
      buffer = buffer.slice(m[0].length);
      const w = waiters.shift();
      if (!w) continue;
      const ok = Array.isArray(w.expect) ? w.expect.includes(codeNum) : codeNum === w.expect;
      ok ? w.resolve(codeNum) : w.reject(new Error(`SMTP ${codeNum}`));
    }
  }
  function onClose(err) { closedErr = closedErr || err; while (waiters.length) waiters.shift().reject(err); }

  function await_(expect) {
    return new Promise((resolve, reject) => { if (closedErr) return reject(closedErr); waiters.push({ expect, resolve, reject }); });
  }
  function cmd(line, expect) { const p = await_(expect); sock.write(line + '\r\n'); return p; }
  function upgradeTls() {
    return new Promise((resolve, reject) => {
      const secured = tls.connect({ socket: sock, servername: cfg.host, rejectUnauthorized: cfg.tlsRejectUnauthorized }, () => { sock = secured; attach(secured); resolve(); });
      secured.once('error', reject);
    });
  }

  const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
  return (async () => {
    const timer = setTimeout(() => onClose(new Error('SMTP timeout')), 15000); timer.unref?.();
    try {
      attach(sock);
      await await_(220);                                      // salam server
      await cmd('EHLO mat-erp', 250);
      if (!cfg.secure) { await cmd('STARTTLS', 220); await upgradeTls(); await cmd('EHLO mat-erp', 250); }
      if (cfg.user) { await cmd('AUTH LOGIN', 334); await cmd(b64(cfg.user), 334); await cmd(b64(cfg.pass), 235); }
      await cmd(`MAIL FROM:<${cfg.from}>`, 250);
      await cmd(`RCPT TO:<${cfg.__to}>`, [250, 251]);
      await cmd('DATA', 354);
      await cmd(cfg.__message + '\r\n.', 250);
      await cmd('QUIT', 221).catch(() => {});                 // balasan QUIT opsional
    } finally { clearTimeout(timer); sock.destroy(); }
  })();
}

function buildMessage(cfg, { to, subject, text }) {
  const date = new Date().toUTCString();
  const lines = [
    `From: ${cfg.from}`,
    `To: ${to}`,
    `Subject: ${String(subject || '').replace(/[\r\n]/g, ' ').slice(0, 200)}`,
    `Date: ${date}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    String(text || '').replace(/\r?\n\.\r?\n/g, '\n..\n')     // dot-stuffing minimal
  ];
  return lines.join('\r\n');
}

// Kirim satu email. Mengembalikan {status:'SENT'|'SKIPPED'|'FAILED', error?}.
async function send({ to, subject, text }) {
  const cfg = config();
  if (!cfg) return { status: 'SKIPPED', error: 'SMTP belum dikonfigurasi (MAT_SMTP_HOST kosong).' };
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(to))) return { status: 'FAILED', error: 'Alamat email tujuan tidak valid.' };
  cfg.__to = to; cfg.__message = buildMessage(cfg, { to, subject, text });
  try {
    const socket = cfg.secure
      ? tls.connect({ host: cfg.host, port: cfg.port, servername: cfg.host, rejectUnauthorized: cfg.tlsRejectUnauthorized })
      : net.connect({ host: cfg.host, port: cfg.port });
    await new Promise((res, rej) => { socket.once('connect', res); socket.once('secureConnect', res); socket.once('error', rej); });
    await talk(socket, cfg);
    return { status: 'SENT' };
  } catch (error) {
    return { status: 'FAILED', error: String(error.message).slice(0, 240) };
  }
}

module.exports = { isConfigured, send, config };
