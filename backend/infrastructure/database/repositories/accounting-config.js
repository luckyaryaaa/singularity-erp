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

module.exports = { resolvePostingProfile, resolvePayrollRules };
