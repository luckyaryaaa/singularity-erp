'use strict';
const { readBody } = require('../core/util');
const { assertPermission } = require('../core/permissions');
const operations = require('../infrastructure/database/repositories/operations');
const runtime = require('../infrastructure/database/repositories/runtime');
const masterData = require('../infrastructure/database/repositories/master-data');
const masterGovernance = require('../infrastructure/database/repositories/master-governance');
const masterWizards = require('../infrastructure/database/repositories/master-wizards');
const businessPartners = require('../infrastructure/database/repositories/business-partners');
const changeRequests = require('../infrastructure/database/repositories/change-requests');
const masterModules={customers:'customer',suppliers:'supplier',products:'product',employees:'employee'};
const { NO_MATCH } = require('./shared');

async function dispatch(client, req, url, ctx) {
  const p=url.pathname, method=req.method;
  let m;
  if(method==='GET'&&p==='/api/master-wizards/customer-link/sources')return{items:await masterWizards.listSources(client,ctx.user)};
  if(method==='GET'&&p==='/api/master-wizards/customer-link/candidates'){assertPermission(ctx.user,'customer.view');return{items:await masterWizards.customerCandidates(client,url.searchParams.get('q')||'')};}
  if(method==='GET'&&p==='/api/master-wizards/customer-link/recover')return{draft:await masterWizards.recover(client,ctx.user)};
  if(method==='POST'&&p==='/api/master-wizards/customer-link'){const body=await readBody(req);ctx.status=201;return masterWizards.start(client,ctx.user,body);}
  m=p.match(/^\/api\/master-wizards\/customer-link\/([0-9a-f-]{36})$/);
  if(method==='PATCH'&&m){const body=await readBody(req);return masterWizards.save(client,ctx.user,m[1],body);}
  m=p.match(/^\/api\/master-wizards\/customer-link\/([0-9a-f-]{36})\/abandon$/);
  if(method==='POST'&&m){const body=await readBody(req);return masterWizards.abandon(client,ctx.user,m[1],body.reason,ctx.requestId);}
  m=p.match(/^\/api\/master-wizards\/customer-link\/([0-9a-f-]{36})\/finalize$/);
  if(method==='POST'&&m){const body=await readBody(req);const result=await runtime.withIdempotency(client,{userId:ctx.user.id,operation:`customer-link.finalize:${m[1]}`,key:req.headers['idempotency-key'],body},async()=>({status:201,body:await masterWizards.finalize(client,ctx.user,m[1],body,ctx.requestId)}));ctx.status=result.status;return result.body;}
  if(method==='GET'&&p==='/api/master-governance/currencies'){assertPermission(ctx.user,'dashboard.view');return{items:(await masterGovernance.listCurrencies(client)).map(runtime.camel)};}
  if(method==='GET'&&p==='/api/master-governance/exchange-rates'){assertPermission(ctx.user,'settings.view');return{items:(await masterGovernance.listExchangeRates(client,Object.fromEntries(url.searchParams))).map(runtime.camel)};}
  // P0-G: pembuatan kurs = USULAN (PENDING), bukan aktivasi langsung.
  if(method==='POST'&&p==='/api/master-governance/exchange-rates'){assertPermission(ctx.user,'settings.edit');const body=await readBody(req);const item=runtime.camel(await masterGovernance.createExchangeRate(client,body,ctx.user));await runtime.audit(client,{userId:ctx.user.id,action:'CREATE',module:'settings',entityType:'EXCHANGE_RATE_PROPOSAL',entityId:item.id,newValue:{fromCurrency:item.fromCurrency,toCurrency:item.toCurrency,rate:item.rate,effectiveDate:item.effectiveDate,source:item.source},requestId:ctx.requestId,branchId:ctx.user.branchId});ctx.status=201;return item;}
  if(method==='GET'&&p==='/api/master-governance/exchange-rate-proposals'){assertPermission(ctx.user,'settings.view');return{items:(await masterGovernance.listExchangeRateProposals(client)).map(runtime.camel)};}
  m=p.match(/^\/api\/master-governance\/exchange-rate-proposals\/([0-9a-f-]{36})\/(approve|reject)$/);
  if(method==='POST'&&m){
    assertPermission(ctx.user,'settings.edit');
    const body=await readBody(req);
    const result=await masterGovernance.decideExchangeRate(client,{proposalId:m[1],decision:m[2]==='approve'?'approve':'reject',reason:body.reason,user:ctx.user});
    await runtime.audit(client,{userId:ctx.user.id,action:m[2]==='approve'?'APPROVE':'REJECT',module:'settings',entityType:'EXCHANGE_RATE_PROPOSAL',entityId:m[1],newValue:{status:result.status},reason:body.reason||null,requestId:ctx.requestId,branchId:ctx.user.branchId});
    return result;
  }
  if(method==='GET'&&p==='/api/master-governance/quality'){assertPermission(ctx.user,'settings.view');const result=await masterGovernance.qualityDashboard(client);return{summary:result.summary.map(runtime.camel),issues:result.issues.map(runtime.camel)};}
  if(method==='POST'&&p==='/api/master-governance/quality/scan'){assertPermission(ctx.user,'settings.edit');const result=await masterGovernance.scanQuality(client);await runtime.audit(client,{userId:ctx.user.id,action:'SCAN',module:'settings',entityType:'MASTER_DATA_QUALITY',newValue:{issues:result.issues.length},requestId:ctx.requestId,branchId:ctx.user.branchId});return{summary:result.summary.map(runtime.camel),issues:result.issues.map(runtime.camel)};}
  m=p.match(/^\/api\/master-governance\/products\/([0-9a-f-]{36})\/cost-trace$/);
  if(method==='GET'&&m){assertPermission(ctx.user,'product.view');const result=await masterGovernance.productCostTrace(client,m[1]);return{...result,product:runtime.camel(result.product),bom:runtime.camel(result.bom),lines:result.lines.map(runtime.camel)};}
  m=p.match(/^\/api\/master-governance\/suppliers\/([0-9a-f-]{36})\/performance$/);
  if(method==='GET'&&m){assertPermission(ctx.user,'supplier.view');const result=await masterGovernance.supplierPerformance(client,m[1]);return{supplier:runtime.camel(result.supplier),evaluations:result.evaluations.map(runtime.camel),documents:result.documents.map(runtime.camel)};}
  if(method==='POST'&&m){assertPermission(ctx.user,'supplier.edit');const body=await readBody(req),period=body.period||new Date().toISOString().slice(0,7);const item=runtime.camel(await masterGovernance.calculateSupplierPerformance(client,m[1],period,ctx.user));await runtime.audit(client,{userId:ctx.user.id,action:'CALCULATE',module:'supplier',entityType:'SUPPLIER_PERFORMANCE',entityId:m[1],newValue:{period,score:item.overallScore,risk:item.riskLevel},requestId:ctx.requestId,branchId:ctx.user.branchId});return item;}
  if(method==='POST'&&p==='/api/master-governance/suppliers/score'){assertPermission(ctx.user,'supplier.approve');const body=await readBody(req),period=body.period||new Date().toISOString().slice(0,7),items=await masterGovernance.scoreSuppliers(client,period,ctx.user);return{period,items:items.map(runtime.camel)};}
  // P1-2 — antrean usulan perubahan master. Memutuskan menuntut izin yang
  // lebih tinggi daripada mengedit, dan pengusul tidak boleh memutus sendiri.
  if(method==='GET'&&p==='/api/change-requests'){
    const canReview=Object.values(changeRequests.CONTROLLED_FIELDS).length&&Object.keys(changeRequests.CONTROLLED_FIELDS)
      .some((entity)=>{try{changeRequests.assertCanDecide(ctx.user,entity);return true;}catch{return false;}});
    if(!canReview)assertPermission(ctx.user,'audit.view');
    return changeRequests.list(client,ctx.user,{status:url.searchParams.get('status')||'PENDING',entityType:url.searchParams.get('entityType'),limit:url.searchParams.get('limit')});}
  m=p.match(/^\/api\/change-requests\/([0-9a-f-]{36})\/(approve|reject)$/);
  if(method==='POST'&&m){const body=await readBody(req);
    const result=await changeRequests.decide(client,{requestId:m[1],decision:m[2]==='approve'?'APPROVED':'REJECTED',reason:body.reason,user:ctx.user});
    await runtime.audit(client,{userId:ctx.user.id,action:m[2]==='approve'?'APPROVE':'REJECT',module:'change_request',
      entityType:'CHANGE_REQUEST',entityId:m[1],reason:body.reason,newValue:{entity:result.entityType,applied:result.applied},
      requestId:ctx.requestId,branchId:ctx.user.branchId});
    return result;}

  // Unified Business Partner MDM: canonical party, golden-record queue,
  // staged import, and safe configurable data-quality rules.
  if(method==='GET'&&p==='/api/business-partners'){assertPermission(ctx.user,'business_partner.view');return businessPartners.list(client,Object.fromEntries(url.searchParams));}
  if(method==='POST'&&p==='/api/business-partners'){assertPermission(ctx.user,'business_partner.create');const body=await readBody(req),item=await businessPartners.create(client,body,ctx.user);await runtime.audit(client,{userId:ctx.user.id,action:'CREATE',module:'business_partner',entityType:'BUSINESS_PARTNER',entityId:item.id,newValue:{partyNumber:item.partyNumber,partyType:item.partyType},requestId:ctx.requestId,branchId:ctx.user.branchId});ctx.status=201;return item;}
  if(method==='GET'&&p==='/api/business-partners/duplicates'){assertPermission(ctx.user,'business_partner.view');return businessPartners.listDuplicates(client,Object.fromEntries(url.searchParams));}
  if(method==='POST'&&p==='/api/business-partners/duplicates/detect'){assertPermission(ctx.user,'business_partner.edit');const result=await businessPartners.detectDuplicates(client,ctx.user);await runtime.audit(client,{userId:ctx.user.id,action:'SCAN',module:'business_partner',entityType:'DUPLICATE_CANDIDATE',newValue:result,requestId:ctx.requestId,branchId:ctx.user.branchId});return result;}
  m=p.match(/^\/api\/business-partners\/duplicates\/([0-9a-f-]{36})\/resolve$/);
  if(method==='POST'&&m){assertPermission(ctx.user,'business_partner.approve');const body=await readBody(req),result=await businessPartners.resolveDuplicate(client,{candidateId:m[1],decision:body.decision,survivorPartnerId:body.survivorPartnerId,reason:body.reason,user:ctx.user});await runtime.audit(client,{userId:ctx.user.id,action:result.status,module:'business_partner',entityType:'DUPLICATE_CANDIDATE',entityId:m[1],newValue:result,reason:body.reason,requestId:ctx.requestId,branchId:ctx.user.branchId});return result;}
  if(method==='POST'&&p==='/api/business-partners/imports'){assertPermission(ctx.user,'business_partner.import');const body=await readBody(req),item=await businessPartners.stageImport(client,body,ctx.user);await runtime.audit(client,{userId:ctx.user.id,action:'STAGE',module:'business_partner',entityType:'MASTER_IMPORT_BATCH',entityId:item.id,newValue:{entityType:item.entityType,rowCount:item.rowCount,replayed:!!item.replayed},requestId:ctx.requestId,branchId:ctx.user.branchId});ctx.status=item.replayed?200:201;return item;}
  m=p.match(/^\/api\/business-partners\/imports\/([0-9a-f-]{36})$/);
  if(method==='GET'&&m){assertPermission(ctx.user,'business_partner.view');return businessPartners.importDetail(client,m[1]);}
  m=p.match(/^\/api\/business-partners\/imports\/([0-9a-f-]{36})\/validate$/);
  if(method==='POST'&&m){assertPermission(ctx.user,'business_partner.import');const result=await businessPartners.validateImport(client,m[1]);await runtime.audit(client,{userId:ctx.user.id,action:'VALIDATE',module:'business_partner',entityType:'MASTER_IMPORT_BATCH',entityId:m[1],newValue:result,requestId:ctx.requestId,branchId:ctx.user.branchId});return result;}
  m=p.match(/^\/api\/business-partners\/imports\/([0-9a-f-]{36})\/promote$/);
  if(method==='POST'&&m){assertPermission(ctx.user,'business_partner.approve');const result=await businessPartners.promoteImport(client,m[1],ctx.user);await runtime.audit(client,{userId:ctx.user.id,action:'PROMOTE',module:'business_partner',entityType:'MASTER_IMPORT_BATCH',entityId:m[1],newValue:result,requestId:ctx.requestId,branchId:ctx.user.branchId});return result;}
  if(method==='GET'&&p==='/api/business-partners/quality-rules'){assertPermission(ctx.user,'business_partner.view');return{items:await businessPartners.listRules(client)};}
  if(method==='POST'&&p==='/api/business-partners/quality-rules'){assertPermission(ctx.user,'business_partner.edit');const body=await readBody(req),item=await businessPartners.createRule(client,body,ctx.user);await runtime.audit(client,{userId:ctx.user.id,action:'CREATE',module:'business_partner',entityType:'DATA_QUALITY_RULE',entityId:item.id,newValue:{code:item.code,targetType:item.targetType,ruleType:item.ruleType},requestId:ctx.requestId,branchId:ctx.user.branchId});ctx.status=201;return item;}
  if(method==='POST'&&p==='/api/business-partners/quality-rules/scan'){assertPermission(ctx.user,'business_partner.edit');const result=await businessPartners.scanRules(client,ctx.user);await runtime.audit(client,{userId:ctx.user.id,action:'SCAN',module:'business_partner',entityType:'DATA_QUALITY_RULE',newValue:result,requestId:ctx.requestId,branchId:ctx.user.branchId});return result;}
  m=p.match(/^\/api\/business-partners\/([0-9a-f-]{36})$/);
  if(method==='GET'&&m){assertPermission(ctx.user,'business_partner.view');return businessPartners.detail(client,m[1]);}

  m=p.match(/^\/api\/(customers|suppliers|products|employees)$/);
  if(method==='GET'&&m){assertPermission(ctx.user,`${masterModules[m[1]]}.view`);return operations.listMaster(client,m[1],Object.fromEntries(url.searchParams),ctx.user);}
  if(method==='POST'&&m){const name=m[1],module=masterModules[name],body=await readBody(req);assertPermission(ctx.user,`${module}.create`);const item=await operations.createMaster(client,name,body,ctx.user);await runtime.audit(client,{userId:ctx.user.id,action:'CREATE',module,entityType:module.toUpperCase(),entityId:item.id,newValue:item,requestId:ctx.requestId,branchId:ctx.user.branchId});ctx.status=201;return item;}
  m=p.match(/^\/api\/(customers|suppliers|products|employees)\/([^/]+)$/);
  if(method==='PATCH'&&m){const name=m[1],module=masterModules[name],body=await readBody(req);assertPermission(ctx.user,`${module}.edit`);const item=await operations.updateMaster(client,name,m[2],body,ctx.user,ctx.requestId);await runtime.audit(client,{userId:ctx.user.id,action:'UPDATE',module,entityType:module.toUpperCase(),entityId:item.id,newValue:item,requestId:ctx.requestId,branchId:ctx.user.branchId});return item;}

  // ── Master data enterprise (R014/R015): overview, sub-resource, lifecycle ──
  m=p.match(/^\/api\/masters\/(employees|customers|suppliers|products)\/([0-9a-f-]{36})$/);
  if(method==='GET'&&m)return masterData.overview(client,m[1],m[2],ctx.user);
  m=p.match(/^\/api\/masters\/(employees|customers|suppliers|products)\/([0-9a-f-]{36})\/lifecycle$/);
  if(method==='POST'&&m){const body=await readBody(req);return masterData.lifecycle(client,m[1],m[2],body.action,body.reason,ctx.user,ctx.requestId);}
  m=p.match(/^\/api\/masters\/(customers|suppliers|products|employees)\/([0-9a-f-]{36})\/profile-photo$/);
  if(method==='POST'&&m){const body=await readBody(req);return masterData.setProfilePhoto(client,m[1],m[2],body.fileId,ctx.user,ctx.requestId);}
  m=p.match(/^\/api\/masters\/suppliers\/([0-9a-f-]{36})\/bank-accounts\/([0-9a-f-]{36})\/approve$/);
  if(method==='POST'&&m)return masterData.approveSupplierBank(client,m[1],m[2],ctx.user,ctx.requestId);
  m=p.match(/^\/api\/masters\/suppliers\/([0-9a-f-]{36})\/documents\/([0-9a-f-]{36})\/(verify|reject)$/);
  if(method==='POST'&&m)return masterData.decideSupplierDocument(client,m[1],m[2],m[3],ctx.user,ctx.requestId);
  m=p.match(/^\/api\/masters\/employees\/([0-9a-f-]{36})\/audit$/);
  if(method==='GET'&&m)return{items:await masterData.employeeAudit(client,m[1],ctx.user)};
  m=p.match(/^\/api\/masters\/employees\/([0-9a-f-]{36})\/timeline$/);
  if(method==='GET'&&m)return{items:await masterData.employeeTimeline(client,m[1],ctx.user)};
  m=p.match(/^\/api\/masters\/employees\/([0-9a-f-]{36})\/compensation-analysis$/);
  if(method==='GET'&&m)return masterData.compensationAnalysis(client,m[1],ctx.user);
  m=p.match(/^\/api\/masters\/employees\/([0-9a-f-]{36})\/talent$/);
  if(method==='GET'&&m)return masterData.employeeTalent(client,m[1],ctx.user);
  if(method==='POST'&&m){const body=await readBody(req);return masterData.updateTalent(client,m[1],body,ctx.user,ctx.requestId);}
  m=p.match(/^\/api\/masters\/employees\/([0-9a-f-]{36})\/pph21$/);
  if(method==='POST'&&m){const body=await readBody(req);return masterData.pph21Annual(client,m[1],body,ctx.user);}
  m=p.match(/^\/api\/masters\/employees\/([0-9a-f-]{36})\/bpjs-config$/);
  if(method==='POST'&&m){const body=await readBody(req);return masterData.saveBpjsConfig(client,m[1],body,ctx.user,ctx.requestId);}
  m=p.match(/^\/api\/masters\/employees\/([0-9a-f-]{36})\/family$/);
  if(method==='GET'&&m)return masterData.listFamily(client,m[1],ctx.user);
  if(method==='POST'&&m){const body=await readBody(req);ctx.status=body.id?200:201;return masterData.saveFamily(client,m[1],body,ctx.user,ctx.requestId);}
  m=p.match(/^\/api\/masters\/employees\/([0-9a-f-]{36})\/family\/([0-9a-f-]{36})$/);
  if(method==='DELETE'&&m)return masterData.deleteFamily(client,m[1],m[2],ctx.user,ctx.requestId);
  m=p.match(/^\/api\/masters\/employees\/([0-9a-f-]{36})\/tax-auto$/);
  if(method==='POST'&&m){const body=await readBody(req);return masterData.autoTaxProfile(client,m[1],body,ctx.user,ctx.requestId);}
  m=p.match(/^\/api\/masters\/employees\/([0-9a-f-]{36})\/(bank-accounts|compensation)\/([0-9a-f-]{36})\/(approve|reject)$/);
  if(method==='POST'&&m){const body=await readBody(req);return masterData.decideEmployeeSensitive(client,{employeeId:m[1],kind:m[2],rowId:m[3],decision:m[4],reason:body.reason,user:ctx.user,requestId:ctx.requestId});}
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
  return NO_MATCH;
}

module.exports={dispatch};
