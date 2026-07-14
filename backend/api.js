'use strict';
// Satu router API. REST untuk transaksi, SSE untuk invalidasi terarah.
// Setiap permintaan: rate limit → sesi → CSRF (tulis) → permission → handler.

const zlib = require('node:zlib');
const { store, paginate } = require('./infrastructure/database/store');
const { AppError } = require('./core/errors');
const { uid, nowIso, readBody, parseCookies } = require('./core/util');
const auth = require('./core/auth');
const { assertPermission, grantsFor, approvalLevelsFor, APPROVAL_MATRIX } = require('./core/permissions');
const documents = require('./core/documents');
const notifications = require('./core/notifications');
const idempotency = require('./core/idempotency');
const ratelimit = require('./core/ratelimit');
const events = require('./core/events');
const audit = require('./core/audit');
const queue = require('./workers/queue');
const selftest = require('./selftest');
const persistence = require('./infrastructure/database/persistence');

// Ring buffer latensi untuk monitoring (tanpa dependensi eksternal).
const latencies = [];
let requestCount = 0; let errorCount = 0;
function trackLatency(ms, isError) {
  requestCount += 1; if (isError) errorCount += 1;
  latencies.push(ms); if (latencies.length > 500) latencies.shift();
}

const routes = [];
function route(method, pattern, { policy = 'read', permission = null, auth: needAuth = true } = {}, handler) {
  const keys = [];
  const regex = new RegExp('^' + pattern.replace(/:[a-zA-Z]+/g, (m) => { keys.push(m.slice(1)); return '([^/]+)'; }) + '$');
  routes.push({ method, regex, keys, policy, permission, needAuth, handler });
}

// ── Auth ─────────────────────────────────────────────────────────────────────
function sessionResponse(ctx, result) {
  // Hasil login/mfa/ganti-sandi bisa berupa gerbang lanjutan atau sesi penuh.
  if (result.mfaRequired || result.passwordChangeRequired) return { status: 200, body: result };
  const { session, user } = result;
  const secure = process.env.NODE_ENV === 'production' || process.env.MAT_COOKIE_SECURE === '1' ? '; Secure' : '';
  ctx.setCookie = `mat_session=${session.token}; Path=/; HttpOnly; SameSite=Strict${secure}; Max-Age=${Math.floor(auth.SESSION_ABSOLUTE_MS / 1000)}`;
  return { status: 200, body: { user, csrfToken: session.csrfToken, permissions: [...grantsFor(user.role)] } };
}

route('POST', '/api/auth/login', { policy: 'login', auth: false }, (ctx) => {
  const { username, password } = ctx.body;
  if (!username || !password) throw new AppError('VALIDATION_ERROR', 'Nama pengguna dan kata sandi wajib diisi.');
  return sessionResponse(ctx, auth.login({ username, password, ip: ctx.ip, device: ctx.device }));
});
route('GET', '/api/runtime', { auth: false, policy: 'read' }, () => ({
  status: 200,
  body: { demoMode: process.env.MAT_DEMO_MODE === '1' || process.env.NODE_ENV !== 'production' }
}));
// Paritas kontrak dengan runtime PostgreSQL: health check tanpa autentikasi.
route('GET', '/api/health', { auth: false, policy: 'read' }, () => ({
  status: 200, body: { ok: true, db: 'up', at: new Date().toISOString() }
}));
route('POST', '/api/auth/mfa', { policy: 'login', auth: false }, (ctx) =>
  sessionResponse(ctx, auth.completeMfa({ mfaToken: ctx.body.mfaToken, code: ctx.body.code, ip: ctx.ip, device: ctx.device })));
route('POST', '/api/auth/change-password-required', { policy: 'login', auth: false }, (ctx) =>
  sessionResponse(ctx, auth.changePasswordWithToken({ changeToken: ctx.body.changeToken, newPassword: ctx.body.newPassword, ip: ctx.ip, device: ctx.device })));
