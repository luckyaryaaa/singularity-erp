'use strict';
const { readBody, readRawBody } = require('../core/util');
const { AppError } = require('../core/errors');
const { assertPermission, MODULES } = require('../core/permissions');
const { verifyPassword } = require('../core/auth');
const documentCore = require('../core/documents');
const operations = require('../infrastructure/database/repositories/operations');
const runtime = require('../infrastructure/database/repositories/runtime');
const privateStorage = require('../infrastructure/files/private-storage');
const artifactStorage = require('../infrastructure/files/artifact-storage');
const { NO_MATCH } = require('./shared');

async function dispatch(client, req, url, ctx) {
  const p=url.pathname, method=req.method;
  let m;
  if(method==='GET'&&p==='/api/notifications'){assertPermission(ctx.user,'notification.view');return {items:await operations.listNotifications(client,ctx.user),unread:await operations.unreadCount(client,ctx.user)};}
  if(method==='POST'&&p==='/api/notifications/read-all'){await operations.markAllRead(client,ctx.user);return {ok:true};}
  m=p.match(/^\/api\/notifications\/([^/]+)\/read$/);if(method==='POST'&&m){if(!await operations.markRead(client,ctx.user,m[1]))throw new AppError('RESOURCE_NOT_FOUND');return {ok:true};}
  if(method==='GET'&&p==='/api/jobs'){assertPermission(ctx.user,'job.view');return operations.listJobs(client,ctx.user,Object.fromEntries(url.searchParams));}
  if(method==='POST'&&p==='/api/jobs'){assertPermission(ctx.user,'job.create');const body=await readBody(req),spec=operations.policyFor(body.type);let pinVerified=false;if(spec.requiresPin){if(ctx.user.role!=='owner')throw new AppError('PIN_REQUIRED');const row=(await client.query('SELECT owner_pin_hash FROM app_users WHERE id=$1',[ctx.user.id])).rows[0];pinVerified=!!body.pin&&!!row?.owner_pin_hash&&verifyPassword(String(body.pin),row.owner_pin_hash);if(!pinVerified)throw new AppError('PIN_REQUIRED');}ctx.status=201;return operations.enqueue(client,{type:body.type,user:ctx.user,params:body.params||{},executionKey:req.headers['idempotency-key']||body.executionKey,pinVerified});}
  m=p.match(/^\/api\/jobs\/([^/]+)\/(cancel|retry)$/);if(method==='POST'&&m){const body=await readBody(req);if(m[2]==='cancel'){assertPermission(ctx.user,'job.cancel');const result=await operations.requestCancel(client,m[1],ctx.user,body.reason);await runtime.audit(client,{userId:ctx.user.id,action:'CANCEL_JOB',module:'job',entityType:'JOB',entityId:m[1],reason:body.reason,requestId:ctx.requestId,branchId:ctx.user.branchId});return result;}assertPermission(ctx.user,'job.create');const result=await operations.retry(client,m[1],ctx.user,body.reason);await runtime.audit(client,{userId:ctx.user.id,action:'RETRY_JOB',module:'job',entityType:'JOB',entityId:m[1],reason:body.reason,requestId:ctx.requestId,branchId:ctx.user.branchId});return result;}
  if(method==='GET'&&p==='/api/artifacts'){assertPermission(ctx.user,'job.view');return{items:await artifactStorage.list(client,ctx.user)};}
  m=p.match(/^\/api\/artifacts\/([^/]+)$/);if(method==='GET'&&m){assertPermission(ctx.user,'job.view');ctx.download=await artifactStorage.download(client,m[1],ctx.user);return null;}
  if(method==='GET'&&p==='/api/files'){
    const documentId=url.searchParams.get('documentId')||undefined,module=url.searchParams.get('module')||undefined;if(!documentId&&!module)throw new AppError('VALIDATION_ERROR','documentId atau module wajib diisi.');
    if(module){if(!MODULES.includes(module))throw new AppError('VALIDATION_ERROR','Modul file tidak dikenal.');assertPermission(ctx.user,`${module}.view`);}
    if(documentId){const doc=await runtime.getDocument(client,documentId);if(!doc)throw new AppError('RESOURCE_NOT_FOUND');assertPermission(ctx.user,`${documentCore.moduleOf(doc.documentType)}.view`,{branchId:doc.branchId});}
    return{items:await privateStorage.list(client,{documentId,module,user:ctx.user})};
  }
  if(method==='POST'&&p==='/api/files'){
    const module=url.searchParams.get('module'),documentId=url.searchParams.get('documentId')||undefined,filename=decodeURIComponent(req.headers['x-file-name']||url.searchParams.get('filename')||'file');
    if(!MODULES.includes(module))throw new AppError('VALIDATION_ERROR','Modul file tidak dikenal.');assertPermission(ctx.user,`${module}.edit`);
    if(documentId){const doc=await runtime.getDocument(client,documentId);if(!doc)throw new AppError('RESOURCE_NOT_FOUND');assertPermission(ctx.user,`${documentCore.moduleOf(doc.documentType)}.edit`,{branchId:doc.branchId});}
    let buffer;try{buffer=await readRawBody(req,privateStorage.MAX_BYTES+1);}catch(error){if(error.message==='BODY_TOO_LARGE')throw new AppError('FILE_TOO_LARGE');throw error;}
    const item=await privateStorage.upload(client,{buffer,filename,mimeType:String(req.headers['content-type']||'').split(';')[0].toLowerCase(),user:ctx.user,module,documentId,branchId:ctx.user.branchId});await operations.enqueue(client,{type:'FILE_SCAN',user:ctx.user,params:{fileId:item.id},executionKey:`file:${item.id}`,system:true});await runtime.audit(client,{userId:ctx.user.id,action:'UPLOAD_QUARANTINED',module,entityType:'FILE',entityId:item.id,newValue:{filename:item.originalFilename,sizeBytes:item.sizeBytes,scanStatus:item.scanStatus},requestId:ctx.requestId,branchId:ctx.user.branchId});ctx.status=202;return item;
  }
  m=p.match(/^\/api\/files\/([^/]+)$/);
  if(method==='GET'&&m){const item=await privateStorage.scopedMetadata(client,m[1],ctx.user);if(!item)throw new AppError('RESOURCE_NOT_FOUND');assertPermission(ctx.user,`${item.relatedModule}.view`,{branchId:item.branchId});if(item.relatedDocumentId){const doc=await runtime.getDocument(client,item.relatedDocumentId);if(doc)assertPermission(ctx.user,`${documentCore.moduleOf(doc.documentType)}.view`,{branchId:doc.branchId});}ctx.download=await privateStorage.download(client,item.id);return null;}
  if(method==='DELETE'&&m){const item=await privateStorage.scopedMetadata(client,m[1],ctx.user);if(!item)throw new AppError('RESOURCE_NOT_FOUND');assertPermission(ctx.user,`${item.relatedModule}.edit`,{branchId:item.branchId});await privateStorage.remove(client,item.id,ctx.user);await runtime.audit(client,{userId:ctx.user.id,action:'DELETE',module:item.relatedModule,entityType:'FILE',entityId:item.id,oldValue:{filename:item.originalFilename},requestId:ctx.requestId,branchId:item.branchId||ctx.user.branchId});return{ok:true};}
  return NO_MATCH;
}

module.exports={dispatch};
