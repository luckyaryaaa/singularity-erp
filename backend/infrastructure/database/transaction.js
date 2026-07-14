'use strict';
const { getPool } = require('./pool');

async function withTransaction(work, options = {}) {
  const client = await getPool().connect();
  const isolation = options.isolation || 'READ COMMITTED';
  if (!['READ COMMITTED','REPEATABLE READ','SERIALIZABLE'].includes(isolation)) throw new Error('Isolation level tidak valid.');
  try {
    await client.query('BEGIN');
    await client.query(`SET TRANSACTION ISOLATION LEVEL ${isolation}`);
    if (options.timeoutMs) await client.query('SET LOCAL statement_timeout = $1', [String(options.timeoutMs)]);
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

module.exports = { withTransaction, withSerializableRetry };
