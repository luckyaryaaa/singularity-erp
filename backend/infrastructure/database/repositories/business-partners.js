'use strict';

const { randomUUID, createHash } = require('node:crypto');
const { AppError } = require('../../../core/errors');
const runtime = require('./runtime');

const TYPES = new Set(['ORGANIZATION','PERSON']);
const IMPORT_TYPES = new Set(['BUSINESS_PARTNER','CUSTOMER','SUPPLIER']);
const RULE_TARGETS = Object.freeze({
  BUSINESS_PARTNER:{table:'business_partners',master:'business_partners',predicate:`status NOT IN ('MERGED','ARCHIVED')`},
  CUSTOMER:{table:'customers',master:'customers',predicate:'active'}, SUPPLIER:{table:'suppliers',master:'suppliers',predicate:'active'},
  PRODUCT:{table:'products',master:'products',predicate:'active'}, EMPLOYEE:{table:'employees',master:'employees',predicate:'active'}
});
const RULE_TYPES = new Set(['REQUIRED','REGEX','ENUM','MIN_LENGTH']);
const SAFE_FIELDS = new Set(['party_type','display_name','legal_name','tax_id','name','category','code','npwp','uom','department','job_title']);
const normalizeName = value => String(value||'').normalize('NFKD').toUpperCase().replace(/[^A-Z0-9]/g,'');
const normalizeTax = value => String(value||'').replace(/[^0-9]/g,'');
const clean = value => String(value||'').trim();
const pageArgs = query => ({limit:Math.min(Math.max(Number(query?.limit)||25,1),100),page:Math.max(Number(query?.page)||1,1)});

async function list(client, query={}) {
  const {limit,page}=pageArgs(query),params=[];let where=`p.status<>'MERGED'`;
  if(query.q){params.push(`%${clean(query.q).slice(0,120)}%`);where+=` AND (p.party_number ILIKE $${params.length} OR p.display_name ILIKE $${params.length} OR p.legal_name ILIKE $${params.length} OR p.tax_id ILIKE $${params.length})`;}
  if(query.status){params.push(String(query.status).toUpperCase());where+=` AND p.status=$${params.length}`;}
  if(query.role){params.push(String(query.role).toUpperCase());where+=` AND EXISTS(SELECT 1 FROM business_partner_roles r WHERE r.business_partner_id=p.id AND r.role_type=$${params.length} AND r.status='ACTIVE')`;}
  const total=Number((await client.query(`SELECT count(*) n FROM business_partners p WHERE ${where}`,params)).rows[0].n);
  params.push(limit,(page-1)*limit);
  const items=(await client.query(`SELECT p.*,COALESCE(jsonb_agg(DISTINCT r.role_type) FILTER(WHERE r.role_type IS NOT NULL),'[]') roles
    FROM business_partners p LEFT JOIN business_partner_roles r ON r.business_partner_id=p.id
    WHERE ${where} GROUP BY p.id ORDER BY p.display_name,p.party_number LIMIT $${params.length-1} OFFSET $${params.length}`,params)).rows.map(runtime.camel);
  return {items,page,limit,total,totalPages:Math.max(Math.ceil(total/limit),1)};
}

