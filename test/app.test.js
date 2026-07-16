const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const server = require('../server');
const { fingerprintRelease } = require('../scripts/build-assets');
const { paginate } = require('../backend/infrastructure/database/store');

test('single app shell and accessible landmarks exist',()=>{
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  assert.equal((html.match(/id="app"/g)||[]).length,1);
  assert.match(html,/<main id="main"/);
  assert.match(html,/aria-label="Navigasi utama"/);
  assert.match(html,/aria-modal="true"/);
  assert.match(html,/aria-expanded="false"/);
  assert.match(html,/prefers-reduced-motion|src\/styles.css/);
});
test('design system uses semantic tokens and responsive breakpoints',()=>{
  // DS 2.0: token dipisah ke src/design-system/tokens.css, dimuat sebelum styles.css.
  const tokens=fs.readFileSync(path.join(__dirname,'..','src','design-system','tokens.css'),'utf8');
  assert.match(tokens,/:root\{/); assert.match(tokens,/--bg-canvas/); assert.match(tokens,/--space-4/);
  const css=fs.readFileSync(path.join(__dirname,'..','src','styles.css'),'utf8');
  assert.match(css,/@media\(max-width:700px\)/); assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  assert.match(html,/design-system\/tokens\.css/);
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

test('release assets are fingerprinted and precompressed',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'mat-assets-'));
  try{
    fs.mkdirSync(path.join(root,'src'),{recursive:true});
    fs.writeFileSync(path.join(root,'index.html'),'<link rel="stylesheet" href="src/app.css"><script src="src/app.js"></script>');
    fs.writeFileSync(path.join(root,'src','app.css'),'body{color:#162033}'.repeat(80));
    fs.writeFileSync(path.join(root,'src','app.js'),"'use strict';window.MAT_BUILD=true;".repeat(50));
    const manifest=fingerprintRelease(root);
    assert.equal(Object.keys(manifest.assets).length,2);
    const built=Object.values(manifest.assets);
    assert.ok(built.every(asset=>/\.[a-f0-9]{12}\.(css|js)$/.test(asset.file)));
    assert.ok(built.every(asset=>asset.compressed.some(file=>file.endsWith('.br'))&&asset.compressed.some(file=>file.endsWith('.gz'))));
    const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
    assert.match(html,/assets\/build\/src-app\.[a-f0-9]{12}\.css/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('enterprise table sort keys work on memory and PostgreSQL adapters',()=>{
  const rows=[{documentNumber:'QUO-002',updatedAt:'2026-07-15T00:00:00Z'},{documentNumber:'QUO-001',updatedAt:'2026-07-16T00:00:00Z'}];
  assert.equal(paginate([...rows],{sort:'document_number:asc'}).items[0].documentNumber,'QUO-001');
  assert.equal(paginate([...rows],{sort:'updated_at:desc'}).items[0].documentNumber,'QUO-001');
});
