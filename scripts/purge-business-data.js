'use strict';
// PURGE DATA BISNIS — mengosongkan seluruh data transaksi & master agar sistem
// benar-benar bersih sebelum LAN-UAT / cut-over produksi.
//
// Urutan penghapusan TIDAK di-hardcode: diturunkan otomatis dari graf foreign
// key PostgreSQL (topological sort, anak lebih dulu) sehingga tetap benar
// walau skema bertambah di sprint berikutnya.
//
// DIPERTAHANKAN (fondasi & konfigurasi) — daftar KEEP di bawah.
// DIHAPUS: seluruh dokumen, master data, stok, jurnal, payroll, absensi,
//   audit trail, notifikasi, job, file/artifact, dan sekuens penomoran.
//
// Guard: DILARANG di PRODUCTION. Wajib konfirmasi --yes.
// Jalankan: npm run data:purge -- --yes
require('../backend/core/env').loadEnv();
const { Client } = require('pg');
const { environmentName } = require('../backend/core/env');
const fs = require('node:fs/promises');
const path = require('node:path');

// Fondasi & konfigurasi yang WAJIB bertahan (sistem tetap bisa dipakai).
const KEEP = new Set([
  'schema_migrations',
  // Identitas & akses
  'app_users', 'user_role_assignments', 'user_sessions', 'auth_challenges', 'session_devices',
  'sod_rules', 'access_overrides', 'access_reviews', 'access_review_items',
  'approval_policies', 'approval_policy_levels', 'approval_policy_versions',
  // Struktur organisasi
  'branches', 'legal_entities', 'business_units', 'departments', 'cost_centers', 'profit_centers',
  'plants', 'org_warehouses', 'storage_locations', 'storage_bins', 'work_centers', 'project_wbs',
  'fiscal_calendars', 'ledgers', 'organization_assets', 'organization_signatories',
  'organization_tax_identities', 'company_bank_accounts',
  // Konfigurasi akuntansi & aturan bisnis
  'chart_of_accounts', 'posting_profiles', 'posting_profile_legs',
  'payroll_rule_versions', 'asset_categories', 'dunning_policies', 'leave_policies',
  'work_shifts', 'work_calendar', 'hr_calendar_config', 'numbering_configurations',
  'match_tolerance_config', 'supplier_performance_policies', 'transaction_dimension_policies',
  'currencies', 'exchange_rates', 'report_schedules', 'report_saved_filters',
  'app_settings', 'system_settings', 'environment_settings',
  // Bukti operasional (bukan data uji): riwayat backup & drill restore wajib
  // bertahan karena menjadi evidence gate rilis & self-test.
  'backup_runs', 'reporting_refresh_runs',
  // Katalog & matriks referensi (di-seed migrasi, bukan data transaksi)
  'permission_catalog', 'approval_matrix', 'enterprise_roles', 'supplier_score_policies',
  'warehouse_bins', 'document_type_catalog', 'sop_catalog'
]);

// Tabel yang dipertahankan tetapi ISINYA data uji → dikosongkan bila diminta.
const ALWAYS_CLEAR = new Set(['audit_logs', 'domain_event_outbox', 'idempotency_records', 'accounting_periods']);

async function purgeOrder(client) {
  // Semua tabel dasar (bukan partisi anak — partisi ikut terhapus lewat induk).
  const tables = (await client.query(`
    SELECT c.relname FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')
      AND NOT EXISTS (SELECT 1 FROM pg_inherits i WHERE i.inhrelid = c.oid)
    ORDER BY c.relname`)).rows.map((r) => r.relname);
  // Graf FK: child → parent (abaikan self-reference).
  const fks = (await client.query(`
    SELECT DISTINCT src.relname child, tgt.relname parent
    FROM pg_constraint con
    JOIN pg_class src ON src.oid = con.conrelid
    JOIN pg_class tgt ON tgt.oid = con.confrelid
    WHERE con.contype='f' AND src.relname <> tgt.relname`)).rows;

  // Induk dari tabel KEEP: bila kolom FK-nya NULLABLE, cukup dikosongkan
  // (mis. app_users.employee_id) sehingga master tetap bisa dihapus. Bila
  // NOT NULL, induk terpaksa dipertahankan agar tidak melanggar constraint.
  const fkCols = (await client.query(`
    SELECT src.relname child, tgt.relname parent, a.attname col, a.attnotnull required
    FROM pg_constraint con
    JOIN pg_class src ON src.oid = con.conrelid
    JOIN pg_class tgt ON tgt.oid = con.confrelid
    JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = con.conkey[1]
    WHERE con.contype='f' AND src.relname <> tgt.relname`)).rows;
  const keep = new Set(KEEP);
  const detach = [];
  for (let changed = true; changed;) {
    changed = false;
    for (const { child, parent, col, required } of fkCols) {
      if (!keep.has(child) || ALWAYS_CLEAR.has(child) || keep.has(parent)) continue;
      if (required) { keep.add(parent); changed = true; }                 // wajib → induk bertahan
      else if (!detach.some((d) => d.child === child && d.col === col)) detach.push({ child, col, parent });
    }
  }
  const target = tables.filter((t) => !keep.has(t) || ALWAYS_CLEAR.has(t));
  return { order: sortByDependency(target, fks), detach: detach.filter((d) => target.includes(d.parent)) };
}