async function detail(client,id) {
  const party=(await client.query(`SELECT p.*,c.party_number merged_into_number FROM business_partners p LEFT JOIN business_partners c ON c.id=p.merged_into_id WHERE p.id=$1`,[id])).rows[0];
  if(!party)throw new AppError('RESOURCE_NOT_FOUND','Business Partner tidak ditemukan.');
  const [roles,identifiers,sites,contacts,lineage]=await Promise.all([
    client.query(`SELECT r.*,c.code customer_code,c.name customer_name,s.code supplier_code,s.name supplier_name FROM business_partner_roles r LEFT JOIN customers c ON c.id=r.customer_id LEFT JOIN suppliers s ON s.id=r.supplier_id WHERE r.business_partner_id=$1 ORDER BY r.role_type,r.created_at`,[id]),
    client.query(`SELECT * FROM business_partner_identifiers WHERE business_partner_id=$1 AND active ORDER BY identifier_type`,[id]),
    client.query(`SELECT * FROM business_partner_sites WHERE business_partner_id=$1 AND active ORDER BY is_primary DESC,site_type`,[id]),
    client.query(`SELECT * FROM business_partner_contacts WHERE business_partner_id=$1 AND active ORDER BY is_primary DESC,contact_name`,[id]),
    client.query(`SELECT l.*,p.party_number merged_party_number,p.display_name merged_party_name FROM business_partner_merge_lineage l JOIN business_partners p ON p.id=l.merged_partner_id WHERE l.survivor_partner_id=$1 OR l.merged_partner_id=$1 ORDER BY l.merged_at DESC`,[id])
  ]);
  return {party:runtime.camel(party),roles:roles.rows.map(runtime.camel),identifiers:identifiers.rows.map(runtime.camel),sites:sites.rows.map(runtime.camel),contacts:contacts.rows.map(runtime.camel),lineage:lineage.rows.map(runtime.camel)};
}

async function create(client,body,user) {
  const type=String(body.partyType||'ORGANIZATION').toUpperCase(),display=clean(body.displayName||body.name),legal=clean(body.legalName)||display,tax=clean(body.taxId||body.npwp)||null;
  if(!TYPES.has(type)||!display)throw new AppError('VALIDATION_ERROR','Tipe dan nama Business Partner wajib valid.');
  const taxNorm=normalizeTax(tax);
  if(taxNorm){const duplicate=(await client.query(`SELECT p.id,p.party_number FROM business_partner_identifiers i JOIN business_partners p ON p.id=i.business_partner_id WHERE i.identifier_type='NPWP' AND i.normalized_value=$1 AND i.active LIMIT 1`,[taxNorm])).rows[0];if(duplicate)throw new AppError('VALIDATION_ERROR',`NPWP sudah dimiliki ${duplicate.party_number}; gunakan duplicate workbench.`);}
  const id=randomUUID(),number=clean(body.partyNumber).toUpperCase()||`BP-${id.replace(/-/g,'').slice(0,16).toUpperCase()}`;
  const row=(await client.query(`INSERT INTO business_partners(id,party_number,party_type,display_name,legal_name,normalized_name,tax_id,status,owner_branch_id,created_by,updated_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) RETURNING *`,[id,number,type,display,legal,normalizeName(legal),tax,String(body.status||'ACTIVE').toUpperCase(),user.branchId,user.id])).rows[0];
  if(taxNorm)await client.query(`INSERT INTO business_partner_identifiers(business_partner_id,identifier_type,identifier_value,normalized_value,verified,created_by) VALUES($1,'NPWP',$2,$3,$4,$5)`,[id,tax,taxNorm,!!body.taxVerified,user.id]);
  await refreshQuality(client,id,user);
  return runtime.camel((await client.query('SELECT * FROM business_partners WHERE id=$1',[row.id])).rows[0]);
}

function nameSimilarity(a,b){
  const left=new Set(clean(a).toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean)),right=new Set(clean(b).toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean));
  if(!left.size||!right.size)return 0;let common=0;for(const token of left)if(right.has(token))common++;
  return common/(left.size+right.size-common);
}

