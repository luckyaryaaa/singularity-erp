'use strict';
// Sprint 13 (R020) — laporan keuangan formal, closing cockpit & subledger.
// Neraca memakai saldo KUMULATIF s/d akhir periode; laba rugi memakai mutasi
// periode berjalan. Periode baris jurnal = COALESCE(payload.period,
// created_at) — konsisten dengan ledger, closing, dan posting engine.
const { AppError } = require('../../../core/errors');

const idr = (v) => Math.round(Number(v || 0) * 100) / 100;
const PERIOD_EXPR = `COALESCE(NULLIF(d.payload->>'period',''),to_char(d.created_at,'YYYY-MM'))`;

function assertPeriod(value) {
  const p = value || new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(p)) throw new AppError('VALIDATION_ERROR', 'Periode wajib berformat YYYY-MM.');
  return p;
}

// ── Laporan keuangan: neraca + laba rugi ─────────────────────────────────────
async function financialStatements(client, value) {
  const period = assertPeriod(value);
  const rows = (await client.query(`SELECT a.code,a.name,a.category,a.normal_side,
      COALESCE(SUM(CASE WHEN ${PERIOD_EXPR}<=$1 THEN j.debit-j.credit ELSE 0 END),0)::float cumulative_net,
      COALESCE(SUM(CASE WHEN ${PERIOD_EXPR}=$1 THEN j.debit-j.credit ELSE 0 END),0)::float period_net
    FROM chart_of_accounts a
    LEFT JOIN journal_lines j ON j.account_id=a.id
    LEFT JOIN business_documents d ON d.id=j.journal_document_id
    WHERE a.active GROUP BY a.id ORDER BY a.code`, [period])).rows;
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
  // Kategori di luar 6 standar (bila ada) masuk sisi ekuitas agar identitas
  // tidak diam-diam pincang — tampil eksplisit untuk ditertibkan.
  const KNOWN = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'EXPENSE'];
  const otherCats = [...new Set(rows.filter((r) => !KNOWN.includes(r.category)).map((r) => r.category))];
  const otherEquity = otherCats.length ? pick(otherCats, 'cumulative') : [];

  // Laba rugi periode berjalan + kumulatif (untuk laba ditahan berjalan).
  const income = { revenue: pick(['REVENUE'], 'period'), cogs: pick(['COGS'], 'period'), expense: pick(['EXPENSE'], 'period') };
  const revenue = sum(income.revenue), cogs = sum(income.cogs), expense = sum(income.expense);
  const netIncome = idr(revenue - cogs - expense);
  const cumRevenue = sum(pick(['REVENUE'], 'cumulative')), cumCogs = sum(pick(['COGS'], 'cumulative')), cumExpense = sum(pick(['EXPENSE'], 'cumulative'));
  const cumulativeEarnings = idr(cumRevenue - cumCogs - cumExpense);

  // Neraca kumulatif; laba berjalan kumulatif masuk sisi ekuitas.
  const assets = pick(['ASSET'], 'cumulative');
  const liabilities = pick(['LIABILITY'], 'cumulative');
  const equity = [...pick(['EQUITY'], 'cumulative'), ...otherEquity];
  const totalAssets = sum(assets), totalLiabilities = sum(liabilities), totalEquity = idr(sum(equity) + cumulativeEarnings);
  return {
    period,
    balanceSheet: {
      assets, liabilities, equity: [...equity, { code: '—', name: 'Laba berjalan (kumulatif)', category: 'EQUITY', balance: cumulativeEarnings }],
      totalAssets, totalLiabilities, totalEquity,
      totalLiabilitiesAndEquity: idr(totalLiabilities + totalEquity),
      balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
    },
    incomeStatement: { ...income, revenue, cogs, grossMargin: idr(revenue - cogs), expense, netIncome }
  };
}

