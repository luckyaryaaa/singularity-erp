'use strict';
const {randomUUID,createHash}=require('node:crypto');
const {AppError}=require('../../../core/errors');
const runtime=require('./runtime');
const accountingConfig=require('./accounting-config');
const masterData=require('./master-data');
const {canonical}=require('../../../core/doc-verification');
const {assertBranchAccess,hasGlobalScope,queryScope}=require('../../../core/data-scope');

const periodOk=value=>/^\d{4}-(0[1-9]|1[0-2])$/.test(String(value||''));
function period(value){const result=value||new Date().toISOString().slice(0,7);if(!periodOk(result))throw new AppError('VALIDATION_ERROR','Periode harus berformat YYYY-MM.');return result;}

async function accountingSummary(client,value,user){
  const p=period(value),scope=queryScope(user),params=[p,scope.global,scope.branchId];
  const trial=(await client.query(`SELECT a.code,a.name,a.category,a.normal_side,
    COALESCE(sum(j.debit) FILTER(WHERE COALESCE(NULLIF(d.payload->>'period',''),to_char(d.created_at,'YYYY-MM'))=$1 AND ($2::boolean OR d.branch_id=$3)),0)::float debit,
    COALESCE(sum(j.credit) FILTER(WHERE COALESCE(NULLIF(d.payload->>'period',''),to_char(d.created_at,'YYYY-MM'))=$1 AND ($2::boolean OR d.branch_id=$3)),0)::float credit
    FROM chart_of_accounts a LEFT JOIN journal_lines j ON j.account_id=a.id LEFT JOIN business_documents d ON d.id=j.journal_document_id
    WHERE a.active GROUP BY a.id ORDER BY a.code`,params)).rows.map(runtime.camel);
  const totals=trial.reduce((o,r)=>{const net=r.normalSide==='D'?r.debit-r.credit:r.credit-r.debit;o[r.category]=(o[r.category]||0)+net;return o;},{});
  const counts=(await client.query(`SELECT count(DISTINCT j.journal_document_id)::int journals,
    (SELECT count(*)::int FROM business_documents x WHERE x.document_type='JOURNAL' AND x.status='DRAFT' AND COALESCE(NULLIF(x.payload->>'period',''),to_char(x.created_at,'YYYY-MM'))=$1 AND ($2::boolean OR x.branch_id=$3)) unposted
    FROM journal_lines j JOIN business_documents d ON d.id=j.journal_document_id
    WHERE COALESCE(NULLIF(d.payload->>'period',''),to_char(d.created_at,'YYYY-MM'))=$1 AND ($2::boolean OR d.branch_id=$3)`,params)).rows[0];
  const closing=(await client.query('SELECT * FROM accounting_periods WHERE period=$1 AND legal_entity_id=$2',[p,await accountingConfig.defaultLegalEntityId(client)])).rows[0];
  return{period:p,journals:counts.journals,unposted:counts.unposted,scope:scope.global?'GLOBAL':'BRANCH',branchId:scope.global?null:scope.branchId,profitLoss:{revenue:totals.REVENUE||0,cogs:totals.COGS||0,grossMargin:(totals.REVENUE||0)-(totals.COGS||0),opex:totals.EXPENSE||0,netIncome:(totals.REVENUE||0)-(totals.COGS||0)-(totals.EXPENSE||0)},trialBalance:trial.map(r=>({account:`${r.code} · ${r.name}`,code:r.code,debit:r.debit,credit:r.credit,balance:r.normalSide==='D'?r.debit-r.credit:r.credit-r.debit,category:r.category})),debitTotal:trial.reduce((n,r)=>n+r.debit,0),creditTotal:trial.reduce((n,r)=>n+r.credit,0),closingStatus:closing?.status||'OPEN',periodDetail:runtime.camel(closing)};
}
async function ledger(client,{period:value,accountCode,user,page=1,limit=100}={}){
  const p=period(value),scope=queryScope(user);limit=Math.min(Math.max(Number(limit)||100,1),250);page=Math.max(Number(page)||1,1);
  const params=[p,scope.global,scope.branchId];let filter=' AND ($2::boolean OR d.branch_id=$3)';
  if(accountCode){params.push(accountCode);filter+=` AND a.code=$${params.length}`;}
  const total=Number((await client.query(`SELECT count(*) n FROM journal_lines j JOIN business_documents d ON d.id=j.journal_document_id JOIN chart_of_accounts a ON a.id=j.account_id WHERE COALESCE(NULLIF(d.payload->>'period',''),to_char(d.created_at,'YYYY-MM'))=$1${filter}`,params)).rows[0].n);
  params.push(limit,(page-1)*limit);const items=(await client.query(`SELECT j.*,a.code account_code,a.name account_name,d.document_number,d.document_type,d.title,d.created_at posting_date FROM journal_lines j JOIN business_documents d ON d.id=j.journal_document_id JOIN chart_of_accounts a ON a.id=j.account_id WHERE COALESCE(NULLIF(d.payload->>'period',''),to_char(d.created_at,'YYYY-MM'))=$1${filter} ORDER BY d.created_at,j.id LIMIT $${params.length-1} OFFSET $${params.length}`,params)).rows.map(runtime.camel);
  return{items,page,limit,total,totalPages:Math.max(Math.ceil(total/limit),1),scope:scope.global?'GLOBAL':'BRANCH',branchId:scope.global?null:scope.branchId};
}
// P0-E: penutupan periode WAJIB melewati SELURUH checklist closing cockpit di
// server — bukan hanya trial balance + unposted. FAIL memblokir mutlak; WARN
// hanya boleh lewat dengan waiver tertulis yang terekam pada audit & periode.
async function closePeriod(client,{period:value,user,waiveWarnings,reason}){
  if(!hasGlobalScope(user))throw new AppError('PERMISSION_DENIED','Penutupan periode global membutuhkan scope perusahaan.');
  if(!String(reason||'').trim())throw new AppError('REASON_REQUIRED','Alasan penutupan periode wajib diisi.');
  const p=period(value);
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`closing:${p}`]);
  const summary=await accountingSummary(client,p,user);
  if(Math.abs(summary.debitTotal-summary.creditTotal)>.01)throw new AppError('VALIDATION_ERROR','Trial balance belum seimbang.');
  const unposted=Number((await client.query(`SELECT count(*) n FROM business_documents d WHERE COALESCE(NULLIF(d.payload->>'period',''),to_char(d.created_at,'YYYY-MM'))=$1 AND d.document_type IN('INVOICE','CUSTOMER_PAYMENT','SUPPLIER_INVOICE','SUPPLIER_PAYMENT','EXPENSE','PAYROLL_RUN') AND d.status NOT IN('DRAFT','CANCELLED','VOID','REJECTED') AND NOT EXISTS(SELECT 1 FROM document_postings p WHERE p.document_id=d.id AND p.posting_kind='ACCOUNTING')`,[p])).rows[0].n);
  if(unposted)throw new AppError('STATUS_INVALID',`${unposted} transaksi keuangan belum diposting.`);
  const financeReports=require('./finance-reports');
  const cockpit=await financeReports.closingCockpit(client,p,user);
  if(cockpit.readiness==='BLOCKED'){const fails=cockpit.checks.filter(x=>x.status==='FAIL').map(x=>x.name).join('; ');throw new AppError('STATUS_INVALID',`Closing diblokir oleh checklist: ${fails}`,{checks:cockpit.checks});}
  if(cockpit.readiness==='REVIEW'&&!String(waiveWarnings||'').trim()){const warns=cockpit.checks.filter(x=>x.status==='WARN').map(x=>x.name).join('; ');throw new AppError('REASON_REQUIRED',`Checklist masih WARN (${warns}). Sertakan waiveWarnings berisi alasan formal untuk melanjutkan.`,{checks:cockpit.checks});}
  const reconciliation=await financeReports.validateReconciliationEvidenceForClose(client,p);
  if(!reconciliation.ready)throw new AppError('STATUS_INVALID',`Closing membutuhkan enam evidence rekonsiliasi terbaru yang approved: ${reconciliation.issues.join('; ')}`,{reconciliation});
  const evidence={
    schemaVersion:1,period:p,generatedAt:new Date().toISOString(),
    readiness:cockpit.readiness,summary:cockpit.summary,
    checks:cockpit.checks.map(x=>({id:x.id,name:x.name,status:x.status,detail:x.detail})),
    reconciliationEvidence:reconciliation.items,
    waiver:cockpit.readiness==='REVIEW'?{reason:String(waiveWarnings).trim(),by:user.id,at:new Date().toISOString()}:null
  };
  const evidenceSha256=createHash('sha256').update(JSON.stringify(canonical(evidence))).digest('hex');
  const entityId=await accountingConfig.defaultLegalEntityId(client);
  const row=(await client.query(`INSERT INTO accounting_periods(id,legal_entity_id,period,status,closed_at,closed_by) VALUES($1,$2,$3,'CLOSED',now(),$4) ON CONFLICT(legal_entity_id,period) DO UPDATE SET status='CLOSED',closed_at=now(),closed_by=excluded.closed_by RETURNING *`,[randomUUID(),entityId,p,user.id])).rows[0];
  const closeRun=(await client.query(`INSERT INTO accounting_period_close_runs(legal_entity_id,period,evidence,evidence_sha256,close_reason,closed_by)
    VALUES($1,$2,$3,$4,$5,$6) RETURNING id,closed_at`,[entityId,p,JSON.stringify(evidence),evidenceSha256,String(reason).trim(),user.id])).rows[0];
  return{...runtime.camel(row),closingEvidence:evidence,closingEvidenceId:closeRun.id,closingEvidenceSha256:evidenceSha256};
}
async function reopenPeriod(client,{period:value,user,reason}){
  const p=period(value);if(!reason)throw new AppError('REASON_REQUIRED');
  const entityId=await accountingConfig.defaultLegalEntityId(client);
  const row=(await client.query(`UPDATE accounting_periods SET status='OPEN',reopened_at=now(),reopened_by=$2,reopen_reason=$3 WHERE period=$1 AND legal_entity_id=$4 AND status='CLOSED' RETURNING *`,[p,user.id,reason,entityId])).rows[0];
  if(!row)throw new AppError('STATUS_INVALID','Periode tidak ditemukan atau sudah terbuka.');
  await client.query(`UPDATE accounting_period_close_runs SET status='REOPENED',reopened_by=$3,reopened_at=now(),reopen_reason=$4
    WHERE id=(SELECT id FROM accounting_period_close_runs WHERE legal_entity_id=$1 AND period=$2 AND status='CLOSED' ORDER BY closed_at DESC LIMIT 1)`,
    [entityId,p,user.id,String(reason).trim()]);
  return runtime.camel(row);
}

