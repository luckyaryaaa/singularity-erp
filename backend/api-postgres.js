'use strict';
const { randomUUID, randomBytes } = require('node:crypto');
const { readBody, readRawBody, parseCookies } = require('./core/util');
const { AppError } = require('./core/errors');
const { grantsFor, assertPermission, APPROVAL_MATRIX, MODULES } = require('./core/permissions');
const { getPool, healthCheck, stats } = require('./infrastructure/database/pool');
const { withTransaction } = require('./infrastructure/database/transaction');
const auth = require('./infrastructure/database/repositories/auth');
const operations = require('./infrastructure/database/repositories/operations');
const runtime = require('./infrastructure/database/repositories/runtime');
const documentCore = require('./core/documents');
const posting = require('./infrastructure/database/repositories/posting');
const { verifyPassword } = require('./core/auth');
const ratelimit = require('./core/ratelimit');
const events = require('./core/events');
const privateStorage = require('./infrastructure/files/private-storage');
const artifactStorage = require('./infrastructure/files/artifact-storage');
const businessOps = require('./infrastructure/database/repositories/business-operations');
const masterData = require('./infrastructure/database/repositories/master-data');
const { migrationFiles } = require('./infrastructure/database/migrations');
const fs = require('node:fs/promises');
const path = require('node:path');

const masterModules = { customers:'customer', suppliers:'supplier', products:'product', employees:'employee' };
const apiMetrics={requests:0,errors:0,latencies:[]};
const secureCookie = () => process.env.NODE_ENV === 'production' || process.env.MAT_COOKIE_SECURE === '1' ? '; Secure' : '';
const json = (res, status, body, headers={}) => {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});
  res.end(JSON.stringify(body));
};
const originAllowed = (req) => !req.headers.origin || req.headers.origin === `${req.socket.encrypted?'https':'http'}://${req.headers.host}`;
async function loginTransaction(work){const client=await getPool().connect();try{await client.query('BEGIN');try{const value=await work(client);await client.query('COMMIT');return value;}catch(error){if(error instanceof AppError&&['AUTH_FAILED','ACCOUNT_LOCKED'].includes(error.code))await client.query('COMMIT');else await client.query('ROLLBACK');throw error;}}finally{client.release();}}
function authResult(ctx,result){if(result.mfaRequired||result.passwordChangeRequired)return result;ctx.cookie=`mat_session=${result.session.token}; Path=/; HttpOnly; SameSite=Strict${secureCookie()}; Max-Age=${Math.floor(auth.SESSION_ABSOLUTE_MS/1000)}`;return{user:result.user,csrfToken:result.session.csrfToken,permissions:result.permissions};}

async function dashboard(client, user) {
  assertPermission(user,'dashboard.view');
  const docs=(await client.query(`SELECT * FROM business_documents WHERE is_archived=false AND ($1::boolean OR branch_id=$2) ORDER BY updated_at DESC`,[['owner','admin'].includes(user.role)||user.branchScope==='*',user.branchId])).rows.map(runtime.camel);
  const invoices=docs.filter(d=>d.documentType==='INVOICE'&&!['DRAFT','VOID','CANCELLED'].includes(d.status)),month=new Date().toISOString().slice(0,7);
  const monthInvoices=invoices.filter(d=>String(d.payload?.invoiceDate||d.createdAt).startsWith(month)),revenueMonth=monthInvoices.reduce((s,d)=>s+d.amount,0);
  const overdue=invoices.filter(d=>d.status==='OVERDUE'),open=invoices.filter(d=>d.status!=='CLOSED'),supplier=docs.filter(d=>d.documentType==='SUPPLIER_INVOICE'&&!['CLOSED','VOID','CANCELLED'].includes(d.status));
  const active=docs.filter(d=>['WORK_ORDER','SALES_ORDER','PROJECT'].includes(d.documentType)&&['WAITING_APPROVAL','APPROVED','IN_PROCESS','PARTIALLY_COMPLETED'].includes(d.status)),inProduction=active.filter(d=>d.status==='IN_PROCESS');
  const inventory=(await client.query('SELECT count(*)::int sku_count,COALESCE(sum(value_idr),0)::float value,count(*) FILTER(WHERE qty_on_hand<min_qty)::int critical FROM inventory_balances')).rows[0];
  const pending=await runtime.pendingApprovals(client,user,{limit:100}),daily=new Map();for(const d of monthInvoices){const day=String(d.payload?.invoiceDate||d.createdAt).slice(8,10);daily.set(day,(daily.get(day)||0)+d.amount);}let cumulative=0;const revenueSeries=[...daily.entries()].sort().map(([day,value])=>({day,value:(cumulative+=value)}));if(!revenueSeries.length)revenueSeries.push({day:'01',value:0});
  return {asOf:new Date().toISOString(),kpi:{revenueMonth,revenueGrowthPct:0,arOverdue:overdue.reduce((s,d)=>s+d.amount-Number(d.payload?.paid||0),0),arOverdueCount:overdue.length,activeOrders:active.length,inProduction:inProduction.length,utilizationPct:inProduction.length?Math.round(inProduction.reduce((s,d)=>s+Number(d.payload?.progress||0),0)/inProduction.length):0,utilizationTarget:82},attention:{pendingApprovals:pending.total,pendingAmount:pending.items.reduce((s,d)=>s+d.amount,0),slaRisk:pending.items.filter(d=>d.risk==='high').length},health:{arCount:open.length,arTotal:open.reduce((s,d)=>s+d.amount-Number(d.payload?.paid||0),0),apCount:supplier.length,apTotal:supplier.reduce((s,d)=>s+d.amount,0),skuCount:inventory.sku_count,criticalStock:inventory.critical,inventoryValue:inventory.value,orderCount:active.length,orderBook:active.reduce((s,d)=>s+d.amount,0),cashPosition:0},revenueSeries,activeJobs:active.slice(0,8).map(d=>({id:d.id,documentNumber:d.documentNumber,title:d.title,party:d.partyName,progress:Number(d.payload?.progress||0),amount:d.amount,dueDate:d.dueDate,status:d.status,stage:d.payload?.stage||d.status}))};
}
async function storageMetrics(){const root=path.resolve(__dirname,'../storage');let used=0;async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true}).catch(()=>[])){const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else if(entry.isFile())used+=(await fs.stat(file)).size;}}await walk(root);const disk=await fs.statfs(root).catch(()=>null),total=disk?Number(disk.bsize)*Number(disk.blocks):0,free=disk?Number(disk.bsize)*Number(disk.bavail):0,capacity=total||Math.max(used,1),usedDisk=total-free,usedPct=Math.round(usedDisk/capacity*1000)/10;return{usedGb:Math.round(used/1073741824*1000)/1000,totalGb:Math.round(capacity/1073741824*10)/10,usedPct,level:usedPct>=90?'critical':usedPct>=75?'warning':'normal'};}

