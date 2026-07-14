'use strict';
// Layanan event realtime: SSE satu arah, satu koneksi per sesi browser.
// Event dikirim kecil (tipe + id + versi), bukan dokumen lengkap.

const clients = new Map(); // sessionId → res
let published = 0;

function subscribe(sessionId, res) {
  const existing = clients.get(sessionId);
  if (existing) { try { existing.end(); } catch { /* koneksi lama sudah putus */ } }
  clients.set(sessionId, res);
  res.write('retry: 4000\n\n');
  res.write(`event: system.hello\ndata: ${JSON.stringify({ connectedAt: new Date().toISOString() })}\n\n`);
}

function unsubscribe(sessionId) { clients.delete(sessionId); }

function publish(type, payload = {}) {
  published += 1;
  const event = { type, ...payload, timestamp: new Date().toISOString() };
  const frame = `event: ${type}\ndata: ${JSON.stringify(event)}\n\n`;
  for (const [sessionId, res] of clients) {
    try { res.write(frame); }
    catch { clients.delete(sessionId); }
  }
  return event;
}

function stats() { return { activeConnections: clients.size, publishedEvents: published }; }

module.exports = { subscribe, unsubscribe, publish, stats };
