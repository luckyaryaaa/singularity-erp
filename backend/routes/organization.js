'use strict';
const { readBody } = require('../core/util');
const { AppError } = require('../core/errors');
const { assertPermission } = require('../core/permissions');
const { verifyPassword } = require('../core/auth');
const organization = require('../infrastructure/database/repositories/organization');
const runtime = require('../infrastructure/database/repositories/runtime');
const { NO_MATCH } = require('./shared');

async function dispatch(client, req, url, ctx) {
  const p=url.pathname, method=req.method;
  let m;
  // Enterprise Organization Master.
  if(method==='GET'&&p==='/api/organization')return organization.overview(client,ctx.user,url.searchParams.get('id'));
  m=p.match(/^\/api\/organization\/([0-9a-f-]{36})$/);
  if(method==='PATCH'&&m){const body=await readBody(req),pinRow=(await client.query('SELECT owner_pin_hash FROM app_users WHERE id=$1',[ctx.user.id])).rows[0];if(!body.pin||!pinRow?.owner_pin_hash||!verifyPassword(String(body.pin),pinRow.owner_pin_hash))throw new AppError('PIN_REQUIRED');return organization.updateIdentity(client,ctx.user,m[1],body,ctx.requestId);}
  m=p.match(/^\/api\/organization\/([0-9a-f-]{36})\/hierarchy$/);
  if(method==='GET'&&m)return organization.hierarchy(client,ctx.user,m[1]);
  m=p.match(/^\/api\/organization\/([0-9a-f-]{36})\/(assets|signatories|tax-identities|bank-accounts)$/);
  if(method==='GET'&&m)return{items:await organization.listResource(client,ctx.user,m[1],m[2])};
  if(method==='POST'&&m){const body=await readBody(req);ctx.status=201;return organization.createResource(client,ctx.user,m[1],m[2],body,ctx.requestId);}
  m=p.match(/^\/api\/organization\/([0-9a-f-]{36})\/bank-accounts\/([0-9a-f-]{36})\/(approve|reject)$/);
  if(method==='POST'&&m){const body=await readBody(req);if(ctx.user.role!=='owner')throw new AppError('PERMISSION_DENIED');const pinRow=(await client.query('SELECT owner_pin_hash FROM app_users WHERE id=$1',[ctx.user.id])).rows[0];if(!body.pin||!pinRow?.owner_pin_hash||!verifyPassword(String(body.pin),pinRow.owner_pin_hash))throw new AppError('PIN_REQUIRED');if(!ctx.session.mfaVerifiedAt||Date.now()-new Date(ctx.session.mfaVerifiedAt).getTime()>10*60*1000)throw new AppError('MFA_REQUIRED','Persetujuan rekening perusahaan membutuhkan login MFA yang masih baru.');return organization.decideBank(client,ctx.user,m[1],m[2],m[3],body.reason,ctx.requestId);}

  // Compatibility settings view: organization master tetap menjadi single source of truth.
  if(method==='GET'&&p==='/api/system/settings'){
    assertPermission(ctx.user,'settings.view');const profile=await organization.overview(client,ctx.user),banks=await organization.listResource(client,ctx.user,profile.id,'bank-accounts');
    const saved=(await client.query(`SELECT value FROM system_settings WHERE setting_key='company'`)).rows[0]?.value||{},bank=banks.find(x=>x.verificationStatus==='VERIFIED'&&x.isPrimary)||banks.find(x=>x.verificationStatus==='VERIFIED');
    const policies=(await client.query(`SELECT policy_key,version,document_type,branch_id,min_amount,max_amount,steps,effective_from,effective_until FROM approval_policy_versions WHERE status='ACTIVE' AND effective_from<=now() AND (effective_until IS NULL OR effective_until>now()) ORDER BY document_type,branch_id NULLS FIRST,min_amount`)).rows.map(runtime.camel);
    return{company:{name:profile.legalName,npwp:profile.npwp||'Belum dikonfigurasi',address:profile.operationalAddress||profile.legalAddress||'',bank:bank?{name:bank.bankName,account:bank.accountNumber}:{name:'Belum ada rekening terverifikasi',account:'—'},numberingFormat:saved.numberingFormat||'{PREFIX}-{MMYY}-{SEQ:3}',fiscalYear:saved.fiscalYear||new Date().getFullYear(),database:'PostgreSQL',organizationMasterId:profile.id},approvalMatrix:policies.map(x=>({policyKey:x.policyKey,version:x.version,documentType:x.documentType,branchId:x.branchId,minAmount:Number(x.minAmount),maxAmount:x.maxAmount===null?null:Number(x.maxAmount),levels:(x.steps||[]).sort((a,b)=>a.sequence-b.sequence).map(s=>s.level)}))};
  }
  if(method==='PATCH'&&p==='/api/system/settings/company'){
    assertPermission(ctx.user,'settings.edit');if(ctx.user.role!=='owner')throw new AppError('PERMISSION_DENIED');const body=await readBody(req),pinRow=(await client.query('SELECT owner_pin_hash FROM app_users WHERE id=$1',[ctx.user.id])).rows[0];if(!body.pin||!pinRow?.owner_pin_hash||!verifyPassword(String(body.pin),pinRow.owner_pin_hash))throw new AppError('PIN_REQUIRED');
    const profile=await organization.overview(client,ctx.user),company=body.company||{};await organization.updateIdentity(client,ctx.user,profile.id,{legalName:company.name,tradeName:profile.tradeName,npwp:company.npwp,legalAddress:company.address,operationalAddress:company.address,reason:body.reason},ctx.requestId);
    const value={numberingFormat:String(company.numberingFormat||'{PREFIX}-{MMYY}-{SEQ:3}').slice(0,80),fiscalYear:Number(company.fiscalYear)||new Date().getFullYear()};await client.query(`INSERT INTO system_settings(setting_key,value,updated_by) VALUES('company',$1,$2) ON CONFLICT(setting_key) DO UPDATE SET value=system_settings.value||excluded.value,updated_at=now(),updated_by=excluded.updated_by`,[value,ctx.user.id]);
    return{company:{name:company.name,npwp:company.npwp,address:company.address,bank:{name:'Kelola melalui Organization Workbench',account:'maker-checker'},...value,database:'PostgreSQL',organizationMasterId:profile.id}};
  }

  return NO_MATCH;
}

module.exports={dispatch};
