'use strict';
const { AppError } = require('../../../core/errors');
const { assertPermission, hasPermission } = require('../../../core/permissions');
const fieldEncryption = require('../../../core/field-encryption');
const runtime = require('./runtime');

const maskAccount = (value) => value ? `••••${String(value).slice(-4)}` : value;
const canSeeBank = (user) => ['owner','finance_manager','accounting','auditor'].includes(user.role) || hasPermission(user,'*');

async function entity(client,id){
  const row=(await client.query('SELECT * FROM legal_entities WHERE ($1::uuid IS NULL OR id=$1) ORDER BY active DESC,created_at LIMIT 1',[id||null])).rows[0];
  if(!row)throw new AppError('RESOURCE_NOT_FOUND','Legal entity belum dikonfigurasi.');
  return row;
}

async function overview(client,user,id){
  assertPermission(user,'organization.view');
  const row=await entity(client,id);
  const counts=(await client.query(`SELECT
    (SELECT count(*) FROM branches WHERE legal_entity_id=$1) branches,
    (SELECT count(*) FROM business_units WHERE legal_entity_id=$1) business_units,
    (SELECT count(*) FROM departments WHERE legal_entity_id=$1) departments,
    (SELECT count(*) FROM cost_centers WHERE legal_entity_id=$1) cost_centers,
    (SELECT count(*) FROM profit_centers WHERE legal_entity_id=$1) profit_centers,
    (SELECT count(*) FROM work_locations WHERE legal_entity_id=$1) work_locations,
    (SELECT count(*) FROM organization_assets WHERE legal_entity_id=$1) assets,
    (SELECT count(*) FROM organization_signatories WHERE legal_entity_id=$1) signatories,
    (SELECT count(*) FROM organization_tax_identities WHERE legal_entity_id=$1) tax_identities,
    (SELECT count(*) FROM company_bank_accounts WHERE legal_entity_id=$1) bank_accounts`,[row.id])).rows[0];
  const completenessFields=['legal_name','trade_name','business_field','legal_address','operational_address','phone','whatsapp','email','website','npwp'];
  const completed=completenessFields.filter(k=>String(row[k]||'').trim()).length;
  return {...runtime.camel(row),completeness:{score:Math.round(completed/completenessFields.length*100),completed,total:completenessFields.length},subCounts:runtime.camel(counts)};
}

async function hierarchy(client,user,id){
  assertPermission(user,'organization.view'); const row=await entity(client,id);
  const [businessUnits,branches,departments,costCenters,profitCenters,plants,warehouses,workLocations,ledgers,calendars]=await Promise.all([
    client.query('SELECT * FROM business_units WHERE legal_entity_id=$1 ORDER BY code',[row.id]),
    client.query('SELECT * FROM branches WHERE legal_entity_id=$1 ORDER BY code',[row.id]),
    client.query('SELECT * FROM departments WHERE legal_entity_id=$1 ORDER BY code',[row.id]),
    client.query('SELECT * FROM cost_centers WHERE legal_entity_id=$1 ORDER BY code',[row.id]),
    client.query('SELECT * FROM profit_centers WHERE legal_entity_id=$1 ORDER BY code',[row.id]),
    client.query('SELECT p.* FROM plants p JOIN branches b ON b.id=p.branch_id WHERE b.legal_entity_id=$1 ORDER BY p.code',[row.id]),
    client.query('SELECT w.* FROM org_warehouses w JOIN branches b ON b.id=w.branch_id WHERE b.legal_entity_id=$1 ORDER BY w.code',[row.id]),
    client.query('SELECT * FROM work_locations WHERE legal_entity_id=$1 ORDER BY code',[row.id]),
    client.query('SELECT * FROM ledgers WHERE legal_entity_id=$1 ORDER BY code',[row.id]),
    client.query('SELECT * FROM fiscal_calendars WHERE legal_entity_id=$1 ORDER BY fiscal_year DESC',[row.id])
  ]);
  return {businessUnits:businessUnits.rows.map(runtime.camel),branches:branches.rows.map(runtime.camel),departments:departments.rows.map(runtime.camel),costCenters:costCenters.rows.map(runtime.camel),profitCenters:profitCenters.rows.map(runtime.camel),plants:plants.rows.map(runtime.camel),warehouses:warehouses.rows.map(runtime.camel),workLocations:workLocations.rows.map(runtime.camel),ledgers:ledgers.rows.map(runtime.camel),fiscalCalendars:calendars.rows.map(runtime.camel)};
}

