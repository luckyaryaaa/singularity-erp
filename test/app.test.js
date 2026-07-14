const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const server = require('../server');

test('single app shell and accessible landmarks exist',()=>{
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  assert.equal((html.match(/id="app"/g)||[]).length,1);
  assert.match(html,/<main id="main"/);
  assert.match(html,/aria-label="Navigasi utama"/);
  assert.match(html,/prefers-reduced-motion|src\/styles.css/);
});
test('design system uses semantic tokens and responsive breakpoints',()=>{
  const css=fs.readFileSync(path.join(__dirname,'..','src','styles.css'),'utf8');
  assert.match(css,/:root\{/); assert.match(css,/@media\(max-width:700px\)/); assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
test('server returns security headers and prevents traversal',async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const {port}=server.address();
  const response=await fetch(`http://127.0.0.1:${port}/index.html`);
  assert.equal(response.status,200); assert.equal(response.headers.get('x-frame-options'),'DENY');
  const missing=await fetch(`http://127.0.0.1:${port}/missing`); assert.equal(missing.status,404);
  for (const sensitive of ['/data/migrations/001_core_foundation.sql','/data/runtime/state.json','/backend/core/auth.js','/test/api.test.js','/.git/config','/.vscode/launch.json','/package.json','/%2e%2e/server.js']) {
    const blocked=await fetch(`http://127.0.0.1:${port}${sensitive}`);
    assert.equal(blocked.status,404,`${sensitive} harus diblokir`);
  }
  await new Promise(resolve=>server.close(resolve));
});
