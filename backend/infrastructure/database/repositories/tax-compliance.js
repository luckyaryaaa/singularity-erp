'use strict';
// Kepatuhan pajak Indonesia (Prioritas 3): register NSFP, penerbitan Faktur
// Pajak keluaran, bukti potong PPh, dan ekspor format impor DJP (e-Faktur).
// Tarif PPN TIDAK di-hardcode (§35) — diambil dari tax_pct baris dokumen;
// kode transaksi berasal dari tabel konfigurasi tax_transaction_codes.
const businessDate = require('../../../core/business-date');
const { AppError } = require('../../../core/errors');
const runtime = require('./runtime');

const idr = (v) => Math.round(Number(v || 0) * 100) / 100;
const periodOf = (date) => String(date || new Date().toISOString()).slice(0, 7);
const digitsOnly = (v) => String(v || '').replace(/[^0-9]/g, '');

// Format tampilan DJP: TT S . PREFIX . 8 digit  →  010.001-26.00000001
function formatFpNumber(transactionCode, ordinal, prefix, serial) {
  return `${transactionCode}${ordinal}.${prefix}.${String(serial).padStart(8, '0')}`;
}

// ── Register NSFP ───────────────────────────────────────────────────────────
async function listRanges(client) {
  const rows = (await client.query(`SELECT r.*, (r.serial_end - r.next_serial + 1) AS remaining,
      u.display_name created_by_name FROM tax_number_ranges r
    LEFT JOIN app_users u ON u.id=r.created_by ORDER BY r.issued_date DESC, r.prefix`)).rows;
  return { items: rows.map(runtime.camel) };
}

async function allocateRange(client, { dgtLetterNumber, prefix, serialStart, serialEnd, issuedDate, user, requestId }) {
  const start = Number(serialStart), end = Number(serialEnd);
  if (!dgtLetterNumber) throw new AppError('VALIDATION_ERROR', 'Nomor surat pemberian NSFP wajib diisi.');
  if (!/^[0-9]{3}-[0-9]{2}$/.test(String(prefix || ''))) throw new AppError('VALIDATION_ERROR', "Prefix NSFP harus berformat '001-26'.");
  if (!Number.isInteger(start) || !Number.isInteger(end) || start <= 0 || end < start) throw new AppError('VALIDATION_ERROR', 'Rentang serial NSFP tidak valid.');
  // Rentang tidak boleh tumpang tindih dengan jatah lain pada prefix sama.
  const clash = (await client.query(`SELECT id FROM tax_number_ranges WHERE prefix=$1 AND status<>'REVOKED'
      AND NOT (serial_end < $2 OR serial_start > $3) LIMIT 1`, [prefix, start, end])).rows[0];
  if (clash) throw new AppError('VALIDATION_ERROR', 'Rentang NSFP tumpang tindih dengan jatah yang sudah terdaftar.');
  const row = (await client.query(`INSERT INTO tax_number_ranges(legal_entity_id,dgt_letter_number,prefix,serial_start,serial_end,next_serial,issued_date,created_by)
    VALUES((SELECT id FROM legal_entities ORDER BY active DESC,created_at LIMIT 1),$1,$2,$3,$4,$3,COALESCE($5::date,current_date),$6) RETURNING *`,
    [dgtLetterNumber, prefix, start, end, issuedDate || null, user.id])).rows[0];
  await runtime.audit(client, { userId: user.id, action: 'CREATE', module: 'tax', entityType: 'TAX_NUMBER_RANGE', entityId: row.id, documentNumber: `${prefix}.${start}-${end}`, newValue: { dgtLetterNumber, prefix, serialStart: start, serialEnd: end }, requestId });
  return runtime.camel(row);
}

// Ambil serial berikutnya secara atomik & gapless (baris dikunci FOR UPDATE).
async function takeNextSerial(client) {
  const range = (await client.query(`SELECT * FROM tax_number_ranges
    WHERE status='ACTIVE' AND next_serial<=serial_end
    ORDER BY issued_date, serial_start LIMIT 1 FOR UPDATE`)).rows[0];
  if (!range) throw new AppError('VALIDATION_ERROR', 'Jatah NSFP habis. Ajukan permohonan NSFP baru ke DJP terlebih dahulu.');
  const serial = Number(range.next_serial), nextSerial = serial + 1;
  await client.query(`UPDATE tax_number_ranges SET next_serial=$2, status=CASE WHEN $2>serial_end THEN 'EXHAUSTED' ELSE status END WHERE id=$1`, [range.id, nextSerial]);
  return { rangeId: range.id, prefix: range.prefix, serial };
}

