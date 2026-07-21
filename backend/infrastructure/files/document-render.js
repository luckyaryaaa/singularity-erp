'use strict';
// Sprint 15 (R022) — mesin dokumen resmi ber-identitas. Menghasilkan PDF
// terstruktur (kop perusahaan dari organization_identity_snapshot, tabel baris,
// terbilang, blok tanda tangan, kode verifikasi) tanpa dependensi eksternal.
// Identitas diambil dari SNAPSHOT dokumen (immutable) — dokumen lama tetap
// mencerminkan identitas saat diterbitkan meski master berubah.
const { codeFor } = require('../../core/doc-verification');
const { decodeImage } = require('./pdf-image');
const QRCode = require('qrcode');

const PW = 595, PH = 842, ML = 40, MR = 555;                 // A4, margin kiri/kanan
const TEMPLATE_VERSION = 'MAT-OFFICIAL-A4-v3';
const esc = (v) => String(v ?? '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[^\x20-\x7e]/g, (c) => ({ 'é': 'e', 'ā': 'a' }[c] || '?'));
const money = (v) => Math.round(Number(v || 0)).toLocaleString('id-ID');           // tanpa "Rp" (kolom IDR)
const moneyRp = (v) => 'Rp ' + Math.round(Number(v || 0)).toLocaleString('id-ID');
// Palet korporat MAT: navy pekat + emas. accentColor template dapat menimpa navy.
const NAVY = '0.102 0.169 0.302', GOLD = '0.941 0.702 0.157', INK = '0.13 0.16 0.22', MUTE = '0.42 0.45 0.52';
function hexToPdf(hex, fallback = NAVY) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return `${((n >> 16 & 255) / 255).toFixed(3)} ${((n >> 8 & 255) / 255).toFixed(3)} ${((n & 255) / 255).toFixed(3)}`;
}

