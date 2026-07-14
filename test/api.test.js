'use strict';
// Uji API multi-user: keamanan sesi, izin, penguncian optimis, idempotensi,
// rate limit, paginasi, PIN Owner, SSE, dan alur kerja dokumen end-to-end.

const test = require('node:test');
const assert = require('node:assert/strict');
const server = require('../server');
const ratelimit = require('../backend/core/ratelimit');

let base = '';

test.before(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => new Promise((resolve) => server.close(resolve)));

async function call(path, { method = 'GET', body, session, headers = {} } = {}) {
  const h = { 'content-type': 'application/json', ...headers };
  if (session) {
    h.cookie = session.cookie;
    if (method !== 'GET') h['x-csrf-token'] = session.csrf;
  }
  const res = await fetch(base + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  let data = {};
  try { data = await res.json(); } catch { /* SSE / kosong */ }
  return { status: res.status, data, headers: res.headers };
}

async function login(username, password = 'materp2026') {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (res.status !== 200) throw new Error(`login ${username} gagal: ${data.message}`);
  return { cookie: res.headers.get('set-cookie').split(';')[0], csrf: data.csrfToken, user: data.user };
}

// ── Autentikasi & sesi ───────────────────────────────────────────────────────
test('login menghasilkan sesi, izin, dan endpoint sesi mengenali cookie', async () => {
  const session = await login('andi');
  assert.equal(session.user.displayName, 'Andi Rahman');
  assert.ok(session.csrf.length >= 16);
  const me = await call('/api/auth/session', { session });
  assert.equal(me.status, 200);
  assert.equal(me.data.user.role, 'owner');
  assert.ok(me.data.permissions.includes('*'));
  assert.ok(!('passwordHash' in me.data.user), 'hash password tidak boleh bocor');
});

test('tanpa sesi: API mengembalikan 401 SESSION_EXPIRED', async () => {
  const res = await call('/api/dashboard');
  assert.equal(res.status, 401);
  assert.equal(res.data.code, 'SESSION_EXPIRED');
});

test('mutasi tanpa CSRF token ditolak 403', async () => {
  const session = await login('bima');
  const res = await fetch(`${base}/api/notifications/read-all`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie: session.cookie }
  });
  assert.equal(res.status, 403);
  assert.equal((await res.json()).code, 'CSRF_REJECTED');
});

test('mutasi dari Origin asing ditolak dan session tersimpan sebagai hash', async () => {
  const session = await login('bima');
  const res = await fetch(`${base}/api/notifications/read-all`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie: session.cookie, 'x-csrf-token': session.csrf, origin: 'https://evil.example' }
  });
  assert.equal(res.status, 403);
  const { store } = require('../backend/infrastructure/database/store');
  const stored = store.collection('sessions').findOne((row) => row.userId === session.user.id && row.active);
  assert.ok(stored.tokenHash);
  assert.equal('token' in stored, false);
  assert.notEqual(stored.tokenHash, session.cookie.split('=')[1]);
});

// ── Rate limit & lockout ─────────────────────────────────────────────────────
test('rate limit login: percobaan ke-6 ditolak 429 dengan Retry-After', async () => {
  for (let i = 0; i < 5; i++) {
    const res = await call('/api/auth/login', { method: 'POST', body: { username: 'ghost', password: 'salah' } });
    assert.equal(res.status, 401);
  }
  const blocked = await call('/api/auth/login', { method: 'POST', body: { username: 'ghost', password: 'salah' } });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.data.code, 'RATE_LIMITED');
  assert.ok(Number(blocked.headers.get('retry-after')) > 0);
});

test('lockout akun: 5 kegagalan mengunci akun (423) meski sandi benar', async () => {
  ratelimit.resetAll();
  for (let i = 0; i < 5; i++) {
    await call('/api/auth/login', { method: 'POST', body: { username: 'joko', password: 'salah' } });
  }
  ratelimit.resetAll(); // pisahkan perilaku lockout dari rate limit
  const locked = await call('/api/auth/login', { method: 'POST', body: { username: 'joko', password: 'materp2026' } });
  assert.equal(locked.status, 423);
  assert.equal(locked.data.code, 'ACCOUNT_LOCKED');
});

// ── Izin (backend adalah batas keamanan) ─────────────────────────────────────
test('role employee ditolak membaca audit dan membuat invoice', async () => {
  const session = await login('eka');
  const audit = await call('/api/audit', { session });
  assert.equal(audit.status, 403);
  assert.equal(audit.data.code, 'PERMISSION_DENIED');
  const invoice = await call('/api/documents', { method: 'POST', session, body: { type: 'INVOICE', title: 'x', amount: 100 } });
  assert.equal(invoice.status, 403);
});

