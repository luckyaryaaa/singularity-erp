'use strict';
// Social identity → app user resolution. Links a verified provider identity to a
// user; on first sight it provisions a fresh tenant + owner (social self-service
// signup). Mirrors the session issuance the password login path uses.
const crypto = require('node:crypto');
const auth = require('./auth');

function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'tenant'; }
function rand() { return crypto.randomBytes(3).toString('hex'); }
function unusablePassword() { return auth.hashPassword('social-' + crypto.randomBytes(24).toString('hex')); }

async function findByIdentity(client, provider, subject) {
  return (await client.query(
    `SELECT u.* FROM user_identities i JOIN app_users u ON u.id = i.user_id
     WHERE i.provider = $1 AND i.provider_subject = $2 AND u.active`, [provider, subject]
  )).rows[0] || null;
}

async function findByEmail(client, email) {
  if (!email) return null;
  return (await client.query('SELECT * FROM app_users WHERE lower(email) = lower($1) AND active ORDER BY created_at LIMIT 1', [email])).rows[0] || null;
}

async function linkIdentity(client, user, profile) {
  await client.query(
    `INSERT INTO user_identities(user_id, tenant_id, provider, provider_subject, email, display_name, raw, last_login_at)
     VALUES($1,$2,$3,$4,$5,$6,$7, now())
     ON CONFLICT (provider, provider_subject)
       DO UPDATE SET email = EXCLUDED.email, display_name = EXCLUDED.display_name, raw = EXCLUDED.raw, last_login_at = now()`,
    [user.id, user.tenant_id || null, profile.provider, profile.subject, profile.email, profile.name, JSON.stringify(profile.raw || {})]
  );
}

async function uniqueUsername(client, seed) {
  let candidate = slug(seed).replace(/-/g, '.').slice(0, 40) || 'user';
  for (let i = 0; i < 6; i += 1) {
    if (!(await client.query('SELECT 1 FROM app_users WHERE lower(username) = lower($1)', [candidate])).rowCount) return candidate;
    candidate = `${slug(seed).replace(/-/g, '.')}.${rand()}`.slice(0, 40);
  }
  return `user.${rand()}${rand()}`;
}

async function uniqueTenantCode(client, seed) {
  let candidate = slug(seed);
  for (let i = 0; i < 6; i += 1) {
    if (!(await client.query('SELECT 1 FROM tenants WHERE code = $1', [candidate])).rowCount) return candidate;
    candidate = `${slug(seed)}-${rand()}`;
  }
  return `ws-${rand()}${rand()}`;
}

// Provision a brand-new tenant + owner from a social profile (self-service).
async function provisionFromSocial(client, profile) {
  await client.query("SELECT set_config('app.is_platform','on',true)");
  const person = profile.name || (profile.email ? profile.email.split('@')[0] : 'Workspace');
  const domainSeed = profile.email && profile.email.includes('@') ? profile.email.split('@')[1].split('.')[0] : person;
  const code = await uniqueTenantCode(client, domainSeed);
  const tenant = (await client.query('INSERT INTO tenants(code, name) VALUES($1,$2) RETURNING id, code, name', [code, `${person} Workspace`])).rows[0];
  const le = (await client.query('INSERT INTO legal_entities(code, legal_name, tenant_id) VALUES($1,$2,$3) RETURNING id', ['LE01', person, tenant.id])).rows[0];
  const branch = (await client.query('INSERT INTO branches(code, name, legal_entity_id, tenant_id) VALUES($1,$2,$3,$4) RETURNING id', ['HQ', 'Kantor Pusat', le.id, tenant.id])).rows[0];
  await client.query("INSERT INTO numbering_configurations(version, format, active, tenant_id) VALUES(1,'{PREFIX}-{BRANCH}-{MMYY}-{SEQ:3}', true, $1)", [tenant.id]);
  const username = await uniqueUsername(client, profile.email || person);
  const owner = (await client.query(
    `INSERT INTO app_users(username, password_hash, display_name, email, role, active, branch_scope, branch_id, tenant_id, must_change_password)
     VALUES($1,$2,$3,$4,'owner', true, '*', $5, $6, false) RETURNING *`,
    [username, unusablePassword(), profile.name, profile.email, branch.id, tenant.id]
  )).rows[0];
  await client.query("INSERT INTO user_role_assignments(user_id, role_code, reason, is_primary, status) VALUES($1,'owner','Social self-service signup', true, 'ACTIVE')", [owner.id]);
  await client.query("INSERT INTO tenant_subscriptions(tenant_id, plan_id, status, trial_ends_at, current_period_end) SELECT $1, id, 'trial', now()+interval '14 days', now()+interval '14 days' FROM plans WHERE code='starter'", [tenant.id]);
  await client.query("INSERT INTO tenant_provisioning_log(tenant_id, action, detail) VALUES($1,'provision',$2)", [tenant.id, JSON.stringify({ social: profile.provider, code })]);
  return owner;
}

// provider profile → { user, session, permissions, created }
async function findOrCreateFromSocial(client, { profile, ip, device }) {
  await client.query("SELECT set_config('app.is_platform','on',true)");
  let row = await findByIdentity(client, profile.provider, profile.subject);
  let created = false;
  if (!row && profile.email) row = await findByEmail(client, profile.email);   // link social to an existing email account
  if (!row) { row = await provisionFromSocial(client, profile); created = true; }
  await linkIdentity(client, row, profile);
  if (profile.email && !row.email) { await client.query('UPDATE app_users SET email = $2 WHERE id = $1', [row.id, profile.email]); }

  const tenant = row.tenant_id
    ? (await client.query('SELECT code, primary_domain FROM tenants WHERE id = $1', [row.tenant_id])).rows[0]
    : null;
  const user = auth.publicUser(row);
  const session = await auth.createSession(client, user, { ip, device });
  const permissions = await auth.permissionsForUser(client, user);
  return { user, session, permissions, created, tenant: tenant ? { code: tenant.code, primaryDomain: tenant.primary_domain } : null };
}

module.exports = { findOrCreateFromSocial };