async function allocatePayment(client,{paymentId,invoiceId,amount,user}){const value=Number(amount);if(!(value>0))throw new AppError('VALIDATION_ERROR','Nilai alokasi harus lebih dari nol.');const docs=(await client.query(`SELECT * FROM business_documents WHERE id=ANY($1::uuid[]) FOR UPDATE`,[[paymentId,invoiceId]])).rows;if(docs.length!==2)throw new AppError('RESOURCE_NOT_FOUND');const payment=docs.find(d=>d.id===paymentId),invoice=docs.find(d=>d.id===invoiceId);assertBranchAccess(user,payment.branch_id,'Pembayaran berada di cabang di luar cakupan Anda.');assertBranchAccess(user,invoice.branch_id,'Tagihan berada di cabang di luar cakupan Anda.');if(payment.branch_id!==invoice.branch_id)throw new AppError('VALIDATION_ERROR','Pembayaran dan tagihan harus berasal dari cabang yang sama.');const valid=payment.document_type==='CUSTOMER_PAYMENT'&&invoice.document_type==='INVOICE'||payment.document_type==='SUPPLIER_PAYMENT'&&invoice.document_type==='SUPPLIER_INVOICE';if(!valid)throw new AppError('VALIDATION_ERROR','Jenis pembayaran dan tagihan tidak sesuai.');if(!['APPROVED','COMPLETED','CLOSED'].includes(payment.status))throw new AppError('STATUS_INVALID','Pembayaran harus disetujui atau selesai.');if(['VOID','CANCELLED','CLOSED'].includes(invoice.status))throw new AppError('STATUS_INVALID','Tagihan tidak dapat menerima alokasi.');const used=Number((await client.query('SELECT COALESCE(sum(amount),0) n FROM payment_allocations WHERE payment_document_id=$1 AND reversed_at IS NULL',[paymentId])).rows[0].n),paid=Number((await client.query('SELECT COALESCE(sum(amount),0) n FROM payment_allocations WHERE invoice_document_id=$1 AND reversed_at IS NULL',[invoiceId])).rows[0].n);if(used+value>Number(payment.amount)+.01)throw new AppError('VALIDATION_ERROR','Alokasi melebihi nilai pembayaran.');if(paid+value>Number(invoice.amount)+.01)throw new AppError('VALIDATION_ERROR','Alokasi melebihi sisa tagihan.');const allocation=(await client.query(`INSERT INTO payment_allocations(id,payment_document_id,invoice_document_id,amount,created_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT(payment_document_id,invoice_document_id) DO UPDATE SET amount=payment_allocations.amount+excluded.amount RETURNING *`,[randomUUID(),paymentId,invoiceId,value,user.id])).rows[0],next=paid+value,status=next>=Number(invoice.amount)-.01?'CLOSED':'PARTIALLY_PAID';await client.query(`UPDATE business_documents SET status=$2,payload=jsonb_set(payload,'{paid}',to_jsonb($3::numeric),true),version=version+1,updated_at=now(),updated_by=$4 WHERE id=$1`,[invoiceId,status,next,user.id]);return{allocation:runtime.camel(allocation),invoiceStatus:status,paid:next,remaining:Math.max(0,Number(invoice.amount)-next)};}

