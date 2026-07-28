'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {ROUTE_MATRIX,PUBLIC_ENDPOINTS}=require('../backend/core/authorization-matrix');
const {hasPermission}=require('../backend/core/permissions');
const openapi=require('../backend/core/openapi');
const ROOT=path.join(__dirname,'..'),ROUTES=path.join(ROOT,'backend/routes');

test('authorization matrix mencakup seluruh bounded router dan 286 handler',()=>{
  const actual=fs.readdirSync(ROUTES).filter(x=>x.endsWith('.js')&&x!=='shared.js').sort();
  assert.deepEqual([...ROUTE_MATRIX.map(x=>x.file)].sort(),actual);
  let total=0;
  for(const row of ROUTE_MATRIX){
    const source=fs.readFileSync(path.join(ROUTES,row.file),'utf8');
    const handlers=(source.match(/method\s*===\s*'(?:GET|POST|PATCH|DELETE)'/g)||[]).length;
    const guards=(source.match(/assertPermission\(/g)||[]).length;
    assert.equal(handlers,row.handlers,`${row.file}: endpoint berubah; matriks wajib diperbarui`);
    assert.ok(guards>=row.directGuards,`${row.file}: direct permission guard berkurang`);
    assert.ok(row.strategy&&row.evidence.length,`${row.file}: strategi/evidence wajib`);
    for(const evidence of row.evidence)assert.ok(fs.existsSync(path.join(ROOT,evidence)),`${row.file}: evidence ${evidence} hilang`);
    // G2 — akuntansi handler LENGKAP: setiap handler wajib terklasifikasi sebagai
    // guard langsung, delegasi repo, atau publik. Handler baru tanpa penjaga apa
    // pun tidak bisa lolos: entah handlers berubah (assert di atas) atau akuntansi
    // ini pecah.
    assert.equal(row.directGuards+row.delegated+row.public,row.handlers,`${row.file}: akuntansi handler tidak lengkap (direct ${row.directGuards}+delegasi ${row.delegated}+publik ${row.public} != ${row.handlers})`);
    total+=handlers;
  }
  assert.equal(total,286);
});

test('semua permission literal mempunyai jalur allow dan deny',()=>{
  const roles=['system_admin','security_admin','finance_manager','accounting','tax','hrd','sales','procurement','warehouse','production','auditor','employee'];
  const authenticatedUniversal=new Set(['dashboard.view','notification.view']);
  const codes=new Set();
  for(const row of ROUTE_MATRIX){
    const source=fs.readFileSync(path.join(ROUTES,row.file),'utf8');
    for(const match of source.matchAll(/assertPermission\(ctx\.user,\s*'([^']+)'/g))codes.add(match[1]);
  }
  assert.ok(codes.size>=45,`hanya ${codes.size} permission literal terdeteksi`);
  for(const code of codes){
    assert.equal(hasPermission({role:'owner'},code),true,`${code}: Owner harus memiliki jalur allow`);
    if(!authenticatedUniversal.has(code))assert.ok(roles.some(role=>!hasPermission({role},code)),`${code}: wajib memiliki minimal satu jalur deny`);
  }
});

test('public allowlist eksplisit dan endpoint OpenAPI lain mewajibkan sesi',()=>{
  const publicFromSpec=openapi.ENDPOINTS.filter(x=>x[4]?.public).map(x=>`${x[0]} ${x[1]}`).sort();
  const documented=PUBLIC_ENDPOINTS.filter(x=>openapi.ENDPOINTS.some(e=>`${e[0]} ${e[1]}`===x)).sort();
  assert.deepEqual(publicFromSpec,documented);
  const spec=openapi.spec('localhost');
  for(const [method,endpoint,,,options={}] of openapi.ENDPOINTS){
    const security=spec.paths[endpoint][method.toLowerCase()].security;
    assert.deepEqual(security,options.public?[]:[{cookieAuth:[]}],`${method} ${endpoint}`);
  }
  const dispatcher=fs.readFileSync(path.join(ROOT,'backend/api-postgres.js'),'utf8');
  assert.ok(dispatcher.indexOf('auth.resolveSession')<dispatcher.indexOf('for(const routes of domainRoutes)'), 'session guard wajib mendahului seluruh domain router');
});

test('konteks RLS ditanam ulang dengan user nyata sebelum router domain (G1)',()=>{
  // withTransaction menanam setRlsContext saat BEGIN dengan user undefined (sesi
  // belum di-resolve). Tanpa penanaman ulang setelah resolveSession, seluruh
  // request domain berjalan sebagai app.is_system=on/app.cross_branch=on dan RLS
  // sebagai pertahanan kedua mati. Regression guard untuk urutannya.
  const dispatcher=fs.readFileSync(path.join(ROOT,'backend/api-postgres.js'),'utf8');
  const resolve=dispatcher.indexOf('auth.resolveSession');
  const reseat=dispatcher.indexOf('setRlsContext(client,resolved.user)');
  const domain=dispatcher.indexOf('for(const routes of domainRoutes)');
  assert.ok(reseat>resolve,'setRlsContext(resolved.user) wajib SETELAH resolveSession');
  assert.ok(reseat<domain,'setRlsContext(resolved.user) wajib SEBELUM router domain menyentuh data');
});

test('dokumen keamanan tidak boleh drift dari ROUTE_MATRIX (G3)',()=>{
  const total=ROUTE_MATRIX.reduce((n,r)=>n+r.handlers,0);
  const matrixDoc=fs.readFileSync(path.join(ROOT,'docs/security/endpoint-authorization-matrix.md'),'utf8');
  const secModel=fs.readFileSync(path.join(ROOT,'docs/security/security-model.md'),'utf8');
  const matrixTotal=Number((matrixDoc.match(/dan\s+(\d+)\s+handler/)||[])[1]);
  const secTotal=Number((secModel.match(/dan\s+(\d+)\s+handler/)||[])[1]);
  assert.equal(matrixTotal,total,`endpoint-authorization-matrix.md menyebut ${matrixTotal} handler, seharusnya ${total}`);
  assert.equal(secTotal,total,`security-model.md menyebut ${secTotal} handler, seharusnya ${total}`);
  const gov=ROUTE_MATRIX.find(r=>r.file==='governance.js').handlers;
  assert.ok(matrixDoc.includes(`| Governance | ${gov} |`),`baris Governance di matriks doc harus ${gov} handler`);
});

test('penolakan otorisasi dicatat ke log terstruktur authz_denied (G4)',()=>{
  const dispatcher=fs.readFileSync(path.join(ROOT,'backend/api-postgres.js'),'utf8');
  assert.match(dispatcher,/event:'authz_denied'/,'dispatcher wajib mencatat authz_denied pada penolakan izin');
  assert.ok(dispatcher.includes("e.code==='PERMISSION_DENIED'"),'log authz_denied wajib dipicu oleh PERMISSION_DENIED');
});