const RESOURCES={
  assets:{table:'organization_assets',cols:['asset_type','title','file_id','metadata','effective_from','effective_to','status'],order:'created_at DESC'},
  signatories:{table:'organization_signatories',cols:['employee_id','signatory_name','position_title','document_types','signature_asset_id','effective_from','effective_to','active'],order:'effective_from DESC'},
  'tax-identities':{table:'organization_tax_identities',cols:['branch_id','identity_type','identity_number','registered_name','effective_from','effective_to','status','is_primary'],order:'identity_type,is_primary DESC',
    encrypted:{field:'identity_number',purpose:'organization_tax.identity_number',blind:true}},
  'bank-accounts':{table:'company_bank_accounts',cols:['branch_id','bank_name','account_number','account_holder','currency','usage_purpose','effective_from','effective_to','is_primary','qr_payload','change_reason'],order:'created_at DESC',bank:true,
    encrypted:{field:'account_number',purpose:'company_bank.account_number',blind:true}}
};
const snake=(key)=>key.replace(/[A-Z]/g,c=>`_${c.toLowerCase()}`);
function decryptResource(spec, row, entityId) {
  if (!row) return row;
  if (spec.encrypted) {
    const field = spec.encrypted.field;
    if (row[`${field}_ciphertext`]) {
      row[field] = fieldEncryption.decrypt(row[`${field}_ciphertext`],
        { purpose: spec.encrypted.purpose, scope: entityId });
    }
    delete row[`${field}_ciphertext`];
    delete row[`${field}_key_id`];
    delete row[`${field}_blind_index`];
  }
  return row;
}

async function listResource(client,user,id,name){
  assertPermission(user,'organization.view'); const row=await entity(client,id),spec=RESOURCES[name];
  if(!spec)throw new AppError('RESOURCE_NOT_FOUND');
  const items=(await client.query(`SELECT * FROM ${spec.table} WHERE legal_entity_id=$1 ORDER BY ${spec.order} LIMIT 200`,[row.id])).rows
    .map((item) => runtime.camel(decryptResource(spec, item, row.id)));
  return items.map(item=>spec.bank&&!canSeeBank(user)?{...item,accountNumber:maskAccount(item.accountNumber)}:item);
}

async function createResource(client,user,id,name,body,requestId){
  assertPermission(user,'organization.edit'); const row=await entity(client,id),spec=RESOURCES[name];
  if(!spec)throw new AppError('RESOURCE_NOT_FOUND');
  if(spec.bank&&!String(body.changeReason||body.change_reason||'').trim())throw new AppError('REASON_REQUIRED');
  const payload={}; for(const [key,value] of Object.entries(body)){const col=snake(key);if(spec.cols.includes(col)&&value!==''&&value!==undefined)payload[col]=value;}
  if(!Object.keys(payload).length)throw new AppError('VALIDATION_ERROR','Tidak ada kolom valid untuk disimpan.');
  let sensitivePlaintext = null;
  if(spec.encrypted){
    const field=spec.encrypted.field;
    sensitivePlaintext=String(payload[field]||'');
    if(!sensitivePlaintext.trim())throw new AppError('VALIDATION_ERROR',`${field} wajib diisi.`);
    const protectedValue=fieldEncryption.protect(sensitivePlaintext,
      {purpose:spec.encrypted.purpose,scope:row.id,blind:Boolean(spec.encrypted.blind)});
    payload[field]=protectedValue.legacyToken;
    payload[`${field}_ciphertext`]=protectedValue.ciphertext;
    payload[`${field}_key_id`]=protectedValue.keyId;
    if(spec.encrypted.blind)payload[`${field}_blind_index`]=protectedValue.blindIndex;
  }
  if(spec.bank){
    payload.proposed_by=user.id;payload.verification_status='PENDING_VERIFICATION';
  }
  else payload.created_by=user.id;
  const keys=Object.keys(payload),created=(await client.query(`INSERT INTO ${spec.table}(legal_entity_id,${keys.join(',')}) VALUES($1,${keys.map((_,i)=>`$${i+2}`).join(',')}) RETURNING *`,[row.id,...keys.map(k=>payload[k])])).rows[0];
  const auditPayload={...payload};
  if(spec.encrypted){
    const field=spec.encrypted.field;
    delete auditPayload[`${field}_ciphertext`];
    delete auditPayload[`${field}_key_id`];
    delete auditPayload[`${field}_blind_index`];
    auditPayload[field]=spec.bank?maskAccount(sensitivePlaintext):'REDACTED';
  }
  await runtime.audit(client,{userId:user.id,action:'CREATE',module:'organization',entityType:`ORGANIZATION_${name.toUpperCase()}`,entityId:created.id,newValue:{
    ...auditPayload
  },reason:payload.change_reason||null,requestId,branchId:user.branchId});
  return runtime.camel(decryptResource(spec, created, row.id));
}

async function updateIdentity(client,user,id,body,requestId){
  assertPermission(user,'organization.edit'); if(user.role!=='owner')throw new AppError('PERMISSION_DENIED','Hanya Owner yang dapat mengubah identitas legal entity.');
  if(!String(body.reason||'').trim())throw new AppError('REASON_REQUIRED'); const old=await entity(client,id);
  const allowed=['legal_name','trade_name','business_field','tagline','legal_address','operational_address','phone','whatsapp','email','website','npwp','document_footer'];
  const payload={};for(const [key,value] of Object.entries(body)){const col=snake(key);if(allowed.includes(col))payload[col]=value||null;}
  if(!String(payload.legal_name||old.legal_name).trim())throw new AppError('VALIDATION_ERROR','Nama legal wajib diisi.');
  const keys=Object.keys(payload);if(!keys.length)throw new AppError('VALIDATION_ERROR');
  const updated=(await client.query(`UPDATE legal_entities SET ${keys.map((k,i)=>`${k}=$${i+2}`).join(',')},mdm_version=mdm_version+1,change_reason=$${keys.length+2},data_steward=$${keys.length+3},updated_at=now() WHERE id=$1 RETURNING *`,[old.id,...keys.map(k=>payload[k]),body.reason,user.id])).rows[0];
  await runtime.audit(client,{userId:user.id,action:'UPDATE',module:'organization',entityType:'LEGAL_ENTITY',entityId:old.id,oldValue:runtime.camel(old),newValue:runtime.camel(updated),reason:body.reason,requestId,branchId:user.branchId});
  return runtime.camel(updated);
}

