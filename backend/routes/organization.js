'use strict';
const { readBody } = require('../core/util');
const { AppError } = require('../core/errors');
const { assertPermission } = require('../core/permissions');
const { verifyPassword } = require('../core/password');
const organization = require('../infrastructure/database/repositories/organization');
const orgStructure = require('../infrastructure/database/repositories/org-structure');
const orgWorkforce = require('../infrastructure/database/repositories/org-workforce');
const runtime = require('../infrastructure/database/repositories/runtime');
const docTemplates = require('../infrastructure/database/repositories/document-templates');
const docRender = require('../infrastructure/files/document-render');
const { NO_MATCH } = require('./shared');

// Data contoh untuk pratinjau template (tidak menyentuh dokumen nyata) — nilai
// mengikuti desain resmi agar pengguna melihat hasil sebenarnya saat mendesain.
function previewSample(documentType, orgSnapshot) {
  const isQuo = documentType === 'QUOTATION';
  const amount = isQuo ? 185_000_000 : 385_000_000;
  return {
    document: {
      documentType, documentNumber: `${isQuo ? 'QO' : (documentType.split('_')[0].slice(0, 3))}-PRV/001`,
      status: 'APPROVED', amount, partyName: 'PT Hitachi Construction Machinery Indonesia',
      createdAt: new Date().toISOString(), dueDate: isQuo ? new Date(Date.now() + 30 * 864e5).toISOString() : null,
      organizationIdentitySnapshot: orgSnapshot,
      payload: { customerAddress: 'Cibitung, Bekasi', attn: 'Ibu Rani', customerPoNumber: isQuo ? null : 'PO-2026-001', poDate: isQuo ? null : '2026-06-01', terms: '30 Days' }
    },
    lines: [{ lineNo: 1, description: 'Hydraulic Cylinder Repair', qty: 1, uom: 'service', unitPrice: amount, discountPct: 0, taxPct: 0, lineTotal: amount }]
  };
}
async function orgPreviewSnapshot(client, user) {
  const profile = await organization.overview(client, user);
  const banks = await organization.listResource(client, user, profile.id, 'bank-accounts');
  const bank = banks.find((b) => b.verificationStatus === 'VERIFIED' && b.isPrimary) || banks.find((b) => b.verificationStatus === 'VERIFIED') || banks[0] || {};
  return {
    legalName: profile.legalName, tradeName: profile.tradeName, tagline: profile.tagline,
    operationalAddress: profile.operationalAddress || profile.legalAddress, npwp: profile.npwp,
    phone: profile.phone, whatsapp: profile.whatsapp, email: profile.email, website: profile.website, documentFooter: profile.documentFooter,
    bank: bank.bankName ? { bankName: bank.bankName, accountHolder: bank.accountHolder, accountNumber: bank.accountNumber, branch: bank.branchName || bank.branch } : {}
  };
}