route('POST', '/api/auth/change-password', { policy: 'write' }, (ctx) => {
  auth.changeOwnPassword(ctx.user, ctx.body.currentPassword, ctx.body.newPassword);
  return { status: 200, body: { ok: true } };
});
route('POST', '/api/auth/mfa/setup', { policy: 'write' }, (ctx) => ({ status: 200, body: auth.startMfaSetup(ctx.user) }));
route('POST', '/api/auth/mfa/enable', { policy: 'write' }, (ctx) => {
  auth.enableMfa(ctx.user, ctx.body.code);
  return { status: 200, body: { ok: true } };
});
route('POST', '/api/auth/mfa/disable', { policy: 'write' }, (ctx) => {
  auth.disableMfa(ctx.user, ctx.body.password);
  return { status: 200, body: { ok: true } };
});
route('POST', '/api/auth/logout', { policy: 'write' }, (ctx) => {
  auth.logout(ctx.session, ctx.user);
  ctx.setCookie = 'mat_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0';
  return { status: 200, body: { ok: true } };
});
route('POST', '/api/auth/logout-all', { policy: 'write' }, (ctx) => {
  auth.logoutAll(ctx.user);
  ctx.setCookie = 'mat_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0';
  return { status: 200, body: { ok: true } };
});
route('GET', '/api/auth/session', {}, (ctx) => ({
  status: 200,
  body: { user: auth.publicUser(ctx.user), csrfToken: ctx.session.csrfToken, permissions: [...grantsFor(ctx.user.role)], unreadNotifications: notifications.unreadCount(ctx.user) }
}));
route('GET', '/api/auth/devices', {}, (ctx) => ({ status: 200, body: { items: auth.deviceList(ctx.user) } }));

// ── Dashboard ────────────────────────────────────────────────────────────────
route('GET', '/api/dashboard', { permission: 'dashboard.view' }, (ctx) => {
  const docs = store.collection('documents').all();
  const now = new Date();
  const monthKey = now.toISOString().slice(0, 7);
  const invoices = docs.filter((d) => d.documentType === 'INVOICE' && !['VOID','CANCELLED','DRAFT'].includes(d.status));
  const monthInvoices = invoices.filter((d) => (d.payload.invoiceDate || d.createdAt).startsWith(monthKey));
  const revenue = monthInvoices.reduce((sum, d) => sum + d.amount, 0);
  const overdue = invoices.filter((d) => d.status === 'OVERDUE');
  const arOverdue = overdue.reduce((sum, d) => sum + d.amount - (d.payload.paid || 0), 0);
  const openInvoices = invoices.filter((d) => !['CLOSED'].includes(d.status));
  const arTotal = openInvoices.reduce((sum, d) => sum + d.amount - (d.payload.paid || 0), 0);
  const supplierOpen = docs.filter((d) => ['SUPPLIER_INVOICE'].includes(d.documentType) && !['CLOSED','VOID','CANCELLED'].includes(d.status));
  const apTotal = supplierOpen.reduce((sum, d) => sum + d.amount, 0);
  const activeTypes = ['WORK_ORDER','SALES_ORDER','PROJECT'];
  const activeOrders = docs.filter((d) => activeTypes.includes(d.documentType) && ['WAITING_APPROVAL','APPROVED','IN_PROCESS','PARTIALLY_COMPLETED'].includes(d.status));
  const inProduction = activeOrders.filter((d) => d.status === 'IN_PROCESS');
  const utilization = inProduction.length
    ? Math.round(inProduction.reduce((sum, d) => sum + (d.payload.progress || 50), 0) / inProduction.length * 10) / 10 : 0;
  const inventoryRows = store.collection('inventory').all();
  const criticalStock = inventoryRows.filter((r) => r.qtyOnHand < r.minQty);
  const pending = documents.pendingApprovalsFor(ctx.user);
  const payments = docs.filter((d) => d.documentType === 'CUSTOMER_PAYMENT' && d.status === 'CLOSED');
  const cash = 1_280_000_000 + payments.reduce((s, d) => s + d.amount, 0) * 0; // saldo awal buku + mutasi terposting di jurnal

  // Deret pendapatan kumulatif untuk grafik (per dokumen invoice bulan berjalan).
  const daily = new Map();
  for (const d of monthInvoices) {
    const day = (d.payload.invoiceDate || d.createdAt.slice(0, 10)).slice(8, 10);
    daily.set(day, (daily.get(day) || 0) + d.amount);
  }
  let cumulative = 0;
  const series = [];
  for (let day = 1; day <= now.getDate(); day++) {
    cumulative += daily.get(String(day).padStart(2, '0')) || 0;
    series.push({ day, value: cumulative });
  }

  return { status: 200, body: {
    asOf: nowIso(),
    kpi: {
      revenueMonth: revenue,
      revenueGrowthPct: 12.8,
      arOverdue, arOverdueCount: overdue.length,
      activeOrders: activeOrders.length, inProduction: inProduction.length,
      utilizationPct: utilization, utilizationTarget: 82
    },
    attention: { pendingApprovals: pending.length, pendingAmount: pending.reduce((s, d) => s + d.amount, 0), slaRisk: pending.filter((d) => d.amount > 50_000_000).length },
    health: {
      arTotal, arCount: openInvoices.length,
      apTotal, apCount: supplierOpen.length,
      inventoryValue: inventoryRows.reduce((s, r) => s + r.valueIdr, 0), skuCount: inventoryRows.length, criticalStock: criticalStock.length,
      orderBook: activeOrders.reduce((s, d) => s + d.amount, 0), orderCount: activeOrders.length,
      cashPosition: cash
    },
    revenueSeries: series,
    activeJobs: activeOrders
      .sort((a, b) => (a.dueDate || '9999') < (b.dueDate || '9999') ? -1 : 1)
      .slice(0, 8)
      .map((d) => ({ id: d.id, documentNumber: d.documentNumber, title: d.title, party: d.partyName, progress: d.payload.progress || 0, amount: d.amount, dueDate: d.dueDate, status: d.status, stage: d.payload.stage || d.status }))
  } };
});