async function decideBank(client,user,entityId,bankId,decision,reason,requestId){
  assertPermission(user,decision==='approve'?'organization.approve':'organization.reject');
  if(user.role!=='owner')throw new AppError('PERMISSION_DENIED','Persetujuan rekening perusahaan hanya oleh Owner.');
  const row=(await client.query('SELECT * FROM company_bank_accounts WHERE id=$1 AND legal_entity_id=$2 FOR UPDATE',[bankId,entityId])).rows[0];
  if(!row)throw new AppError('RESOURCE_NOT_FOUND'); if(row.proposed_by===user.id)throw new AppError('SOD_CONFLICT','Maker tidak boleh menjadi checker.');
  if(row.verification_status!=='PENDING_VERIFICATION')throw new AppError('STATUS_INVALID');
  let updated;
  if(decision==='approve'){
    if(row.is_primary)await client.query(`UPDATE company_bank_accounts SET is_primary=false,updated_at=now() WHERE legal_entity_id=$1 AND currency=$2 AND usage_purpose=$3 AND verification_status='VERIFIED'`,[entityId,row.currency,row.usage_purpose]);
    updated=(await client.query(`UPDATE company_bank_accounts SET verification_status='VERIFIED',approved_by=$2,approved_at=now(),updated_at=now() WHERE id=$1 RETURNING *`,[bankId,user.id])).rows[0];
  }else{
    if(!String(reason||'').trim())throw new AppError('REASON_REQUIRED');
    updated=(await client.query(`UPDATE company_bank_accounts SET verification_status='REJECTED',rejected_by=$2,rejected_at=now(),rejection_reason=$3,updated_at=now() WHERE id=$1 RETURNING *`,[bankId,user.id,reason])).rows[0];
  }
  const account = decryptResource(RESOURCES['bank-accounts'], { ...row }, entityId).account_number;
  await runtime.audit(client,{userId:user.id,action:decision==='approve'?'APPROVE':'REJECT',module:'organization',entityType:'COMPANY_BANK',entityId:bankId,oldValue:{status:row.verification_status,account:maskAccount(account)},newValue:{status:updated.verification_status,account:maskAccount(account)},reason:reason||row.change_reason,requestId,branchId:user.branchId});
  return runtime.camel(decryptResource(RESOURCES['bank-accounts'], updated, entityId));
}

// Aset visual resmi (logo kop, stempel, tanda tangan) untuk dokumen PDF.
// Effective-dated pada tanggal dokumen sehingga cetak ulang dokumen lama tetap
// memakai kop/stempel yang berlaku saat itu. Berkas wajib lolos pemindaian
// (privateStorage.download memverifikasi checksum + scan_status CLEAN);
// kegagalan satu aset tidak boleh menggagalkan pencetakan.
const ASSET_SLOTS={LETTERHEAD_LOGO:'logo',APPLICATION_LOGO:'logo',STAMP:'stamp',SIGNATURE:'signature'};
// legalEntityId opsional: bila kosong dipakai legal entity default. Tidak ada
// assertPermission di sini — pemanggil sudah lolos izin view dokumen, dan aset
// kop bersifat identitas publik pada dokumen resmi.
async function documentAssets(client,legalEntityId,onDate){
  const entityId=legalEntityId||(await entity(client).catch(()=>null))?.id;
  if(!entityId)return{};
  const date=(onDate||new Date().toISOString()).slice(0,10);
  const rows=(await client.query(`SELECT asset_type,file_id FROM organization_assets
    WHERE legal_entity_id=$1 AND status='ACTIVE' AND file_id IS NOT NULL
      AND effective_from<=$2 AND (effective_to IS NULL OR effective_to>=$2)
      AND asset_type=ANY($3) ORDER BY effective_from DESC`,
    [entityId,date,Object.keys(ASSET_SLOTS)])).rows;
  const storage=require('../../files/private-storage'),out={};
  for(const row of rows){
    const slot=ASSET_SLOTS[row.asset_type];
    if(!slot||out[slot])continue;                              // baris pertama (terbaru) menang
    try{const {item,buffer}=await storage.download(client,row.file_id);out[slot]={buffer,mimeType:item.mimeType};}
    catch{/* aset hilang/belum bersih — lewati, renderer memakai fallback */}
  }
  return out;
}

module.exports={overview,hierarchy,listResource,createResource,updateIdentity,decideBank,documentAssets};
