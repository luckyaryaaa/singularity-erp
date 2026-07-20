'use strict';
// Sprint 15 (R022) — document engine resmi, verifikasi keaslian, OpenAPI,
// event catalog, dan SMTP no-op. Seluruhnya unit test murni (tanpa DB).
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');

const docVerify = require('../backend/core/doc-verification');
const render = require('../backend/infrastructure/files/document-render');
const openapi = require('../backend/core/openapi');
const smtp = require('../backend/infrastructure/smtp');
const artifacts = require('../backend/infrastructure/files/artifact-storage');
const { unzipSync, strFromU8 } = require('fflate');

test('terbilang: nol, ribuan, jutaan, campuran, miliar', () => {
  assert.equal(render.terbilangRupiah(0), 'Nol rupiah');
  assert.equal(render.terbilangRupiah(1500), 'Seribu lima ratus rupiah');
  assert.equal(render.terbilangRupiah(2_500_000), 'Dua juta lima ratus ribu rupiah');
  assert.equal(render.terbilangRupiah(186_950_000), 'Seratus delapan puluh enam juta sembilan ratus lima puluh ribu rupiah');
  assert.equal(render.terbilangRupiah(1_000_000_011), 'Satu miliar sebelas rupiah');
});

test('kode verifikasi: deterministik, unik per dokumen, menolak kode palsu', () => {
  const code = docVerify.codeFor('INV-HO-0726-001');
  assert.equal(code.length, 12);
  assert.equal(docVerify.codeFor('INV-HO-0726-001'), code, 'deterministik');
  assert.notEqual(docVerify.codeFor('INV-HO-0726-002'), code, 'unik per nomor');
  assert.equal(docVerify.verify('INV-HO-0726-001', code), true);
  assert.equal(docVerify.verify('INV-HO-0726-001', code.toLowerCase()), true, 'toleran huruf kecil');
  assert.equal(docVerify.verify('INV-HO-0726-001', 'AAAAAAAAAAAA'), false);
  assert.equal(docVerify.verify('', code), false);
});

test('render dokumen resmi: PDF valid dengan kop, terbilang, ttd, dan kode verifikasi', () => {
  const { buffer, code, terbilang } = render.renderDocument({
    document: {
      documentNumber: 'INV-TEST-0001', documentType: 'INVOICE', status: 'APPROVED',
      createdAt: '2026-07-17T08:00:00Z', amount: 55_500_000, partyName: 'PT Sinar Konstruksi',
      organizationIdentitySnapshot: {
        legalName: 'PT Mandiri Abadi Teknik', npwp: '01.234.567.8-901.000',
        documentFooter: 'Pembayaran ke rekening resmi perusahaan',
        signatory: { name: 'Lucky Arya', positionTitle: 'Direktur' }
      }
    },
    lines: [{ description: 'Fabrikasi tangki', qty: 1, uom: 'UNIT', unitPrice: 50_000_000, taxPct: 11, lineTotal: 55_500_000 }]
  });
  assert.equal(buffer.subarray(0, 5).toString(), '%PDF-');
  const content = buffer.toString('latin1');
  for (const needle of ['%%EOF', 'PT Mandiri Abadi Teknik', 'FAKTUR / INVOICE', 'INV-TEST-0001', 'Fabrikasi tangki', 'Lucky Arya', 'Direktur', code]) {
    assert.ok(content.includes(needle), `PDF memuat "${needle}"`);
  }
  assert.equal(terbilang, 'Lima puluh lima juta lima ratus ribu rupiah');
  // Identitas dari SNAPSHOT — dokumen tanpa snapshot tetap ter-render aman.
  const bare = render.renderDocument({ document: { documentNumber: 'X-1', documentType: 'DELIVERY', amount: 0 }, lines: [] });
  assert.equal(bare.buffer.subarray(0, 5).toString(), '%PDF-');
});

test('render dokumen resmi: seluruh baris dipaginasi, QR valid, watermark, dan template version', () => {
  const lines = Array.from({ length: 70 }, (_, i) => ({ description: `Baris enterprise ${i + 1}`, qty: 1, uom: 'PCS', unitPrice: 1000, lineTotal: 1000 }));
  const result = render.renderDocument({ document: { documentNumber: 'Q-PAGE-1', documentType: 'QUOTATION', status: 'DRAFT', amount: 70_000 }, lines });
  const content = result.buffer.toString('latin1');
  assert.equal(result.pageCount, 3);
  assert.equal(result.templateVersion, render.TEMPLATE_VERSION);
  assert.match(result.verificationUrl, /doc=Q-PAGE-1/);
  assert.ok(content.includes('/Count 3'), 'PDF benar-benar memiliki 3 halaman');
  assert.ok(content.includes('Baris enterprise 70'), 'baris terakhir tidak terpotong');
  assert.ok(content.includes('DRAFT'), 'watermark/status draft tertera');
});

