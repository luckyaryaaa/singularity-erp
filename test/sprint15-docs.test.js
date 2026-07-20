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
