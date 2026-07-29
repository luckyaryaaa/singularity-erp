'use strict';
const { getPool } = require('./pool');
const { setRlsContext, setSessionTimezone } = require('./transaction');
const projector = require('./domain-work-projector');
const runtime = require('./repositories/runtime');
const events = require('../../core/events');

let timer = null;
let running = false;

function maxAttempts() {
  const value = Number.parseInt(process.env.OUTBOX_MAX_ATTEMPTS || '5', 10);
  return Number.isInteger(value) && value >= 1 && value <= 20 ? value : 5;
}
function retryDelaySeconds(attempt) {
  return Math.min(300, 5 * (2 ** Math.max(0, Number(attempt) - 1)));
}

async function dispatchBatch(limit = 50) {
  if (running) return 0;
  running = true;
  let client;
  const published = [];
  try {
    client = await getPool().connect();
    await client.query('BEGIN');
    await setSessionTimezone(client);
    await setRlsContext(client, null);
    const rows = (await client.query(
      `SELECT * FROM domain_event_outbox
       WHERE published_at IS NULL AND delivery_status='PENDING' AND next_attempt_at<=now()
       ORDER BY created_at,id
       FOR UPDATE SKIP LOCKED LIMIT $1`, [limit])).rows;
    for (const row of rows) {
      await client.query('SAVEPOINT dispatch_event');
      try {
        const projection = await projector.projectEvent(client, row);
        await client.query(
          `UPDATE domain_event_outbox
           SET published_at=now(),delivery_status='PUBLISHED',attempts=attempts+1,
             last_error=NULL,next_attempt_at=now()
           WHERE id=$1`, [row.id]);
        await client.query('RELEASE SAVEPOINT dispatch_event');
        published.push({ type: row.event_type, payload: row.payload, projection });
      } catch (error) {
        await client.query('ROLLBACK TO SAVEPOINT dispatch_event');
        const attempt = Number(row.attempts) + 1;
        const dead = attempt >= maxAttempts();
        await client.query(
          `UPDATE domain_event_outbox
           SET attempts=$2,last_error=$3,
             delivery_status=CASE WHEN $4 THEN 'DEAD_LETTER' ELSE 'PENDING' END,
             dead_lettered_at=CASE WHEN $4 THEN now() ELSE NULL END,
             next_attempt_at=CASE WHEN $4 THEN next_attempt_at
               ELSE now()+($5||' seconds')::interval END
           WHERE id=$1`,
          [row.id, attempt, String(error.message).slice(0, 1000), dead,
            String(retryDelaySeconds(attempt))]);
        if (dead) {
          await runtime.audit(client, {
            action: 'OUTBOX_DEAD_LETTER', module: 'system',
            entityType: 'DOMAIN_EVENT', entityId: row.id,
            documentNumber: row.event_type,
            oldValue: { status: 'PENDING', attempts: row.attempts },
            newValue: { status: 'DEAD_LETTER', attempts: attempt },
            reason: String(error.message).slice(0, 1000),
            requestId: row.id, branchId: row.branch_id
          });
        }
        await client.query('RELEASE SAVEPOINT dispatch_event');
      }
    }
    await client.query('COMMIT');
    for (const item of published) {
      try { events.publish(item.type, { ...item.payload, projection: item.projection }); }
      catch (error) {
        console.error(JSON.stringify({
          level: 'error', service: 'outbox-sse', eventType: item.type,
          message: error.message
        }));
      }
    }
    return rows.length;
  } catch (error) {
    if (client) { try { await client.query('ROLLBACK'); } catch { /* koneksi gagal */ } }
    throw error;
  } finally {
    if (client) client.release();
    running = false;
  }
}
function start(intervalMs = 1000) {
  if (timer) return;
  timer = setInterval(() => dispatchBatch().catch((error) => console.error(JSON.stringify({
    level: 'error', service: 'outbox', message: error.message
  }))), intervalMs);
  timer.unref();
}
function stop() { if (timer) { clearInterval(timer); timer = null; } }

module.exports = { dispatchBatch, start, stop, retryDelaySeconds, maxAttempts };