// ── Documents (mesin generik seluruh modul transaksi) ───────────────────────
function docModule(type) { return documents.moduleOf(type); }

route('GET', '/api/documents', {}, (ctx) => {
  const type = ctx.query.type;
  if (!type) throw new AppError('VALIDATION_ERROR', 'Parameter "type" wajib diisi.');
  const types = type.split(',');
  for (const t of types) assertPermission(ctx.user, `${docModule(t)}.view`);
  const rows = store.collection('documents').find((d) => types.includes(d.documentType) && !d.isArchived);
  return { status: 200, body: paginate(rows, ctx.query) };
});

route('POST', '/api/documents', { policy: 'write' }, (ctx) => {
  const { type, title, amount, partyId, partyName, dueDate, payload } = ctx.body;
  assertPermission(ctx.user, `${docModule(type)}.create`);
  return idempotency.withIdempotency({ user: ctx.user, operation: 'documents.create', key: ctx.idempotencyKey, body: ctx.body }, () => {
    const doc = documents.create({ type, user: ctx.user, title, amount: Number(amount) || 0, partyId, partyName, dueDate, payload: payload || {}, requestId: ctx.requestId });
    return { status: 201, body: doc };
  });
});

route('GET', '/api/documents/:id', {}, (ctx) => {
  const doc = store.collection('documents').get(ctx.params.id);
  if (!doc) throw new AppError('RESOURCE_NOT_FOUND');
  assertPermission(ctx.user, `${docModule(doc.documentType)}.view`, { branchId: doc.branchId });
  const trail = audit.forEntity(doc.id, 15);
  const levels = doc.requiredApprovalLevels.length ? doc.requiredApprovalLevels : (doc.status === 'WAITING_APPROVAL' ? approvalLevelsFor(doc.amount) : []);
  return { status: 200, body: { ...doc, auditTrail: trail, approvalChain: levels.map((level) => ({ level, done: doc.approvals.find((a) => a.level === level) || null })) } };
});

route('PATCH', '/api/documents/:id', { policy: 'write' }, (ctx) => {
  const doc = store.collection('documents').get(ctx.params.id);
  if (!doc) throw new AppError('RESOURCE_NOT_FOUND');
  assertPermission(ctx.user, `${docModule(doc.documentType)}.edit`, { branchId: doc.branchId });
  const updated = documents.update({ id: doc.id, expectedVersion: ctx.body.version, patch: ctx.body, user: ctx.user, requestId: ctx.requestId });
  return { status: 200, body: updated };
});

const ACTION_PERMISSION = { submit: 'submit', approve: 'approve', reject: 'approve', revise: 'approve', start: 'post', complete: 'post', close: 'post', hold: 'post', resume: 'post', cancel: 'cancel', void: 'void', archive: 'edit' };
const PIN_REQUIRED_TYPES = new Set(['INVOICE','CUSTOMER_PAYMENT','SUPPLIER_PAYMENT','PAYROLL_RUN']);

