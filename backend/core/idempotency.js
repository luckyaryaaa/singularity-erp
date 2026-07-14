'use strict';
// Idempotency untuk operasi tulis kritis: permintaan duplikat dengan kunci sama
// mengembalikan hasil pertama dan tidak membuat transaksi ganda.

const { store } = require('../infrastructure/database/store');
const { uid, sha256, nowIso } = require('./util');

const TTL_MS = 24 * 60 * 60 * 1000;

function lookup(userId, operation, key) {
  if (!key) return null;
  const record = store.collection('idempotency_records')
    .findOne((row) => row.userId === userId && row.operation === operation && row.idempotencyKey === key);
  if (!record) return null;
  if (new Date(record.expiresAt).getTime() < Date.now()) return null;
  return record;
}

function save(userId, operation, key, requestBody, responseStatus, responseBody) {
  if (!key) return null;
  return store.collection('idempotency_records').insert({
    id: uid(),
    userId, operation, idempotencyKey: key,
    requestHash: sha256(JSON.stringify(requestBody || {})),
    responseStatus, responseBody,
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + TTL_MS).toISOString()
  });
}

// Bungkus handler tulis kritis dengan replay idempoten.
function withIdempotency({ user, operation, key, body }, execute) {
  const existing = lookup(user.id, operation, key);
  if (existing) return { status: existing.responseStatus, body: { ...existing.responseBody, idempotentReplay: true } };
  const result = execute();
  save(user.id, operation, key, body, result.status, result.body);
  return result;
}

module.exports = { lookup, save, withIdempotency };
