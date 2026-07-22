'use strict';
const { readBody } = require('../core/util');
const { assertPermission } = require('../core/permissions');
const reporting = require('../infrastructure/database/repositories/reporting');
const runtime = require('../infrastructure/database/repositories/runtime');
const { NO_MATCH } = require('./shared');

async function dispatch(client,req,url,ctx){
  const p=url.pathname,method=req.method;let m;
  if(method==='GET'&&p==='/api/reports/catalog'){assertPermission(ctx.user,'report.view');return{items:reporting.visibleReports(ctx.user)};}
  if(method==='GET'&&p==='/api/reports/cockpit'){assertPermission(ctx.user,'report.view');return reporting.cockpit(client,{period:url.searchParams.get('period'),branchId:url.searchParams.get('branchId')||null,user:ctx.user});}
  if(method==='POST'&&p==='/api/reports/refresh'){assertPermission(ctx.user,'report.edit');const result=await reporting.refresh(client);await runtime.audit(client,{userId:ctx.user.id,action:'REFRESH',module:'report',entityType:'REPORTING_SEMANTIC_LAYER',newValue:result,requestId:ctx.requestId,branchId:ctx.user.branchId});return result;}
  if(method==='GET'&&p==='/api/reports/schedules'){assertPermission(ctx.user,'report.view');return{items:await reporting.listSchedules(client,ctx.user)};}
  if(method==='POST'&&p==='/api/reports/schedules'){assertPermission(ctx.user,'report.create');const body=await readBody(req),item=await reporting.createSchedule(client,body,ctx.user);await runtime.audit(client,{userId:ctx.user.id,action:'CREATE',module:'report',entityType:'REPORT_SCHEDULE',entityId:item.id,newValue:item,reason:body.reason||'Jadwal laporan baru',requestId:ctx.requestId,branchId:item.branchId||ctx.user.branchId});ctx.status=201;return item;}
  m=p.match(/^\/api\/reports\/schedules\/([0-9a-f-]{36})$/);if(method==='PATCH'&&m){assertPermission(ctx.user,'report.edit');const body=await readBody(req),item=await reporting.updateSchedule(client,m[1],body,ctx.user);await runtime.audit(client,{userId:ctx.user.id,action:item.enabled?'UPDATE':'DISABLE',module:'report',entityType:'REPORT_SCHEDULE',entityId:item.id,newValue:item,reason:body.reason||'Perubahan jadwal laporan',requestId:ctx.requestId,branchId:item.branchId||ctx.user.branchId});return item;}
  if(method==='GET'&&p==='/api/reports/saved-filters'){assertPermission(ctx.user,'report.view');return{items:await reporting.listFilters(client,ctx.user)};}
  if(method==='POST'&&p==='/api/reports/saved-filters'){assertPermission(ctx.user,'report.create');const body=await readBody(req),item=await reporting.saveFilter(client,body,ctx.user);await runtime.audit(client,{userId:ctx.user.id,action:'SAVE_FILTER',module:'report',entityType:'REPORT_FILTER',entityId:item.id,newValue:item,requestId:ctx.requestId,branchId:ctx.user.branchId});ctx.status=201;return item;}
  m=p.match(/^\/api\/reports\/saved-filters\/([0-9a-f-]{36})$/);if(method==='DELETE'&&m){assertPermission(ctx.user,'report.edit');const result=await reporting.deleteFilter(client,m[1],ctx.user);await runtime.audit(client,{userId:ctx.user.id,action:'DELETE_FILTER',module:'report',entityType:'REPORT_FILTER',entityId:m[1],requestId:ctx.requestId,branchId:ctx.user.branchId});return result;}
  return NO_MATCH;
}
module.exports={dispatch};
