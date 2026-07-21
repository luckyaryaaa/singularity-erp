'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {ROUTE_MATRIX,PUBLIC_ENDPOINTS}=require('../backend/core/authorization-matrix');
const {hasPermission}=require('../backend/core/permissions');
const openapi=require('../backend/core/openapi');
const ROOT=path.join(__dirname,'..'),ROUTES=path.join(ROOT,'backend/routes');

test('authorization matrix mencakup seluruh bounded router dan 197 handler',()=>{
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
    total+=handlers;
  }
  assert.equal(total,197);
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
