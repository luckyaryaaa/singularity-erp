'use strict';
const { readBody } = require('../core/util');
const { assertPermission } = require('../core/permissions');
const operations = require('../infrastructure/database/repositories/operations');
const runtime = require('../infrastructure/database/repositories/runtime');
const masterData = require('../infrastructure/database/repositories/master-data');
const masterGovernance = require('../infrastructure/database/repositories/master-governance');
const masterModules={customers:'customer',suppliers:'supplier',products:'product',employees:'employee'};
const { NO_MATCH } = require('./shared');

async function dispatch(client, req, url, ctx) {
  const p=url.pathname, method=req.method;
  let m;
  if(method==='GET'&&p==='/api/master-governance/currencies'){assertPermission(ctx.user,'dashboard.view');return{items:(await masterGovernance.listCurrencies(client)).map(runtime.camel)};}
  if(method==='GET'&&p==='/api/master-governance/exchange-rates'){assertPermission(ctx.user,'settings.view');return{items:(await masterGovernance.listExchangeRates(client,Object.fromEntries(url.searchParams))).map(runtime.camel)};}
  if(method==='POST'&&p==='/api/master-governance/exchange-rates'){assertPermission(ctx.user,'settings.edit');const body=await readBody(req);const item=runtime.camel(await masterGovernance.createExchangeRate(client,body,ctx.user));await runtime.audit(client,{userId:ctx.user.id,action:'UPSERT',module:'settings',entityType:'EXCHANGE_RATE',entityId:item.id,newValue:{fromCurrency:item.fromCurrency,toCurrency:item.toCurrency,rate:item.rate,effectiveDate:item.effectiveDate,source:item.source},requestId:ctx.requestId,branchId:ctx.user.branchId});ctx.status=201;return item;}
  if(method==='GET'&&p==='/api/master-governance/quality'){assertPermission(ctx.user,'settings.view');const result=await masterGovernance.qualityDashboard(client);return{summary:result.summary.map(runtime.camel),issues:result.issues.map(runtime.camel)};}
  if(method==='POST'&&p==='/api/master-governance/quality/scan'){assertPermission(ctx.user,'settings.edit');const result=await masterGovernance.scanQuality(client);await runtime.audit(client,{userId:ctx.user.id,action:'SCAN',module:'settings',entityType:'MASTER_DATA_QUALITY',newValue:{issues:result.issues.length},requestId:ctx.requestId,branchId:ctx.user.branchId});return{summary:result.summary.map(runtime.camel),issues:result.issues.map(runtime.camel)};}
  m=p.match(/^\/api\/master-governance\/products\/([0-9a-f-]{36})\/cost-trace$/);
  if(method==='GET'&&m){assertPermission(ctx.user,'product.view');const result=await masterGovernance.productCostTrace(client,m[1]);return{...result,product:runtime.camel(result.product),bom:runtime.camel(result.bom),lines:result.lines.map(runtime.camel)};}
  m=p.match(/^\/api\/(customers|suppliers|products|employees)$/);
  if(method==='GET'&&m){assertPermission(ctx.user,`${masterModules[m[1]]}.view`);return operations.listMaster(client,m[1],Object.fromEntries(url.searchParams));}
  if(method==='POST'&&m){const name=m[1],module=masterModules[name],body=await readBody(req);assertPermission(ctx.user,`${module}.create`);const item=await operations.createMaster(client,name,body,ctx.user);await runtime.audit(client,{userId:ctx.user.id,action:'CREATE',module,entityType:module.toUpperCase(),entityId:item.id,newValue:item,requestId:ctx.requestId,branchId:ctx.user.branchId});ctx.status=201;return item;}
  m=p.match(/^\/api\/(customers|suppliers|products|employees)\/([^/]+)$/);
  if(method==='PATCH'&&m){const name=m[1],module=masterModules[name],body=await readBody(req);assertPermission(ctx.user,`${module}.edit`);const item=await operations.updateMaster(client,name,m[2],body,ctx.user);await runtime.audit(client,{userId:ctx.user.id,action:'UPDATE',module,entityType:module.toUpperCase(),entityId:item.id,newValue:item,requestId:ctx.requestId,branchId:ctx.user.branchId});return item;}

  // ── Master data enterprise (R014/R015): overview, sub-resource, lifecycle ──
  m=p.match(/^\/api\/masters\/(employees|customers|suppliers|products)\/([0-9a-f-]{36})$/);
  if(method==='GET'&&m)return masterData.overview(client,m[1],m[2],ctx.user);
  m=p.match(/^\/api\/masters\/(employees|customers|suppliers|products)\/([0-9a-f-]{36})\/lifecycle$/);
  if(method==='POST'&&m){const body=await readBody(req);return masterData.lifecycle(client,m[1],m[2],body.action,body.reason,ctx.user,ctx.requestId);}
  m=p.match(/^\/api\/masters\/suppliers\/([0-9a-f-]{36})\/bank-accounts\/([0-9a-f-]{36})\/approve$/);
  if(method==='POST'&&m)return masterData.approveSupplierBank(client,m[1],m[2],ctx.user,ctx.requestId);
  m=p.match(/^\/api\/masters\/employees\/([0-9a-f-]{36})\/audit$/);
  if(method==='GET'&&m)return{items:await masterData.employeeAudit(client,m[1],ctx.user)};
  m=p.match(/^\/api\/masters\/employees\/([0-9a-f-]{36})\/(bank-accounts|compensation)\/([0-9a-f-]{36})\/(approve|reject)$/);
  if(method==='POST'&&m){const body=await readBody(req);return masterData.decideEmployeeSensitive(client,{employeeId:m[1],kind:m[2],rowId:m[3],decision:m[4],reason:body.reason,user:ctx.user,requestId:ctx.requestId});}
  m=p.match(/^\/api\/masters\/products\/([0-9a-f-]{36})\/cost-revisions\/([0-9a-f-]{36})\/(review|approve|lock|activate)$/);
  if(method==='POST'&&m)return m[3]==='activate'
    ?masterData.activateCostRevision(client,m[1],m[2],ctx.user,ctx.requestId)
    :masterData.promoteRevision(client,{table:'product_cost_revisions',parentCol:'product_id',parentId:m[1],rowId:m[2],action:m[3],user:ctx.user,requestId:ctx.requestId,module:'product'});
  m=p.match(/^\/api\/masters\/products\/([0-9a-f-]{36})\/bom\/([0-9a-f-]{36})\/(review|approve|effective)$/);
  if(method==='POST'&&m)return masterData.promoteRevision(client,{table:'bom_headers',parentCol:'product_id',parentId:m[1],rowId:m[2],action:m[3],user:ctx.user,requestId:ctx.requestId,module:'product'});
  m=p.match(/^\/api\/masters\/(employees|customers|suppliers|products)\/([0-9a-f-]{36})\/([a-z-]+)$/);
  if(method==='GET'&&m)return{items:await masterData.listSub(client,m[1],m[2],m[3],ctx.user)};
  if(method==='POST'&&m){const body=await readBody(req);ctx.status=201;return masterData.createSub(client,m[1],m[2],m[3],body,ctx.user,ctx.requestId);}
  if(method==='GET'&&p==='/api/branches'){if(!['owner','admin','hrd'].includes(ctx.user.role))assertPermission(ctx.user,'settings.view');return{items:(await client.query('SELECT id,code,name,active FROM branches WHERE active ORDER BY code')).rows.map(runtime.camel)};}
  return NO_MATCH;
}

module.exports={dispatch};
