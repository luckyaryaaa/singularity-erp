'use strict';
const { getPool } = require('./pool');
const { CROSS_BRANCH_ROLES } = require('../../core/permissions');

// Tanpa user (job internal, migrasi, boot) konteks disetel eksplisit ke mode
// sistem, BUKAN dibiarkan kosong — policy harus dapat membedakan "sistem" dari
// "pengguna yang cabangnya belum diketahui".
async function setRlsContext(client, user) {
  const crossBranch = !user || CROSS_BRANCH_ROLES.includes(user.role) || user.branchScope === '*';
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
    await setRlsContext(client, options.user);
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* koneksi akan dibuang oleh pool bila rusak */ }
    throw error;
  } finally { client.release(); }
}

async function withSerializableRetry(work, { attempts = 3, timeoutMs = 30_000 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try { return await withTransaction(work, { isolation: 'SERIALIZABLE', timeoutMs }); }
    catch (error) {
      if (!['40001','40P01'].includes(error.code) || attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 25 * attempt));
    }
  }
}

module.exports = { withTransaction, withSerializableRetry, setRlsContext };