async function detectDuplicates(client,user) {
  const rows=(await client.query(`SELECT p.id,p.display_name,p.legal_name,p.normalized_name,p.tax_id,p.owner_branch_id,
    array_remove(array_agg(DISTINCT lower(c.email)),NULL) emails,array_remove(array_agg(DISTINCT regexp_replace(COALESCE(c.phone,c.whatsapp,''),'[^0-9]','','g')),NULL) phones
    FROM business_partners p LEFT JOIN business_partner_contacts c ON c.business_partner_id=p.id AND c.active
    WHERE p.status NOT IN('MERGED','ARCHIVED') GROUP BY p.id ORDER BY p.id LIMIT 1000`)).rows;
  let inserted=0,examined=0;
  for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
    const a=rows[i],b=rows[j];if(a.owner_branch_id!==b.owner_branch_id)continue;examined++;
    const signals=[];let score=0;
    const taxA=normalizeTax(a.tax_id),taxB=normalizeTax(b.tax_id);
    if(taxA&&taxA===taxB){signals.push({type:'EXACT_TAX_ID',weight:100});score=100;}
    if(a.normalized_name&&a.normalized_name===b.normalized_name){signals.push({type:'EXACT_LEGAL_NAME',weight:92});score=Math.max(score,92);}
    else {const similarity=nameSimilarity(a.legal_name||a.display_name,b.legal_name||b.display_name);if(similarity>=0.7){const weight=Math.round(similarity*85);signals.push({type:'TOKEN_NAME',weight,similarity});score=Math.max(score,weight);}}
    if((a.emails||[]).some(x=>(b.emails||[]).includes(x))){signals.push({type:'EXACT_EMAIL',weight:88});score=Math.max(score,88);}
    if((a.phones||[]).some(x=>x&&(b.phones||[]).includes(x))){signals.push({type:'EXACT_PHONE',weight:82});score=Math.max(score,82);}
    if(score<70)continue;
    const [left,right]=a.id<b.id?[a,b]:[b,a];
    const result=await client.query(`INSERT INTO business_partner_duplicate_candidates(left_partner_id,right_partner_id,match_score,match_signals,owner_branch_id,detected_by)
      VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(left_partner_id,right_partner_id) DO UPDATE SET match_score=excluded.match_score,match_signals=excluded.match_signals,detected_at=now(),detected_by=excluded.detected_by WHERE business_partner_duplicate_candidates.status='OPEN' RETURNING id`,[left.id,right.id,score,JSON.stringify(signals),left.owner_branch_id,user.id]);
    inserted+=result.rowCount;
  }
  return {examinedPairs:examined,candidatesUpserted:inserted};
}

async function listDuplicates(client,query={}) {
  const {limit,page}=pageArgs(query),status=String(query.status||'OPEN').toUpperCase(),params=[status],where='d.status=$1';
  const total=Number((await client.query(`SELECT count(*) n FROM business_partner_duplicate_candidates d WHERE ${where}`,params)).rows[0].n);
  params.push(limit,(page-1)*limit);
  const items=(await client.query(`SELECT d.*,l.party_number left_number,l.display_name left_name,l.tax_id left_tax_id,r.party_number right_number,r.display_name right_name,r.tax_id right_tax_id
    FROM business_partner_duplicate_candidates d JOIN business_partners l ON l.id=d.left_partner_id JOIN business_partners r ON r.id=d.right_partner_id
    WHERE ${where} ORDER BY d.match_score DESC,d.detected_at DESC LIMIT $2 OFFSET $3`,params)).rows.map(runtime.camel);
  return {items,page,limit,total,totalPages:Math.max(Math.ceil(total/limit),1)};
}