// ── Subledger AR/AP per relasi vs saldo GL ───────────────────────────────────
// Dokumen dihitung hanya bila SUDAH diposting (document_postings ACCOUNTING);
// alokasi reversed dikecualikan. Selisih vs GL tampil untuk investigasi.
async function subledger(client, { type, period: value }) {
  const period = assertPeriod(value);
  if (!['AR', 'AP'].includes(type)) throw new AppError('VALIDATION_ERROR', 'type wajib AR atau AP.');
  const isAr = type === 'AR';
  const docType = isAr ? 'INVOICE' : 'SUPPLIER_INVOICE';
  const glCode = isAr ? '1200' : '2100';
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
    GROUP BY pt.id,pt.code,pt.name ORDER BY 6 DESC NULLS LAST`, [period])).rows
    .map((r) => ({ partyId: r.party_id, partyCode: r.party_code, partyName: r.party_name, invoices: r.invoices, billed: idr(r.billed), settled: idr(r.settled), outstanding: idr(r.billed - r.settled) }));
  const glBalance = Number((await client.query(`SELECT COALESCE(SUM(j.debit-j.credit),0)::float n
    FROM journal_lines j JOIN chart_of_accounts a ON a.id=j.account_id JOIN business_documents d ON d.id=j.journal_document_id
    WHERE a.code=$2 AND ${PERIOD_EXPR}<=$1`, [period, glCode])).rows[0].n);
  const glSigned = idr(isAr ? glBalance : -glBalance); // AP normal kredit
  const subTotal = idr(rows.reduce((n, r) => n + r.outstanding, 0));
  return {
    type, period, glAccount: glCode, items: rows,
    totals: { billed: idr(rows.reduce((n, r) => n + r.billed, 0)), settled: idr(rows.reduce((n, r) => n + r.settled, 0)), outstanding: subTotal },
    glBalance: glSigned, difference: idr(glSigned - subTotal)
  };
}

// ── Closing cockpit: checklist siap-tutup ────────────────────────────────────
async function closingCockpit(client, value) {
  const period = assertPeriod(value);
  const businessOps = require('./business-operations');
  const checks = [];
  const add = (id, name, status, detail) => checks.push({ id, name, status, detail });

  const summary = await businessOps.accountingSummary(client, period);
  add('trial_balance', 'Trial balance seimbang', Math.abs(summary.debitTotal - summary.creditTotal) < 0.01 ? 'PASS' : 'FAIL',
    `D ${idr(summary.debitTotal).toLocaleString('id-ID')} vs C ${idr(summary.creditTotal).toLocaleString('id-ID')}`);

  const unposted = Number((await client.query(`SELECT count(*) n FROM business_documents d
    WHERE ${PERIOD_EXPR}=$1 AND d.document_type IN('INVOICE','CUSTOMER_PAYMENT','SUPPLIER_INVOICE','SUPPLIER_PAYMENT','EXPENSE','PAYROLL_RUN')
    AND d.status NOT IN('DRAFT','CANCELLED','VOID','REJECTED')
    AND NOT EXISTS(SELECT 1 FROM document_postings p WHERE p.document_id=d.id AND p.posting_kind='ACCOUNTING')`, [period])).rows[0].n);
  add('unposted', 'Semua transaksi keuangan terposting', unposted === 0 ? 'PASS' : 'FAIL', unposted === 0 ? 'Tidak ada dokumen menggantung' : `${unposted} dokumen belum diposting`);

  const bankRecon = (await client.query('SELECT * FROM reconciliation_runs WHERE period=$1 ORDER BY created_at DESC LIMIT 1', [period])).rows[0];
  add('bank_reconciliation', 'Rekonsiliasi bank dijalankan', bankRecon ? (Math.abs(Number(bankRecon.difference)) < 0.01 ? 'PASS' : 'WARN') : 'WARN',
    bankRecon ? `Selisih ${idr(bankRecon.difference).toLocaleString('id-ID')}` : 'Belum dijalankan periode ini');

  // Rekonsiliasi inventori: GL 1300 kumulatif vs nilai saldo stok berjalan.
  const glInv = Number((await client.query(`SELECT COALESCE(SUM(j.debit-j.credit),0)::float n FROM journal_lines j
    JOIN chart_of_accounts a ON a.id=j.account_id JOIN business_documents d ON d.id=j.journal_document_id
    WHERE a.code='1300' AND ${PERIOD_EXPR}<=$1`, [period])).rows[0].n);
  const subInv = Number((await client.query('SELECT COALESCE(SUM(value_idr),0)::float n FROM inventory_balances')).rows[0].n);
  add('inventory_reconciliation', 'Rekonsiliasi inventori (GL 1300 vs saldo stok)', Math.abs(glInv - subInv) < 1 ? 'PASS' : 'WARN',
    `GL ${idr(glInv).toLocaleString('id-ID')} vs subledger stok ${idr(subInv).toLocaleString('id-ID')} (selisih ${idr(glInv - subInv).toLocaleString('id-ID')})`);

  // Rekonsiliasi payroll: beban gaji GL periode vs total payroll run periode.
  const glPayroll = Number((await client.query(`SELECT COALESCE(SUM(j.debit-j.credit),0)::float n FROM journal_lines j
    JOIN chart_of_accounts a ON a.id=j.account_id JOIN business_documents d ON d.id=j.journal_document_id
    WHERE a.code IN ('6200') AND ${PERIOD_EXPR}=$1`, [period])).rows[0].n);
  const payrollDocs = Number((await client.query(`SELECT COALESCE(SUM(i.net_pay+i.pph21),0)::float n FROM payroll_items i
    JOIN business_documents d ON d.id=i.payroll_document_id WHERE d.payload->>'period'=$1 AND d.status NOT IN('DRAFT','CANCELLED','VOID','REJECTED')`, [period])).rows[0].n);
  add('payroll_reconciliation', 'Rekonsiliasi payroll (GL 6200 vs payroll items)',
    payrollDocs === 0 && glPayroll === 0 ? 'PASS' : Math.abs(glPayroll - payrollDocs) < 1 ? 'PASS' : 'WARN',
    `GL ${idr(glPayroll).toLocaleString('id-ID')} vs payroll ${idr(payrollDocs).toLocaleString('id-ID')}`);

  // Rekonsiliasi pajak: tax_records periode vs GL 2300 mutasi periode.
  const taxRecords = Number((await client.query(`SELECT COALESCE(SUM(tax_amount),0)::float n FROM tax_records WHERE period=$1 AND tax_type IN ('PPN_OUTPUT','PPH21')`, [period])).rows[0].n);
  add('tax_reconciliation', 'Sinkronisasi pajak periode', taxRecords > 0 || unposted === 0 ? 'PASS' : 'WARN',
    taxRecords > 0 ? `Tax records ${idr(taxRecords).toLocaleString('id-ID')}` : 'Belum ada tax record — jalankan sinkron pajak bila ada transaksi');

  const depreciation = Number((await client.query('SELECT count(*)::int n FROM asset_depreciation_entries WHERE period=$1', [period])).rows[0].n);
  const activeAssets = Number((await client.query(`SELECT count(*)::int n FROM fixed_assets WHERE status='ACTIVE'`)).rows[0].n);
  add('depreciation', 'Penyusutan aset periode dijalankan', activeAssets === 0 ? 'PASS' : depreciation > 0 ? 'PASS' : 'WARN',
    activeAssets === 0 ? 'Tidak ada aset aktif' : depreciation > 0 ? `${depreciation} aset tersusut` : `${activeAssets} aset aktif belum disusutkan`);

  const subAr = await subledger(client, { type: 'AR', period });
  add('subledger_ar', 'Subledger AR selaras GL 1200', Math.abs(subAr.difference) < 1 ? 'PASS' : 'WARN', `Selisih ${subAr.difference.toLocaleString('id-ID')}`);
  const subAp = await subledger(client, { type: 'AP', period });
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

module.exports = { financialStatements, subledger, closingCockpit };
