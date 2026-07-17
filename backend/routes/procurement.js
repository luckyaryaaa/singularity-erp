'use strict';
const { readBody } = require('../core/util');
const { AppError } = require('../core/errors');
const { assertPermission } = require('../core/permissions');
const runtime = require('../infrastructure/database/repositories/runtime');
const procurement = require('../infrastructure/database/repositories/procurement');
const { NO_MATCH } = require('./shared');

async function dispatch(client, req, url, ctx) {
  const p=url.pathname, method=req.method;
  let m;
  // ── Wave 2: RFQ, three-way match, payment proposal, credit control ────────
  const idempotent=async(operation,body,status,execute)=>{const result=await runtime.withIdempotency(client,{userId:ctx.user.id,operation,key:req.headers['idempotency-key'],body},async()=>({status,body:await execute()}));ctx.status=result.status;return result.body;};
  // ── Sprint 10: budget pengadaan + PO change order ──────────────────────────
  if(method==='GET'&&p==='/api/procurement/budgets')return procurement.listBudgets(client,ctx.user,Object.fromEntries(url.searchParams));
  if(method==='POST'&&p==='/api/procurement/budgets'){const body=await readBody(req);ctx.status=201;return procurement.upsertBudget(client,{period:body.period,branchId:body.branchId||null,amount:body.amount,notes:body.notes,user:ctx.user,requestId:ctx.requestId});}
  m=p.match(/^\/api\/purchase-orders\/([0-9a-f-]{36})\/change-orders$/);
  if(method==='GET'&&m)return procurement.listChangeOrders(client,m[1],ctx.user);
  if(method==='POST'&&m){const body=await readBody(req);return idempotent(`po.change:${m[1]}`,body,201,()=>procurement.createChangeOrder(client,{poId:m[1],newAmount:body.newAmount,newLines:body.newLines,reason:body.reason,user:ctx.user,requestId:ctx.requestId}));}
  m=p.match(/^\/api\/purchase-orders\/change-orders\/([0-9a-f-]{36})\/(approve|reject)$/);
  if(method==='POST'&&m){const body=await readBody(req);return idempotent(`po.change.decide:${m[1]}`,body,200,()=>procurement.decideChangeOrder(client,{changeOrderId:m[1],decision:m[2]==='approve'?'APPROVED':'REJECTED',reason:body.reason,user:ctx.user,requestId:ctx.requestId}));}
  m=p.match(/^\/api\/credit\/([0-9a-f-]{36})$/);
  if(method==='GET'&&m){assertPermission(ctx.user,'credit.view');const status=await procurement.creditStatus(client,m[1]);if(!status)throw new AppError('RESOURCE_NOT_FOUND');return status;}
  m=p.match(/^\/api\/documents\/([0-9a-f-]{36})\/credit-override$/);
  if(method==='POST'&&m){const body=await readBody(req);return procurement.grantCreditOverride(client,{documentId:m[1],reason:body.reason,user:ctx.user,requestId:ctx.requestId});}
  m=p.match(/^\/api\/rfq\/([0-9a-f-]{36})\/quotes$/);
  if(method==='GET'&&m)return procurement.listQuotes(client,m[1],ctx.user);
  if(method==='POST'&&m){const body=await readBody(req);ctx.status=201;return procurement.addQuote(client,{rfqId:m[1],body,user:ctx.user,requestId:ctx.requestId});}
  m=p.match(/^\/api\/rfq\/([0-9a-f-]{36})\/quotes\/([0-9a-f-]{36})\/select$/);
  if(method==='POST'&&m){const body=await readBody(req);return procurement.selectQuote(client,{rfqId:m[1],quoteId:m[2],reason:body.reason,user:ctx.user,requestId:ctx.requestId});}
  m=p.match(/^\/api\/rfq\/([0-9a-f-]{36})\/create-po$/);
  if(method==='POST'&&m){const body=await readBody(req);const result=await runtime.withIdempotency(client,{userId:ctx.user.id,operation:`rfq.po:${m[1]}`,key:req.headers['idempotency-key'],body},async()=>({status:201,body:await procurement.rfqToPurchaseOrder(client,{rfqId:m[1],user:ctx.user,requestId:ctx.requestId})}));ctx.status=result.status;return result.body;}
  m=p.match(/^\/api\/supplier-invoices\/([0-9a-f-]{36})\/match$/);
  if(method==='GET'&&m){const existing=await procurement.getMatch(client,m[1],ctx.user);return existing||procurement.evaluateThreeWayMatch(client,{supplierInvoiceId:m[1],user:ctx.user,requestId:ctx.requestId});}
  if(method==='POST'&&m){assertPermission(ctx.user,'supplier_invoice.view');return procurement.evaluateThreeWayMatch(client,{supplierInvoiceId:m[1],user:ctx.user,requestId:ctx.requestId});}
  if(method==='POST'&&p==='/api/payment-proposals'){const body=await readBody(req);const result=await runtime.withIdempotency(client,{userId:ctx.user.id,operation:'payment-proposal.generate',key:req.headers['idempotency-key'],body},async()=>({status:201,body:await procurement.generatePaymentProposal(client,{user:ctx.user,requestId:ctx.requestId,branchId:body.branchId,dueBefore:body.dueBefore})}));ctx.status=result.status;return result.body;}
  m=p.match(/^\/api\/payment-proposals\/([0-9a-f-]{36})\/lines$/);
  if(method==='GET'&&m)return{items:await procurement.proposalLines(client,m[1],ctx.user)};
  return NO_MATCH;
}

module.exports={dispatch};
