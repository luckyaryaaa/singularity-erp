'use strict';

const { randomUUID } = require('node:crypto');
const { AppError } = require('../../../core/errors');
const { assertPermission } = require('../../../core/permissions');
const operations = require('./operations');
const masterData = require('./master-data');
const runtime = require('./runtime');

const SOURCE_TYPES=['CUSTOMER_INQUIRY','QUOTATION','CUSTOMER_PO','SALES_ORDER','PROJECT'];

function scoped(user,branchId){return ['owner','admin','system_admin'].includes(user.role)||user.branchScope==='*'||user.branchId===branchId;}

async function sourceRow(client,id,user){
  if(!id)return null;
  const row=(await client.query(`SELECT id,document_number,document_type,title,party_id,party_name,branch_id,status,updated_at FROM business_documents WHERE id=$1 AND document_type=ANY($2)`,[id,SOURCE_TYPES])).rows[0];
  if(!row)throw new AppError('RESOURCE_NOT_FOUND','Dokumen sumber Customer Link tidak ditemukan.');
  if(!scoped(user,row.branch_id))throw new AppError('PERMISSION_DENIED');
  return row;
}

async function listSources(client,user){
  assertPermission(user,'customer.view');
  const params=[SOURCE_TYPES],scope=['owner','admin','system_admin'].includes(user.role)||user.branchScope==='*'?'TRUE':'branch_id=$2';
  if(scope!=='TRUE')params.push(user.branchId);
  return (await client.query(`SELECT id,document_number,document_type,title,party_id,party_name,status,updated_at FROM business_documents WHERE document_type=ANY($1) AND ${scope} AND is_archived=false ORDER BY updated_at DESC LIMIT 100`,params)).rows.map(runtime.camel);
}

async function customerCandidates(client,q=''){
  const value=String(q||'').trim().slice(0,120),params=[];let where="active AND lifecycle_status NOT IN('BLOCKED','ARCHIVED')";
  if(value){params.push(`%${value}%`,value.toUpperCase().replace(/[^A-Z0-9]/g,''));where+=` AND (code ILIKE $1 OR name ILIKE $1 OR legal_name ILIKE $1 OR npwp ILIKE $1 OR regexp_replace(upper(COALESCE(npwp,'')),'[^A-Z0-9]','','g')=$2)`;}
  return (await client.query(`SELECT id,code,name,legal_name,npwp,city,currency,payment_term_days,credit_limit_amount,credit_hold,risk_rating,data_quality_score FROM customers WHERE ${where} ORDER BY name LIMIT 50`,params)).rows.map(runtime.camel);
}

async function recover(client,user){
  assertPermission(user,'customer.create');
  const row=(await client.query(`UPDATE customer_link_drafts SET status='EXPIRED',updated_at=now() WHERE created_by=$1 AND status='DRAFT' AND expires_at<=now() RETURNING id`,[user.id])).rows;
  void row;
  const draft=(await client.query(`SELECT * FROM customer_link_drafts WHERE created_by=$1 AND status='DRAFT' AND expires_at>now() ORDER BY updated_at DESC LIMIT 1`,[user.id])).rows[0];
  return runtime.camel(draft);
}

async function start(client,user,{sourceDocumentId}={}){
  assertPermission(user,'customer.create');
  const source=await sourceRow(client,sourceDocumentId,user);
  if(source){
    const existing=(await client.query(`SELECT * FROM customer_link_drafts WHERE created_by=$1 AND source_document_id=$2 AND status='DRAFT'`,[user.id,source.id])).rows[0];
    if(existing)return runtime.camel(existing);
  }
  const row=(await client.query(`INSERT INTO customer_link_drafts(id,created_by,branch_id,source_document_id,payload)
    VALUES($1,$2,$3,$4,$5) RETURNING *`,[randomUUID(),user.id,source?.branch_id||user.branchId,source?.id||null,{source:source?runtime.camel(source):null,mode:'EXISTING'}])).rows[0];
  return runtime.camel(row);
}

async function save(client,user,id,{expectedVersion,currentStep,payload}){
  assertPermission(user,'customer.create');
  if(!Number.isInteger(Number(expectedVersion)))throw new AppError('VALIDATION_ERROR','expectedVersion wajib diisi.');
  const row=(await client.query(`UPDATE customer_link_drafts SET current_step=COALESCE($4,current_step),payload=COALESCE($5,payload),version=version+1,updated_at=now(),expires_at=now()+interval '30 days'
    WHERE id=$1 AND created_by=$2 AND status='DRAFT' AND version=$3 RETURNING *`,[id,user.id,Number(expectedVersion),currentStep===undefined?null:Number(currentStep),payload||null])).rows[0];
  if(row)return runtime.camel(row);
  const current=(await client.query('SELECT version,status FROM customer_link_drafts WHERE id=$1 AND created_by=$2',[id,user.id])).rows[0];
  if(!current)throw new AppError('RESOURCE_NOT_FOUND');
  if(current.status!=='DRAFT')throw new AppError('STATUS_INVALID','Draft Customer Link sudah final.');
  throw new AppError('DOCUMENT_CONFLICT','Draft berubah di tab lain. Muat ulang versi terbaru.');
}

