'use strict';
require('../backend/core/env').loadEnv();
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {spawn}=require('node:child_process');

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const port=Number(process.env.MAT_UI_SMOKE_DEBUG_PORT)||9333;
const base=process.env.MAT_UI_SMOKE_URL||'http://127.0.0.1:4174';
const edge=process.env.MAT_EDGE_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const output=path.resolve(__dirname,'../storage/smoke');
const profile=path.join(os.tmpdir(),`mat-erp-s4-edge-${process.pid}`);

async function target(){for(let i=0;i<50;i++){try{const list=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json()),page=list.find(x=>x.type==='page');if(page)return page;}catch{}await delay(100);}throw new Error('Edge DevTools tidak siap.');}
async function run(){
  if(!process.env.MAT_BOOTSTRAP_OWNER_USERNAME||!process.env.MAT_BOOTSTRAP_OWNER_PASSWORD)throw new Error('Credential owner development belum dikonfigurasi.');
  await fs.mkdir(output,{recursive:true});
  const appPort=new URL(base).port||'4174',server=spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:appPort},windowsHide:true,stdio:'ignore'});
  for(let i=0;i<50;i++){try{if((await fetch(`${base}/api/runtime`)).ok)break;}catch{}if(i===49)throw new Error('Server smoke test tidak siap.');await delay(100);}
  const child=spawn(edge,[`--remote-debugging-port=${port}`,'--headless=new','--no-first-run','--disable-extensions','--hide-scrollbars','--window-size=1440,1100',`--user-data-dir=${profile}`,base],{windowsHide:true,stdio:'ignore'});
  let socket;
  try{
    const page=await target();socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
    let seq=0;const pending=new Map(),errors=[];
    socket.onmessage=event=>{const data=JSON.parse(event.data);if(data.id&&pending.has(data.id)){const p=pending.get(data.id);pending.delete(data.id);if(data.error)p.reject(new Error(data.error.message));else p.resolve(data.result);}if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails?.text||'JavaScript exception');if(data.method==='Log.entryAdded'&&data.params.entry.level==='error')errors.push(data.params.entry.text);};
    const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
    const evaluate=async expression=>{const response=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(response.exceptionDetails)throw new Error(response.exceptionDetails.exception?.description||response.exceptionDetails.text);return response.result?.value;};
    await Promise.all([send('Page.enable'),send('Runtime.enable'),send('Log.enable')]);await send('Page.navigate',{url:base});await delay(1000);
    const credentials=JSON.stringify({username:process.env.MAT_BOOTSTRAP_OWNER_USERNAME,password:process.env.MAT_BOOTSTRAP_OWNER_PASSWORD});
    await evaluate(`(()=>{const c=${credentials},f=document.getElementById('loginForm');f.username.value=c.username;f.password.value=c.password;f.requestSubmit();return true})()`);await delay(1400);
    const session=await evaluate(`({hash:location.hash,appVisible:!document.getElementById('app').hidden,loginError:document.getElementById('loginError').textContent})`);
    if(!session.appVisible)throw new Error(`Login UI gagal: ${session.loginError||'aplikasi tetap tersembunyi'}`);
    const pages=[];
    for(const item of [{hash:'#/accounting',file:'sprint4-accounting.png',required:'process-rail'},{hash:'#/tax',file:'sprint4-tax.png',required:'metrics'},{hash:'#/hr/attendance',file:'sprint4-attendance.png',required:'dashboard-grid'},{hash:'#/payroll',file:'sprint4-payroll.png',required:'table-panel'}]){
      await evaluate(`location.hash=${JSON.stringify(item.hash)}`);await delay(900);
      const state=await evaluate(`({hash:location.hash,title:document.querySelector('main h1')?.textContent||'',required:!!document.querySelector('.${item.required}'),error:document.querySelector('.error-state')?.textContent||''})`);
      const capture=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await fs.writeFile(path.join(output,item.file),Buffer.from(capture.data,'base64'));pages.push({...state,file:item.file});
    }
    await send('Browser.close').catch(()=>{});socket=null;
    const unexpected=errors.filter(message=>!message.includes('status of 401 (Unauthorized)'));
    console.log(JSON.stringify({ok:pages.every(x=>x.required&&!x.error)&&unexpected.length===0,base,session:{hash:session.hash,appVisible:session.appVisible},pages,consoleErrors:unexpected},null,2));
  }finally{if(socket)socket.close();if(child.exitCode===null)child.kill();if(server.exitCode===null)server.kill();}
}
run().catch(error=>{console.error(JSON.stringify({ok:false,error:error.message}));process.exitCode=1;});
