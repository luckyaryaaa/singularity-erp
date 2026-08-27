'use strict';
// Domain router Sprint 9 (R016 O2C completion): revisi penawaran ber-versi,
// dunning/collection, dan RMA/garansi. Pola sama dengan router domain lain —
// permission dulu, mutasi dibungkus idempotency.
const { readBody } = require('../core/util');
const { assertPermission } = require('../core/permissions');
const runtime = require('../infrastructure/database/repositories/runtime');
const salesO2c = require('../infrastructure/database/repositories/sales-o2c');
const commercial = require('../infrastructure/database/repositories/sales-commercial');
const pricing = require('../infrastructure/database/repositories/sales-pricing');
const { NO_MATCH } = require('./shared');

async function dispatch(client, req, url, ctx) {
  const pathname = url.pathname;
  const method = req.method;
  const idempotent = async (operation, body, status, execute) => {
    const result = await runtime.withIdempotency(client, { userId: ctx.user.id, operation, key: req.headers['idempotency-key'], body }, async () => ({ status, body: await execute() }));
    ctx.status = result.status;
    return result.body;
  };
  let match = pathname.match(/^\/api\/quotations\/([0-9a-f-]{36})\/revisions$/);
  if (method === 'GET' && match) { assertPermission(ctx.user, 'quotation.view'); return salesO2c.listQuotationRevisions(client, match[1], ctx.user); }
  match = pathname.match(/^\/api\/quotations\/([0-9a-f-]{36})\/revise$/);
  if (method === 'POST' && match) {
    assertPermission(ctx.user, 'quotation.edit');
    const body = await readBody(req);
    return idempotent(`quotation.revise:${match[1]}`, body, 200, () => salesO2c.reviseQuotation(client, { docId: match[1], reason: body.reason, user: ctx.user, requestId: ctx.requestId }));
  }
  if (method === 'POST' && pathname === '/api/collection/dunning/run') {
    assertPermission(ctx.user, 'invoice.post');
    const body = await readBody(req);
    return idempotent('dunning.run', body, 200, () => salesO2c.runDunning(client, { user: ctx.user, requestId: ctx.requestId }));
  }
  if (method === 'GET' && pathname === '/api/collection/dunning') { assertPermission(ctx.user, 'invoice.view'); return salesO2c.listDunning(client, ctx.user, Object.fromEntries(url.searchParams)); }
  match = pathname.match(/^\/api\/collection\/dunning\/([0-9a-f-]{36})\/resolve$/);
  if (method === 'POST' && match) {
    assertPermission(ctx.user, 'invoice.edit');
    const body = await readBody(req);
    return idempotent(`dunning.resolve:${match[1]}`, body, 200, () => salesO2c.resolveDunning(client, { noticeId: match[1], reason: body.reason, user: ctx.user, requestId: ctx.requestId }));
  }
  if (method === 'POST' && pathname === '/api/rma') {
    assertPermission(ctx.user, 'rma.create');
    const body = await readBody(req);
    return idempotent('rma.create', body, 201, () => salesO2c.createRma(client, { user: ctx.user, sourceDocumentId: body.sourceDocumentId, warrantyClaim: body.warrantyClaim, reasonCode: body.reasonCode, lines: body.lines, requestId: ctx.requestId }));
  }
  if(method==='GET'&&pathname==='/api/sales/commercial/overview'){assertPermission(ctx.user,'sales_order.view');return commercial.overview(client,ctx.user);}
  if(method==='GET'&&pathname==='/api/sales/dashboard'){assertPermission(ctx.user,'sales_order.view');return commercial.salesDashboard(client,ctx.user);}
  if(method==='GET'&&pathname==='/api/sales/contracts'){assertPermission(ctx.user,'sales_order.view');return{items:await commercial.contracts(client,ctx.user)};}
  if(method==='POST'&&pathname==='/api/sales/contracts'){assertPermission(ctx.user,'sales_order.create');const body=await readBody(req);return idempotent('sales.contract.create',body,201,()=>commercial.createContract(client,body,ctx.user));}
  match=pathname.match(/^\/api\/sales\/contracts\/([0-9a-f-]{36})\/submit$/);
  if(method==='POST'&&match){assertPermission(ctx.user,'sales_order.submit');const body=await readBody(req);return idempotent(`sales.contract.submit:${match[1]}`,body,200,()=>commercial.submitContract(client,match[1],ctx.user));}
  match=pathname.match(/^\/api\/sales\/contracts\/([0-9a-f-]{36})\/(approve|reject)$/);
  if(method==='POST'&&match){assertPermission(ctx.user,'sales_order.approve');const body=await readBody(req);return idempotent(`sales.contract.${match[2]}:${match[1]}`,body,200,()=>commercial.decideContract(client,{id:match[1],approve:match[2]==='approve',reason:body.reason,user:ctx.user,requestId:ctx.requestId}));}
  match=pathname.match(/^\/api\/sales\/contracts\/([0-9a-f-]{36})\/releases$/);
  if(method==='POST'&&match){assertPermission(ctx.user,'sales_order.edit');const body=await readBody(req);return idempotent(`sales.contract.release:${match[1]}`,body,201,()=>commercial.releaseContract(client,{id:match[1],...body,user:ctx.user,requestId:ctx.requestId}));}
  match=pathname.match(/^\/api\/sales\/documents\/([0-9a-f-]{36})\/margin$/);
  if(method==='GET'&&match){assertPermission(ctx.user,'sales_order.view');return commercial.marginStatus(client,match[1],ctx.user);}
  if(method==='POST'&&match){assertPermission(ctx.user,'sales_order.submit');const body=await readBody(req);return idempotent(`sales.margin.assess:${match[1]}`,body,200,()=>commercial.assessMargin(client,{documentId:match[1],user:ctx.user}));}
  match=pathname.match(/^\/api\/sales\/margin-assessments\/([0-9a-f-]{36})\/(approve|reject)$/);
  if(method==='POST'&&match){assertPermission(ctx.user,'credit.approve');const body=await readBody(req);return idempotent(`sales.margin.${match[2]}:${match[1]}`,body,200,()=>commercial.decideMargin(client,{assessmentId:match[1],approve:match[2]==='approve',reason:body.reason,user:ctx.user,requestId:ctx.requestId}));}
  match=pathname.match(/^\/api\/sales\/orders\/([0-9a-f-]{36})\/availability$/);
  if(method==='GET'&&match){assertPermission(ctx.user,'sales_order.view');return{items:await commercial.availability(client,match[1],ctx.user)};}
  if(method==='POST'&&match){assertPermission(ctx.user,'sales_order.edit');const body=await readBody(req);return idempotent(`sales.availability:${match[1]}`,body,200,()=>commercial.calculateAvailability(client,{salesOrderId:match[1],warehouseId:body.warehouseId,user:ctx.user}));}
  match=pathname.match(/^\/api\/sales\/orders\/([0-9a-f-]{36})\/milestones$/);
  if(method==='GET'&&match){assertPermission(ctx.user,'invoice.view');return{items:await commercial.milestones(client,match[1],ctx.user)};}
  if(method==='POST'&&match){assertPermission(ctx.user,'invoice.create');const body=await readBody(req);return idempotent(`sales.milestones:${match[1]}`,body,201,()=>commercial.createMilestones(client,{salesOrderId:match[1],milestones:body.milestones,user:ctx.user}));}
  match=pathname.match(/^\/api\/sales\/milestones\/([0-9a-f-]{36})\/ready$/);
  if(method==='POST'&&match){assertPermission(ctx.user,'invoice.approve');const body=await readBody(req);return idempotent(`sales.milestone.ready:${match[1]}`,body,200,()=>commercial.markMilestoneReady(client,{milestoneId:match[1],user:ctx.user}));}
  match=pathname.match(/^\/api\/sales\/milestones\/([0-9a-f-]{36})\/invoice$/);
  if(method==='POST'&&match){assertPermission(ctx.user,'invoice.create');const body=await readBody(req);return idempotent(`sales.milestone.invoice:${match[1]}`,body,201,()=>commercial.invoiceMilestone(client,{milestoneId:match[1],user:ctx.user,requestId:ctx.requestId}));}
  if(method==='GET'&&pathname==='/api/sales/backorders'){assertPermission(ctx.user,'sales_order.view');return{items:await commercial.backorders(client,ctx.user)};}
  match=pathname.match(/^\/api\/sales\/orders\/([0-9a-f-]{36})\/backorders\/refresh$/);
  if(method==='POST'&&match){assertPermission(ctx.user,'sales_order.edit');const body=await readBody(req);return idempotent(`sales.backorders.refresh:${match[1]}`,body,200,()=>commercial.refreshBackorders(client,match[1],ctx.user));}

  // Advanced pricing condition engine (migrasi 079) — price list/diskon/surcharge
  // ber-validity; resolusi harga server-authoritative.
  if(method==='GET'&&pathname==='/api/sales/pricing-conditions'){assertPermission(ctx.user,'quotation.view');return pricing.listConditions(client,ctx.user,Object.fromEntries(url.searchParams));}
  if(method==='POST'&&pathname==='/api/sales/pricing-conditions'){assertPermission(ctx.user,'quotation.edit');const body=await readBody(req);return idempotent('sales.pricing-condition.create',body,201,()=>pricing.createCondition(client,body,ctx.user,ctx.requestId));}
  match=pathname.match(/^\/api\/sales\/pricing-conditions\/([0-9a-f-]{36})\/deactivate$/);
  if(method==='POST'&&match){assertPermission(ctx.user,'quotation.edit');const body=await readBody(req);return pricing.deactivateCondition(client,{id:match[1],expectedVersion:Number(body.version),user:ctx.user,requestId:ctx.requestId});}
  if(method==='GET'&&pathname==='/api/sales/price'){assertPermission(ctx.user,'quotation.view');const qp=Object.fromEntries(url.searchParams);return pricing.resolvePrice(client,ctx.user,{productId:qp.productId,partyId:qp.partyId||null,qty:qp.qty?Number(qp.qty):1,legalEntityId:qp.legalEntityId||null});}
  return NO_MATCH;
}

module.exports = { dispatch };
