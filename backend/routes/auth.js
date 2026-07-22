'use strict';
const { readBody } = require('../core/util');
const { AppError } = require('../core/errors');
const { grantsFor } = require('../core/permissions');
const auth = require('../infrastructure/database/repositories/auth');
const operations = require('../infrastructure/database/repositories/operations');
const ratelimit = require('../core/ratelimit');
const docVerify = require('../core/doc-verification');
const secureCookie=()=>process.env.NODE_ENV==='production'||process.env.MAT_COOKIE_SECURE==='1'?'; Secure':'';
function authResult(ctx,result){if(result.mfaRequired||result.passwordChangeRequired)return result;ctx.cookie=`mat_session=${result.session.token}; Path=/; HttpOnly; SameSite=Strict${secureCookie()}; Max-Age=${Math.floor(auth.SESSION_ABSOLUTE_MS/1000)}`;return{user:result.user,csrfToken:result.session.csrfToken,permissions:result.permissions};}
const { NO_MATCH } = require('./shared');
async function dispatchPublic(client,req,url,ctx){const p=url.pathname,method=req.method;
  if(method==='GET'&&p==='/api/runtime') return {demoMode:false,database:'postgres'};
  // Sprint 15: verifikasi keaslian dokumen — publik + rate-limit per IP.
  // Membuktikan kode HMAC valid untuk nomor dokumen, lalu memaparkan
  // metadata minimal non-sensitif (tanpa nilai baris/pihak internal).
  if(method==='GET'&&p==='/api/verify'){
    ratelimit.consume('login',`verify:${ctx.ip}`);
    const docNumber=url.searchParams.get('doc')||'',code=url.searchParams.get('code')||'';
    const row=(await client.query(`SELECT document_number,document_type,status,party_name,official_issued_at,official_signature,official_key_id,official_template_version,official_payload FROM business_documents WHERE document_number=$1`,[docNumber])).rows[0];
    if(!row?.official_signature||!row.official_payload)return{valid:false,message:'Dokumen resmi tidak ditemukan atau belum pernah diterbitkan.'};
    let signatureValid=false;
    try{signatureValid=docVerify.verifyPayload(row.official_payload,code,process.env,row.official_key_id);}catch{return{valid:false,message:'Key verifikasi untuk versi dokumen ini tidak tersedia.'};}
    if(!signatureValid)return{valid:false,message:'Kode verifikasi tidak cocok dengan snapshot dokumen resmi.'};
    if(['VOID','CANCELLED','REJECTED'].includes(row.status))return{valid:false,revoked:true,message:`Dokumen telah dicabut dengan status ${row.status}.`,document:{documentNumber:row.document_number,type:row.document_type,status:row.status}};
    const party=row.party_name?`${String(row.party_name).slice(0,3)}${'*'.repeat(Math.min(Math.max(String(row.party_name).length-3,3),12))}`:null;
    return{valid:true,document:{documentNumber:row.document_number,type:row.document_type,status:row.status,issuedAt:row.official_issued_at,templateVersion:row.official_template_version,partyMasked:party}};
  }
  if(method==='POST'&&p==='/api/auth/login'){
    const body=await readBody(req);ratelimit.consume('login',`${body.username||'anon'}:${ctx.ip}`);if(!body.username||!body.password)throw new AppError('VALIDATION_ERROR','Nama pengguna dan kata sandi wajib diisi.');
    const result=await auth.login(client,{...body,ip:ctx.ip,device:ctx.device});
    return authResult(ctx,result);
  }
  if(method==='POST'&&p==='/api/auth/mfa'){const body=await readBody(req);ratelimit.consume('login',`${body.mfaToken||'anon'}:${ctx.ip}`);return authResult(ctx,await auth.completeMfa(client,{...body,ip:ctx.ip,device:ctx.device}));}
  if(method==='POST'&&p==='/api/auth/change-password-required'){const body=await readBody(req);ratelimit.consume('login',`${body.changeToken||'anon'}:${ctx.ip}`);return authResult(ctx,await auth.changePasswordWithToken(client,{...body,ip:ctx.ip,device:ctx.device}));}
return NO_MATCH;}
async function dispatchPrivate(client,req,url,ctx){const p=url.pathname,method=req.method;
  if(method==='GET'&&p==='/api/auth/session')return {user:ctx.user,csrfToken:await auth.rotateCsrf(client,ctx.session.id),permissions:[...grantsFor(ctx.user.role)],unreadNotifications:(await operations.unreadCount(client,ctx.user)).unread};
  if(method==='GET'&&p==='/api/auth/devices')return {items:await auth.devices(client,ctx.user.id)};
  if(method==='POST'&&p==='/api/auth/change-password'){const body=await readBody(req);await auth.changeOwnPassword(client,ctx.user,body.currentPassword,body.newPassword);ctx.cookie='mat_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0';return{ok:true,reauthenticationRequired:true};}
  if(method==='POST'&&p==='/api/auth/mfa/setup')return auth.startMfaSetup(client,ctx.user);
  if(method==='POST'&&p==='/api/auth/mfa/enable'){await auth.enableMfa(client,ctx.user,(await readBody(req)).code);return{ok:true};}
  if(method==='POST'&&p==='/api/auth/mfa/disable'){await auth.disableMfa(client,ctx.user,(await readBody(req)).password);return{ok:true};}
  if(method==='POST'&&p==='/api/auth/logout'){await auth.logout(client,ctx.session.id);ctx.cookie='mat_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0';return {ok:true};}
  if(method==='POST'&&p==='/api/auth/logout-all'){await auth.logoutAll(client,ctx.user.id);ctx.cookie='mat_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0';return {ok:true};}
return NO_MATCH;}
module.exports={dispatchPublic,dispatchPrivate};