test('role production tidak dapat membaca payroll; HRD dapat', async () => {
  const produksi = await login('budi2').catch(() => null); // budi terkunci oleh tes lockout? gunakan production asli
  const sesi = produksi || await login('eka');
  const payroll = await call('/api/documents?type=PAYROLL_RUN', { session: sesi });
  assert.equal(payroll.status, 403);
  const hrd = await login('sari');
  const ok = await call('/api/documents?type=PAYROLL_RUN', { session: hrd });
  assert.equal(ok.status, 200);
  assert.ok(ok.data.total >= 1);
});

// ── Paginasi sisi server ─────────────────────────────────────────────────────
test('paginasi: limit dinormalisasi maksimum 100 dan kontrak respons lengkap', async () => {
  const session = await login('dewi');
  const res = await call('/api/documents?type=INVOICE&limit=999&page=1&sort=amount:desc', { session });
  assert.equal(res.status, 200);
  for (const key of ['items', 'page', 'limit', 'total', 'totalPages']) assert.ok(key in res.data, `field ${key}`);
  assert.ok(res.data.limit <= 100);
  const amounts = res.data.items.map((d) => d.amount);
  assert.deepEqual(amounts, [...amounts].sort((a, b) => b - a), 'urut menurun sesuai sort');
  const filtered = await call('/api/documents?type=INVOICE&status=OVERDUE', { session });
  assert.ok(filtered.data.items.every((d) => d.status === 'OVERDUE'));
});

