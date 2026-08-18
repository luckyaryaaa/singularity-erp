'use strict';
const { readBody } = require('../core/util');
const { assertPermission } = require('../core/permissions');
const businessOps = require('../infrastructure/database/repositories/business-operations');
const runtime = require('../infrastructure/database/repositories/runtime');
const hrOps = require('../infrastructure/database/repositories/hr-operations');
const masterData = require('../infrastructure/database/repositories/master-data');
const { NO_MATCH } = require('./shared');

async function dispatch(client, req, url, ctx) {
  const p=url.pathname, method=req.method;
  let m;
  const idempotent=async(operation,body,status,execute)=>{const result=await runtime.withIdempotency(client,{userId:ctx.user.id,operation,key:req.headers['idempotency-key'],body},async()=>({status,body:await execute()}));ctx.status=result.status;return result.body;};
  // ── Sprint 14: shift/roster, kalender kerja, koreksi absensi, akrual cuti ──
  if(method==='GET'&&p==='/api/hr/shifts'){assertPermission(ctx.user,'attendance.view');return hrOps.listShifts(client);}
  if(method==='GET'&&p==='/api/hr/roster'){assertPermission(ctx.user,'attendance.view');return hrOps.listRoster(client,ctx.user,Object.fromEntries(url.searchParams));}
  if(method==='POST'&&p==='/api/hr/roster'){assertPermission(ctx.user,'attendance.edit');const body=await readBody(req);return idempotent('hr.roster.assign',body,200,()=>hrOps.assignRoster(client,{assignments:body.assignments,user:ctx.user,requestId:ctx.requestId}));}
  if(method==='GET'&&p==='/api/hr/calendar'){assertPermission(ctx.user,'attendance.view');return hrOps.listHolidays(client,ctx.user,Object.fromEntries(url.searchParams));}
  if(method==='POST'&&p==='/api/hr/calendar'){assertPermission(ctx.user,'attendance.edit');const body=await readBody(req);ctx.status=201;return hrOps.upsertHoliday(client,{...body,user:ctx.user,requestId:ctx.requestId});}
  if(method==='GET'&&p==='/api/hr/corrections'){assertPermission(ctx.user,'attendance.view');return hrOps.listCorrections(client,ctx.user,Object.fromEntries(url.searchParams));}
  if(method==='POST'&&p==='/api/hr/corrections'){assertPermission(ctx.user,ctx.user.role==='employee'?'attendance.create':'attendance.edit');const body=await readBody(req);if(ctx.user.role==='employee')body.employeeId=ctx.user.employeeId;return idempotent('hr.correction.request',body,201,()=>hrOps.requestCorrection(client,{...body,user:ctx.user,requestId:ctx.requestId}));}
  m=p.match(/^\/api\/hr\/corrections\/([0-9a-f-]{36})\/(approve|reject)$/);
  if(method==='POST'&&m){assertPermission(ctx.user,'attendance.approve');const body=await readBody(req);return idempotent(`hr.correction.decide:${m[1]}`,body,200,()=>hrOps.decideCorrection(client,{correctionId:m[1],decision:m[2]==='approve'?'APPROVED':'REJECTED',reason:body.reason,user:ctx.user,requestId:ctx.requestId}));}
  if(method==='POST'&&p==='/api/hr/leave-accrual/run'){assertPermission(ctx.user,'leave.post');const body=await readBody(req);return idempotent(`hr.leave.accrual:${body.branchId||ctx.user.branchId}:${body.period}`,body,200,()=>hrOps.runLeaveAccrual(client,{period:body.period,branchId:body.branchId,user:ctx.user,requestId:ctx.requestId}));}
  if(method==='GET'&&p==='/api/hr/attendance'){assertPermission(ctx.user,'attendance.view');return businessOps.attendance(client,{...Object.fromEntries(url.searchParams),user:ctx.user});}
  if(method==='POST'&&p==='/api/hr/attendance'){assertPermission(ctx.user,ctx.user.role==='employee'?'attendance.create':'attendance.edit');const body=await readBody(req);if(ctx.user.role==='employee')body.employeeId=ctx.user.employeeId;const result=await businessOps.upsertAttendance(client,{...body,user:ctx.user});await runtime.audit(client,{userId:ctx.user.id,action:'UPSERT_ATTENDANCE',module:'attendance',entityType:'ATTENDANCE',entityId:result.id,newValue:result,requestId:ctx.requestId,branchId:ctx.user.branchId});ctx.status=201;return result;}
  if(method==='GET'&&p==='/api/hr/leave-balances'){assertPermission(ctx.user,'leave.view');return{items:await businessOps.leaveBalances(client,{...Object.fromEntries(url.searchParams),user:ctx.user})};}
  if(method==='POST'&&p==='/api/payroll/runs'){assertPermission(ctx.user,'payroll.create');const body=await readBody(req),result=await businessOps.createPayroll(client,{...body,user:ctx.user});await runtime.audit(client,{userId:ctx.user.id,action:'CALCULATE_PAYROLL',module:'payroll',entityType:'PAYROLL_RUN',entityId:result.document.id,documentNumber:result.document.documentNumber,newValue:{period:body.period,headcount:result.headcount,total:result.total},requestId:ctx.requestId,branchId:ctx.user.branchId});ctx.status=201;return result;}
  m=p.match(/^\/api\/payroll\/runs\/([^/]+)\/items$/);if(method==='GET'&&m){if(ctx.user.role==='employee')assertPermission(ctx.user,'payroll.view_self');else assertPermission(ctx.user,'payroll.view');return{items:await businessOps.payrollItems(client,m[1],ctx.user)};}
  if(method==='GET'&&p==='/api/payroll/my'){assertPermission(ctx.user,'payroll.view_self');return{items:await businessOps.payrollSelf(client,ctx.user)};}
  // ── Employee Self-Service: Data Saya + pengkinian identitas (maker-checker) ──
  if(method==='GET'&&p==='/api/hr/my-profile'){assertPermission(ctx.user,'employee.view_self');return masterData.myProfile(client,ctx.user);}
  if(method==='POST'&&p==='/api/hr/my-profile/identity-request'){assertPermission(ctx.user,'employee.view_self');const body=await readBody(req);return idempotent('hr.self.identity',body,201,()=>masterData.submitIdentityRequest(client,ctx.user,body,ctx.requestId));}
  if(method==='GET'&&p==='/api/hr/self-updates'){return{items:await masterData.listSelfUpdates(client,ctx.user,url.searchParams.get('status'))};}
  m=p.match(/^\/api\/hr\/self-updates\/([0-9a-f-]{36})\/(approve|reject)$/);
  if(method==='POST'&&m){const body=await readBody(req);return idempotent(`hr.self.decide:${m[1]}`,body,200,()=>masterData.decideSelfUpdate(client,{id:m[1],decision:m[2],reason:body.reason,user:ctx.user,requestId:ctx.requestId}));}
  return NO_MATCH;
}

module.exports={dispatch};
