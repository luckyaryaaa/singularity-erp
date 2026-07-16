'use strict';
const { randomUUID } = require('node:crypto');
const { parseCookies } = require('./core/util');
const { AppError } = require('./core/errors');
const { getPool } = require('./infrastructure/database/pool');
const { withTransaction } = require('./infrastructure/database/transaction');
const auth = require('./infrastructure/database/repositories/auth');
const ratelimit = require('./core/ratelimit');
const events = require('./core/events');
const privateStorage = require('./infrastructure/files/private-storage');
const { requestContext } = require('./core/request-context');
const apiMetrics = require('./core/api-metrics');
const { NO_MATCH } = require('./routes/shared');
const authRoutes = require('./routes/auth');
const domainRoutes = [
  require('./routes/workspace'), require('./routes/documents'), require('./routes/sales'),
  require('./routes/procurement'),
  require('./routes/operations'), require('./routes/masters'), require('./routes/organization'),
  require('./routes/inventory'), require('./routes/production'), require('./routes/finance'),
  require('./routes/hr'), require('./routes/governance')
];
const json=(res,status,body,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(body));};
const originAllowed=(req,ctx)=>!req.headers.origin||req.headers.origin===`${ctx.protocol}://${ctx.host}`;
async function loginTransaction(work){const client=await getPool().connect();try{await client.query('BEGIN');try{const value=await work(client);await client.query('COMMIT');return value;}catch(error){if(error instanceof AppError&&['AUTH_FAILED','ACCOUNT_LOCKED'].includes(error.code))await client.query('COMMIT');else await client.query('ROLLBACK');throw error;}}finally{client.release();}}
async function dispatch(client,req,url,ctx){
  const publicResult=await authRoutes.dispatchPublic(client,req,url,ctx);if(publicResult!==NO_MATCH)return publicResult;
  const resolved=await auth.resolveSession(client,parseCookies(req).mat_session,{ip:ctx.ip,device:ctx.device});
  if(!resolved)throw new AppError('SESSION_EXPIRED');ctx.user=resolved.user;ctx.session=resolved.session;
  const p=url.pathname,method=req.method;ratelimit.consume(method==='GET'?'read':p==='/api/jobs'?'export':'write',ctx.user.id);
  if(method!=='GET'&&(!originAllowed(req,ctx)||!await auth.verifyCsrf(client,ctx.session.id,req.headers['x-csrf-token'])))throw new AppError('CSRF_REJECTED');
  const privateResult=await authRoutes.dispatchPrivate(client,req,url,ctx);if(privateResult!==NO_MATCH)return privateResult;
  for(const routes of domainRoutes){const result=await routes.dispatch(client,req,url,ctx);if(result!==NO_MATCH)return result;}
  throw new AppError('RESOURCE_NOT_FOUND',`Endpoint ${method} ${p} belum tersedia pada runtime PostgreSQL.`);
}

async function handle(req,res){const started=Date.now(),requestId=randomUUID(),url=new URL(req.url,'http://localhost'),network=requestContext(req),ctx={requestId,...network,device:(req.headers['user-agent']||'unknown').slice(0,120)};
  try{
    if(process.env.NODE_ENV==='production'&&process.env.MAT_REQUIRE_HTTPS==='1'&&ctx.protocol!=='https'&&url.pathname!=='/api/health')throw new AppError('PERMISSION_DENIED','HTTPS wajib untuk runtime production.');
    // Liveness: proses hidup, tanpa menyentuh database (§5.1 readiness/liveness terpisah).
    if(req.method==='GET'&&url.pathname==='/api/live'){
      return json(res,200,{ok:true,uptimeSeconds:Math.round(process.uptime()),at:new Date().toISOString()},{'X-Request-Id':requestId});
    }
    // Readiness/health: termasuk cek database — dipakai uptime monitor & load balancer.
    if(req.method==='GET'&&url.pathname==='/api/health'){
      ratelimit.consume('read',`health:${ctx.ip}`);
      let db='up';try{await getPool().query('SELECT 1');}catch{db='down';}
      return json(res,db==='up'?200:503,{ok:db==='up',db,at:new Date().toISOString()},{'X-Request-Id':requestId});
    }
    if(req.method==='GET'&&url.pathname==='/api/events'){
      const result=await withTransaction(c=>auth.resolveSession(c,parseCookies(req).mat_session,{ip:ctx.ip,device:ctx.device}));if(!result)throw new AppError('SESSION_EXPIRED');
      ratelimit.consume('read',result.session.userId||result.session.id);
      res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
      // Registrasi ke event bus — tanpa ini outbox dispatcher tidak punya penerima.
      events.subscribe(result.session.id,res);
      const ping=setInterval(()=>{try{res.write(':ping\n\n');}catch{clearInterval(ping);}},25_000);ping.unref();
      req.on('close',()=>{clearInterval(ping);events.unsubscribe(result.session.id);});
      return;
    }
    const durableAuth=req.method==='POST'&&['/api/auth/login','/api/auth/mfa','/api/auth/change-password-required'].includes(url.pathname);
    const body=durableAuth?await loginTransaction(c=>dispatch(c,req,url,ctx)):await withTransaction(c=>dispatch(c,req,url,ctx));
    apiMetrics.requests++;apiMetrics.latencies.push(Date.now()-started);if(apiMetrics.latencies.length>500)apiMetrics.latencies.shift();
    if(ctx.download){const {item,buffer}=ctx.download,filename=item.originalFilename||item.fileName||'download';res.writeHead(200,{'Content-Type':item.mimeType,'Content-Length':buffer.length,'Content-Disposition':`attachment; filename="${privateStorage.safeName(filename).replace(/"/g,'')}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','X-Request-Id':requestId});return res.end(buffer);}
    json(res,ctx.status||200,body,{'X-Request-Id':requestId,...(ctx.cookie?{'Set-Cookie':ctx.cookie}:{})});
  }catch(error){apiMetrics.requests++;apiMetrics.errors++;apiMetrics.latencies.push(Date.now()-started);if(apiMetrics.latencies.length>500)apiMetrics.latencies.shift();let e=error instanceof AppError?error:null;if(!e&&['23502','23503','23505','23514','22P02'].includes(error.code))e=new AppError('VALIDATION_ERROR',error.code==='23505'?'Kode atau data unik sudah digunakan.':'Data melanggar aturan validasi database.');if(!e&&['BODY_INVALID_JSON','BODY_TOO_LARGE'].includes(error.message))e=new AppError('VALIDATION_ERROR','Format atau ukuran body tidak valid.');if(!e)e=new AppError('INTERNAL');if(!(error instanceof AppError)&&e.code==='INTERNAL')console.error(JSON.stringify({level:'error',requestId,error:error.message}));json(res,e.status,e.toBody(),{'X-Request-Id':requestId});}
}
module.exports={handle};
setInterval(()=>ratelimit.sweep(),60_000).unref();
