'use strict';
// Resolver konfigurasi akuntansi & payroll (R020 §18.2 / R021 §19.5).
// Menggantikan account mapping & tarif hardcoded dengan lookup effective-dated
// dari posting_profiles dan payroll_rule_versions.

const { AppError } = require('../../../core/errors');

// Pilih posting profile paling spesifik yang berlaku untuk dokumen.
// Spesifisitas: item_category cocok > default '*'; branch cocok > null;
// legal entity cocok > null; lalu priority terkecil; lalu versi tertinggi.
async function resolvePostingProfile(client, { transactionType, itemCategory = '*', legalEntityId = null, branchId = null, onDate }) {
  const date = onDate || new Date().toISOString().slice(0, 10);
  const profile = (await client.query(
    `SELECT * FROM posting_profiles
     WHERE transaction_type=$1 AND active
       AND item_category IN ($2,'*')
       AND (legal_entity_id IS NULL OR legal_entity_id=$3)
       AND (branch_id IS NULL OR branch_id=$4)
       AND effective_from<=$5 AND (effective_until IS NULL OR effective_until>=$5)
     ORDER BY (item_category=$2) DESC, (branch_id=$4) DESC, (legal_entity_id=$3) DESC, priority ASC, version DESC
     LIMIT 1`,
    [transactionType, itemCategory, legalEntityId, branchId, date])).rows[0];
  if (!profile) return null;
  const legs = (await client.query(
    `SELECT leg_no, side, account_code, amount_source, memo_suffix FROM posting_profile_legs WHERE profile_id=$1 ORDER BY leg_no`,
    [profile.id])).rows;
  if (!legs.length) throw new AppError('VALIDATION_ERROR', `Posting profile ${profile.code} tidak memiliki kaki jurnal.`);
  return {
    id: profile.id, code: profile.code, version: profile.version, transactionType,
    snapshot: { profileId: profile.id, code: profile.code, version: profile.version, resolvedAt: new Date().toISOString(), legs },
    legs
  };
}

// Kumpulkan seluruh aturan payroll aktif yang berlaku pada tanggal periode,
// beserta snapshot versi untuk disimpan di payroll_items.
async function resolvePayrollRules(client, onDate) {
  const date = onDate || new Date().toISOString().slice(0, 10);
  const rows = (await client.query(
    `SELECT DISTINCT ON (rule_type) rule_type, version, config FROM payroll_rule_versions
     WHERE active AND effective_from<=$1 AND (effective_until IS NULL OR effective_until>=$1)
     ORDER BY rule_type, effective_from DESC, version DESC`, [date])).rows;
  const byType = {};
  const snapshot = {};
  for (const r of rows) { byType[r.rule_type] = r.config; snapshot[r.rule_type] = { version: r.version, config: r.config }; }
  for (const required of ['BPJS', 'PTKP', 'PPH21', 'OVERTIME', 'ABSENCE']) {
    if (!byType[required]) throw new AppError('RESOURCE_NOT_FOUND', `Aturan payroll '${required}' belum dikonfigurasi untuk periode ini.`);
  }
  return { rules: byType, snapshot, resolvedAt: new Date().toISOString() };
}

// ── Peran akun semantik & tarif pajak (§35, migrasi 039) ───────────────────
// Menggantikan literal '1100'/'1300'/1.11 yang dulu tertanam di query laporan.
// Effective-dated: laporan periode lampau memakai pemetaan/tarif saat itu.
const asDate = (v) => {
  if (!v) return new Date().toISOString().slice(0, 10);
  const s = v instanceof Date ? v.toISOString() : String(v);
  return /^\d{4}-\d{2}$/.test(s) ? `${s}-01` : s.slice(0, 10);
};

