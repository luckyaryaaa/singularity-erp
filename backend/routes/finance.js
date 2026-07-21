'use strict';
const { readBody } = require('../core/util');
const { AppError } = require('../core/errors');
const { assertPermission } = require('../core/permissions');
const { verifyPassword } = require('../core/password');
const businessOps = require('../infrastructure/database/repositories/business-operations');
const runtime = require('../infrastructure/database/repositories/runtime');
const fixedAssets = require('../infrastructure/database/repositories/fixed-assets');
const financeReports = require('../infrastructure/database/repositories/finance-reports');
const taxCompliance = require('../infrastructure/database/repositories/tax-compliance');
const { NO_MATCH } = require('./shared');

async function dispatch(client, req, url, ctx) {
  const p=url.pathname, method=req.method;
  let m;
  if(method==='GET'&&p==='/api/accounting/summary'){assertPermission(ctx.user,'journal.view');return businessOps.accountingSummary(client,url.searchParams.get('period'),ctx.user);}
  if(method==='GET'&&p==='/api/accounting/accounts'){assertPermission(ctx.user,'journal.view');return{items:(await client.query('SELECT id,code,name,normal_side,category FROM chart_of_accounts WHERE active ORDER BY code')).rows.map(runtime.camel)};}
  // Posting profiles (§18.2) — determinasi akun configuration-driven, tampil read-only.
  if(method==='GET'&&p==='/api/accounting/posting-profiles'){assertPermission(ctx.user,'journal.view');const profiles=(await client.query(`SELECT pp.id,pp.code,pp.transaction_type,pp.item_category,pp.priority,pp.version,pp.effective_from,pp.active,pp.description,
    json_agg(json_build_object('legNo',l.leg_no,'side',l.side,'account',l.account_code,'source',l.amount_source) ORDER BY l.leg_no) legs
    FROM posting_profiles pp LEFT JOIN posting_profile_legs l ON l.profile_id=pp.id WHERE pp.active GROUP BY pp.id ORDER BY pp.transaction_type,pp.priority`)).rows.map(runtime.camel);return{items:profiles};}
  // Payroll rule versions (§19.5) — tarif BPJS/PTKP/PPh21 effective-dated.
  if(method==='GET'&&p==='/api/accounting/payroll-rules'){assertPermission(ctx.user,'payroll.view');return{items:(await client.query(`SELECT rule_type,version,effective_from,effective_until,active,config,description FROM payroll_rule_versions WHERE active ORDER BY rule_type,effective_from DESC`)).rows.map(runtime.camel)};}
  if(method==='GET'&&p==='/api/accounting/ledger'){assertPermission(ctx.user,'ledger.view');return businessOps.ledger(client,{...Object.fromEntries(url.searchParams),user:ctx.user});}
  if(method==='POST'&&p==='/api/accounting/period/close'){assertPermission(ctx.user,'closing.post');const body=await readBody(req),result=await businessOps.closePeriod(client,{period:body.period,user:ctx.user});await runtime.audit(client,{userId:ctx.user.id,action:'CLOSE_PERIOD',module:'closing',entityType:'ACCOUNTING_PERIOD',newValue:result,reason:body.reason||'Tutup periode',requestId:ctx.requestId,branchId:ctx.user.branchId});return result;}
  if(method==='POST'&&p==='/api/accounting/period/reopen'){assertPermission(ctx.user,'closing.edit');if(ctx.user.role!=='owner')throw new AppError('PERMISSION_DENIED','Hanya Owner yang dapat membuka kembali periode.');const body=await readBody(req),row=(await client.query('SELECT owner_pin_hash FROM app_users WHERE id=$1',[ctx.user.id])).rows[0];if(!body.pin||!row?.owner_pin_hash||!verifyPassword(String(body.pin),row.owner_pin_hash))throw new AppError('PIN_REQUIRED');const result=await businessOps.reopenPeriod(client,{period:body.period,user:ctx.user,reason:body.reason});await runtime.audit(client,{userId:ctx.user.id,action:'REOPEN_PERIOD',module:'closing',entityType:'ACCOUNTING_PERIOD',newValue:result,reason:body.reason,requestId:ctx.requestId,branchId:ctx.user.branchId});return result;}
  if(method==='POST'&&p==='/api/payments/allocate'){assertPermission(ctx.user,'payment.post');const body=await readBody(req),result=await businessOps.allocatePayment(client,{...body,user:ctx.user});await runtime.audit(client,{userId:ctx.user.id,action:'ALLOCATE_PAYMENT',module:'payment',entityType:'PAYMENT_ALLOCATION',entityId:result.allocation.id,newValue:result,requestId:ctx.requestId,branchId:ctx.user.branchId});return result;}
  // ── Sprint 13: fixed asset, depresiasi, laporan keuangan, cockpit ─────────
  if(method==='GET'&&p==='/api/assets'){assertPermission(ctx.user,'asset.view');return fixedAssets.listAssets(client,ctx.user,Object.fromEntries(url.searchParams));}
  if(method==='POST'&&p==='/api/assets'){assertPermission(ctx.user,'asset.create');const body=await readBody(req);const result=await runtime.withIdempotency(client,{userId:ctx.user.id,operation:'asset.create',key:req.headers['idempotency-key'],body},async()=>({status:201,body:await fixedAssets.createAsset(client,{...body,user:ctx.user,requestId:ctx.requestId})}));ctx.status=result.status;return result.body;}
  if(method==='GET'&&p==='/api/assets/categories'){assertPermission(ctx.user,'asset.view');return fixedAssets.listCategories(client);}
  m=p.match(/^\/api\/assets\/([0-9a-f-]{36})\/dispose$/);
  if(method==='POST'&&m){assertPermission(ctx.user,'asset.void');const body=await readBody(req);const result=await runtime.withIdempotency(client,{userId:ctx.user.id,operation:`asset.dispose:${m[1]}`,key:req.headers['idempotency-key'],body},async()=>({status:200,body:await fixedAssets.disposeAsset(client,{assetId:m[1],reason:body.reason,proceeds:body.proceeds,user:ctx.user,requestId:ctx.requestId})}));ctx.status=result.status;return result.body;}
  if(method==='POST'&&p==='/api/assets/depreciation/run'){assertPermission(ctx.user,'asset.post');const body=await readBody(req);const result=await runtime.withIdempotency(client,{userId:ctx.user.id,operation:`depreciation.run:${body.branchId||ctx.user.branchId}:${body.period}`,key:req.headers['idempotency-key'],body},async()=>({status:200,body:await fixedAssets.runDepreciation(client,{period:body.period,branchId:body.branchId,user:ctx.user,requestId:ctx.requestId})}));ctx.status=result.status;return result.body;}
  if(method==='GET'&&p==='/api/accounting/financial-statements'){assertPermission(ctx.user,'ledger.view');return financeReports.financialStatements(client,url.searchParams.get('period'),ctx.user);}
  if(method==='GET'&&p==='/api/accounting/closing-cockpit'){assertPermission(ctx.user,'closing.view');return financeReports.closingCockpit(client,url.searchParams.get('period'),ctx.user);}
  if(method==='GET'&&p==='/api/accounting/subledger'){assertPermission(ctx.user,'ledger.view');return financeReports.subledger(client,{type:url.searchParams.get('type')||'AR',period:url.searchParams.get('period'),user:ctx.user});}
  // Sprint 10: payment reversal — kontrol kritis setara void pembayaran:
  // hanya Owner + PIN + alasan; jurnal pembalik, alokasi ditandai reversed.
  m=p.match(/^\/api\/payments\/([0-9a-f-]{36})\/reverse$/);
  if(method==='POST'&&m){
    assertPermission(ctx.user,'payment.void');
    const body=await readBody(req);
    if(ctx.user.role!=='owner')throw new AppError('PIN_REQUIRED','Pembalikan pembayaran hanya oleh Owner dengan PIN.');
    const pinRow=(await client.query('SELECT owner_pin_hash FROM app_users WHERE id=$1',[ctx.user.id])).rows[0];
    if(!body.pin||!pinRow?.owner_pin_hash||!verifyPassword(String(body.pin),pinRow.owner_pin_hash))throw new AppError('PIN_REQUIRED');
    const result=await runtime.withIdempotency(client,{userId:ctx.user.id,operation:`payment.reverse:${m[1]}`,key:req.headers['idempotency-key'],body:{reason:body.reason}},async()=>({status:200,body:await businessOps.reversePayment(client,{paymentId:m[1],reason:body.reason,user:ctx.user,requestId:ctx.requestId})}));
    ctx.status=result.status;return result.body;
  }
  if(method==='GET'&&p==='/api/accounting/reconciliation'){assertPermission(ctx.user,'ledger.view');const period=businessOps.period(url.searchParams.get('period'));return{items:(await client.query(`SELECT * FROM reconciliation_runs WHERE period=$1 AND ($2::boolean OR branch_id=$3) ORDER BY created_at DESC`,[period,['owner','admin'].includes(ctx.user.role)||ctx.user.branchScope==='*',ctx.user.branchId])).rows.map(runtime.camel)};}
  if(method==='GET'&&p==='/api/tax/summary'){assertPermission(ctx.user,'tax.view');return businessOps.taxSummary(client,url.searchParams.get('period'),ctx.user);}
  if(method==='POST'&&p==='/api/tax/sync'){assertPermission(ctx.user,'tax.edit');const body=await readBody(req);return businessOps.syncTaxes(client,body.period,ctx.user);}
  m=p.match(/^\/api\/tax\/records\/([^/]+)\/report$/);if(method==='POST'&&m){assertPermission(ctx.user,'tax.post');const result=await businessOps.reportTax(client,m[1],ctx.user);await runtime.audit(client,{userId:ctx.user.id,action:'REPORT_TAX',module:'tax',entityType:'TAX_RECORD',entityId:m[1],newValue:result,requestId:ctx.requestId,branchId:ctx.user.branchId});return result;}

  // ── Kepatuhan pajak Indonesia: NSFP, Faktur Pajak, e-Bupot ───────────────
  if(method==='GET'&&p==='/api/tax/compliance'){assertPermission(ctx.user,'tax.view');const period=url.searchParams.get('period');const [summary,ranges,invoices,withholding,codes]=await Promise.all([taxCompliance.summary(client,period),taxCompliance.listRanges(client),taxCompliance.listTaxInvoices(client,period),taxCompliance.listWithholding(client,period),taxCompliance.listTransactionCodes(client)]);return{...summary,ranges:ranges.items,taxInvoices:invoices.items,withholding:withholding.items,transactionCodes:codes.items};}
  if(method==='POST'&&p==='/api/tax/nsfp'){assertPermission(ctx.user,'tax.edit');const body=await readBody(req);ctx.status=201;return taxCompliance.allocateRange(client,{...body,user:ctx.user,requestId:ctx.requestId});}
  if(method==='POST'&&p==='/api/tax/faktur'){assertPermission(ctx.user,'tax.post');const body=await readBody(req);ctx.status=201;return runtime.withIdempotency(client,{userId:ctx.user.id,operation:'tax.faktur',key:req.headers['idempotency-key'],body},async()=>({status:201,body:await taxCompliance.issueTaxInvoice(client,{...body,user:ctx.user,requestId:ctx.requestId})})).then(r=>{ctx.status=r.status;return r.body;});}
  m=p.match(/^\/api\/tax\/faktur\/([0-9a-f-]{36})\/(replace|cancel)$/);
  if(method==='POST'&&m){assertPermission(ctx.user,'tax.post');const body=await readBody(req);
    return m[2]==='replace'?taxCompliance.replaceTaxInvoice(client,{taxInvoiceId:m[1],...body,user:ctx.user,requestId:ctx.requestId})
      :taxCompliance.cancelTaxInvoice(client,{taxInvoiceId:m[1],reason:body.reason,user:ctx.user,requestId:ctx.requestId});}
  if(method==='POST'&&p==='/api/tax/bupot'){assertPermission(ctx.user,'tax.post');const body=await readBody(req);ctx.status=201;return taxCompliance.issueWithholding(client,{...body,user:ctx.user,requestId:ctx.requestId});}
  if(method==='GET'&&p==='/api/tax/efaktur.csv'){
    assertPermission(ctx.user,'tax.view');
    const result=await taxCompliance.exportEFaktur(client,url.searchParams.get('period'));
    await runtime.audit(client,{userId:ctx.user.id,action:'EXPORT',module:'tax',entityType:'EFAKTUR',documentNumber:result.filename,newValue:{period:result.period,count:result.count},requestId:ctx.requestId});
    ctx.download={item:{originalFilename:result.filename,mimeType:'text/csv'},buffer:Buffer.from('﻿'+result.csv,'utf8')};
    return;
  }
  return NO_MATCH;
}

module.exports={dispatch};