async function resolveDuplicate(client,{candidateId,decision,survivorPartnerId,reason,user}) {
  const action=String(decision||'').toUpperCase(),note=clean(reason);
  if(!['MERGE','IGNORE'].includes(action)||!note)throw new AppError('VALIDATION_ERROR','Keputusan dan alasan wajib diisi.');
  const candidate=(await client.query(`SELECT * FROM business_partner_duplicate_candidates WHERE id=$1 FOR UPDATE`,[candidateId])).rows[0];
  if(!candidate)throw new AppError('RESOURCE_NOT_FOUND','Kandidat duplikat tidak ditemukan.');
  if(candidate.status!=='OPEN')throw new AppError('STATUS_INVALID','Kandidat duplikat sudah diputuskan.');
  if(candidate.detected_by===user.id)throw new AppError('SOD_CONFLICT','Petugas pemindai duplikat tidak boleh memutus kandidat yang sama.');
  if(action==='IGNORE'){
    await client.query(`UPDATE business_partner_duplicate_candidates SET status='IGNORED',decided_at=now(),decided_by=$2,decision_reason=$3 WHERE id=$1`,[candidateId,user.id,note]);
    return {status:'IGNORED',candidateId};
  }
  if(![candidate.left_partner_id,candidate.right_partner_id].includes(survivorPartnerId))throw new AppError('VALIDATION_ERROR','Survivor harus salah satu kandidat.');
  const mergedId=survivorPartnerId===candidate.left_partner_id?candidate.right_partner_id:candidate.left_partner_id;
  const locked=(await client.query(`SELECT * FROM business_partners WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE`,[[survivorPartnerId,mergedId]])).rows;
  const survivor=locked.find(x=>x.id===survivorPartnerId),merged=locked.find(x=>x.id===mergedId);
  if(!survivor||!merged||survivor.status==='MERGED'||merged.status==='MERGED')throw new AppError('STATUS_INVALID','Business Partner sudah pernah digabung.');
  const fields=['display_name','legal_name','tax_id','party_type'],decisions={};
  const values={};for(const field of fields){const winner=survivor[field]||merged[field];values[field]=winner;decisions[field]={value:winner,source:survivor[field]?'SURVIVOR':'MERGED_RECORD'};}
  await client.query(`UPDATE business_partners SET display_name=$2,legal_name=$3,tax_id=$4,party_type=$5,normalized_name=$6,mdm_version=mdm_version+1,updated_at=now(),updated_by=$7 WHERE id=$1`,[survivor.id,values.display_name,values.legal_name,values.tax_id,values.party_type,normalizeName(values.legal_name||values.display_name),user.id]);
  await client.query(`UPDATE business_partners SET status='MERGED',golden_record=false,merged_into_id=$2,mdm_version=mdm_version+1,updated_at=now(),updated_by=$3 WHERE id=$1`,[merged.id,survivor.id,user.id]);
  await client.query(`INSERT INTO business_partner_merge_lineage(survivor_partner_id,merged_partner_id,duplicate_candidate_id,field_decisions,reason,merged_by) VALUES($1,$2,$3,$4,$5,$6)`,[survivor.id,merged.id,candidate.id,JSON.stringify(decisions),note,user.id]);
  await client.query(`UPDATE business_partner_duplicate_candidates SET status='MERGED',survivor_partner_id=$2,decided_at=now(),decided_by=$3,decision_reason=$4 WHERE id=$1`,[candidate.id,survivor.id,user.id,note]);
  await client.query(`UPDATE business_partner_duplicate_candidates SET status='IGNORED',decided_at=now(),decided_by=$2,decision_reason='Auto-closed: party merged into '||$3 WHERE id<>$1 AND status='OPEN' AND (left_partner_id=$4 OR right_partner_id=$4)`,[candidate.id,user.id,survivor.party_number,merged.id]);
  await refreshQuality(client,survivor.id,user);
  return {status:'MERGED',candidateId,survivorPartnerId:survivor.id,mergedPartnerId:merged.id,fieldDecisions:decisions};
}

function normalizeImportRow(type,row){
  if(type==='BUSINESS_PARTNER')return {partyType:String(row.partyType||row.party_type||'ORGANIZATION').toUpperCase(),displayName:clean(row.displayName||row.display_name||row.name),legalName:clean(row.legalName||row.legal_name),taxId:clean(row.taxId||row.tax_id||row.npwp)};
  if(type==='CUSTOMER')return {code:clean(row.code).toUpperCase(),name:clean(row.name),legalName:clean(row.legalName||row.legal_name),npwp:clean(row.npwp),customerType:String(row.customerType||row.customer_type||'COMPANY').toUpperCase(),paymentTermDays:Number(row.paymentTermDays??row.payment_term_days??30),currency:String(row.currency||'IDR').toUpperCase(),active:row.active!==false};
  return {code:clean(row.code).toUpperCase(),name:clean(row.name),legalName:clean(row.legalName||row.legal_name),npwp:clean(row.npwp),supplierType:String(row.supplierType||row.supplier_type||'COMPANY').toUpperCase(),category:clean(row.category),active:row.active!==false};
}

