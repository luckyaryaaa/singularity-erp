'use strict';
// Sprint 13 (R020) — laporan keuangan formal, closing cockpit & subledger.
// Neraca memakai saldo KUMULATIF s/d akhir periode; laba rugi memakai mutasi
// periode berjalan. Periode baris jurnal = COALESCE(payload.period,
// created_at) — konsisten dengan ledger, closing, dan posting engine.
const { createHash } = require('node:crypto');
const { AppError } = require('../../../core/errors');
const { canonical } = require('../../../core/doc-verification');
const { hasGlobalScope, queryScope } = require('../../../core/data-scope');
const { assertPermission } = require('../../../core/permissions');
const accountingConfig = require('./accounting-config');

const idr = (v) => Math.round(Number(v || 0) * 100) / 100;
const evidenceHash = (value) => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const PERIOD_EXPR = `COALESCE(NULLIF(d.payload->>'period',''),to_char(d.created_at,'YYYY-MM'))`;

function assertPeriod(value) {
  const p = value || new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(p)) throw new AppError('VALIDATION_ERROR', 'Periode wajib berformat YYYY-MM.');
  return p;
}
async function workBranchId(client, user, legalEntityId = null) {
  if (user?.branchId) return user.branchId;
  const own = user?.id
    ? (await client.query('SELECT branch_id FROM app_users WHERE id=$1', [user.id])).rows[0]
    : null;
  if (own?.branch_id) return own.branch_id;
  const fallback = legalEntityId
    ? (await client.query(
      'SELECT id FROM branches WHERE legal_entity_id=$1 AND active ORDER BY is_head_office DESC,created_at LIMIT 1',
      [legalEntityId])).rows[0]
    : null;
  if (!fallback?.id) throw new AppError('VALIDATION_ERROR', 'Cabang konteks work item rekonsiliasi tidak tersedia.');
  return fallback.id;
}

// ── Laporan keuangan: neraca + laba rugi ─────────────────────────────────────
async function financialStatements(client, value, user) {
  const period = assertPeriod(value);
  const scope = queryScope(user);
  const rows = (await client.query(`SELECT a.code,a.name,a.category,a.normal_side,
      COALESCE(SUM(CASE WHEN ${PERIOD_EXPR}<=$1 AND ($2::boolean OR d.branch_id=$3) THEN j.debit-j.credit ELSE 0 END),0)::float cumulative_net,
      COALESCE(SUM(CASE WHEN ${PERIOD_EXPR}=$1 AND ($2::boolean OR d.branch_id=$3) THEN j.debit-j.credit ELSE 0 END),0)::float period_net
    FROM chart_of_accounts a
    LEFT JOIN journal_lines j ON j.account_id=a.id
    LEFT JOIN business_documents d ON d.id=j.journal_document_id
    WHERE a.active GROUP BY a.id ORDER BY a.code`, [period, scope.global, scope.branchId])).rows;
  // Tanda saldo mengikuti SIFAT KATEGORI, bukan normal_side per akun — dengan
  // begitu akun kontra (1590 Akumulasi di ASSET, 4110 Retur di REVENUE)
  // otomatis bernilai negatif dan MENGURANGI kelompoknya. Identitas
  // aset = kewajiban + ekuitas terjaga secara matematis.
  const DEBIT_NATURE = new Set(['ASSET', 'EXPENSE', 'COGS']);
  const balance = (r, mode) => {
    const net = mode === 'cumulative' ? r.cumulative_net : r.period_net; // debit - kredit
    return idr(DEBIT_NATURE.has(r.category) ? net : -net);
  };
  const pick = (cats, mode) => rows.filter((r) => cats.includes(r.category)).map((r) => ({ code: r.code, name: r.name, category: r.category, balance: balance(r, mode) })).filter((r) => Math.abs(r.balance) >= 0.01);
  const sum = (list) => idr(list.reduce((n, r) => n + r.balance, 0));
  // P0-F: kategori di luar 6 standar TIDAK boleh diam-diam ditambahkan ke
  // ekuitas — itu menyembunyikan salah klasifikasi. Baris tak terpetakan
  // tampil sebagai seksi UNMAPPED eksplisit dan MEMBLOKIR publikasi laporan
  // resmi sampai bagan akun dibereskan.
  const KNOWN = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'EXPENSE'];
  const otherCats = [...new Set(rows.filter((r) => !KNOWN.includes(r.category)).map((r) => r.category))];
  const unmappedLines = otherCats.length ? pick(otherCats, 'cumulative') : [];

  // Laba rugi periode berjalan + kumulatif (untuk laba ditahan berjalan).
  const income = { revenue: pick(['REVENUE'], 'period'), cogs: pick(['COGS'], 'period'), expense: pick(['EXPENSE'], 'period') };
  const revenue = sum(income.revenue), cogs = sum(income.cogs), expense = sum(income.expense);
  const netIncome = idr(revenue - cogs - expense);
  const cumRevenue = sum(pick(['REVENUE'], 'cumulative')), cumCogs = sum(pick(['COGS'], 'cumulative')), cumExpense = sum(pick(['EXPENSE'], 'cumulative'));
  const cumulativeEarnings = idr(cumRevenue - cumCogs - cumExpense);

  // Neraca kumulatif; laba berjalan kumulatif masuk sisi ekuitas.
  const assets = pick(['ASSET'], 'cumulative');
  const liabilities = pick(['LIABILITY'], 'cumulative');
  const equity = pick(['EQUITY'], 'cumulative');
  const totalAssets = sum(assets), totalLiabilities = sum(liabilities), totalEquity = idr(sum(equity) + cumulativeEarnings);
  return {
    period, scope: scope.global ? 'GLOBAL' : 'BRANCH', branchId: scope.global ? null : scope.branchId,
    balanceSheet: {
      assets, liabilities, equity: [...equity, { code: '—', name: 'Laba berjalan (kumulatif)', category: 'EQUITY', balance: cumulativeEarnings }],
      totalAssets, totalLiabilities, totalEquity,
      totalLiabilitiesAndEquity: idr(totalLiabilities + totalEquity),
      unmappedLines, unmappedTotal: sum(unmappedLines),
      publishBlocked: unmappedLines.length > 0,
      balanced: unmappedLines.length === 0 && Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
    },
    // Detail baris memakai kunci *Lines agar TIDAK tertimpa nilai total
    // bernama sama (bug: `...income` lalu `revenue` scalar menghapus array).
    incomeStatement: {
      revenueLines: income.revenue, cogsLines: income.cogs, expenseLines: income.expense,
      revenue, cogs, grossMargin: idr(revenue - cogs), expense, netIncome
    }
  };
}

