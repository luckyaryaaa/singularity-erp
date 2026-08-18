'use strict';
// Singularity Control Plane — tenant provisioning & lifecycle. Runs in PLATFORM
// context (app.is_platform='on') so it can see/manage every tenant. Every action
// is gated on platform-operator authorization (NOT a tenant-user privilege).
const { AppError } = require('../../../core/errors');

const MAT_TENANT = '00000000-0000-0000-0000-000000000001';

async function isPlatformOperator(client, userId) {
  if (!userId) return false;
  return (await client.query('SELECT 1 FROM platform_operators WHERE user_id=$1', [userId])).rowCount > 0;
}

async function assertPlatformOperator(client, user) {
  if (!user || !(await isPlatformOperator(client, user.id))) {
    throw new AppError('PERMISSION_DENIED', 'Aksi ini hanya untuk operator platform Singularity.');
  }
}

function normalizeCode(code) {
  const c = String(code || '').trim().toLowerCase();
  if (!/^[a-z][a-z0-9_-]{1,31}$/.test(c)) {
    throw new AppError('VALIDATION_ERROR', 'Kode tenant tidak valid (mulai huruf, a-z 0-9 _ -, 2–32 karakter).');
  }
  return c;
}

// Idempotent: mengembalikan tenant yang sudah ada bila kode telah di-provision.
async function provisionTenant(client, user, { code, name, primaryDomain = null, isolation = 'pooled' } = {}) {
  await assertPlatformOperator(client, user);
  const c = normalizeCode(code);
  if (!name || String(name).trim().length < 2) throw new AppError('VALIDATION_ERROR', 'Nama tenant minimal 2 karakter.');
  if (!['pooled', 'siloed'].includes(isolation)) throw new AppError('VALIDATION_ERROR', 'isolation harus pooled atau siloed.');

  const existing = (await client.query('SELECT * FROM tenants WHERE code=$1', [c])).rows[0];
  if (existing) return { tenant: existing, created: false };

  const tenant = (await client.query(
    'INSERT INTO tenants(code,name,primary_domain,isolation) VALUES($1,$2,$3,$4) RETURNING *',
    [c, String(name).trim(), primaryDomain, isolation]
  )).rows[0];
  await client.query(
    "INSERT INTO tenant_provisioning_log(tenant_id,action,actor_user_id,detail) VALUES($1,'provision',$2,$3)",
    [tenant.id, user.id, JSON.stringify({ code: c, name, isolation })]
  );
  return { tenant, created: true };
}

