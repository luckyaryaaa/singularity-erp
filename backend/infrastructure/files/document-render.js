'use strict';
// Sprint 15 (R022) — mesin dokumen resmi ber-identitas. Menghasilkan PDF
// terstruktur (kop perusahaan dari organization_identity_snapshot, tabel baris,
// terbilang, blok tanda tangan, kode verifikasi) tanpa dependensi eksternal.
// Identitas diambil dari SNAPSHOT dokumen (immutable) — dokumen lama tetap
// mencerminkan identitas saat diterbitkan meski master berubah.
const { codeFor } = require('../../core/doc-verification');
const QRCode = require('qrcode');

const PW = 595, PH = 842, ML = 42, MR = 553;                 // A4, margin kiri/kanan
const TEMPLATE_VERSION = 'MAT-OFFICIAL-A4-v2';
const esc = (v) => String(v ?? '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[^\x20-\x7e]/g, (c) => ({ 'é': 'e', 'ā': 'a' }[c] || '?'));
const money = (v) => 'Rp ' + Math.round(Number(v || 0)).toLocaleString('id-ID');

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
    this.ops.push(`BT 0.88 0.9 0.93 rg /FB 54 Tf 0.707 0.707 -0.707 0.707 165 285 Tm (${esc(str)}) Tj ET`);
    return this;
  }
  stream() { return this.ops.join('\n'); }
}

