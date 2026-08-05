'use strict';
const { readBody, readRawBody } = require('../core/util');
const { AppError } = require('../core/errors');
const privateStorage = require('../infrastructure/files/private-storage');
const { grantsFor } = require('../core/permissions');
const auth = require('../infrastructure/database/repositories/auth');
const operations = require('../infrastructure/database/repositories/operations');
const runtime = require('../infrastructure/database/repositories/runtime');
const ratelimit = require('../core/ratelimit');
const docVerify = require('../core/doc-verification');
const secureCookie=()=>process.env.NODE_ENV==='production'||process.env.MAT_COOKIE_SECURE==='1'?'; Secure':'';
function authResult(ctx,result){if(result.mfaRequired||result.passwordChangeRequired)return result;ctx.cookie=`mat_session=${result.session.token}; Path=/; HttpOnly; SameSite=Strict${secureCookie()}; Max-Age=${Math.floor(auth.SESSION_ABSOLUTE_MS/1000)}`;return{user:result.user,csrfToken:result.session.csrfToken,permissions:result.permissions};}
// rpId = domain efektif; origin = asal request. Diambil dari header dan
// ditegakkan oleh verifikasi WebAuthn (tanda tangan mencakup keduanya).
function rpFrom(req){const origin=req.headers.origin||'';let rpId;try{rpId=new URL(origin).hostname;}catch{rpId=String(req.headers.host||'localhost').split(':')[0];}return{rpId:rpId||'localhost',origin};}
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
  if(method==='POST'&&p==='/api/auth/passkey/login/options'){const body=await readBody(req);ratelimit.consume('login',`pko:${ctx.ip}`);return auth.passkeyLoginOptions(client,body.username);}
  if(method==='POST'&&p==='/api/auth/passkey/login'){const body=await readBody(req);ratelimit.consume('login',`pk:${body.username||'anon'}:${ctx.ip}`);return authResult(ctx,await auth.passkeyLogin(client,{username:body.username,credential:body.credential,ip:ctx.ip,device:ctx.device},rpFrom(req)));}
return NO_MATCH;}
async function dispatchPrivate(client,req,url,ctx){const p=url.pathname,method=req.method;
  if(method==='GET'&&p==='/api/auth/session')return {user:ctx.user,csrfToken:await auth.rotateCsrf(client,ctx.session.id),permissions:[...grantsFor(ctx.user.role)],unreadNotifications:(await operations.unreadCount(client,ctx.user)).unread};
  if(method==='GET'&&p==='/api/auth/devices')return {items:await auth.devices(client,ctx.user.id)};
  if(method==='POST'&&p==='/api/auth/change-password'){const body=await readBody(req);await auth.changeOwnPassword(client,ctx.user,body.currentPassword,body.newPassword);ctx.cookie='mat_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0';return{ok:true,reauthenticationRequired:true};}
  if(method==='PATCH'&&p==='/api/auth/profile'){const body=await readBody(req);const updated=await auth.updateOwnProfile(client,ctx.user,body);await runtime.audit(client,{userId:ctx.user.id,action:'UPDATE',module:'account',entityType:'USER_PROFILE',entityId:ctx.user.id,newValue:{displayName:updated.displayName},requestId:ctx.requestId,branchId:ctx.user.branchId});return{user:updated};}
  if(method==='POST'&&p==='/api/auth/profile-photo'){let buffer;try{buffer=await readRawBody(req,privateStorage.MAX_BYTES+1);}catch(error){if(error.message==='BODY_TOO_LARGE')throw new AppError('FILE_TOO_LARGE');throw error;}const filename=decodeURIComponent(req.headers['x-file-name']||'avatar'),mimeType=String(req.headers['content-type']||'').split(';')[0].toLowerCase();const result=await auth.setOwnProfilePhoto(client,ctx.user,{buffer,filename,mimeType});await operations.enqueue(client,{type:'FILE_SCAN',user:ctx.user,params:{fileId:result.fileId},executionKey:`file:${result.fileId}`,system:true});await runtime.audit(client,{userId:ctx.user.id,action:'UPDATE',module:'account',entityType:'USER_PROFILE_PHOTO',entityId:ctx.user.id,newValue:{fileId:result.fileId,scanStatus:result.scanStatus},requestId:ctx.requestId,branchId:ctx.user.branchId});ctx.status=202;return result;}
  if(method==='GET'&&p==='/api/auth/profile-photo'){const dl=await auth.ownProfilePhoto(client,ctx.user);if(!dl)throw new AppError('RESOURCE_NOT_FOUND');ctx.download=dl;ctx.download.item.disposition='inline';return null;}
  if(method==='POST'&&p==='/api/auth/passkey/register/options')return auth.passkeyRegisterOptions(client,ctx.user);
  if(method==='POST'&&p==='/api/auth/passkey/register'){const body=await readBody(req);const r=await auth.passkeyRegister(client,ctx.user,body,rpFrom(req));await runtime.audit(client,{userId:ctx.user.id,action:'CREATE',module:'account',entityType:'PASSKEY',entityId:ctx.user.id,newValue:{credentialId:r.credentialId},requestId:ctx.requestId,branchId:ctx.user.branchId});return r;}
  if(method==='GET'&&p==='/api/auth/passkey')return {items:await auth.passkeyList(client,ctx.user.id)};
  {const pkId=p.match(/^\/api\/auth\/passkey\/([0-9a-f-]{36})$/);if(method==='DELETE'&&pkId){const r=await auth.passkeyDelete(client,ctx.user.id,pkId[1]);await runtime.audit(client,{userId:ctx.user.id,action:'DELETE',module:'account',entityType:'PASSKEY',entityId:pkId[1],requestId:ctx.requestId,branchId:ctx.user.branchId});return r;}}
  if(method==='POST'&&p==='/api/auth/mfa/setup'){const body=await readBody(req);return auth.startMfaSetup(client,ctx.user,body.currentCode);}
  if(method==='POST'&&p==='/api/auth/mfa/enable')return auth.enableMfa(client,ctx.user,(await readBody(req)).code);
  if(method==='GET'&&p==='/api/auth/mfa/recovery-codes')return auth.recoveryCodeStatus(client,ctx.user.id);
  if(method==='POST'&&p==='/api/auth/mfa/recovery-codes/regenerate'){
    const body=await readBody(req);
    await auth.assertRecentMfa(client,{user:ctx.user,session:ctx.session,action:'Regenerasi recovery code MFA'});
    return auth.regenerateRecoveryCodes(client,ctx.user,body.code);
  }
  if(method==='POST'&&p==='/api/auth/mfa/disable'){const body=await readBody(req);await auth.disableMfa(client,ctx.user,body.password,body.code);return{ok:true};}
  if(method==='POST'&&p==='/api/auth/logout'){await auth.logout(client,ctx.session.id);ctx.cookie='mat_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0';return {ok:true};}
  if(method==='POST'&&p==='/api/auth/logout-all'){await auth.logoutAll(client,ctx.user.id);ctx.cookie='mat_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0';return {ok:true};}
return NO_MATCH;}
module.exports={dispatchPublic,dispatchPrivate};
