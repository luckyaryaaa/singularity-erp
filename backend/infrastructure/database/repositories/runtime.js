'use strict';
const { randomUUID } = require('node:crypto');
const { AppError } = require('../../../core/errors');
const { createHash } = require('node:crypto');
const posting = require('./posting');
const masterGovernance = require('./master-governance');
const businessDate = require('../../../core/business-date');
const fieldEncryption = require('../../../core/field-encryption');

const PREFIXES = {
  CUSTOMER_INQUIRY:'INQ',QUOTATION:'QUO',CUSTOMER_PO:'CPO',SALES_ORDER:'SO',PROJECT:'PRJ',WORK_ORDER:'WO',
  PURCHASE_REQUEST:'PR',RFQ:'RFQ',PURCHASE_ORDER:'PO',GOODS_RECEIPT:'GR',QC_INSPECTION:'QC',MATERIAL_ISSUE:'MI',
  PAYMENT_PROPOSAL:'PP',
  STOCK_TRANSFER:'TRF',STOCK_ADJUSTMENT:'ADJ',STOCK_OPNAME:'OPN',DELIVERY:'DO',RMA:'RMA',INVOICE:'INV',CUSTOMER_PAYMENT:'PAY',
  SUPPLIER_INVOICE:'SINV',SUPPLIER_PAYMENT:'SPAY',EXPENSE:'EXP',JOURNAL:'JRN',PAYROLL_RUN:'PRL',
  TAX_DOCUMENT:'TAX',LEAVE_REQUEST:'LVE',REPORT:'RPT'
};

function camel(row) {
  if (!row) return null;
  const out = {};
  for (const [key,value] of Object.entries(row)) out[key.replace(/_([a-z])/g,(_,c)=>c.toUpperCase())]=value;
  if (out.amount !== undefined) out.amount = Number(out.amount);
  return out;
}

async function nextNumber(client,{documentType,branchId,date=new Date()}) {
  const prefix=PREFIXES[documentType];
  if(!prefix) throw new AppError('VALIDATION_ERROR',`Tipe dokumen '${documentType}' tidak dikenal.`);
  const period=`${String(date.getMonth()+1).padStart(2,'0')}${String(date.getFullYear()).slice(-2)}`;
  const result=await client.query(`INSERT INTO document_sequences(document_type,branch_id,period,current_value)
    VALUES($1,$2,$3,1) ON CONFLICT(document_type,branch_id,period) DO UPDATE
    SET current_value=document_sequences.current_value+1,updated_at=now() RETURNING current_value`,[documentType,branchId,period]);
  const seq=String(result.rows[0].current_value).padStart(3,'0');
  // Format dari konfigurasi ber-versi (P0 4.3). Sequence per branch sudah atomic;
  // kode branch pada nomor menutup tabrakan unique constraint antarcabang.
  const config=(await client.query(`SELECT format FROM numbering_configurations WHERE active LIMIT 1`)).rows[0];
  const format=config?config.format:'{PREFIX}-{BRANCH}-{MMYY}-{SEQ:3}';
  let branchCode='HO';
  if(format.includes('{BRANCH}')){
    const branch=(await client.query('SELECT code FROM branches WHERE id=$1',[branchId])).rows[0];
    branchCode=(branch?branch.code:'HO').replace(/[^A-Z0-9]/gi,'').toUpperCase()||'HO';
  }
  return format
    .replace('{PREFIX}',prefix)
    .replace('{BRANCH}',branchCode)
    .replace('{MMYY}',period)
    .replace(/\{SEQ(?::\d+)?\}/,seq);
}