test('signing key dokumen mendukung rotasi current + previous tanpa fallback statis', () => {
  const payload = { document: { number: 'ROT-1' }, lines: [{ qty: 1 }] };
  const oldEnv = { MAT_DOC_VERIFY_KEY_ID: 'v1', MAT_DOC_VERIFY_SECRET: 'old-secret-that-is-long-enough-123456' };
  const signature = docVerify.signPayload(payload, oldEnv, 'v1');
  const rotated = { MAT_DOC_VERIFY_KEY_ID: 'v2', MAT_DOC_VERIFY_SECRET: 'new-secret-that-is-long-enough-123456', MAT_DOC_VERIFY_PREVIOUS_KEY_ID: 'v1', MAT_DOC_VERIFY_PREVIOUS_SECRET: oldEnv.MAT_DOC_VERIFY_SECRET };
  assert.equal(docVerify.verifyPayload(payload, signature, rotated, 'v1'), true);
  assert.throws(() => docVerify.signPayload(payload, { MAT_DOC_VERIFY_KEY_ID: 'v2', MAT_DOC_VERIFY_SECRET: rotated.MAT_DOC_VERIFY_SECRET }, 'v1'), /tidak tersedia/);
});

test('smtp multipart menyertakan PDF sebagai attachment base64', () => {
  const message = smtp.buildMessage({ from: 'erp@example.com' }, { to: 'user@example.com', subject: 'Dokumen', text: 'Terlampir.', attachments: [{ filename: 'INV-1.pdf', contentType: 'application/pdf', content: Buffer.from('%PDF-test') }] });
  assert.match(message, /multipart\/mixed/);
  assert.match(message, /filename="INV-1\.pdf"/);
  assert.ok(message.includes(Buffer.from('%PDF-test').toString('base64')));
});

test('export spreadsheet menghasilkan XLSX Office Open XML valid, bukan XML .xls', () => {
  const buffer = artifacts.excelBuffer('Enterprise report', [{ customer: 'PT Contoh', amount: 125000, active: true }]);
  assert.equal(buffer.subarray(0, 2).toString(), 'PK');
  const files = unzipSync(buffer);
  assert.ok(files['xl/workbook.xml']);
  assert.ok(files['xl/worksheets/sheet1.xml']);
  const sheet = strFromU8(files['xl/worksheets/sheet1.xml']);
  assert.match(sheet, /Enterprise report/);
  assert.match(sheet, /PT Contoh/);
  assert.match(sheet, /<v>125000<\/v>/);
  assert.match(sheet, /state="frozen"/);
});

test('export PDF laporan memaginasi seluruh baris tanpa truncation', () => {
  const rows = Array.from({ length: 100 }, (_, index) => ({ number: index + 1, description: `Enterprise row ${index + 1}` }));
  const buffer = artifacts.pdfBuffer('Enterprise PDF report', rows);
  const content = buffer.toString('latin1');
  assert.equal(buffer.subarray(0, 5).toString(), '%PDF-');
  assert.ok(content.includes('/Count 3'));
  assert.ok(content.includes('Enterprise row 100'));
  assert.ok(content.includes('Page 3 of 3'));
});

test('openapi: spec 3.0.3 lengkap + event catalog', () => {
  const spec = openapi.spec('localhost');
  assert.equal(spec.openapi, '3.0.3');
  assert.equal(spec.info.version, openapi.API_VERSION);
  assert.ok(Object.keys(spec.paths).length >= 40, 'minimal 40 path terdokumentasi');
  assert.ok(spec.paths['/api/documents/{id}/action'], 'endpoint aksi dokumen ada');
  assert.ok(spec.components.securitySchemes.cookieAuth);
  // Endpoint publik tidak mensyaratkan cookie.
  assert.deepEqual(spec.paths['/api/health'].get.security, []);
  const cat = openapi.eventsCatalog();
  assert.ok(cat.count >= 10);
  assert.ok(cat.events.every((e) => e.event && e.when && Array.isArray(e.payload)));
});

test('smtp: tanpa MAT_SMTP_HOST menjadi no-op SKIPPED; alamat tak valid FAILED', async () => {
  const saved = process.env.MAT_SMTP_HOST;
  delete process.env.MAT_SMTP_HOST;
  try {
    assert.equal(smtp.isConfigured(), false);
    const r = await smtp.send({ to: 'x@example.com', subject: 's', text: 't' });
    assert.equal(r.status, 'SKIPPED');
    process.env.MAT_SMTP_HOST = 'smtp.example.invalid';
    const bad = await smtp.send({ to: 'bukan-email', subject: 's', text: 't' });
    assert.equal(bad.status, 'FAILED');
  } finally {
    if (saved === undefined) delete process.env.MAT_SMTP_HOST; else process.env.MAT_SMTP_HOST = saved;
  }
});
