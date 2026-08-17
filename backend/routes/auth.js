'use strict';
const { readBody, readRawBody, parseCookies } = require('../core/util');
const { AppError } = require('../core/errors');
const privateStorage = require('../infrastructure/files/private-storage');
const { grantsFor } = require('../core/permissions');
const auth = require('../infrastructure/database/repositories/auth');
const operations = require('../infrastructure/database/repositories/operations');
const runtime = require('../infrastructure/database/repositories/runtime');
const ratelimit = require('../core/ratelimit');
const docVerify = require('../core/doc-verification');
const controlPlane = require('../infrastructure/database/repositories/control-plane');
const oidc = require('../core/oidc');
const socialAuth = require('../infrastructure/database/repositories/social-auth');
const secureCookie=()=>process.env.NODE_ENV==='production'||process.env.MAT_COOKIE_SECURE==='1'?'; Secure':'';
// Asal absolut untuk redirect_uri OAuth (harus cocok dgn yang didaftarkan di
// provider). OAUTH_REDIRECT_BASE meng-override (mis. di belakang proxy HTTPS).
const oauthOrigin=(req,ctx)=>process.env.OAUTH_REDIRECT_BASE||`${ctx.protocol||'http'}://${req.headers.host}`;
const mockIdpEnabled=()=>process.env.NODE_ENV!=='production'&&process.env.MAT_MOCK_IDP==='1';
function b64urlJson(obj){return Buffer.from(JSON.stringify(obj)).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function unb64urlJson(s){return JSON.parse(Buffer.from(String(s).replace(/-/g,'+').replace(/_/g,'/'),'base64').toString());}
function authResult(ctx,result){if(result.mfaRequired||result.passwordChangeRequired)return result;ctx.cookie=`mat_session=${result.session.token}; Path=/; HttpOnly; SameSite=Strict${secureCookie()}; Max-Age=${Math.floor(auth.SESSION_ABSOLUTE_MS/1000)}`;return{user:result.user,csrfToken:result.session.csrfToken,permissions:result.permissions};}
// rpId = domain efektif; origin = asal request. Diambil dari header dan
// ditegakkan oleh verifikasi WebAuthn (tanda tangan mencakup keduanya).
function rpFrom(req){const origin=req.headers.origin||'';let rpId;try{rpId=new URL(origin).hostname;}catch{rpId=String(req.headers.host||'localhost').split(':')[0];}return{rpId:rpId||'localhost',origin};}
const { NO_MATCH } = require('./shared');
async function dispatchPublic(client,req,url,ctx){const p=url.pathname,method=req.method;
  if(method==='GET'&&p==='/api/runtime') return {demoMode:false,database:'postgres'};
  // Konteks tenant publik untuk halaman login multi-tenant: resolve tenant dari
  // domain email (mode login bersama) atau dari Host (subdomain ber-brand). Hanya
  // memaparkan identitas publik & status — tanpa data sensitif. Dipakai halaman
  // login untuk white-label + deteksi tenant ditangguhkan sebelum autentikasi.
  if(method==='GET'&&p==='/api/auth/tenant-context'){
    ratelimit.consume('login',`tenantctx:${ctx.ip}`);
    const email=(url.searchParams.get('email')||'').trim().toLowerCase();
    const domain=email.includes('@')?email.split('@')[1]:(url.searchParams.get('domain')||'').trim().toLowerCase();
    let t=null;
    if(domain){ t=(await client.query("SELECT code,name,status,primary_domain,residency,branding,auth_policy FROM tenants WHERE lower(primary_domain)=$1 AND status<>'offboarding'",[domain])).rows[0]||null; }
    else { t=await controlPlane.resolveTenantByHost(client,req.headers.host); }
    if(!t) return {resolved:false,domain:domain||null};
    const residency=(t.residency||'ID');
    return {resolved:true,tenant:{code:t.code,name:t.name,status:t.status,
      workspace:`${t.code}.singularity.id`,primaryDomain:t.primary_domain||null,
      region:residency==='ID'?'APAC Indonesia':residency,environment:`PRD-${residency}`,
      branding:t.branding||{},authPolicy:t.auth_policy||{}}};
  }
  // Self-service signup (trial). Publik + rate-limit ketat. Membuat organisasi
  // baru lengkap (tenant+baseline+owner+langganan trial) dalam satu transaksi.
  if(method==='POST'&&p==='/api/auth/signup'){
    ratelimit.consume('login',`signup:${ctx.ip}`);
    const body=await readBody(req);
    if(!body.password||String(body.password).length<12)throw new AppError('VALIDATION_ERROR','Kata sandi minimal 12 karakter.');
    const result=await controlPlane.publicSignup(client,{companyName:body.companyName,tenantCode:body.tenantCode,ownerUsername:body.ownerUsername,ownerDisplayName:body.ownerDisplayName,passwordHash:auth.hashPassword(body.password),planCode:body.planCode||'starter'});
    ctx.status=201;
    return {ok:true,tenant:result.tenant,owner:result.owner,loginHint:{username:result.owner.username,workspace:`${result.tenant.code}.singularity.id`}};
  }
  // ── Social login (OIDC): daftar/masuk via Google / Microsoft / SSO ──────────
  // Provider aktif = yang client id+secret-nya terkonfigurasi (mock: dev-only).
  if(method==='GET'&&p==='/api/auth/providers') return {providers:oidc.enabledProviders()};
  {const ms=p.match(/^\/api\/auth\/oauth\/([a-z][a-z0-9_-]*)\/start$/);
   if(method==='GET'&&ms){const provider=ms[1];ratelimit.consume('login',`oauthstart:${ctx.ip}`);
     oidc.providerConfig(provider);
     const origin=oauthOrigin(req,ctx),nonce=oidc.newNonce();
     const state=oidc.signState({p:provider,n:nonce,t:Date.now()+10*60*1000});
     const redirectUri=oidc.redirectUriFor(provider,origin),extra={};
     if(provider==='mock')for(const k of ['email','name','sub']){const v=url.searchParams.get(k);if(v)extra[k]=v;}
     const authUrl=oidc.authorizeUrl(provider,{redirectUri,state,nonce,origin,extra});
     // SameSite=Lax agar cookie nonce ikut terkirim saat provider menavigasi balik.
     ctx.cookie=`oauth_state=${nonce}; Path=/; HttpOnly; SameSite=Lax${secureCookie()}; Max-Age=600`;
     ctx.status=302;ctx.headers={Location:authUrl};return {};}}
  {const mc=p.match(/^\/api\/auth\/oauth\/([a-z][a-z0-9_-]*)\/callback$/);
   if(method==='GET'&&mc){const provider=mc[1];ratelimit.consume('login',`oauthcb:${ctx.ip}`);
     const oerr=url.searchParams.get('error');
     if(oerr){ctx.status=302;ctx.headers={Location:`/login/?oauth_error=${encodeURIComponent(oerr)}`};return {};}
     const code=url.searchParams.get('code'),state=url.searchParams.get('state');
     if(!code)throw new AppError('VALIDATION_ERROR','Kode OAuth tidak ada.');
     const sd=oidc.verifyState(state);
     const cookieNonce=parseCookies(req).oauth_state;
     if(sd.p!==provider||!cookieNonce||cookieNonce!==sd.n)throw new AppError('VALIDATION_ERROR','State/nonce OAuth tidak cocok.');
     const origin=oauthOrigin(req,ctx),redirectUri=oidc.redirectUriFor(provider,origin);
     const tokens=await oidc.exchangeCode(provider,{code,redirectUri,origin});
     const profile=await oidc.fetchUserinfo(provider,tokens.access_token,origin);
     const result=await socialAuth.findOrCreateFromSocial(client,{profile,ip:ctx.ip,device:ctx.device});
     const sess=`mat_session=${result.session.token}; Path=/; HttpOnly; SameSite=Strict${secureCookie()}; Max-Age=${Math.floor(auth.SESSION_ABSOLUTE_MS/1000)}`;
     ctx.cookie=[sess,'oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'];
     // Arahkan ke workspace tenant pengguna. MAT (tenant default) memakai host saat
     // ini → '/'; tenant lain → subdomain workspace-nya (sesuai tenant↔host binding).
     const MAT_TENANT='00000000-0000-0000-0000-000000000001';
     let target='/';
     if(result.user.tenantId&&result.user.tenantId!==MAT_TENANT&&result.tenant)
       target=result.tenant.primaryDomain?`https://${result.tenant.primaryDomain}/`:`https://${result.tenant.code}.singularity.id/`;
     ctx.status=302;ctx.headers={Location:target};return {};}}
  // Mock IdP (dev-only, MAT_MOCK_IDP=1) — provider OIDC lokal untuk uji end-to-end
  // tanpa Google/Microsoft nyata. authorize→(code)→token→userinfo.
  if(p.startsWith('/api/mock-idp/')){
    if(!mockIdpEnabled())throw new AppError('RESOURCE_NOT_FOUND','Mock IdP nonaktif.');
    if(method==='GET'&&p==='/api/mock-idp/authorize'){
      const email=(url.searchParams.get('email')||'founder@acme.test').toLowerCase();
      const name=url.searchParams.get('name')||'Founder Acme';
      const sub=url.searchParams.get('sub')||('mock-'+require('node:crypto').createHash('sha1').update(email).digest('hex').slice(0,16));
      const redirectUri=url.searchParams.get('redirect_uri'),state=url.searchParams.get('state')||'';
      if(!redirectUri)throw new AppError('VALIDATION_ERROR','redirect_uri wajib.');
      ctx.status=302;ctx.headers={Location:`${redirectUri}?code=${encodeURIComponent(b64urlJson({sub,email,name}))}&state=${encodeURIComponent(state)}`};return {};}
    if(method==='POST'&&p==='/api/mock-idp/token'){
      const code=new URLSearchParams((await readRawBody(req)).toString()).get('code')||'';
      return {access_token:code,token_type:'Bearer',id_token:`mock.${code}`,expires_in:3600,scope:'openid email profile'};}
    if(method==='GET'&&p==='/api/mock-idp/userinfo'){
      const token=String(req.headers['authorization']||'').replace(/^Bearer\s+/i,'');
      let prof;try{prof=unb64urlJson(token);}catch{throw new AppError('AUTH_FAILED','Token mock tidak valid.');}
      return {sub:prof.sub,email:prof.email,email_verified:true,name:prof.name,picture:null};}
  }
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
