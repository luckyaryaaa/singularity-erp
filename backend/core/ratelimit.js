'use strict';
// Rate limiting per kelas endpoint (bukan satu batas global yang restriktif).

const { AppError } = require('./errors');

const POLICIES = {
  read:   { limit: 120, windowMs: 60_000 },
  write:  { limit: 30,  windowMs: 60_000 },
  login:  { limit: 5,   windowMs: 15 * 60_000 },
  pdf:    { limit: 10,  windowMs: 60_000 },
  export: { limit: 3,   windowMs: 60_000 }
};

const buckets = new Map();
let hits = 0; let rejected = 0;

function consume(policyName, key) {
  const policy = POLICIES[policyName] || POLICIES.read;
  const bucketKey = `${policyName}:${key}`;
  const now = Date.now();
  let bucket = buckets.get(bucketKey);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + policy.windowMs };
    buckets.set(bucketKey, bucket);
  }
  bucket.count += 1; hits += 1;
  if (bucket.count > policy.limit) {
    rejected += 1;
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    throw new AppError('RATE_LIMITED', `Batas ${policy.limit} permintaan/${Math.round(policy.windowMs / 1000)} detik untuk '${policyName}' tercapai.`, { retryAfterSeconds: retryAfter });
  }
  return { remaining: policy.limit - bucket.count, resetAt: bucket.resetAt };
}

// Pembersihan berkala agar bucket kedaluwarsa tidak menumpuk.
function sweep() {
  const now = Date.now();
  for (const [key, bucket] of buckets) if (now >= bucket.resetAt) buckets.delete(key);
}

function stats() { return { activeBuckets: buckets.size, totalHits: hits, totalRejected: rejected, policies: POLICIES }; }
function resetAll() { buckets.clear(); hits = 0; rejected = 0; }

module.exports = { consume, sweep, stats, resetAll, POLICIES };