// ── Subledger AR/AP per relasi vs saldo GL ───────────────────────────────────
// Dokumen dihitung hanya bila SUDAH diposting (document_postings ACCOUNTING);
// alokasi reversed dikecualikan. Selisih vs GL tampil untuk investigasi.
async function subledger(client, { type, period: value, user }) {
  const period = assertPeriod(value);
  const scope = queryScope(user);
  if (!['AR', 'AP'].includes(type)) throw new AppError('VALIDATION_ERROR', 'type wajib AR atau AP.');
  const isAr = type === 'AR';
  const docType = isAr ? 'INVOICE' : 'SUPPLIER_INVOICE';
  // §35: akun kontrol AR/AP dari konfigurasi peran akun, bukan literal COA.
  const glCode = await accountingConfig.accountCode(client, isAr ? 'AR_CONTROL' : 'AP_CONTROL', period);
  const party = isAr
    ? `JOIN customers pt ON pt.id=d.party_id`
    : `JOIN suppliers pt ON pt.id=d.party_id`;
  const rows = (await client.query(`SELECT pt.id party_id,pt.code party_code,pt.name party_name,
      COUNT(*)::int invoices,
      COALESCE(SUM(d.amount),0)::float billed,
      COALESCE(SUM((SELECT COALESCE(SUM(a.amount),0) FROM payment_allocations a WHERE a.invoice_document_id=d.id AND a.reversed_at IS NULL)),0)::float settled
    FROM business_documents d ${party}
    WHERE d.document_type='${docType}' AND d.status NOT IN ('DRAFT','REJECTED','CANCELLED','VOID')
      AND EXISTS (SELECT 1 FROM document_postings p WHERE p.document_id=d.id AND p.posting_kind='ACCOUNTING')
      AND ${PERIOD_EXPR}<=$1
      AND ($2::boolean OR d.branch_id=$3)
    GROUP BY pt.id,pt.code,pt.name ORDER BY 6 DESC NULLS LAST`, [period, scope.global, scope.branchId])).rows
    .map((r) => ({ partyId: r.party_id, partyCode: r.party_code, partyName: r.party_name, invoices: r.invoices, billed: idr(r.billed), settled: idr(r.settled), outstanding: idr(r.billed - r.settled) }));
  const glBalance = Number((await client.query(`SELECT COALESCE(SUM(j.debit-j.credit),0)::float n
    FROM journal_lines j JOIN chart_of_accounts a ON a.id=j.account_id JOIN business_documents d ON d.id=j.journal_document_id
    WHERE a.code=$4 AND ${PERIOD_EXPR}<=$1 AND ($2::boolean OR d.branch_id=$3)`, [period, scope.global, scope.branchId, glCode])).rows[0].n);
  const glSigned = idr(isAr ? glBalance : -glBalance); // AP normal kredit
  const subTotal = idr(rows.reduce((n, r) => n + r.outstanding, 0));
  return {
    type, period, scope: scope.global ? 'GLOBAL' : 'BRANCH', branchId: scope.global ? null : scope.branchId, glAccount: glCode, items: rows,
    totals: { billed: idr(rows.reduce((n, r) => n + r.billed, 0)), settled: idr(rows.reduce((n, r) => n + r.settled, 0)), outstanding: subTotal },
    glBalance: glSigned, difference: idr(glSigned - subTotal)
  };
}

// ── Rekonsiliasi pajak: subledger tax_records vs GL akun pajak (Wave D.2) ─────
// Membandingkan akrual pajak yang diakui subledger (tax_records per jenis) dengan
// akrual pada akun GL pajak (TAX_PAYABLE, mis. 2300) untuk periode. Selisih
// menandakan pajak terakrual di subledger tetapi belum terposting ke GL (atau
// sebaliknya) — dipaparkan untuk investigasi, BUKAN disembunyikan sebagai PASS.
async function taxReconciliation(client, { period: value, user }) {
  const period = assertPeriod(value);
  if (!hasGlobalScope(user)) throw new AppError('PERMISSION_DENIED', 'Rekonsiliasi pajak membutuhkan scope perusahaan.');
  const glCode = await accountingConfig.accountCode(client, 'TAX_PAYABLE', period);
  const byType = (await client.query(
    `SELECT tax_type, COALESCE(SUM(tax_amount),0)::float amount, COUNT(*)::int records
     FROM tax_records WHERE period=$1 GROUP BY tax_type ORDER BY tax_type`, [period])).rows
    .map((r) => ({ taxType: r.tax_type, amount: idr(r.amount), records: r.records }));
  const subledgerTotal = idr(byType.reduce((n, r) => n + r.amount, 0));
  // Akun pajak normal kredit: akrual = kredit periode; setoran = debit periode.
  const gl = (await client.query(
    `SELECT COALESCE(SUM(j.credit),0)::float accrued, COALESCE(SUM(j.debit),0)::float settled
     FROM journal_lines j JOIN chart_of_accounts a ON a.id=j.account_id JOIN business_documents d ON d.id=j.journal_document_id
     WHERE a.code=$2 AND ${PERIOD_EXPR}=$1`, [period, glCode])).rows[0];
  const glAccrued = idr(gl.accrued), glSettled = idr(gl.settled);
  return {
    period, taxAccount: glCode, byType, subledgerTotal,
    glAccrued, glSettled, glNet: idr(glAccrued - glSettled),
    difference: idr(subledgerTotal - glAccrued)
  };
}