// ── Payment reversal (Sprint 10 / R017) — pembalikan, bukan penghapusan ─────
// Jurnal asli tidak disentuh; jurnal pembalik (D/C ditukar) diposting ke
// periode TERBUKA saat ini. Alokasi ditandai reversed (histori utuh), status
// invoice dihitung ulang, dan dokumen pembayaran menjadi VOID.
async function reversePayment(client,{paymentId,reason,user,requestId}){
  if(!reason)throw new AppError('REASON_REQUIRED','Alasan pembalikan pembayaran wajib diisi.');
  const payment=(await client.query(`SELECT * FROM business_documents WHERE id=$1 AND document_type IN('CUSTOMER_PAYMENT','SUPPLIER_PAYMENT') FOR UPDATE`,[paymentId])).rows[0];
  if(!payment)throw new AppError('RESOURCE_NOT_FOUND','Dokumen pembayaran tidak ditemukan.');
  assertBranchAccess(user,payment.branch_id,'Pembayaran berada di cabang di luar cakupan Anda.');
  if(payment.payload?.reversal)return{replay:true,reversedAt:payment.payload.reversal.at};
  if(!['COMPLETED','CLOSED','APPROVED'].includes(payment.status))throw new AppError('STATUS_INVALID',`Pembalikan membutuhkan pembayaran APPROVED/COMPLETED/CLOSED (sekarang ${payment.status}).`);
  // Periode pembalikan = periode terbuka SEKARANG (bukan periode asli yang mungkin sudah ditutup).
  const period=new Date().toISOString().slice(0,7);
  const reversalEntity=await accountingConfig.defaultLegalEntityId(client);
  await client.query(`INSERT INTO accounting_periods(id,legal_entity_id,period,status) VALUES($1,$3,$2,'OPEN') ON CONFLICT(legal_entity_id,period) DO NOTHING`,[randomUUID(),period,reversalEntity]);
  const pStatus=(await client.query('SELECT status FROM accounting_periods WHERE period=$1 AND legal_entity_id=$2 FOR UPDATE',[period,reversalEntity])).rows[0];
  if(pStatus.status!=='OPEN')throw new AppError('STATUS_INVALID',`Periode ${period} sudah ditutup.`);
  // Jurnal pembalik: setiap baris asli ditukar sisi D/C.
  const original=(await client.query('SELECT account_id,debit,credit FROM journal_lines WHERE journal_document_id=$1',[paymentId])).rows;
  let reversedLines=0;
  for(const line of original){
    await client.query(`INSERT INTO journal_lines(id,journal_document_id,account_id,debit,credit,memo) VALUES($1,$2,$3,$4,$5,$6)`,
      [randomUUID(),paymentId,line.account_id,Number(line.credit),Number(line.debit),`REVERSAL ${payment.document_number}: ${String(reason).slice(0,300)}`]);
    reversedLines++;
  }
  // Alokasi: tandai reversed, lalu hitung ulang status invoice terdampak.
  const allocations=(await client.query(`UPDATE payment_allocations SET reversed_at=now(),reversed_by=$2,reversal_reason=$3
    WHERE payment_document_id=$1 AND reversed_at IS NULL RETURNING invoice_document_id,amount`,[paymentId,user.id,String(reason).slice(0,500)])).rows;
  const affected=[];
  for(const alloc of [...new Map(allocations.map(a=>[a.invoice_document_id,a])).values()]){
    const invoice=(await client.query('SELECT * FROM business_documents WHERE id=$1 FOR UPDATE',[alloc.invoice_document_id])).rows[0];
    const paid=Number((await client.query('SELECT COALESCE(sum(amount),0) n FROM payment_allocations WHERE invoice_document_id=$1 AND reversed_at IS NULL',[invoice.id])).rows[0].n);
    const status=paid<=0?'APPROVED':paid>=Number(invoice.amount)-.01?'CLOSED':'PARTIALLY_PAID';
    await client.query(`UPDATE business_documents SET status=$2,payload=jsonb_set(payload,'{paid}',to_jsonb($3::numeric),true),version=version+1,updated_at=now(),updated_by=$4 WHERE id=$1`,[invoice.id,status,paid,user.id]);
    affected.push({invoice:invoice.document_number,paid,status});
  }
  await client.query(`UPDATE business_documents SET status='VOID',voided_at=now(),voided_by=$2,payload=payload||$3::jsonb,version=version+1,updated_at=now(),updated_by=$2 WHERE id=$1`,
    [paymentId,user.id,JSON.stringify({reversal:{reason:String(reason).slice(0,500),by:user.id,at:new Date().toISOString(),period,lines:reversedLines}})]);
  await runtime.audit(client,{userId:user.id,action:'VOID',module:'payment',entityType:payment.document_type,entityId:paymentId,documentNumber:payment.document_number,oldValue:{status:payment.status},newValue:{status:'VOID',reversedLines,affected},reason,requestId,branchId:payment.branch_id});
  await runtime.outbox(client,'payment.posted',{entityId:payment.document_number,documentType:payment.document_type,branchId:payment.branch_id});
  return{documentNumber:payment.document_number,reversedLines,period,affectedInvoices:affected};
}

