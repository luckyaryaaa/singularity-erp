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
// Palet dokumen enterprise (SAP/Oracle/Dynamics-grade): slate ink + satu aksen biru
// tenang, hairline halus, isian abu sangat muda. Ditahan (tidak ada blok berat).
const INK = '0.106 0.149 0.212', SLATE = '0.271 0.325 0.404', MUTE = '0.470 0.518 0.588';
const HAIR = '0.855 0.878 0.914', SOFT = '0.960 0.968 0.980', ACCENT = '0.098 0.294 0.573', ACCENTSOFT = '0.905 0.929 0.969';

// ── Metrik font (AFM Helvetica / Helvetica-Bold, /1000 em, ASCII 32..126) ────
// Lebar akurat — huruf KAPITAL & bold jauh lebih lebar dari perkiraan kasar,
// jadi right()/center() tak lagi meleset (judul HURUF BESAR tak lari dari margin).
const HW = '278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584'.split(',').map(Number);
const HB = '278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584'.split(',').map(Number);
function strWidth(str, size = 9, bold = false) {
  const T = bold ? HB : HW, s = String(str); let w = 0;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i) - 32; w += (c >= 0 && c < 95 ? T[c] : (bold ? 611 : 556)); }
  return w / 1000 * size;
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
  right(xRight, y, str, opt = {}) { this.text(xRight - strWidth(str, opt.size || 9, opt.bold), y, str, opt); return this; }
  center(xc, y, str, opt = {}) { this.text(xc - strWidth(str, opt.size || 9, opt.bold) / 2, y, str, opt); return this; }
  line(x1, y1, x2, y2, w = 0.6, color = HAIR) { this.ops.push(`${w} w ${color} RG ${x1.toFixed(1)} ${(PH - y1).toFixed(1)} m ${x2.toFixed(1)} ${(PH - y2).toFixed(1)} l S`); return this; }
  rect(x, y, w, h, { fill, stroke, sw = 0.6 } = {}) {
    if (fill) this.ops.push(`${fill} rg ${x.toFixed(1)} ${(PH - y - h).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f`);
    else this.ops.push(`${sw} w ${stroke || HAIR} RG ${x.toFixed(1)} ${(PH - y - h).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re S`);
    return this;
  }
  watermark(str) {
    if (!str) return this;
    this.ops.push(`BT 0.90 0.92 0.95 rg /FB 60 Tf 0.707 0.707 -0.707 0.707 150 300 Tm (${esc(str)}) Tj ET`);
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
  const opt = data.template || data.options || {};        // hint ringan dari pemanggil (judul/label); DESAIN tetap
  const p = new Page();
  const title = opt.title || TITLES[doc.documentType] || (doc.documentType || 'DOKUMEN').replace(/_/g, ' ');
  const code = doc.officialSignature || codeFor(doc.documentNumber);
  const url = verificationUrl(doc.documentNumber, code);
  const watermark = data.copy ? 'COPY' : ['DRAFT', 'VOID', 'CANCELLED', 'REJECTED'].includes(doc.status) ? doc.status : null;
  p.watermark(watermark);
  const RED = '0.706 0.204 0.239';

  // Aset organisasi (logo/stempel/tanda tangan) → XObject; fallback aman bila rusak.
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

  // Normalisasi baris + total. payroll = ada potongan negatif (slip gaji).
  const normalized = lines.map((l, i) => {
    const qty = Number(l.qty || 1), price = Number(l.unitPrice ?? l.unit_price ?? l.price ?? 0);
    const disc = Number(l.discountPct ?? l.discount_pct ?? 0), taxPct = Number(l.taxPct ?? l.tax_pct ?? 0);
    const base = qty * price * (1 - disc / 100), lineTotal = Number(l.lineTotal ?? l.line_total ?? base * (1 + taxPct / 100));
    return { ...l, rowNo: i + 1, qty, price, disc, taxPct, base, lineTotal };
  });
  const payroll = normalized.some((l) => l.lineTotal < 0);
  const subtotal = normalized.reduce((s, l) => s + l.base, 0);
  const taxTotal = normalized.reduce((s, l) => s + l.base * l.taxPct / 100, 0);
  const discTotal = normalized.reduce((s, l) => s + l.qty * l.price * l.disc / 100, 0);
  const grand = Number(doc.amount ?? subtotal + taxTotal);
  const isQuo = doc.documentType === 'QUOTATION';

  // ══ KOP ══════════════════════════════════════════════════════════════════
  const orgName = org.legalName || org.tradeName || 'Perusahaan';
  if (logo) { const d = fit(logo, 46, 46); p.image(ML, 42, d.w, d.h, logo.index); }
  else { p.rect(ML, 42, 42, 42, { fill: ACCENT }); p.center(ML + 21, 71, (orgName.replace(/^(PT|CV|UD)[\s.]+/i, '').trim()[0] || 'M').toUpperCase(), { size: 22, bold: true, color: '1 1 1' }); }
  const nx = ML + 58;
  p.text(nx, 55, orgName.slice(0, 46), { size: 13.5, bold: true, color: INK });
  let hy = 67;
  if (org.tagline) { p.text(nx, hy, String(org.tagline).slice(0, 64), { size: 7.5, color: MUTE }); hy += 11; }
  const addr = org.operationalAddress || org.legalAddress;
  if (addr) { p.text(nx, hy, String(addr).slice(0, 90), { size: 7.5, color: SLATE }); hy += 10; }
  const cline = [org.npwp && `NPWP ${org.npwp}`, org.phone && `Telp ${org.phone}`, org.email].filter(Boolean).join('     ');
  if (cline) { p.text(nx, hy, cline.slice(0, 98), { size: 7.5, color: MUTE }); hy += 10; }

  // Identitas dokumen (kanan): judul aksen (auto-fit agar tak menabrak nama PT / lari dari margin) + nomor + pil status.
  const nameEnd = nx + strWidth(orgName.slice(0, 46), 13.5, true);        // ujung kanan nama perusahaan (metrik akurat)
  const titleLeft = Math.min(MR - 110, Math.max(300, nameEnd + 20));      // mulai judul: setelah nama + jeda, minimal x=300
  let titleSize = 18;                                                     // kecilkan 18→10.5 sampai muat di zona kanan
  while (titleSize > 10.5 && strWidth(title, titleSize, true) > MR - titleLeft) titleSize -= 0.5;
  p.right(MR, 57, title, { size: titleSize, bold: true, color: ACCENT });
  p.right(MR, 71, doc.documentNumber || '', { size: 9.5, bold: true, color: INK });
  const st = String(doc.status || '').toUpperCase();
  if (st) { const sw = st.length * 4.8 + 16; p.rect(MR - sw, 77, sw, 13, { fill: SOFT }); p.text(MR - sw + 8, 86, st, { size: 7, bold: true, color: statusFill(doc.status) }); }

  const headBottom = Math.max(hy + 6, 98);
  p.rect(ML, headBottom, MR - ML, 1.4, { fill: ACCENT });      // satu garis kop aksen

  // ══ ISI: mode blok/surat (data.body) atau line-item (tabel) ═══════════════
  const CW = MR - ML;
  const drawDocBlocks = (startY) => {
    let yy = startY;
    const para = (text, o = {}) => {
      const size = o.size || 9.5, lh = o.lh || 14.5, maxC = Math.floor(CW / (size * 0.487));
      let line = '';
      for (const w of String(text).split(/\s+/)) {
        if (line && (line + ' ' + w).length > maxC) { p.text(ML, yy + size, line, { size, color: o.color || INK }); yy += lh; line = w; }
        else line = line ? line + ' ' + w : w;
      }
      if (line) { p.text(ML, yy + size, line, { size, color: o.color || INK }); yy += lh; }
    };
    for (const blk of data.body) {
      if (!blk) continue;
      if (blk.type === 'space') { yy += blk.h || 12; continue; }
      if (blk.type === 'letterhead') {
        if (blk.place || blk.date) p.right(MR, yy + 9, `${blk.place || ''}${blk.place && blk.date ? ', ' : ''}${blk.date || ''}`, { size: 9, color: INK });
        let a = yy;
        [['Nomor', blk.number], ['Lampiran', blk.attachment], ['Perihal', blk.subject]].filter(([, v]) => v).forEach(([k, v]) => { p.text(ML, a + 9, k, { size: 9, color: MUTE }); p.text(ML + 60, a + 9, `: ${v}`, { size: 9, bold: k === 'Perihal', color: INK }); a += 14; });
        yy = Math.max(a, yy + 14) + 8;
        if (blk.recipient) { p.text(ML, yy + 9, 'Kepada Yth.', { size: 9, color: INK }); yy += 21; String(blk.recipient).split('\n').forEach((r) => { p.text(ML, yy, r, { size: 9, bold: true, color: INK }); yy += 13; }); yy += 6; }
        continue;
      }
      if (blk.type === 'heading') { yy += 6; p.text(ML, yy + 9, String(blk.text), { size: blk.size || 11, bold: true, color: INK }); yy += (blk.size || 11) + 6; if (blk.rule) { p.line(ML, yy - 2, MR, yy - 2, 0.6, HAIR); yy += 4; } continue; }
      if (blk.type === 'para') { yy += 3; para(blk.text, blk); yy += (blk.gap ?? 7); continue; }
      if (blk.type === 'meta') { const lw = blk.labelW || 120, ind = blk.indent || 0; (blk.rows || []).forEach(([k, v]) => { p.text(ML + ind, yy + 10, k, { size: 9, color: MUTE }); p.text(ML + ind + lw, yy + 10, `: ${v}`, { size: 9, bold: blk.bold !== false, color: INK }); yy += 15; }); yy += (blk.gap ?? 6); continue; }
      if (blk.type === 'table') {
        const heads = blk.head || [], rows = blk.rows || [], n = heads.length || 1;
        const widths = blk.widths || heads.map(() => CW / n);
        const rights = blk.right || heads.map((_, i) => i > 0);
        const xs = []; let cx = ML; widths.forEach((w) => { xs.push(cx); cx += w; });
        const tstart = yy;
        p.rect(ML, yy, CW, 20, { fill: SOFT });
        heads.forEach((h, i) => { const tx = rights[i] ? xs[i] + widths[i] - 6 : xs[i] + 6; rights[i] ? p.right(tx, yy + 13, String(h), { size: 7.5, bold: true, color: SLATE }) : p.text(tx, yy + 13, String(h), { size: 7.5, bold: true, color: SLATE }); });
        p.line(ML, yy + 20, MR, yy + 20, 1, ACCENT); yy += 20;
        rows.forEach((r, ri) => { const strong = (blk.strongRows || []).includes(ri); if (strong) p.rect(ML, yy, CW, 20, { fill: ACCENTSOFT }); r.forEach((c, i) => { const tx = rights[i] ? xs[i] + widths[i] - 6 : xs[i] + 6; const o = { size: 8.5, bold: strong || (i === 0 && blk.boldFirst), color: strong ? ACCENT : (i === 0 ? INK : SLATE) }; rights[i] ? p.right(tx, yy + 13.5, String(c), o) : p.text(tx, yy + 13.5, String(c).slice(0, 46), o); }); p.line(ML, yy + 20, MR, yy + 20, 0.5, HAIR); yy += 20; });
        p.rect(ML, tstart, CW, yy - tstart, { stroke: HAIR });
        yy += (blk.gap ?? 8); continue;
      }
      if (blk.type === 'total') { const bw = blk.width || 260, bx = MR - bw; p.rect(bx, yy, bw, 26, { fill: ACCENTSOFT }); p.text(bx + 12, yy + 17, String(blk.label), { size: 10, bold: true, color: ACCENT }); p.right(MR - 12, yy + 17, String(blk.value), { size: 11.5, bold: true, color: ACCENT }); yy += (blk.gap ?? 12) + 26; continue; }
    }
    return yy;
  };
  let y = headBottom + 22, contentBottom, shown = [];
  if (Array.isArray(data.body)) { y = drawDocBlocks(y); contentBottom = y; }
  else {
  const partyLbl = (opt.partyLabel || (payroll ? 'Karyawan' : isQuo ? 'Ditujukan Kepada' : 'Ditagihkan Kepada')).toUpperCase();
  p.text(ML, y, partyLbl, { size: 7, bold: true, color: MUTE });
  p.text(ML, y + 16, String(doc.partyName || data.party?.name || '-').slice(0, 46), { size: 11, bold: true, color: INK });
  const paddr = doc.payload?.customerAddress || (data.party && data.party.city) || '';
  if (paddr) p.text(ML, y + 29, String(paddr).slice(0, 56), { size: 8, color: SLATE });
  if (doc.payload?.attn) p.text(ML, y + 40, `u.p. ${String(doc.payload.attn).slice(0, 48)}`, { size: 8, color: MUTE });

  const mX = 348, mW = MR - mX;
  const metaRows = payroll
    ? [['Periode', String(doc.payload?.period || fmtDate(doc.createdAt))], ['Tanggal Cetak', fmtDate(new Date())], ['Referensi', doc.documentNumber || '-']]
    : [['Tanggal', fmtDate(doc.createdAt)],
       isQuo ? ['Berlaku s.d.', doc.dueDate ? fmtDate(doc.dueDate) : '-'] : ['Jatuh Tempo', doc.dueDate ? fmtDate(doc.dueDate) : '-'],
       ...(!isQuo && doc.payload?.customerPoNumber ? [['No. PO', String(doc.payload.customerPoNumber)]] : []),
       ['Termin', doc.payload?.terms || (doc.dueDate ? '30 Hari' : 'Tunai')]];
  const mH = metaRows.length * 15 + 8;
  p.rect(mX, y - 6, mW, mH, { fill: SOFT });
  let my = y + 7;
  metaRows.forEach(([k, v]) => { p.text(mX + 10, my, k, { size: 8, color: MUTE }); p.right(MR - 10, my, String(v).slice(0, 26), { size: 8, bold: true, color: INK }); my += 15; });
  y = Math.max(y + 52, my + 8);

  // ══ TABEL BARIS ══════════════════════════════════════════════════════════
  const tableTop = y, HROW = 20;
  const cols = payroll ? { no: ML + 6, desc: ML + 26, total: MR - 8 } : { no: ML + 6, desc: ML + 26, qty: 336, price: 458, total: MR - 8 };
  const drawHead = (pg, yy) => {
    pg.rect(ML, yy, MR - ML, HROW, { fill: SOFT });
    pg.text(cols.no, yy + 13, 'NO', { size: 7.5, bold: true, color: SLATE });
    pg.text(cols.desc, yy + 13, 'DESKRIPSI', { size: 7.5, bold: true, color: SLATE });
    if (!payroll) { pg.right(cols.qty, yy + 13, 'QTY', { size: 7.5, bold: true, color: SLATE }); pg.right(cols.price, yy + 13, 'HARGA SATUAN', { size: 7.5, bold: true, color: SLATE }); }
    pg.right(cols.total, yy + 13, 'JUMLAH', { size: 7.5, bold: true, color: SLATE });
    pg.line(ML, yy + HROW, MR, yy + HROW, 1, ACCENT);
  };
  const drawRow = (pg, yy, l) => {
    const neg = l.lineTotal < 0;
    pg.text(cols.no, yy + 13.5, String(l.rowNo), { size: 8.5, color: MUTE });
    pg.text(cols.desc, yy + 13.5, String(l.description || l.name || '-').slice(0, payroll ? 66 : 50), { size: 8.5, color: INK });
    if (!payroll) { pg.right(cols.qty, yy + 13.5, `${l.qty}${l.uom ? ' ' + l.uom : ''}`.slice(0, 12), { size: 8.5, color: SLATE }); pg.right(cols.price, yy + 13.5, money(l.price), { size: 8.5, color: SLATE }); }
    pg.right(cols.total, yy + 13.5, neg ? '(' + money(-l.lineTotal) + ')' : money(l.lineTotal), { size: 8.5, bold: !payroll, color: neg ? RED : INK });
    pg.line(ML, yy + HROW, MR, yy + HROW, 0.5, HAIR);
  };
  drawHead(p, y); y += HROW;
  const maxRows = payroll ? 18 : 14;
  shown = normalized.slice(0, maxRows);
  shown.forEach((l) => { drawRow(p, y, l); y += HROW; });
  const minBottom = tableTop + HROW + HROW * (payroll ? Math.max(shown.length, 4) : 6);
  if (y < minBottom && normalized.length <= shown.length) y = minBottom;
  if (normalized.length > shown.length) { p.text(cols.desc, y + 13, `+${normalized.length - shown.length} baris pada halaman berikutnya`, { size: 7.5, color: MUTE }); y += HROW; }
  p.rect(ML, tableTop, MR - ML, y - tableTop, { stroke: HAIR });

  // ══ RINGKASAN (kanan) + PEMBAYARAN/CATATAN (kiri) ════════════════════════
  const sX = 340, sW = MR - sX; let ry = y + 18;
  const sumRow = (label, val, o = {}) => {
    if (o.fill) p.rect(sX, ry, sW, o.h || 17, { fill: o.fill });
    p.text(sX + 10, ry + (o.big ? 16 : 12), label, { size: o.big ? 10 : 8.5, bold: o.bold, color: o.labelColor || (o.big ? ACCENT : MUTE) });
    p.right(MR - 10, ry + (o.big ? 16 : 12), val, { size: o.big ? 11.5 : 8.5, bold: o.valBold !== false, color: o.valColor || INK });
    ry += (o.h || 17);
  };
  let payable = grand;                          // nilai final yang benar-benar dibayar (untuk terbilang)
  if (payroll) {
    const earn = normalized.filter((l) => l.lineTotal > 0).reduce((s, l) => s + l.lineTotal, 0);
    const ded = normalized.filter((l) => l.lineTotal < 0).reduce((s, l) => s - l.lineTotal, 0);
    sumRow('Total Penghasilan', money(earn), { valBold: false });
    sumRow('Total Potongan', '(' + money(ded) + ')', { valColor: RED, valBold: false });
    p.line(sX, ry + 1, MR, ry + 1, 0.8, HAIR); ry += 4;
    sumRow('GAJI BERSIH (THP)', money(grand), { fill: ACCENTSOFT, big: true, bold: true, h: 26, valColor: ACCENT });
  } else {
    // Alur pajak Indonesia: PPN DITAMBAH (dibayar pelanggan), PPh DIPOTONG (withholding).
    // payload: pphType ('PPh 23'/'PPh 4(2)'/'PPh 22'), pphRate (%), atau pph/pph23 (nominal).
    const pphRate = Number(doc.payload?.pphRate ?? (doc.payload?.pph23 != null ? 2 : 0)) || 0;
    const pphType = doc.payload?.pphType || (doc.payload?.pph23 != null ? 'PPh 23' : 'PPh');
    const pphAmt = doc.payload?.pph != null ? Number(doc.payload.pph)
      : doc.payload?.pph23 != null ? Number(doc.payload.pph23)
      : (pphRate ? Math.round(subtotal * pphRate / 100) : 0);
    if (discTotal > 0.5) {
      sumRow('Subtotal', money(subtotal + discTotal), { valBold: false });
      sumRow('Diskon', '(' + money(discTotal) + ')', { valColor: RED, valBold: false });
      sumRow('DPP', money(subtotal), { valBold: false });
    } else {
      sumRow('DPP (Dasar Pengenaan Pajak)', money(subtotal), { valBold: false });
    }
    sumRow(`PPN ${taxTotal > 0.5 ? '11%' : '0%'}`, money(taxTotal), { valBold: false });
    p.line(sX, ry + 1, MR, ry + 1, 0.8, HAIR); ry += 4;
    if (pphAmt > 0.5) {
      sumRow('Total Tagihan', money(grand), { fill: SOFT, bold: true, h: 20, labelColor: INK });
      sumRow(`Dipotong ${pphType} (${pphRate}%)`, '(' + money(pphAmt) + ')', { valColor: RED, valBold: false });
      p.line(sX, ry + 1, MR, ry + 1, 0.8, HAIR); ry += 4;
      payable = grand - pphAmt;
      sumRow('JUMLAH DIBAYAR', money(payable), { fill: ACCENTSOFT, big: true, bold: true, h: 26, valColor: ACCENT });
    } else {
      sumRow('TOTAL', money(grand), { fill: ACCENTSOFT, big: true, bold: true, h: 26, valColor: ACCENT });
    }
  }
  // Terbilang (nilai final dibayar), dibungkus ≤2 baris.
  if (opt.showTerbilang !== false) {
    p.text(sX, ry + 15, 'Terbilang:', { size: 7, bold: true, color: MUTE });
    const wrap = (s, n) => { const out = []; let ln = ''; for (const w of String(s).split(' ')) { if ((ln + ' ' + w).trim().length > n) { out.push(ln.trim()); ln = w; } else ln += ' ' + w; } if (ln.trim()) out.push(ln.trim()); return out; };
    wrap(terbilangRupiah(payable), 44).slice(0, 2).forEach((ln, i) => p.text(sX, ry + 26 + i * 10, ln, { size: 7.5, color: SLATE }));
    ry += 46;
  }

  // Kiri: informasi pembayaran (transaksional) + catatan.
  let ly = y + 18;
  const bank = org.bank || {};
  if (!payroll && (bank.bankName || bank.accountNumber)) {
    p.text(ML, ly, 'INFORMASI PEMBAYARAN', { size: 7, bold: true, color: MUTE }); ly += 15;
    [['Bank', bank.bankName || '-'], ['Atas Nama', bank.accountHolder || orgName], ['No. Rekening', bank.accountNumber || '-']].forEach(([k, v]) => { p.text(ML, ly, k, { size: 8, color: MUTE }); p.text(ML + 78, ly, String(v).slice(0, 34), { size: 8, bold: true, color: INK }); ly += 13; });
  }
  const notes = Array.isArray(opt.notes) ? opt.notes.filter(Boolean).slice(0, 4) : [];
  if (notes.length) { ly += 4; p.text(ML, ly, (opt.notesTitle || 'Catatan').toUpperCase(), { size: 7, bold: true, color: MUTE }); ly += 13; notes.forEach((t) => { p.text(ML, ly, '- ' + String(t).slice(0, 58), { size: 7.5, color: SLATE }); ly += 11; }); }
  contentBottom = Math.max(ly, ry);
  }

  // ══ TANDA TANGAN ═════════════════════════════════════════════════════════
  let bottom = contentBottom + 26;
  if (opt.showSignature !== false) {
    const sy = bottom, boxW = 200, rx = MR - boxW, sig = org.signatory || {};
    p.text(rx, sy, opt.signatureLabel || (payroll ? 'Disahkan oleh,' : 'Hormat kami,'), { size: 8, color: SLATE });
    if (stamp) { const d = fit(stamp, 92, 34); p.image(rx + boxW / 2 - d.w / 2 - 14, sy + 8, d.w, d.h, stamp.index); }
    if (signatureArt) { const d = fit(signatureArt, 84, 32); p.image(rx + boxW / 2 - d.w / 2 + 12, sy + 10, d.w, d.h, signatureArt.index); }
    p.line(rx, sy + 50, rx + boxW, sy + 50, 0.6, SLATE);
    p.text(rx, sy + 62, (sig.name || org.legalName || '(Nama Jelas)').slice(0, 34), { size: 8.5, bold: true, color: INK });
    p.text(rx, sy + 73, (sig.positionTitle || 'Pejabat Berwenang').slice(0, 34), { size: 7.5, color: MUTE });
    if (opt.receiverBox === true || (!payroll && !Array.isArray(data.body) && opt.receiverBox !== false)) {
      p.text(ML, sy, opt.receiverLabel || 'Diterima oleh,', { size: 8, color: SLATE });
      p.line(ML, sy + 50, ML + boxW, sy + 50, 0.6, SLATE);
      p.text(ML, sy + 62, '(  .....................................  )', { size: 8, color: MUTE });
      p.text(ML, sy + 73, 'Nama & Stempel', { size: 7.5, color: MUTE });
    }
  }

  // ══ FOOTER — dua zona rapi: identitas (kiri) + blok verifikasi (kanan) ═════
  const drawFooter = (pg) => {
    const fy = PH - 50;
    pg.line(ML, fy, MR, fy, 0.6, HAIR);
    pg.text(ML, fy + 13, orgName.slice(0, 42), { size: 7.5, bold: true, color: SLATE });
    const footBits = [org.phone && `Telp ${org.phone}`, org.email, org.website].filter(Boolean).join('   ·   ');
    if (footBits) pg.text(ML, fy + 24, footBits.slice(0, 78), { size: 7, color: MUTE });
    pg.text(ML, fy + 34, (org.documentFooter || 'Dokumen diproses secara elektronik; sah tanpa tanda tangan basah bila terverifikasi.').slice(0, 90), { size: 6.5, color: MUTE });
    if (opt.showQr !== false) {
      const qs = 36, qx = MR - qs, qy = fy + 5;
      drawQr(pg, qx, qy, qs, url);
      pg.right(qx - 12, fy + 13, 'VERIFIKASI DOKUMEN', { size: 6, bold: true, color: MUTE });
      pg.right(qx - 12, fy + 25, code, { size: 9, bold: true, color: ACCENT });
      pg.right(qx - 12, fy + 35, 'Pindai QR untuk cek keaslian', { size: 6, color: MUTE });
    }
  };
  drawFooter(p);

  // ══ HALAMAN LANJUTAN ═════════════════════════════════════════════════════
  const pages = [p];
  const remaining = normalized.slice(shown.length);
  for (let off = 0; off < remaining.length; off += 30) {
    const pg = new Page().watermark(watermark);
    pg.text(ML, 52, orgName, { size: 11, bold: true, color: INK });
    pg.right(MR, 52, `${title} · ${doc.documentNumber || ''}`, { size: 8, color: MUTE });
    pg.rect(ML, 62, MR - ML, 1.2, { fill: ACCENT });
    let cy = 80;
    drawHead(pg, cy); cy += HROW;
    for (const l of remaining.slice(off, off + 30)) { drawRow(pg, cy, l); cy += HROW; }
    pg.rect(ML, 80, MR - ML, cy - 80, { stroke: HAIR });
    drawFooter(pg);
    pages.push(pg);
  }
  pages.forEach((pg, i) => pg.center((ML + MR) / 2, PH - 6, `Halaman ${i + 1} dari ${pages.length}`, { size: 6.5, color: MUTE }));

  // ══ TANDA TANGAN DIGITAL (PAdES) + RAKIT ═════════════════════════════════
  const pdfSign = require('../../core/pdf-sign');
  const signCfg = data.sign === false ? null : pdfSign.config();
  const signOpt = signCfg ? { ...signCfg, name: (org.legalName || 'MAT ERP') } : null;
  const buffer = buildPdf(pages, images, signOpt, { title: `${title} ${doc.documentNumber || ''}`.trim(), subject: `${org.legalName || ''} — verifikasi ${code}` });
  const digitallySigned = Boolean(signOpt) && buffer.includes('/adbe.pkcs7.detached');
  return { buffer, code, terbilang: terbilangRupiah(grand), pageCount: pages.length, templateVersion: TEMPLATE_VERSION, verificationUrl: url, digitallySigned, signerSubject: signCfg ? pdfSign.subjectOf(signCfg.certPem) : null };
}

function statusFill(status) {
  return { APPROVED: '0.16 0.55 0.34', COMPLETED: '0.16 0.55 0.34', CLOSED: '0.4 0.4 0.4', PAID: '0.16 0.55 0.34', DRAFT: '0.6 0.6 0.6', VOID: '0.7 0.2 0.2', REJECTED: '0.7 0.2 0.2' }[status] || '0.2 0.4 0.7';
}
const MONTHS_LONG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
function fmtDate(v) {
  if (!v) return '-';
  const d = new Date(v); if (isNaN(d)) return String(v).slice(0, 10);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

module.exports = { renderDocument, terbilangRupiah, TEMPLATE_VERSION };