// ── Rekonsiliasi ber-versi: prepare → approve/reject ─────────────────────────
const RECONCILIATION_TYPES = new Set(['BANK','INVENTORY','PAYROLL','TAX','AR','AP']);
const RECONCILIATION_CHECK = {
  BANK:'bank_reconciliation', INVENTORY:'inventory_reconciliation',
  PAYROLL:'payroll_reconciliation', TAX:'tax_reconciliation',
  AR:'subledger_ar', AP:'subledger_ap'
};

async function reconciliationSnapshot(client, { type, period: value, user }) {
  const normalized = String(type || '').toUpperCase();
  if (!RECONCILIATION_TYPES.has(normalized)) throw new AppError('VALIDATION_ERROR', 'Jenis rekonsiliasi wajib BANK, INVENTORY, PAYROLL, TAX, AR, atau AP.');
  const period = assertPeriod(value);
  if (!hasGlobalScope(user)) throw new AppError('PERMISSION_DENIED', 'Evidence rekonsiliasi membutuhkan scope perusahaan.');
  let detail;
  if (normalized === 'TAX') detail = await taxReconciliation(client, { period, user });
  else if (normalized === 'AR' || normalized === 'AP') detail = await subledger(client, { type: normalized, period, user });
  else {
    const cockpit = await closingCockpit(client, period, user);
    detail = cockpit.checks.find((x) => x.id === RECONCILIATION_CHECK[normalized]);
  }
  const difference = normalized === 'TAX' ? Number(detail.difference)
    : normalized === 'AR' || normalized === 'AP' ? Number(detail.difference)
      : detail?.data?.executed === false ? null
        : Number.isFinite(Number(detail?.data?.difference)) ? Number(detail.data.difference)
          : detail?.status === 'PASS' ? 0 : null;
  const resultStatus = difference == null ? 'NOT_RUN' : Math.abs(difference) < 1 ? 'MATCHED' : 'EXCEPTION';
  return { schemaVersion: 1, type: normalized, period, resultStatus, difference: difference || 0, detail, generatedAt: new Date().toISOString() };
}

function reconciliationEvidenceView(r) {
  return {
    id:r.id, period:r.period, type:r.reconciliation_type, version:r.version,
    status:r.status, resultStatus:r.result_status, difference:Number(r.difference),
    sha256:r.snapshot_sha256, preparedBy:r.prepared_by, preparedByName:r.prepared_by_name,
    preparedAt:r.prepared_at, approvedBy:r.approved_by, approvedByName:r.approved_by_name,
    approvedAt:r.approved_at, decisionReason:r.decision_reason
  };
}