async function attendance(client,{period:value,employeeId,user,page=1,limit=100}={}){const p=period(value);if(user?.role==='employee')employeeId=user.employeeId;if(user?.role==='employee'&&!employeeId)throw new AppError('RESOURCE_NOT_FOUND','Akun belum ditautkan ke data karyawan.');limit=Math.min(Math.max(Number(limit)||100,1),250);page=Math.max(Number(page)||1,1);const params=[p];let filter='';if(employeeId){params.push(employeeId);filter+=` AND a.employee_id=$${params.length}`;}if(user&&!['owner','admin','employee'].includes(user.role)&&user.branchScope!=='*'){params.push(user.branchId);filter+=` AND e.branch_id=$${params.length}`;}const total=Number((await client.query(`SELECT count(*) n FROM attendance_records a JOIN employees e ON e.id=a.employee_id WHERE to_char(a.work_date,'YYYY-MM')=$1${filter}`,params)).rows[0].n);params.push(limit,(page-1)*limit);const items=(await client.query(`SELECT a.*,e.nik,e.name employee_name,e.department FROM attendance_records a JOIN employees e ON e.id=a.employee_id WHERE to_char(a.work_date,'YYYY-MM')=$1${filter} ORDER BY a.work_date DESC,e.name LIMIT $${params.length-1} OFFSET $${params.length}`,params)).rows.map(runtime.camel);return{period:p,items,page,limit,total,totalPages:Math.max(Math.ceil(total/limit),1)};}
async function upsertAttendance(client,{employeeId,workDate,checkIn,checkOut,status='PRESENT',notes,user,source='MANUAL'}){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(workDate||'')))throw new AppError('VALIDATION_ERROR','Tanggal kerja wajib berformat YYYY-MM-DD.');const employee=(await client.query('SELECT branch_id FROM employees WHERE id=$1 AND active',[employeeId])).rows[0];if(!employee)throw new AppError('RESOURCE_NOT_FOUND','Karyawan tidak ditemukan.');if(!['owner','admin'].includes(user.role)&&user.branchScope!=='*'&&employee.branch_id!==user.branchId)throw new AppError('PERMISSION_DENIED','Karyawan berada di cabang di luar cakupan Anda.');const row=(await client.query(`INSERT INTO attendance_records(id,employee_id,work_date,check_in,check_out,status,source,notes,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(employee_id,work_date) DO UPDATE SET check_in=excluded.check_in,check_out=excluded.check_out,status=excluded.status,source=excluded.source,notes=excluded.notes,updated_at=now() RETURNING *`,[randomUUID(),employeeId,workDate,checkIn||null,checkOut||null,status,source,notes||null,user.id])).rows[0];return runtime.camel(row);}
async function leaveBalances(client,{year=new Date().getFullYear(),employeeId,user}={}){if(user?.role==='employee')employeeId=user.employeeId;if(user?.role==='employee'&&!employeeId)throw new AppError('RESOURCE_NOT_FOUND','Akun belum ditautkan ke data karyawan.');const params=[Number(year)];let filter='';if(employeeId){params.push(employeeId);filter+=` AND e.id=$${params.length}`;}if(user&&!['owner','admin','employee'].includes(user.role)&&user.branchScope!=='*'){params.push(user.branchId);filter+=` AND e.branch_id=$${params.length}`;}await client.query(`INSERT INTO leave_balances(employee_id,year) SELECT id,$1 FROM employees WHERE active ON CONFLICT DO NOTHING`,[Number(year)]);return(await client.query(`SELECT l.*,e.nik,e.name employee_name,e.department,(l.entitlement-l.used)::float remaining FROM leave_balances l JOIN employees e ON e.id=l.employee_id WHERE l.year=$1${filter} ORDER BY e.name`,params)).rows.map(runtime.camel);}

