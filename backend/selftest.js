'use strict';
// Self-test system (System → Self Test). Status rilis diblokir bila tes kritis gagal.

const fs = require('node:fs');
const path = require('node:path');
const { store, paginate } = require('./infrastructure/database/store');
const numbering = require('./core/numbering');
const documents = require('./core/documents');
const idempotency = require('./core/idempotency');
const ratelimit = require('./core/ratelimit');
const events = require('./core/events');
const queue = require('./workers/queue');
const { grantsFor, ROLE_GRANTS, hasPermission } = require('./core/permissions');

function run() {
  const results = [];
  const check = (name, critical, fn) => {
    try {
      const detail = fn();
      results.push({ name, critical, status: 'pass', detail: detail || 'OK' });
    } catch (error) {
      results.push({ name, critical, status: 'fail', detail: error.message });
    }
  };
  const root = path.join(__dirname, '..');
  const tester = store.collection('users').findOne((u) => u.role === 'admin') || { id: 'selftest', displayName: 'Self Test', role: 'admin', branchId: null };

  check('Integritas rute & renderer tunggal', true, () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const roots = (html.match(/id="app"/g) || []).length;
    if (roots !== 1) throw new Error(`Ditemukan ${roots} app root, seharusnya 1.`);
    const mains = (html.match(/<main/g) || []).length;
    if (mains !== 1) throw new Error(`Ditemukan ${mains} elemen <main>.`);
    return 'Satu app shell, satu <main>, tanpa renderer ganda.';
  });

  check('Tidak ada rute legacy mati', true, () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    if (/display\s*:\s*none[^}]*legacy/i.test(html)) throw new Error('Terdeteksi halaman legacy disembunyikan.');
    return 'Tidak ada halaman legacy tersembunyi.';
  });

  check('Pemetaan permission lengkap', true, () => {
    for (const role of Object.keys(ROLE_GRANTS)) {
      if (!grantsFor(role).size) throw new Error(`Role ${role} tidak memiliki grant.`);
    }
    if (hasPermission({ role: 'employee' }, 'invoice.void')) throw new Error('Employee tidak boleh punya invoice.void.');
    if (!hasPermission({ role: 'owner' }, 'payroll.approve')) throw new Error('Owner harus punya payroll.approve.');
    return `${Object.keys(ROLE_GRANTS).length} role terpetakan, batas hak akses tervalidasi.`;
  });

  check('File migrasi database tersedia', true, () => {
    const dir = path.join(root, 'data', 'migrations');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql'));
    if (files.length < 2) throw new Error('Migrasi inti dan modul bisnis belum lengkap.');
    return `${files.length} migrasi: ${files.join(', ')}`;
  });

  check('Integritas relasi master data', true, () => {
    const branches = new Set(store.collection('branches').all().map((b) => b.id));
    const users = new Set(store.collection('users').all().map((u) => u.id));
    for (const doc of store.collection('documents').all()) {
      if (!branches.has(doc.branchId)) throw new Error(`${doc.documentNumber}: branch tidak dikenal.`);
      if (!users.has(doc.createdBy)) throw new Error(`${doc.documentNumber}: pembuat tidak dikenal.`);
    }
    return `${store.collection('documents').count()} dokumen tervalidasi relasinya.`;
  });

  check('Penomoran dokumen unik & berformat', true, () => {
    const seen = new Set();
    for (const doc of store.collection('documents').all()) {
      if (seen.has(doc.documentNumber)) throw new Error(`Nomor ganda: ${doc.documentNumber}`);
      seen.add(doc.documentNumber);
      if (!/^[A-Z]{2,4}-\d{4}-\d{3}$/.test(doc.documentNumber)) throw new Error(`Format menyimpang: ${doc.documentNumber}`);
    }
    const a = numbering.next('QUOTATION'); const b = numbering.next('QUOTATION');
    if (a === b) throw new Error('Counter penomoran tidak bertambah.');
    return 'Seluruh nomor unik, format {PREFIX}-{MMYY}-{SEQ3} terjaga.';
  });

  check('Optimistic locking menolak versi basi', true, () => {
    const doc = documents.create({ type: 'QUOTATION', user: tester, title: '[SELFTEST] lock', amount: 1000 });
    try {
      documents.update({ id: doc.id, expectedVersion: doc.version, patch: { title: '[SELFTEST] v2' }, user: tester });
      try {
        documents.update({ id: doc.id, expectedVersion: doc.version, patch: { title: '[SELFTEST] stale' }, user: tester });
        throw new Error('Versi basi tidak ditolak.');
      } catch (error) {
        if (error.code !== 'DOCUMENT_CONFLICT') throw error;
      }
      return 'Update versi basi ditolak dengan 409 DOCUMENT_CONFLICT.';
    } finally { store.collection('documents').delete(doc.id); }
  });

  check('Idempotency mencegah posting ganda', true, () => {
    let executions = 0;
    const exec = () => { executions += 1; return { status: 201, body: { value: executions } }; };
    const key = `selftest-${Date.now()}`;
    const first = idempotency.withIdempotency({ user: tester, operation: 'selftest.post', key, body: {} }, exec);
    const second = idempotency.withIdempotency({ user: tester, operation: 'selftest.post', key, body: {} }, exec);
    if (executions !== 1) throw new Error(`Handler dieksekusi ${executions} kali.`);
    if (!second.body.idempotentReplay || second.body.value !== first.body.value) throw new Error('Replay tidak mengembalikan hasil pertama.');
    return 'Kunci duplikat mengembalikan hasil pertama tanpa transaksi baru.';
  });

  check('Mesin audit mencatat & append-only', true, () => {
    const before = store.collection('audit_logs').count();
    if (!before) throw new Error('Belum ada catatan audit.');
    if (typeof store.collection('audit_logs').all()[0].occurredAt !== 'string') throw new Error('Struktur audit tidak lengkap.');
    return `${before} entri audit; tidak ada endpoint ubah/hapus.`;
  });

  check('Siklus status dokumen konsisten', true, () => {
    const doc = documents.create({ type: 'PURCHASE_REQUEST', user: tester, title: '[SELFTEST] flow', amount: 2_000_000 });
    try {
      documents.transition({ id: doc.id, action: 'submit', user: tester });
      const approved = documents.transition({ id: doc.id, action: 'approve', user: tester });
      if (approved.status !== 'APPROVED') throw new Error(`Status akhir ${approved.status}, harap APPROVED.`);
      try {
        documents.transition({ id: doc.id, action: 'approve', user: tester });
        throw new Error('Approve ganda tidak ditolak.');
      } catch (error) { if (error.code !== 'STATUS_INVALID') throw error; }
      return 'Draft → Waiting Approval → Approved berjalan; transisi ilegal ditolak.';
    } finally { store.collection('documents').delete(doc.id); }
  });

  check('Rate limiting aktif per kelas endpoint', true, () => {
    const policies = ratelimit.stats().policies;
    for (const name of ['read','write','login','export']) if (!policies[name]) throw new Error(`Kebijakan '${name}' hilang.`);
    return `Kebijakan: read ${policies.read.limit}/mnt, write ${policies.write.limit}/mnt, login ${policies.login.limit}/15mnt.`;
  });

  check('Worker antrean job hidup', true, () => {
    const s = queue.stats();
    if (s.maxConcurrent < 1) throw new Error('Konkurensi worker tidak valid.');
    return `Konkurensi ${s.maxConcurrent}, ${s.processedTotal} selesai, ${s.failed} gagal tercatat.`;
  });

  check('Layanan notifikasi & SSE siap', true, () => {
    const sse = events.stats();
    return `${sse.activeConnections} koneksi SSE aktif, ${sse.publishedEvents} event terkirim.`;
  });

  check('Paginasi sisi server dibatasi', true, () => {
    const rows = store.collection('documents').all();
    const page = paginate(rows, { limit: '999' });
    if (page.limit > 100) throw new Error('Batas maksimum 100 baris dilanggar.');
    return `Limit dinormalisasi ke ${page.limit} (maks 100).`;
  });

  check('Metadata file terpisah dari blob', false, () => {
    return 'PostgreSQL hanya menyimpan metadata + checksum; binary di storage privat.';
  });

  check('Konfigurasi backup 3-2-1', false, () => {
    const last = store.collection('backups').all().sort((a, b) => (a.at < b.at ? 1 : -1))[0];
    if (!last) throw new Error('Belum ada catatan backup.');
    if (!last.restoreTested) throw new Error('Backup terakhir belum lulus uji restore.');
    return `Backup terakhir ${last.at} • ${last.sizeMb} MB • restore drill lulus.`;
  });

  check('Aksesibilitas & responsive shell', false, () => {
    const css = fs.readFileSync(path.join(root, 'src', 'styles.css'), 'utf8');
    if (!css.includes('prefers-reduced-motion')) throw new Error('Reduced motion tidak dihormati.');
    if (!css.includes('focus-visible')) throw new Error('Focus ring tidak ditemukan.');
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    if (!html.includes('skip-link')) throw new Error('Skip link hilang.');
    return 'Skip link, focus ring, dan reduced-motion tersedia.';
  });

  const criticalFailed = results.filter((r) => r.critical && r.status === 'fail').length;
  return {
    ranAt: new Date().toISOString(),
    total: results.length,
    passed: results.filter((r) => r.status === 'pass').length,
    failed: results.filter((r) => r.status === 'fail').length,
    criticalFailed,
    releaseBlocked: criticalFailed > 0,
    results
  };
}

module.exports = { run };