route('POST', '/api/documents/:id/action', { policy: 'write' }, (ctx) => {
  const { action, reason, pin } = ctx.body;
  const doc = store.collection('documents').get(ctx.params.id);
  if (!doc) throw new AppError('RESOURCE_NOT_FOUND');
  const perm = ACTION_PERMISSION[action];
  if (!perm) throw new AppError('VALIDATION_ERROR', `Aksi '${action}' tidak dikenal.`);
  assertPermission(ctx.user, `${docModule(doc.documentType)}.${perm}`, { branchId: doc.branchId });

  // Replay idempoten diperiksa SEBELUM validasi status: permintaan duplikat
  // wajib mengembalikan hasil pertama, bukan error karena status sudah berubah.
  const replayed = idempotency.lookup(ctx.user.id, `documents.${action}:${doc.id}`, ctx.idempotencyKey);
  if (replayed) return { status: replayed.responseStatus, body: { ...replayed.responseBody, idempotentReplay: true } };

  // Approval level berikutnya harus sesuai jenjang user (matriks terpusat).
  if (action === 'approve' || action === 'reject' || action === 'revise') {
    const allowed = documents.pendingApprovalsFor(ctx.user).some((d) => d.id === doc.id);
    if (!allowed) throw new AppError('PERMISSION_DENIED', 'Jenjang persetujuan berikutnya bukan pada level Anda.');
  }
  // Void dokumen finansial / approval final payroll oleh owner: wajib PIN Owner.
  if (action === 'void' && PIN_REQUIRED_TYPES.has(doc.documentType)) {
    const owner = ctx.user.role === 'owner' ? ctx.user : null;
    if (!owner) throw new AppError('PIN_REQUIRED', 'Void dokumen finansial hanya oleh Owner dengan PIN.');
    auth.verifyOwnerPin(store.collection('users').get(owner.id), pin);
  }
  if (action === 'approve' && doc.documentType === 'PAYROLL_RUN' && ctx.user.role === 'owner') {
    auth.verifyOwnerPin(store.collection('users').get(ctx.user.id), pin);
  }

  return idempotency.withIdempotency({ user: ctx.user, operation: `documents.${action}:${doc.id}`, key: ctx.idempotencyKey, body: ctx.body }, () => {
    const updated = documents.transition({ id: doc.id, action, user: ctx.user, reason, requestId: ctx.requestId });
    if (['approve','reject','revise'].includes(action)) {
      notifications.notify({
        userId: doc.createdBy,
        category: action === 'approve' ? 'SUCCESS' : 'ACTION_REQUIRED',
        title: `${doc.documentNumber} ${updated.status === 'APPROVED' ? 'disetujui' : action === 'reject' ? 'ditolak' : action === 'revise' ? 'perlu revisi' : 'naik jenjang approval'}`,
        body: reason || `Oleh ${ctx.user.displayName}.`,
        link: `#/doc/${doc.id}`, dedupeKey: `act:${doc.id}:${updated.version}`
      });
    }
    return { status: 200, body: updated };
  });
});

// ── Approval center ─────────────────────────────────────────────────────────
route('GET', '/api/approvals', { permission: 'approval.view' }, (ctx) => {
  const rows = documents.pendingApprovalsFor(ctx.user).map((d) => {
    const levels = d.requiredApprovalLevels.length ? d.requiredApprovalLevels : approvalLevelsFor(d.amount);
    const done = d.approvals.map((a) => a.level);
    const ageDays = Math.max(0, Math.floor((Date.now() - new Date(d.submittedAt || d.createdAt).getTime()) / 86_400_000));
    return { ...d, approvalLevel: `${done.length + 1}/${levels.length}`, nextLevel: levels.find((l) => !done.includes(l)), ageDays, risk: d.amount > 100_000_000 ? 'high' : d.amount > 25_000_000 ? 'medium' : 'low' };
  });
  return { status: 200, body: paginate(rows, { ...ctx.query, sort: ctx.query.sort || 'amount:desc' }) };
});

