'use strict';
const { readBody } = require('../core/util');
const { assertPermission } = require('../core/permissions');
const businessOps = require('../infrastructure/database/repositories/business-operations');
const runtime = require('../infrastructure/database/repositories/runtime');
const { NO_MATCH } = require('./shared');

async function dispatch(client, req, url, ctx) {
  const p=url.pathname, method=req.method;
  let m;
  if(method==='GET'&&p==='/api/hr/attendance'){assertPermission(ctx.user,'attendance.view');return businessOps.attendance(client,{...Object.fromEntries(url.searchParams),user:ctx.user});}
  if(method==='POST'&&p==='/api/hr/attendance'){assertPermission(ctx.user,ctx.user.role==='employee'?'attendance.create':'attendance.edit');const body=await readBody(req);if(ctx.user.role==='employee')body.employeeId=ctx.user.employeeId;const result=await businessOps.upsertAttendance(client,{...body,user:ctx.user});await runtime.audit(client,{userId:ctx.user.id,action:'UPSERT_ATTENDANCE',module:'attendance',entityType:'ATTENDANCE',entityId:result.id,newValue:result,requestId:ctx.requestId,branchId:ctx.user.branchId});ctx.status=201;return result;}
  if(method==='GET'&&p==='/api/hr/leave-balances'){assertPermission(ctx.user,'leave.view');return{items:await businessOps.leaveBalances(client,{...Object.fromEntries(url.searchParams),user:ctx.user})};}
  if(method==='POST'&&p==='/api/payroll/runs'){assertPermission(ctx.user,'payroll.create');const body=await readBody(req),result=await businessOps.createPayroll(client,{...body,user:ctx.user});await runtime.audit(client,{userId:ctx.user.id,action:'CALCULATE_PAYROLL',module:'payroll',entityType:'PAYROLL_RUN',entityId:result.document.id,documentNumber:result.document.documentNumber,newValue:{period:body.period,headcount:result.headcount,total:result.total},requestId:ctx.requestId,branchId:ctx.user.branchId});ctx.status=201;return result;}
  m=p.match(/^\/api\/payroll\/runs\/([^/]+)\/items$/);if(method==='GET'&&m){if(ctx.user.role==='employee')assertPermission(ctx.user,'payroll.view_self');else assertPermission(ctx.user,'payroll.view');return{items:await businessOps.payrollItems(client,m[1],ctx.user)};}
  if(method==='GET'&&p==='/api/payroll/my'){assertPermission(ctx.user,'payroll.view_self');return{items:await businessOps.payrollSelf(client,ctx.user)};}
  return NO_MATCH;
}

module.exports={dispatch};
