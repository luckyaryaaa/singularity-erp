'use strict';
// Sprint 17 / R024 — LAN profile: 10 lalu 25 virtual user. Setiap virtual user
// memiliki session+CSRF sendiri, menjalankan read mix, lalu create/delete saved
// view sebagai write transaction yang dapat dibersihkan.
require('../backend/core/env').loadEnv();
const {spawn}=require('node:child_process');
const path=require('node:path');
const {randomUUID}=require('node:crypto');

const ROOT=path.join(__dirname,'..');
const USERNAME=process.env.MAT_LOAD_USERNAME||process.env.MAT_BOOTSTRAP_OWNER_USERNAME;
const PASSWORD=process.env.MAT_LOAD_PASSWORD||process.env.MAT_BOOTSTRAP_OWNER_PASSWORD;
const STAGES=[{users:10,reads:200},{users:25,reads:500}];
const TARGET={readP95:750,writeP95:1200};
const percentile=(values,p)=>values.length?[...values].sort((a,b)=>a-b)[Math.min(values.length-1,Math.floor(values.length*p))]:0;

async function main(){
  if(!USERNAME||!PASSWORD)throw new Error('Credential load test belum tersedia di environment.');
  const port=41000+Math.floor(Math.random()*8000),base=`http://127.0.0.1:${port}`,runId=randomUUID().slice(0,8);
  const child=spawn(process.execPath,['server.js'],{cwd:ROOT,env:{...process.env,PORT:String(port),MAT_BACKUP_SCHEDULE_ENABLED:'0',MAT_REPORT_REFRESH_MINUTES:'60',MAT_RATE_LOGIN_PER_15MIN:'100000',MAT_RATE_READ_PER_MIN:'100000',MAT_RATE_WRITE_PER_MIN:'100000'},stdio:['ignore','ignore','pipe']});
  let bootError='';child.stderr.on('data',d=>{bootError+=d});
  const allSessions=[];
  const request=async(session,url,options={})=>{
    const started=performance.now(),res=await fetch(base+url,{...options,headers:{cookie:session.cookie,...(options.body?{'content-type':'application/json','x-csrf-token':session.csrf,origin:base}:{}),...(options.headers||{})}}),ms=performance.now()-started;
    let body={};try{body=await res.json();}catch{}
    return{status:res.status,body,ms};
  };
  try{
    let healthy=false;for(let i=0;i<30&&!healthy;i++){await new Promise(r=>setTimeout(r,400));healthy=await fetch(`${base}/api/health`).then(r=>r.ok).catch(()=>false);}
    if(!healthy)throw new Error(`Server load tidak sehat. ${bootError.split('\n').filter(Boolean).slice(-2).join(' ')}`);
    const results=[];
    for(const stage of STAGES){
      const sessions=await Promise.all(Array.from({length:stage.users},async(_,index)=>{
        const res=await fetch(`${base}/api/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:USERNAME,password:PASSWORD})}),body=await res.json();
        if(res.status!==200||!body.csrfToken)throw new Error(`Login VU-${index+1} gagal (${res.status}): ${body.code||body.message||'unknown'}`);
        return{index,cookie:res.headers.get('set-cookie').split(';')[0],csrf:body.csrfToken,filterId:null};
      }));
      allSessions.push(...sessions);
      const readLatency=[],writeLatency=[],failures=[];
      const write=async session=>{
        const create=await request(session,'/api/reports/saved-filters',{method:'POST',body:JSON.stringify({name:`LAN-${runId}-${stage.users}-${session.index}`,filters:{period:new Date().toISOString().slice(0,7)}})});
        writeLatency.push(create.ms);if(create.status!==201){failures.push(`POST saved-filter ${create.status}`);return;}
        session.filterId=create.body.id;
      };
      await Promise.all(sessions.map(write));
      const reads=['/api/dashboard','/api/documents?type=INVOICE&page=1&limit=25','/api/approvals?page=1&limit=25','/api/inventory?page=1&limit=25','/api/reports/cockpit'];
      let cursor=0;
      await Promise.all(sessions.map(async session=>{while(true){const index=cursor++;if(index>=stage.reads)break;const response=await request(session,reads[index%reads.length]);readLatency.push(response.ms);if(response.status!==200)failures.push(`GET ${reads[index%reads.length]} ${response.status}`);}}));
      await Promise.all(sessions.map(async session=>{if(!session.filterId)return;const remove=await request(session,`/api/reports/saved-filters/${session.filterId}`,{method:'DELETE',body:'{}'});writeLatency.push(remove.ms);if(remove.status!==200)failures.push(`DELETE saved-filter ${remove.status}`);session.filterId=null;}));
      const report={users:stage.users,requests:readLatency.length+writeLatency.length,reads:readLatency.length,writes:writeLatency.length,failures:[...new Set(failures)],latencyMs:{readP50:Math.round(percentile(readLatency,.5)),readP95:Math.round(percentile(readLatency,.95)),writeP50:Math.round(percentile(writeLatency,.5)),writeP95:Math.round(percentile(writeLatency,.95))}};
      report.passed=!failures.length&&report.reads===stage.reads&&report.writes===stage.users*2&&report.latencyMs.readP95<TARGET.readP95&&report.latencyMs.writeP95<TARGET.writeP95;
      results.push(report);
      await Promise.all(sessions.map(s=>request(s,'/api/auth/logout',{method:'POST',body:'{}'}).catch(()=>null)));
    }
    const output={profile:'LAN-10-25-MIXED',targetMs:TARGET,stages:results,passed:results.every(x=>x.passed)};
    console.log(JSON.stringify(output,null,2));
    if(!output.passed)process.exitCode=1;
  }finally{
    for(const session of allSessions){if(session.filterId)await request(session,`/api/reports/saved-filters/${session.filterId}`,{method:'DELETE',body:'{}'}).catch(()=>{});}
    child.stderr.destroy();child.kill('SIGTERM');await new Promise(r=>setTimeout(r,400));if(child.exitCode===null)child.kill('SIGKILL');
  }
}
main().catch(error=>{console.error('LAN load test gagal:',error.message);process.exitCode=1;});