async function dispatch(client, req, url, ctx) {
  const p=url.pathname, method=req.method;
  let m;
  // Enterprise Organization Master.
  if(method==='GET'&&p==='/api/organization')return organization.overview(client,ctx.user,url.searchParams.get('id'));
  m=p.match(/^\/api\/organization\/([0-9a-f-]{36})$/);
  if(method==='PATCH'&&m){const body=await readBody(req),pinRow=(await client.query('SELECT owner_pin_hash FROM app_users WHERE id=$1',[ctx.user.id])).rows[0];if(!body.pin||!pinRow?.owner_pin_hash||!verifyPassword(String(body.pin),pinRow.owner_pin_hash))throw new AppError('PIN_REQUIRED');return organization.updateIdentity(client,ctx.user,m[1],body,ctx.requestId);}
  m=p.match(/^\/api\/organization\/([0-9a-f-]{36})\/hierarchy$/);
  if(method==='GET'&&m)return organization.hierarchy(client,ctx.user,m[1]);
  // P1-3 — workbench struktur organisasi. Sebelumnya business unit, cabang,
  // departemen, cost center, profit center, plant, dan gudang hanya lahir dari
  // seed migrasi: membuka cabang baru menuntut developer menjalankan SQL ke
  // produksi. Perubahan struktur menuntut alasan tertulis dan tercatat di audit.
  m=p.match(/^\/api\/organization\/([0-9a-f-]{36})\/structure\/(business-units|branches|departments|cost-centers|profit-centers|plants|warehouses)$/);
  if(method==='GET'&&m)return orgStructure.list(client,ctx.user,m[2],{legalEntityId:m[1]});
  if(method==='POST'&&m){const body=await readBody(req);ctx.status=201;
    return orgStructure.create(client,ctx.user,m[2],body,{legalEntityId:m[1],requestId:ctx.requestId});}
  m=p.match(/^\/api\/organization\/([0-9a-f-]{36})\/structure\/(business-units|branches|departments|cost-centers|profit-centers|plants|warehouses)\/([0-9a-f-]{36})$/);
  if(method==='PATCH'&&m){const body=await readBody(req);
    return orgStructure.update(client,ctx.user,m[2],m[3],body,{legalEntityId:m[1],requestId:ctx.requestId});}

  m=p.match(/^\/api\/organization\/([0-9a-f-]{36})\/(assets|signatories|tax-identities|bank-accounts)$/);
  if(method==='GET'&&m)return{items:await organization.listResource(client,ctx.user,m[1],m[2])};
  if(method==='POST'&&m){const body=await readBody(req);ctx.status=201;return organization.createResource(client,ctx.user,m[1],m[2],body,ctx.requestId);}
  m=p.match(/^\/api\/organization\/([0-9a-f-]{36})\/bank-accounts\/([0-9a-f-]{36})\/(approve|reject)$/);
  if(method==='POST'&&m){const body=await readBody(req);if(ctx.user.role!=='owner')throw new AppError('PERMISSION_DENIED');const pinRow=(await client.query('SELECT owner_pin_hash FROM app_users WHERE id=$1',[ctx.user.id])).rows[0];if(!body.pin||!pinRow?.owner_pin_hash||!verifyPassword(String(body.pin),pinRow.owner_pin_hash))throw new AppError('PIN_REQUIRED');if(!ctx.session.mfaVerifiedAt||Date.now()-new Date(ctx.session.mfaVerifiedAt).getTime()>10*60*1000)throw new AppError('MFA_REQUIRED','Persetujuan rekening perusahaan membutuhkan login MFA yang masih baru.');return organization.decideBank(client,ctx.user,m[1],m[2],m[3],body.reason,ctx.requestId);}

  // Versioned hierarchy + canonical Job/Position/Assignment + delegation.
  m=p.match(/^\/api\/organization\/([0-9a-f-]{36})\/workforce\/hierarchy-versions$/);
  if(method==='GET'&&m){assertPermission(ctx.user,'organization.view');return{items:await orgWorkforce.listVersions(client,ctx.user,m[1])};}
  if(method==='POST'&&m){assertPermission(ctx.user,'organization.edit');const body=await readBody(req),item=await orgWorkforce.captureVersion(client,ctx.user,m[1],body);await runtime.audit(client,{userId:ctx.user.id,action:'CREATE',module:'organization',entityType:'HIERARCHY_VERSION',entityId:item.id,newValue:{version:item.versionNo,sha:item.snapshotSha256},reason:body.reason,requestId:ctx.requestId,branchId:ctx.user.branchId});ctx.status=201;return item;}
  m=p.match(/^\/api\/organization\/([0-9a-f-]{36})\/workforce\/hierarchy-versions\/([0-9a-f-]{36})\/(submit|approve|reject|activate)$/);
  if(method==='POST'&&m){assertPermission(ctx.user,m[3]==='submit'?'organization.edit':'organization.approve');const body=await readBody(req),result=await orgWorkforce.decideVersion(client,ctx.user,m[2],m[3],body.reason);await runtime.audit(client,{userId:ctx.user.id,action:m[3].toUpperCase(),module:'organization',entityType:'HIERARCHY_VERSION',entityId:m[2],newValue:result,reason:body.reason,requestId:ctx.requestId,branchId:ctx.user.branchId});return result;}
  m=p.match(/^\/api\/organization\/([0-9a-f-]{36})\/workforce\/jobs$/);
  if(method==='GET'&&m){assertPermission(ctx.user,'organization.view');return{items:await orgWorkforce.listJobs(client,ctx.user,m[1])};}
  if(method==='POST'&&m){assertPermission(ctx.user,'organization.create');const body=await readBody(req),item=await orgWorkforce.createJob(client,ctx.user,m[1],body);await runtime.audit(client,{userId:ctx.user.id,action:'CREATE',module:'organization',entityType:'JOB',entityId:item.id,newValue:item,requestId:ctx.requestId,branchId:ctx.user.branchId});ctx.status=201;return item;}
  m=p.match(/^\/api\/organization\/[0-9a-f-]{36}\/workforce\/jobs\/([0-9a-f-]{36})$/);
  if(method==='PATCH'&&m){assertPermission(ctx.user,'organization.edit');const body=await readBody(req),item=await orgWorkforce.updateJob(client,ctx.user,m[1],body);await runtime.audit(client,{userId:ctx.user.id,action:'UPDATE',module:'organization',entityType:'JOB',entityId:m[1],newValue:item,requestId:ctx.requestId,branchId:ctx.user.branchId});return item;}
  m=p.match(/^\/api\/organization\/([0-9a-f-]{36})\/workforce\/positions$/);
  if(method==='GET'&&m){assertPermission(ctx.user,'organization.view');return{items:await orgWorkforce.listPositions(client,ctx.user,m[1])};}
  if(method==='POST'&&m){assertPermission(ctx.user,'organization.create');const body=await readBody(req),item=await orgWorkforce.createPosition(client,ctx.user,m[1],body);await runtime.audit(client,{userId:ctx.user.id,action:'CREATE',module:'organization',entityType:'POSITION',entityId:item.id,newValue:item,requestId:ctx.requestId,branchId:ctx.user.branchId});ctx.status=201;return item;}
  m=p.match(/^\/api\/organization\/[0-9a-f-]{36}\/workforce\/positions\/([0-9a-f-]{36})$/);
  if(method==='PATCH'&&m){assertPermission(ctx.user,'organization.edit');const body=await readBody(req),item=await orgWorkforce.updatePosition(client,ctx.user,m[1],body);await runtime.audit(client,{userId:ctx.user.id,action:'UPDATE',module:'organization',entityType:'POSITION',entityId:m[1],newValue:item,requestId:ctx.requestId,branchId:ctx.user.branchId});return item;}
  m=p.match(/^\/api\/organization\/([0-9a-f-]{36})\/workforce\/assignments$/);
  if(method==='GET'&&m){assertPermission(ctx.user,'organization.view');return{items:await orgWorkforce.listAssignments(client,ctx.user,m[1])};}
  if(method==='POST'&&m){assertPermission(ctx.user,'organization.edit');const body=await readBody(req),item=await orgWorkforce.proposeAssignment(client,ctx.user,body);await runtime.audit(client,{userId:ctx.user.id,action:'SUBMIT',module:'organization',entityType:'POSITION_ASSIGNMENT',entityId:item.id,newValue:item,reason:body.reason,requestId:ctx.requestId,branchId:ctx.user.branchId});ctx.status=201;return item;}
  m=p.match(/^\/api\/organization\/[0-9a-f-]{36}\/workforce\/assignments\/([0-9a-f-]{36})\/(approve|reject)$/);
  if(method==='POST'&&m){assertPermission(ctx.user,'organization.approve');const body=await readBody(req),result=await orgWorkforce.decideAssignment(client,ctx.user,m[1],m[2],body.reason);await runtime.audit(client,{userId:ctx.user.id,action:m[2].toUpperCase(),module:'organization',entityType:'POSITION_ASSIGNMENT',entityId:m[1],newValue:result,reason:body.reason,requestId:ctx.requestId,branchId:ctx.user.branchId});return result;}
  if(method==='GET'&&p==='/api/organization/delegation-candidates'){assertPermission(ctx.user,'organization.view');return{items:(await client.query(`SELECT id,display_name,role FROM app_users WHERE active AND id<>$1 ORDER BY display_name`,[ctx.user.id])).rows.map(runtime.camel)};}
  if(method==='GET'&&p==='/api/organization/delegations'){assertPermission(ctx.user,'organization.view');return{items:await orgWorkforce.listDelegations(client,ctx.user)};}
  if(method==='POST'&&p==='/api/organization/delegations'){assertPermission(ctx.user,'organization.edit');const body=await readBody(req),item=await orgWorkforce.proposeDelegation(client,ctx.user,body);await runtime.audit(client,{userId:ctx.user.id,action:'SUBMIT',module:'organization',entityType:'AUTHORITY_DELEGATION',entityId:item.id,newValue:{delegateUserId:item.delegateUserId,permissionCode:item.permissionCode,scopeType:item.scopeType,scopeId:item.scopeId},reason:body.reason,requestId:ctx.requestId,branchId:ctx.user.branchId});ctx.status=201;return item;}
  m=p.match(/^\/api\/organization\/delegations\/([0-9a-f-]{36})\/(approve|reject)$/);
  if(method==='POST'&&m){assertPermission(ctx.user,'organization.approve');const body=await readBody(req),result=await orgWorkforce.decideDelegation(client,ctx.user,m[1],m[2],body.reason);await runtime.audit(client,{userId:ctx.user.id,action:m[2].toUpperCase(),module:'organization',entityType:'AUTHORITY_DELEGATION',entityId:m[1],newValue:result,reason:body.reason,requestId:ctx.requestId,branchId:ctx.user.branchId});return result;}

  // Compatibility settings view: organization master tetap menjadi single source of truth.
  // ── Template dokumen resmi (configuration-driven, ber-versi) ──────────────
  if(method==='GET'&&p==='/api/document-templates'){assertPermission(ctx.user,'settings.view');return docTemplates.listTemplates(client);}
  if(method==='POST'&&p==='/api/document-templates'){
    assertPermission(ctx.user,'settings.edit');
    const body=await readBody(req);
    return docTemplates.saveTemplate(client,{documentType:body.documentType,name:body.name,config:body.config,user:ctx.user,requestId:ctx.requestId});
  }
  // Pratinjau PDF template dengan data contoh (inline, tanpa dokumen nyata).
  m=p.match(/^\/api\/document-templates\/([A-Z_]{2,40})\/preview$/);
  if(method==='GET'&&m){
    assertPermission(ctx.user,'settings.view');
    const template=await docTemplates.resolveTemplate(client,m[1]);
    const orgSnapshot=await orgPreviewSnapshot(client,ctx.user);
    const sample=previewSample(m[1],orgSnapshot);
    const assets=await organization.documentAssets(client,null);
    const rendered=docRender.renderDocument({document:sample.document,lines:sample.lines,copy:true,template,assets});
    ctx.download={item:{originalFilename:`pratinjau-${m[1].toLowerCase()}.pdf`,mimeType:'application/pdf',disposition:'inline'},buffer:rendered.buffer};
    return;
  }
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