function sortByDependency(target, fks) {
  const parentsOf = new Map(target.map((t) => [t, new Set()]));
  for (const { child, parent } of fks) {
    if (parentsOf.has(child) && parentsOf.has(parent)) parentsOf.get(child).add(parent);
  }
  // Topological: keluarkan tabel yang tidak lagi menjadi INDUK bagi sisa —
  // artinya aman dihapus lebih dulu (tidak ada anak yang menunjuk padanya).
  const remaining = new Set(target), order = [];
  while (remaining.size) {
    const safe = [...remaining].filter((t) => ![...remaining].some((other) => other !== t && parentsOf.get(other)?.has(t)));
    if (!safe.length) { order.push(...remaining); break; }      // siklus → biarkan urutan apa adanya
    for (const t of safe) { order.push(t); remaining.delete(t); }
  }
  return order;
}

(async () => {
  const env = environmentName();
  if (env === 'PRODUCTION' || process.env.NODE_ENV === 'production') {
    console.error('DITOLAK: purge data dilarang di PRODUCTION.');
    process.exit(1);
  }
  if (!process.argv.includes('--yes')) {
    console.error(`Konfirmasi diperlukan. Jalankan: npm run data:purge -- --yes`);
    console.error(`Environment: ${env}. Seluruh data transaksi & master akan DIHAPUS PERMANEN.`);
    process.exit(1);
  }
  const client = new Client({ connectionString: process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL });
  await client.connect();
  const cleared = [];
  try {
    const { order, detach } = await purgeOrder(client);
    await client.query('BEGIN');
    // Lepas tautan opsional dari tabel konfigurasi ke master yang akan dihapus
    // (mis. app_users.employee_id) agar master benar-benar bisa dikosongkan.
    for (const d of detach) {
      const n = (await client.query(`UPDATE "${d.child}" SET "${d.col}"=NULL WHERE "${d.col}" IS NOT NULL`)).rowCount;
      if (n) cleared.push(`${d.child}.${d.col}→NULL(${n})`);
    }
    for (const table of order) {
      const before = Number((await client.query(`SELECT count(*)::int n FROM "${table}"`)).rows[0].n);
      if (!before) continue;
      await client.query(`DELETE FROM "${table}"`);
      cleared.push(`${table}(${before})`);
    }
    await client.query('COMMIT');
    for (const v of (await client.query(`SELECT matviewname FROM pg_matviews WHERE schemaname='public'`)).rows) {
      await client.query(`REFRESH MATERIALIZED VIEW ${v.matviewname}`).catch(() => {});
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('GAGAL:', error.message);
    process.exit(1);
  } finally { await client.end(); }

  let files = 0;
  for (const dir of ['storage/files', 'storage/artifacts']) {
    const root = path.join(__dirname, '..', dir);
    try {
      for (const entry of await fs.readdir(root)) { await fs.rm(path.join(root, entry), { recursive: true, force: true }); files++; }
    } catch { /* folder belum ada */ }
  }

  console.log(`PURGE SELESAI · environment ${env}`);
  console.log(`  Tabel dikosongkan : ${cleared.length}`);
  if (cleared.length) console.log(`    ${cleared.join(', ')}`);
  console.log(`  Folder file dibersihkan: ${files}`);
  console.log('  Dipertahankan: pengguna & akses, struktur organisasi, COA, posting profile,');
  console.log('                 aturan payroll/cuti/dunning, kategori aset, shift, kalender, penomoran.');
  console.log('\nBerikutnya: input master data real (atau import CSV) → saldo awal stok →');
  console.log('npm run cutover:opening-inventory');
})();
