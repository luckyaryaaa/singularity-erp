'use strict';
// Singularity Control Plane + Billing — HTTP surface. Every route requires a
// platform operator; after verifying, the request transaction is elevated to
// platform context (app.is_platform='on') so control-plane queries see all
// tenants. Passwords are hashed server-side; plaintext is never stored.
const { readBody } = require('../core/util');
const { AppError } = require('../core/errors');
const cp = require('../infrastructure/database/repositories/control-plane');
const billing = require('../infrastructure/database/repositories/billing');
const metering = require('../infrastructure/database/repositories/metering');
const auth = require('../infrastructure/database/repositories/auth');
const runtime = require('../infrastructure/database/repositories/runtime');
const { NO_MATCH } = require('./shared');

async function elevate(client, user) {
  await cp.assertPlatformOperator(client, user); // throws PERMISSION_DENIED for non-operators
  await client.query("SELECT set_config('app.is_platform','on',true)");
}
const audit = (client, ctx, action, entityId, detail) => runtime.audit(client, {
  userId: ctx.user.id, action, module: 'platform', entityType: 'TENANT', entityId, newValue: detail,
  requestId: ctx.requestId, sessionId: ctx.session && ctx.session.id, ip: ctx.ip, branchId: ctx.user.branchId
});

async function dispatch(client, req, url, ctx) {
  const p = url.pathname, method = req.method; let m;

  if (method === 'GET' && p === '/api/platform/plans') {
    await elevate(client, ctx.user);
    return { items: await billing.listPlans(client, { includeInactive: true }) };
  }

  // Control-plane audit trail (provision / status / subscribe / onboard …).
  if (method === 'GET' && p === '/api/platform/audit') {
    await elevate(client, ctx.user);
    const limit = Math.min(Number(url.searchParams.get('limit')) || 60, 200);
    const items = (await client.query(
      `SELECT a.occurred_at, a.action, a.entity_type, a.entity_id, a.new_value, u.username actor,
              t.code tenant_code, t.name tenant_name
       FROM audit_logs a
       LEFT JOIN app_users u ON u.id = a.user_id
       LEFT JOIN tenants   t ON t.id = a.entity_id
       WHERE a.module = 'platform'
       ORDER BY a.occurred_at DESC LIMIT $1`, [limit])).rows;
    return { items };
  }

  if (method === 'GET' && p === '/api/platform/tenants') {
    await elevate(client, ctx.user);
    return { items: await cp.listTenants(client, ctx.user) };
  }

  if (method === 'POST' && p === '/api/platform/tenants') {
    await elevate(client, ctx.user);
    const body = await readBody(req);
    const { tenant, created } = await cp.provisionTenant(client, ctx.user, body);
    await audit(client, ctx, 'PROVISION_TENANT', tenant.id, { code: tenant.code, created });
    ctx.status = created ? 201 : 200;
    return tenant;
  }

  // Composite one-shot onboarding: provision + baseline + owner + subscribe (atomic).
  if (method === 'POST' && p === '/api/platform/onboard') {
    await elevate(client, ctx.user);
    const body = await readBody(req);
    const { tenant, created } = await cp.provisionTenant(client, ctx.user, body);
    const baseline = await cp.seedTenantBaseline(client, ctx.user, tenant.id, body);
    let owner = null;
    if (body.ownerUsername && body.ownerPassword) {
      const o = await cp.createTenantOwner(client, ctx.user, tenant.id, {
        username: body.ownerUsername, passwordHash: auth.hashPassword(body.ownerPassword),
        displayName: body.ownerDisplayName || body.ownerUsername, branchId: baseline.branchId || null
      });
      owner = { id: o.id, username: o.username, tenantId: o.tenant_id };
    }
    let subscription = null;
    if (body.planCode) {
      const s = await billing.subscribeTenant(client, ctx.user, tenant.id, body.planCode, { status: body.subscriptionStatus || 'trial', trialDays: body.trialDays });
      subscription = { plan: body.planCode, status: s.status };
    }
    await audit(client, ctx, 'ONBOARD_TENANT', tenant.id, { code: tenant.code, created, plan: body.planCode || null });
    ctx.status = 201;
    return { tenant, created, baseline, owner, subscription };
  }

  m = p.match(/^\/api\/platform\/tenants\/([0-9a-f-]{36})$/);
  if (method === 'GET' && m) { await elevate(client, ctx.user); return cp.getTenant(client, ctx.user, m[1]); }

  // Composite view for the operator console detail drawer.
  m = p.match(/^\/api\/platform\/tenants\/([0-9a-f-]{36})\/summary$/);
  if (method === 'GET' && m) {
    await elevate(client, ctx.user);
    const summary = await cp.tenantSummary(client, ctx.user, m[1]);
    return { ...summary, subscription: await billing.getSubscription(client, m[1]) };
  }

  m = p.match(/^\/api\/platform\/tenants\/([0-9a-f-]{36})\/status$/);
  if (method === 'POST' && m) {
    await elevate(client, ctx.user);
    const body = await readBody(req);
    const tenant = await cp.setTenantStatus(client, ctx.user, m[1], body.status);
    await audit(client, ctx, 'TENANT_STATUS', m[1], { status: body.status });
    return tenant;
  }

  m = p.match(/^\/api\/platform\/tenants\/([0-9a-f-]{36})\/baseline$/);
  if (method === 'POST' && m) {
    await elevate(client, ctx.user);
    const body = await readBody(req);
    const r = await cp.seedTenantBaseline(client, ctx.user, m[1], body);
    await audit(client, ctx, 'SEED_BASELINE', m[1], r);
    ctx.status = r.seeded ? 201 : 200;
    return r;
  }

  m = p.match(/^\/api\/platform\/tenants\/([0-9a-f-]{36})\/owners$/);
  if (method === 'POST' && m) {
    await elevate(client, ctx.user);
    const body = await readBody(req);
    if (!body.password) throw new AppError('VALIDATION_ERROR', 'password wajib.');
    const o = await cp.createTenantOwner(client, ctx.user, m[1], {
      username: body.username, passwordHash: auth.hashPassword(body.password),
      displayName: body.displayName || body.username, branchId: body.branchId || null
    });
    await audit(client, ctx, 'CREATE_TENANT_OWNER', m[1], { username: o.username });
    ctx.status = 201;
    return { id: o.id, username: o.username, tenantId: o.tenant_id };
  }

  m = p.match(/^\/api\/platform\/tenants\/([0-9a-f-]{36})\/subscription$/);
  if (method === 'GET' && m) {
    await elevate(client, ctx.user);
    const s = await billing.getSubscription(client, m[1]);
    if (!s) throw new AppError('RESOURCE_NOT_FOUND', 'Tenant belum memiliki langganan.');
    return s;
  }
  if (method === 'POST' && m) {
    await elevate(client, ctx.user);
    const body = await readBody(req);
    const sub = await billing.subscribeTenant(client, ctx.user, m[1], body.planCode, { status: body.status || 'trial', trialDays: body.trialDays });
    await audit(client, ctx, 'SUBSCRIBE_TENANT', m[1], { plan: body.planCode, status: sub.status });
    ctx.status = 201;
    return sub;
  }

  m = p.match(/^\/api\/platform\/tenants\/([0-9a-f-]{36})\/subscription\/status$/);
  if (method === 'POST' && m) {
    await elevate(client, ctx.user);
    const body = await readBody(req);
    const sub = await billing.setSubscriptionStatus(client, ctx.user, m[1], body.status);
    await audit(client, ctx, 'SUBSCRIPTION_STATUS', m[1], { status: body.status });
    return sub;
  }

  // ── Metering & Platform Invoicing (W1 Commercialize) ─────────────────────
  m = p.match(/^\/api\/platform\/tenants\/([0-9a-f-]{36})\/usage$/);
  if (method === 'GET' && m) {
    await elevate(client, ctx.user);
    return metering.usageSummary(client, m[1], url.searchParams.get('period'));
  }
  if (method === 'POST' && m) {
    await elevate(client, ctx.user);
    const body = await readBody(req);
    const ev = await metering.recordUsage(client, ctx.user, m[1], body);
    await audit(client, ctx, 'RECORD_USAGE', m[1], { metric: ev.metric, quantity: ev.quantity });
    ctx.status = 201;
    return ev;
  }

  m = p.match(/^\/api\/platform\/tenants\/([0-9a-f-]{36})\/invoices$/);
  if (method === 'GET' && m) {
    await elevate(client, ctx.user);
    return { items: await metering.listInvoices(client, m[1]) };
  }
  if (method === 'POST' && m) {
    await elevate(client, ctx.user);
    const body = await readBody(req);
    const inv = await metering.generateInvoice(client, ctx.user, m[1], { period: body.period });
    await audit(client, ctx, 'GENERATE_INVOICE', m[1], { invoice: inv.invoice_number, total: inv.total, reused: inv.reused });
    ctx.status = inv.reused ? 200 : 201;
    return inv;
  }

  m = p.match(/^\/api\/platform\/invoices\/([0-9a-f-]{36})$/);
  if (method === 'GET' && m) {
    await elevate(client, ctx.user);
    const inv = await metering.getInvoice(client, m[1]);
    if (!inv) throw new AppError('RESOURCE_NOT_FOUND', 'Invoice tidak ditemukan.');
    return inv;
  }

  m = p.match(/^\/api\/platform\/invoices\/([0-9a-f-]{36})\/pay$/);
  if (method === 'POST' && m) {
    await elevate(client, ctx.user);
    const inv = await metering.markInvoicePaid(client, ctx.user, m[1]);
    await audit(client, ctx, 'INVOICE_PAID', inv.tenant_id, { invoice: inv.invoice_number, total: inv.total });
    return inv;
  }

  m = p.match(/^\/api\/platform\/invoices\/([0-9a-f-]{36})\/void$/);
  if (method === 'POST' && m) {
    await elevate(client, ctx.user);
    const inv = await metering.voidInvoice(client, ctx.user, m[1]);
    await audit(client, ctx, 'INVOICE_VOID', inv.tenant_id, { invoice: inv.invoice_number });
    return inv;
  }

  return NO_MATCH;
}

module.exports = { dispatch };