async function prepareReconciliationEvidence(client, { type, period, user, requestId }) {
  const normalized = String(type || '').toUpperCase();
  assertPermission(user, normalized === 'TAX' ? 'tax.edit' : 'ledger.create');
  const snapshot = await reconciliationSnapshot(client, { type: normalized, period, user });
  const entityId = await accountingConfig.defaultLegalEntityId(client);
  const actionBranchId = await workBranchId(client, user, entityId);
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`reconciliation:${entityId}:${snapshot.period}:${normalized}`]);
  const version = Number((await client.query(`SELECT COALESCE(MAX(version),0)+1 n FROM finance_reconciliation_evidence
    WHERE legal_entity_id=$1 AND period=$2 AND reconciliation_type=$3`, [entityId,snapshot.period,normalized])).rows[0].n);
  const sha = evidenceHash(snapshot);
  const superseded=(await client.query(`UPDATE finance_reconciliation_evidence SET status='SUPERSEDED'
    WHERE legal_entity_id=$1 AND period=$2 AND reconciliation_type=$3 AND status='PREPARED'
    RETURNING id`, [entityId,snapshot.period,normalized])).rows;
  for(const previous of superseded){
    await require('./runtime').actionResolved(client,{
      actionKey:`reconciliation:${previous.id}`,actorUserId:user.id,branchId:actionBranchId,
      sourceEntityType:'FINANCE_RECONCILIATION',sourceEntityId:previous.id,
      resolutionNote:`Evidence digantikan oleh rekonsiliasi ${normalized} ${snapshot.period} versi ${version}.`
    });
  }
  const row=(await client.query(`INSERT INTO finance_reconciliation_evidence
    (legal_entity_id,period,reconciliation_type,version,result_status,difference,snapshot,snapshot_sha256,prepared_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [entityId,snapshot.period,normalized,version,snapshot.resultStatus,snapshot.difference,JSON.stringify(snapshot),sha,user.id])).rows[0];
  await require('./runtime').audit(client,{userId:user.id,action:'PREPARE',module:'ledger',entityType:'FINANCE_RECONCILIATION',entityId:row.id,newValue:{type:normalized,period:snapshot.period,version,resultStatus:snapshot.resultStatus,difference:snapshot.difference,sha256:sha},requestId});
  if(snapshot.resultStatus!=='MATCHED'){
    await require('./runtime').actionRequired(client,{
      actionKey:`reconciliation:${row.id}`,actorUserId:user.id,branchId:actionBranchId,
      itemType:'EXCEPTION',title:`Rekonsiliasi ${normalized} ${snapshot.period}: ${snapshot.resultStatus}`,
      description:`Selisih rekonsiliasi ${snapshot.difference}. Evidence versi ${version} perlu ditinjau.`,
      sourceModule:'ledger',sourceEntityType:'FINANCE_RECONCILIATION',sourceEntityId:row.id,
      assigneeRole:'finance_manager',priority:snapshot.resultStatus==='NOT_RUN'?'URGENT':'HIGH',
      risk:'HIGH',requiredAction:'Tinjau evidence, koreksi sumber selisih, lalu approve/reject dengan alasan.',
      completionCondition:'Evidence rekonsiliasi diputuskan atau digantikan versi baru yang matched.',
      slaMinutes:1440,link:'#/accounting/closing'
    });
  }
  return reconciliationEvidenceView(row);
}

async function decideReconciliationEvidence(client, { id, action, reason, user, requestId }) {
  const row=(await client.query('SELECT * FROM finance_reconciliation_evidence WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!row)throw new AppError('RESOURCE_NOT_FOUND','Evidence rekonsiliasi tidak ditemukan.');
  if(evidenceHash(row.snapshot)!==row.snapshot_sha256)throw new AppError('STATUS_INVALID','Integritas snapshot rekonsiliasi gagal diverifikasi. Proses dihentikan.');
  const tax=row.reconciliation_type==='TAX';
  assertPermission(user,`${tax?'tax':'ledger'}.${action==='approve'?'approve':'reject'}`);
  if(row.status!=='PREPARED')throw new AppError('STATUS_INVALID',`Evidence berstatus ${row.status} tidak dapat diputuskan.`);
  if(String(row.prepared_by)===String(user.id))throw new AppError('SOD_CONFLICT','Penyusun rekonsiliasi tidak boleh menjadi approver.');
  if(action==='reject'&&!String(reason||'').trim())throw new AppError('REASON_REQUIRED','Alasan penolakan rekonsiliasi wajib diisi.');
  if(action==='approve'&&row.result_status!=='MATCHED'&&!String(reason||'').trim())throw new AppError('REASON_REQUIRED',`Evidence ${row.result_status} membutuhkan alasan persetujuan exception.`);
  if(!['approve','reject'].includes(action))throw new AppError('VALIDATION_ERROR','Keputusan rekonsiliasi tidak dikenal.');
  const status=action==='approve'?'APPROVED':'REJECTED';
  const updated=(await client.query(`UPDATE finance_reconciliation_evidence SET status=$2,approved_by=$3,approved_at=now(),decision_reason=$4 WHERE id=$1 RETURNING *`,
    [id,status,user.id,String(reason||'').trim()||null])).rows[0];
  await require('./runtime').audit(client,{userId:user.id,action:action.toUpperCase(),module:'ledger',entityType:'FINANCE_RECONCILIATION',entityId:id,reason:String(reason||'').trim()||null,newValue:{status,type:row.reconciliation_type,period:row.period,version:row.version},requestId});
  if(row.result_status!=='MATCHED'){
    const actionBranchId=await workBranchId(client,user,row.legal_entity_id);
    await require('./runtime').actionResolved(client,{
      actionKey:`reconciliation:${id}`,actorUserId:user.id,branchId:actionBranchId,
      sourceEntityType:'FINANCE_RECONCILIATION',sourceEntityId:id,
      resolutionNote:`Evidence rekonsiliasi ${row.reconciliation_type} ${row.period} ${status.toLowerCase()}.`
    });
  }
  return reconciliationEvidenceView(updated);
}

async function listReconciliationEvidence(client,{period,type,user}={}){
  if(!hasGlobalScope(user))throw new AppError('PERMISSION_DENIED','Daftar evidence rekonsiliasi membutuhkan scope perusahaan.');
  const params=[];let where='TRUE';
  if(period){params.push(assertPeriod(period));where+=` AND e.period=$${params.length}`;}
  if(type){const normalized=String(type).toUpperCase();if(!RECONCILIATION_TYPES.has(normalized))throw new AppError('VALIDATION_ERROR');params.push(normalized);where+=` AND e.reconciliation_type=$${params.length}`;}
  const rows=(await client.query(`SELECT e.*,p.display_name prepared_by_name,a.display_name approved_by_name
    FROM finance_reconciliation_evidence e
    LEFT JOIN app_users p ON p.id=e.prepared_by LEFT JOIN app_users a ON a.id=e.approved_by
    WHERE ${where} ORDER BY e.period DESC,e.reconciliation_type,e.version DESC`,params)).rows;
  return{items:rows.map(reconciliationEvidenceView)};
}

// Period close hanya memakai versi TERBARU per tipe. Evidence lama yang pernah
// disetujui tidak boleh mengesahkan snapshot baru yang masih PREPARED/REJECTED.
async function validateReconciliationEvidenceForClose(client,periodValue){
  const period=assertPeriod(periodValue);
  const rows=(await client.query(`SELECT DISTINCT ON (reconciliation_type) *
    FROM finance_reconciliation_evidence
    WHERE period=$1
    ORDER BY reconciliation_type,version DESC`,[period])).rows;
  const latest=new Map(rows.map(row=>[row.reconciliation_type,row]));
  const issues=[];
  const items=[];
  for(const type of RECONCILIATION_TYPES){
    const row=latest.get(type);
    if(!row){issues.push(`${type}: evidence belum disiapkan`);continue;}
    const integrity=evidenceHash(row.snapshot)===row.snapshot_sha256;
    if(!integrity)issues.push(`${type}: SHA-256 tidak valid`);
    if(row.status!=='APPROVED')issues.push(`${type}: versi terbaru berstatus ${row.status}`);
    if(row.result_status==='NOT_RUN')issues.push(`${type}: rekonsiliasi belum dijalankan`);
    items.push({
      id:row.id,type,version:row.version,status:row.status,
      resultStatus:row.result_status,difference:Number(row.difference),
      sha256:row.snapshot_sha256,integrity,
      preparedBy:row.prepared_by,approvedBy:row.approved_by,
      decisionReason:row.decision_reason
    });
  }
  return{ready:issues.length===0,period,issues,items};
}

// ── Closing cockpit: checklist siap-tutup ────────────────────────────────────
async function closingCockpit(client, value, user) {
  if (!hasGlobalScope(user)) throw new AppError('PERMISSION_DENIED', 'Closing cockpit global membutuhkan scope perusahaan.');
  const period = assertPeriod(value);
  const businessOps = require('./business-operations');
  // §35: akun rekonsiliasi berasal dari konfigurasi peran akun (migrasi 039).
  const roles = await accountingConfig.accountCodes(client, ['INVENTORY', 'PAYROLL_EXPENSE'], period);
  const checks = [];
  const add = (id, name, status, detail, data) => checks.push({ id, name, status, detail, ...(data ? { data } : {}) });

  const summary = await businessOps.accountingSummary(client, period, user);
  add('trial_balance', 'Trial balance seimbang', Math.abs(summary.debitTotal - summary.creditTotal) < 0.01 ? 'PASS' : 'FAIL',
    `D ${idr(summary.debitTotal).toLocaleString('id-ID')} vs C ${idr(summary.creditTotal).toLocaleString('id-ID')}`);

  const unposted = Number((await client.query(`SELECT count(*) n FROM business_documents d
    WHERE ${PERIOD_EXPR}=$1 AND d.document_type IN('INVOICE','CUSTOMER_PAYMENT','SUPPLIER_INVOICE','SUPPLIER_PAYMENT','EXPENSE','PAYROLL_RUN')
    AND d.status NOT IN('DRAFT','CANCELLED','VOID','REJECTED')
    AND NOT EXISTS(SELECT 1 FROM document_postings p WHERE p.document_id=d.id AND p.posting_kind='ACCOUNTING')`, [period])).rows[0].n);
  add('unposted', 'Semua transaksi keuangan terposting', unposted === 0 ? 'PASS' : 'FAIL', unposted === 0 ? 'Tidak ada dokumen menggantung' : `${unposted} dokumen belum diposting`);

  const bankRecon = (await client.query('SELECT * FROM reconciliation_runs WHERE period=$1 ORDER BY created_at DESC LIMIT 1', [period])).rows[0];
  add('bank_reconciliation', 'Rekonsiliasi bank dijalankan', bankRecon ? (Math.abs(Number(bankRecon.difference)) < 0.01 ? 'PASS' : 'WARN') : 'WARN',
    bankRecon ? `Selisih ${idr(bankRecon.difference).toLocaleString('id-ID')}` : 'Belum dijalankan periode ini',
    {executed:!!bankRecon,difference:bankRecon?idr(bankRecon.difference):0});

  // Rekonsiliasi inventori: GL persediaan kumulatif vs nilai saldo stok berjalan.
  const glInv = Number((await client.query(`SELECT COALESCE(SUM(j.debit-j.credit),0)::float n FROM journal_lines j
    JOIN chart_of_accounts a ON a.id=j.account_id JOIN business_documents d ON d.id=j.journal_document_id
    WHERE a.code=$2 AND ${PERIOD_EXPR}<=$1`, [period, roles.INVENTORY])).rows[0].n);
  const subInv = Number((await client.query('SELECT COALESCE(SUM(value_idr),0)::float n FROM inventory_balances')).rows[0].n);
  add('inventory_reconciliation', `Rekonsiliasi inventori (GL ${roles.INVENTORY} vs saldo stok)`, Math.abs(glInv - subInv) < 1 ? 'PASS' : 'WARN',
    `GL ${idr(glInv).toLocaleString('id-ID')} vs subledger stok ${idr(subInv).toLocaleString('id-ID')} (selisih ${idr(glInv - subInv).toLocaleString('id-ID')})`,
    {executed:true,difference:idr(glInv-subInv)});

  // Rekonsiliasi payroll: beban gaji GL periode vs total payroll run periode.
  const glPayroll = Number((await client.query(`SELECT COALESCE(SUM(j.debit-j.credit),0)::float n FROM journal_lines j
    JOIN chart_of_accounts a ON a.id=j.account_id JOIN business_documents d ON d.id=j.journal_document_id
    WHERE a.code=$2 AND ${PERIOD_EXPR}=$1`, [period, roles.PAYROLL_EXPENSE])).rows[0].n);
  const payrollDocs = Number((await client.query(`SELECT COALESCE(SUM(i.net_pay+i.pph21),0)::float n FROM payroll_items i
    JOIN business_documents d ON d.id=i.payroll_document_id WHERE d.payload->>'period'=$1 AND d.status NOT IN('DRAFT','CANCELLED','VOID','REJECTED')`, [period])).rows[0].n);
  add('payroll_reconciliation', `Rekonsiliasi payroll (GL ${roles.PAYROLL_EXPENSE} vs payroll items)`,
    payrollDocs === 0 && glPayroll === 0 ? 'PASS' : Math.abs(glPayroll - payrollDocs) < 1 ? 'PASS' : 'WARN',
    `GL ${idr(glPayroll).toLocaleString('id-ID')} vs payroll ${idr(payrollDocs).toLocaleString('id-ID')}`,
    {executed:true,difference:idr(glPayroll-payrollDocs)});

  // Rekonsiliasi pajak nyata (Wave D.2): subledger tax_records vs GL akun pajak.
  const taxRecon = await taxReconciliation(client, { period, user });
  add('tax_reconciliation', `Rekonsiliasi pajak (subledger vs GL ${taxRecon.taxAccount})`,
    Math.abs(taxRecon.difference) < 1 ? 'PASS' : 'WARN',
    `Subledger ${idr(taxRecon.subledgerTotal).toLocaleString('id-ID')} vs GL akrual ${idr(taxRecon.glAccrued).toLocaleString('id-ID')} (selisih ${idr(taxRecon.difference).toLocaleString('id-ID')})`);

  const depreciation = Number((await client.query('SELECT count(*)::int n FROM asset_depreciation_entries WHERE period=$1', [period])).rows[0].n);
  const activeAssets = Number((await client.query(`SELECT count(*)::int n FROM fixed_assets WHERE status='ACTIVE'`)).rows[0].n);
  add('depreciation', 'Penyusutan aset periode dijalankan', activeAssets === 0 ? 'PASS' : depreciation > 0 ? 'PASS' : 'WARN',
    activeAssets === 0 ? 'Tidak ada aset aktif' : depreciation > 0 ? `${depreciation} aset tersusut` : `${activeAssets} aset aktif belum disusutkan`);

  const subAr = await subledger(client, { type: 'AR', period, user });
  add('subledger_ar', 'Subledger AR selaras GL 1200', Math.abs(subAr.difference) < 1 ? 'PASS' : 'WARN', `Selisih ${subAr.difference.toLocaleString('id-ID')}`);
  const subAp = await subledger(client, { type: 'AP', period, user });
  add('subledger_ap', 'Subledger AP selaras GL 2100', Math.abs(subAp.difference) < 1 ? 'PASS' : 'WARN', `Selisih ${subAp.difference.toLocaleString('id-ID')}`);

  const dunningCritical = Number((await client.query(`SELECT count(*)::int n FROM dunning_notices WHERE status='ISSUED' AND level>=3`)).rows[0].n);
  add('collection', 'Tidak ada tunggakan kritis terbuka', dunningCritical === 0 ? 'PASS' : 'WARN', dunningCritical === 0 ? 'Bersih' : `${dunningCritical} notice level 3 terbuka`);

  const fails = checks.filter((x) => x.status === 'FAIL').length;
  const warns = checks.filter((x) => x.status === 'WARN').length;
  return {
    period, closingStatus: summary.closingStatus, checks,
    readiness: fails > 0 ? 'BLOCKED' : warns > 0 ? 'REVIEW' : 'READY',
    summary: { pass: checks.length - fails - warns, warn: warns, fail: fails }
  };
}

// ── Cut-over: jurnal saldo awal persediaan (Sprint 18 prep) ─────────────────
// Menyelaraskan GL 1300 dengan subledger stok SEKALI saat cut-over:
// selisih dibukukan D/C 1300 lawan 3900 (ekuitas saldo awal). Idempoten —
// dokumen opening kedua ditolak replay; dijalankan Owner via script cut-over
// atau tombol closing cockpit. Menutup WARNING inventory pada final assurance.
async function postInventoryOpeningBalance(client, { user, requestId }) {
  const posting = require('./posting');
  const runtime = require('./runtime');
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', ['cutover:opening-inventory']);
  const existing = (await client.query(`SELECT document_number,created_at FROM business_documents
    WHERE document_type='JOURNAL' AND payload->>'source'='INVENTORY_OPENING_BALANCE' AND status NOT IN ('CANCELLED','VOID') LIMIT 1`)).rows[0];
  if (existing) return { replay: true, documentNumber: existing.document_number, postedAt: existing.created_at };
  // §35: akun persediaan & lawan ekuitas dari konfigurasi peran akun.
  const roles = await accountingConfig.accountCodes(client, ['INVENTORY', 'RETAINED_EARNINGS']);
  const sub = Number((await client.query('SELECT COALESCE(SUM(value_idr),0)::float n FROM inventory_balances')).rows[0].n);
  const gl = Number((await client.query(`SELECT COALESCE(SUM(j.debit-j.credit),0)::float n FROM journal_lines j
    JOIN chart_of_accounts a ON a.id=j.account_id WHERE a.code=$1`, [roles.INVENTORY])).rows[0].n);
  const difference = idr(sub - gl);
  if (Math.abs(difference) < 1) return { documentNumber: null, difference: 0, message: `GL ${roles.INVENTORY} sudah selaras dengan subledger stok — tidak ada jurnal dibuat.` };
  const accounts = (await client.query(`SELECT id,code FROM chart_of_accounts WHERE code=ANY($1) AND active`, [[roles.INVENTORY, roles.RETAINED_EARNINGS]])).rows.reduce((o, r) => (o[r.code] = r.id, o), {});
  if (!accounts[roles.INVENTORY] || !accounts[roles.RETAINED_EARNINGS]) throw new AppError('RESOURCE_NOT_FOUND', `Akun ${roles.INVENTORY}/${roles.RETAINED_EARNINGS} tidak ditemukan di COA.`);
  const doc = await runtime.createDocument(client, {
    type: 'JOURNAL', user, title: 'Saldo awal persediaan (cut-over)', amount: Math.abs(difference), requestId,
    payload: { source: 'INVENTORY_OPENING_BALANCE', subledger: sub, glBefore: gl, difference, period: new Date().toISOString().slice(0, 7) }
  });
  await client.query(`UPDATE business_documents SET status='APPROVED',approved_at=now(),approved_by=$2,version=version+1 WHERE id=$1`, [doc.id, user.id]);
  await posting.claimPosting(client, { id: doc.id }, user, 'ACCOUNTING');
  await posting.ensureOpenPeriod(client, { payload: { period: new Date().toISOString().slice(0, 7) }, createdAt: new Date() });
  const { randomUUID } = require('node:crypto');
  const memo = `${doc.documentNumber} · saldo awal persediaan cut-over`;
  if (difference > 0) {
    await client.query(`INSERT INTO journal_lines(id,journal_document_id,account_id,debit,credit,memo) VALUES($1,$2,$3,$4,0,$5)`, [randomUUID(), doc.id, accounts[roles.INVENTORY], difference, memo]);
    await client.query(`INSERT INTO journal_lines(id,journal_document_id,account_id,debit,credit,memo) VALUES($1,$2,$3,0,$4,$5)`, [randomUUID(), doc.id, accounts[roles.RETAINED_EARNINGS], difference, memo]);
  } else {
    await client.query(`INSERT INTO journal_lines(id,journal_document_id,account_id,debit,credit,memo) VALUES($1,$2,$3,$4,0,$5)`, [randomUUID(), doc.id, accounts[roles.RETAINED_EARNINGS], -difference, memo]);
    await client.query(`INSERT INTO journal_lines(id,journal_document_id,account_id,debit,credit,memo) VALUES($1,$2,$3,0,$4,$5)`, [randomUUID(), doc.id, accounts[roles.INVENTORY], -difference, memo]);
  }
  await posting.finishPosting(client, { id: doc.id }, 'ACCOUNTING', { source: 'INVENTORY_OPENING_BALANCE', difference });
  const runtime2 = require('./runtime');
  await runtime2.audit(client, { userId: user.id, action: 'POST', module: 'closing', entityType: 'INVENTORY_OPENING_BALANCE', entityId: doc.id, documentNumber: doc.documentNumber, newValue: { subledger: sub, glBefore: gl, difference }, requestId });
  return { documentNumber: doc.documentNumber, subledger: sub, glBefore: gl, difference, glAfter: idr(gl + difference) };
}

// ── Wave D.3: laporan keuangan ber-versi (prepare → review → sign-off) ────────
function reportView(r) {
  return {
    id: r.id, period: r.period, version: r.version, status: r.status,
    netIncome: r.net_income != null ? Number(r.net_income) : null,
    totalAssets: r.total_assets != null ? Number(r.total_assets) : null,
    balanced: r.balanced, sha256: r.snapshot_sha256,
    preparedBy: r.prepared_by, preparedByName:r.prepared_by_name, preparedAt: r.prepared_at,
    reviewedBy: r.reviewed_by, reviewedByName:r.reviewed_by_name, reviewedAt: r.reviewed_at,
    signedOffBy: r.signed_off_by, signedOffByName:r.signed_off_by_name, signedOffAt: r.signed_off_at,
    decisionReason: r.decision_reason
  };
}

async function prepareFinancialReport(client, { period: value, user, requestId }) {
  assertPermission(user, 'report.create');
  if (!hasGlobalScope(user)) throw new AppError('PERMISSION_DENIED', 'Laporan keuangan resmi disiapkan pada scope perusahaan.');
  const period = assertPeriod(value);
  const snapshot = await financialStatements(client, period, user);
  if (snapshot.balanceSheet.publishBlocked) {
    throw new AppError('VALIDATION_ERROR', 'Laporan tidak dapat disiapkan: ada akun tak terpetakan (UNMAPPED). Bereskan bagan akun dahulu.', { unmappedTotal: snapshot.balanceSheet.unmappedTotal });
  }
  const entityId = await accountingConfig.defaultLegalEntityId(client);
  const sha = evidenceHash(snapshot);
  const version = Number((await client.query('SELECT COALESCE(MAX(version),0)+1 v FROM financial_reports WHERE legal_entity_id=$1 AND period=$2', [entityId, period])).rows[0].v);
  const row = (await client.query(
    `INSERT INTO financial_reports(legal_entity_id,period,version,status,snapshot,snapshot_sha256,net_income,total_assets,balanced,prepared_by)
     VALUES($1,$2,$3,'PREPARED',$4,$5,$6,$7,$8,$9) RETURNING *`,
    [entityId, period, version, JSON.stringify(snapshot), sha, snapshot.incomeStatement.netIncome, snapshot.balanceSheet.totalAssets, snapshot.balanceSheet.balanced, user.id])).rows[0];
  await require('./runtime').audit(client, { userId: user.id, action: 'PREPARE', module: 'report', entityType: 'FINANCIAL_REPORT', entityId: row.id, newValue: { period, version, sha256: sha, netIncome: Number(row.net_income) }, requestId });
  return reportView(row);
}

// review → signoff → reject, dengan SoD (reviewer != preparer, signer != reviewer)
// ditegakkan aplikasi DAN constraint database.
async function decideFinancialReport(client, { id, action, reason, user, requestId }) {
  const row = (await client.query('SELECT * FROM financial_reports WHERE id=$1 FOR UPDATE', [id])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Laporan keuangan tidak ditemukan.');
  const actualSha=evidenceHash(row.snapshot);
  if(actualSha!==row.snapshot_sha256)throw new AppError('STATUS_INVALID','Integritas snapshot laporan gagal diverifikasi. Proses dihentikan.');
  if (action === 'review') {
    assertPermission(user, 'report.submit');
    if (row.status !== 'PREPARED') throw new AppError('STATUS_INVALID', `Laporan berstatus ${row.status} tidak dapat direview.`);
    if (String(row.prepared_by) === String(user.id)) throw new AppError('SOD_CONFLICT', 'Reviewer tidak boleh sama dengan penyusun laporan.');
    await client.query(`UPDATE financial_reports SET status='REVIEWED',reviewed_by=$2,reviewed_at=now() WHERE id=$1`, [id, user.id]);
  } else if (action === 'signoff') {
    assertPermission(user, 'report.approve');
    if (row.status !== 'REVIEWED') throw new AppError('STATUS_INVALID', `Laporan berstatus ${row.status} belum dapat ditandatangani (wajib REVIEWED).`);
    if (String(row.reviewed_by) === String(user.id)) throw new AppError('SOD_CONFLICT', 'Penandatangan tidak boleh sama dengan reviewer.');
    const entityId=await accountingConfig.defaultLegalEntityId(client);
    const closed=(await client.query(`SELECT 1 FROM accounting_periods WHERE legal_entity_id=$1 AND period=$2 AND status='CLOSED'`,[entityId,row.period])).rowCount;
    if(!closed)throw new AppError('STATUS_INVALID',`Periode ${row.period} belum ditutup. Sign-off resmi hanya boleh dilakukan setelah period close.`);
    if(!row.balanced)throw new AppError('STATUS_INVALID','Neraca snapshot tidak seimbang dan tidak dapat ditandatangani.');
    await client.query(`UPDATE financial_reports SET status='SIGNED_OFF',signed_off_by=$2,signed_off_at=now() WHERE id=$1`, [id, user.id]);
  } else if (action === 'reject') {
    assertPermission(user, 'report.reject');
    if (!['PREPARED', 'REVIEWED'].includes(row.status)) throw new AppError('STATUS_INVALID', `Laporan berstatus ${row.status} tidak dapat ditolak.`);
    if (!reason) throw new AppError('REASON_REQUIRED', 'Penolakan laporan membutuhkan alasan.');
    await client.query(`UPDATE financial_reports SET status='REJECTED',decision_reason=$2 WHERE id=$1`, [id, reason]);
  } else throw new AppError('VALIDATION_ERROR', 'Aksi laporan tidak dikenal.');
  await require('./runtime').audit(client, { userId: user.id, action: action.toUpperCase(), module: 'report', entityType: 'FINANCIAL_REPORT', entityId: id, reason: reason || null, newValue: { period: row.period, version: row.version }, requestId });
  return reportView((await client.query('SELECT * FROM financial_reports WHERE id=$1', [id])).rows[0]);
}

async function listFinancialReports(client, { period, user }) {
  if (!hasGlobalScope(user)) throw new AppError('PERMISSION_DENIED', 'Daftar laporan keuangan resmi membutuhkan scope perusahaan.');
  const rows = (await client.query(`SELECT f.id,f.period,f.version,f.status,f.net_income,f.total_assets,f.balanced,f.snapshot_sha256,
    f.prepared_by,f.prepared_at,f.reviewed_by,f.reviewed_at,f.signed_off_by,f.signed_off_at,f.decision_reason,
    p.display_name prepared_by_name,r.display_name reviewed_by_name,s.display_name signed_off_by_name
    FROM financial_reports f LEFT JOIN app_users p ON p.id=f.prepared_by
    LEFT JOIN app_users r ON r.id=f.reviewed_by LEFT JOIN app_users s ON s.id=f.signed_off_by
    ${period ? 'WHERE f.period=$1' : ''} ORDER BY f.period DESC, f.version DESC`, period ? [assertPeriod(period)] : [])).rows;
  return { items: rows.map(reportView) };
}
async function financialReportDetail(client, id, user) {
  if (!hasGlobalScope(user)) throw new AppError('PERMISSION_DENIED', 'Detail laporan keuangan resmi membutuhkan scope perusahaan.');
  const row = (await client.query(`SELECT f.*,p.display_name prepared_by_name,r.display_name reviewed_by_name,s.display_name signed_off_by_name
    FROM financial_reports f LEFT JOIN app_users p ON p.id=f.prepared_by
    LEFT JOIN app_users r ON r.id=f.reviewed_by LEFT JOIN app_users s ON s.id=f.signed_off_by WHERE f.id=$1`, [id])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Laporan keuangan tidak ditemukan.');
  const actualSha=evidenceHash(row.snapshot);
  return { ...reportView(row), snapshot: row.snapshot, integrity:{valid:actualSha===row.snapshot_sha256,expected:row.snapshot_sha256,actual:actualSha} };
}

async function listPeriodCloseEvidence(client,{period,user}={}){
  if(!hasGlobalScope(user))throw new AppError('PERMISSION_DENIED','Evidence period close membutuhkan scope perusahaan.');
  const rows=(await client.query(`SELECT c.id,c.period,c.status,c.evidence_sha256,c.close_reason,c.closed_at,c.reopened_at,c.reopen_reason,
    u.display_name closed_by_name,r.display_name reopened_by_name
    FROM accounting_period_close_runs c LEFT JOIN app_users u ON u.id=c.closed_by
    LEFT JOIN app_users r ON r.id=c.reopened_by ${period?'WHERE c.period=$1':''} ORDER BY c.closed_at DESC`,
    period?[assertPeriod(period)]:[])).rows;
  return{items:rows.map(x=>({id:x.id,period:x.period,status:x.status,sha256:x.evidence_sha256,closeReason:x.close_reason,closedAt:x.closed_at,closedByName:x.closed_by_name,reopenedAt:x.reopened_at,reopenedByName:x.reopened_by_name,reopenReason:x.reopen_reason}))};
}

module.exports = { financialStatements, subledger, taxReconciliation, closingCockpit, postInventoryOpeningBalance,
  reconciliationSnapshot,prepareReconciliationEvidence,decideReconciliationEvidence,listReconciliationEvidence,
  validateReconciliationEvidenceForClose,
  prepareFinancialReport, decideFinancialReport, listFinancialReports, financialReportDetail,listPeriodCloseEvidence };