// Cache resolusi konfigurasi. Nilai effective-dated praktis tidak berubah dalam
// satu periode, sedangkan resolver dipanggil berkali-kali per laporan. TTL
// pendek + invalidasi eksplisit saat konfigurasi ditulis: nilai basi paling
// lama 60 detik, dan langsung hilang begitu ada perubahan lewat API.
// HANYA hasil sukses yang di-cache — kegagalan "belum dipetakan" tidak
// di-cache agar perbaikan konfigurasi langsung berlaku.
const CACHE_TTL_MS = 60_000, CACHE_MAX = 500;
const configCache = new Map();
function cacheGet(key) {
  const hit = configCache.get(key);
  if (!hit) return undefined;
  if (hit.expires <= Date.now()) { configCache.delete(key); return undefined; }
  return hit.value;
}
function cacheSet(key, value) {
  if (configCache.size >= CACHE_MAX) configCache.clear();
  configCache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
  return value;
}
function invalidateConfigCache() { configCache.clear(); }

async function accountCode(client, roleKey, onDate) {
  return (await accountCodes(client, [roleKey], onDate))[roleKey];
}

// Beberapa peran sekaligus → { ROLE: 'kode' } (satu query untuk laporan).
async function accountCodes(client, roleKeys, onDate) {
  const date = asDate(onDate);
  const key = `role|${date}|${[...roleKeys].sort().join(',')}`;
  const cached = cacheGet(key);
  if (cached) return { ...cached };                          // salinan: pemanggil tidak dapat mengubah isi cache
  const rows = (await client.query(`SELECT DISTINCT ON (role_key) role_key, account_code FROM account_roles
    WHERE active AND role_key=ANY($1) AND effective_from<=$2 AND (effective_until IS NULL OR effective_until>=$2)
    ORDER BY role_key, effective_from DESC`, [roleKeys, date])).rows;
  const map = Object.fromEntries(rows.map((r) => [r.role_key, r.account_code]));
  const missing = roleKeys.filter((k) => !map[k]);
  if (missing.length) throw new AppError('RESOURCE_NOT_FOUND', `Peran akun belum dipetakan ke bagan akun: ${missing.join(', ')}. Lengkapi konfigurasi account_roles.`);
  return { ...cacheSet(key, map) };
}

async function taxRate(client, taxKey, onDate) {
  const date = asDate(onDate);
  const key = `tax|${date}|${taxKey}`;
  const cached = cacheGet(key);
  if (cached !== undefined) return cached;
  const row = (await client.query(`SELECT rate_pct FROM tax_rates
    WHERE active AND tax_key=$1 AND effective_from<=$2 AND (effective_until IS NULL OR effective_until>=$2)
    ORDER BY effective_from DESC LIMIT 1`, [taxKey, date])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', `Tarif pajak '${taxKey}' belum dikonfigurasi untuk periode ${date}.`);
  return cacheSet(key, Number(row.rate_pct));
}

async function listAccountRoles(client) {
  return { items: (await client.query(`SELECT r.*, c.name account_name FROM account_roles r
    LEFT JOIN chart_of_accounts c ON c.code=r.account_code AND c.active
    WHERE r.active ORDER BY r.role_key, r.effective_from DESC`)).rows };
}
async function listTaxRates(client) {
  return { items: (await client.query('SELECT * FROM tax_rates WHERE active ORDER BY tax_key, effective_from DESC')).rows };
}

// P0-H: periode akuntansi kini per Legal Entity. Resolver entitas default
// (instalasi MAT saat ini satu entitas) — dokumen yang membawa legal_entity_id
// sendiri selalu menang di pemanggil.
async function defaultLegalEntityId(client) {
  const key = 'entity|default';
  const cached = cacheGet(key);
  if (cached) return cached;
  const row = (await client.query('SELECT id FROM legal_entities ORDER BY active DESC, created_at LIMIT 1')).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Legal entity belum dikonfigurasi.');
  return cacheSet(key, row.id);
}

module.exports = { resolvePostingProfile, resolvePayrollRules, accountCode, accountCodes, taxRate, listAccountRoles, listTaxRates, invalidateConfigCache, defaultLegalEntityId };
