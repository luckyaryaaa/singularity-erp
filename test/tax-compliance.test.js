'use strict';
// Prioritas 3 — kepatuhan pajak Indonesia. Uji murni (tanpa DB) atas logika
// yang paling berisiko: format Nomor Faktur Pajak. Format salah = ditolak DJP.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const tax = require('../backend/infrastructure/database/repositories/tax-compliance');

test('nomor Faktur Pajak mengikuti format DJP: TT S . prefix . 8 digit', () => {
  // 01 = kode transaksi, 0 = normal (bukan pengganti), 001-26 = prefix NSFP.
  assert.equal(tax.formatFpNumber('01', 0, '001-26', 1), '010.001-26.00000001');
  assert.equal(tax.formatFpNumber('01', 0, '001-26', 12345678), '010.001-26.12345678');
  // Faktur pengganti: serial TETAP, ordinal naik (jatah NSFP tidak terbuang).
  assert.equal(tax.formatFpNumber('01', 1, '001-26', 1), '011.001-26.00000001');
  assert.equal(tax.formatFpNumber('02', 3, '005-26', 42), '023.005-26.00000042');
  // Total 16 digit angka (2 kode + 1 status + 13 seri) di luar pemisah titik/strip.
  const digits = tax.formatFpNumber('01', 0, '001-26', 1).replace(/[.-]/g, '');
  assert.equal(digits.length, 16, 'nomor Faktur Pajak wajib 16 digit');
});

test('modul kepatuhan pajak mengekspor kontrak yang dipakai router', () => {
  for (const fn of ['allocateRange', 'issueTaxInvoice', 'replaceTaxInvoice', 'cancelTaxInvoice',
    'issueWithholding', 'exportEFaktur', 'summary', 'listTransactionCodes', 'takeNextSerial']) {
    assert.equal(typeof tax[fn], 'function', `${fn} wajib tersedia`);
  }
});