function importErrors(type,row){const errors=[];
  if(!row.name&&!row.displayName)errors.push({field:'name',code:'REQUIRED'});
  if(type!=='BUSINESS_PARTNER'&&!row.code)errors.push({field:'code',code:'REQUIRED'});
  if(type==='BUSINESS_PARTNER'&&!TYPES.has(row.partyType))errors.push({field:'partyType',code:'INVALID_ENUM'});
  if(type==='CUSTOMER'&&(!Number.isFinite(row.paymentTermDays)||row.paymentTermDays<0))errors.push({field:'paymentTermDays',code:'INVALID_NUMBER'});
  if(type==='SUPPLIER'&&!row.category)errors.push({field:'category',code:'REQUIRED'});
  return errors;}

async function stageImport(client,{entityType,sourceName,rows},user) {
  const type=String(entityType||'').toUpperCase();if(!IMPORT_TYPES.has(type))throw new AppError('VALIDATION_ERROR','Jenis import tidak didukung.');
  if(!Array.isArray(rows)||!rows.length||rows.length>1000)throw new AppError('VALIDATION_ERROR','Import harus berisi 1 sampai 1000 baris.');
  const checksum=createHash('sha256').update(JSON.stringify(rows)).digest('hex');
  const existing=(await client.query(`SELECT * FROM master_import_batches WHERE owner_branch_id=$1 AND entity_type=$2 AND source_checksum=$3`,[user.branchId,type,checksum])).rows[0];
  if(existing)return {...runtime.camel(existing),replayed:true};
  const batch=(await client.query(`INSERT INTO master_import_batches(entity_type,source_name,source_checksum,owner_branch_id,row_count,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[type,clean(sourceName)||'API import',checksum,user.branchId,rows.length,user.id])).rows[0];
  for(let i=0;i<rows.length;i++)await client.query(`INSERT INTO master_import_rows(batch_id,row_number,raw_payload,owner_branch_id) VALUES($1,$2,$3,$4)`,[batch.id,i+1,JSON.stringify(rows[i]),user.branchId]);
  return runtime.camel(batch);
}

async function validateImport(client,batchId) {
  const batch=(await client.query(`SELECT * FROM master_import_batches WHERE id=$1 FOR UPDATE`,[batchId])).rows[0];if(!batch)throw new AppError('RESOURCE_NOT_FOUND','Batch import tidak ditemukan.');
  if(['PROMOTED','PARTIAL'].includes(batch.status))throw new AppError('STATUS_INVALID','Batch sudah dipromosikan.');
  const rows=(await client.query(`SELECT * FROM master_import_rows WHERE batch_id=$1 ORDER BY row_number FOR UPDATE`,[batchId])).rows;let valid=0,invalid=0;
  for(const row of rows){const normalized=normalizeImportRow(batch.entity_type,row.raw_payload),errors=importErrors(batch.entity_type,normalized);
    if(normalized.code){const table=batch.entity_type==='CUSTOMER'?'customers':'suppliers';const exists=(await client.query(`SELECT 1 FROM ${table} WHERE upper(code)=$1 LIMIT 1`,[normalized.code])).rowCount;if(exists)errors.push({field:'code',code:'DUPLICATE'});}
    const taxNorm=normalizeTax(normalized.taxId||normalized.npwp);if(taxNorm){const existing=(await client.query(`SELECT 1 FROM business_partner_identifiers WHERE identifier_type='NPWP' AND normalized_value=$1 AND active LIMIT 1`,[taxNorm])).rowCount;if(existing)errors.push({field:'taxId',code:'POSSIBLE_DUPLICATE',severity:'WARNING'});}
    const hard=errors.some(x=>x.severity!=='WARNING');const status=hard?'INVALID':'VALID';if(hard)invalid++;else valid++;
    await client.query(`UPDATE master_import_rows SET normalized_payload=$2,status=$3,validation_errors=$4,updated_at=now() WHERE id=$1`,[row.id,JSON.stringify(normalized),status,JSON.stringify(errors)]);
  }
  const status=invalid?'VALIDATED_WITH_ERRORS':'VALIDATED';
  await client.query(`UPDATE master_import_batches SET status=$2,valid_count=$3,invalid_count=$4,validated_at=now() WHERE id=$1`,[batchId,status,valid,invalid]);
  return {batchId,status,validCount:valid,invalidCount:invalid};
}

async function promoteImport(client,batchId,user) {
  const batch=(await client.query(`SELECT * FROM master_import_batches WHERE id=$1 FOR UPDATE`,[batchId])).rows[0];if(!batch)throw new AppError('RESOURCE_NOT_FOUND','Batch import tidak ditemukan.');
  if(['PROMOTED','PARTIAL'].includes(batch.status))return {batchId,status:batch.status,promotedCount:batch.promoted_count,replayed:true};
  if(!['VALIDATED','VALIDATED_WITH_ERRORS'].includes(batch.status))throw new AppError('STATUS_INVALID','Batch wajib divalidasi sebelum promosi.');
  await client.query(`UPDATE master_import_batches SET status='PROMOTING' WHERE id=$1`,[batchId]);
  const rows=(await client.query(`SELECT * FROM master_import_rows WHERE batch_id=$1 AND status='VALID' ORDER BY row_number FOR UPDATE`,[batchId])).rows;let promoted=0,failed=0;
  for(const row of rows){try{let item;if(batch.entity_type==='BUSINESS_PARTNER')item=await create(client,row.normalized_payload,user);else item=await require('./operations').createMaster(client,batch.entity_type==='CUSTOMER'?'customers':'suppliers',row.normalized_payload,user);
      await client.query(`UPDATE master_import_rows SET status='PROMOTED',promoted_entity_id=$2,updated_at=now() WHERE id=$1`,[row.id,item.id]);promoted++;
    }catch(error){await client.query(`UPDATE master_import_rows SET status='FAILED',validation_errors=validation_errors||$2::jsonb,updated_at=now() WHERE id=$1`,[row.id,JSON.stringify([{code:error.code||'PROMOTION_FAILED',message:String(error.message).slice(0,300)}])]);failed++;}}
  const finalStatus=failed||batch.invalid_count?'PARTIAL':'PROMOTED';await client.query(`UPDATE master_import_batches SET status=$2,promoted_count=$3,promoted_at=now() WHERE id=$1`,[batchId,finalStatus,promoted]);
  return {batchId,status:finalStatus,promotedCount:promoted,failedCount:failed,invalidCount:batch.invalid_count};
}

async function importDetail(client,batchId){const batch=(await client.query('SELECT * FROM master_import_batches WHERE id=$1',[batchId])).rows[0];if(!batch)throw new AppError('RESOURCE_NOT_FOUND');const rows=(await client.query('SELECT * FROM master_import_rows WHERE batch_id=$1 ORDER BY row_number',[batchId])).rows;return{batch:runtime.camel(batch),rows:rows.map(runtime.camel)};}

async function listRules(client){return (await client.query(`SELECT * FROM master_data_quality_rules WHERE active AND effective_from<=current_date AND (effective_to IS NULL OR effective_to>=current_date) ORDER BY target_type,severity,code`)).rows.map(runtime.camel);}
async function createRule(client,body,user){const target=String(body.targetType||'').toUpperCase(),type=String(body.ruleType||'').toUpperCase(),field=String(body.fieldName||'').replace(/[A-Z]/g,c=>`_${c.toLowerCase()}`);
  if(!RULE_TARGETS[target]||!RULE_TYPES.has(type)||!SAFE_FIELDS.has(field)||!clean(body.code)||!clean(body.description))throw new AppError('VALIDATION_ERROR','Konfigurasi data-quality rule tidak aman atau tidak lengkap.');
  if(type==='REGEX'){try{new RegExp(String(body.ruleConfig?.pattern||''));}catch{throw new AppError('VALIDATION_ERROR','Pola regex tidak valid.');}}
  const row=(await client.query(`INSERT INTO master_data_quality_rules(code,target_type,field_name,rule_type,rule_config,severity,description,owner_branch_id,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[clean(body.code).toUpperCase(),target,field,type,JSON.stringify(body.ruleConfig||{}),String(body.severity||'WARNING').toUpperCase(),clean(body.description),user.branchId,user.id])).rows[0];return runtime.camel(row);}

function ruleViolation(rule,value){const cfg=rule.rule_config||{};if(rule.rule_type==='REQUIRED')return value===null||value===undefined||clean(value)==='';if(rule.rule_type==='REGEX')return value!=null&&!new RegExp(String(cfg.pattern||'')).test(String(value));if(rule.rule_type==='ENUM')return value!=null&&!Array.isArray(cfg.values)||value!=null&&!cfg.values.includes(value);if(rule.rule_type==='MIN_LENGTH')return clean(value).length<Number(cfg.length||0);return false;}
async function scanRules(client,user){const rules=(await client.query(`SELECT * FROM master_data_quality_rules WHERE active AND effective_from<=current_date AND (effective_to IS NULL OR effective_to>=current_date)`)).rows;let checked=0,findings=0;
  for(const rule of rules){const target=RULE_TARGETS[rule.target_type];if(!target||!SAFE_FIELDS.has(rule.field_name))continue;const rows=(await client.query(`SELECT id,${rule.field_name} value FROM ${target.table} WHERE ${target.predicate} LIMIT 2000`)).rows;
    for(const row of rows){checked++;const violates=ruleViolation(rule,row.value);if(violates){findings++;await client.query(`INSERT INTO master_data_quality_issues(id,master_type,master_id,rule_code,severity,detail) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(master_type,master_id,rule_code) WHERE status='OPEN' DO UPDATE SET severity=excluded.severity,detail=excluded.detail,detected_at=now()`,[randomUUID(),target.master,row.id,rule.code,rule.severity,rule.description]);}else await client.query(`UPDATE master_data_quality_issues SET status='RESOLVED',resolved_at=now(),resolved_by=$4,resolution_note='Resolved by configurable rule scan' WHERE master_type=$1 AND master_id=$2 AND rule_code=$3 AND status='OPEN'`,[target.master,row.id,rule.code,user.id]);}}
  return{rules:rules.length,recordsChecked:checked,findings};}

async function refreshQuality(client,id,user){const party=(await client.query('SELECT * FROM business_partners WHERE id=$1',[id])).rows[0];if(!party)return null;const flags=[];if(!clean(party.legal_name))flags.push({code:'BP_LEGAL_NAME_REQUIRED',severity:'CRITICAL',detail:'Nama legal Business Partner wajib diisi'});if(!normalizeTax(party.tax_id))flags.push({code:'BP_TAX_ID_REQUIRED',severity:'WARNING',detail:'NPWP/NIK Business Partner belum tersedia'});const score=Math.max(0,100-flags.reduce((sum,x)=>sum+(x.severity==='CRITICAL'?25:10),0));await client.query('UPDATE business_partners SET data_quality_score=$2,quality_flags=$3,updated_at=now() WHERE id=$1',[id,score,JSON.stringify(flags)]);for(const flag of flags)await client.query(`INSERT INTO master_data_quality_issues(id,master_type,master_id,rule_code,severity,detail) VALUES($1,'business_partners',$2,$3,$4,$5) ON CONFLICT(master_type,master_id,rule_code) WHERE status='OPEN' DO UPDATE SET severity=excluded.severity,detail=excluded.detail,detected_at=now()`,[randomUUID(),id,flag.code,flag.severity,flag.detail]);await client.query(`UPDATE master_data_quality_issues SET status='RESOLVED',resolved_at=now(),resolved_by=$3,resolution_note='Resolved by Business Partner quality refresh' WHERE master_type='business_partners' AND master_id=$1 AND status='OPEN' AND NOT(rule_code=ANY($2::text[]))`,[id,flags.map(x=>x.code),user?.id||null]);return{score,flags};}

module.exports={list,detail,create,detectDuplicates,listDuplicates,resolveDuplicate,stageImport,validateImport,promoteImport,importDetail,listRules,createRule,scanRules,refreshQuality,normalizeName,normalizeTax};