// D1 — redaksi terpusat sebelum audit trail. Jejak audit bersifat permanen
// (partisi INSERT-only), jadi rahasia yang terlanjur masuk TIDAK bisa dicabut.
// Nilai disaring di satu tempat ini, bukan diserahkan ke tiap pemanggil.
const REDACTED='[REDACTED]';
const SECRET_KEY=/(password|passwd|sandi|pin|secret|token|otp|mfa|totp|csrf|apikey|api_key|private_key|recovery|hash|salt|signature|cvv)/i;
// Data pribadi/keuangan sensitif: disamarkan sebagian agar tetap berguna untuk
// forensik (mencocokkan entitas) tanpa menyimpan nilai penuh.
const MASK_KEY=/(npwp|nik|ktp|bank_account|bankaccount|account_number|accountnumber|base_salary|basesalary|net_pay|netpay|salary|gaji|nomor_rekening)/i;
const maskValue=(value)=>{const s=String(value);return s.length<=4?REDACTED:`${REDACTED}${s.slice(-4)}`;};
function redactAudit(value,depth=0){
  if(value==null||depth>6)return value??null;
  if(Array.isArray(value))return value.slice(0,200).map(v=>redactAudit(v,depth+1));
  if(typeof value!=='object')return value;
  const out={};
  for(const [key,val] of Object.entries(value)){
    if(SECRET_KEY.test(key))out[key]=REDACTED;
    else if(MASK_KEY.test(key)&&val!=null&&typeof val!=='object')out[key]=maskValue(val);
    else out[key]=redactAudit(val,depth+1);
  }
  return out;
}
async function audit(client,entry) {
  await client.query(`INSERT INTO audit_logs(user_id,action,module,entity_type,entity_id,document_number,old_value,new_value,reason,request_id,session_id,ip,branch_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,[
    entry.userId||null,entry.action,entry.module,entry.entityType,entry.entityId||null,entry.documentNumber||null,
    redactAudit(entry.oldValue)||null,redactAudit(entry.newValue)||null,entry.reason||null,entry.requestId||randomUUID(),entry.sessionId||null,entry.ip||null,entry.branchId||null
  ]);
}

async function outbox(client,eventType,payload={}) {
  const id=randomUUID();
  const versionMatch=String(eventType).match(/\.v(\d+)$/);
  const eventVersion=versionMatch?Number(versionMatch[1]):1;
  await client.query(`INSERT INTO domain_event_outbox(id,event_type,event_version,entity_id,branch_id,payload) VALUES($1,$2,$3,$4,$5,$6)`,
    [id,eventType,eventVersion,payload.entityId||payload.sourceEntityId||null,payload.branchId||null,payload]);
  return id;
}

function assertActionContract(input) {
  for(const field of ['actionKey','actorUserId','branchId','sourceEntityType','sourceEntityId']){
    if(!String(input?.[field]||'').trim())throw new AppError('VALIDATION_ERROR',`Kontrak work action membutuhkan ${field}.`);
  }
  if(String(input.actionKey).length>160)throw new AppError('VALIDATION_ERROR','actionKey work action maksimal 160 karakter.');
}
async function actionRequired(client,input){
  assertActionContract(input);
  if(!String(input.title||'').trim())throw new AppError('VALIDATION_ERROR','Judul action-required wajib diisi.');
  return outbox(client,'work.action-required.v1',{...input,eventVersion:1,entityId:input.entityId||input.sourceEntityId});
}
async function actionResolved(client,input){
  assertActionContract(input);
  return outbox(client,'work.action-resolved.v1',{...input,eventVersion:1,entityId:input.entityId||input.sourceEntityId});
}

// P0-J — Customer PO adalah komitmen hukum pelanggan. Nomor PO, keabsahan
// pelanggan, dan keterkaitan ke penawaran divalidasi di server; frontend tidak
// boleh menjadi satu-satunya penjaga. Keunikan nomor per pelanggan ditegakkan
// indeks ux_customer_po_number_per_customer (migrasi 040).
async function assertCustomerPoValid(client,{partyId,amount,payload={}}){
  const poNumber=String(payload.customerPoNumber||'').trim();
  if(!poNumber)throw new AppError('VALIDATION_ERROR','Nomor PO pelanggan wajib diisi.');
  if(poNumber.length>60)throw new AppError('VALIDATION_ERROR','Nomor PO pelanggan maksimal 60 karakter.');
  if(!partyId)throw new AppError('VALIDATION_ERROR','Customer PO wajib menyebutkan pelanggan.');
  const customer=(await client.query('SELECT id,name,active FROM customers WHERE id=$1',[partyId])).rows[0];
  if(!customer)throw new AppError('RESOURCE_NOT_FOUND','Pelanggan Customer PO tidak ditemukan.');
  if(!customer.active)throw new AppError('VALIDATION_ERROR',`Pelanggan ${customer.name} non-aktif — Customer PO tidak dapat dibuat.`);
  // Kelayakan kredit sengaja TIDAK diperiksa di sini: mencatat PO yang diterima
  // bukan komitmen pengiriman. Gerbang kredit tunggal ada di assertCreditOk
  // (Sales Order / Delivery / Invoice) agar aturannya tidak berganda.
  const duplicate=(await client.query(`SELECT document_number FROM business_documents
    WHERE document_type='CUSTOMER_PO' AND party_id=$1 AND payload->>'customerPoNumber'=$2
      AND status NOT IN('CANCELLED','VOID','REJECTED') LIMIT 1`,[partyId,poNumber])).rows[0];
  if(duplicate)throw new AppError('DOCUMENT_CONFLICT',`Nomor PO ${poNumber} dari ${customer.name} sudah tercatat pada ${duplicate.document_number}.`,{existingDocument:duplicate.document_number});

  if(payload.poDate){
    const po=new Date(payload.poDate);
    if(Number.isNaN(po.getTime()))throw new AppError('VALIDATION_ERROR','Tanggal PO pelanggan tidak valid.');
    if(po.getTime()>Date.now()+86400000)throw new AppError('VALIDATION_ERROR','Tanggal PO pelanggan tidak boleh di masa depan.');
  }

  const quotationRef=payload.quotationId||payload.sourceDocumentId||null;
  if(!quotationRef)return;
  const quote=(await client.query(`SELECT id,document_number,document_type,status,party_id,party_name,amount,due_date FROM business_documents WHERE id=$1`,[quotationRef])).rows[0];
  if(!quote)throw new AppError('RESOURCE_NOT_FOUND','Penawaran rujukan Customer PO tidak ditemukan.');
  if(quote.document_type!=='QUOTATION')throw new AppError('VALIDATION_ERROR',`Rujukan ${quote.document_number} bukan penawaran.`);
  if(quote.party_id&&String(quote.party_id)!==String(partyId))
    throw new AppError('VALIDATION_ERROR',`Penawaran ${quote.document_number} milik ${quote.party_name||'pelanggan lain'} — tidak cocok dengan pelanggan Customer PO.`,{quotationPartyId:quote.party_id});
  if(!['APPROVED','COMPLETED','CLOSED'].includes(quote.status))
    throw new AppError('STATUS_INVALID',`Penawaran ${quote.document_number} berstatus ${quote.status} — hanya penawaran yang sudah disetujui yang dapat menjadi dasar Customer PO.`,{quotationStatus:quote.status});
  if(quote.due_date&&new Date(quote.due_date).getTime()<Date.now()-86400000)
    throw new AppError('VALIDATION_ERROR',`Penawaran ${quote.document_number} sudah kedaluwarsa pada ${businessDate.toBusinessDate(quote.due_date)}.`,{validUntil:quote.due_date});
  const quoted=Number(quote.amount||0),ordered=Number(amount||0);
  if(quoted>0&&ordered-quoted>0.01)
    throw new AppError('VALIDATION_ERROR',`Nilai Customer PO (${ordered}) melebihi penawaran ${quote.document_number} (${quoted}) — terbitkan revisi penawaran terlebih dahulu.`,{quotedAmount:quoted,orderedAmount:ordered});
}

async function createDocument(client,{type,user,title,amount=0,partyId,partyName,dueDate,payload={},requestId,transactionCurrency,currencyDate,departmentId,costCenterId,profitCenterId,projectWbsId}) {
  if(!(Number(amount)>=0)) throw new AppError('VALIDATION_ERROR','Nilai dokumen tidak boleh negatif.');
  // P0-I: bila dokumen membawa baris, SERVER yang menentukan totalnya. Nilai
  // dari klien hanya diterima jika cocok — dihitung sebelum snapshot kurs
  // supaya functional/reporting amount ikut memakai angka otoritatif.
  const normalizedLines=posting.normalizeLines(payload?.lines);
  if(normalizedLines&&normalizedLines.length){
    amount=posting.assertAmountMatchesLines(amount,posting.authoritativeTotal(posting.lineSubtotalOf(normalizedLines),payload),{documentType:type});
    // P1-4: baris yang menautkan diri ke pesanan tidak boleh melampaui sisanya.
    await posting.assertFulfilmentWithinOrder(client,{documentType:type,partyId,lines:payload.lines,
      requireLinked:['DELIVERY','INVOICE'].includes(type)&&(Boolean(payload?.sourceDocumentId)||normalizedLines.some(l=>l.sourceLineId))});
  }
  if(type==='PURCHASE_ORDER'&&partyId){const supplier=(await client.query('SELECT name,performance_hold,performance_hold_reason,onboarding_status FROM suppliers WHERE id=$1',[partyId])).rows[0];if(!supplier)throw new AppError('RESOURCE_NOT_FOUND','Supplier PO tidak ditemukan.');if(supplier.performance_hold||['SUSPENDED','BLOCKED'].includes(supplier.onboarding_status))throw new AppError('SUPPLIER_HOLD',`Supplier ${supplier.name}: ${supplier.performance_hold_reason||supplier.onboarding_status}.`);}
  if(type==='CUSTOMER_PO') await assertCustomerPoValid(client,{partyId,amount,payload});
  const id=randomUUID(); const documentNumber=await nextNumber(client,{documentType:type,branchId:user.branchId});
  const org=(await client.query(`SELECT le.id legal_entity_id,le.code,le.legal_name,le.trade_name,le.npwp,le.legal_address,le.operational_address,le.phone,le.whatsapp,le.email,le.website,le.document_footer,
    (SELECT jsonb_build_object('bankName',b.bank_name,'accountNumber',b.account_number,
      'accountNumberCiphertext',b.account_number_ciphertext,'accountNumberKeyId',b.account_number_key_id,
      'accountHolder',b.account_holder,'currency',b.currency,'usagePurpose',b.usage_purpose)
      FROM company_bank_accounts b WHERE b.legal_entity_id=le.id AND b.verification_status='VERIFIED' AND b.effective_from<=current_date AND (b.effective_to IS NULL OR b.effective_to>=current_date)
      ORDER BY b.is_primary DESC,b.approved_at DESC LIMIT 1) bank,
    (SELECT jsonb_build_object('name',s.signatory_name,'positionTitle',s.position_title,'signatureAssetId',s.signature_asset_id)
      FROM organization_signatories s WHERE s.legal_entity_id=le.id AND s.active AND s.effective_from<=current_date AND (s.effective_to IS NULL OR s.effective_to>=current_date)
      ORDER BY s.effective_from DESC LIMIT 1) signatory
    FROM branches br JOIN legal_entities le ON le.id=br.legal_entity_id WHERE br.id=$1`,[user.branchId])).rows[0]||{};
  const legalEntityId=org.legal_entity_id||null;
  if (org.bank?.accountNumberCiphertext) {
    org.bank.accountNumber = fieldEncryption.decrypt(org.bank.accountNumberCiphertext,
      { purpose: 'company_bank.account_number', scope: legalEntityId });
    delete org.bank.accountNumberCiphertext;
    delete org.bank.accountNumberKeyId;
  }
  delete org.legal_entity_id;
  const currency=await masterGovernance.resolveCurrency(client,{legalEntityId,transactionCurrency:transactionCurrency||payload.currency||'IDR',date:currencyDate||payload.exchangeRateDate,amount});
  const dimensions=await masterGovernance.resolveDimensions(client,{type,legalEntityId,departmentId:departmentId||payload.departmentId,costCenterId:costCenterId||payload.costCenterId,profitCenterId:profitCenterId||payload.profitCenterId,projectWbsId:projectWbsId||payload.projectWbsId});
  const result=await client.query(`INSERT INTO business_documents
    (id,document_number,document_type,branch_id,legal_entity_id,department_id,cost_center_id,profit_center_id,project_wbs_id,organization_identity_snapshot,dimension_snapshot,
     transaction_currency,functional_currency,reporting_currency,exchange_rate,exchange_rate_date,functional_amount,reporting_amount,currency_snapshot,
     status,version,amount,payload,title,party_id,party_name,due_date,created_by,updated_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'DRAFT',1,$20,$21,$22,$23,$24,$25,$26,$26) RETURNING *`,
    [id,documentNumber,type,user.branchId,legalEntityId,dimensions.departmentId,dimensions.costCenterId,dimensions.profitCenterId,dimensions.projectWbsId,org,dimensions.snapshot,
      currency.transactionCurrency,currency.functionalCurrency,currency.reportingCurrency,currency.exchangeRate,currency.exchangeRateDate,currency.functionalAmount,currency.reportingAmount,currency.snapshot,
      amount,payload,title||type,partyId||null,partyName||null,dueDate||null,user.id]);
  await posting.syncDocumentLines(client,id,payload?.lines);
  await audit(client,{userId:user.id,action:'CREATE',module:type.toLowerCase(),entityType:type,entityId:id,documentNumber,newValue:{title:title||type,amount:Number(amount)},requestId,branchId:user.branchId});
  await outbox(client,`${type.toLowerCase()}.created`,{entityId:documentNumber,documentType:type,branchId:user.branchId,version:1});
  return camel(result.rows[0]);
}

async function updateDocument(client,{id,expectedVersion,patch,user,requestId}) {
  const current=await client.query('SELECT * FROM business_documents WHERE id=$1',[id]);
  if(!current.rowCount) throw new AppError('RESOURCE_NOT_FOUND','Dokumen tidak ditemukan.');
  const doc=current.rows[0];
  if(!['DRAFT','REVISION_REQUIRED'].includes(doc.status)) throw new AppError('STATUS_INVALID',`Dokumen berstatus ${doc.status} tidak dapat diedit.`);
  // P0-I: perubahan baris juga wajib rekonsiliasi dengan total header.
  if(Array.isArray(patch.payload?.lines)&&patch.payload.lines.length){
    const expected=posting.authoritativeTotal(posting.lineSubtotalOf(posting.normalizeLines(patch.payload.lines)),patch.payload);
    patch.amount=posting.assertAmountMatchesLines(patch.amount??doc.amount,expected,{documentType:doc.document_type});
    // P1-4: baris dokumen ini sendiri dikecualikan dari hitungan sisa, supaya
    // menyunting pengiriman yang sama tidak dianggap penambahan baru.
    const sourceRef=patch.payload?.sourceDocumentId??doc.payload?.sourceDocumentId;
    const normalized=posting.normalizeLines(patch.payload.lines);
    await posting.assertFulfilmentWithinOrder(client,{documentId:doc.id,documentType:doc.document_type,
      partyId:patch.partyId??doc.party_id,lines:patch.payload.lines,
      requireLinked:['DELIVERY','INVOICE'].includes(doc.document_type)&&(Boolean(sourceRef)||normalized.some(l=>l.sourceLineId))});
  }
  const result=await client.query(`UPDATE business_documents SET
    title=COALESCE($3,title),amount=COALESCE($4,amount),due_date=COALESCE($5,due_date),payload=COALESCE($6,payload),
    party_id=COALESCE($7,party_id),party_name=COALESCE($8,party_name),version=version+1,updated_at=now(),updated_by=$9
    WHERE id=$1 AND version=$2 RETURNING *`,[id,expectedVersion,patch.title??null,patch.amount??null,patch.dueDate??null,patch.payload??null,patch.partyId??null,patch.partyName??null,user.id]);
  if(!result.rowCount) throw new AppError('DOCUMENT_CONFLICT','Dokumen telah diubah pengguna lain. Muat ulang versi terbaru.');
  const updated=camel(result.rows[0]);
  if(Array.isArray(patch.payload?.lines))await posting.syncDocumentLines(client,id,patch.payload.lines);
  await audit(client,{userId:user.id,action:'UPDATE',module:doc.document_type.toLowerCase(),entityType:doc.document_type,entityId:id,documentNumber:doc.document_number,oldValue:{version:doc.version},newValue:{version:updated.version},requestId,branchId:doc.branch_id});
  await outbox(client,'document.updated',{entityId:doc.document_number,documentType:doc.document_type,branchId:doc.branch_id,version:updated.version});
  return updated;
}

async function getDocument(client,id) { return camel((await client.query('SELECT * FROM business_documents WHERE id=$1',[id])).rows[0]); }
async function documentRelations(client,id){return(await client.query(`SELECT r.relation_type,p.id parent_id,p.document_number parent_number,p.document_type parent_type,c.id child_id,c.document_number child_number,c.document_type child_type,r.created_at FROM document_relations r JOIN business_documents p ON p.id=r.parent_document_id JOIN business_documents c ON c.id=r.child_document_id WHERE r.parent_document_id=$1 OR r.child_document_id=$1 ORDER BY r.created_at`,[id])).rows.map(camel);}
const CONVERSIONS={QUOTATION:{target:'SALES_ORDER',relation:'QUOTATION_TO_ORDER'},CUSTOMER_PO:{target:'SALES_ORDER',relation:'CUSTOMER_PO_TO_ORDER'},SALES_ORDER:{target:'PROJECT',relation:'ORDER_TO_PROJECT'},PROJECT:{target:'WORK_ORDER',relation:'PROJECT_TO_WORK_ORDER'},PURCHASE_REQUEST:{target:'PURCHASE_ORDER',relation:'REQUEST_TO_ORDER'},PURCHASE_ORDER:{target:'GOODS_RECEIPT',relation:'ORDER_TO_RECEIPT'},DELIVERY:{target:'INVOICE',relation:'DELIVERY_TO_INVOICE'}};
async function convertDocument(client,{id,user,requestId}){
  const locked=(await client.query('SELECT * FROM business_documents WHERE id=$1 FOR UPDATE',[id])).rows[0];
  const source=camel(locked);if(!source)throw new AppError('RESOURCE_NOT_FOUND');
  const spec=CONVERSIONS[source.documentType];if(!spec)throw new AppError('VALIDATION_ERROR',`Dokumen ${source.documentType} tidak memiliki konversi lanjutan.`);
  if(!['APPROVED','COMPLETED','CLOSED'].includes(source.status))throw new AppError('STATUS_INVALID','Dokumen sumber harus disetujui atau selesai sebelum dikonversi.');
  const existing=(await client.query(`SELECT c.* FROM document_relations r JOIN business_documents c ON c.id=r.child_document_id WHERE r.parent_document_id=$1 AND r.relation_type=$2 LIMIT 1`,[source.id,spec.relation])).rows[0];
  if(existing)return{source,child:camel(existing),relationType:spec.relation,alreadyConverted:true};
  const child=await createDocument(client,{type:spec.target,user:{...user,branchId:source.branchId},title:source.title,amount:source.amount,partyId:source.partyId,partyName:source.partyName,dueDate:source.dueDate,transactionCurrency:source.transactionCurrency,currencyDate:source.exchangeRateDate,departmentId:source.departmentId,costCenterId:source.costCenterId,profitCenterId:source.profitCenterId,projectWbsId:source.projectWbsId,payload:{...(source.payload||{}),sourceDocumentId:source.id,sourceDocumentNumber:source.documentNumber},requestId});
  await client.query(`INSERT INTO document_relations(parent_document_id,child_document_id,relation_type,created_by) VALUES($1,$2,$3,$4)`,[source.id,child.id,spec.relation,user.id]);
  await outbox(client,'document.converted',{entityId:source.documentNumber,childId:child.id,childNumber:child.documentNumber,documentType:spec.target,branchId:source.branchId});return{source,child,relationType:spec.relation,alreadyConverted:false};
}
async function listDocuments(client,{types,user,page=1,limit=25,q,sortKey='updated_at',sortDir='desc'}){
  limit=Math.min(Math.max(Number(limit)||25,1),100);page=Math.max(Number(page)||1,1);
  const allowed=new Set(['document_number','title','amount','status','created_at','updated_at','due_date']);const sort=allowed.has(sortKey)?sortKey:'updated_at',dir=sortDir==='asc'?'ASC':'DESC';
  const params=[types];let where="document_type=ANY($1) AND is_archived=false";
  if(!['owner','admin'].includes(user.role)&&user.branchScope!=='*'){params.push(user.branchId);where+=` AND branch_id=$${params.length}`;}
  if(q){params.push(`%${String(q).slice(0,120)}%`);where+=` AND (document_number ILIKE $${params.length} OR title ILIKE $${params.length} OR party_name ILIKE $${params.length})`;}
  const count=Number((await client.query(`SELECT count(*) n FROM business_documents WHERE ${where}`,params)).rows[0].n);params.push(limit,(page-1)*limit);
  const items=(await client.query(`SELECT * FROM business_documents WHERE ${where} ORDER BY ${sort} ${dir} LIMIT $${params.length-1} OFFSET $${params.length}`,params)).rows.map(camel);
  return{items,page,limit,total:count,totalPages:Math.max(Math.ceil(count/limit),1)};
}
async function auditTrail(client,id,limit=15){return (await client.query(`SELECT a.*,u.display_name user_name FROM audit_logs a LEFT JOIN app_users u ON u.id=a.user_id WHERE a.entity_id=$1 ORDER BY occurred_at DESC LIMIT $2`,[id,limit])).rows.map(camel);}
async function pendingApprovals(client,user,{page=1,limit=25}={}){
  limit=Math.min(Math.max(Number(limit)||25,1),100);page=Math.max(Number(page)||1,1);const level=roleLevel[user.role];if(!level)return{items:[],page,limit,total:0,totalPages:1};
  // Kondisi memakai alias d. sejak awal agar query dengan LEFT JOIN customers aman.
  const params=[];let scope="d.status='WAITING_APPROVAL'";// required_approval_levels bertipe text[], jadi keanggotaan diuji dengan
// ANY — operator jsonb `?` melempar "operator does not exist: text[] ?
// unknown" dan membuat antrean approval gagal untuk SETIAP role non-owner.
if(user.role!=='owner'){params.push(level);scope+=` AND $${params.length}=ANY(d.required_approval_levels) AND NOT d.approvals @> jsonb_build_array(jsonb_build_object('level',$${params.length}::text))`;}
  if(!['owner','admin'].includes(user.role)&&user.branchScope!=='*'){params.push(user.branchId);scope+=` AND d.branch_id=$${params.length}`;}
  const total=Number((await client.query(`SELECT count(*) n FROM business_documents d WHERE ${scope}`,params)).rows[0].n);params.push(limit,(page-1)*limit);
  // Approval Center 2.0 (§10.8): sertakan versi snapshot policy + eksposur kredit
  // pelanggan (subquery, hanya untuk dokumen pelanggan) langsung di antrean.
  const rows=(await client.query(`SELECT d.*,floor(extract(epoch from(now()-COALESCE(d.submitted_at,d.created_at)))/86400)::int age_days,
    c.credit_hold,c.credit_limit_amount,
    (SELECT COALESCE(sum(i.amount-COALESCE((i.payload->>'paid')::numeric,0)),0) FROM business_documents i
      WHERE i.document_type='INVOICE' AND i.party_id=d.party_id AND i.status IN('APPROVED','PARTIALLY_PAID','OVERDUE','IN_PROCESS')) credit_exposure
    FROM business_documents d LEFT JOIN customers c ON c.id=d.party_id AND d.document_type IN('SALES_ORDER','INVOICE','QUOTATION')
    WHERE ${scope} ORDER BY d.amount DESC LIMIT $${params.length-1} OFFSET $${params.length}`,params)).rows.map(camel);
  const items=rows.map(d=>{const done=(d.approvals||[]).map(a=>a.level),levels=d.requiredApprovalLevels||[];
    const snap=d.approvalPolicySnapshot||{};
    const credit=(d.creditLimitAmount!=null)?{hold:d.creditHold,limit:Number(d.creditLimitAmount),exposure:Number(d.creditExposure||0),projected:Number(d.creditExposure||0)+Number(d.amount||0),overLimit:Number(d.creditLimitAmount)>0&&(Number(d.creditExposure||0)+Number(d.amount||0))>Number(d.creditLimitAmount)}:null;
    return{...d,approvalLevel:`${done.length+1}/${levels.length}`,nextLevel:levels.find(x=>!done.includes(x)),risk:d.amount>100000000?'high':d.amount>25000000?'medium':'low',policyVersion:snap.version||null,policyKey:snap.policyKey||snap.source||null,credit};});
  return{items,page,limit,total,totalPages:Math.max(Math.ceil(total/limit),1)};
}

const APPROVAL_TIERS=[{max:5_000_000,levels:['supervisor']},{max:50_000_000,levels:['supervisor','finance']},{max:Infinity,levels:['supervisor','finance','owner']}];
const TRANSITIONS={submit:{from:['DRAFT','REVISION_REQUIRED'],to:'WAITING_APPROVAL'},approve:{from:['WAITING_APPROVAL'],to:'APPROVED'},reject:{from:['WAITING_APPROVAL'],to:'REJECTED'},revise:{from:['WAITING_APPROVAL'],to:'REVISION_REQUIRED'},start:{from:['APPROVED'],to:'IN_PROCESS'},complete:{from:['IN_PROCESS','PARTIALLY_COMPLETED'],to:'COMPLETED'},close:{from:['COMPLETED','PARTIALLY_PAID'],to:'CLOSED'},cancel:{from:['DRAFT','WAITING_APPROVAL','REVISION_REQUIRED','APPROVED'],to:'CANCELLED'},void:{from:['APPROVED','IN_PROCESS','COMPLETED','CLOSED','PARTIALLY_PAID'],to:'VOID'}};
const roleLevel={sales:'supervisor',procurement:'supervisor',warehouse:'supervisor',production:'supervisor',hrd:'supervisor',finance_manager:'finance',finance:'finance',accounting:'finance',owner:'owner'};
const approvalDomainRole=(documentType)=>{
  if(['CUSTOMER_INQUIRY','QUOTATION','CUSTOMER_PO','SALES_ORDER','PROJECT'].includes(documentType))return'sales';
  if(['PURCHASE_REQUEST','RFQ','PURCHASE_ORDER','SUPPLIER_INVOICE','SUPPLIER_PAYMENT'].includes(documentType))return'procurement';
  if(['GOODS_RECEIPT','MATERIAL_ISSUE','STOCK_TRANSFER','STOCK_ADJUSTMENT','STOCK_OPNAME','DELIVERY','RMA'].includes(documentType))return'warehouse';
  if(['WORK_ORDER','QC_INSPECTION'].includes(documentType))return'production';
  if(['PAYROLL_RUN','LEAVE_REQUEST'].includes(documentType))return'hrd';
  return'finance_manager';
};
const approvalAssigneeRole=(level,documentType)=>level==='owner'?'owner':level==='finance'?'finance_manager':approvalDomainRole(documentType);

async function approvalPolicy(client,doc){
  const row=(await client.query(`SELECT * FROM approval_policy_versions WHERE status='ACTIVE' AND document_type IN($1,'*')
    AND (branch_id IS NULL OR branch_id=$2) AND min_amount<=$3 AND (max_amount IS NULL OR max_amount>=$3)
    AND effective_from<=now() AND (effective_until IS NULL OR effective_until>now())
    ORDER BY (document_type=$1) DESC,(branch_id=$2) DESC,min_amount DESC,version DESC LIMIT 1`,[doc.document_type,doc.branch_id,Number(doc.amount)])).rows[0];
  if(!row)return{levels:APPROVAL_TIERS.find(t=>Number(doc.amount)<=t.max).levels,id:null,snapshot:{source:'LEGACY_FALLBACK',resolvedAt:new Date().toISOString()}};
  const steps=(row.steps||[]).sort((a,b)=>a.sequence-b.sequence);return{levels:steps.map(x=>x.level),id:row.id,snapshot:{policyId:row.id,policyKey:row.policy_key,version:row.version,documentType:row.document_type,branchId:row.branch_id,minAmount:Number(row.min_amount),maxAmount:row.max_amount===null?null:Number(row.max_amount),steps,resolvedAt:new Date().toISOString()}};
}

async function transitionDocument(client,{id,action,user,reason,requestId,allowOwnerOverride=false}){
  const result=await client.query('SELECT * FROM business_documents WHERE id=$1 FOR UPDATE',[id]);
  if(!result.rowCount)throw new AppError('RESOURCE_NOT_FOUND','Dokumen tidak ditemukan.');
  const doc=result.rows[0],rule=TRANSITIONS[action];
  if(!rule)throw new AppError('VALIDATION_ERROR',`Aksi '${action}' tidak dikenal.`);
  if(!rule.from.includes(doc.status))throw new AppError('STATUS_INVALID',`Aksi '${action}' tidak diizinkan dari ${doc.status}.`);
  if(['void','cancel','reject','revise'].includes(action)&&!reason)throw new AppError('REASON_REQUIRED');
  // Wave 5 — gerbang komersial tunggal pada lifecycle. Draft quotation/order
  // tidak boleh masuk approval tanpa snapshot margin; Sales Order juga wajib
  // membawa janji ATP/CTP per baris yang masih aktif.
  if(action==='submit'&&['QUOTATION','SALES_ORDER'].includes(doc.document_type)){
    const commercial=require('./sales-commercial');
    await commercial.assertMarginRelease(client,doc,user);
    await commercial.assertAvailabilityRelease(client,doc,user);
  }
  // Draf tidak ikut view pemenuhan. Karena itu validasi saat save saja tidak
  // cukup: dua draf dapat lolos lalu sama-sama diajukan. Recheck pada setiap
  // lifecycle gate yang membuat/mempertahankan klaim terhadap sales order.
  if(['submit','approve','start','complete'].includes(action)&&['DELIVERY','INVOICE'].includes(doc.document_type)){
    const lines=(await client.query(`SELECT product_id "productId",description,qty,uom,unit_price "unitPrice",
      discount_pct "discountPct",tax_pct "taxPct",source_line_id "sourceLineId"
      FROM document_lines WHERE document_id=$1 ORDER BY line_no`,[id])).rows;
    await posting.assertFulfilmentWithinOrder(client,{documentId:id,documentType:doc.document_type,
      partyId:doc.party_id,lines,requireLinked:Boolean(doc.payload?.sourceDocumentId)||lines.some(l=>l.sourceLineId)});
  }
  let status=rule.to,approvals=Array.isArray(doc.approvals)?doc.approvals:[],levels=doc.required_approval_levels||[];
  let previousApprovalKey=null;
  if(['approve','reject','revise'].includes(action)){
    const previousLevel=levels.find(level=>!approvals.some(a=>a.level===level));
    if(previousLevel)previousApprovalKey=`approval:${doc.id}:${doc.version}:${previousLevel}`;
  }
  const extra={};
  if(action==='submit'){const resolved=await approvalPolicy(client,doc);levels=resolved.levels;approvals=[];extra.submitted_at=new Date();extra.approval_policy_version_id=resolved.id;extra.approval_policy_snapshot=resolved.snapshot;}
  if(['approve','reject','revise'].includes(action)){
    if(doc.created_by===user.id&&!allowOwnerOverride)throw new AppError('SOD_CONFLICT','Pembuat dokumen tidak boleh menjadi approver dokumen yang sama.');
    const done=approvals.map(a=>a.level),next=levels.find(level=>!done.includes(level));
    const actual=roleLevel[user.role];
    if(actual!==next&&!(allowOwnerOverride&&user.role==='owner'))throw new AppError('PERMISSION_DENIED',`Approval berikutnya membutuhkan level ${next}.`);
    if(action==='approve'){
      approvals=[...approvals,{level:next,userId:user.id,userName:user.displayName,at:new Date().toISOString(),comment:reason||null,override:actual!==next}];
      status=levels.some(level=>!approvals.some(a=>a.level===level))?'WAITING_APPROVAL':'APPROVED';
      if(status==='APPROVED'){extra.approved_at=new Date();extra.approved_by=user.id;}
    }
  }
  if(action==='cancel'){extra.cancelled_at=new Date();extra.cancelled_by=user.id;}
  if(action==='void'){extra.voided_at=new Date();extra.voided_by=user.id;}
  const columns=['status=$2','version=version+1','updated_at=now()','updated_by=$3','approvals=$4','required_approval_levels=$5'];
  const values=[id,status,user.id,JSON.stringify(approvals),levels];let n=6;
  for(const [key,value] of Object.entries(extra)){columns.push(`${key}=$${n++}`);values.push(value);}
  const updated=(await client.query(`UPDATE business_documents SET ${columns.join(',')} WHERE id=$1 RETURNING *`,values)).rows[0];
  await audit(client,{userId:user.id,action:{submit:'SUBMIT',approve:'APPROVE',reject:'REJECT',revise:'REQUEST_REVISION',start:'POST',complete:'POST',close:'POST',cancel:'CANCEL',void:'VOID'}[action]||'UPDATE',module:doc.document_type.toLowerCase(),entityType:doc.document_type,entityId:id,documentNumber:doc.document_number,oldValue:{status:doc.status},newValue:{status},reason,requestId,branchId:doc.branch_id});
  await outbox(client,['submit','approve','reject','revise'].includes(action)?'approval.updated':'document.updated',{entityId:doc.document_number,documentType:doc.document_type,branchId:doc.branch_id,version:updated.version,status});
  if(previousApprovalKey){
    await actionResolved(client,{actionKey:previousApprovalKey,actorUserId:user.id,branchId:doc.branch_id,
      sourceEntityType:doc.document_type,sourceEntityId:doc.id,entityId:doc.document_number,
      resolutionNote:`Tahap persetujuan diproses dengan aksi ${action.toUpperCase()}.`});
  }
  if(status==='WAITING_APPROVAL'){
    const pendingLevel=levels.find(level=>!approvals.some(a=>a.level===level));
    if(pendingLevel){
      const priority=Number(doc.amount)>=100_000_000?'URGENT':Number(doc.amount)>=25_000_000?'HIGH':'NORMAL';
      await actionRequired(client,{
        actionKey:`approval:${doc.id}:${updated.version}:${pendingLevel}`,
        actorUserId:user.id,branchId:doc.branch_id,itemType:'APPROVAL',
        title:`Persetujuan ${doc.document_number}`,
        description:`${doc.title||doc.document_type} menunggu persetujuan level ${pendingLevel}.`,
        sourceModule:doc.document_type.toLowerCase(),sourceEntityType:doc.document_type,
        sourceEntityId:doc.id,entityId:doc.document_number,
        assigneeRole:approvalAssigneeRole(pendingLevel,doc.document_type),
        priority,risk:priority==='URGENT'?'HIGH':priority==='HIGH'?'MEDIUM':'LOW',
        requiredAction:`Tinjau dan putuskan dokumen ${doc.document_number}.`,
        completionCondition:`Tahap ${pendingLevel} disetujui, ditolak, atau dikembalikan untuk revisi.`,
        slaMinutes:1440,link:'#/approvals'
      });
    }
  }
  // Dokumen yang berakhir tanpa dipenuhi WAJIB melepas stok yang ditahannya.
  // Tanpa ini, pesanan yang dibatalkan menyandera stoknya selamanya dan tidak
  // ada yang tahu penyebabnya — persis masalah yang membuat reservasi harus
  // menjadi catatan, bukan sekadar angka.
  if(['CANCELLED','VOID','REJECTED','CLOSED'].includes(status)){
    await require('./stock-reservations').releaseDocument(client,{documentId:doc.id,user,
      reason:`Dokumen ${doc.document_number} berstatus ${status}${reason?` — ${String(reason).slice(0,200)}`:''}`});
  }
  // Backorder adalah proyeksi tersimpan dari fakta pemenuhan. Segarkan setelah
  // order dilepas dan setelah delivery mengubah kuantitas terpenuhi.
  if(doc.document_type==='SALES_ORDER'&&status==='APPROVED'){
    const commercial=require('./sales-commercial');await commercial.refreshBackorders(client,doc.id,user);
  }
  if(doc.document_type==='DELIVERY'&&['COMPLETED','CLOSED'].includes(status)){
    const commercial=require('./sales-commercial');
    const sourceOrders=(await client.query(`SELECT DISTINCT so.id FROM document_lines child JOIN document_lines source ON source.id=child.source_line_id JOIN business_documents so ON so.id=source.document_id WHERE child.document_id=$1 AND so.document_type='SALES_ORDER'`,[doc.id])).rows;
    for(const source of sourceOrders)await commercial.refreshBackorders(client,source.id,user);
  }
  return camel(updated);
}

const stableJson=value=>JSON.stringify(value&&typeof value==='object'&&!Array.isArray(value)?Object.keys(value).sort().reduce((o,k)=>(o[k]=value[k],o),{}):value??{});
async function withIdempotency(client,{userId,operation,key,body},execute){
  if(!key)throw new AppError('VALIDATION_ERROR','Idempotency-Key wajib untuk operasi kritis.');
  const requestHash=createHash('sha256').update(stableJson(body)).digest('hex');
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`${userId}:${operation}:${key}`]);
  const existing=(await client.query(`SELECT * FROM idempotency_records WHERE user_id=$1 AND operation=$2 AND idempotency_key=$3 AND expires_at>now()`,[userId,operation,key])).rows[0];
  if(existing){
    if(existing.request_hash!==requestHash)throw new AppError('DUPLICATE_REQUEST','Idempotency-Key sudah dipakai dengan payload berbeda.');
    return {status:existing.response_status,body:{...existing.response_body,idempotentReplay:true}};
  }
  const response=await execute();
  await client.query(`INSERT INTO idempotency_records(id,user_id,operation,idempotency_key,request_hash,response_status,response_body,expires_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,now()+interval '24 hours')`,[randomUUID(),userId,operation,key,requestHash,response.status,response.body]);
  return response;
}

module.exports={PREFIXES,camel,nextNumber,audit,redactAudit,outbox,actionRequired,actionResolved,createDocument,assertCustomerPoValid,updateDocument,getDocument,documentRelations,convertDocument,listDocuments,auditTrail,pendingApprovals,transitionDocument,withIdempotency,approvalPolicy,APPROVAL_TIERS,CONVERSIONS};