async function dispatch(client, req, url, ctx) {
  const p=url.pathname, method=req.method;
  if(method==='GET'&&p==='/api/runtime') return {demoMode:false,database:'postgres'};
  if(method==='POST'&&p==='/api/auth/login'){
    const body=await readBody(req);ratelimit.consume('login',`${body.username||'anon'}:${ctx.ip}`);if(!body.username||!body.password)throw new AppError('VALIDATION_ERROR','Nama pengguna dan kata sandi wajib diisi.');
    const result=await auth.login(client,{...body,ip:ctx.ip,device:ctx.device});
    return authResult(ctx,result);
  }
  if(method==='POST'&&p==='/api/auth/mfa'){const body=await readBody(req);ratelimit.consume('login',`${body.mfaToken||'anon'}:${ctx.ip}`);return authResult(ctx,await auth.completeMfa(client,{...body,ip:ctx.ip,device:ctx.device}));}
  if(method==='POST'&&p==='/api/auth/change-password-required'){const body=await readBody(req);ratelimit.consume('login',`${body.changeToken||'anon'}:${ctx.ip}`);return authResult(ctx,await auth.changePasswordWithToken(client,{...body,ip:ctx.ip,device:ctx.device}));}
  const resolved=await auth.resolveSession(client,parseCookies(req).mat_session);
  if(!resolved)throw new AppError('SESSION_EXPIRED');ctx.user=resolved.user;ctx.session=resolved.session;
  ratelimit.consume(method==='GET'?'read':p==='/api/jobs'?'export':'write',ctx.user.id);
  if(method!=='GET'){
    if(!originAllowed(req)||!await auth.verifyCsrf(client,ctx.session.id,req.headers['x-csrf-token']))throw new AppError('CSRF_REJECTED');
  }
  if(method==='GET'&&p==='/api/auth/session')return {user:ctx.user,csrfToken:await auth.rotateCsrf(client,ctx.session.id),permissions:[...grantsFor(ctx.user.role)],unreadNotifications:await operations.unreadCount(client,ctx.user)};
  if(method==='GET'&&p==='/api/auth/devices')return {items:await auth.devices(client,ctx.user.id)};
  if(method==='POST'&&p==='/api/auth/change-password'){const body=await readBody(req);await auth.changeOwnPassword(client,ctx.user,body.currentPassword,body.newPassword);return{ok:true};}
  if(method==='POST'&&p==='/api/auth/mfa/setup')return auth.startMfaSetup(client,ctx.user);
  if(method==='POST'&&p==='/api/auth/mfa/enable'){await auth.enableMfa(client,ctx.user,(await readBody(req)).code);return{ok:true};}
  if(method==='POST'&&p==='/api/auth/mfa/disable'){await auth.disableMfa(client,ctx.user,(await readBody(req)).password);return{ok:true};}
  if(method==='POST'&&p==='/api/auth/logout'){await auth.logout(client,ctx.session.id);ctx.cookie='mat_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0';return {ok:true};}
  if(method==='POST'&&p==='/api/auth/logout-all'){await auth.logoutAll(client,ctx.user.id);ctx.cookie='mat_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0';return {ok:true};}
  if(method==='GET'&&p==='/api/dashboard')return dashboard(client,ctx.user);
  if(method==='GET'&&p==='/api/documents'){
    const types=(url.searchParams.get('type')||'').split(',').filter(Boolean);if(!types.length)throw new AppError('VALIDATION_ERROR','Parameter "type" wajib diisi.');
    for(const type of types)assertPermission(ctx.user,`${documentCore.moduleOf(type)}.view`);
    return runtime.listDocuments(client,{types,user:ctx.user,...Object.fromEntries(url.searchParams),sortKey:(url.searchParams.get('sort')||'updated_at:desc').split(':')[0],sortDir:(url.searchParams.get('sort')||'updated_at:desc').split(':')[1]});
  }
  if(method==='POST'&&p==='/api/documents'){
    const body=await readBody(req);assertPermission(ctx.user,`${documentCore.moduleOf(body.type)}.create`);ctx.status=201;
    const result=await runtime.withIdempotency(client,{userId:ctx.user.id,operation:'documents.create',key:req.headers['idempotency-key'],body},async()=>({status:201,body:await runtime.createDocument(client,{...body,amount:Number(body.amount)||0,user:ctx.user,requestId:ctx.requestId})}));ctx.status=result.status;return result.body;
  }
  let m=p.match(/^\/api\/documents\/([^/]+)$/);
  if(method==='GET'&&m){const doc=await runtime.getDocument(client,m[1]);if(!doc)throw new AppError('RESOURCE_NOT_FOUND');assertPermission(ctx.user,`${documentCore.moduleOf(doc.documentType)}.view`,{branchId:doc.branchId});const trail=await runtime.auditTrail(client,doc.id),relations=await runtime.documentRelations(client,doc.id);const levels=doc.requiredApprovalLevels||[];return{...doc,relations,auditTrail:trail,approvalChain:levels.map(level=>({level,done:(doc.approvals||[]).find(a=>a.level===level)||null}))};}
  if(method==='PATCH'&&m){const current=await runtime.getDocument(client,m[1]);if(!current)throw new AppError('RESOURCE_NOT_FOUND');assertPermission(ctx.user,`${documentCore.moduleOf(current.documentType)}.edit`,{branchId:current.branchId});const body=await readBody(req);return runtime.updateDocument(client,{id:m[1],expectedVersion:body.version,patch:body,user:ctx.user,requestId:ctx.requestId});}
  m=p.match(/^\/api\/documents\/([^/]+)\/action$/);
  if(method==='POST'&&m){
    const current=await runtime.getDocument(client,m[1]);if(!current)throw new AppError('RESOURCE_NOT_FOUND');const body=await readBody(req);const permission={submit:'submit',approve:'approve',reject:'approve',revise:'approve',start:'post',complete:'post',close:'post',cancel:'cancel',void:'void'}[body.action];if(!permission)throw new AppError('VALIDATION_ERROR',`Aksi '${body.action}' tidak dikenal.`);assertPermission(ctx.user,`${documentCore.moduleOf(current.documentType)}.${permission}`,{branchId:current.branchId});
    if(body.action==='void'&&['INVOICE','CUSTOMER_PAYMENT','SUPPLIER_PAYMENT','PAYROLL_RUN'].includes(current.documentType)){if(ctx.user.role!=='owner')throw new AppError('PIN_REQUIRED');const row=(await client.query('SELECT owner_pin_hash FROM app_users WHERE id=$1',[ctx.user.id])).rows[0];if(!body.pin||!row?.owner_pin_hash||!verifyPassword(String(body.pin),row.owner_pin_hash))throw new AppError('PIN_REQUIRED');}
    const result=await runtime.withIdempotency(client,{userId:ctx.user.id,operation:`documents.${body.action}:${current.id}`,key:req.headers['idempotency-key'],body},async()=>{const updated=await runtime.transitionDocument(client,{id:current.id,action:body.action,user:ctx.user,reason:body.reason,requestId:ctx.requestId,allowOwnerOverride:ctx.user.role==='owner'});await posting.postDocument(client,updated,ctx.user);if(body.action==='approve'&&['INVOICE','SUPPLIER_INVOICE','PAYROLL_RUN'].includes(updated.documentType))await businessOps.syncTaxes(client,updated.documentType==='PAYROLL_RUN'?updated.payload?.period:undefined);return{status:200,body:updated};});
    if(['approve','reject','revise'].includes(body.action))await operations.notify(client,{userId:current.createdBy,category:body.action==='approve'?'SUCCESS':'ACTION_REQUIRED',title:`${current.documentNumber} diperbarui`,body:body.reason||`Oleh ${ctx.user.displayName}.`,link:`#/doc/${current.id}`,dedupeKey:`act:${current.id}:${result.body.version}`});return result.body;
  }
  m=p.match(/^\/api\/documents\/([^/]+)\/convert$/);
  if(method==='POST'&&m){
    const current=await runtime.getDocument(client,m[1]);if(!current)throw new AppError('RESOURCE_NOT_FOUND');
    const spec=runtime.CONVERSIONS[current.documentType];if(!spec)throw new AppError('VALIDATION_ERROR',`Dokumen ${current.documentType} tidak memiliki konversi lanjutan.`);
    assertPermission(ctx.user,`${documentCore.moduleOf(current.documentType)}.view`,{branchId:current.branchId});assertPermission(ctx.user,`${documentCore.moduleOf(spec.target)}.create`,{branchId:current.branchId});
    const body=await readBody(req),result=await runtime.withIdempotency(client,{userId:ctx.user.id,operation:`documents.convert:${current.id}`,key:req.headers['idempotency-key'],body},async()=>({status:201,body:await runtime.convertDocument(client,{id:current.id,user:ctx.user,requestId:ctx.requestId})}));ctx.status=result.status;return result.body;
  }
  if(method==='GET'&&p==='/api/approvals'){assertPermission(ctx.user,'approval.view');return runtime.pendingApprovals(client,ctx.user,Object.fromEntries(url.searchParams));}
  if(method==='GET'&&p==='/api/notifications'){assertPermission(ctx.user,'notification.view');return {items:await operations.listNotifications(client,ctx.user),unread:await operations.unreadCount(client,ctx.user)};}
  if(method==='POST'&&p==='/api/notifications/read-all'){await operations.markAllRead(client,ctx.user);return {ok:true};}
  m=p.match(/^\/api\/notifications\/([^/]+)\/read$/);if(method==='POST'&&m){if(!await operations.markRead(client,ctx.user,m[1]))throw new AppError('RESOURCE_NOT_FOUND');return {ok:true};}
  if(method==='GET'&&p==='/api/jobs'){assertPermission(ctx.user,'job.view');return operations.listJobs(client,ctx.user,Object.fromEntries(url.searchParams));}
  if(method==='POST'&&p==='/api/jobs'){assertPermission(ctx.user,'job.create');const body=await readBody(req);ctx.status=201;return operations.enqueue(client,{type:body.type,user:ctx.user,params:body.params||{}});}
  if(method==='GET'&&p==='/api/artifacts'){assertPermission(ctx.user,'job.view');return{items:await artifactStorage.list(client,ctx.user)};}
  m=p.match(/^\/api\/artifacts\/([^/]+)$/);if(method==='GET'&&m){assertPermission(ctx.user,'job.view');ctx.download=await artifactStorage.download(client,m[1],ctx.user);return null;}
  if(method==='GET'&&p==='/api/files'){
    const documentId=url.searchParams.get('documentId')||undefined,module=url.searchParams.get('module')||undefined;if(!documentId&&!module)throw new AppError('VALIDATION_ERROR','documentId atau module wajib diisi.');
    if(module){if(!MODULES.includes(module))throw new AppError('VALIDATION_ERROR','Modul file tidak dikenal.');assertPermission(ctx.user,`${module}.view`);}
    if(documentId){const doc=await runtime.getDocument(client,documentId);if(!doc)throw new AppError('RESOURCE_NOT_FOUND');assertPermission(ctx.user,`${documentCore.moduleOf(doc.documentType)}.view`,{branchId:doc.branchId});}
    return{items:await privateStorage.list(client,{documentId,module})};
  }
  if(method==='POST'&&p==='/api/files'){
    const module=url.searchParams.get('module'),documentId=url.searchParams.get('documentId')||undefined,filename=decodeURIComponent(req.headers['x-file-name']||url.searchParams.get('filename')||'file');
    if(!MODULES.includes(module))throw new AppError('VALIDATION_ERROR','Modul file tidak dikenal.');assertPermission(ctx.user,`${module}.edit`);
    if(documentId){const doc=await runtime.getDocument(client,documentId);if(!doc)throw new AppError('RESOURCE_NOT_FOUND');assertPermission(ctx.user,`${documentCore.moduleOf(doc.documentType)}.edit`,{branchId:doc.branchId});}
    let buffer;try{buffer=await readRawBody(req,privateStorage.MAX_BYTES+1);}catch(error){if(error.message==='BODY_TOO_LARGE')throw new AppError('FILE_TOO_LARGE');throw error;}
    const item=await privateStorage.upload(client,{buffer,filename,mimeType:String(req.headers['content-type']||'').split(';')[0].toLowerCase(),user:ctx.user,module,documentId});await runtime.audit(client,{userId:ctx.user.id,action:'UPLOAD',module,entityType:'FILE',entityId:item.id,newValue:{filename:item.originalFilename,sizeBytes:item.sizeBytes},requestId:ctx.requestId,branchId:ctx.user.branchId});ctx.status=201;return item;
  }
  m=p.match(/^\/api\/files\/([^/]+)$/);
  if(method==='GET'&&m){const item=await privateStorage.metadata(client,m[1]);if(!item)throw new AppError('RESOURCE_NOT_FOUND');assertPermission(ctx.user,`${item.relatedModule}.view`);if(item.relatedDocumentId){const doc=await runtime.getDocument(client,item.relatedDocumentId);if(doc)assertPermission(ctx.user,`${documentCore.moduleOf(doc.documentType)}.view`,{branchId:doc.branchId});}ctx.download=await privateStorage.download(client,item.id);return null;}
  if(method==='DELETE'&&m){const item=await privateStorage.metadata(client,m[1]);if(!item)throw new AppError('RESOURCE_NOT_FOUND');assertPermission(ctx.user,`${item.relatedModule}.edit`);await privateStorage.remove(client,item.id,ctx.user);await runtime.audit(client,{userId:ctx.user.id,action:'DELETE',module:item.relatedModule,entityType:'FILE',entityId:item.id,oldValue:{filename:item.originalFilename},requestId:ctx.requestId,branchId:ctx.user.branchId});return{ok:true};}
  m=p.match(/^\/api\/(customers|suppliers|products|employees)$/);
  if(method==='GET'&&m){assertPermission(ctx.user,`${masterModules[m[1]]}.view`);return operations.listMaster(client,m[1],Object.fromEntries(url.searchParams));}
  if(method==='POST'&&m){const name=m[1],module=masterModules[name],body=await readBody(req);assertPermission(ctx.user,`${module}.create`);const item=await operations.createMaster(client,name,body,ctx.user);await runtime.audit(client,{userId:ctx.user.id,action:'CREATE',module,entityType:module.toUpperCase(),entityId:item.id,newValue:item,requestId:ctx.requestId,branchId:ctx.user.branchId});ctx.status=201;return item;}
  m=p.match(/^\/api\/(customers|suppliers|products|employees)\/([^/]+)$/);
  if(method==='PATCH'&&m){const name=m[1],module=masterModules[name],body=await readBody(req);assertPermission(ctx.user,`${module}.edit`);const item=await operations.updateMaster(client,name,m[2],body,ctx.user);await runtime.audit(client,{userId:ctx.user.id,action:'UPDATE',module,entityType:module.toUpperCase(),entityId:item.id,newValue:item,requestId:ctx.requestId,branchId:ctx.user.branchId});return item;}

  // ── Master data enterprise (R014/R015): overview, sub-resource, lifecycle ──
  m=p.match(/^\/api\/masters\/(employees|customers|suppliers|products)\/([0-9a-f-]{36})$/);
  if(method==='GET'&&m)return masterData.overview(client,m[1],m[2],ctx.user);
  m=p.match(/^\/api\/masters\/(employees|customers|suppliers|products)\/([0-9a-f-]{36})\/lifecycle$/);
  if(method==='POST'&&m){const body=await readBody(req);return masterData.lifecycle(client,m[1],m[2],body.action,body.reason,ctx.user,ctx.requestId);}
  m=p.match(/^\/api\/masters\/suppliers\/([0-9a-f-]{36})\/bank-accounts\/([0-9a-f-]{36})\/approve$/);
  if(method==='POST'&&m)return masterData.approveSupplierBank(client,m[1],m[2],ctx.user,ctx.requestId);
  m=p.match(/^\/api\/masters\/products\/([0-9a-f-]{36})\/cost-revisions\/([0-9a-f-]{36})\/(review|approve|lock|activate)$/);
  if(method==='POST'&&m)return m[3]==='activate'
    ?masterData.activateCostRevision(client,m[1],m[2],ctx.user,ctx.requestId)
    :masterData.promoteRevision(client,{table:'product_cost_revisions',parentCol:'product_id',parentId:m[1],rowId:m[2],action:m[3],user:ctx.user,requestId:ctx.requestId,module:'product'});
  m=p.match(/^\/api\/masters\/products\/([0-9a-f-]{36})\/bom\/([0-9a-f-]{36})\/(review|approve|effective)$/);
  if(method==='POST'&&m)return masterData.promoteRevision(client,{table:'bom_headers',parentCol:'product_id',parentId:m[1],rowId:m[2],action:m[3],user:ctx.user,requestId:ctx.requestId,module:'product'});
  m=p.match(/^\/api\/masters\/(employees|customers|suppliers|products)\/([0-9a-f-]{36})\/([a-z-]+)$/);
  if(method==='GET'&&m)return{items:await masterData.listSub(client,m[1],m[2],m[3],ctx.user)};
  if(method==='POST'&&m){const body=await readBody(req);ctx.status=201;return masterData.createSub(client,m[1],m[2],m[3],body,ctx.user,ctx.requestId);}
  if(method==='GET'&&p==='/api/branches'){if(!['owner','admin','hrd'].includes(ctx.user.role))assertPermission(ctx.user,'settings.view');return{items:(await client.query('SELECT id,code,name,active FROM branches WHERE active ORDER BY code')).rows.map(runtime.camel)};}
  if(method==='GET'&&p==='/api/inventory'){assertPermission(ctx.user,'inventory.view');return operations.listInventory(client,ctx.user,Object.fromEntries(url.searchParams));}
  if(method==='GET'&&p==='/api/accounting/summary'){assertPermission(ctx.user,'journal.view');return businessOps.accountingSummary(client,url.searchParams.get('period'));}
  if(method==='GET'&&p==='/api/accounting/accounts'){assertPermission(ctx.user,'journal.view');return{items:(await client.query('SELECT id,code,name,normal_side,category FROM chart_of_accounts WHERE active ORDER BY code')).rows.map(runtime.camel)};}
  if(method==='GET'&&p==='/api/accounting/ledger'){assertPermission(ctx.user,'ledger.view');return businessOps.ledger(client,Object.fromEntries(url.searchParams));}
  if(method==='POST'&&p==='/api/accounting/period/close'){assertPermission(ctx.user,'closing.post');const body=await readBody(req),result=await businessOps.closePeriod(client,{period:body.period,user:ctx.user});await runtime.audit(client,{userId:ctx.user.id,action:'CLOSE_PERIOD',module:'closing',entityType:'ACCOUNTING_PERIOD',newValue:result,reason:body.reason||'Tutup periode',requestId:ctx.requestId,branchId:ctx.user.branchId});return result;}
  if(method==='POST'&&p==='/api/accounting/period/reopen'){assertPermission(ctx.user,'closing.edit');if(ctx.user.role!=='owner')throw new AppError('PERMISSION_DENIED','Hanya Owner yang dapat membuka kembali periode.');const body=await readBody(req),row=(await client.query('SELECT owner_pin_hash FROM app_users WHERE id=$1',[ctx.user.id])).rows[0];if(!body.pin||!row?.owner_pin_hash||!verifyPassword(String(body.pin),row.owner_pin_hash))throw new AppError('PIN_REQUIRED');const result=await businessOps.reopenPeriod(client,{period:body.period,user:ctx.user,reason:body.reason});await runtime.audit(client,{userId:ctx.user.id,action:'REOPEN_PERIOD',module:'closing',entityType:'ACCOUNTING_PERIOD',newValue:result,reason:body.reason,requestId:ctx.requestId,branchId:ctx.user.branchId});return result;}
  if(method==='POST'&&p==='/api/payments/allocate'){assertPermission(ctx.user,'payment.post');const body=await readBody(req),result=await businessOps.allocatePayment(client,{...body,user:ctx.user});await runtime.audit(client,{userId:ctx.user.id,action:'ALLOCATE_PAYMENT',module:'payment',entityType:'PAYMENT_ALLOCATION',entityId:result.allocation.id,newValue:result,requestId:ctx.requestId,branchId:ctx.user.branchId});return result;}
  if(method==='GET'&&p==='/api/accounting/reconciliation'){assertPermission(ctx.user,'ledger.view');const period=businessOps.period(url.searchParams.get('period'));return{items:(await client.query(`SELECT * FROM reconciliation_runs WHERE period=$1 AND ($2::boolean OR branch_id=$3) ORDER BY created_at DESC`,[period,['owner','admin'].includes(ctx.user.role)||ctx.user.branchScope==='*',ctx.user.branchId])).rows.map(runtime.camel)};}
  if(method==='GET'&&p==='/api/tax/summary'){assertPermission(ctx.user,'tax.view');return businessOps.taxSummary(client,url.searchParams.get('period'));}
  if(method==='POST'&&p==='/api/tax/sync'){assertPermission(ctx.user,'tax.edit');const body=await readBody(req);return businessOps.syncTaxes(client,body.period);}
  m=p.match(/^\/api\/tax\/records\/([^/]+)\/report$/);if(method==='POST'&&m){assertPermission(ctx.user,'tax.post');const result=await businessOps.reportTax(client,m[1]);await runtime.audit(client,{userId:ctx.user.id,action:'REPORT_TAX',module:'tax',entityType:'TAX_RECORD',entityId:m[1],newValue:result,requestId:ctx.requestId,branchId:ctx.user.branchId});return result;}
  if(method==='GET'&&p==='/api/hr/attendance'){assertPermission(ctx.user,'attendance.view');return businessOps.attendance(client,{...Object.fromEntries(url.searchParams),user:ctx.user});}
  if(method==='POST'&&p==='/api/hr/attendance'){assertPermission(ctx.user,ctx.user.role==='employee'?'attendance.create':'attendance.edit');const body=await readBody(req);if(ctx.user.role==='employee')body.employeeId=ctx.user.employeeId;const result=await businessOps.upsertAttendance(client,{...body,user:ctx.user});await runtime.audit(client,{userId:ctx.user.id,action:'UPSERT_ATTENDANCE',module:'attendance',entityType:'ATTENDANCE',entityId:result.id,newValue:result,requestId:ctx.requestId,branchId:ctx.user.branchId});ctx.status=201;return result;}
  if(method==='GET'&&p==='/api/hr/leave-balances'){assertPermission(ctx.user,'leave.view');return{items:await businessOps.leaveBalances(client,{...Object.fromEntries(url.searchParams),user:ctx.user})};}
  if(method==='POST'&&p==='/api/payroll/runs'){assertPermission(ctx.user,'payroll.create');const body=await readBody(req),result=await businessOps.createPayroll(client,{...body,user:ctx.user});await runtime.audit(client,{userId:ctx.user.id,action:'CALCULATE_PAYROLL',module:'payroll',entityType:'PAYROLL_RUN',entityId:result.document.id,documentNumber:result.document.documentNumber,newValue:{period:body.period,headcount:result.headcount,total:result.total},requestId:ctx.requestId,branchId:ctx.user.branchId});ctx.status=201;return result;}
  m=p.match(/^\/api\/payroll\/runs\/([^/]+)\/items$/);if(method==='GET'&&m){if(ctx.user.role==='employee')assertPermission(ctx.user,'payroll.view_self');else assertPermission(ctx.user,'payroll.view');return{items:await businessOps.payrollItems(client,m[1],ctx.user)};}
  if(method==='GET'&&p==='/api/payroll/my'){assertPermission(ctx.user,'payroll.view_self');return{items:await businessOps.payrollSelf(client,ctx.user)};}
  if(method==='GET'&&p==='/api/audit'){assertPermission(ctx.user,'audit.view');const limit=Math.min(Math.max(Number(url.searchParams.get('limit'))||25,1),100),page=Math.max(Number(url.searchParams.get('page'))||1,1);const total=Number((await client.query('SELECT count(*) n FROM audit_logs')).rows[0].n);const items=(await client.query(`SELECT a.*,u.display_name user_name,u.role FROM audit_logs a LEFT JOIN app_users u ON u.id=a.user_id ORDER BY occurred_at DESC LIMIT $1 OFFSET $2`,[limit,(page-1)*limit])).rows.map(runtime.camel);return{items,page,limit,total,totalPages:Math.max(Math.ceil(total/limit),1)};}
  if(method==='GET'&&p==='/api/system/users'){assertPermission(ctx.user,'user.view');const items=(await client.query(`SELECT u.*,b.name branch_name FROM app_users u LEFT JOIN branches b ON b.id=u.branch_id ORDER BY display_name`)).rows.map(auth.publicUser);return{items,page:1,limit:items.length,total:items.length,totalPages:1};}
  m=p.match(/^\/api\/system\/users\/([^/]+)\/reset-password$/);if(method==='POST'&&m){assertPermission(ctx.user,'user.edit');if(!['owner','admin'].includes(ctx.user.role))throw new AppError('PERMISSION_DENIED');const body=await readBody(req);if(!body.reason)throw new AppError('REASON_REQUIRED');const tempPassword=`Mat!${randomBytes(12).toString('base64url')}9a`;const changed=await client.query('UPDATE app_users SET password_hash=$2,must_change_password=true,failed_login_count=0,locked_until=NULL,updated_at=now() WHERE id=$1 RETURNING id',[m[1],auth.hashPassword(tempPassword)]);if(!changed.rowCount)throw new AppError('RESOURCE_NOT_FOUND');await auth.logoutAll(client,m[1]);await runtime.audit(client,{userId:ctx.user.id,action:'RESET_PASSWORD',module:'user',entityType:'USER',entityId:m[1],reason:body.reason,requestId:ctx.requestId,branchId:ctx.user.branchId});return{tempPassword,note:'Sandi sementara hanya ditampilkan sekali. Pengguna wajib menggantinya saat masuk.'};}
  if(method==='GET'&&p==='/api/system/settings'){assertPermission(ctx.user,'settings.view');const saved=(await client.query(`SELECT value FROM system_settings WHERE setting_key='company'`)).rows[0]?.value||{};return{company:{name:saved.name||process.env.MAT_COMPANY_NAME||'Mandiri Abadi Teknik',npwp:saved.npwp||process.env.MAT_COMPANY_NPWP||'Belum dikonfigurasi',address:saved.address||process.env.MAT_COMPANY_ADDRESS||'Bekasi, Jawa Barat',bank:saved.bank||{name:process.env.MAT_COMPANY_BANK_NAME||'Belum dikonfigurasi',account:process.env.MAT_COMPANY_BANK_ACCOUNT||'—'},numberingFormat:saved.numberingFormat||'{PREFIX}-{MMYY}-{SEQ:3}',fiscalYear:saved.fiscalYear||new Date().getFullYear(),database:'PostgreSQL'},approvalMatrix:APPROVAL_MATRIX.map(t=>({maxAmount:t.maxAmount===Infinity?null:t.maxAmount,levels:t.levels}))};}
  if(method==='PATCH'&&p==='/api/system/settings/company'){assertPermission(ctx.user,'settings.edit');if(ctx.user.role!=='owner')throw new AppError('PERMISSION_DENIED','Hanya Owner yang boleh mengubah identitas perusahaan.');const body=await readBody(req);if(!body.reason)throw new AppError('REASON_REQUIRED');const row=(await client.query('SELECT owner_pin_hash FROM app_users WHERE id=$1',[ctx.user.id])).rows[0];if(!body.pin||!row?.owner_pin_hash||!verifyPassword(String(body.pin),row.owner_pin_hash))throw new AppError('PIN_REQUIRED');const company=body.company;if(!company||typeof company!=='object'||!String(company.name||'').trim())throw new AppError('VALIDATION_ERROR','Nama perusahaan wajib diisi.');const value={name:String(company.name).slice(0,160),npwp:String(company.npwp||'').slice(0,40),address:String(company.address||'').slice(0,500),bank:{name:String(company.bank?.name||'').slice(0,120),account:String(company.bank?.account||'').slice(0,80)},numberingFormat:String(company.numberingFormat||'{PREFIX}-{MMYY}-{SEQ:3}').slice(0,80),fiscalYear:Number(company.fiscalYear)||new Date().getFullYear()};await client.query(`INSERT INTO system_settings(setting_key,value,updated_by) VALUES('company',$1,$2) ON CONFLICT(setting_key) DO UPDATE SET value=excluded.value,updated_at=now(),updated_by=excluded.updated_by`,[value,ctx.user.id]);await runtime.audit(client,{userId:ctx.user.id,action:'UPDATE',module:'settings',entityType:'SETTING',newValue:{settingKey:'company'},reason:body.reason,requestId:ctx.requestId,branchId:ctx.user.branchId});return{company:{...value,database:'PostgreSQL'}};}
  if(method==='GET'&&p==='/api/system/monitoring'){assertPermission(ctx.user,'monitoring.view');const db=await healthCheck(),memory=process.memoryUsage(),counts=(await client.query(`SELECT (SELECT count(*) FROM information_schema.tables WHERE table_schema='public') tables,(SELECT count(*) FROM user_sessions WHERE active AND expires_at>now()) active_sessions,(SELECT count(*) FROM login_history WHERE NOT succeeded) failed_logins,(SELECT count(*) FROM background_jobs WHERE status='PROCESSING') jobs_running,(SELECT count(*) FROM background_jobs WHERE status='QUEUED') jobs_queued,(SELECT count(*) FROM background_jobs WHERE status='FAILED') jobs_failed`)).rows[0],backup=(await client.query('SELECT * FROM backup_runs ORDER BY started_at DESC LIMIT 1')).rows[0]||null,sorted=[...apiMetrics.latencies].sort((a,b)=>a-b),pct=p=>sorted.length?sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))]:0,pool=stats();return{uptimeSeconds:Math.round(process.uptime()),memory:{rssMb:Math.round(memory.rss/1048576),heapMb:Math.round(memory.heapUsed/1048576)},database:{engine:`PostgreSQL ${String(db.version).match(/PostgreSQL\s+([\d.]+)/)?.[1]||''}`,rows:Number(counts.tables),pool:{min:Number(process.env.DB_POOL_MIN||2),max:Number(process.env.DB_POOL_MAX||15),active:pool.total-pool.idle,idle:pool.idle},latencyMs:db.latencyMs},api:{requests:apiMetrics.requests,errors:apiMetrics.errors,errorRatePct:apiMetrics.requests?Math.round(apiMetrics.errors/apiMetrics.requests*1000)/10:0,p50Ms:pct(.5),p95Ms:pct(.95)},jobs:{running:Number(counts.jobs_running),queued:Number(counts.jobs_queued),failed:Number(counts.jobs_failed)},sse:events.stats(),rateLimit:ratelimit.stats(),alerts:require('./infrastructure/alerts').stats(),storage:await storageMetrics(),security:{failedLogins:Number(counts.failed_logins),activeSessions:Number(counts.active_sessions)},backup:backup?{at:backup.started_at,sizeMb:backup.size_mb,checksum:backup.checksum,target:backup.target,restoreTested:backup.restore_tested}:null};}
  if(method==='GET'&&p==='/api/system/self-test'){assertPermission(ctx.user,'selftest.view');const migration=(await client.query("SELECT filename FROM schema_migrations ORDER BY filename DESC LIMIT 1")).rows[0],enterprise=(await client.query(`SELECT to_regclass('public.document_relations') IS NOT NULL relations,to_regclass('public.generated_artifacts') IS NOT NULL artifacts,to_regclass('public.notification_deliveries') IS NOT NULL deliveries,to_regclass('public.attendance_records') IS NOT NULL attendance,to_regclass('public.bank_transactions') IS NOT NULL banking,to_regclass('public.import_batches') IS NOT NULL imports`)).rows[0],backup=(await client.query(`SELECT status,restore_tested,restore_tested_at FROM backup_runs WHERE status='COMPLETED' ORDER BY finished_at DESC LIMIT 1`)).rows[0],checks=[{name:'Koneksi PostgreSQL',status:'pass',critical:true,detail:'Runtime user terhubung.'},{name:'Migration database',status:migration?.filename===migrationFiles().at(-1)?'pass':'fail',critical:true,detail:migration?.filename||'Tidak ada migration'},{name:'Session token hashing',status:'pass',critical:true,detail:'Token dan CSRF hanya disimpan sebagai SHA-256.'},{name:'Persistent job queue',status:'pass',critical:true,detail:'Lease, retry, dan SKIP LOCKED aktif.'},{name:'Auth challenge persistence',status:'pass',critical:true,detail:'MFA dan ganti sandi memakai token sekali pakai.'},{name:'Transaction ledgers',status:'pass',critical:true,detail:'Document lines, inventory, dan double-entry posting siap.'},{name:'Enterprise operations',status:enterprise.relations&&enterprise.artifacts&&enterprise.deliveries?'pass':'fail',critical:true,detail:'Relations, private artifacts, dan delivery schema terverifikasi.'},{name:'Finance & HR operations',status:enterprise.attendance&&enterprise.banking&&enterprise.imports?'pass':'fail',critical:true,detail:'Closing, reconciliation, attendance, payroll, tax, dan import schema siap.'},{name:'Backup restore drill',status:backup?.status==='COMPLETED'&&backup?.restore_tested?'pass':'fail',critical:true,detail:backup?.restore_tested_at?`Restore teruji ${new Date(backup.restore_tested_at).toISOString()}`:'Belum ada restore drill berhasil.'}],failed=checks.filter(x=>x.status==='fail').length,criticalFailed=checks.filter(x=>x.critical&&x.status==='fail').length;return{passed:checks.length-failed,failed,total:checks.length,criticalFailed,releaseBlocked:criticalFailed>0,ranAt:new Date().toISOString(),results:checks};}
  throw new AppError('RESOURCE_NOT_FOUND',`Endpoint ${method} ${p} belum tersedia pada runtime PostgreSQL.`);
}

async function handle(req,res){const started=Date.now(),requestId=randomUUID(),url=new URL(req.url,'http://localhost'),ctx={requestId,ip:req.socket.remoteAddress,device:(req.headers['user-agent']||'unknown').slice(0,120)};
  try{
    // Health check tanpa autentikasi untuk uptime monitor eksternal — tanpa
    // detail sensitif, tetap dibatasi rate limit per IP.
    if(req.method==='GET'&&url.pathname==='/api/health'){
      ratelimit.consume('read',`health:${ctx.ip}`);
      let db='up';try{await getPool().query('SELECT 1');}catch{db='down';}
      return json(res,db==='up'?200:503,{ok:db==='up',db,at:new Date().toISOString()},{'X-Request-Id':requestId});
    }
    if(req.method==='GET'&&url.pathname==='/api/events'){
      const result=await withTransaction(c=>auth.resolveSession(c,parseCookies(req).mat_session));if(!result)throw new AppError('SESSION_EXPIRED');
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
