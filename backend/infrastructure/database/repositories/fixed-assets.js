'use strict';
// Sprint 13 (R020) — registry aset tetap & depresiasi otomatis.
// Prinsip §35: umur manfaat, metode, dan AKUN jurnal berasal dari
// asset_categories (configuration-driven, bukan hardcode). Penyusutan
// idempoten per aset per periode; jurnal batch dibuat sebagai dokumen
// JOURNAL sistem sehingga muncul di buku besar dengan jejak lengkap.
const { randomUUID } = require('node:crypto');
const { AppError } = require('../../../core/errors');

const idr = (v) => Math.round(Number(v || 0) * 100) / 100;

async function nextAssetNumber(client) {
  const year = new Date().getFullYear();
  const seq = (await client.query(`SELECT count(*)::int n FROM fixed_assets WHERE asset_number LIKE $1`, [`FA-${year}-%`])).rows[0];
  return `FA-${year}-${String(seq.n + 1).padStart(4, '0')}`;
}

async function getCategory(client, code) {
  const cat = (await client.query('SELECT * FROM asset_categories WHERE code=$1 AND active', [code])).rows[0];
  if (!cat) throw new AppError('RESOURCE_NOT_FOUND', `Kategori aset '${code}' tidak ditemukan.`);
  return cat;
}

function usefulLife(asset, category) { return Number(asset.useful_life_months || category.useful_life_months); }
function monthlyDepreciation(asset, category) {
  return idr((Number(asset.acquisition_cost) - Number(asset.salvage_value)) / usefulLife(asset, category));
}