function buildPdf(input) {
  const pages = Array.isArray(input) ? input : [input];
  const pageStart = 3, contentStart = pageStart + pages.length;
  const fontRegular = contentStart + pages.length, fontBold = fontRegular + 1;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pages.map((_, i) => `${pageStart + i} 0 R`).join(' ')}] /Count ${pages.length} >>`
  ];
  for (let i = 0; i < pages.length; i++) objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 ${fontRegular} 0 R /FB ${fontBold} 0 R >> >> /Contents ${contentStart + i} 0 R >>`);
  for (const page of pages) {
    const stream = page.stream();
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  }
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  let out = '%PDF-1.4\n'; const offsets = [0];
  for (let i = 0; i < objects.length; i++) { offsets.push(Buffer.byteLength(out)); out += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`; }
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((n) => String(n).padStart(10, '0') + ' 00000 n ').join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out);
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
  p.watermark(watermark);

  // Kop perusahaan.
  p.text(ML, 52, org.legalName || org.tradeName || 'PT MANDIRI ABADI TEKNIK', { size: 15, bold: true });
  let hy = 66;
  const contact = [org.operationalAddress || org.legalAddress, [org.phone && `Telp ${org.phone}`, org.whatsapp && `WA ${org.whatsapp}`].filter(Boolean).join('  '), [org.email, org.website].filter(Boolean).join('  '), org.npwp && `NPWP: ${org.npwp}`].filter(Boolean);
  for (const c of contact) { p.text(ML, hy, c, { size: 8, color: '0.3 0.3 0.3' }); hy += 11; }
  p.line(ML, hy + 2, MR, hy + 2, 1.2);

  // Judul + metadata dokumen.
  let y = hy + 24;
  p.text(ML, y, title, { size: 13, bold: true });
  p.rect(MR - 150, y - 12, 150, 16, { fill: statusFill(doc.status) });
  p.text(MR - 144, y, `Status: ${doc.status || '-'}`, { size: 8, bold: true, color: '1 1 1' });
  y += 18;
  const meta = [['Nomor', doc.documentNumber], ['Tanggal', fmtDate(doc.createdAt)], ['Jatuh tempo', doc.dueDate ? fmtDate(doc.dueDate) : '-']];
  for (const [k, v] of meta) { p.text(ML, y, k, { size: 8, color: '0.4 0.4 0.4' }); p.text(ML + 70, y, `: ${v || '-'}`, { size: 9, bold: true }); y += 13; }

  // Kepada / rekanan.
  p.text(MR - 220, hy + 42, 'Kepada Yth.', { size: 8, color: '0.4 0.4 0.4' });
  p.text(MR - 220, hy + 55, doc.partyName || data.party?.name || '-', { size: 10, bold: true });

  // Tabel baris.
  y += 12;
  const cols = [ML, ML + 26, 360, 400, 470, MR];               // No | Deskripsi | Qty | Harga | Jumlah
  p.rect(ML, y, MR - ML, 16, { fill: '0.16 0.22 0.34' });
  const head = ['No', 'Deskripsi', 'Qty', 'Harga', 'Jumlah'];
  const hx = [ML + 4, ML + 30, 330, 404, 500];
  head.forEach((h, i) => p.text(hx[i], y + 11, h, { size: 8, bold: true, color: '1 1 1' }));
  y += 16;
  const normalized = lines.map((l, i) => {
    const qty = Number(l.qty || 1), price = Number(l.unitPrice ?? l.unit_price ?? l.price ?? 0);
    const disc = Number(l.discountPct ?? l.discount_pct ?? 0), taxPct = Number(l.taxPct ?? l.tax_pct ?? 0);
    const base = qty * price * (1 - disc / 100), lineTotal = Number(l.lineTotal ?? l.line_total ?? base * (1 + taxPct / 100));
    return { ...l, rowNo: i + 1, qty, price, disc, taxPct, base, lineTotal };
  });
  const subtotal = normalized.reduce((sum, line) => sum + line.base, 0);
  const taxTotal = normalized.reduce((sum, line) => sum + line.base * line.taxPct / 100, 0);
  const shown = normalized.slice(0, 22);
  shown.forEach((l) => {
    p.text(ML + 4, y + 11, String(l.rowNo), { size: 8 });
    p.text(ML + 30, y + 11, String(l.description || l.name || '-').slice(0, 58), { size: 8 });
    p.right(392, y + 11, `${l.qty} ${l.uom || ''}`.trim(), { size: 8 });
    p.right(464, y + 11, money(l.price), { size: 8 });
    p.right(MR - 4, y + 11, money(l.lineTotal), { size: 8 });
    p.line(ML, y + 15, MR, y + 15, 0.3);
    y += 15;
  });
  if (lines.length > shown.length) { p.text(ML + 30, y + 11, `Rincian dilanjutkan: ${lines.length - shown.length} baris pada halaman berikutnya`, { size: 8, color: '0.5 0.5 0.5' }); y += 15; }
  p.rect(ML, hy + 66 + 12, MR - ML, y - (hy + 66 + 12));       // border tabel keseluruhan
  // Garis kolom vertikal.
  [26, 360, 400, 470].forEach((cx) => p.line(ML + cx - ML + (cx === 26 ? 0 : 0), hy + 66 + 12, ML + cx - ML + (cx === 26 ? 0 : 0), y, 0.3));

  // Total.
  const grand = Number(doc.amount ?? subtotal + taxTotal);
  y += 8;
  const totals = [['Subtotal', money(subtotal)]];
  if (taxTotal > 0.5) totals.push(['PPN', money(taxTotal)]);
  totals.push(['TOTAL', money(grand)]);
  for (const [k, v] of totals) {
    const bold = k === 'TOTAL';
    p.text(400, y + 10, k, { size: bold ? 10 : 8, bold });
    p.right(MR - 4, y + 10, v, { size: bold ? 10 : 8, bold });
    y += bold ? 16 : 13;
  }
  p.text(ML, y - 4, 'Terbilang:', { size: 8, color: '0.4 0.4 0.4' });
  p.text(ML, y + 8, `# ${terbilangRupiah(grand)} #`, { size: 9, bold: true });

  // Blok tanda tangan.
  y += 40;
  const signX = MR - 180;
  p.text(signX, y, `${org.city || 'Bekasi'}, ${fmtDate(doc.createdAt)}`, { size: 8 });
  p.text(signX, y + 12, org.legalName || 'PT Mandiri Abadi Teknik', { size: 8, bold: true });
  const sig = org.signatory || {};
  p.text(signX, y + 62, sig.name || '( ................................. )', { size: 9, bold: true });
  p.line(signX, y + 64, signX + 130, y + 64, 0.4);
  p.text(signX, y + 76, sig.positionTitle || 'Pejabat Berwenang', { size: 8, color: '0.4 0.4 0.4' });

  // Syarat & ketentuan dari template (didesain pengguna, bukan hardcode).
  const terms = Array.isArray(tpl.terms) ? tpl.terms.filter(Boolean).slice(0, 8) : [];
  if (terms.length) {
    let ty = y + 58;
    p.text(ML, ty, String(tpl.termsTitle || 'Syarat & Ketentuan').toUpperCase(), { size: 8, bold: true, color: '0.25 0.3 0.4' });
    ty += 12;
    terms.forEach((t, i) => { p.text(ML, ty, `${i + 1}. ${String(t).slice(0, 96)}`, { size: 7.5, color: '0.35 0.38 0.45' }); ty += 10; });
  }

  // Footer + kotak verifikasi keaslian (QR dapat dimatikan lewat template).
  const fy = PH - 70;
  p.line(ML, fy - 8, MR, fy - 8, 0.5);
  const footerNote = tpl.footerNote || org.documentFooter;
  if (footerNote) p.text(ML, fy + 4, String(footerNote).slice(0, 110), { size: 7, color: '0.4 0.4 0.4' });
  if (tpl.showQr !== false) {
    p.rect(ML, fy + 12, 300, 40);
    p.text(ML + 6, fy + 24, 'VERIFIKASI KEASLIAN DOKUMEN', { size: 7, bold: true, color: '0.16 0.22 0.34' });
    p.text(ML + 6, fy + 35, `Kode: ${code}`, { size: 9, bold: true });
    p.text(ML + 6, fy + 46, `Verifikasi: ${url}`.slice(0, 88), { size: 6.5, color: '0.4 0.4 0.4' });
    drawQr(p, ML + 306, fy + 8, 48, url);
    p.text(MR - 4 - 190, fy + 46, 'Dokumen sah tanpa tanda tangan basah bila kode terverifikasi.', { size: 6.5, color: '0.5 0.5 0.5' });
  }

  const pages = [p];
  const remaining = normalized.slice(shown.length);
  for (let offset = 0; offset < remaining.length; offset += 38) {
    const page = new Page().watermark(watermark);
    const chunk = remaining.slice(offset, offset + 38);
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
  return { buffer: buildPdf(pages), code, terbilang: terbilangRupiah(grand), pageCount: pages.length, templateVersion: TEMPLATE_VERSION, verificationUrl: url };
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
