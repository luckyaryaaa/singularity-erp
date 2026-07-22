'use strict';
// Domain router Sprint 12. Menjaga HTTP concern terpisah dari repository dan
// dari dispatcher utama tanpa mengubah URL/response contract yang sudah aktif.
const { readBody } = require('../core/util');
const { assertPermission } = require('../core/permissions');
const runtime = require('../infrastructure/database/repositories/runtime');
const production = require('../infrastructure/database/repositories/production');
const capacity = require('../infrastructure/database/repositories/capacity');
const qualityCapa = require('../infrastructure/database/repositories/quality-capa');
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
  if (method === 'POST' && pathname === '/api/mrp/run') { assertPermission(ctx.user, 'production.post'); const body = await readBody(req); return idempotent('mrp.run', body, 200, () => production.runMrp(client, { user: ctx.user, warehouseId: body.warehouseId || null, requestId: ctx.requestId })); }
  // CAPA & kalibrasi — NCR sebelumnya hanya sebuah nomor tanpa siklus, dan
  // kalibrasi alat ukur tidak ada sama sekali.
  if (method === 'GET' && pathname === '/api/quality/capa')
    return qualityCapa.listCases(client, ctx.user, { branchId: url.searchParams.get('branchId'), status: url.searchParams.get('status') || 'OPEN_ONLY' });
  if (method === 'POST' && pathname === '/api/quality/capa') { const body = await readBody(req); ctx.status = 201;
    return qualityCapa.openCase(client, { ...body, user: ctx.user, requestId: ctx.requestId }); }
  match = pathname.match(/^\/api\/quality\/capa\/([0-9a-f-]{36})\/advance$/);
  if (method === 'POST' && match) { const body = await readBody(req);
    return qualityCapa.advanceCase(client, { id: match[1], toStatus: body.toStatus, payload: body,
      reason: body.reason, user: ctx.user, requestId: ctx.requestId }); }
  if (method === 'GET' && pathname === '/api/quality/instruments')
    return qualityCapa.listInstruments(client, ctx.user, { branchId: url.searchParams.get('branchId') });
  if (method === 'POST' && pathname === '/api/quality/instruments') { const body = await readBody(req); ctx.status = 201;
    return qualityCapa.registerInstrument(client, { ...body, user: ctx.user, requestId: ctx.requestId }); }
  match = pathname.match(/^\/api\/quality\/instruments\/([0-9a-f-]{36})\/calibrations$/);
  if (method === 'POST' && match) { const body = await readBody(req); ctx.status = 201;
    return qualityCapa.recordCalibration(client, { instrumentId: match[1], ...body, user: ctx.user, requestId: ctx.requestId }); }

  // Kapasitas & WIP — capacity_hours_per_day ada sejak migrasi 012 tetapi tidak
  // pernah diperiksa, dan operasi tidak punya tanggal sampai migrasi 060.
  if (method === 'GET' && pathname === '/api/production/capacity')
    return capacity.capacityBoard(client, { branchId: url.searchParams.get('branchId') || ctx.user.branchId,
      from: url.searchParams.get('from'), to: url.searchParams.get('to'), user: ctx.user });
  if (method === 'GET' && pathname === '/api/production/wip')
    return capacity.wipSummary(client, { branchId: url.searchParams.get('branchId') || ctx.user.branchId, user: ctx.user });
  match = pathname.match(/^\/api\/production\/operations\/([0-9a-f-]{36})\/schedule$/);
  if (method === 'POST' && match) { const body = await readBody(req);
    return capacity.scheduleOperation(client, { operationId: match[1], scheduledDate: body.scheduledDate,
      allowOverload: body.allowOverload === true, reason: body.reason, user: ctx.user, requestId: ctx.requestId }); }
  match = pathname.match(/^\/api\/production\/operations\/([0-9a-f-]{36})\/actual-hours$/);
  if (method === 'POST' && match) { const body = await readBody(req);
    return capacity.recordActualHours(client, { operationId: match[1], hours: body.hours, user: ctx.user, requestId: ctx.requestId }); }

  if (method === 'GET' && pathname === '/api/mrp/suggestions') { assertPermission(ctx.user, 'production.view'); return production.listMrp(client, ctx.user, { warehouseId: url.searchParams.get('warehouseId') || null }); }
  match = pathname.match(/^\/api\/mrp\/suggestions\/([0-9a-f-]{36})\/convert$/);
  if (method === 'POST' && match) { assertPermission(ctx.user, 'purchase_request.create'); const body = await readBody(req); return idempotent(`mrp.convert:${match[1]}`, body, 201, () => production.convertMrp(client, { suggestionId: match[1], user: ctx.user, requestId: ctx.requestId })); }
  return NO_MATCH;
}

module.exports = { dispatch };
