'use strict';

function databaseName(env = process.env) {
  if (env.DATABASE_URL) {
    try { return decodeURIComponent(new URL(env.DATABASE_URL).pathname.replace(/^\//, '')); }
    catch { return ''; }
  }
  return String(env.PGDATABASE || '');
}

function assertDedicatedUatDatabase(env = process.env) {
  const name = databaseName(env);
  if (!name || !/_uat(?:_|$)/i.test(name) || /_dev(?:_|$)/i.test(name)) {
    throw new Error(`UAT_DATABASE_BLOCKED: database '${name || '(tidak diketahui)'}' bukan database UAT khusus (*_uat).`);
  }
  return name;
}

module.exports = { databaseName, assertDedicatedUatDatabase };