// Baseline operasional untuk tenant baru: 1 legal entity + 1 branch default +
// 1 numbering config aktif (agar dokumen bisa dinomori — nextNumber membaca
// numbering_configurations aktif ter-scope tenant). Insert menyebut tenant_id
// eksplisit; is_platform di-on-kan agar WITH CHECK lolos. Idempotent-friendly:
// lewati bila legal entity untuk tenant sudah ada.
// Baseline akuntansi tenant baru — dikloning dari tenant kanonis #001 (MAT).
// Chart of Accounts + tarif pajak (PPN) + posting profiles (aturan jurnal otomatis)
// + kalender fiskal tahun berjalan. account_roles GLOBAL (legal_entity_id NULL) →
// resolve otomatis lewat kode COA yang sama, jadi tidak perlu di-seed per tenant.
// Semua ter-scope tenant_id eksplisit; dijalankan dalam konteks platform.
async function seedAccountingBaseline(client, tenantId, leId, branchId) {
  const coa = await client.query(
    `INSERT INTO chart_of_accounts(tenant_id,code,name,normal_side,category,active)
     SELECT $1,code,name,normal_side,category,active FROM chart_of_accounts WHERE tenant_id=$2`,
    [tenantId, MAT_TENANT]);
  const tax = await client.query(
    `INSERT INTO tax_rates(tenant_id,tax_key,rate_pct,description,effective_from,effective_until,active)
     SELECT $1,tax_key,rate_pct,description,effective_from,effective_until,active FROM tax_rates WHERE tenant_id=$2`,
    [tenantId, MAT_TENANT]);
  // Posting profiles + legs: id di-generate baru; LE/branch di-remap ke tenant baru
  // (profil dengan LE/branch NULL = default, tetap NULL).
  let postingProfiles = 0, postingLegs = 0;
  const src = (await client.query(
    `SELECT id,code,transaction_type,item_category,legal_entity_id,branch_id,priority,version,
            effective_from,effective_until,active,description
     FROM posting_profiles WHERE tenant_id=$1`, [MAT_TENANT])).rows;
  for (const pr of src) {
    const np = (await client.query(
      `INSERT INTO posting_profiles(code,transaction_type,item_category,legal_entity_id,branch_id,priority,
                                    version,effective_from,effective_until,active,description,tenant_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [pr.code, pr.transaction_type, pr.item_category, pr.legal_entity_id ? leId : null,
       pr.branch_id ? branchId : null, pr.priority, pr.version, pr.effective_from,
       pr.effective_until, pr.active, pr.description, tenantId])).rows[0];
    const lr = await client.query(
      `INSERT INTO posting_profile_legs(profile_id,leg_no,side,account_code,amount_source,memo_suffix,tenant_id)
       SELECT $1,leg_no,side,account_code,amount_source,memo_suffix,$2
       FROM posting_profile_legs WHERE profile_id=$3`, [np.id, tenantId, pr.id]);
    postingProfiles++; postingLegs += lr.rowCount;
  }
  const year = new Date().getUTCFullYear();
  await client.query(
    `INSERT INTO fiscal_calendars(legal_entity_id,fiscal_year,start_date,end_date,status,tenant_id)
     VALUES($1,$2,make_date($2,1,1),make_date($2,12,31),'OPEN',$3)
     ON CONFLICT (legal_entity_id,fiscal_year) DO NOTHING`, [leId, year, tenantId]);
  return { accounts: coa.rowCount, taxRates: tax.rowCount, postingProfiles, postingLegs, fiscalYear: year };
}

async function seedTenantBaseline(client, user, tenantId, opts = {}) {
  await assertPlatformOperator(client, user);
  const tenant = (await client.query('SELECT id FROM tenants WHERE id=$1', [tenantId])).rows[0];
  if (!tenant) throw new AppError('RESOURCE_NOT_FOUND', 'Tenant tidak ditemukan.');
  await client.query("SELECT set_config('app.is_platform','on',true)");
  const existing = (await client.query('SELECT id FROM legal_entities WHERE tenant_id=$1 LIMIT 1', [tenantId])).rows[0];
  if (existing) return { seeded: false };
  const leCode = opts.legalEntityCode || 'LE01', leName = opts.legalEntityName || 'Legal Entity 01';
  const brCode = opts.branchCode || 'HQ', brName = opts.branchName || 'Kantor Pusat';
  const le = (await client.query('INSERT INTO legal_entities(code,legal_name,tenant_id) VALUES($1,$2,$3) RETURNING id', [leCode, leName, tenantId])).rows[0];
  const branch = (await client.query('INSERT INTO branches(code,name,legal_entity_id,tenant_id) VALUES($1,$2,$3,$4) RETURNING id', [brCode, brName, le.id, tenantId])).rows[0];
  await client.query("INSERT INTO numbering_configurations(version,format,active,tenant_id) VALUES(1,'{PREFIX}-{BRANCH}-{MMYY}-{SEQ:3}',true,$1)", [tenantId]);
  const acc = await seedAccountingBaseline(client, tenantId, le.id, branch.id);
  return { seeded: true, legalEntityId: le.id, branchId: branch.id, ...acc };
}

// Onboarding: owner awal untuk sebuah tenant. Caller menyediakan passwordHash
// (control plane tidak menyimpan/melihat password plaintext). branchId opsional
// (home branch); tanpa itu owner tetap ber-scope global dalam tenant.
async function createTenantOwner(client, user, tenantId, { username, passwordHash, displayName, branchId = null } = {}) {
  await assertPlatformOperator(client, user);
  if (!username || !passwordHash || !displayName) throw new AppError('VALIDATION_ERROR', 'username, passwordHash, displayName wajib.');
  const tenant = (await client.query('SELECT id FROM tenants WHERE id=$1', [tenantId])).rows[0];
  if (!tenant) throw new AppError('RESOURCE_NOT_FOUND', 'Tenant tidak ditemukan.');
  const owner = (await client.query(
    `INSERT INTO app_users(username,password_hash,display_name,role,active,branch_scope,branch_id,tenant_id)
     VALUES($1,$2,$3,'owner',true,'*',$5,$4) RETURNING id,username,tenant_id`,
    [username, passwordHash, displayName, tenantId, branchId]
  )).rows[0];
  // Active primary role assignment — auth.login gates on an ACTIVE assignment
  // (access_valid). Tanpa ini owner tenant baru tidak bisa masuk.
  await client.query(
    "INSERT INTO user_role_assignments(user_id,role_code,reason,is_primary,status) VALUES($1,'owner',$2,true,'ACTIVE')",
    [owner.id, 'Initial tenant owner (control-plane provisioning)']
  );
  await client.query(
    "INSERT INTO tenant_provisioning_log(tenant_id,action,actor_user_id,detail) VALUES($1,'create_owner',$2,$3)",
    [tenantId, user.id, JSON.stringify({ username })]
  );
  return owner;
}

async function listTenants(client, user) {
  await assertPlatformOperator(client, user);
  return (await client.query(
    'SELECT id,code,name,status,isolation,primary_domain,created_at FROM tenants ORDER BY created_at'
  )).rows;
}

async function getTenant(client, user, id) {
  await assertPlatformOperator(client, user);
  const t = (await client.query('SELECT * FROM tenants WHERE id=$1', [id])).rows[0];
  if (!t) throw new AppError('RESOURCE_NOT_FOUND', 'Tenant tidak ditemukan.');
  return t;
}

// Composite tenant view for the operator console detail drawer (one round-trip).
async function tenantSummary(client, user, id) {
  await assertPlatformOperator(client, user);
  const tenant = (await client.query('SELECT * FROM tenants WHERE id=$1', [id])).rows[0];
  if (!tenant) throw new AppError('RESOURCE_NOT_FOUND', 'Tenant tidak ditemukan.');
  const users = (await client.query(
    `SELECT count(*)::int total, count(*) FILTER (WHERE role='owner')::int owners, count(*) FILTER (WHERE active)::int active
     FROM app_users WHERE tenant_id=$1`, [id])).rows[0];
  const owners = (await client.query(
    `SELECT username, display_name, email FROM app_users WHERE tenant_id=$1 AND role='owner' ORDER BY created_at LIMIT 6`, [id])).rows;
  const identities = (await client.query(
    `SELECT count(*)::int total, count(DISTINCT provider)::int providers
     FROM user_identities i JOIN app_users u ON u.id=i.user_id WHERE u.tenant_id=$1`, [id])).rows[0];
  const activity = (await client.query(
    'SELECT action, detail, created_at FROM tenant_provisioning_log WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 8', [id])).rows;
  return { tenant, users, owners, identities, activity };
}

async function setTenantStatus(client, user, id, status) {
  await assertPlatformOperator(client, user);
  if (!['active', 'suspended', 'offboarding'].includes(status)) throw new AppError('VALIDATION_ERROR', 'Status tidak valid.');
  const t = (await client.query(
    'UPDATE tenants SET status=$2, updated_at=now(), version=version+1 WHERE id=$1 RETURNING *', [id, status]
  )).rows[0];
  if (!t) throw new AppError('RESOURCE_NOT_FOUND', 'Tenant tidak ditemukan.');
  const action = status === 'suspended' ? 'suspend' : status === 'active' ? 'resume' : 'offboard';
  await client.query(
    'INSERT INTO tenant_provisioning_log(tenant_id,action,actor_user_id) VALUES($1,$2,$3)', [id, action, user.id]
  );
  return t;
}

// Resolver: Host header → tenant (dijalankan konteks platform, sebelum konteks
// tenant terbentuk). Cocokkan primary_domain lalu subdomain=code. Default (host
// tanpa tenant, mis. localhost) → MAT, kompatibilitas Fase 0 single-tenant.
async function resolveTenantByHost(client, host) {
  const h = String(host || '').toLowerCase().split(':')[0].trim();
  if (h && h !== 'localhost' && h !== '127.0.0.1') {
    const byDomain = (await client.query(
      "SELECT * FROM tenants WHERE lower(primary_domain)=$1 AND status<>'offboarding'", [h]
    )).rows[0];
    if (byDomain) return byDomain;
    const sub = h.split('.')[0];
    if (sub && sub !== 'www') {
      const byCode = (await client.query(
        "SELECT * FROM tenants WHERE code=$1 AND status<>'offboarding'", [sub]
      )).rows[0];
      if (byCode) return byCode;
    }
  }
  return (await client.query('SELECT * FROM tenants WHERE id=$1', [MAT_TENANT])).rows[0] || null;
}

// Self-service signup (PUBLIK — tanpa operator). Membuat tenant trial lengkap:
// tenant + baseline (LE/branch/numbering) + owner (bisa login, tanpa paksa ganti
// password karena ia yang memilih) + langganan trial. Divalidasi ketat; caller
// (route) menerapkan rate-limit + kebijakan password. Semua dalam satu transaksi.
async function publicSignup(client, { companyName, tenantCode, ownerUsername, passwordHash, ownerDisplayName, planCode = 'starter' } = {}) {
  const code = normalizeCode(tenantCode);
  if (!companyName || String(companyName).trim().length < 2) throw new AppError('VALIDATION_ERROR', 'Nama perusahaan minimal 2 karakter.');
  if (!ownerUsername || !passwordHash) throw new AppError('VALIDATION_ERROR', 'Username & password owner wajib.');
  await client.query("SELECT set_config('app.is_platform','on',true)");
  if ((await client.query('SELECT 1 FROM tenants WHERE code=$1', [code])).rowCount) throw new AppError('VALIDATION_ERROR', `Kode organisasi '${code}' sudah dipakai.`);
  if ((await client.query('SELECT 1 FROM app_users WHERE lower(username)=lower($1)', [ownerUsername])).rowCount) throw new AppError('VALIDATION_ERROR', 'Username sudah terpakai.');
  if (!(await client.query('SELECT 1 FROM plans WHERE code=$1 AND active', [planCode])).rowCount) throw new AppError('VALIDATION_ERROR', `Paket '${planCode}' tidak tersedia.`);

  const name = String(companyName).trim();
  const tenant = (await client.query('INSERT INTO tenants(code,name) VALUES($1,$2) RETURNING id,code,name', [code, name])).rows[0];
  const le = (await client.query('INSERT INTO legal_entities(code,legal_name,tenant_id) VALUES($1,$2,$3) RETURNING id', ['LE01', name, tenant.id])).rows[0];
  const branch = (await client.query('INSERT INTO branches(code,name,legal_entity_id,tenant_id) VALUES($1,$2,$3,$4) RETURNING id', ['HQ', 'Kantor Pusat', le.id, tenant.id])).rows[0];
  await client.query("INSERT INTO numbering_configurations(version,format,active,tenant_id) VALUES(1,'{PREFIX}-{BRANCH}-{MMYY}-{SEQ:3}',true,$1)", [tenant.id]);
  const owner = (await client.query(
    `INSERT INTO app_users(username,password_hash,display_name,role,active,branch_scope,branch_id,tenant_id,must_change_password)
     VALUES($1,$2,$3,'owner',true,'*',$5,$4,false) RETURNING id,username`,
    [ownerUsername, passwordHash, ownerDisplayName || ownerUsername, tenant.id, branch.id]
  )).rows[0];
  await client.query("INSERT INTO user_role_assignments(user_id,role_code,reason,is_primary,status) VALUES($1,'owner','Self-service signup',true,'ACTIVE')", [owner.id]);
  await client.query("INSERT INTO tenant_subscriptions(tenant_id,plan_id,status,trial_ends_at,current_period_end) SELECT $1,id,'trial',now()+interval '14 days',now()+interval '14 days' FROM plans WHERE code=$2", [tenant.id, planCode]);
  await client.query("INSERT INTO tenant_provisioning_log(tenant_id,action,detail) VALUES($1,'provision',$2)", [tenant.id, JSON.stringify({ signup: true, code, plan: planCode })]);
  return { tenant: { id: tenant.id, code: tenant.code, name: tenant.name }, owner: { id: owner.id, username: owner.username } };
}

module.exports = {
  MAT_TENANT, isPlatformOperator, assertPlatformOperator,
  provisionTenant, seedTenantBaseline, createTenantOwner, listTenants, getTenant, tenantSummary, setTenantStatus, resolveTenantByHost, publicSignup
};
