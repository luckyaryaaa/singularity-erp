'use strict';
const {randomUUID}=require('node:crypto');const {AppError}=require('../../../core/errors');
const accountingConfig=require('./accounting-config');

async function syncDocumentLines(client,documentId,lines){
  if(!Array.isArray(lines))return;if(lines.length>500)throw new AppError('VALIDATION_ERROR','Maksimal 500 baris per dokumen.');
  await client.query('DELETE FROM document_lines WHERE document_id=$1',[documentId]);
  for(let i=0;i<lines.length;i++){const line=lines[i],qty=Number(line.qty),price=Number(line.unitPrice??line.price??0),discount=Number(line.discountPct||0),tax=Number(line.taxPct??0);if(!(qty>0)||price<0||discount<0||discount>100||tax<0||tax>100)throw new AppError('VALIDATION_ERROR',`Baris ${i+1} tidak valid.`);const base=qty*price*(1-discount/100),total=Math.round((base+base*tax/100)*100)/100;await client.query(`INSERT INTO document_lines(id,document_id,line_no,product_id,description,qty,uom,unit_price,discount_pct,tax_pct,line_total) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,[randomUUID(),documentId,i+1,line.productId||null,line.description||line.name||`Baris ${i+1}`,qty,line.uom||null,price,discount,tax,total]);}
}

async function claimPosting(client,doc,user,kind){const row=(await client.query(`INSERT INTO document_postings(document_id,posting_kind,posted_by) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING document_id`,[doc.id,kind,user.id])).rows[0];return!!row;}
async function finishPosting(client,doc,kind,result){await client.query('UPDATE document_postings SET result=$3 WHERE document_id=$1 AND posting_kind=$2',[doc.id,kind,result]);}
async function balance(client,productId,warehouseId,delta,user,doc,movementType){
  if(!productId||!warehouseId)throw new AppError('VALIDATION_ERROR','Produk dan gudang wajib untuk posting stok.');
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`stock:${productId}:${warehouseId}`]);
  await client.query(`INSERT INTO inventory_balances(id,product_id,warehouse_id) VALUES($1,$2,$3) ON CONFLICT(product_id,warehouse_id) DO NOTHING`,[randomUUID(),productId,warehouseId]);
  const current=(await client.query(`SELECT i.*,p.hpp FROM inventory_balances i JOIN products p ON p.id=i.product_id WHERE i.product_id=$1 AND i.warehouse_id=$2 FOR UPDATE OF i`,[productId,warehouseId])).rows[0];if(!current)throw new AppError('RESOURCE_NOT_FOUND','Produk stok tidak ditemukan.');const next=Number(current.qty_on_hand)+delta;if(next<0)throw new AppError('VALIDATION_ERROR',`Stok ${productId} tidak mencukupi.`);const cost=Number(current.hpp||0),nextValue=Math.max(0,Number(current.value_idr)+delta*cost);
  await client.query('UPDATE inventory_balances SET qty_on_hand=$3,value_idr=$4,version=version+1,updated_at=now() WHERE product_id=$1 AND warehouse_id=$2',[productId,warehouseId,next,nextValue]);
  await client.query(`INSERT INTO inventory_movements(product_id,warehouse_id,document_id,movement_type,qty,unit_cost,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)`,[productId,warehouseId,doc.id,movementType,Math.abs(delta),cost,user.id]);return{productId,warehouseId,delta,qtyOnHand:next,unitCost:cost};
}
async function postInventory(client,doc,user){
  // Stock opname diposting saat APPROVED (checker ≠ maker sudah lolos SoD).
  if(doc.documentType==='STOCK_OPNAME'){
    if(doc.status!=='APPROVED')return null;
    if(!await claimPosting(client,doc,user,'INVENTORY'))return{replay:true};
    const lots=require('./inventory');
    const opname=await lots.postOpname(client,doc,user);
    await finishPosting(client,doc,'INVENTORY',{opname:{adjusted:opname.adjusted,gain:opname.gain,loss:opname.loss}});
    return opname;
  }
  const types={GOODS_RECEIPT:'RECEIPT',MATERIAL_ISSUE:'ISSUE',STOCK_ADJUSTMENT:'ADJUSTMENT',STOCK_TRANSFER:'TRANSFER_OUT'};if(!types[doc.documentType]||doc.status!=='COMPLETED')return null;if(!await claimPosting(client,doc,user,'INVENTORY'))return{replay:true};const lines=(await client.query('SELECT * FROM document_lines WHERE document_id=$1 ORDER BY line_no',[doc.id])).rows;if(!lines.length)throw new AppError('VALIDATION_ERROR','Posting stok membutuhkan baris dokumen.');const result=[];const lots=require('./inventory');
  for(const line of lines){const qty=Number(line.qty);
    if(doc.documentType==='GOODS_RECEIPT'){const wh=doc.payload?.warehouseId||doc.branchId;result.push(await balance(client,line.product_id,wh,qty,user,doc,'RECEIPT'));
      await lots.receiveLotLine(client,doc,line,wh,user); // lot + heat number per baris GR
    }else if(doc.documentType==='MATERIAL_ISSUE'){const wh=doc.payload?.warehouseId||doc.branchId;result.push(await balance(client,line.product_id,wh,-qty,user,doc,'ISSUE'));
      await lots.consumeLots(client,{productId:line.product_id,warehouseId:wh,qty,doc,user,type:'ISSUE'}); // konsumsi FIFO
    }else if(doc.documentType==='STOCK_ADJUSTMENT'){const wh=doc.payload?.warehouseId||doc.branchId;const out=doc.payload?.adjustmentDirection==='OUT';result.push(await balance(client,line.product_id,wh,out?-qty:qty,user,doc,'ADJUSTMENT'));
      if(out)await lots.consumeLots(client,{productId:line.product_id,warehouseId:wh,qty,doc,user,type:'ADJUST_OUT'});
      else await lots.receiveLotLine(client,doc,line,wh,user,{movementType:'ADJUST_IN',lotPrefix:'A'});
    }else{const to=doc.payload?.toWarehouseId;if(!to)throw new AppError('VALIDATION_ERROR','Gudang tujuan wajib untuk transfer.');const from=doc.payload?.fromWarehouseId||doc.branchId;
      result.push(await balance(client,line.product_id,from,-qty,user,doc,'TRANSFER_OUT'));result.push(await balance(client,line.product_id,to,qty,user,doc,'TRANSFER_IN'));
      await lots.transferLots(client,{productId:line.product_id,fromWarehouseId:from,toWarehouseId:to,qty,doc,user}); // lot anak mewarisi heat/cert
    }}
  // Sprint 12: MATERIAL_ISSUE milik WO → catat issued_qty + lepas reservasi.
  if(doc.documentType==='MATERIAL_ISSUE'&&doc.payload?.workOrderId){const production=require('./production');await production.onMaterialIssued(client,doc);}
  await finishPosting(client,doc,'INVENTORY',{movements:result});return{movements:result};
}
// Status pemicu posting per tipe; AKUN ditentukan posting_profiles (bukan hardcoded).
const POSTING_TRIGGER={INVOICE:'APPROVED',CUSTOMER_PAYMENT:'CLOSED',SUPPLIER_INVOICE:'APPROVED',SUPPLIER_PAYMENT:'CLOSED',EXPENSE:'CLOSED'};
async function ensureOpenPeriod(client,doc){const stamp=doc.documentType==='PAYROLL_RUN'&&doc.payload?.period?`${doc.payload.period}-01`:doc.createdAt instanceof Date?doc.createdAt.toISOString():String(doc.createdAt||new Date().toISOString()),period=stamp.slice(0,7);await client.query(`INSERT INTO accounting_periods(id,period,status) VALUES($1,$2,'OPEN') ON CONFLICT(period) DO NOTHING`,[randomUUID(),period]);const p=(await client.query('SELECT status FROM accounting_periods WHERE period=$1 FOR UPDATE',[period])).rows[0];if(p.status!=='OPEN')throw new AppError('STATUS_INVALID',`Periode ${period} sudah ditutup.`);return period;}
async function accountMap(client,codes){return(await client.query('SELECT id,code FROM chart_of_accounts WHERE code=ANY($1) AND active',[codes])).rows.reduce((o,r)=>(o[r.code]=r.id,o),{});}
// Bangun & simpan jurnal dari posting profile (configuration-driven §18.2).
// amounts = peta amount_source → nilai (mis. {AMOUNT, NET, TAX, BPJS_COMPANY}).
async function postFromProfile(client,doc,user,{transactionType,amounts,memoBase}){
  const profile=await accountingConfig.resolvePostingProfile(client,{transactionType,legalEntityId:doc.legal_entity_id||null,branchId:doc.branch_id||null,onDate:(doc.createdAt instanceof Date?doc.createdAt.toISOString():String(doc.createdAt||'')).slice(0,10)||undefined});
  if(!profile)throw new AppError('RESOURCE_NOT_FOUND',`Posting profile untuk ${transactionType} belum dikonfigurasi.`);
  const codes=[...new Set(profile.legs.map(l=>l.account_code))],accounts=await accountMap(client,codes);
  const missing=codes.filter(c=>!accounts[c]);if(missing.length)throw new AppError('RESOURCE_NOT_FOUND',`Akun posting belum ada di COA: ${missing.join(', ')}.`);
  let debitTotal=0,creditTotal=0;
  for(const leg of profile.legs){const value=Math.round(Number(amounts[leg.amount_source]||0)*100)/100;if(!value)continue;const debit=leg.side==='D'?value:0,credit=leg.side==='C'?value:0;debitTotal+=debit;creditTotal+=credit;await client.query(`INSERT INTO journal_lines(id,journal_document_id,account_id,debit,credit,memo) VALUES($1,$2,$3,$4,$5,$6)`,[randomUUID(),doc.id,accounts[leg.account_code],debit,credit,`${doc.documentNumber} · ${memoBase}${leg.memo_suffix?' '+leg.memo_suffix:''}`]);}
  if(Math.abs(debitTotal-creditTotal)>.01)throw new AppError('VALIDATION_ERROR',`Jurnal ${transactionType} tidak seimbang (D ${debitTotal} vs C ${creditTotal}).`);
  await client.query(`UPDATE business_documents SET posting_profile_snapshot=$2 WHERE id=$1`,[doc.id,profile.snapshot]);
  return{profileCode:profile.code,profileVersion:profile.version,debit:debitTotal,credit:creditTotal};
}
async function postAccounting(client,doc,user){if(doc.documentType==='JOURNAL')return postManualJournal(client,doc,user);if(doc.documentType==='PAYROLL_RUN')return postPayroll(client,doc,user);const trigger=POSTING_TRIGGER[doc.documentType];if(!trigger||doc.status!==trigger)return null;if(!await claimPosting(client,doc,user,'ACCOUNTING'))return{replay:true};const amount=Number(doc.amount);if(!(amount>0))throw new AppError('VALIDATION_ERROR','Nilai posting jurnal harus lebih dari nol.');const period=await ensureOpenPeriod(client,doc);const posted=await postFromProfile(client,doc,user,{transactionType:doc.documentType,amounts:{AMOUNT:amount},memoBase:'auto posting'});await finishPosting(client,doc,'ACCOUNTING',{period,...posted,amount});return{period,...posted,amount};}
async function postManualJournal(client,doc,user){if(doc.status!=='APPROVED')return null;if(!await claimPosting(client,doc,user,'ACCOUNTING'))return{replay:true};const lines=doc.payload?.journalLines;if(!Array.isArray(lines)||lines.length<2)throw new AppError('VALIDATION_ERROR','Jurnal manual membutuhkan minimal dua baris.');const debit=lines.reduce((n,x)=>n+Number(x.debit||0),0),credit=lines.reduce((n,x)=>n+Number(x.credit||0),0);if(!(debit>0)||Math.abs(debit-credit)>.01)throw new AppError('VALIDATION_ERROR','Total debit dan kredit jurnal harus seimbang.');const period=await ensureOpenPeriod(client,doc),codes=[...new Set(lines.map(x=>String(x.accountCode||'')))],accounts=await accountMap(client,codes);if(codes.some(code=>!accounts[code]))throw new AppError('RESOURCE_NOT_FOUND','Salah satu akun jurnal tidak ditemukan.');for(const line of lines){const d=Number(line.debit||0),c=Number(line.credit||0);if(d<0||c<0||d&&c||!d&&!c)throw new AppError('VALIDATION_ERROR','Baris jurnal harus memiliki tepat satu sisi debit/kredit.');await client.query(`INSERT INTO journal_lines(id,journal_document_id,account_id,debit,credit,memo) VALUES($1,$2,$3,$4,$5,$6)`,[randomUUID(),doc.id,accounts[line.accountCode],d,c,String(line.memo||doc.title).slice(0,500)]);}await finishPosting(client,doc,'ACCOUNTING',{period,debit,credit,manual:true});return{period,debit,credit,manual:true};}
async function postPayroll(client,doc,user){if(doc.status!=='APPROVED')return null;if(!await claimPosting(client,doc,user,'ACCOUNTING'))return{replay:true};const net=Number(doc.amount),tax=Number(doc.payload?.pph21||0),bpjs=Number(doc.payload?.bpjs||0),period=await ensureOpenPeriod(client,doc);
  // Kaki payroll dari posting profile: NET, TAX, BPJS_COMPANY dipetakan ke akun.
  const posted=await postFromProfile(client,doc,user,{transactionType:'PAYROLL_RUN',amounts:{NET:net,TAX:tax,BPJS_COMPANY:bpjs},memoBase:'payroll'});await finishPosting(client,doc,'ACCOUNTING',{period,net,tax,bpjs,...posted});return{period,net,tax,bpjs,...posted};}
async function postDocument(client,doc,user){return{inventory:await postInventory(client,doc,user),accounting:await postAccounting(client,doc,user)};}
module.exports={syncDocumentLines,postInventory,postAccounting,postManualJournal,postPayroll,postFromProfile,postDocument,applyBalance:balance,claimPosting,finishPosting,ensureOpenPeriod};
