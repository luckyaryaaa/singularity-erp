'use strict';
const {randomUUID}=require('node:crypto');const {AppError}=require('../../../core/errors');
const accountingConfig=require('./accounting-config');

// Normalisasi + validasi baris (murni, tanpa DB) — dipakai untuk menghitung
// total otoritatif SEBELUM dokumen disimpan, dan untuk menulis baris.
function normalizeLines(lines){
  if(!Array.isArray(lines))return null;
  if(lines.length>500)throw new AppError('VALIDATION_ERROR','Maksimal 500 baris per dokumen.');
  return lines.map((line,i)=>{
    const qty=Number(line.qty),price=Number(line.unitPrice??line.price??0),discount=Number(line.discountPct||0),tax=Number(line.taxPct??0);
    if(!(qty>0)||price<0||discount<0||discount>100||tax<0||tax>100)throw new AppError('VALIDATION_ERROR',`Baris ${i+1} tidak valid.`);
    const base=qty*price*(1-discount/100);
    // P1-4: sourceLineId menautkan baris ini ke baris pesanan yang dipenuhinya.
    return{lineNo:i+1,productId:line.productId||null,description:line.description||line.name||`Baris ${i+1}`,qty,uom:line.uom||null,price,discount,tax,sourceLineId:line.sourceLineId||null,total:Math.round((base+base*tax/100)*100)/100};
  });
}
const lineSubtotalOf=(normalized)=>Math.round(normalized.reduce((s,l)=>s+l.total,0)*100)/100;