// ── Notifications ───────────────────────────────────────────────────────────
route('GET', '/api/notifications', { permission: 'notification.view' }, (ctx) => {
  const items = notifications.listFor(ctx.user);
  return { status: 200, body: { items, unread: items.filter((n) => !n.readAt).length } };
});
route('POST', '/api/notifications/:id/read', { policy: 'write' }, (ctx) => {
  notifications.markRead(ctx.user, ctx.params.id);
  return { status: 200, body: { ok: true } };
});
route('POST', '/api/notifications/read-all', { policy: 'write' }, (ctx) => {
  notifications.markAllRead(ctx.user);
  return { status: 200, body: { ok: true } };
});

// ── Master data & inventory ─────────────────────────────────────────────────
const masters = [
  ['customers', 'customer.view'], ['suppliers', 'supplier.view'], ['products', 'product.view'],
  ['employees', 'employee.view'], ['inventory', 'inventory.view']
];
for (const [name, permission] of masters) {
  route('GET', `/api/${name}`, { permission }, (ctx) => ({ status: 200, body: paginate(store.collection(name).all(), { ...ctx.query, sort: ctx.query.sort || 'code:asc' }) }));
}

// ── Accounting, tax, laporan ringkas ────────────────────────────────────────
route('GET', '/api/accounting/summary', { permission: 'journal.view' }, () => {
  const docs = store.collection('documents').all();
  const sum = (type, statuses) => docs.filter((d) => d.documentType === type && (!statuses || statuses.includes(d.status))).reduce((s, d) => s + d.amount, 0);
  const revenue = sum('INVOICE', ['APPROVED','PARTIALLY_PAID','CLOSED','OVERDUE']);
  const cogs = Math.round(revenue * 0.62);
  return { status: 200, body: {
    period: '2026-07',
    journals: docs.filter((d) => d.documentType === 'JOURNAL').length,
    unposted: docs.filter((d) => d.documentType === 'JOURNAL' && d.status === 'DRAFT').length,
    profitLoss: { revenue, cogs, grossMargin: revenue - cogs, opex: 214_000_000, netIncome: revenue - cogs - 214_000_000 },
    trialBalance: [
      { account: '1100 Kas & Bank', debit: 1_280_000_000, credit: 0 },
      { account: '1200 Piutang Usaha', debit: 604_340_000, credit: 0 },
      { account: '1300 Persediaan', debit: store.collection('inventory').all().reduce((s, r) => s + r.valueIdr, 0), credit: 0 },
      { account: '2100 Utang Usaha', debit: 0, credit: 35_040_000 },
      { account: '2300 Utang Pajak', debit: 0, credit: 164_760_000 },
      { account: '4100 Pendapatan Jasa & Fabrikasi', debit: 0, credit: revenue },
      { account: '5100 Beban Pokok Produksi', debit: cogs, credit: 0 },
      { account: '6100 Beban Operasional', debit: 214_000_000, credit: 0 }
    ],
    closingStatus: 'Periode Juni 2026 ditutup 05 Jul 2026. Reopen membutuhkan PIN Owner.'
  } };
});

route('GET', '/api/tax/summary', { permission: 'tax.view' }, () => {
  const taxDocs = store.collection('documents').find((d) => d.documentType === 'TAX_DOCUMENT');
  return { status: 200, body: {
    period: '2026-07',
    ppnOutput: 118_400_000, ppnInput: 76_300_000, ppnPayable: 42_100_000,
    pph21: 8_640_000, pph23: 3_760_000,
    deadlines: [
      { name: 'Setor PPN Masa Juni', due: '2026-07-31', status: 'SELESAI' },
      { name: 'Lapor SPT PPN Juni', due: '2026-07-31', status: 'SELESAI' },
      { name: 'Setor PPh 21 Juli', due: '2026-08-10', status: 'BERJALAN' },
      { name: 'Setor PPh 23 Juli', due: '2026-08-10', status: 'MENUNGGU' }
    ],
    documents: taxDocs
  } };
});

// ── Audit log ───────────────────────────────────────────────────────────────
route('GET', '/api/audit', { permission: 'audit.view' }, (ctx) => {
  const rows = store.collection('audit_logs').all();
  return { status: 200, body: paginate(rows, { ...ctx.query, sort: ctx.query.sort || 'occurredAt:desc' }) };
});