async function createAsset(client, { name, categoryCode, acquisitionDate, acquisitionCost, salvageValue, usefulLifeMonths, custodianEmployeeId, location, sourceDocumentId, notes, user, requestId }) {
  if (!name || !String(name).trim()) throw new AppError('VALIDATION_ERROR', 'Nama aset wajib diisi.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(acquisitionDate || ''))) throw new AppError('VALIDATION_ERROR', 'Tanggal perolehan wajib berformat YYYY-MM-DD.');
  const cost = Number(acquisitionCost), salvage = Number(salvageValue || 0);
  if (!(cost > 0)) throw new AppError('VALIDATION_ERROR', 'Nilai perolehan harus lebih dari nol.');
  if (salvage < 0 || salvage >= cost) throw new AppError('VALIDATION_ERROR', 'Nilai residu harus 0 sampai di bawah nilai perolehan.');
  const category = await getCategory(client, categoryCode);
  if (usefulLifeMonths !== undefined && usefulLifeMonths !== null && !(Number(usefulLifeMonths) > 0)) throw new AppError('VALIDATION_ERROR', 'Umur manfaat override harus lebih dari nol bulan.');
  if (sourceDocumentId) {
    const src = (await client.query('SELECT id FROM business_documents WHERE id=$1', [sourceDocumentId])).rows[0];
    if (!src) throw new AppError('RESOURCE_NOT_FOUND', 'Dokumen sumber perolehan tidak ditemukan.');
  }
  const row = (await client.query(`INSERT INTO fixed_assets(id,asset_number,name,category_id,branch_id,custodian_employee_id,location,source_document_id,acquisition_date,acquisition_cost,salvage_value,useful_life_months,notes,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`, [
    randomUUID(), await nextAssetNumber(client), String(name).slice(0, 200), category.id, user.branchId || null,
    custodianEmployeeId || null, location ? String(location).slice(0, 160) : null, sourceDocumentId || null,
    acquisitionDate, cost, salvage, usefulLifeMonths || null, notes ? String(notes).slice(0, 1000) : null, user.id])).rows[0];
  const runtime = require('./runtime');
  await runtime.audit(client, { userId: user.id, action: 'CREATE', module: 'asset', entityType: 'FIXED_ASSET', entityId: row.id, documentNumber: row.asset_number, newValue: { name: row.name, category: categoryCode, cost, monthly: monthlyDepreciation(row, category) }, requestId, branchId: user.branchId });
  return runtime.camel(row);
}

async function listAssets(client, user, params = {}) {
  const runtime = require('./runtime');
  const where = ['1=1']; const args = [];
  if (params.status) { args.push(params.status); where.push(`a.status=$${args.length}`); }
  if (params.search) { args.push(`%${params.search}%`); where.push(`(a.asset_number ILIKE $${args.length} OR a.name ILIKE $${args.length})`); }
  const rows = (await client.query(`SELECT a.*,c.code category_code,c.name category_name,c.useful_life_months category_life,
      e.name custodian_name,b.name branch_name,d.document_number source_number,
      COALESCE(dep.total,0)::float accumulated,COALESCE(dep.periods,0)::int periods_depreciated
    FROM fixed_assets a JOIN asset_categories c ON c.id=a.category_id
    LEFT JOIN employees e ON e.id=a.custodian_employee_id LEFT JOIN branches b ON b.id=a.branch_id
    LEFT JOIN business_documents d ON d.id=a.source_document_id
    LEFT JOIN LATERAL (SELECT SUM(amount) total,COUNT(*) periods FROM asset_depreciation_entries WHERE asset_id=a.id) dep ON true
    WHERE ${where.join(' AND ')} ORDER BY a.asset_number LIMIT 300`, args)).rows;
  const items = rows.map((r) => {
    const out = runtime.camel(r);
    out.bookValue = idr(Number(r.acquisition_cost) - Number(r.accumulated));
    out.monthlyDepreciation = monthlyDepreciation(r, { useful_life_months: r.category_life });
    return out;
  });
  const totals = items.reduce((o, a) => ({ cost: idr(o.cost + Number(a.acquisitionCost)), accumulated: idr(o.accumulated + Number(a.accumulated)), bookValue: idr(o.bookValue + a.bookValue) }), { cost: 0, accumulated: 0, bookValue: 0 });
  return { items, totals };
}

// ── Depresiasi berjalan (bulan penuh, garis lurus) ───────────────────────────
// Idempoten: UNIQUE(asset_id,period) + advisory lock per periode. Satu run =
// satu dokumen JOURNAL berisi agregat per kategori (D beban / C akumulasi).
async function runDepreciation(client, { period, user, requestId }) {
  if (!/^\d{4}-\d{2}$/.test(String(period || ''))) throw new AppError('VALIDATION_ERROR', 'Periode wajib berformat YYYY-MM.');
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`depreciation:${period}`]);
  const posting = require('./posting');
  const runtime = require('./runtime');
  const periodEnd = `${period}-01`;
  const assets = (await client.query(`SELECT a.*,c.code category_code,c.useful_life_months category_life,
      c.expense_account_code,c.accumulated_account_code,
      COALESCE((SELECT SUM(amount) FROM asset_depreciation_entries e WHERE e.asset_id=a.id),0) accumulated
    FROM fixed_assets a JOIN asset_categories c ON c.id=a.category_id
    WHERE a.status='ACTIVE' AND a.acquisition_date<=($1::date + interval '1 month' - interval '1 day')::date
      AND NOT EXISTS (SELECT 1 FROM asset_depreciation_entries e WHERE e.asset_id=a.id AND e.period=$2)
    ORDER BY a.asset_number FOR UPDATE OF a`, [periodEnd, period])).rows;
  if (!assets.length) return { period, assets: 0, total: 0, journal: null, message: 'Tidak ada aset yang perlu disusutkan pada periode ini.' };

  // Hitung per aset (clamp ke sisa nilai yang dapat disusutkan).
  const perAccount = new Map(); // key `${expense}|${accumulated}` → total
  const entries = [];
  let total = 0;
  for (const asset of assets) {
    const depreciable = idr(Number(asset.acquisition_cost) - Number(asset.salvage_value));
    const remaining = idr(depreciable - Number(asset.accumulated));
    if (remaining <= 0) {
      await client.query(`UPDATE fixed_assets SET status='FULLY_DEPRECIATED',updated_at=now() WHERE id=$1`, [asset.id]);
      continue;
    }
    const monthly = Math.min(monthlyDepreciation(asset, { useful_life_months: asset.category_life }), remaining);
    if (monthly <= 0) continue;
    total = idr(total + monthly);
    entries.push({ asset, amount: monthly, accumulatedAfter: idr(Number(asset.accumulated) + monthly) });
    const key = `${asset.expense_account_code}|${asset.accumulated_account_code}`;
    perAccount.set(key, idr((perAccount.get(key) || 0) + monthly));
  }
  if (!entries.length) return { period, assets: 0, total: 0, journal: null, message: 'Seluruh aset sudah tersusut penuh.' };

  // Dokumen jurnal sistem — muncul di buku besar dengan nomor JRN resmi.
  const doc = await runtime.createDocument(client, {
    type: 'JOURNAL', user, title: `Penyusutan aset ${period}`, amount: total, requestId,
    payload: { period, source: 'DEPRECIATION_RUN', assetCount: entries.length }
  });
  await client.query(`UPDATE business_documents SET status='APPROVED',approved_at=now(),approved_by=$2,version=version+1 WHERE id=$1`, [doc.id, user.id]);
  if (!await posting.claimPosting(client, { id: doc.id }, user, 'ACCOUNTING')) return { replay: true };
  await posting.ensureOpenPeriod(client, { payload: { period }, createdAt: new Date() });
  const codes = [...new Set([...perAccount.keys()].flatMap((k) => k.split('|')))];
  const accounts = (await client.query('SELECT id,code FROM chart_of_accounts WHERE code=ANY($1) AND active', [codes])).rows.reduce((o, r) => (o[r.code] = r.id, o), {});
  const missing = codes.filter((cd) => !accounts[cd]);
  if (missing.length) throw new AppError('RESOURCE_NOT_FOUND', `Akun penyusutan belum ada di COA: ${missing.join(', ')} (periksa asset_categories).`);
  for (const [key, amount] of perAccount) {
    const [expense, accumulated] = key.split('|');
    await client.query(`INSERT INTO journal_lines(id,journal_document_id,account_id,debit,credit,memo) VALUES($1,$2,$3,$4,0,$5)`, [randomUUID(), doc.id, accounts[expense], amount, `${doc.documentNumber} · penyusutan ${period}`]);
    await client.query(`INSERT INTO journal_lines(id,journal_document_id,account_id,debit,credit,memo) VALUES($1,$2,$3,0,$4,$5)`, [randomUUID(), doc.id, accounts[accumulated], amount, `${doc.documentNumber} · akumulasi ${period}`]);
  }
  await posting.finishPosting(client, { id: doc.id }, 'ACCOUNTING', { period, total, assets: entries.length, source: 'DEPRECIATION_RUN' });
  for (const e of entries) {
    await client.query(`INSERT INTO asset_depreciation_entries(id,asset_id,period,amount,accumulated_after,journal_document_id,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [randomUUID(), e.asset.id, period, e.amount, e.accumulatedAfter, doc.id, user.id]);
    const depreciable = idr(Number(e.asset.acquisition_cost) - Number(e.asset.salvage_value));
    if (e.accumulatedAfter >= depreciable) await client.query(`UPDATE fixed_assets SET status='FULLY_DEPRECIATED',updated_at=now() WHERE id=$1`, [e.asset.id]);
  }
  await runtime.audit(client, { userId: user.id, action: 'POST', module: 'asset', entityType: 'DEPRECIATION_RUN', entityId: doc.id, documentNumber: doc.documentNumber, newValue: { period, assets: entries.length, total }, requestId });
  return { period, assets: entries.length, total, journal: doc.documentNumber };
}

// ── Pelepasan aset — jurnal otomatis, nilai buku dihitung sistem ─────────────
// D Akumulasi (seluruh akumulasi) + D/C Laba-Rugi Pelepasan (selisih) /
// C Aset Tetap (nilai perolehan). Proceeds dicatat informatif di payload
// (penerimaan kas dibukukan lewat dokumen pembayaran/journal terpisah).
async function disposeAsset(client, { assetId, reason, proceeds, user, requestId }) {
  if (!reason) throw new AppError('REASON_REQUIRED', 'Alasan pelepasan aset wajib diisi.');
  const asset = (await client.query(`SELECT a.*,c.asset_account_code,c.accumulated_account_code FROM fixed_assets a JOIN asset_categories c ON c.id=a.category_id WHERE a.id=$1 FOR UPDATE OF a`, [assetId])).rows[0];
  if (!asset) throw new AppError('RESOURCE_NOT_FOUND', 'Aset tidak ditemukan.');
  if (asset.status === 'DISPOSED') return { replay: true, disposedAt: asset.disposed_at };
  const accumulated = Number((await client.query('SELECT COALESCE(SUM(amount),0) n FROM asset_depreciation_entries WHERE asset_id=$1', [assetId])).rows[0].n);
  const bookValue = idr(Number(asset.acquisition_cost) - accumulated);
  const gainLoss = idr(Number(proceeds || 0) - bookValue); // positif = laba
  const runtime = require('./runtime');
  const posting = require('./posting');
  const doc = await runtime.createDocument(client, {
    type: 'JOURNAL', user, title: `Pelepasan aset ${asset.asset_number} — ${asset.name}`, amount: Number(asset.acquisition_cost), requestId,
    payload: { source: 'ASSET_DISPOSAL', assetNumber: asset.asset_number, bookValue, proceeds: Number(proceeds || 0), gainLoss }
  });
  await client.query(`UPDATE business_documents SET status='APPROVED',approved_at=now(),approved_by=$2,version=version+1 WHERE id=$1`, [doc.id, user.id]);
  await posting.claimPosting(client, { id: doc.id }, user, 'ACCOUNTING');
  await posting.ensureOpenPeriod(client, { payload: { period: new Date().toISOString().slice(0, 7) }, createdAt: new Date() });
  const codes = [...new Set([asset.asset_account_code, asset.accumulated_account_code, '7100'])];
  const accounts = (await client.query('SELECT id,code FROM chart_of_accounts WHERE code=ANY($1) AND active', [codes])).rows.reduce((o, r) => (o[r.code] = r.id, o), {});
  const add = (code, debit, credit, memo) => client.query(`INSERT INTO journal_lines(id,journal_document_id,account_id,debit,credit,memo) VALUES($1,$2,$3,$4,$5,$6)`, [randomUUID(), doc.id, accounts[code], debit, credit, `${doc.documentNumber} · ${memo}`]);
  if (accumulated > 0) await add(asset.accumulated_account_code, accumulated, 0, 'hapus akumulasi penyusutan');
  // Nilai buku tersisa dibebankan/diakui sebagai rugi-laba pelepasan.
  if (bookValue > 0) await add('7100', bookValue, 0, 'nilai buku dilepas (rugi bila tanpa proceeds)');
  await add(asset.asset_account_code, 0, Number(asset.acquisition_cost), 'hapus nilai perolehan aset');
  await posting.finishPosting(client, { id: doc.id }, 'ACCOUNTING', { source: 'ASSET_DISPOSAL', bookValue, accumulated });
  const updated = (await client.query(`UPDATE fixed_assets SET status='DISPOSED',disposed_at=now(),disposed_by=$2,disposal_reason=$3,disposal_proceeds=$4,disposal_journal_id=$5,updated_at=now() WHERE id=$1 RETURNING *`,
    [assetId, user.id, String(reason).slice(0, 500), Number(proceeds || 0), doc.id])).rows[0];
  await runtime.audit(client, { userId: user.id, action: 'VOID', module: 'asset', entityType: 'FIXED_ASSET', entityId: assetId, documentNumber: asset.asset_number, oldValue: { status: asset.status }, newValue: { status: 'DISPOSED', bookValue, proceeds: Number(proceeds || 0), gainLoss, journal: doc.documentNumber }, reason, requestId });
  return { ...require('./runtime').camel(updated), bookValue, accumulated, gainLoss, journal: doc.documentNumber };
}

async function listCategories(client) {
  const runtime = require('./runtime');
  return { items: (await client.query('SELECT * FROM asset_categories WHERE active ORDER BY code')).rows.map(runtime.camel) };
}

module.exports = { createAsset, listAssets, runDepreciation, disposeAsset, listCategories };