// ── Faktur Pajak keluaran ───────────────────────────────────────────────────
// DPP & PPN dihitung dari baris dokumen (tarif per baris = config-driven).
async function invoiceTaxBase(client, documentId) {
  const row = (await client.query(`SELECT
      COALESCE(sum(qty*unit_price*(1-COALESCE(discount_pct,0)/100)),0) dpp,
      COALESCE(sum(qty*unit_price*(1-COALESCE(discount_pct,0)/100)*COALESCE(tax_pct,0)/100),0) ppn
    FROM document_lines WHERE document_id=$1`, [documentId])).rows[0];
  return { dpp: idr(row.dpp), ppn: idr(row.ppn) };
}

async function issueTaxInvoice(client, { documentId, transactionCode = '01', buyer = {}, fpDate, user, requestId }) {
  const doc = runtime.camel((await client.query('SELECT * FROM business_documents WHERE id=$1 FOR UPDATE', [documentId])).rows[0]);
  if (!doc) throw new AppError('RESOURCE_NOT_FOUND', 'Dokumen tidak ditemukan.');
  if (doc.documentType !== 'INVOICE') throw new AppError('VALIDATION_ERROR', 'Faktur Pajak hanya diterbitkan atas dokumen INVOICE.');
  if (['DRAFT', 'REJECTED', 'CANCELLED', 'VOID'].includes(doc.status)) throw new AppError('STATUS_INVALID', `Invoice berstatus ${doc.status} tidak boleh diterbitkan Faktur Pajak.`);
  const existing = (await client.query(`SELECT fp_number FROM tax_invoices WHERE document_id=$1 AND status='ISSUED'`, [documentId])).rows[0];
  if (existing) throw new AppError('DOCUMENT_CONFLICT', `Invoice ini sudah memiliki Faktur Pajak aktif ${existing.fp_number}.`);

  const code = (await client.query('SELECT * FROM tax_transaction_codes WHERE code=$1 AND active', [transactionCode])).rows[0];
  if (!code) throw new AppError('VALIDATION_ERROR', `Kode transaksi '${transactionCode}' tidak dikenal atau nonaktif.`);

  // Identitas pembeli: dari master pelanggan, dapat ditimpa input eksplisit.
  const customer = (await client.query(`SELECT name,npwp,address,city FROM customers WHERE id=$1`, [doc.partyId || null])).rows[0] || {};
  const buyerNpwp = digitsOnly(buyer.npwp ?? customer.npwp);
  const buyerName = String(buyer.name || customer.name || doc.partyName || '').trim();
  if (!buyerName) throw new AppError('VALIDATION_ERROR', 'Nama pembeli wajib diisi pada Faktur Pajak.');
  if (code.requires_buyer_npwp && !buyerNpwp && !digitsOnly(buyer.nik))
    throw new AppError('VALIDATION_ERROR', `Kode transaksi ${transactionCode} mewajibkan NPWP (atau NIK) pembeli.`);

  const { dpp, ppn } = await invoiceTaxBase(client, documentId);
  if (dpp <= 0) throw new AppError('VALIDATION_ERROR', 'DPP nol — lengkapi baris invoice sebelum menerbitkan Faktur Pajak.');

  const org = (await client.query('SELECT legal_name,npwp FROM legal_entities ORDER BY active DESC,created_at LIMIT 1')).rows[0] || {};
  const { rangeId, prefix, serial } = await takeNextSerial(client);
  const date = fpDate || businessDate.today();
  const fpNumber = formatFpNumber(code.code, 0, prefix, serial);

  const row = (await client.query(`INSERT INTO tax_invoices(document_id,range_id,transaction_code,replacement_ordinal,prefix,serial,fp_number,fp_date,period,
      seller_npwp,seller_name,buyer_npwp,buyer_nik,buyer_name,buyer_address,dpp,ppn,created_by)
    VALUES($1,$2,$3,0,$4,$5,$6,$7::date,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
    [documentId, rangeId, code.code, prefix, serial, fpNumber, date, periodOf(date),
      digitsOnly(org.npwp), org.legal_name || null, buyerNpwp || null, digitsOnly(buyer.nik) || null,
      buyerName, buyer.address || customer.address || null, dpp, ppn, user.id])).rows[0];

  await runtime.audit(client, { userId: user.id, action: 'CREATE', module: 'tax', entityType: 'TAX_INVOICE', entityId: row.id, documentNumber: fpNumber, newValue: { documentNumber: doc.documentNumber, fpNumber, dpp, ppn, transactionCode: code.code }, requestId, branchId: doc.branchId });
  return runtime.camel(row);
}

// Faktur pengganti: FP lama menjadi REPLACED, pengganti memakai serial SAMA
// dengan ordinal naik (aturan DJP), sehingga jatah NSFP tidak terbuang.
async function replaceTaxInvoice(client, { taxInvoiceId, reason, buyer = {}, user, requestId }) {
  const prev = runtime.camel((await client.query('SELECT * FROM tax_invoices WHERE id=$1 FOR UPDATE', [taxInvoiceId])).rows[0]);
  if (!prev) throw new AppError('RESOURCE_NOT_FOUND', 'Faktur Pajak tidak ditemukan.');
  if (prev.status !== 'ISSUED') throw new AppError('STATUS_INVALID', `Faktur Pajak berstatus ${prev.status} tidak dapat diganti.`);
  if (!reason) throw new AppError('REASON_REQUIRED', 'Alasan penggantian Faktur Pajak wajib diisi.');
  const ordinal = Number(prev.replacementOrdinal) + 1;
  if (ordinal > 9) throw new AppError('VALIDATION_ERROR', 'Batas penggantian Faktur Pajak terlampaui.');

  const { dpp, ppn } = await invoiceTaxBase(client, prev.documentId);
  const date = businessDate.today();
  const fpNumber = formatFpNumber(prev.transactionCode, ordinal, prev.prefix, Number(prev.serial));
  await client.query(`UPDATE tax_invoices SET status='REPLACED' WHERE id=$1`, [prev.id]);
  const row = (await client.query(`INSERT INTO tax_invoices(document_id,range_id,transaction_code,replacement_ordinal,prefix,serial,fp_number,fp_date,period,
      seller_npwp,seller_name,buyer_npwp,buyer_nik,buyer_name,buyer_address,dpp,ppn,replaces_id,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8::date,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
    [prev.documentId, prev.rangeId, prev.transactionCode, ordinal, prev.prefix, prev.serial, fpNumber, date, periodOf(date),
      prev.sellerNpwp, prev.sellerName, digitsOnly(buyer.npwp ?? prev.buyerNpwp) || null, digitsOnly(buyer.nik ?? prev.buyerNik) || null,
      buyer.name || prev.buyerName, buyer.address ?? prev.buyerAddress, dpp, ppn, prev.id, user.id])).rows[0];
  await runtime.audit(client, { userId: user.id, action: 'UPDATE', module: 'tax', entityType: 'TAX_INVOICE', entityId: row.id, documentNumber: fpNumber, oldValue: { fpNumber: prev.fpNumber, status: 'ISSUED' }, newValue: { fpNumber, replaces: prev.fpNumber, reason }, requestId });
  return runtime.camel(row);
}

async function cancelTaxInvoice(client, { taxInvoiceId, reason, user, requestId }) {
  if (!reason) throw new AppError('REASON_REQUIRED', 'Alasan pembatalan Faktur Pajak wajib diisi.');
  const row = (await client.query(`UPDATE tax_invoices SET status='CANCELLED' WHERE id=$1 AND status='ISSUED' RETURNING *`, [taxInvoiceId])).rows[0];
  if (!row) throw new AppError('STATUS_INVALID', 'Faktur Pajak tidak aktif atau sudah dibatalkan.');
  await runtime.audit(client, { userId: user.id, action: 'CANCEL', module: 'tax', entityType: 'TAX_INVOICE', entityId: row.id, documentNumber: row.fp_number, newValue: { reason }, requestId });
  return runtime.camel(row);
}

async function listTaxInvoices(client, period) {
  const p = periodOf(period);
  const rows = (await client.query(`SELECT t.*, d.document_number FROM tax_invoices t
    JOIN business_documents d ON d.id=t.document_id WHERE t.period=$1 ORDER BY t.serial, t.replacement_ordinal`, [p])).rows;
  return { period: p, items: rows.map(runtime.camel) };
}

// ── Bukti potong PPh (e-Bupot) ──────────────────────────────────────────────
async function issueWithholding(client, { documentId, taxType, objectCode, partner = {}, grossAmount, ratePct, certificateDate, user, requestId }) {
  const gross = idr(grossAmount), rate = Number(ratePct);
  if (!['PPH21', 'PPH22', 'PPH23', 'PPH26', 'PPH_FINAL'].includes(taxType)) throw new AppError('VALIDATION_ERROR', 'Jenis PPh tidak dikenal.');
  if (!(gross > 0)) throw new AppError('VALIDATION_ERROR', 'Jumlah bruto harus lebih besar dari nol.');
  if (!Number.isFinite(rate) || rate < 0) throw new AppError('VALIDATION_ERROR', 'Tarif PPh tidak valid.');
  if (!partner.name) throw new AppError('VALIDATION_ERROR', 'Nama lawan transaksi wajib diisi.');
  const date = certificateDate || businessDate.today(), period = periodOf(date);
  const tax = idr(gross * rate / 100);
  // Nomor bukti potong berurut per jenis & periode.
  const seq = Number((await client.query(`SELECT count(*)::int n FROM withholding_certificates WHERE tax_type=$1 AND period=$2`, [taxType, period])).rows[0].n) + 1;
  const number = `${taxType}/${period.replace('-', '')}/${String(seq).padStart(5, '0')}`;
  const row = (await client.query(`INSERT INTO withholding_certificates(document_id,certificate_number,tax_type,object_code,partner_npwp,partner_nik,partner_name,gross_amount,rate_pct,tax_amount,certificate_date,period,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::date,$12,$13) RETURNING *`,
    [documentId || null, number, taxType, objectCode || null, digitsOnly(partner.npwp) || null, digitsOnly(partner.nik) || null,
      partner.name, gross, rate, tax, date, period, user.id])).rows[0];
  await runtime.audit(client, { userId: user.id, action: 'CREATE', module: 'tax', entityType: 'WITHHOLDING_CERTIFICATE', entityId: row.id, documentNumber: number, newValue: { taxType, gross, rate, tax, partner: partner.name }, requestId });
  return runtime.camel(row);
}

async function listWithholding(client, period) {
  const p = periodOf(period);
  const rows = (await client.query(`SELECT * FROM withholding_certificates WHERE period=$1 ORDER BY tax_type, certificate_number`, [p])).rows;
  return { period: p, items: rows.map(runtime.camel) };
}

// ── Ekspor format impor DJP (e-Faktur): rekaman FK / LT / OF ────────────────
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
async function exportEFaktur(client, period) {
  const p = periodOf(period);
  const invoices = (await client.query(`SELECT t.*, d.document_number FROM tax_invoices t
    JOIN business_documents d ON d.id=t.document_id
    WHERE t.period=$1 AND t.status='ISSUED' ORDER BY t.serial, t.replacement_ordinal`, [p])).rows.map(runtime.camel);
  const lines = [
    ['FK', 'KD_JENIS_TRANSAKSI', 'FG_PENGGANTI', 'NOMOR_FAKTUR', 'MASA_PAJAK', 'TAHUN_PAJAK', 'TANGGAL_FAKTUR', 'NPWP', 'NAMA', 'ALAMAT_LENGKAP', 'JUMLAH_DPP', 'JUMLAH_PPN', 'JUMLAH_PPNBM', 'ID_KETERANGAN_TAMBAHAN', 'FG_UANG_MUKA', 'UANG_MUKA_DPP', 'UANG_MUKA_PPN', 'UANG_MUKA_PPNBM', 'REFERENSI', 'KODE_DOKUMEN_PENDUKUNG'].map(csvCell).join(','),
    ['LT', 'NPWP', 'NAMA', 'JALAN', 'BLOK', 'NOMOR', 'RT', 'RW', 'KECAMATAN', 'KELURAHAN', 'KABUPATEN', 'PROPINSI', 'KODE_POS', 'NOMOR_TELEPON'].map(csvCell).join(','),
    ['OF', 'KODE_OBJEK', 'NAMA', 'HARGA_SATUAN', 'JUMLAH_BARANG', 'HARGA_TOTAL', 'DISKON', 'DPP', 'PPN', 'TARIF_PPNBM', 'PPNBM'].map(csvCell).join(',')
  ];
  for (const fp of invoices) {
    const [year, month] = fp.period.split('-');
    const serialNumber = `${fp.prefix}.${String(fp.serial).padStart(8, '0')}`;
    lines.push(['FK', fp.transactionCode, fp.replacementOrdinal ? '1' : '0', serialNumber, String(Number(month)), year,
      new Date(fp.fpDate).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/'),
      fp.buyerNpwp || '', fp.buyerName, fp.buyerAddress || '', Math.round(fp.dpp), Math.round(fp.ppn), Math.round(fp.ppnbm || 0),
      '', '0', '0', '0', '0', fp.documentNumber, ''].map(csvCell).join(','));
    lines.push(['LT', fp.buyerNpwp || '', fp.buyerName, fp.buyerAddress || '', '', '', '', '', '', '', '', '', '', ''].map(csvCell).join(','));
    const items = (await client.query(`SELECT description,qty,unit_price,discount_pct,tax_pct FROM document_lines WHERE document_id=$1 ORDER BY line_no`, [fp.documentId])).rows;
    for (const it of items) {
      const gross = Number(it.qty) * Number(it.unit_price);
      const disc = gross * Number(it.discount_pct || 0) / 100, base = gross - disc;
      lines.push(['OF', '', it.description, Math.round(it.unit_price), Number(it.qty), Math.round(gross), Math.round(disc),
        Math.round(base), Math.round(base * Number(it.tax_pct || 0) / 100), '0', '0'].map(csvCell).join(','));
    }
  }
  return { period: p, filename: `efaktur-${p}.csv`, count: invoices.length, csv: lines.join('\r\n') + '\r\n' };
}

async function summary(client, period) {
  const p = periodOf(period);
  const fp = (await client.query(`SELECT count(*) FILTER (WHERE status='ISSUED')::int issued,
      count(*) FILTER (WHERE status='REPLACED')::int replaced, count(*) FILTER (WHERE status='CANCELLED')::int cancelled,
      COALESCE(sum(dpp) FILTER (WHERE status='ISSUED'),0)::float dpp, COALESCE(sum(ppn) FILTER (WHERE status='ISSUED'),0)::float ppn
    FROM tax_invoices WHERE period=$1`, [p])).rows[0];
  const wh = (await client.query(`SELECT tax_type, count(*)::int n, COALESCE(sum(tax_amount),0)::float amount
    FROM withholding_certificates WHERE period=$1 AND status='ISSUED' GROUP BY tax_type`, [p])).rows.map(runtime.camel);
  const nsfp = (await client.query(`SELECT COALESCE(sum(serial_end - next_serial + 1),0)::int remaining,
      count(*)::int ranges FROM tax_number_ranges WHERE status='ACTIVE'`)).rows[0];
  return { period: p, faktur: runtime.camel(fp), withholding: wh, nsfpRemaining: Number(nsfp.remaining), nsfpRanges: Number(nsfp.ranges) };
}

// Kode transaksi bersifat konfigurasi — UI mengambil dari sini, bukan hardcode.
async function listTransactionCodes(client) {
  return { items: (await client.query('SELECT * FROM tax_transaction_codes WHERE active ORDER BY code')).rows.map(runtime.camel) };
}

module.exports = { listRanges, allocateRange, issueTaxInvoice, replaceTaxInvoice, cancelTaxInvoice, listTaxInvoices, issueWithholding, listWithholding, exportEFaktur, summary, formatFpNumber, takeNextSerial, listTransactionCodes };
