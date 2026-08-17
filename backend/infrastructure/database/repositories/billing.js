'use strict';
// Singularity Billing & Entitlements. plans + tenant_subscriptions are global
// control-plane tables. Entitlement checks gate module access, seat limits, and
// subscription status (suspend-on-non-payment). Mutations require a platform
// operator; read helpers (getSubscription/entitlements/asserts) run in any
// context and only read control-plane tables (no tenant RLS).
const { AppError } = require('../../../core/errors');
const cp = require('./control-plane');

const ACTIVE_STATUSES = ['trial', 'active'];

async function listPlans(client, { includeInactive = false } = {}) {
  return (await client.query(
    `SELECT id,code,name,price_monthly,currency,entitlements,active,sort_order
     FROM plans ${includeInactive ? '' : 'WHERE active'} ORDER BY sort_order, price_monthly NULLS LAST`
  )).rows;
}

async function getSubscription(client, tenantId) {
  const row = (await client.query(
    `SELECT s.*, p.code plan_code, p.name plan_name, p.entitlements, p.price_monthly, p.currency
     FROM tenant_subscriptions s JOIN plans p ON p.id=s.plan_id WHERE s.tenant_id=$1`, [tenantId]
  )).rows[0];
  return row || null;
}

async function getEntitlements(client, tenantId) {
  const sub = await getSubscription(client, tenantId);
  return sub ? sub.entitlements || {} : {};
}

async function subscribeTenant(client, user, tenantId, planCode, { status = 'trial', trialDays = 14 } = {}) {
  await cp.assertPlatformOperator(client, user);
  const plan = (await client.query('SELECT id FROM plans WHERE code=$1 AND active', [planCode])).rows[0];
  if (!plan) throw new AppError('VALIDATION_ERROR', `Plan '${planCode}' tidak ditemukan/aktif.`);
  if (!(await client.query('SELECT 1 FROM tenants WHERE id=$1', [tenantId])).rowCount) throw new AppError('RESOURCE_NOT_FOUND', 'Tenant tidak ditemukan.');
  const trialEnds = status === 'trial' ? `now() + interval '${Number(trialDays) || 14} days'` : 'NULL';
  const sub = (await client.query(
    `INSERT INTO tenant_subscriptions(tenant_id,plan_id,status,trial_ends_at,current_period_end)
     VALUES($1,$2,$3,${trialEnds}, now() + interval '1 month')
     ON CONFLICT (tenant_id) DO UPDATE SET plan_id=EXCLUDED.plan_id,status=EXCLUDED.status,
       trial_ends_at=EXCLUDED.trial_ends_at,updated_at=now(),version=tenant_subscriptions.version+1
     RETURNING *`, [tenantId, plan.id, status]
  )).rows[0];
  await client.query("INSERT INTO tenant_provisioning_log(tenant_id,action,actor_user_id,detail) VALUES($1,'provision',$2,$3)",
    [tenantId, user.id, JSON.stringify({ subscribe: planCode, status })]);
  return sub;
}

async function setSubscriptionStatus(client, user, tenantId, status) {
  await cp.assertPlatformOperator(client, user);
  if (!['trial', 'active', 'past_due', 'suspended', 'cancelled'].includes(status)) throw new AppError('VALIDATION_ERROR', 'Status langganan tidak valid.');
  const sub = (await client.query(
    'UPDATE tenant_subscriptions SET status=$2, updated_at=now(), version=version+1 WHERE tenant_id=$1 RETURNING *', [tenantId, status]
  )).rows[0];
  if (!sub) throw new AppError('RESOURCE_NOT_FOUND', 'Langganan tenant tidak ditemukan.');
  return sub;
}

function moduleAllowed(entitlements, moduleCode) {
  const mods = (entitlements && entitlements.modules) || [];
  return mods.includes('*') || mods.includes(moduleCode);
}

async function isModuleEnabled(client, tenantId, moduleCode) {
  return moduleAllowed(await getEntitlements(client, tenantId), moduleCode);
}

async function assertModuleEnabled(client, tenantId, moduleCode) {
  if (!(await isModuleEnabled(client, tenantId, moduleCode))) {
    throw new AppError('PERMISSION_DENIED', `Modul '${moduleCode}' tidak termasuk paket langganan Anda.`);
  }
}

async function subscriptionActive(client, tenantId) {
  const sub = await getSubscription(client, tenantId);
  return !!sub && ACTIVE_STATUSES.includes(sub.status);
}

async function assertSubscriptionActive(client, tenantId) {
  const sub = await getSubscription(client, tenantId);
  if (!sub) throw new AppError('PERMISSION_DENIED', 'Tenant belum memiliki langganan aktif.');
  if (!ACTIVE_STATUSES.includes(sub.status)) {
    throw new AppError('PERMISSION_DENIED', `Langganan tenant berstatus '${sub.status}'. Hubungi administrasi Singularity.`);
  }
  return sub;
}

// Seat limit — dihitung dari pengguna aktif tenant. Dipanggil sebelum membuat
// user baru. null maxUsers = tak terbatas.
async function assertWithinUserLimit(client, tenantId) {
  const ent = await getEntitlements(client, tenantId);
  const max = ent.maxUsers;
  if (max === null || max === undefined) return;
  const count = Number((await client.query('SELECT count(*)::int n FROM app_users WHERE tenant_id=$1 AND active', [tenantId])).rows[0].n);
  if (count >= max) throw new AppError('PERMISSION_DENIED', `Batas ${max} pengguna paket Anda sudah tercapai. Upgrade paket untuk menambah.`);
}

module.exports = {
  listPlans, getSubscription, getEntitlements, subscribeTenant, setSubscriptionStatus,
  moduleAllowed, isModuleEnabled, assertModuleEnabled,
  subscriptionActive, assertSubscriptionActive, assertWithinUserLimit
};
