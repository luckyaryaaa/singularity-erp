'use strict';
const { getPool } = require('./pool');
const { CROSS_BRANCH_ROLES } = require('../../core/permissions');
const { TIMEZONE } = require('../../core/business-date');

// Tanpa user (job internal, migrasi, boot) konteks disetel eksplisit ke mode
// sistem, BUKAN dibiarkan kosong — policy harus dapat membedakan "sistem" dari
// "pengguna yang cabangnya belum diketahui".
// Zona waktu sesi disamakan dengan zona waktu bisnis aplikasi. Tanpa ini,
// `current_date` di database mengikuti konfigurasi server — di VPS umumnya UTC —
// sehingga berbeda tujuh jam dari tanggal bisnis yang dipakai aplikasi.
async function setSessionTimezone(client) {
  await client.query('SELECT set_config($1,$2,true)', ['TimeZone', TIMEZONE]);
}

// Fase 0 · Tenantize — dimensi tenant di atas konteks branch yang sudah ada
// (migrasi 090: app_tenant_visible membaca app.tenant_id & app.is_platform).
// Enforcement dinaikkan BERTAHAP agar rollout tidak memutus operasi:
//   • user-less (boot/worker/outbox/lookup login) → PLATFORM (lihat semua
//     tenant) — mempertahankan semantik is_system pada dimensi tenant;
//   • pengguna terautentikasi → ter-scope ke user.tenantId (diisi auth layer);
//   • job ter-scope tenant → withTransaction(work, { tenantId });
//   • maintenance lintas-tenant sadar-risiko → withTransaction(work, { platform:true }).
// Bypass tenant (app.is_platform) SENGAJA terpisah dari bypass branch
// (app.is_system): peran cross-branch (owner/admin/auditor) tetap terkurung
// di tenant-nya. Gerbang fail-closed penuh aktif via TENANT_ENFORCEMENT=strict
// setelah auth layer mengisi tenantId dan tranche 091+ memasang policy tabel bisnis.
async function setRlsContext(client, user, options = {}) {
  const crossBranch = !user || CROSS_BRANCH_ROLES.includes(user.role) || user.branchScope === '*';
  const tenantId = user?.tenantId || options.tenantId || '';
  const platform = options.platform === true || (!user && !options.tenantId);
  if (process.env.TENANT_ENFORCEMENT === 'strict' && !platform && !tenantId) {
    throw new Error('Tenant context wajib untuk transaksi non-platform.');
  }
  await client.query('SELECT set_config($1,$2,true)', ['app.tenant_id', tenantId ? String(tenantId) : '']);
  await client.query('SELECT set_config($1,$2,true)', ['app.is_platform', platform ? 'on' : 'off']);
  await client.query('SELECT set_config($1,$2,true)', ['app.user_id', user?.id ? String(user.id) : '']);
  await client.query('SELECT set_config($1,$2,true)', ['app.branch_id', user?.branchId ? String(user.branchId) : '']);
  await client.query('SELECT set_config($1,$2,true)', ['app.cross_branch', crossBranch ? 'on' : 'off']);
  await client.query('SELECT set_config($1,$2,true)', ['app.is_system', user ? 'off' : 'on']);
}

async function withTransaction(work, options = {}) {
  const client = await getPool().connect();
  const isolation = options.isolation || 'READ COMMITTED';
  if (!['READ COMMITTED','REPEATABLE READ','SERIALIZABLE'].includes(isolation)) throw new Error('Isolation level tidak valid.');
  try {
    await client.query('BEGIN');
    await client.query(`SET TRANSACTION ISOLATION LEVEL ${isolation}`);
    if (options.timeoutMs) await client.query('SET LOCAL statement_timeout = $1', [String(options.timeoutMs)]);
    // B5 — konteks Row Level Security. Ditanam SEKALI di sini supaya setiap
    // transaksi membawa identitas pemanggilnya; policy database membaca
    // variabel ini sebagai lapisan pertahanan kedua di belakang pemeriksaan
    // aplikasi. SET LOCAL berarti nilainya hilang saat transaksi selesai, jadi
    // koneksi yang kembali ke pool tidak pernah membawa konteks pengguna lain.
    await setSessionTimezone(client);
    await setRlsContext(client, options.user, options);
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* koneksi akan dibuang oleh pool bila rusak */ }
    throw error;
  } finally { client.release(); }
}

async function withSerializableRetry(work, { attempts = 3, timeoutMs = 30_000, user, tenantId, platform } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try { return await withTransaction(work, { isolation: 'SERIALIZABLE', timeoutMs, user, tenantId, platform }); }
    catch (error) {
      if (!['40001','40P01'].includes(error.code) || attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 25 * attempt));
    }
  }
}

module.exports = { withTransaction, withSerializableRetry, setRlsContext, setSessionTimezone };
