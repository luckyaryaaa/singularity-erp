'use strict';
const { readBody } = require('../core/util');
const { assertPermission } = require('../core/permissions');
const operations = require('../infrastructure/database/repositories/operations');
const inventoryLots = require('../infrastructure/database/repositories/inventory');
const binExecution = require('../infrastructure/database/repositories/bin-execution');
const { AppError } = require('../core/errors');
const { NO_MATCH } = require('./shared');

async function dispatch(client, req, url, ctx) {
  const p=url.pathname, method=req.method;
  let m;
  if(method==='GET'&&p==='/api/inventory'){assertPermission(ctx.user,'inventory.view');return operations.listInventory(client,ctx.user,Object.fromEntries(url.searchParams));}
  // Sprint 11 (R018) — lot/heat traceability, valuasi, dan stock opname.
  // Eksekusi bin — storage_locations/warehouse_bins ada sejak migrasi 012
  // tetapi tidak pernah dirujuk kode apa pun sampai migrasi 058.
  if(method==='GET'&&p==='/api/inventory/bins')
    return binExecution.listBins(client,{branchId:url.searchParams.get('branchId')||ctx.user.branchId,user:ctx.user});
  m=p.match(/^\/api\/inventory\/bins\/([0-9a-f-]{36})$/);
  if(method==='GET'&&m)return binExecution.binContents(client,m[1],ctx.user);
  if(method==='GET'&&p==='/api/inventory/locate'){
    const productId=url.searchParams.get('productId');
    if(!productId)throw new AppError('VALIDATION_ERROR','productId wajib diisi.');
    return binExecution.locateProduct(client,{productId,branchId:url.searchParams.get('branchId')||ctx.user.branchId,user:ctx.user});
  }
  m=p.match(/^\/api\/inventory\/lots\/([0-9a-f-]{36})\/putaway$/);
  if(method==='POST'&&m){const body=await readBody(req);
    return binExecution.putaway(client,{lotId:m[1],binId:body.binId,reason:body.reason,user:ctx.user,requestId:ctx.requestId});}

  if(method==='GET'&&p==='/api/inventory/lots'){assertPermission(ctx.user,'inventory.view');return inventoryLots.listLots(client,ctx.user,Object.fromEntries(url.searchParams));}
  if(method==='GET'&&p==='/api/inventory/valuation'){assertPermission(ctx.user,'inventory.view');return inventoryLots.valuation(client,ctx.user,Object.fromEntries(url.searchParams));}
  m=p.match(/^\/api\/inventory\/lots\/([0-9a-f-]{36})$/);
  if(method==='GET'&&m){assertPermission(ctx.user,'inventory.view');return inventoryLots.lotDetail(client,m[1],ctx.user);}
  m=p.match(/^\/api\/inventory\/lots\/([0-9a-f-]{36})\/(block|quarantine|release)$/);
  if(method==='POST'&&m){assertPermission(ctx.user,'inventory.edit');const body=await readBody(req);return inventoryLots.setLotStatus(client,{lotId:m[1],action:m[2],reason:body.reason,user:ctx.user,requestId:ctx.requestId});}
  if(method==='POST'&&p==='/api/inventory/opname'){assertPermission(ctx.user,'stock_opname.create');const body=await readBody(req);ctx.status=201;return inventoryLots.createOpname(client,{user:ctx.user,warehouseId:body.warehouseId,title:body.title,scope:body.scope,categories:body.categories,productIds:body.productIds,requestId:ctx.requestId});}
  m=p.match(/^\/api\/inventory\/opname\/([0-9a-f-]{36})\/lines$/);
  if(method==='GET'&&m){assertPermission(ctx.user,'stock_opname.view');return inventoryLots.opnameLines(client,m[1],ctx.user);}
  m=p.match(/^\/api\/inventory\/opname\/([0-9a-f-]{36})\/counts$/);
  if(method==='POST'&&m){assertPermission(ctx.user,'stock_opname.edit');const body=await readBody(req);return inventoryLots.enterOpnameCounts(client,{docId:m[1],counts:body.counts,user:ctx.user,requestId:ctx.requestId});}
  return NO_MATCH;
}

module.exports={dispatch};