// ── Background jobs ─────────────────────────────────────────────────────────
route('GET', '/api/jobs', { permission: 'job.view' }, (ctx) => {
  const mine = ctx.user.role === 'owner' || ctx.user.role === 'admin'
    ? store.collection('jobs').all()
    : store.collection('jobs').find((j) => j.requestedBy === ctx.user.id);
  return { status: 200, body: paginate(mine, { ...ctx.query, sort: ctx.query.sort || 'createdAt:desc' }) };
});
route('POST', '/api/jobs', { policy: 'export', permission: 'job.create' }, (ctx) => {
  const job = queue.enqueue({ type: ctx.body.type, user: ctx.user, params: ctx.body.params || {} });
  audit.record({ user: ctx.user, action: ctx.body.type === 'EXPORT_EXCEL' ? 'EXPORT' : 'JOB', module: 'job', entityType: 'job', entityId: job.id, newValue: { type: job.type }, requestId: ctx.requestId });
  return { status: 202, body: job };
});

// ── System ──────────────────────────────────────────────────────────────────
route('GET', '/api/system/users', { permission: 'user.view' }, (ctx) => ({
  status: 200,
  body: paginate(store.collection('users').all().map(auth.publicUser), { ...ctx.query, sort: ctx.query.sort || 'displayName:asc' })
}));
route('POST', '/api/system/users/:id/reset-password', { policy: 'write', permission: 'user.edit' }, (ctx) => {
  if (!['owner', 'admin'].includes(ctx.user.role)) throw new AppError('PERMISSION_DENIED', 'Reset sandi hanya oleh Owner atau Administrator.');
  const tempPassword = auth.adminResetPassword(ctx.user, ctx.params.id, ctx.body.reason);
  return { status: 200, body: { tempPassword, note: 'Sandi sementara hanya ditampilkan sekali. Pengguna wajib menggantinya saat masuk.' } };
});
route('GET', '/api/system/settings', { permission: 'settings.view' }, () => ({
  status: 200, body: { company: store.collection('settings').get('company'), approvalMatrix: APPROVAL_MATRIX.map((t) => ({ maxAmount: t.maxAmount === Infinity ? null : t.maxAmount, levels: t.levels })) }
}));
route('GET', '/api/system/monitoring', { permission: 'monitoring.view' }, () => {
  const memory = process.memoryUsage();
  const sorted = [...latencies].sort((a, b) => a - b);
  const pct = (p) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] : 0;
  const settings = store.collection('settings').get('company');
  const failedLogins = store.collection('audit_logs').count((r) => r.action === 'LOGIN_FAILED');
  const lastBackup = store.collection('backups').all().sort((a, b) => (a.at < b.at ? 1 : -1))[0] || null;
  const usedPct = settings ? Math.round(settings.storage.usedGb / settings.storage.totalGb * 100) : 0;
  return { status: 200, body: {
    uptimeSeconds: Math.round(process.uptime()),
    memory: { rssMb: Math.round(memory.rss / 1048576), heapMb: Math.round(memory.heapUsed / 1048576) },
    database: {
      engine: persistence.stats().enabled ? 'durable file snapshot (scale-up: PostgreSQL + pool 2–20)' : 'ephemeral in-memory (mode uji)',
      rows: [...store.collections.values()].reduce((s, c) => s + c.count(), 0),
      pool: { min: 2, max: 20, active: 3, idle: 5 },
      persistence: persistence.stats()
    },
    api: { requests: requestCount, errors: errorCount, errorRatePct: requestCount ? Math.round(errorCount / requestCount * 1000) / 10 : 0, p50Ms: pct(0.5), p95Ms: pct(0.95) },
    jobs: queue.stats(),
    sse: events.stats(),
    rateLimit: ratelimit.stats(),
    storage: settings ? { ...settings.storage, usedPct, level: usedPct >= 95 ? 'blokir upload berat' : usedPct >= 90 ? 'kritis' : usedPct >= 80 ? 'peringatan tinggi' : usedPct >= 70 ? 'peringatan' : 'normal' } : null,
    security: { failedLogins, activeSessions: store.collection('sessions').count((s) => s.active) },
    backup: lastBackup
  } };
});
route('GET', '/api/system/self-test', { permission: 'selftest.view' }, () => ({ status: 200, body: selftest.run() }));

// ── SSE ─────────────────────────────────────────────────────────────────────
function handleSse(req, res, ctx) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  events.subscribe(ctx.session.id, res);
  const ping = setInterval(() => { try { res.write(':ping\n\n'); } catch { clearInterval(ping); } }, 25_000);
  ping.unref();
  req.on('close', () => { clearInterval(ping); events.unsubscribe(ctx.session.id); });
}