async function abandon(client,user,id,reason,requestId){
  assertPermission(user,'customer.create');
  if(!String(reason||'').trim())throw new AppError('REASON_REQUIRED');
  const row=(await client.query(`UPDATE customer_link_drafts SET status='ABANDONED',updated_at=now() WHERE id=$1 AND created_by=$2 AND status='DRAFT' RETURNING *`,[id,user.id])).rows[0];
  if(!row)throw new AppError('RESOURCE_NOT_FOUND');
  await runtime.audit(client,{userId:user.id,action:'CANCEL',module:'customer',entityType:'CUSTOMER_LINK_DRAFT',entityId:id,reason,requestId,branchId:row.branch_id});
  return runtime.camel(row);
}

async function finalize(client,user,id,body,requestId){
  assertPermission(user,'customer.create');
  const draft=(await client.query(`SELECT * FROM customer_link_drafts WHERE id=$1 AND created_by=$2 FOR UPDATE`,[id,user.id])).rows[0];
  if(!draft)throw new AppError('RESOURCE_NOT_FOUND');
  if(draft.status==='COMPLETED')return runtime.camel((await client.query('SELECT * FROM customers WHERE id=$1',[draft.completed_customer_id])).rows[0]);
  if(draft.status!=='DRAFT')throw new AppError('STATUS_INVALID');
  if(Number(body.expectedVersion)!==draft.version)throw new AppError('DOCUMENT_CONFLICT','Draft berubah; muat ulang sebelum finalisasi.');
  const p=draft.payload||{},mode=p.mode||'EXISTING';let customer;
  if(mode==='EXISTING'){
    if(!p.customerId)throw new AppError('VALIDATION_ERROR','Pelanggan existing wajib dipilih.');
    customer=runtime.camel((await client.query(`SELECT * FROM customers WHERE id=$1 AND active AND lifecycle_status NOT IN('BLOCKED','ARCHIVED')`,[p.customerId])).rows[0]);
    if(!customer)throw new AppError('RESOURCE_NOT_FOUND','Pelanggan existing tidak tersedia.');
  }else if(mode==='NEW'){
    const c=p.customer||{};
    for(const key of ['code','name','legalName'])if(!String(c[key]||'').trim())throw new AppError('VALIDATION_ERROR',`${key} pelanggan wajib diisi.`);
    customer=await operations.createMaster(client,'customers',{...c,customerType:c.customerType||'COMPANY',ppnStatus:c.ppnStatus||'PKP',currency:c.currency||'IDR',paymentTermDays:Number(c.paymentTermDays)||30,active:true},user);
    if(p.contact?.name)await masterData.createSub(client,'customers',customer.id,'contacts',{...p.contact,isPrimary:true,active:true},user,requestId);
    if(p.address?.address)await masterData.createSub(client,'customers',customer.id,'addresses',{...p.address,addressType:p.address.addressType||'BILLING',isDefault:true,active:true},user,requestId);
  }else throw new AppError('VALIDATION_ERROR','Mode Customer Link tidak dikenal.');

  if(draft.source_document_id){
    const source=await sourceRow(client,draft.source_document_id,user);
    if(source.party_id&&source.party_id!==customer.id)throw new AppError('VALIDATION_ERROR',`Dokumen ${source.document_number} sudah terhubung ke pelanggan lain.`);
    await client.query(`UPDATE business_documents SET party_id=$2,party_name=$3,payload=payload||jsonb_build_object('customerLinkDraftId',$4::text,'customerLinkedAt',now()),version=version+1,updated_at=now(),updated_by=$5 WHERE id=$1`,[source.id,customer.id,customer.name,id,user.id]);
    await runtime.audit(client,{userId:user.id,action:'LINK',module:'customer',entityType:source.document_type,entityId:source.id,documentNumber:source.document_number,newValue:{customerId:customer.id,customerName:customer.name,draftId:id},requestId,branchId:source.branch_id});
  }
  await client.query(`UPDATE customer_link_drafts SET status='COMPLETED',completed_customer_id=$2,current_step=5,version=version+1,completed_at=now(),updated_at=now() WHERE id=$1`,[id,customer.id]);
  await runtime.audit(client,{userId:user.id,action:'CREATE',module:'customer',entityType:'CUSTOMER_LINK',entityId:id,newValue:{customerId:customer.id,mode,sourceDocumentId:draft.source_document_id},requestId,branchId:draft.branch_id});
  return customer;
}

module.exports={listSources,customerCandidates,recover,start,save,abandon,finalize};
