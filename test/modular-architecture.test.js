'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const lineCount = (relative) => read(relative).split(/\r?\n/).length;

test('frontend composition layer remains thin and domain modules load once', () => {
  assert.ok(lineCount('src/pages.js') <= 100, 'pages.js harus tetap menjadi PageKit composition layer tipis');
  assert.match(read('src/pages.js'), /window\.PageKit\s*=/);
  const html = read('index.html');
  const domains = ['workspace','documents','sales','procurement','inventory','production','finance','hr','master-data','organization','governance','my-work'];
  for (const domain of domains) {
    const ref = `src/modules/${domain}.js`;
    assert.equal((html.match(new RegExp(ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length, 1, `${ref} harus dimuat tepat sekali`);
    assert.ok(fs.existsSync(path.join(root, ref)), `${ref} wajib tersedia`);
  }
});

test('PostgreSQL API composition layer delegates all bounded domains', () => {
  assert.ok(lineCount('backend/api-postgres.js') <= 100, 'api-postgres.js harus tetap menjadi composition layer tipis');
  const api = read('backend/api-postgres.js');
  const domains = ['workspace','documents','procurement','operations','masters','organization','inventory','production','finance','hr','governance'];
  for (const domain of domains) assert.match(api, new RegExp(`routes/${domain}`));
  assert.doesNotMatch(api, /\/api\/(documents|inventory|accounting|governance)\//, 'endpoint domain tidak boleh kembali ke composition root');
});

test('backend route modules expose a shared no-match dispatch contract', () => {
  const { NO_MATCH } = require('../backend/routes/shared');
  assert.equal(typeof NO_MATCH, 'symbol');
  const domains = ['workspace','documents','procurement','operations','masters','organization','inventory','production','finance','hr','governance'];
  for (const domain of domains) assert.equal(typeof require(`../backend/routes/${domain}`).dispatch, 'function');
  const auth = require('../backend/routes/auth');
  assert.equal(typeof auth.dispatchPublic, 'function');
  assert.equal(typeof auth.dispatchPrivate, 'function');
});
