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
test('dashboard decision cockpit is intelligent, personalizable, and accessible',()=>{
  const workspace=fs.readFileSync(path.join(__dirname,'..','src','modules','workspace.js'),'utf8');
  const reporting=fs.readFileSync(path.join(__dirname,'..','src','modules','executive-reporting.js'),'utf8');
  const css=fs.readFileSync(path.join(__dirname,'..','src','styles.css'),'utf8');
  for(const marker of ['decision-context','business-pulse','decision-kpis','decision-priority','decision-insights','data-dashboard-widget']) assert.match(workspace,new RegExp(marker));
  assert.match(workspace,/data\.entitlements/,'dashboard tetap mengikuti entitlement server');
  assert.match(workspace,/DASHBOARD_PREFS_KEY/,'personalisasi dashboard wajib tersimpan');
  assert.match(workspace,/aria-label="Skor kesehatan bisnis/,'Business Pulse wajib punya ringkasan aksesibel');
  assert.match(reporting,/exec-point/,'grafik eksekutif wajib menyediakan titik data interaktif');
  assert.match(css,/@keyframes pulseCoreBreath/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)[\s\S]*pulse-core/,'motion dashboard wajib dapat dinonaktifkan');
});
test('enterprise spaces registry and navigation artwork are normalized and CSP-safe',()=>{
  const iconDir=path.join(__dirname,'..','assets','icons','navigation');
  const files=fs.readdirSync(iconDir).filter((file)=>file.endsWith('.png'));
  assert.equal(files.length,21,'seluruh ikon navigasi pilihan pengguna tersedia');
  for(const file of files){
    const png=fs.readFileSync(path.join(iconDir,file));
    assert.equal(png.readUInt32BE(16),96,`${file} wajib selebar 96px`);
    assert.equal(png.readUInt32BE(20),96,`${file} wajib setinggi 96px`);
  }
  const app=fs.readFileSync(path.join(__dirname,'..','src','app.js'),'utf8');
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  const css=fs.readFileSync(path.join(__dirname,'..','src','styles.css'),'utf8');
  assert.match(app,/const NAVIGATION = \[/,'registry menjadi satu sumber navigasi');
  assert.equal((app.match(/route\('#\//g)||[]).length,63,'seluruh 63 route sidebar wajib terdaftar');
  assert.equal((app.match(/art: '/g)||[]).length,21,'21 artwork pengguna wajib dipetakan eksplisit');
  assert.match(app,/nav-glyph/,'menu tanpa artwork raster wajib memakai glyph clay yang konsisten');
  assert.match(app,/mat\.nav\.pinned/); assert.match(app,/mat\.nav\.recent/);
  assert.match(html,/id="spaceRail"/); assert.match(html,/class="context-nav"/);
  assert.match(css,/VISUAL SYSTEM 5\.0 · MAT ENTERPRISE SPACES/);
  assert.doesNotMatch(app,/\.style\./,'shell tidak boleh membuat inline style yang diblokir CSP');
});
test('all sidebar routes receive a consistent enterprise workbench archetype',()=>{
  const app=fs.readFileSync(path.join(__dirname,'..','src','app.js'),'utf8');
  const css=fs.readFileSync(path.join(__dirname,'..','src','styles.css'),'utf8');
  for(const archetype of ['overview','workbench','control','people','records']){
    assert.match(app,new RegExp(`${archetype}:|archetype: '${archetype}'`),`${archetype} wajib terdaftar pada shell`);
    assert.match(css,new RegExp(`\\.workbench-${archetype}`),`${archetype} wajib punya signature visual`);
  }
  assert.match(app,/function decorateWorkbench\(/,'seluruh halaman dibungkus workbench bersama');
  assert.match(app,/new MutationObserver/,'render ulang halaman tetap menerima workbench');
  assert.match(app,/mat\.workbench\.density/,'densitas area kerja tersimpan per pengguna');
  assert.match(app,/aria-label="Breadcrumb"/,'konteks proses harus dapat dinavigasi pembaca layar');
  assert.match(css,/VISUAL SYSTEM 6\.0 · MAT WORKBENCH HORIZON/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)[^{]*\{[^}]*\.workbench-canvas/,'motion workbench wajib dapat dinonaktifkan');
});
test('customer and supplier use secure Party 360 identity workspaces',()=>{
  const master=fs.readFileSync(path.join(__dirname,'..','src','modules','master-data.js'),'utf8');
  const pages=fs.readFileSync(path.join(__dirname,'..','src','pages.js'),'utf8');
  const table=fs.readFileSync(path.join(__dirname,'..','src','components','enterprise-table.js'),'utf8');
  const css=fs.readFileSync(path.join(__dirname,'..','src','styles.css'),'utf8');
  const migration=fs.readFileSync(path.join(__dirname,'..','data','migrations','085_party_profile_photos.sql'),'utf8');
  const routes=fs.readFileSync(path.join(__dirname,'..','backend','routes','masters.js'),'utf8');
  const files=fs.readFileSync(path.join(__dirname,'..','backend','infrastructure','files','private-storage.js'),'utf8');
  for(const marker of ['partyIdentityHero','partyIdentityCell','partyAvatar','partyPhotoInput']) assert.match(master,new RegExp(marker));
  assert.match(master,/creditLimitAmount/,'form customer wajib menulis field batas kredit kanonis');
  assert.match(pages,/PARTY 360 DIRECTORY/); assert.match(pages,/party-directory-table/); assert.match(table,/config\.afterRender/); assert.match(table,/config\.className/);
  assert.match(css,/VISUAL SYSTEM 7\.0 · PARTY 360 IDENTITY/); assert.match(css,/\.party-avatar img\{[^}]*object-fit:cover/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.party-avatar/,'motion Party 360 wajib menghormati preferensi aksesibilitas');
  assert.match(migration,/customers[\s\S]*profile_file_id/); assert.match(migration,/suppliers[\s\S]*profile_file_id/);
  assert.match(routes,/profile-photo/); assert.match(files,/access_level='MASTER_PROFILE'/,'foto profil tetap memakai private file metadata');
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
