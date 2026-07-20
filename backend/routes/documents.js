'use strict';
const { readBody } = require('../core/util');
const { AppError } = require('../core/errors');
const { assertPermission } = require('../core/permissions');
const documentCore = require('../core/documents');
const { verifyPassword } = require('../core/auth');
const runtime = require('../infrastructure/database/repositories/runtime');
const posting = require('../infrastructure/database/repositories/posting');
const businessOps = require('../infrastructure/database/repositories/business-operations');
const procurement = require('../infrastructure/database/repositories/procurement');
const governance = require('../infrastructure/database/repositories/governance');
const production = require('../infrastructure/database/repositories/production');
const operations = require('../infrastructure/database/repositories/operations');
const hrOps = require('../infrastructure/database/repositories/hr-operations');
const docRender = require('../infrastructure/files/document-render');
const smtp = require('../infrastructure/smtp');
const { NO_MATCH } = require('./shared');

async function dispatch(client, req, url, ctx) {
  const p=url.pathname, method=req.method;
  let m;
  if(method==='GET'&&p==='/api/documents'){
    const types=(url.searchParams.get('type')||'').split(',').filter(Boolean);if(!types.length)throw new AppError('VALIDATION_ERROR','Parameter "type" wajib diisi.');
    for(const type of types)assertPermission(ctx.user,`${documentCore.moduleOf(type)}.view`);
    return runtime.listDocuments(client,{types,user:ctx.user,...Object.fromEntries(url.searchParams),sortKey:(url.searchParams.get('sort')||'updated_at:desc').split(':')[0],sortDir:(url.searchParams.get('sort')||'updated_at:desc').split(':')[1]});
  }
  if(method==='POST'&&p==='/api/documents'){
    const body=await readBody(req);assertPermission(ctx.user,`${documentCore.moduleOf(body.type)}.create`);ctx.status=201;
    const result=await runtime.withIdempotency(client,{userId:ctx.user.id,operation:'documents.create',key:req.headers['idempotency-key'],body},async()=>({status:201,body:await runtime.createDocument(client,{...body,amount:Number(body.amount)||0,user:ctx.user,requestId:ctx.requestId})}));ctx.status=result.status;return result.body;
  }
  m=p.match(/^\/api\/documents\/([^/]+)$/);
  if(method==='GET'&&m){const doc=await runtime.getDocument(client,m[1]);if(!doc)throw new AppError('RESOURCE_NOT_FOUND');assertPermission(ctx.user,`${documentCore.moduleOf(doc.documentType)}.view`,{branchId:doc.branchId});const trail=await runtime.auditTrail(client,doc.id),relations=await runtime.documentRelations(client,doc.id);const levels=doc.requiredApprovalLevels||[];return{...doc,relations,auditTrail:trail,approvalChain:levels.map(level=>({level,done:(doc.approvals||[]).find(a=>a.level===level)||null}))};}
  if(method==='PATCH'&&m){const current=await runtime.getDocument(client,m[1]);if(!current)throw new AppError('RESOURCE_NOT_FOUND');assertPermission(ctx.user,`${documentCore.moduleOf(current.documentType)}.edit`,{branchId:current.branchId});const body=await readBody(req);return runtime.updateDocument(client,{id:m[1],expectedVersion:body.version,patch:body,user:ctx.user,requestId:ctx.requestId});}
  m=p.match(/^\/api\/documents\/([^/]+)\/action$/);
  if(method==='POST'&&m){
    const current=await runtime.getDocument(client,m[1]);if(!current)throw new AppError('RESOURCE_NOT_FOUND');const body=await readBody(req);const permission={submit:'submit',approve:'approve',reject:'approve',revise:'approve',start:'post',complete:'post',close:'post',cancel:'cancel',void:'void'}[body.action];if(!permission)throw new AppError('VALIDATION_ERROR',`Aksi '${body.action}' tidak dikenal.`);assertPermission(ctx.user,`${documentCore.moduleOf(current.documentType)}.${permission}`,{branchId:current.branchId});
    if(body.action==='void'&&['INVOICE','CUSTOMER_PAYMENT','SUPPLIER_PAYMENT','PAYROLL_RUN'].includes(current.documentType)){if(ctx.user.role!=='owner')throw new AppError('PIN_REQUIRED');const row=(await client.query('SELECT owner_pin_hash FROM app_users WHERE id=$1',[ctx.user.id])).rows[0];if(!body.pin||!row?.owner_pin_hash||!verifyPassword(String(body.pin),row.owner_pin_hash))throw new AppError('PIN_REQUIRED');}
    // R016 credit control: SO/Invoice tidak boleh diajukan bila pelanggan
    // dalam hold atau melewati batas kredit tanpa override finance.
    if(body.action==='submit'&&['SALES_ORDER','INVOICE'].includes(current.documentType)){const raw=(await client.query('SELECT * FROM business_documents WHERE id=$1',[current.id])).rows[0];await procurement.assertCreditOk(client,raw);}
    // Sprint 10 budget check (§13): PR/PO tidak boleh diajukan melampaui
    // anggaran periode, kecuali override finance ber-alasan (teraudit).
    if(body.action==='submit'&&['PURCHASE_REQUEST','PURCHASE_ORDER'].includes(current.documentType)){const raw=(await client.query('SELECT * FROM business_documents WHERE id=$1',[current.id])).rows[0];await procurement.assertBudgetOk(client,raw,{overrideReason:body.budgetOverrideReason,user:ctx.user,requestId:ctx.requestId});}
    // R017 three-way match: tagihan supplier tidak boleh disetujui bila selisih
    // PO/GR/invoice melampaui toleransi, kecuali override ber-alasan.
    if(body.action==='approve'&&current.documentType==='SUPPLIER_INVOICE'){const raw=(await client.query('SELECT * FROM business_documents WHERE id=$1',[current.id])).rows[0];await procurement.assertMatchOk(client,raw,{overrideReason:body.matchOverrideReason,user:ctx.user});}
    // Sprint 14: cuti wajib rentang tanggal valid & saldo cukup (durasi = hari
    // kerja dari kalender; akhir pekan/libur dilewati).
    if(body.action==='submit'&&current.documentType==='LEAVE_REQUEST'){const raw=(await client.query('SELECT * FROM business_documents WHERE id=$1',[current.id])).rows[0];await hrOps.assertLeaveOk(client,raw);}
    let allowOwnerOverride=false;if(body.action==='approve'&&current.createdBy===ctx.user.id){if(ctx.user.role!=='owner')throw new AppError('SOD_CONFLICT','Pembuat dokumen tidak boleh menjadi approver.');if(!body.reason)throw new AppError('REASON_REQUIRED');const pinRow=(await client.query('SELECT owner_pin_hash FROM app_users WHERE id=$1',[ctx.user.id])).rows[0];if(!body.pin||!pinRow?.owner_pin_hash||!verifyPassword(String(body.pin),pinRow.owner_pin_hash))throw new AppError('PIN_REQUIRED');await governance.createOverride(client,{targetUserId:ctx.user.id,permissionCode:'approval.approve',scopeType:'BRANCH',scopeId:current.branchId,hours:1,reason:`SoD document override ${current.documentNumber}: ${body.reason}`,user:ctx.user});allowOwnerOverride=true;}
    const result=await runtime.withIdempotency(client,{userId:ctx.user.id,operation:`documents.${body.action}:${current.id}`,key:req.headers['idempotency-key'],body},async()=>{if(body.action==='complete'&&current.documentType==='WORK_ORDER')await production.assertReadyToComplete(client,current.id);const updated=await runtime.transitionDocument(client,{id:current.id,action:body.action,user:ctx.user,reason:body.reason,requestId:ctx.requestId,allowOwnerOverride});await posting.postDocument(client,updated,ctx.user);if(body.action==='approve'&&['INVOICE','SUPPLIER_INVOICE','PAYROLL_RUN'].includes(updated.documentType))await businessOps.syncTaxes(client,updated.documentType==='PAYROLL_RUN'?updated.payload?.period:undefined);
      // Sprint 12: WO dibatalkan/void → lepas seluruh sisa reservasi materialnya.
      if(['cancel','void'].includes(body.action)&&updated.documentType==='WORK_ORDER')await production.releaseReservations(client,updated.id,ctx.user);
      // Sprint 14: cuti disetujui penuh → saldo terpotong sesuai hari kerja (idempoten).
      if(body.action==='approve'&&updated.documentType==='LEAVE_REQUEST'&&updated.status==='APPROVED')await hrOps.onLeaveApproved(client,updated,ctx.user);
      return{status:200,body:updated};});
    if(['approve','reject','revise'].includes(body.action))await operations.notify(client,{userId:current.createdBy,category:body.action==='approve'?'SUCCESS':'ACTION_REQUIRED',title:`${current.documentNumber} diperbarui`,body:body.reason||`Oleh ${ctx.user.displayName}.`,link:`#/doc/${current.id}`,dedupeKey:`act:${current.id}:${result.body.version}`});return result.body;
  }
  m=p.match(/^\/api\/documents\/([^/]+)\/convert$/);
  if(method==='POST'&&m){
    const current=await runtime.getDocument(client,m[1]);if(!current)throw new AppError('RESOURCE_NOT_FOUND');
    const spec=runtime.CONVERSIONS[current.documentType];if(!spec)throw new AppError('VALIDATION_ERROR',`Dokumen ${current.documentType} tidak memiliki konversi lanjutan.`);
    assertPermission(ctx.user,`${documentCore.moduleOf(current.documentType)}.view`,{branchId:current.branchId});assertPermission(ctx.user,`${documentCore.moduleOf(spec.target)}.create`,{branchId:current.branchId});
    const body=await readBody(req),result=await runtime.withIdempotency(client,{userId:ctx.user.id,operation:`documents.convert:${current.id}`,key:req.headers['idempotency-key'],body},async()=>({status:201,body:await runtime.convertDocument(client,{id:current.id,user:ctx.user,requestId:ctx.requestId})}));ctx.status=result.status;return result.body;
  }
  // ── Sprint 15: dokumen resmi ber-identitas (PDF) + kirim email ────────────
  m=p.match(/^\/api\/documents\/([^/]+)\/official-pdf$/);
  if(method==='GET'&&m){
    const doc=await loadForOfficial(client,m[1],ctx.user);
    const lines=(await client.query('SELECT line_no,product_id,description,qty,uom,unit_price,discount_pct,tax_pct,line_total FROM document_lines WHERE document_id=$1 ORDER BY line_no',[doc.id])).rows.map(runtime.camel);
    const rendered=docRender.renderDocument({document:doc,lines});
    ctx.download={item:{originalFilename:`${doc.documentNumber}.pdf`,mimeType:'application/pdf'},buffer:rendered.buffer};
    await runtime.audit(client,{userId:ctx.user.id,action:'EXPORT',module:documentCore.moduleOf(doc.documentType),entityType:doc.documentType,entityId:doc.id,documentNumber:doc.documentNumber,newValue:{official:true,verifyCode:rendered.code},requestId:ctx.requestId,branchId:doc.branchId});
    return;
  }
  m=p.match(/^\/api\/documents\/([^/]+)\/email$/);
  if(method==='POST'&&m){
    const body=await readBody(req);const doc=await loadForOfficial(client,m[1],ctx.user);
    const to=String(body.to||'').trim();if(!to)throw new AppError('VALIDATION_ERROR','Alamat email tujuan wajib diisi.');
    const lines=(await client.query('SELECT line_no,description,qty,uom,unit_price,discount_pct,tax_pct,line_total FROM document_lines WHERE document_id=$1 ORDER BY line_no',[doc.id])).rows.map(runtime.camel);
    const rendered=docRender.renderDocument({document:doc,lines});
    const org=doc.organizationIdentitySnapshot||{};
    const subject=body.subject||`${doc.documentType.replace(/_/g,' ')} ${doc.documentNumber} — ${org.legalName||'MAT'}`;
    const text=`${body.message?body.message+'\n\n':''}Terlampir informasi dokumen ${doc.documentNumber}.\nNilai: Rp ${Math.round(Number(doc.amount||0)).toLocaleString('id-ID')}\nTerbilang: ${rendered.terbilang}\n\nVerifikasi keaslian: kode ${rendered.code}\n${org.documentFooter||''}`;
    const result=await smtp.send({to,subject,text});
    // Catat percobaan pengiriman pada notification_deliveries (audit kanal).
    const notif=(await client.query(`INSERT INTO notifications(id,user_id,category,title,body,link,created_at) VALUES(gen_random_uuid(),$1,'INFORMATION',$2,$3,$4,now()) RETURNING id`,[ctx.user.id,`Email ${doc.documentNumber}`,`Ke ${to} — ${result.status}`,`#/doc/${doc.id}`])).rows[0];
    await client.query(`INSERT INTO notification_deliveries(notification_id,channel,destination,status,attempts,last_error,sent_at) VALUES($1,'EMAIL',$2,$3,1,$4,$5)`,[notif.id,to.slice(0,240),result.status,result.error||null,result.status==='SENT'?new Date():null]);
    await runtime.audit(client,{userId:ctx.user.id,action:'EXPORT',module:documentCore.moduleOf(doc.documentType),entityType:doc.documentType,entityId:doc.id,documentNumber:doc.documentNumber,newValue:{email:to,status:result.status},requestId:ctx.requestId,branchId:doc.branchId});
    if(result.status==='FAILED')throw new AppError('VALIDATION_ERROR',`Pengiriman email gagal: ${result.error}`);
    return{status:result.status,to,configured:smtp.isConfigured(),verifyCode:rendered.code,message:result.status==='SKIPPED'?'SMTP belum dikonfigurasi — dokumen siap namun email tidak terkirim.':'Email terkirim.'};
  }
  return NO_MATCH;
}

// Muat dokumen untuk penerbitan resmi: cek izin view + scope cabang.
async function loadForOfficial(client,id,user){
  const doc=await runtime.getDocument(client,id);
  if(!doc)throw new AppError('RESOURCE_NOT_FOUND','Dokumen tidak ditemukan.');
  assertPermission(user,`${documentCore.moduleOf(doc.documentType)}.view`,{branchId:doc.branchId});
  return doc;
}

module.exports={dispatch};