async function createPayroll(client,{period:value,user,title}){const p=period(value),global=['owner','admin'].includes(user.role)||user.branchScope==='*';const existing=(await client.query(`SELECT id FROM business_documents WHERE document_type='PAYROLL_RUN' AND payload->>'period'=$1 AND ($2::boolean OR branch_id=$3) AND status NOT IN('CANCELLED','VOID')`,[p,global,user.branchId])).rows[0];if(existing)throw new AppError('DUPLICATE_REQUEST','Payroll periode ini sudah tersedia.');const employees=(await client.query('SELECT * FROM employees WHERE active AND ($1::boolean OR branch_id=$2) ORDER BY name',[global,user.branchId])).rows;if(!employees.length)throw new AppError('VALIDATION_ERROR','Tidak ada karyawan aktif.');
  // Tarif dari payroll_rule_versions (§19.5) — bukan hardcoded; snapshot disimpan per item.
  const {rules,snapshot}=await accountingConfig.resolvePayrollRules(client,`${p}-01`);
  // Jejak metode: pajak & BPJS kini presisi (TER PP 58/2023 + BPJS per-komponen
  // dari profil karyawan), bukan lagi tarif datar. Konfigurasi lama tetap
  // di-snapshot untuk audit & fallback BPJS.
  snapshot.method={pph21:'TER_PP58_2023',bpjs:'PER_COMPONENT_CONFIG',ptkp:'PER_EMPLOYEE_TAX_PROFILE'};
  // §35: seluruh angka payroll WAJIB dari konfigurasi. Nilai yang hilang
  // digagalkan terang-terangan — diam-diam memakai default berisiko salah
  // bayar/salah potong tanpa disadari.
  const need=(ruleType,key,{allowZero=true}={})=>{
    const raw=rules[ruleType]?.[key],value=Number(raw);
    if(raw===undefined||raw===null||raw===''||!Number.isFinite(value)||(!allowZero&&value===0))
      throw new AppError('RESOURCE_NOT_FOUND',`Aturan payroll ${ruleType}.${key} belum dikonfigurasi untuk periode ${p}.`);
    return value;
  };
  const otDiv=need('OVERTIME','divisor',{allowZero:false}),absDiv=need('ABSENCE','divisor',{allowZero:false}),
    bpjsEmpPct=need('BPJS','employeePct'),bpjsCoPct=need('BPJS','companyPct'),
    ptkp=need('PTKP','annualExempt'),pphRate=need('PPH21','flatRate');
  const items=[];for(const employee of employees){const components=(await client.query(`SELECT kind,COALESCE(sum(amount),0)::float amount FROM payroll_components WHERE employee_id=$1 AND active AND recurring GROUP BY kind`,[employee.id])).rows.reduce((o,r)=>(o[r.kind]=r.amount,o),{}),att=(await client.query(`SELECT count(*) FILTER(WHERE a.status='ABSENT')::int absent,
      COALESCE(sum(GREATEST(extract(epoch from(a.check_out-a.check_in))/3600 - COALESCE(sh.hours,def.hours,8),0)),0)::float overtime_hours
    FROM attendance_records a
    LEFT JOIN employee_rosters r ON r.employee_id=a.employee_id AND r.work_date=a.work_date
    LEFT JOIN LATERAL (SELECT (CASE WHEN s.end_time>s.start_time THEN extract(epoch from(s.end_time-s.start_time)) ELSE extract(epoch from(s.end_time-s.start_time))+86400 END)/3600.0 - s.break_minutes/60.0 hours FROM work_shifts s WHERE s.id=r.shift_id AND s.active) sh ON true
    LEFT JOIN LATERAL (SELECT (CASE WHEN s.end_time>s.start_time THEN extract(epoch from(s.end_time-s.start_time)) ELSE extract(epoch from(s.end_time-s.start_time))+86400 END)/3600.0 - s.break_minutes/60.0 hours FROM work_shifts s WHERE s.is_default AND s.active LIMIT 1) def ON true
    WHERE a.employee_id=$1 AND to_char(a.work_date,'YYYY-MM')=$2`,[employee.id,p])).rows[0];
    // Tunjangan tetap & variabel dari kompensasi yang SUDAH DISETUJUI (konsisten
    // dgn employees.base_salary yang juga nilai approved) + komponen ALLOWANCE
    // ad-hoc. Revisi gaji baru masuk payroll setelah disetujui (maker-checker).
    const comp=(await client.query(`SELECT fixed_allowance,variable_allowance FROM employee_compensation_history WHERE employee_id=$1 AND approval_status='APPROVED' ORDER BY effective_from DESC LIMIT 1`,[employee.id])).rows[0]||{};
    const base=Number(employee.base_salary),allowances=(Number(comp.fixed_allowance)||0)+(Number(comp.variable_allowance)||0)+Number(components.ALLOWANCE||0);
    const overtime=Math.round(Number(att.overtime_hours||0)*(base/otDiv)),absence=Math.round(Number(att.absent||0)*(base/absDiv));
    const deductions=Number(components.DEDUCTION||0)+absence,gross=base+allowances+overtime;
    // PPh 21 — Tarif Efektif Rata-rata (TER) bulanan PP 58/2023 atas penghasilan
    // bruto sebulan, per kategori PTKP karyawan (dari profil pajak); non-NPWP +20%.
    // Konsisten dengan planner Employee 360. ptkp/pphRate config lama tetap
    // divalidasi & di-snapshot namun tak lagi menghitung (digantikan TER).
    const taxRow=(await client.query(`SELECT ptkp_status,(npwp IS NOT NULL) has_npwp FROM employee_tax_profiles WHERE employee_id=$1 AND effective_from<=$2::date AND (effective_to IS NULL OR effective_to>=$2::date) ORDER BY effective_from DESC LIMIT 1`,[employee.id,`${p}-01`])).rows[0]||{};
    const terCat=masterData.ptkpToCatBE(taxRow.ptkp_status||'TK/0'),hasNpwp=taxRow.has_npwp!==false;
    const pph21=Math.round(gross*masterData.terMonthlyRate(terCat,gross)*(hasNpwp?1:1.2));
    // BPJS — dari konfigurasi kepesertaan tersimpan (per komponen, dgn cap);
    // fallback ke persentase datar konfigurasi bila karyawan belum dikonfigurasi.
    const bpjsRows=(await client.query(`SELECT wage_base,employee_pct,employer_pct,ceiling_amount FROM employee_bpjs_profiles WHERE employee_id=$1 AND (active_to IS NULL OR active_to>=$2::date)`,[employee.id,`${p}-01`])).rows;
    let bpjsEmployee,bpjsCompany;
    if(bpjsRows.length){bpjsEmployee=0;bpjsCompany=0;for(const r of bpjsRows){const wb=Number(r.wage_base)||0,cap=Number(r.ceiling_amount)||0,b=cap?Math.min(wb,cap):wb;bpjsEmployee+=Math.round(b*(Number(r.employee_pct)||0)/100);bpjsCompany+=Math.round(b*(Number(r.employer_pct)||0)/100);}}
    else{bpjsEmployee=Math.round(base*bpjsEmpPct);bpjsCompany=Math.round(base*bpjsCoPct);}
    const net=Math.max(0,gross-deductions-bpjsEmployee-pph21);
    items.push({employee,base,allowances,overtime,deductions,bpjsEmployee,bpjsCompany,pph21,net});}const total=items.reduce((n,x)=>n+x.net,0),bpjs=items.reduce((n,x)=>n+x.bpjsCompany+x.bpjsEmployee,0),pph21=items.reduce((n,x)=>n+x.pph21,0),doc=await runtime.createDocument(client,{type:'PAYROLL_RUN',user,title:title||`Payroll ${p}`,amount:total,payload:{period:p,headcount:items.length,bpjs,pph21,ruleSnapshot:snapshot},requestId:randomUUID()});for(const x of items)await client.query(`INSERT INTO payroll_items(id,payroll_document_id,employee_id,base_salary,allowances,overtime,deductions,bpjs_company,bpjs_employee,pph21,net_pay,rule_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,[randomUUID(),doc.id,x.employee.id,x.base,x.allowances,x.overtime,x.deductions,x.bpjsCompany,x.bpjsEmployee,x.pph21,x.net,snapshot]);return{document:doc,headcount:items.length,total,bpjs,pph21};}
async function payrollItems(client,documentId,user){const doc=await runtime.getDocument(client,documentId);if(!doc||doc.documentType!=='PAYROLL_RUN')throw new AppError('RESOURCE_NOT_FOUND');assertBranchAccess(user,doc.branchId,'Payroll berada di cabang di luar cakupan Anda.');const own=user.role==='employee';const params=[documentId];let filter='';if(own){params.push(user.employeeId||'00000000-0000-0000-0000-000000000000');filter=` AND p.employee_id=$2`;}return(await client.query(`SELECT p.*,e.nik,e.name employee_name,e.department,e.job_title FROM payroll_items p JOIN employees e ON e.id=p.employee_id WHERE p.payroll_document_id=$1${filter} ORDER BY e.name`,params)).rows.map(runtime.camel);}
async function payrollSelf(client,user){if(!user.employeeId)throw new AppError('RESOURCE_NOT_FOUND','Akun belum ditautkan ke data karyawan.');return(await client.query(`SELECT p.*,d.document_number,d.title,d.status,d.payload->>'period' period,d.approved_at FROM payroll_items p JOIN business_documents d ON d.id=p.payroll_document_id WHERE p.employee_id=$1 AND d.status NOT IN('DRAFT','REJECTED','CANCELLED','VOID') ORDER BY d.payload->>'period' DESC`,[user.employeeId])).rows.map(runtime.camel);}

async function syncTaxes(client,value,user){const p=period(value),scope=queryScope(user);
  // §35: tarif PPN untuk memecah nilai bruto dokumen TANPA baris diambil dari
  // konfigurasi effective-dated (dulu konstanta 1.11 di dalam SQL).
  const ppnRate=await accountingConfig.taxRate(client,'PPN',p);
  const grossDivisor=1+Number(ppnRate)/100;
  const params=[p,scope.global,scope.branchId,grossDivisor];
  await client.query(`INSERT INTO tax_records(id,document_id,tax_type,period,base_amount,tax_amount) SELECT gen_random_uuid(),d.id,CASE WHEN d.document_type='INVOICE' THEN 'PPN_OUTPUT' ELSE 'PPN_INPUT' END,$1::text,COALESCE(sum(l.qty*l.unit_price*(1-l.discount_pct/100)),d.amount/$4::numeric),COALESCE(sum(l.qty*l.unit_price*(1-l.discount_pct/100)*l.tax_pct/100),d.amount-d.amount/$4::numeric) FROM business_documents d LEFT JOIN document_lines l ON l.document_id=d.id WHERE d.document_type IN('INVOICE','SUPPLIER_INVOICE') AND d.status NOT IN('DRAFT','REJECTED','CANCELLED','VOID') AND to_char(d.created_at,'YYYY-MM')=$1::text AND ($2::boolean OR d.branch_id=$3) GROUP BY d.id ON CONFLICT(document_id,tax_type) WHERE document_id IS NOT NULL DO UPDATE SET base_amount=excluded.base_amount,tax_amount=excluded.tax_amount,period=excluded.period`,params);await client.query(`INSERT INTO tax_records(id,document_id,tax_type,period,base_amount,tax_amount) SELECT gen_random_uuid(),d.id,'PPH21',$1::text,d.amount,COALESCE(sum(i.pph21),0) FROM business_documents d JOIN payroll_items i ON i.payroll_document_id=d.id WHERE d.document_type='PAYROLL_RUN' AND d.status NOT IN('DRAFT','REJECTED','CANCELLED','VOID') AND d.payload->>'period'=$1::text AND ($2::boolean OR d.branch_id=$3) GROUP BY d.id ON CONFLICT(document_id,tax_type) WHERE document_id IS NOT NULL DO UPDATE SET base_amount=excluded.base_amount,tax_amount=excluded.tax_amount,period=excluded.period`,[p,scope.global,scope.branchId]);return taxSummary(client,p,user);}
async function taxSummary(client,value,user){const p=period(value),scope=queryScope(user),rows=(await client.query(`SELECT t.* FROM tax_records t JOIN business_documents d ON d.id=t.document_id WHERE t.period=$1 AND ($2::boolean OR d.branch_id=$3) ORDER BY t.created_at DESC`,[p,scope.global,scope.branchId])).rows.map(runtime.camel),sum=t=>rows.filter(r=>r.taxType===t).reduce((n,r)=>n+Number(r.taxAmount),0),next=new Date(`${p}-01T00:00:00Z`);next.setUTCMonth(next.getUTCMonth()+1);const y=next.getUTCFullYear(),m=String(next.getUTCMonth()+1).padStart(2,'0');return{period:p,scope:scope.global?'GLOBAL':'BRANCH',branchId:scope.global?null:scope.branchId,ppnOutput:sum('PPN_OUTPUT'),ppnInput:sum('PPN_INPUT'),ppnPayable:sum('PPN_OUTPUT')-sum('PPN_INPUT'),pph21:sum('PPH21'),pph23:sum('PPH23'),deadlines:[{tax:'PPh 21/23',dueDate:`${y}-${m}-10`,status:'OPEN'},{tax:'PPN',dueDate:new Date(Date.UTC(y,next.getUTCMonth()+1,0)).toISOString().slice(0,10),status:'OPEN'}],documents:rows};}
async function reportTax(client,id,user){const scope=queryScope(user),row=(await client.query(`UPDATE tax_records t SET reported=true,reported_at=now() FROM business_documents d WHERE t.id=$1 AND d.id=t.document_id AND ($2::boolean OR d.branch_id=$3) AND NOT t.reported RETURNING t.*`,[id,scope.global,scope.branchId])).rows[0];if(!row)throw new AppError('RESOURCE_NOT_FOUND');return runtime.camel(row);}

async function reconcile(client,{period:value,branchId,user}){const p=period(value),branch=branchId||user.branchId;if(branchId&&!['owner','admin'].includes(user.role)&&user.branchScope!=='*'&&branchId!==user.branchId)throw new AppError('PERMISSION_DENIED','Cabang rekonsiliasi di luar cakupan Anda.');await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`reconcile:${branch}:${p}`]);const bank=(await client.query(`SELECT * FROM bank_transactions WHERE branch_id=$1 AND to_char(transaction_date,'YYYY-MM')=$2 AND status='UNMATCHED' FOR UPDATE`,[branch,p])).rows;let matched=0;for(const tx of bank){const candidates=(await client.query(`SELECT id FROM business_documents WHERE branch_id=$1 AND document_type IN('CUSTOMER_PAYMENT','SUPPLIER_PAYMENT','EXPENSE') AND amount=$2 AND status='CLOSED' AND NOT EXISTS(SELECT 1 FROM bank_transactions b WHERE b.matched_document_id=business_documents.id)`,[branch,tx.amount])).rows;if(candidates.length===1){await client.query(`UPDATE bank_transactions SET status='MATCHED',matched_document_id=$2,matched_at=now() WHERE id=$1`,[tx.id,candidates[0].id]);matched++;}}const statement=Number((await client.query(`SELECT COALESCE(sum(CASE direction WHEN 'D' THEN amount ELSE -amount END),0) n FROM bank_transactions WHERE branch_id=$1 AND to_char(transaction_date,'YYYY-MM')=$2 AND status<>'IGNORED'`,[branch,p])).rows[0].n),ledgerTotal=Number((await client.query(`SELECT COALESCE(sum(j.debit-j.credit),0) n FROM journal_lines j JOIN chart_of_accounts a ON a.id=j.account_id JOIN business_documents d ON d.id=j.journal_document_id WHERE a.code=$3 AND d.branch_id=$1 AND COALESCE(NULLIF(d.payload->>'period',''),to_char(d.created_at,'YYYY-MM'))=$2`,[branch,p,await accountingConfig.accountCode(client,'CASH_BANK',p)])).rows[0].n),difference=statement-ledgerTotal,row=(await client.query(`INSERT INTO reconciliation_runs(id,branch_id,period,status,statement_total,ledger_total,difference,matched_count,created_by,completed_at) VALUES($1,$2,$3,'COMPLETED',$4,$5,$6,$7,$8,now()) ON CONFLICT(branch_id,period) DO UPDATE SET status='COMPLETED',statement_total=excluded.statement_total,ledger_total=excluded.ledger_total,difference=excluded.difference,matched_count=excluded.matched_count,created_by=excluded.created_by,completed_at=now() RETURNING *`,[randomUUID(),branch,p,statement,ledgerTotal,difference,matched,user.id])).rows[0];return runtime.camel(row);}

module.exports={period,accountingSummary,ledger,closePeriod,reopenPeriod,allocatePayment,reversePayment,attendance,upsertAttendance,leaveBalances,createPayroll,payrollItems,payrollSelf,syncTaxes,taxSummary,reportTax,reconcile};