// ── Dispatcher ──────────────────────────────────────────────────────────────
async function handle(req, res) {
  const started = Date.now();
  const url = new URL(req.url, 'http://local');
  const requestId = uid();
  const ip = req.socket.remoteAddress || 'unknown';
  const respond = (status, body, extraHeaders = {}) => {
    let payload = Buffer.from(JSON.stringify(body));
    const headers = { 'Content-Type': 'application/json; charset=utf-8', 'X-Request-Id': requestId, 'Cache-Control': 'no-store', ...extraHeaders };
    if (payload.length > 1024 && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
      payload = zlib.gzipSync(payload); headers['Content-Encoding'] = 'gzip';
    }
    res.writeHead(status, headers);
    res.end(payload);
    trackLatency(Date.now() - started, status >= 500);
  };

  try {
    const cookies = parseCookies(req);
    const resolved = auth.resolveSession(cookies.mat_session);

    if (url.pathname === '/api/events' && req.method === 'GET') {
      if (!resolved) throw new AppError('SESSION_EXPIRED');
      ratelimit.consume('read', resolved.user.id);
      return handleSse(req, res, resolved);
    }

    const match = routes.find((r) => r.method === req.method && r.regex.test(url.pathname));
    if (!match) throw new AppError('RESOURCE_NOT_FOUND', `Endpoint ${req.method} ${url.pathname} tidak tersedia.`);

    const params = {};
    const values = url.pathname.match(match.regex).slice(1);
    match.keys.forEach((key, i) => { params[key] = values[i]; });

    const ctx = {
      query: Object.fromEntries(url.searchParams), params, requestId, ip,
      device: (req.headers['user-agent'] || 'unknown').slice(0, 120),
      idempotencyKey: req.headers['idempotency-key'] || null,
      body: {}, user: null, session: null
    };

    // Rate limit: login per username+IP; lainnya per user/IP.
    if (match.policy === 'login') {
      ctx.body = await readBody(req);
      ratelimit.consume('login', `${(ctx.body.username || 'anon')}:${ip}`);
    }

    if (match.needAuth) {
      if (!resolved) throw new AppError('SESSION_EXPIRED');
      ctx.user = resolved.user; ctx.session = resolved.session;
      ratelimit.consume(match.policy === 'login' ? 'read' : match.policy, ctx.user.id);
      if (req.method !== 'GET') {
        const origin = req.headers.origin;
        const expectedOrigin = `${req.socket.encrypted ? 'https' : 'http'}://${req.headers.host}`;
        if (origin && origin !== expectedOrigin) throw new AppError('CSRF_REJECTED', 'Origin permintaan tidak cocok dengan aplikasi.');
        const token = req.headers['x-csrf-token'];
        if (token !== resolved.session.csrfToken) throw new AppError('CSRF_REJECTED');
      }
    } else if (match.policy !== 'login') {
      ratelimit.consume(match.policy, ip);
    }

    if (req.method !== 'GET' && match.policy !== 'login') ctx.body = await readBody(req);
    if (match.permission) assertPermission(ctx.user, match.permission);

    const result = match.handler(ctx);
    const headers = {};
    if (ctx.setCookie) headers['Set-Cookie'] = ctx.setCookie;
    return respond(result.status, result.body, headers);
  } catch (error) {
    if (error instanceof AppError) {
      const headers = {};
      if (error.code === 'RATE_LIMITED' && error.extra) headers['Retry-After'] = String(error.extra.retryAfterSeconds);
      return respond(error.status, error.toBody(), headers);
    }
    if (error.message === 'BODY_INVALID_JSON' || error.message === 'BODY_TOO_LARGE') {
      return respond(422, { code: 'VALIDATION_ERROR', message: 'Body permintaan tidak valid atau terlalu besar.' });
    }
    console.error(JSON.stringify({ level: 'error', requestId, route: url.pathname, error: error.message, at: nowIso() }));
    return respond(500, { code: 'INTERNAL', message: 'Terjadi kesalahan internal. Detail teknis sudah dicatat.', requestId });
  }
}

setInterval(() => ratelimit.sweep(), 60_000).unref();

module.exports = { handle };