// ── Terbilang (angka → kata, Bahasa Indonesia) ──────────────────────────────
const SATUAN = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
function terbilang(n) {
  n = Math.floor(Math.abs(Number(n) || 0));
  if (n < 12) return SATUAN[n];
  if (n < 20) return terbilang(n - 10) + ' belas';
  if (n < 100) return terbilang(Math.floor(n / 10)) + ' puluh' + (n % 10 ? ' ' + terbilang(n % 10) : '');
  if (n < 200) return 'seratus' + (n % 100 ? ' ' + terbilang(n % 100) : '');
  if (n < 1000) return terbilang(Math.floor(n / 100)) + ' ratus' + (n % 100 ? ' ' + terbilang(n % 100) : '');
  if (n < 2000) return 'seribu' + (n % 1000 ? ' ' + terbilang(n % 1000) : '');
  if (n < 1e6) return terbilang(Math.floor(n / 1000)) + ' ribu' + (n % 1000 ? ' ' + terbilang(n % 1000) : '');
  if (n < 1e9) return terbilang(Math.floor(n / 1e6)) + ' juta' + (n % 1e6 ? ' ' + terbilang(n % 1e6) : '');
  if (n < 1e12) return terbilang(Math.floor(n / 1e9)) + ' miliar' + (n % 1e9 ? ' ' + terbilang(n % 1e9) : '');
  return terbilang(Math.floor(n / 1e12)) + ' triliun' + (n % 1e12 ? ' ' + terbilang(n % 1e12) : '');
}
function terbilangRupiah(n) {
  const words = terbilang(n).trim().replace(/\s+/g, ' ');
  return (words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Nol') + ' rupiah';
}

// ── Primitif PDF (content stream) ───────────────────────────────────────────
class Page {
  constructor() { this.ops = []; }
  text(x, y, str, { size = 9, bold = false, color = '0 0 0' } = {}) {
    this.ops.push(`BT ${color} rg /${bold ? 'FB' : 'F1'} ${size} Tf 1 0 0 1 ${x.toFixed(1)} ${(PH - y).toFixed(1)} Tm (${esc(str)}) Tj ET`);
    return this;
  }
  right(xRight, y, str, opt = {}) { this.text(xRight - (String(str).length * (opt.size || 9) * 0.5), y, str, opt); return this; }
  line(x1, y1, x2, y2, w = 0.6) { this.ops.push(`${w} w 0.5 0.5 0.5 RG ${x1.toFixed(1)} ${(PH - y1).toFixed(1)} m ${x2.toFixed(1)} ${(PH - y2).toFixed(1)} l S`); return this; }
  rect(x, y, w, h, { fill } = {}) {
    if (fill) this.ops.push(`${fill} rg ${x.toFixed(1)} ${(PH - y - h).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f`);
    else this.ops.push(`0.6 w 0.5 0.5 0.5 RG ${x.toFixed(1)} ${(PH - y - h).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re S`);
    return this;
  }
  watermark(str) {
    if (!str) return this;
    this.ops.push(`BT 0.90 0.92 0.95 rg /FB 60 Tf 0.707 0.707 -0.707 0.707 150 300 Tm (${esc(str)}) Tj ET`);
    return this;
  }
  // Badge korporat: pil navy + strip emas kiri + teks putih (gaya "BILL TO").
  badge(x, y, label, { navy = NAVY, w } = {}) {
    const width = w || (String(label).length * 5.4 + 26);
    this.rect(x, y, width, 15, { fill: navy });
    this.rect(x, y, 4, 15, { fill: GOLD });
    this.text(x + 11, y + 10.5, String(label).toUpperCase(), { size: 8, bold: true, color: '1 1 1' });
    return this;
  }
  // Gambar XObject (logo/stempel/tanda tangan). index merujuk /ImN pada Resources.
  image(x, y, w, h, index) {
    this.ops.push(`q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${(PH - y - h).toFixed(2)} cm /Im${index} Do Q`);
    return this;
  }
  stream() { return this.ops.join('\n'); }
}

// Perakit PDF berbasis Buffer (bukan string) agar stream gambar biner tidak
// rusak oleh enkode UTF-8. `images` = deskriptor dari pdf-image.decodeImage().
// `sign` = { certPem, keyPem, reason, location, name } → menambah field tanda
// tangan digital (PAdES/PKCS#7 detached) yang membuat dokumen tamper-evident.
const SIG_HEX_LEN = 16384;                                   // ruang CMS (8 KB) — cukup untuk rantai sertifikat
function pdfDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  const off = -d.getTimezoneOffset(), sign = off >= 0 ? '+' : '-', abs = Math.abs(off);
  return `D:${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}${sign}${p(Math.floor(abs / 60))}'${p(abs % 60)}'`;
}
function buildPdf(input, images = [], sign = null, meta = {}) {
  const pages = Array.isArray(input) ? input : [input];
  const pageStart = 3, contentStart = pageStart + pages.length;
  const fontRegular = contentStart + pages.length, fontBold = fontRegular + 1;
  let next = fontBold + 1;
  const infoNum = next++;
  const imgObjs = images.map((img) => ({ img, num: next++, smaskNum: img.smask ? next++ : null }));
  const xobj = imgObjs.length ? ` /XObject << ${imgObjs.map((o, i) => `/Im${i} ${o.num} 0 R`).join(' ')} >>` : '';
  const sigNum = sign ? next++ : null, annotNum = sign ? next++ : null;

  const objects = [];                                        // { dict, stream?: Buffer }
  objects.push({ dict: `<< /Type /Catalog /Pages 2 0 R${sign ? ` /AcroForm << /Fields [${annotNum} 0 R] /SigFlags 3 >>` : ''} >>` });
  objects.push({ dict: `<< /Type /Pages /Kids [${pages.map((_, i) => `${pageStart + i} 0 R`).join(' ')}] /Count ${pages.length} >>` });
  for (let i = 0; i < pages.length; i++) objects.push({ dict: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 ${fontRegular} 0 R /FB ${fontBold} 0 R >>${xobj} >> /Contents ${contentStart + i} 0 R${sign && i === 0 ? ` /Annots [${annotNum} 0 R]` : ''} >>` });
  for (const page of pages) {
    const stream = Buffer.from(page.stream(), 'latin1');
    objects.push({ dict: `<< /Length ${stream.length} >>`, stream });
  }
  objects.push({ dict: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>' });
  objects.push({ dict: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>' });
  // Identitas dokumen: /Info untuk arsip & audit (urutan push harus = infoNum).
  objects.push({ dict: `<< /Producer (MAT ERP V2 ${esc(TEMPLATE_VERSION)}) /Creator (MAT ERP V2) /CreationDate (${pdfDate(new Date())}) /Title (${esc(meta.title || 'Dokumen resmi')}) /Subject (${esc(meta.subject || '')}) >>` });
  for (const { img, smaskNum } of imgObjs) {
    objects.push({
      dict: `<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace ${img.colorSpace} /BitsPerComponent ${img.bpc} /Filter ${img.filter}${smaskNum ? ` /SMask ${smaskNum} 0 R` : ''} /Length ${img.data.length} >>`,
      stream: img.data
    });
    if (smaskNum) objects.push({
      dict: `<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length ${img.smask.length} >>`,
      stream: img.smask
    });
  }

  if (sign) {
    // Placeholder lebar-tetap: di-patch setelah offset final diketahui sehingga
    // panjang byte tidak berubah (offset xref tetap sahih).
    objects.push({ dict: `<< /Type /Sig /Filter /Adobe.PPKLite /SubFilter /adbe.pkcs7.detached /ByteRange [0 0000000000 0000000000 0000000000] /Contents <${'0'.repeat(SIG_HEX_LEN)}> /M (${pdfDate(new Date())}) /Name (${esc(sign.name || 'MAT ERP')}) /Reason (${esc(sign.reason || '')}) /Location (${esc(sign.location || '')}) >>` });
    objects.push({ dict: `<< /Type /Annot /Subtype /Widget /FT /Sig /Rect [0 0 0 0] /T (Signature1) /V ${sigNum} 0 R /F 132 /P ${pageStart} 0 R >>` });
  }

  const chunks = [Buffer.from('%PDF-1.4\n', 'latin1')];
  const offsets = []; let cursor = chunks[0].length;
  objects.forEach((obj, i) => {
    const head = Buffer.from(`${i + 1} 0 obj\n${obj.dict}\n`, 'latin1');
    const body = obj.stream ? Buffer.concat([Buffer.from('stream\n', 'latin1'), obj.stream, Buffer.from('\nendstream\n', 'latin1')]) : Buffer.alloc(0);
    const tail = Buffer.from('endobj\n', 'latin1');
    offsets.push(cursor);
    chunks.push(head, body, tail);
    cursor += head.length + body.length + tail.length;
  });
  // /ID: identitas berkas (wajib pada PDF bertanda tangan) dari isi dokumen.
  const fileId = require('node:crypto').createHash('md5').update(`${meta.title || ''}|${meta.subject || ''}|${cursor}|${Date.now()}`).digest('hex').toUpperCase();
  const trailer = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((n) => String(n).padStart(10, '0') + ' 00000 n ').join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${infoNum} 0 R /ID [<${fileId}> <${fileId}>] >>\nstartxref\n${cursor}\n%%EOF`;
  chunks.push(Buffer.from(trailer, 'latin1'));
  const pdf = Buffer.concat(chunks);
  return sign ? applySignature(pdf, sign) : pdf;
}

// Isi /ByteRange + /Contents dengan tanda tangan CMS atas seluruh byte dokumen
// di luar placeholder. Kegagalan penandatanganan mengembalikan PDF apa adanya
// (tanpa tanda tangan) — pencetakan dokumen tidak boleh gagal karenanya.
function applySignature(pdf, sign) {
  try {
    const pdfSign = require('../../core/pdf-sign');
    const open = pdf.indexOf(`/Contents <`);
    if (open < 0) return pdf;
    const hexStart = pdf.indexOf('<', open), hexEnd = pdf.indexOf('>', hexStart);
    if (hexStart < 0 || hexEnd < 0) return pdf;
    const range = [0, hexStart, hexEnd + 1, pdf.length - (hexEnd + 1)];
    const brToken = '/ByteRange [0 0000000000 0000000000 0000000000]';
    const brAt = pdf.indexOf(brToken);
    if (brAt < 0) return pdf;
    const brNew = `/ByteRange [0 ${String(range[1]).padStart(10, '0')} ${String(range[2]).padStart(10, '0')} ${String(range[3]).padStart(10, '0')}]`;
    if (brNew.length !== brToken.length) return pdf;         // panjang wajib identik
    pdf.write(brNew, brAt, 'latin1');

    const signed = Buffer.concat([pdf.subarray(0, range[1]), pdf.subarray(range[2], range[2] + range[3])]);
    const cms = pdfSign.buildCms(pdfSign.sha256(signed), sign);
    const hex = cms.toString('hex');
    if (hex.length > SIG_HEX_LEN) return pdf;                // CMS terlalu besar untuk placeholder
    pdf.write(hex.padEnd(SIG_HEX_LEN, '0'), hexStart + 1, 'latin1');
    return pdf;
  } catch { return pdf; }
}

function verificationUrl(documentNumber, code) {
  const base = String(process.env.MAT_PUBLIC_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
  return `${base}/#/verify?doc=${encodeURIComponent(documentNumber)}&code=${encodeURIComponent(code)}`;
}

function drawQr(page, x, y, size, value) {
  const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
  const count = qr.modules.size, quiet = 2, cell = size / (count + quiet * 2);
  page.rect(x, y, size, size, { fill: '1 1 1' });
  for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) {
    if (qr.modules.get(row, col)) page.rect(x + (col + quiet) * cell, y + (row + quiet) * cell, cell + 0.05, cell + 0.05, { fill: '0 0 0' });
  }
}

const TITLES = {
  INVOICE: 'FAKTUR / INVOICE', SUPPLIER_INVOICE: 'TAGIHAN SUPPLIER', QUOTATION: 'SURAT PENAWARAN',
  PURCHASE_ORDER: 'PURCHASE ORDER', SALES_ORDER: 'SALES ORDER', DELIVERY: 'SURAT JALAN',
  WORK_ORDER: 'WORK ORDER', RMA: 'RETUR / RMA', PAYMENT_PROPOSAL: 'USULAN PEMBAYARAN'
};

// data: { document, org (snapshot), lines[], party }
function renderDocument(data) {
  const doc = data.document || {};
  const org = doc.organizationIdentitySnapshot || data.org || {};
  const lines = Array.isArray(data.lines) ? data.lines : [];
  const p = new Page();
  // Template configuration-driven (§35): judul, warna aksen, syarat & ketentuan,
  // dan tampil/sembunyi blok berasal dari document_templates. TITLES hanya
  // cadangan bila template belum dikonfigurasi.
  const tpl = data.template || {};
  const title = tpl.title || TITLES[doc.documentType] || (doc.documentType || 'DOKUMEN').replace(/_/g, ' ');
  const code = doc.officialSignature || codeFor(doc.documentNumber);
  const url = verificationUrl(doc.documentNumber, code);
  const watermark = data.copy ? 'COPY' : ['DRAFT','VOID','CANCELLED','REJECTED'].includes(doc.status) ? doc.status : null;
  const navy = hexToPdf(tpl.accentColor, NAVY);
  p.watermark(watermark);

  // ── Aset asli organisasi (logo/stempel/tanda tangan) → XObject ─────────────
  // Aset rusak/format tak dikenal otomatis fallback ke gaya lama: pencetakan
  // dokumen resmi tidak boleh gagal hanya karena berkas gambar bermasalah.
  const images = [];
  const addImage = (asset) => {
    if (!asset || !asset.buffer) return null;
    const img = decodeImage(Buffer.isBuffer(asset.buffer) ? asset.buffer : Buffer.from(asset.buffer), asset.mimeType);
    if (!img) return null;
    images.push(img);
    return { index: images.length - 1, w: img.width, h: img.height };
  };
  const assets = data.assets || {};
  const logo = addImage(assets.logo), stamp = addImage(assets.stamp), signatureArt = addImage(assets.signature);
  const fit = (img, maxW, maxH) => { const s = Math.min(maxW / img.w, maxH / img.h); return { w: img.w * s, h: img.h * s }; };

  // ── KOP: logo + identitas kiri, judul + metadata kanan ──────────────────────
  if (logo) { const d = fit(logo, 34, 34); p.image(ML, 34 + (34 - d.h) / 2, d.w, d.h, logo.index); }
  else {                                                       // fallback lambang
    p.rect(ML, 34, 30, 30, { fill: navy });
    p.text(ML + 5, 53, 'MAT', { size: 11, bold: true, color: '1 1 1' });
  }
  p.text(ML + 40, 47, (org.legalName || org.tradeName || 'PT MANDIRI ABADI TEKNIK').toUpperCase(), { size: 15, bold: true, color: INK });
  p.text(ML + 40, 60, (org.tagline || 'ENGINEERING SERVICE | FABRICATION').toUpperCase(), { size: 7.5, bold: true, color: navy });
  let hy = 78;
  const contact = [org.operationalAddress || org.legalAddress, org.npwp && `NPWP: ${org.npwp}`].filter(Boolean);
  for (const c of contact) { p.text(ML + 40, hy, String(c).slice(0, 74), { size: 7.5, color: MUTE }); hy += 10; }

  // Judul dokumen besar + nomor emas (kanan).
  p.text(MR - String(title).length * 8.2, 50, title, { size: 24, bold: true, color: INK });
  p.text(MR - String(doc.documentNumber || '').length * 5.4, 66, doc.documentNumber || '', { size: 10, bold: true, color: navy });
  // Metadata box kanan.
  const metaX = MR - 200; let my = 84;
  const isQuo = doc.documentType === 'QUOTATION';
  const meta = [
    ['Tanggal', fmtDate(doc.createdAt)],
    isQuo ? ['Berlaku s/d', doc.dueDate ? fmtDate(doc.dueDate) : '-'] : ['No. PO Pelanggan', doc.payload?.customerPoNumber || '-'],
    isQuo ? null : ['Tanggal PO', doc.payload?.poDate ? fmtDate(doc.payload.poDate) : '-'],
    ['Termin', doc.payload?.terms || (doc.dueDate ? '30 Hari' : '-')]
  ].filter(Boolean);
  for (const [k, v] of meta) {
    p.rect(metaX, my - 8, 9, 9, { fill: '0.90 0.92 0.95' });
    p.text(metaX + 16, my, k, { size: 8, color: INK });
    p.text(metaX + 110, my, `: ${v}`, { size: 8, bold: true, color: INK });
    my += 15;
  }

  // Garis pemisah kop: emas tebal + navy tipis.
  const topY = Math.max(hy + 6, my + 4);
  p.rect(ML, topY, MR - ML, 2.4, { fill: GOLD });
  p.line(ML, topY + 4, MR, topY + 4, 0.6);

  // ── BILL TO / PROPOSED TO ───────────────────────────────────────────────────
  let y = topY + 20;
  p.badge(ML, y - 12, tpl.partyLabel || (isQuo ? 'Proposed To' : 'Bill To'), { navy });
  p.rect(ML, y + 6, 300, 54);                                   // kotak rekanan
  const party = [['Pelanggan', doc.partyName || data.party?.name || '-'], ['Alamat', doc.payload?.customerAddress || (data.party && data.party.city) || '-'], ['UP.', doc.payload?.attn || '-']];
  let py = y + 20;
  for (const [k, v] of party) { p.text(ML + 10, py, k, { size: 8, bold: true, color: INK }); p.text(ML + 90, py, `: ${String(v).slice(0, 40)}`, { size: 8, color: navy }); py += 15; }

  // ── TABEL BARIS: No | Deskripsi | Qty | Unit | Unit Price (IDR) | Total (IDR) ─
  y += 76;
  const tableTop = y;
  const CX = { no: ML, desc: ML + 30, qty: 320, unit: 360, price: 415, total: MR };  // batas kanan tiap kolom
  p.rect(ML, y, MR - ML, 17, { fill: navy });
  p.text(ML + 8, y + 11.5, 'No.', { size: 8, bold: true, color: '1 1 1' });
  p.text(ML + 34, y + 11.5, 'Deskripsi', { size: 8, bold: true, color: '1 1 1' });
  p.text(325, y + 11.5, 'Qty', { size: 8, bold: true, color: '1 1 1' });
  p.text(365, y + 11.5, 'Unit', { size: 8, bold: true, color: '1 1 1' });
  p.right(492, y + 11.5, 'Unit Price (IDR)', { size: 8, bold: true, color: '1 1 1' });
  p.right(MR - 6, y + 11.5, 'Total (IDR)', { size: 8, bold: true, color: '1 1 1' });
  y += 17;
  const normalized = lines.map((l, i) => {
    const qty = Number(l.qty || 1), price = Number(l.unitPrice ?? l.unit_price ?? l.price ?? 0);
    const disc = Number(l.discountPct ?? l.discount_pct ?? 0), taxPct = Number(l.taxPct ?? l.tax_pct ?? 0);
    const base = qty * price * (1 - disc / 100), lineTotal = Number(l.lineTotal ?? l.line_total ?? base * (1 + taxPct / 100));
    return { ...l, rowNo: i + 1, qty, price, disc, taxPct, base, lineTotal };
  });
  const subtotal = normalized.reduce((sum, line) => sum + line.base, 0);
  const taxTotal = normalized.reduce((sum, line) => sum + line.base * line.taxPct / 100, 0);
  const discTotal = normalized.reduce((sum, line) => sum + line.qty * line.price * line.disc / 100, 0);
  const shown = normalized.slice(0, 14);
  const rowH = 16;
  shown.forEach((l) => {
    p.text(ML + 8, y + 11, String(l.rowNo), { size: 8, color: INK });
    p.text(ML + 34, y + 11, String(l.description || l.name || '-').slice(0, 52), { size: 8, color: INK });
    p.text(322, y + 11, String(l.qty), { size: 8, color: INK });
    p.text(363, y + 11, String(l.uom || '').slice(0, 6), { size: 8, color: navy });
    p.right(492, y + 11, money(l.price), { size: 8, color: INK });
    p.right(MR - 6, y + 11, money(l.lineTotal), { size: 8, bold: true, color: INK });
    p.line(ML, y + rowH, MR, y + rowH, 0.3);
    y += rowH;
  });
  // Tinggi minimal tabel agar rapi seperti template.
  const minTableBottom = tableTop + 17 + rowH * 6;
  if (y < minTableBottom && normalized.length <= shown.length) y = minTableBottom;
  if (lines.length > shown.length) { p.text(ML + 34, y + 11, `Rincian dilanjutkan: ${lines.length - shown.length} baris pada halaman berikutnya`, { size: 7.5, color: MUTE }); y += rowH; }
  p.rect(ML, tableTop, MR - ML, y - tableTop);                  // border tabel
  [CX.desc, CX.qty, CX.unit, CX.price].forEach((cx) => p.line(cx, tableTop, cx, y, 0.3));
  p.text(ML, y + 11, 'Page 1 of 1', { size: 7.5, bold: true, color: MUTE });

  // ── DUA KOLOM: kiri remarks+bank, kanan totals+terbilang ───────────────────
  const grand = Number(doc.amount ?? subtotal + taxTotal);
  let ly = y + 22;                                              // kolom kiri
  const terms = Array.isArray(tpl.terms) ? tpl.terms.filter(Boolean).slice(0, 5) : [];
  if (terms.length) {
    p.badge(ML, ly - 12, tpl.termsTitle || 'Remarks / Notes', { navy });
    let ty = ly + 8;
    terms.forEach((t) => { p.text(ML + 4, ty, `- ${String(t).slice(0, 62)}`, { size: 7.5, color: INK }); ty += 11; });
    ly = ty + 8;
  }
  // Bank information.
  const bank = org.bank || {};
  p.badge(ML, ly - 12, 'Bank Information', { navy });
  const bankRows = [['Bank', bank.bankName || 'BNI'], ['Atas Nama', bank.accountHolder || org.legalName || 'Mandiri Abadi Teknik'], ['No. Rekening', bank.accountNumber || '-'], ['Cabang', bank.branch || '-']];
  let by = ly + 8;
  for (const [k, v] of bankRows) { p.text(ML + 4, by, k, { size: 7.5, bold: true, color: INK }); p.text(ML + 80, by, `: ${String(v).slice(0, 34)}`, { size: 7.5, color: navy }); by += 12; }

  // Kolom kanan: totals box.
  const tX = 330, tW = MR - tX; let ry = y + 16;
  const totalRow = (label, val, { fill, bold, valColor } = {}) => {
    if (fill) p.rect(tX, ry, tW, 18, { fill });
    p.text(tX + 8, ry + 12, label, { size: bold ? 9 : 8, bold, color: fill ? '1 1 1' : INK });
    p.right(MR - 8, ry + 12, val, { size: bold ? 9 : 8, bold, color: valColor || (fill ? '1 1 1' : INK) });
    p.line(tX, ry + 18, MR, ry + 18, 0.3);
    ry += 18;
  };
  totalRow('Sub Total', money(subtotal), { bold: true });
  totalRow('Discount', money(discTotal));
  totalRow(`VAT ${taxTotal > 0.5 ? '11%' : '0%'}`, money(taxTotal));
  if (doc.payload?.pph23) totalRow('PPh 23', money(doc.payload.pph23));
  totalRow('GRAND TOTAL', money(grand), { fill: navy, bold: true, valColor: '0.941 0.702 0.157' });
  p.rect(tX, y + 16, tW, ry - (y + 16));
  if (tpl.showTerbilang !== false) {
    p.badge(tX, ry + 6, 'Amount In Words', { navy });
    p.text(tX + 4, ry + 34, terbilangRupiah(grand) + '.', { size: 8, bold: true, color: navy });
  }

  // ── TANDA TANGAN: RECEIVER + PREPARED BY ────────────────────────────────────
  if (tpl.showSignature !== false) {
    const sy = Math.max(by, ry + 46) + 14, boxW = 232;
    const sig = org.signatory || {};
    const sigBox = (x, headLabel, name, sub, art) => {
      p.rect(x, sy, boxW, 66);
      p.text(x + boxW / 2 - String(headLabel).length * 2.6, sy + 14, headLabel, { size: 8, bold: true, color: INK });
      if (art) art(x);                                        // stempel + tanda tangan di atas garis
      p.line(x + 40, sy + 48, x + boxW - 40, sy + 48, 0.4);
      p.text(x + boxW / 2 - String(name).length * 2.4, sy + 58, name, { size: 8, bold: true, color: INK });
      p.text(x + boxW / 2 - String(sub).length * 1.9, sy + 64.5, sub, { size: 6.5, color: MUTE });
    };
    sigBox(ML, 'RECEIVER', 'Nama / Stempel', '');
    sigBox(MR - boxW, (tpl.signatureLabel || 'PREPARED BY').toUpperCase(), sig.name || 'ERP Admin', sig.positionTitle || 'Authorized', (bx) => {
      // Stempel digambar lebih dahulu agar tanda tangan tampak menimpa (seperti dokumen basah).
      if (stamp) { const d = fit(stamp, 88, 31); p.image(bx + boxW / 2 - d.w / 2 - 12, sy + 16, d.w, d.h, stamp.index); }
      if (signatureArt) { const d = fit(signatureArt, 78, 29); p.image(bx + boxW / 2 - d.w / 2 + 14, sy + 17, d.w, d.h, signatureArt.index); }
    });
  }

  // ── FOOTER NAVY + VERIFIKASI QR ─────────────────────────────────────────────
  const fy = PH - 40;
  p.rect(0, fy, PW, 40, { fill: navy });
  p.rect(0, fy, PW, 2, { fill: GOLD });
  const footItems = [org.phone && `Telp ${org.phone}`, org.whatsapp && `WA ${org.whatsapp}`, org.email, org.website].filter(Boolean);
  p.text(ML, fy + 24, footItems.join('     ').slice(0, 96), { size: 7.5, color: '0.85 0.88 0.93' });
  if (tpl.showQr !== false) {
    drawQr(p, MR - 34, fy + 3, 34, url);
    p.text(MR - 150, fy + 16, `Verifikasi: ${code}`, { size: 6.5, color: '0.85 0.88 0.93' });
    p.text(MR - 150, fy + 26, 'Pindai QR untuk keaslian', { size: 6, color: '0.7 0.75 0.82' });
  }
  const footerNote = tpl.footerNote || org.documentFooter;
  if (footerNote) p.text(ML, fy - 6, String(footerNote).slice(0, 120), { size: 6.5, color: MUTE });

  const pages = [p];
  const remaining = normalized.slice(shown.length);
  for (let offset = 0; offset < remaining.length; offset += 38) {
    const page = new Page().watermark(watermark);
    const chunk = remaining.slice(offset, offset + 38);
    // Header kolom halaman lanjutan (selaras dengan baris & garis vertikal di bawah).
    const head = ['No.', 'Deskripsi', 'Qty', 'Unit Price (IDR)', 'Total (IDR)'];
    const hx = [ML + 4, ML + 30, 362, 404, 476];
    page.text(ML, 48, org.legalName || org.tradeName || 'PT MANDIRI ABADI TEKNIK', { size: 12, bold: true });
    page.text(ML, 64, `${title} · ${doc.documentNumber} · Lanjutan rincian`, { size: 8, color: '0.35 0.4 0.5' });
    page.line(ML, 74, MR, 74, 1);
    let cy = 92;
    page.rect(ML, cy, MR - ML, 16, { fill: '0.16 0.22 0.34' });
    head.forEach((h, i) => page.text(hx[i], cy + 11, h, { size: 8, bold: true, color: '1 1 1' }));
    cy += 16;
    for (const line of chunk) {
      page.text(ML + 4, cy + 11, String(line.rowNo), { size: 8 });
      page.text(ML + 30, cy + 11, String(line.description || line.name || '-').slice(0, 58), { size: 8 });
      page.right(392, cy + 11, `${line.qty} ${line.uom || ''}`.trim(), { size: 8 });
      page.right(464, cy + 11, money(line.price), { size: 8 });
      page.right(MR - 4, cy + 11, money(line.lineTotal), { size: 8 });
      page.line(ML, cy + 15, MR, cy + 15, 0.3);
      cy += 15;
    }
    page.rect(ML, 92, MR - ML, cy - 92);
    [68, 360, 400, 470].forEach((x) => page.line(x, 92, x, cy, 0.3));
    page.line(ML, PH - 46, MR, PH - 46, 0.5);
    page.text(ML, PH - 30, `Kode verifikasi ${code} · Template ${TEMPLATE_VERSION}`, { size: 7, color: '0.4 0.4 0.4' });
    pages.push(page);
  }
  pages.forEach((page, index) => page.right(MR, PH - 16, `Halaman ${index + 1}/${pages.length}`, { size: 7, color: '0.4 0.4 0.4' }));
  // Tanda tangan digital (PAdES) bila sertifikat penanda tangan dikonfigurasi.
  const pdfSign = require('../../core/pdf-sign');
  const signCfg = data.sign === false ? null : pdfSign.config();
  const signOpt = signCfg ? { ...signCfg, name: (org.legalName || 'PT MANDIRI ABADI TEKNIK') } : null;
  const buffer = buildPdf(pages, images, signOpt, { title: `${title} ${doc.documentNumber || ''}`.trim(), subject: `${org.legalName || ''} — verifikasi ${code}` });
  const digitallySigned = Boolean(signOpt) && buffer.includes('/adbe.pkcs7.detached');
  return { buffer, code, terbilang: terbilangRupiah(grand), pageCount: pages.length, templateVersion: TEMPLATE_VERSION, verificationUrl: url, digitallySigned, signerSubject: signCfg ? pdfSign.subjectOf(signCfg.certPem) : null };
}

function statusFill(status) {
  return { APPROVED: '0.16 0.55 0.34', COMPLETED: '0.16 0.55 0.34', CLOSED: '0.4 0.4 0.4', PAID: '0.16 0.55 0.34', DRAFT: '0.6 0.6 0.6', VOID: '0.7 0.2 0.2', REJECTED: '0.7 0.2 0.2' }[status] || '0.2 0.4 0.7';
}
function fmtDate(v) {
  if (!v) return '-';
  const d = new Date(v); if (isNaN(d)) return String(v).slice(0, 10);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

module.exports = { renderDocument, terbilangRupiah, TEMPLATE_VERSION };
