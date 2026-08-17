'use strict';
// Unit test murni (tanpa DB) yang mengunci angka PPh 21 TER dari file referensi
// perusahaan "TER PPH.pdf" — disalin persis ke backend/core/id-tax.js. Test ini
// mencegah regresi diam-diam pada PTKP, pemetaan kategori TER, dan tabel tarif.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PTKP, ptkpStatus, terCategory, terRate, autoTaxProfile } = require('../backend/core/id-tax');

test('PTKP tahunan mencakup status K/I (penghasilan istri digabung)', () => {
  assert.equal(PTKP['TK/0'], 54000000);
  assert.equal(PTKP['K/3'], 72000000);
  assert.equal(PTKP['K/I/0'], 112500000);
  assert.equal(PTKP['K/I/3'], 126000000);
});

test('ptkpStatus menurunkan kode PTKP dari status kawin + tanggungan + spouseIncome', () => {
  assert.equal(ptkpStatus('BELUM KAWIN', 0), 'TK/0');
  assert.equal(ptkpStatus('KAWIN', 2), 'K/2');
  assert.equal(ptkpStatus('KAWIN', 5), 'K/3'); // tanggungan dibatasi maks 3
  assert.equal(ptkpStatus('KAWIN', 0, true), 'K/I/0'); // penghasilan istri digabung
  assert.equal(ptkpStatus('KAWIN', 1, true), 'K/I/1');
});

test('terCategory sesuai pemetaan TER PPH (K/0 di B, K/I di C)', () => {
  assert.equal(terCategory('TK/0'), 'A');
  assert.equal(terCategory('TK/1'), 'A');
  assert.equal(terCategory('K/0'), 'B'); // TER PPH: K/0 masuk B, bukan A
  assert.equal(terCategory('K/2'), 'B');
  assert.equal(terCategory('K/3'), 'C');
  assert.equal(terCategory('K/I/0'), 'C');
});

test('terRate membaca tabel TER PPH gabungan berdasar bruto bulanan', () => {
  // Batas baris bersifat batas-bawah; di bawah baris pertama = 0%.
  assert.equal(terRate('A', 5400000), 0);
  assert.equal(terRate('A', 5400001), 0.25);
  assert.equal(terRate('A', 6300001), 1);
  assert.equal(terRate('B', 6300001), 0.25);
  assert.equal(terRate('C', 6300001), 0.25);
  assert.equal(terRate('A', 10700001), 3);
  assert.equal(terRate('B', 10000000), 1.5);
  assert.equal(terRate('C', 20000000), 5);
  assert.equal(terRate('A', 1419000001), 31);
});

test('autoTaxProfile menghitung profil PPh 21 lengkap end-to-end', () => {
  const k1 = autoTaxProfile({ maritalStatus: 'KAWIN', dependents: 1, monthlyGross: 10000000 });
  assert.equal(k1.ptkpStatus, 'K/1');
  assert.equal(k1.terCategory, 'B');
  assert.equal(k1.terRate, 1.5);
  assert.equal(k1.ptkpAnnual, 63000000);
  assert.equal(k1.monthlyPph21, 150000); // 10.000.000 x 1,5%
  assert.equal(k1.annualPph21Estimate, 1800000);

  const ki = autoTaxProfile({ maritalStatus: 'KAWIN', dependents: 0, monthlyGross: 20000000, spouseIncome: true });
  assert.equal(ki.ptkpStatus, 'K/I/0');
  assert.equal(ki.terCategory, 'C');
  assert.equal(ki.terRate, 5);
  assert.equal(ki.monthlyPph21, 1000000); // 20.000.000 x 5%
});