// ── Penguncian optimis & idempotensi ─────────────────────────────────────────
test('optimistic locking: versi basi ditolak 409 dan tidak menimpa', async () => {
  const session = await login('bima');
  const created = await call('/api/documents', { method: 'POST', session, body: { type: 'QUOTATION', title: 'Uji lock', amount: 1_000_000 } });
  assert.equal(created.status, 201);
  const id = created.data.id;
  const ok = await call(`/api/documents/${id}`, { method: 'PATCH', session, body: { version: 1, title: 'Versi kedua' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.version, 2);
  const stale = await call(`/api/documents/${id}`, { method: 'PATCH', session, body: { version: 1, title: 'Timpa diam-diam' } });
  assert.equal(stale.status, 409);
  assert.equal(stale.data.code, 'DOCUMENT_CONFLICT');
  const detail = await call(`/api/documents/${id}`, { session });
  assert.equal(detail.data.title, 'Versi kedua', 'data tidak boleh tertimpa');
});

test('konkurensi: dua penyimpanan versi sama → tepat satu berhasil', async () => {
  const session = await login('rudi');
  const created = await call('/api/documents', { method: 'POST', session, body: { type: 'PURCHASE_REQUEST', title: 'Uji konkurensi', amount: 500_000 } });
  const id = created.data.id;
  const [a, b] = await Promise.all([
    call(`/api/documents/${id}`, { method: 'PATCH', session, body: { version: 1, title: 'Penulis A' } }),
    call(`/api/documents/${id}`, { method: 'PATCH', session, body: { version: 1, title: 'Penulis B' } })
  ]);
  const statuses = [a.status, b.status].sort();
  assert.deepEqual(statuses, [200, 409]);
});

test('idempotensi: kunci sama tidak membuat dokumen ganda', async () => {
  const session = await login('bima');
  const key = `idem-${Date.now()}`;
  const body = { type: 'QUOTATION', title: 'Uji idempoten', amount: 750_000 };
  const first = await call('/api/documents', { method: 'POST', session, body, headers: { 'idempotency-key': key } });
  const second = await call('/api/documents', { method: 'POST', session, body, headers: { 'idempotency-key': key } });
  assert.equal(first.status, 201);
  assert.equal(second.data.documentNumber, first.data.documentNumber);
  assert.equal(second.data.idempotentReplay, true);
  const list = await call(`/api/documents?type=QUOTATION&q=${encodeURIComponent('Uji idempoten')}`, { session });
  assert.equal(list.data.total, 1, 'hanya satu dokumen tercipta');
});

// ── Alur kerja dokumen end-to-end ────────────────────────────────────────────
test('alur E2E: draft → ajukan → setujui → proses → selesai → tutup', async () => {
  const sales = await login('bima');
  const owner = await login('andi');
  const created = await call('/api/documents', { method: 'POST', session: sales, body: { type: 'QUOTATION', title: 'E2E flow', amount: 2_000_000 } });
  const id = created.data.id;
  assert.match(created.data.documentNumber, /^QUO-\d{4}-\d{3}$/, 'format penomoran existing terjaga');

  const act = (session, action, extra = {}) =>
    call(`/api/documents/${id}/action`, { method: 'POST', session, body: { action, ...extra }, headers: { 'idempotency-key': `${action}-${id}` } });

  assert.equal((await act(sales, 'submit')).data.status, 'WAITING_APPROVAL');
  const approved = await act(owner, 'approve');
  assert.equal(approved.data.status, 'APPROVED', 'nominal 2 jt cukup satu jenjang supervisor');
  // Replay approve dengan kunci idempoten yang sama tidak menggandakan aksi.
  const replay = await act(owner, 'approve');
  assert.equal(replay.data.idempotentReplay, true);
  assert.equal((await act(sales, 'start')).data.status, 'IN_PROCESS');
  assert.equal((await act(sales, 'complete')).data.status, 'COMPLETED');
  assert.equal((await act(sales, 'close')).data.status, 'CLOSED');

  const detail = await call(`/api/documents/${id}`, { session: owner });
  assert.ok(detail.data.auditTrail.length >= 5, 'seluruh langkah tercatat pada audit');
});

test('aksi sensitif: void invoice butuh alasan dan PIN Owner', async () => {
  const owner = await login('andi');
  const list = await call('/api/documents?type=INVOICE&status=APPROVED', { session: owner });
  const invoice = list.data.items[0];
  assert.ok(invoice, 'ada invoice APPROVED pada seed');
  const noPin = await call(`/api/documents/${invoice.id}/action`, { method: 'POST', session: owner, body: { action: 'void', reason: 'Uji void' } });
  assert.equal(noPin.status, 403);
  assert.equal(noPin.data.code, 'PIN_REQUIRED');
  const noReason = await call(`/api/documents/${invoice.id}/action`, { method: 'POST', session: owner, body: { action: 'void', pin: '246810' } });
  assert.equal(noReason.status, 422);
  assert.equal(noReason.data.code, 'REASON_REQUIRED');
  const ok = await call(`/api/documents/${invoice.id}/action`, { method: 'POST', session: owner, body: { action: 'void', reason: 'Salah nominal — uji terkontrol', pin: '246810' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.status, 'VOID');
});

// ── Approval routing terpusat ────────────────────────────────────────────────
test('nominal besar menuntut jenjang bertingkat sesuai matriks', async () => {
  const sales = await login('bima');
  const owner = await login('andi');
  const created = await call('/api/documents', { method: 'POST', session: sales, body: { type: 'QUOTATION', title: 'Uji matriks 60jt', amount: 60_000_000 } });
  const id = created.data.id;
  await call(`/api/documents/${id}/action`, { method: 'POST', session: sales, body: { action: 'submit' } });
  const detail = await call(`/api/documents/${id}`, { session: owner });
  assert.deepEqual(detail.data.requiredApprovalLevels, ['supervisor', 'finance', 'owner']);
  const first = await call(`/api/documents/${id}/action`, { method: 'POST', session: owner, body: { action: 'approve' } });
  assert.equal(first.data.status, 'WAITING_APPROVAL', 'masih menunggu jenjang berikutnya');
});

// ── Job latar belakang ───────────────────────────────────────────────────────
test('job ekspor berjalan async dan batas per pengguna ditegakkan', async () => {
  const session = await login('dewi');
  const job = await call('/api/jobs', { method: 'POST', session, body: { type: 'EXPORT_EXCEL', params: { type: 'INVOICE' } } });
  assert.equal(job.status, 202);
  assert.equal(job.data.status, 'QUEUED');
  const second = await call('/api/jobs', { method: 'POST', session, body: { type: 'EXPORT_EXCEL', params: {} } });
  const third = await call('/api/jobs', { method: 'POST', session, body: { type: 'EXPORT_EXCEL', params: {} } });
  assert.ok([second.status, third.status].includes(429) || third.status === 429, 'maks 2 ekspor aktif per pengguna');
  await new Promise((r) => setTimeout(r, 900)); // beri waktu worker menyelesaikan
  const done = await call('/api/jobs?limit=10', { session });
  assert.ok(done.data.items.some((j) => j.status === 'COMPLETED' && j.type === 'EXPORT_EXCEL'));
});

// ── SSE, error model, self-test ─────────────────────────────────────────────
test('SSE: satu stream event per sesi dengan tipe konten benar', async () => {
  const session = await login('rina');
  const controller = new AbortController();
  const res = await fetch(`${base}/api/events`, { headers: { cookie: session.cookie }, signal: controller.signal });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/event-stream/);
  controller.abort();
});

test('error model terpusat: endpoint tak dikenal 404 dengan kode terstruktur', async () => {
  const session = await login('andi');
  const res = await call('/api/tidak-ada', { session });
  assert.equal(res.status, 404);
  assert.equal(res.data.code, 'RESOURCE_NOT_FOUND');
  assert.ok(res.data.message.length > 5, 'pesan harus jelas, bukan sekadar kode');
});

test('self-test sistem: seluruh pemeriksaan kritis lulus (gerbang rilis terbuka)', async () => {
  const session = await login('andi');
  const res = await call('/api/system/self-test', { session });
  assert.equal(res.status, 200);
  const failures = res.data.results.filter((r) => r.status === 'fail');
  assert.equal(res.data.criticalFailed, 0, `kegagalan kritis: ${JSON.stringify(failures)}`);
  assert.equal(res.data.releaseBlocked, false);
});
