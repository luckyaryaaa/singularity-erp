'use strict';
// Domain router Sprint 9 (R016 O2C completion): revisi penawaran ber-versi,
// dunning/collection, dan RMA/garansi. Pola sama dengan router domain lain —
// permission dulu, mutasi dibungkus idempotency.
const { readBody } = require('../core/util');
const { assertPermission } = require('../core/permissions');
const runtime = require('../infrastructure/database/repositories/runtime');
const salesO2c = require('../infrastructure/database/repositories/sales-o2c');
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
  return NO_MATCH;
}

module.exports = { dispatch };
