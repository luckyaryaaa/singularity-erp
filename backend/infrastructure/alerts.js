'use strict';
// Alert keluar untuk kejadian operasional kritis (backup gagal, restore drill
// gagal, job gagal beruntun, maintenance partisi gagal, disk kritis).
// Transport: webhook JSON generik (kompatibel n8n/Slack/Discord/Telegram bot
// gateway). Tanpa MAT_ALERT_WEBHOOK_URL modul menjadi no-op yang aman.

const MIN_INTERVAL_MS = 5 * 60 * 1000; // anti-spam per kunci alert
const lastSentAt = new Map();
let sentCount = 0; let failedCount = 0; let suppressedCount = 0;

async function send(title, detail = '', { key, severity = 'critical' } = {}) {
  const url = process.env.MAT_ALERT_WEBHOOK_URL;
  if (!url) return { delivered: false, reason: 'webhook tidak dikonfigurasi' };
  const dedupeKey = key || title;
  const last = lastSentAt.get(dedupeKey) || 0;
  if (Date.now() - last < MIN_INTERVAL_MS) { suppressedCount += 1; return { delivered: false, reason: 'ditahan anti-spam' }; }
  lastSentAt.set(dedupeKey, Date.now());

  const payload = {
    service: 'mat-erp-v2',
    severity,
    title: String(title).slice(0, 200),
    detail: String(detail).slice(0, 1000),
    host: process.env.COMPUTERNAME || process.env.HOSTNAME || 'unknown',
    at: new Date().toISOString(),
    // Kompatibilitas: banyak penerima webhook membaca field "text".
    text: `🚨 [MAT ERP] ${title}${detail ? ` — ${detail}` : ''}`
  };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`webhook HTTP ${res.status}`);
    sentCount += 1;
    return { delivered: true };
  } catch (error) {
    failedCount += 1;
    console.error(JSON.stringify({ level: 'error', service: 'alerts', message: `Gagal mengirim alert: ${error.message}`, title, at: new Date().toISOString() }));
    return { delivered: false, reason: error.message };
  }
}

function stats() {
  return { configured: !!process.env.MAT_ALERT_WEBHOOK_URL, sent: sentCount, failed: failedCount, suppressed: suppressedCount };
}

module.exports = { send, stats };