async function syncDocumentLines(client,documentId,lines){
  const normalized=normalizeLines(lines);
  if(!normalized)return null;
  await client.query('DELETE FROM document_lines WHERE document_id=$1',[documentId]);
  for(const l of normalized)await client.query(`INSERT INTO document_lines(id,document_id,line_no,product_id,description,qty,uom,unit_price,discount_pct,tax_pct,line_total,source_line_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,[randomUUID(),documentId,l.lineNo,l.productId,l.description,l.qty,l.uom,l.price,l.discount,l.tax,l.total,l.sourceLineId]);
  return lineSubtotalOf(normalized);
}

// P1-4 — pemenuhan tidak boleh melampaui yang dipesan.
//
// Tanpa pemeriksaan ini, tautan baris hanya menjadi hiasan: seseorang dapat
// mengirim 100 unit atas baris pesanan 10 unit dan sistem tetap menganggapnya
// sah. Aturannya sejajar dengan retur RMA (P0-L) dan three-way match (P0-O):
// klaim terdahulu ikut diperhitungkan, dan draf tidak mengunci sisa pesanan.
async function assertFulfilmentWithinOrder(client,{documentId,documentType,partyId,lines,requireLinked=false}){
  const normalized=normalizeLines(lines);
  if(!normalized)return null;
  const linked=normalized.filter(l=>l.sourceLineId);
  const unlinked=normalized.filter(l=>!l.sourceLineId);
  if(requireLinked&&unlinked.length)
    throw new AppError('VALIDATION_ERROR','Seluruh baris dokumen turunan wajib ditautkan ke baris sales order sumber.');
  if(!linked.length)return null;
  if(!['DELIVERY','INVOICE'].includes(documentType))
    throw new AppError('VALIDATION_ERROR',`Dokumen ${documentType} tidak dapat memenuhi baris pesanan.`);

  // Satu payload dapat membawa beberapa baris yang menunjuk source line sama.
  // Validasi per-baris akan meloloskan 6+6 terhadap sisa 10; agregasikan dulu.
  const groups=new Map();
  for(const line of linked){
    const key=String(line.sourceLineId),current=groups.get(key)||{...line,qty:0,lineNos:[]};
    if(current.productId&&line.productId&&String(current.productId)!==String(line.productId))
      throw new AppError('VALIDATION_ERROR',`Baris ${current.lineNos.concat(line.lineNo).join(', ')} menunjuk baris pesanan yang sama tetapi memakai produk berbeda.`);
    current.qty+=line.qty;current.lineNos.push(line.lineNo);groups.set(key,current);
  }
  const checked=[];
  for(const line of groups.values()){
    // Serialisasi seluruh create/update/transition untuk source line yang sama.
    // Lock transaksi mencegah dua request paralel sama-sama membaca sisa lama.
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`fulfilment:${line.sourceLineId}`]);
    const source=(await client.query(`SELECT f.*,d.status order_status FROM sales_order_line_fulfilment f
      JOIN business_documents d ON d.id=f.sales_order_id WHERE f.line_id=$1`,[line.sourceLineId])).rows[0];
    if(!source)throw new AppError('RESOURCE_NOT_FOUND',`Baris pesanan ${line.sourceLineId} tidak ditemukan.`);
    if(['DRAFT','REVISION_REQUIRED','CANCELLED','VOID','REJECTED'].includes(source.order_status))
      throw new AppError('STATUS_INVALID',`Sales order ${source.sales_order_number} berstatus ${source.order_status} — belum dapat dipenuhi.`);
    if(partyId&&source.party_id&&String(partyId)!==String(source.party_id))
      throw new AppError('VALIDATION_ERROR',`Baris pesanan ${source.sales_order_number} milik pelanggan lain.`,{orderPartyId:source.party_id});
    if(line.productId&&source.product_id&&String(line.productId)!==String(source.product_id))
      throw new AppError('VALIDATION_ERROR',`Produk baris ${line.lineNo} tidak cocok dengan baris pesanan ${source.sales_order_number}.`);

    // Saat dokumen ini disimpan ulang, barisnya sendiri masih terhitung pada
    // view — kurangi supaya penyuntingan tidak dianggap penambahan.
    const own=documentId?Number((await client.query(
      `SELECT COALESCE(sum(qty),0)::float q FROM document_lines l JOIN business_documents d ON d.id=l.document_id
       WHERE l.source_line_id=$1 AND l.document_id=$2
         AND d.status NOT IN('DRAFT','REVISION_REQUIRED','CANCELLED','VOID','REJECTED')`,
      [line.sourceLineId,documentId])).rows[0].q):0;
    const already=documentType==='DELIVERY'?Number(source.delivered_qty)-own:Number(source.invoiced_qty)-own;
    const cap=documentType==='DELIVERY'?Number(source.ordered_qty):Number(source.delivered_qty);
    const available=Math.round((cap-already)*1e6)/1e6;
    if(line.qty>available){
      throw new AppError('VALIDATION_ERROR',
        documentType==='DELIVERY'
          ? `Baris ${line.lineNos.join(', ')}: pengiriman ${line.qty} melebihi sisa pesanan ${available} pada ${source.sales_order_number} (dipesan ${source.ordered_qty}, sudah dikirim ${already}).`
          : `Baris ${line.lineNos.join(', ')}: tagihan ${line.qty} melebihi yang sudah dikirim ${available} pada ${source.sales_order_number}.`,
        {salesOrderNumber:source.sales_order_number,orderedQty:Number(source.ordered_qty),alreadyFulfilled:already,availableQty:available});
    }
    checked.push({lineNos:line.lineNos,sourceLineId:line.sourceLineId,salesOrderId:source.sales_order_id,availableQty:available,requestedQty:line.qty});
  }
  return checked;
}

// Ringkasan pemenuhan sebuah sales order — dasar layar dan ATP/CTP.
async function orderFulfilment(client,salesOrderId){
  const rows=(await client.query(`SELECT * FROM sales_order_line_fulfilment WHERE sales_order_id=$1 ORDER BY line_no`,[salesOrderId])).rows;
  const totals=rows.reduce((acc,r)=>({ordered:acc.ordered+r.ordered_qty,delivered:acc.delivered+r.delivered_qty,invoiced:acc.invoiced+r.invoiced_qty,remaining:acc.remaining+r.remaining_qty}),
    {ordered:0,delivered:0,invoiced:0,remaining:0});
  const status=!rows.length?'NO_LINES':totals.remaining<=0?'FULFILLED':totals.delivered>0?'PARTIAL':'OPEN';
  return {salesOrderId,status,totals,lines:rows.map(r=>({lineId:r.line_id,lineNo:r.line_no,productId:r.product_id,description:r.description,uom:r.uom,
    orderedQty:r.ordered_qty,deliveredQty:r.delivered_qty,invoicedQty:r.invoiced_qty,remainingQty:r.remaining_qty}))};
}

// P0-I: total dokumen dihitung SERVER dari baris + diskon/pajak header.
// Klien boleh mengirim `amount`, tetapi nilai itu hanya diterima bila cocok
// dengan hitungan server — mencegah header Rp10 jt dengan baris Rp100 jt
// (memengaruhi ambang approval, margin, eksposur kredit, pajak, dan laporan).
// Urutan: subtotal baris → diskon header → pajak header → biaya angkut/
// surcharge level header (landed cost, mis. freight dari RFQ terpilih).
function authoritativeTotal(lineSubtotal,payload={}){
  const discountPct=Number(payload.discountPct||0),taxPct=Number(payload.taxPct||0);
  const freight=Number(payload.freightTotal||payload.freight||0),surcharge=Number(payload.surchargeTotal||0);
  if(discountPct<0||discountPct>100||taxPct<0||taxPct>100)throw new AppError('VALIDATION_ERROR','Diskon/pajak header harus di antara 0 dan 100 persen.');
  if(freight<0||surcharge<0)throw new AppError('VALIDATION_ERROR','Biaya angkut/surcharge tidak boleh negatif.');
  const discount=lineSubtotal*discountPct/100,taxed=(lineSubtotal-discount)*taxPct/100;
  return Math.round((lineSubtotal-discount+taxed+freight+surcharge)*100)/100;
}
// Kontrak: total header TIDAK dipercaya dari klien.
//  - amount dikosongkan (0/undefined) → server MENURUNKAN total dari baris.
//  - amount diisi                      → wajib cocok, selisih ditolak.
// Mengirim 0 bukan celah: nilainya diganti total sebenarnya, sehingga ambang
// approval, margin, dan eksposur kredit tetap memakai angka yang benar.
function assertAmountMatchesLines(submitted,expected,{documentType}={}){
  const value=Number(submitted||0);
  if(value===0)return expected;
  if(Math.abs(value-expected)<=0.01)return expected;
  throw new AppError('VALIDATION_ERROR',
    `Total ${documentType||'dokumen'} tidak cocok dengan rincian baris: dikirim ${value.toLocaleString('id-ID')}, hasil hitung server ${expected.toLocaleString('id-ID')}.`,
    {expectedAmount:expected,submittedAmount:value});
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
  // Sprint 9: RMA diposting saat COMPLETED — RESTOCK menghidupkan stok + lot
  // retur; nilai retur dijurnal via posting profile RMA-DEFAULT.
  if(doc.documentType==='RMA'){
    if(doc.status!=='COMPLETED')return null;
    if(!await claimPosting(client,doc,user,'INVENTORY'))return{replay:true};
    const salesO2c=require('./sales-o2c');
    const rma=await salesO2c.postRma(client,doc,user);
    await finishPosting(client,doc,'INVENTORY',{rma:{restocked:rma.restocked,scrapOrRepair:rma.scrapOrRepair}});
    return rma;
  }
  // Stock opname diposting saat APPROVED (checker ≠ maker sudah lolos SoD).
  if(doc.documentType==='STOCK_OPNAME'){
    if(doc.status!=='APPROVED')return null;
    if(!await claimPosting(client,doc,user,'INVENTORY'))return{replay:true};
    const lots=require('./inventory');
    const opname=await lots.postOpname(client,doc,user);
    await finishPosting(client,doc,'INVENTORY',{opname:{adjusted:opname.adjusted,gain:opname.gain,loss:opname.loss}});
    return opname;
  }
  // DELIVERY sebelumnya TIDAK ada di daftar ini: mengirim barang ke pelanggan
  // sama sekali tidak mengurangi stok. Terbukti terukur — kirim 20 unit dari
  // saldo 50 menyisakan 50, nol baris pergerakan. Akibatnya stok tidak pernah
  // habis, HPP mustahil dihitung (tidak ada pergerakan keluar untuk dinilai),
  // dan eksposur kredit "pengiriman belum ditagih" bersandar pada dokumen yang
  // tidak pernah menyentuh ledger.
  const types={GOODS_RECEIPT:'RECEIPT',MATERIAL_ISSUE:'ISSUE',DELIVERY:'ISSUE',STOCK_ADJUSTMENT:'ADJUSTMENT',STOCK_TRANSFER:'TRANSFER_OUT'};if(!types[doc.documentType]||doc.status!=='COMPLETED')return null;if(!await claimPosting(client,doc,user,'INVENTORY'))return{replay:true};
  // Sprint 10: service receipt — penerimaan jasa TANPA mutasi stok/lot; claim
  // tetap dicatat sebagai bukti penerimaan untuk three-way match.
  if(doc.documentType==='GOODS_RECEIPT'&&doc.payload?.receiptType==='SERVICE'){
    await finishPosting(client,doc,'INVENTORY',{service:true,amount:Number(doc.amount)});
    return{service:true,movements:[]};
  }
  const lines=(await client.query('SELECT * FROM document_lines WHERE document_id=$1 ORDER BY line_no',[doc.id])).rows;if(!lines.length)throw new AppError('VALIDATION_ERROR','Posting stok membutuhkan baris dokumen.');const result=[];const lots=require('./inventory');
  for(const line of lines){const qty=Number(line.qty);
    if(doc.documentType==='GOODS_RECEIPT'){const wh=doc.payload?.warehouseId||doc.branchId;result.push(await balance(client,line.product_id,wh,qty,user,doc,'RECEIPT'));
      await lots.receiveLotLine(client,doc,line,wh,user); // lot + heat number per baris GR
    }else if(doc.documentType==='MATERIAL_ISSUE'||doc.documentType==='DELIVERY'){const wh=doc.payload?.warehouseId||doc.branchId;result.push(await balance(client,line.product_id,wh,-qty,user,doc,'ISSUE'));
      await lots.consumeLots(client,{productId:line.product_id,warehouseId:wh,qty,doc,user,type:'ISSUE'}); // konsumsi FIFO — sama untuk pengeluaran produksi maupun pengiriman pelanggan
    }else if(doc.documentType==='STOCK_ADJUSTMENT'){const wh=doc.payload?.warehouseId||doc.branchId;const out=doc.payload?.adjustmentDirection==='OUT';result.push(await balance(client,line.product_id,wh,out?-qty:qty,user,doc,'ADJUSTMENT'));
      if(out)await lots.consumeLots(client,{productId:line.product_id,warehouseId:wh,qty,doc,user,type:'ADJUST_OUT'});
      else await lots.receiveLotLine(client,doc,line,wh,user,{movementType:'ADJUST_IN',lotPrefix:'A'});
    }else{const to=doc.payload?.toWarehouseId;if(!to)throw new AppError('VALIDATION_ERROR','Gudang tujuan wajib untuk transfer.');const from=doc.payload?.fromWarehouseId||doc.branchId;
      result.push(await balance(client,line.product_id,from,-qty,user,doc,'TRANSFER_OUT'));result.push(await balance(client,line.product_id,to,qty,user,doc,'TRANSFER_IN'));
      await lots.transferLots(client,{productId:line.product_id,fromWarehouseId:from,toWarehouseId:to,qty,doc,user}); // lot anak mewarisi heat/cert
    }}
  // Sprint 12: MATERIAL_ISSUE milik WO → catat issued_qty + lepas reservasi.
  if(doc.documentType==='MATERIAL_ISSUE'&&doc.payload?.workOrderId){const production=require('./production');await production.onMaterialIssued(client,doc,user);}
  await finishPosting(client,doc,'INVENTORY',{movements:result});return{movements:result};
}
// Status pemicu posting per tipe; AKUN ditentukan posting_profiles (bukan hardcoded).
const POSTING_TRIGGER={INVOICE:'APPROVED',CUSTOMER_PAYMENT:'CLOSED',SUPPLIER_INVOICE:'APPROVED',SUPPLIER_PAYMENT:'CLOSED',EXPENSE:'CLOSED'};

// Persediaan perpetual (migrasi 062). Dokumen di sini menjurnal NILAI
// PERSEDIAAN dari inventory_movements (qty x unit_cost), bukan nilai header
// yang memuat pajak dan ongkos angkut. Sebelum ini penerimaan barang dan
// pengeluaran material tidak menyentuh buku besar sama sekali, dan HPP tidak
// pernah diakui — pendapatan berdiri tanpa biaya lawan.
const PERPETUAL_TRIGGER={GOODS_RECEIPT:'COMPLETED',MATERIAL_ISSUE:'COMPLETED',DELIVERY:'COMPLETED'};

// Nilai mutlak pergerakan persediaan sebuah dokumen. Dipakai sebagai dasar
// jurnal supaya buku besar dan ledger persediaan tidak pernah berbeda.
async function movementValue(client,documentId){
  const row=(await client.query(
    `SELECT COALESCE(SUM(ABS(qty*COALESCE(unit_cost,0))),0)::float v FROM inventory_movements WHERE document_id=$1`,
    [documentId])).rows[0];
  return Math.round(Number(row.v)*100)/100;
}

// Jurnal persediaan perpetual. Dijalankan setelah pergerakan stok tercatat,
// memakai claim ACCOUNTING yang sama sehingga tidak pernah ganda.
async function postPerpetualInventory(client,doc,user){
  const trigger=PERPETUAL_TRIGGER[doc.documentType];
  if(!trigger||doc.status!==trigger)return null;
  const value=await movementValue(client,doc.id);
  // Dokumen tanpa pergerakan bernilai (mis. penerimaan jasa) tidak dijurnal —
  // biayanya diakui lewat tagihan supplier, bukan lewat persediaan.
  if(!(value>0))return null;
  if(!await claimPosting(client,doc,user,'ACCOUNTING'))return{replay:true};
  const period=await ensureOpenPeriod(client,doc);
  const posted=await postFromProfile(client,doc,user,{transactionType:doc.documentType,amounts:{VALUE:value},memoBase:'persediaan perpetual'});
  await finishPosting(client,doc,'ACCOUNTING',{period,value,...posted});
  return{period,value,...posted};
}
// Periode posting: payload.period bila dokumen menyatakannya (payroll, jurnal
// manual ber-periode, run penyusutan) — selaras dengan ledger/closing yang
// memakai COALESCE(payload.period, created_at); selain itu tanggal dokumen.
// P0-H: status periode per Legal Entity (bukan satu status global aplikasi).
async function ensureOpenPeriod(client,doc){const stamp=/^\d{4}-\d{2}$/.test(String(doc.payload?.period||''))?`${doc.payload.period}-01`:doc.createdAt instanceof Date?doc.createdAt.toISOString():String(doc.createdAt||new Date().toISOString()),period=stamp.slice(0,7);const entityId=doc.legal_entity_id||doc.legalEntityId||await accountingConfig.defaultLegalEntityId(client);await client.query(`INSERT INTO accounting_periods(id,legal_entity_id,period,status) VALUES($1,$2,$3,'OPEN') ON CONFLICT(legal_entity_id,period) DO NOTHING`,[randomUUID(),entityId,period]);const p=(await client.query('SELECT status FROM accounting_periods WHERE legal_entity_id=$1 AND period=$2 FOR UPDATE',[entityId,period])).rows[0];if(p.status!=='OPEN')throw new AppError('STATUS_INVALID',`Periode ${period} sudah ditutup.`);return period;}
async function accountMap(client,codes){return(await client.query('SELECT id,code FROM chart_of_accounts WHERE code=ANY($1) AND active',[codes])).rows.reduce((o,r)=>(o[r.code]=r.id,o),{});}

// Wave D.1 — coding block dimensi. loadAccounts membawa kategori akun agar
// kebijakan dimensi dapat diterapkan; accountMap lama tetap ada untuk pemanggil
// yang tidak butuh kategori.
async function loadAccounts(client,codes){
  return(await client.query('SELECT id,code,category FROM chart_of_accounts WHERE code=ANY($1) AND active',[codes]))
    .rows.reduce((o,r)=>(o[r.code]={id:r.id,category:r.category},o),{});
}
async function dimensionPolicy(client){
  return(await client.query('SELECT category,requires_cost_center,requires_profit_center,requires_project FROM account_dimension_policy'))
    .rows.reduce((o,r)=>(o[r.category]=r,o),{});
}
// Mode penegakan: OFF (abaikan dimensi), SOFT (validasi FK yang dikirim, wajib
// tidak dipaksa), HARD (paksa dimensi wajib per kebijakan). Default SOFT.
function dimensionEnforcement(){const m=String(process.env.MAT_JOURNAL_DIMENSION_ENFORCEMENT||'SOFT').toUpperCase();return['OFF','SOFT','HARD'].includes(m)?m:'SOFT';}
// Validasi dimensi satu baris jurnal. `dims` hanya diterapkan bila kebijakan
// akunnya memang mengenal dimensi (P&L); baris neraca tetap NULL.
async function resolveLineDimensions(client,{category,dims={},policy,enforcement,label}){
  const rule=policy[category]||{};
  const engaged=!!(rule.requires_cost_center||rule.requires_profit_center||rule.requires_project);
  if(enforcement==='OFF'||!engaged)return{costCenterId:null,profitCenterId:null,projectWbsId:null};
  const cc=dims.costCenterId||null,pc=dims.profitCenterId||null,pj=dims.projectWbsId||null;
  const check=async(table,id,name)=>{if(!id)return;if(!(await client.query(`SELECT 1 FROM ${table} WHERE id=$1`,[id])).rows[0])throw new AppError('VALIDATION_ERROR',`${label}: ${name} tidak ditemukan.`);};
  await check('cost_centers',cc,'Cost center');await check('profit_centers',pc,'Profit center');await check('project_wbs',pj,'Project WBS');
  if(enforcement==='HARD'){
    if(rule.requires_cost_center&&!cc)throw new AppError('VALIDATION_ERROR',`${label}: akun ${category} wajib cost center.`);
    if(rule.requires_profit_center&&!pc)throw new AppError('VALIDATION_ERROR',`${label}: akun ${category} wajib profit center.`);
    if(rule.requires_project&&!pj)throw new AppError('VALIDATION_ERROR',`${label}: akun ${category} wajib project.`);
  }
  return{costCenterId:cc,profitCenterId:pc,projectWbsId:pj};
}
// Bangun & simpan jurnal dari posting profile (configuration-driven §18.2).
// amounts = peta amount_source → nilai (mis. {AMOUNT, NET, TAX, BPJS_COMPANY}).
async function postFromProfile(client,doc,user,{transactionType,amounts,memoBase}){
  const profile=await accountingConfig.resolvePostingProfile(client,{transactionType,legalEntityId:doc.legal_entity_id||null,branchId:doc.branch_id||null,onDate:(doc.createdAt instanceof Date?doc.createdAt.toISOString():String(doc.createdAt||'')).slice(0,10)||undefined});
  if(!profile)throw new AppError('RESOURCE_NOT_FOUND',`Posting profile untuk ${transactionType} belum dikonfigurasi.`);
  const codes=[...new Set(profile.legs.map(l=>l.account_code))],accounts=await loadAccounts(client,codes);
  const missing=codes.filter(c=>!accounts[c]);if(missing.length)throw new AppError('RESOURCE_NOT_FOUND',`Akun posting belum ada di COA: ${missing.join(', ')}.`);
  // Wave D.1 — dimensi diturunkan dari dokumen (payload) untuk kaki P&L.
  const policy=await dimensionPolicy(client),enforcement=dimensionEnforcement();
  const docDims={costCenterId:doc.payload?.costCenterId||null,profitCenterId:doc.payload?.profitCenterId||null,projectWbsId:doc.payload?.projectWbsId||null};
  let debitTotal=0,creditTotal=0;
  for(const leg of profile.legs){const value=Math.round(Number(amounts[leg.amount_source]||0)*100)/100;if(!value)continue;const acct=accounts[leg.account_code],debit=leg.side==='D'?value:0,credit=leg.side==='C'?value:0;debitTotal+=debit;creditTotal+=credit;const dim=await resolveLineDimensions(client,{category:acct.category,dims:docDims,policy,enforcement,label:`${doc.documentNumber} · ${leg.account_code}`});await client.query(`INSERT INTO journal_lines(id,journal_document_id,account_id,debit,credit,memo,cost_center_id,profit_center_id,project_wbs_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[randomUUID(),doc.id,acct.id,debit,credit,`${doc.documentNumber} · ${memoBase}${leg.memo_suffix?' '+leg.memo_suffix:''}`,dim.costCenterId,dim.profitCenterId,dim.projectWbsId]);}
  if(Math.abs(debitTotal-creditTotal)>.01)throw new AppError('VALIDATION_ERROR',`Jurnal ${transactionType} tidak seimbang (D ${debitTotal} vs C ${creditTotal}).`);
  await client.query(`UPDATE business_documents SET posting_profile_snapshot=$2 WHERE id=$1`,[doc.id,profile.snapshot]);
  return{profileCode:profile.code,profileVersion:profile.version,debit:debitTotal,credit:creditTotal};
}
async function postAccounting(client,doc,user){if(doc.documentType==='JOURNAL')return postManualJournal(client,doc,user);if(doc.documentType==='PAYROLL_RUN')return postPayroll(client,doc,user);if(PERPETUAL_TRIGGER[doc.documentType])return postPerpetualInventory(client,doc,user);const trigger=POSTING_TRIGGER[doc.documentType];if(!trigger||doc.status!==trigger)return null;if(!await claimPosting(client,doc,user,'ACCOUNTING'))return{replay:true};const amount=Number(doc.amount);if(!(amount>0))throw new AppError('VALIDATION_ERROR','Nilai posting jurnal harus lebih dari nol.');const period=await ensureOpenPeriod(client,doc);const posted=await postFromProfile(client,doc,user,{transactionType:doc.documentType,amounts:{AMOUNT:amount},memoBase:'auto posting'});await finishPosting(client,doc,'ACCOUNTING',{period,...posted,amount});return{period,...posted,amount};}
async function postManualJournal(client,doc,user){if(doc.status!=='APPROVED')return null;if(!await claimPosting(client,doc,user,'ACCOUNTING'))return{replay:true};const lines=doc.payload?.journalLines;if(!Array.isArray(lines)||lines.length<2)throw new AppError('VALIDATION_ERROR','Jurnal manual membutuhkan minimal dua baris.');const debit=lines.reduce((n,x)=>n+Number(x.debit||0),0),credit=lines.reduce((n,x)=>n+Number(x.credit||0),0);if(!(debit>0)||Math.abs(debit-credit)>.01)throw new AppError('VALIDATION_ERROR','Total debit dan kredit jurnal harus seimbang.');const period=await ensureOpenPeriod(client,doc),codes=[...new Set(lines.map(x=>String(x.accountCode||'')))],accounts=await loadAccounts(client,codes);if(codes.some(code=>!accounts[code]))throw new AppError('RESOURCE_NOT_FOUND','Salah satu akun jurnal tidak ditemukan.');const policy=await dimensionPolicy(client),enforcement=dimensionEnforcement();for(const line of lines){const d=Number(line.debit||0),c=Number(line.credit||0);if(d<0||c<0||d&&c||!d&&!c)throw new AppError('VALIDATION_ERROR','Baris jurnal harus memiliki tepat satu sisi debit/kredit.');const acct=accounts[line.accountCode],dim=await resolveLineDimensions(client,{category:acct.category,dims:{costCenterId:line.costCenterId,profitCenterId:line.profitCenterId,projectWbsId:line.projectWbsId},policy,enforcement,label:`Jurnal ${doc.documentNumber} · ${line.accountCode}`});await client.query(`INSERT INTO journal_lines(id,journal_document_id,account_id,debit,credit,memo,cost_center_id,profit_center_id,project_wbs_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[randomUUID(),doc.id,acct.id,d,c,String(line.memo||doc.title).slice(0,500),dim.costCenterId,dim.profitCenterId,dim.projectWbsId]);}await finishPosting(client,doc,'ACCOUNTING',{period,debit,credit,manual:true});return{period,debit,credit,manual:true};}
async function postPayroll(client,doc,user){if(doc.status!=='APPROVED')return null;if(!await claimPosting(client,doc,user,'ACCOUNTING'))return{replay:true};const net=Number(doc.amount),tax=Number(doc.payload?.pph21||0),bpjs=Number(doc.payload?.bpjs||0),period=await ensureOpenPeriod(client,doc);
  // Kaki payroll dari posting profile: NET, TAX, BPJS_COMPANY dipetakan ke akun.
  const posted=await postFromProfile(client,doc,user,{transactionType:'PAYROLL_RUN',amounts:{NET:net,TAX:tax,BPJS_COMPANY:bpjs},memoBase:'payroll'});await finishPosting(client,doc,'ACCOUNTING',{period,net,tax,bpjs,...posted});return{period,net,tax,bpjs,...posted};}
async function postDocument(client,doc,user){return{inventory:await postInventory(client,doc,user),accounting:await postAccounting(client,doc,user)};}
module.exports={syncDocumentLines,normalizeLines,postPerpetualInventory,movementValue,assertFulfilmentWithinOrder,orderFulfilment,lineSubtotalOf,authoritativeTotal,assertAmountMatchesLines,postInventory,postAccounting,postManualJournal,postPayroll,postFromProfile,postDocument,applyBalance:balance,claimPosting,finishPosting,ensureOpenPeriod,loadAccounts,dimensionPolicy,resolveLineDimensions,dimensionEnforcement};
