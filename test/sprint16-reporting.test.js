'use strict';
// Sprint 16 (R023) — semantic KPI, materialized summary, scope, saved view,
// scheduled report, dan artifact audit contract.
require('../backend/core/env').loadEnv();
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {Client}=require('pg');
const reporting=require('../backend/infrastructure/database/repositories/reporting');
const worker=require('../backend/workers/postgres-worker');

test('R023 contract: migration, cockpit UI, provenance, dan endpoint terpasang',()=>{
  const migration=fs.readFileSync(path.join(__dirname,'../data/migrations/034_reporting_executive_cockpit.sql'),'utf8');
  assert.match(migration,/CREATE MATERIALIZED VIEW mv_executive_monthly_kpis/);
  assert.match(migration,/SECURITY DEFINER/);
  assert.match(migration,/CREATE TABLE report_schedules/);
  assert.match(migration,/CREATE TABLE report_saved_filters/);
  const ui=fs.readFileSync(path.join(__dirname,'../src/modules/executive-reporting.js'),'utf8');
  // Analitik eksekutif kini menyatu di Dashboard (satu layar, tanpa tab) dan
  // Report Factory berdiri sebagai halaman sendiri — keduanya wajib ada.
  assert.match(ui,/OPERATING PULSE/);assert.match(ui,/Sumber & definisi KPI/);
  assert.match(ui,/MAT_PAGES\.cockpit/,'blok analitik wajib dibagikan ke Dashboard');
  assert.match(ui,/Laporan terkontrol/);assert.match(ui,/data-schedule/);assert.match(ui,/data-export/);
  const css=fs.readFileSync(path.join(__dirname,'../src/styles.css'),'utf8');
  assert.match(css,/\.exec-pulse/);assert.match(css,/@media\(max-width:700px\)/);
  assert.equal(reporting.REPORTS.length,8);
});

const enabled=!!process.env.DATABASE_URL,dbTest=enabled?test:test.skip;
async function rollback(fn){const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();try{await c.query('BEGIN');await fn(c);}finally{await c.query('ROLLBACK').catch(()=>{});await c.end();}}
async function owner(c){return(await c.query(`SELECT id,username,display_name "displayName",role,branch_id "branchId",branch_scope "branchScope",employee_id "employeeId" FROM app_users WHERE role='owner' AND active LIMIT 1`)).rows[0];}

dbTest('Executive Cockpit: 12 bulan, definisi KPI, freshness, dan revenue rekonsiliasi ke materialized GL',async()=>rollback(async c=>{
  const u=await owner(c),p=new Date().toISOString().slice(0,7),data=await reporting.cockpit(c,{period:p,user:u});
  assert.equal(data.trend.length,12);assert.ok(data.definitions.length>=6);assert.equal(data.period,p);assert.equal(data.scope.type,'GLOBAL');assert.ok(data.freshness.materializedAt);
  const expected=Number((await c.query(`SELECT COALESCE(sum(revenue),0)::float n FROM mv_executive_monthly_kpis WHERE period_start=$1::date`,[`${p}-01`])).rows[0].n);
  assert.equal(data.kpi.revenue,expected);assert.ok(Number.isFinite(data.kpi.workingCapital));
}));

dbTest('Executive Cockpit: user cabang tidak dapat menaikkan scope ke cabang lain',async()=>rollback(async c=>{
  const user=(await c.query(`SELECT id,role,branch_id "branchId",branch_scope "branchScope" FROM app_users WHERE active AND branch_id IS NOT NULL AND role NOT IN('owner','system_admin','security_admin','auditor','admin') LIMIT 1`)).rows[0];
  if(!user)return;
  const other=(await c.query('SELECT id FROM branches WHERE id<>$1 LIMIT 1',[user.branchId])).rows[0];
  if(other)await assert.rejects(()=>reporting.cockpit(c,{period:new Date().toISOString().slice(0,7),branchId:other.id,user}),e=>e.code==='PERMISSION_DENIED');
  const own=await reporting.cockpit(c,{period:new Date().toISOString().slice(0,7),user});assert.equal(own.scope.branchId,user.branchId);
}));

dbTest('Saved filter bersifat pribadi dan schedule due dienqueue tepat sekali dengan scope + format',async()=>rollback(async c=>{
  const u=await owner(c),p=new Date().toISOString().slice(0,7),view=await reporting.saveFilter(c,{name:'Owner monthly',filters:{period:p}},u);
  assert.equal((await reporting.listFilters(c,u)).some(x=>x.id===view.id),true);
  const scheduled=await reporting.createSchedule(c,{name:'Monthly statement',reportKey:'financial_statement',format:'XLSX',frequency:'MONTHLY',firstRunAt:new Date(Date.now()+3600000).toISOString(),filters:{period:p}},u);
  assert.equal(scheduled.reportKey,'financial_statement');assert.equal(scheduled.branchId,null);assert.equal(scheduled.version,1);
  const disabled=await reporting.updateSchedule(c,scheduled.id,{enabled:false,version:scheduled.version},u);
  assert.equal(disabled.enabled,false);assert.equal(disabled.version,2);
  await assert.rejects(()=>reporting.updateSchedule(c,scheduled.id,{enabled:true,version:1},u),e=>e.code==='DOCUMENT_CONFLICT');
  await c.query(`INSERT INTO report_schedules(id,name,report_key,format,frequency,filters,enabled,next_run_at,created_by,updated_by)
    VALUES(gen_random_uuid(),'Test due','financial_statement','PDF','MONTHLY',$1,true,now()-interval '1 minute',$2,$2)`,[{period:p},u.id]);
  assert.equal(await worker.scheduleReports(c),1);
  const row=(await c.query(`SELECT s.last_job_id,s.next_run_at,j.job_type,j.execution_key,j.params FROM report_schedules s JOIN background_jobs j ON j.id=s.last_job_id WHERE s.name='Test due'`)).rows[0];
  assert.equal(row.job_type,'GENERATE_PDF');assert.match(row.execution_key,/^report-schedule:/);assert.equal(row.params.period,p);assert.ok(new Date(row.next_run_at)>new Date());
  assert.equal(await worker.scheduleReports(c),0,'jadwal yang sudah maju tidak diduplikasi');
}));

dbTest('refresh semantic layer dapat dijalankan runtime dan mencatat freshness',async()=>rollback(async c=>{
  const before=Number((await c.query('SELECT count(*) n FROM reporting_refresh_runs')).rows[0].n),result=await reporting.refresh(c),after=Number((await c.query('SELECT count(*) n FROM reporting_refresh_runs')).rows[0].n);
  assert.ok(result.rows>=0);assert.equal(after,before+1);
}));
