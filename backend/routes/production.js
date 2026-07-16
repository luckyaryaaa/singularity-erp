'use strict';
// Domain router Sprint 12. Menjaga HTTP concern terpisah dari repository dan
// dari dispatcher utama tanpa mengubah URL/response contract yang sudah aktif.
const { readBody } = require('../core/util');
const { assertPermission } = require('../core/permissions');
const runtime = require('../infrastructure/database/repositories/runtime');
const production = require('../infrastructure/database/repositories/production');
const { NO_MATCH } = require('./shared');

async function dispatch(client, req, url, ctx) {
  const pathname = url.pathname;
  const method = req.method;
  const idempotent = async (operation, body, status, execute) => {
    const result = await runtime.withIdempotency(client, { userId: ctx.user.id, operation, key: req.headers['idempotency-key'], body }, async () => ({ status, body: await execute() }));
    ctx.status = result.status;
    return result.body;
  };
  let match = pathname.match(/^\/api\/work-orders\/([0-9a-f-]{36})\/production$/);
  if (method === 'GET' && match) { assertPermission(ctx.user, 'production.view'); return production.productionPanel(client, match[1], ctx.user); }
  match = pathname.match(/^\/api\/work-orders\/([0-9a-f-]{36})\/plan$/);
  if (method === 'POST' && match) { assertPermission(ctx.user, 'production.create'); const body = await readBody(req); return idempotent(`production.plan:${match[1]}`, body, 201, () => production.planWorkOrder(client, { docId: match[1], warehouseId: body.warehouseId, operations: body.operations, user: ctx.user, requestId: ctx.requestId })); }
  match = pathname.match(/^\/api\/work-orders\/([0-9a-f-]{36})\/issue-materials$/);
  if (method === 'POST' && match) { assertPermission(ctx.user, 'material_issue.create'); const body = await readBody(req); return idempotent(`production.issue:${match[1]}`, body, 201, () => production.createIssueFromPlan(client, { docId: match[1], user: ctx.user, requestId: ctx.requestId })); }
  match = pathname.match(/^\/api\/work-orders\/([0-9a-f-]{36})\/finish$/);
  if (method === 'POST' && match) { assertPermission(ctx.user, 'production.post'); const body = await readBody(req); return idempotent(`production.finish:${match[1]}`, body, 200, () => production.finishWorkOrder(client, { docId: match[1], fgWarehouseId: body.fgWarehouseId, user: ctx.user, requestId: ctx.requestId })); }
  match = pathname.match(/^\/api\/work-orders\/([0-9a-f-]{36})\/release-reservations$/);
  if (method === 'POST' && match) { assertPermission(ctx.user, 'production.post'); const body = await readBody(req); return idempotent(`production.release:${match[1]}`, body, 200, () => production.releaseReservations(client, match[1], ctx.user)); }
  match = pathname.match(/^\/api\/production\/operations\/([0-9a-f-]{36})\/time$/);
  if (method === 'POST' && match) { assertPermission(ctx.user, 'production.edit'); const body = await readBody(req); return idempotent(`production.time:${match[1]}`, body, 200, () => production.logTime(client, { operationId: match[1], hours: body.hours, note: body.note, user: ctx.user })); }
  match = pathname.match(/^\/api\/production\/operations\/([0-9a-f-]{36})\/complete$/);
  if (method === 'POST' && match) { assertPermission(ctx.user, 'production.edit'); const body = await readBody(req); return idempotent(`production.operation.complete:${match[1]}`, body, 200, () => production.completeOperation(client, { operationId: match[1], user: ctx.user })); }
  match = pathname.match(/^\/api\/quality\/([0-9a-f-]{36})\/inspections$/);
  if (method === 'GET' && match) { assertPermission(ctx.user, 'quality.view'); return production.listInspections(client, match[1], ctx.user); }
  if (method === 'POST' && match) { assertPermission(ctx.user, 'quality.create'); const body = await readBody(req); return idempotent(`quality.inspection:${match[1]}`, body, 201, () => production.recordInspection(client, { qcDocId: match[1], inspection: body, user: ctx.user, requestId: ctx.requestId })); }
  if (method === 'GET' && pathname === '/api/production/stock-locations') { assertPermission(ctx.user, 'production.view'); return production.listStockLocations(client, ctx.user); }
  if (method === 'GET' && pathname === '/api/production/work-centers') {
    assertPermission(ctx.user, 'production.view'); const scopeAll = ['owner', 'admin', 'system_admin'].includes(ctx.user.role) || ctx.user.branchScope === '*';
    return { items: (await client.query(`SELECT wc.id,wc.code,wc.name,wc.work_center_type,wc.capacity_hours_per_day,wc.hourly_rate,p.name plant_name FROM work_centers wc JOIN plants p ON p.id=wc.plant_id WHERE wc.active AND ($1 OR p.branch_id=$2) ORDER BY wc.code`, [scopeAll, ctx.user.branchId])).rows.map(runtime.camel) };
  }
  if (method === 'POST' && pathname === '/api/mrp/run') { assertPermission(ctx.user, 'production.post'); const body = await readBody(req); return idempotent('mrp.run', body, 200, () => production.runMrp(client, { user: ctx.user, requestId: ctx.requestId })); }
  if (method === 'GET' && pathname === '/api/mrp/suggestions') { assertPermission(ctx.user, 'production.view'); return production.listMrp(client); }
  match = pathname.match(/^\/api\/mrp\/suggestions\/([0-9a-f-]{36})\/convert$/);
  if (method === 'POST' && match) { assertPermission(ctx.user, 'purchase_request.create'); const body = await readBody(req); return idempotent(`mrp.convert:${match[1]}`, body, 201, () => production.convertMrp(client, { suggestionId: match[1], user: ctx.user, requestId: ctx.requestId })); }
  return NO_MATCH;
}

module.exports = { dispatch };
