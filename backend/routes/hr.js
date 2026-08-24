'use strict';
const { readBody } = require('../core/util');
const { assertPermission } = require('../core/permissions');
const businessOps = require('../infrastructure/database/repositories/business-operations');
const runtime = require('../infrastructure/database/repositories/runtime');
const hrOps = require('../infrastructure/database/repositories/hr-operations');
const masterData = require('../infrastructure/database/repositories/master-data');
const recruitment = require('../infrastructure/database/repositories/recruitment');
const learning = require('../infrastructure/database/repositories/learning');
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
  if(method==='GET'&&p==='/api/hr/workforce-analytics'){assertPermission(ctx.user,'employee.view');return masterData.workforceAnalytics(client,ctx.user);}
  if(method==='GET'&&p==='/api/company/identity'){return masterData.companyIdentity(client,ctx.user);}
  if(method==='GET'&&p==='/api/hr/import-batches'){return masterData.listImportBatches(client,ctx.user,{module:url.searchParams.get('module')||undefined,limit:url.searchParams.get('limit')});}
  if(method==='GET'&&p==='/api/hr/recruitment-overview'){return recruitment.recruitmentOverview(client,ctx.user);}
  if(method==='GET'&&p==='/api/hr/requisitions'){return recruitment.listRequisitions(client,ctx.user,{status:url.searchParams.get('status')||undefined});}
  if(method==='POST'&&p==='/api/hr/requisitions'){const body=await readBody(req);ctx.status=201;return recruitment.createRequisition(client,ctx.user,body,ctx.requestId);}
  m=p.match(/^\/api\/hr\/requisitions\/([0-9a-f-]{36})$/);
  if(method==='GET'&&m)return recruitment.getRequisition(client,m[1],ctx.user);
  if(method==='POST'&&m){const body=await readBody(req);return recruitment.updateRequisition(client,m[1],body,ctx.user,ctx.requestId);}
  if(method==='GET'&&p==='/api/hr/candidates'){return recruitment.listCandidates(client,ctx.user,{requisitionId:url.searchParams.get('requisitionId')||undefined,stage:url.searchParams.get('stage')||undefined});}
  if(method==='POST'&&p==='/api/hr/candidates'){const body=await readBody(req);ctx.status=201;return recruitment.createCandidate(client,ctx.user,body,ctx.requestId);}
  m=p.match(/^\/api\/hr\/candidates\/([0-9a-f-]{36})$/);
  if(method==='POST'&&m){const body=await readBody(req);return recruitment.updateCandidate(client,m[1],body,ctx.user,ctx.requestId);}
  if(method==='GET'&&p==='/api/hr/learning-overview'){return learning.learningOverview(client,ctx.user);}
  if(method==='GET'&&p==='/api/hr/training-programs'){return learning.listPrograms(client,ctx.user,{status:url.searchParams.get('status')||undefined,category:url.searchParams.get('category')||undefined});}
  if(method==='POST'&&p==='/api/hr/training-programs'){const body=await readBody(req);ctx.status=201;return learning.createProgram(client,ctx.user,body,ctx.requestId);}
  m=p.match(/^\/api\/hr\/training-programs\/([0-9a-f-]{36})$/);
  if(method==='POST'&&m){const body=await readBody(req);return learning.updateProgram(client,m[1],body,ctx.user,ctx.requestId);}
  if(method==='GET'&&p==='/api/hr/enrollments'){return learning.listEnrollments(client,ctx.user,{programId:url.searchParams.get('programId')||undefined,employeeId:url.searchParams.get('employeeId')||undefined,status:url.searchParams.get('status')||undefined});}
  if(method==='POST'&&p==='/api/hr/enrollments'){const body=await readBody(req);ctx.status=201;return learning.createEnrollment(client,ctx.user,body,ctx.requestId);}
  m=p.match(/^\/api\/hr\/enrollments\/([0-9a-f-]{36})$/);
  if(method==='POST'&&m){const body=await readBody(req);return learning.updateEnrollment(client,m[1],body,ctx.user,ctx.requestId);}
  // ── Employee Self-Service: Data Saya + pengkinian identitas (maker-checker) ──
  if(method==='GET'&&p==='/api/hr/my-profile'){assertPermission(ctx.user,'employee.view_self');return masterData.myProfile(client,ctx.user);}
  if(method==='POST'&&p==='/api/hr/my-profile/identity-request'){assertPermission(ctx.user,'employee.view_self');const body=await readBody(req);return idempotent('hr.self.identity',body,201,()=>masterData.submitIdentityRequest(client,ctx.user,body,ctx.requestId));}
  if(method==='GET'&&p==='/api/hr/self-updates'){return{items:await masterData.listSelfUpdates(client,ctx.user,url.searchParams.get('status'))};}
  m=p.match(/^\/api\/hr\/self-updates\/([0-9a-f-]{36})\/(approve|reject)$/);
  if(method==='POST'&&m){const body=await readBody(req);return idempotent(`hr.self.decide:${m[1]}`,body,200,()=>masterData.decideSelfUpdate(client,{id:m[1],decision:m[2],reason:body.reason,user:ctx.user,requestId:ctx.requestId}));}
  // ── Kasbon / Pinjaman Karyawan — pengajuan + persetujuan (SoD) + potongan payroll otomatis ──
  if(method==='GET'&&p==='/api/hr/loans'){assertPermission(ctx.user,'employee.view');return masterData.listLoans(client,ctx.user,{status:url.searchParams.get('status')});}
  if(method==='POST'&&p==='/api/hr/loans'){assertPermission(ctx.user,'employee.view');const body=await readBody(req);return idempotent('hr.loan.request',body,201,()=>masterData.requestLoan(client,body,ctx.user,ctx.requestId));}
  m=p.match(/^\/api\/hr\/loans\/([0-9a-f-]{36})\/(approve|reject)$/);
  if(method==='POST'&&m){const body=await readBody(req);return idempotent(`hr.loan.decide:${m[1]}`,body,200,()=>masterData.decideLoan(client,{id:m[1],decision:m[2],note:body.note,user:ctx.user,requestId:ctx.requestId}));}
  m=p.match(/^\/api\/hr\/loans\/([0-9a-f-]{36})\/(settle|cancel)$/);
  if(method==='POST'&&m){const body=await readBody(req);return idempotent(`hr.loan.close:${m[1]}`,body,200,()=>masterData.closeLoan(client,{id:m[1],action:m[2],user:ctx.user,requestId:ctx.requestId}));}
  return NO_MATCH;
}

module.exports={dispatch};
