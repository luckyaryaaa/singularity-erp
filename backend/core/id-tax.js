'use strict';
// Pajak Penghasilan Orang Pribadi (PPh 21) Indonesia — PTKP + Tarif Efektif
// Rata-rata (TER) bulanan sesuai PP 58/2023 (berlaku sejak Januari 2024).
// Dipakai untuk MENGISI OTOMATIS profil pajak karyawan: status PTKP, kategori
// TER (A/B/C), dan tarif TER bulanan dari status kawin + jumlah tanggungan +
// penghasilan bruto bulanan. Angka bersifat baseline regulasi; untuk perubahan
// aturan, tabel di bawah adalah satu sumber yang mudah diperbarui.

// PTKP tahunan (PMK 101/2016) per status.
const PTKP = {
  'TK/0': 54000000, 'TK/1': 58500000, 'TK/2': 63000000, 'TK/3': 67500000,
  'K/0': 58500000, 'K/1': 63000000, 'K/2': 67500000, 'K/3': 72000000,
};

// Status PTKP dari status kawin + tanggungan (maks 3).
function ptkpStatus(maritalStatus, dependents = 0) {
  const s = String(maritalStatus || '').toUpperCase();
  const married = /(KAWIN|MENIKAH|MARRIED|^K\b|^K\/)/.test(s) && !/(BELUM|TIDAK|SINGLE|^TK)/.test(s);
  const d = Math.max(0, Math.min(3, Math.round(Number(dependents) || 0)));
  return `${married ? 'K' : 'TK'}/${d}`;
}

// Kategori TER (A/B/C) berdasarkan status PTKP (PP 58/2023 Pasal & Lampiran).
function terCategory(ptkp) {
  if (['TK/0', 'TK/1', 'K/0'].includes(ptkp)) return 'A';
  if (['TK/2', 'TK/3', 'K/1', 'K/2'].includes(ptkp)) return 'B';
  return 'C'; // K/3
}

// Tabel TER bulanan: [batas atas penghasilan bruto bulanan, tarif %].
// Baris terakhir Infinity = 34% untuk penghasilan sangat besar.
const TER_A = [[5400000, 0], [5650000, 0.25], [5950000, 0.5], [6300000, 0.75], [6750000, 1], [7500000, 1.25], [8550000, 1.5], [9650000, 1.75], [10050000, 2], [10350000, 2.25], [10700000, 2.5], [11050000, 3], [11600000, 3.5], [12500000, 4], [13750000, 5], [15100000, 6], [16950000, 7], [19750000, 8], [24150000, 9], [26450000, 10], [28000000, 11], [30050000, 12], [32400000, 13], [35400000, 14], [39100000, 15], [43850000, 16], [47800000, 17], [51400000, 18], [56300000, 19], [62200000, 20], [68600000, 21], [77500000, 22], [89000000, 23], [103000000, 24], [125000000, 25], [157000000, 26], [206000000, 27], [337000000, 28], [454000000, 29], [550000000, 30], [695000000, 31], [910000000, 32], [1400000000, 33], [Infinity, 34]];
const TER_B = [[6200000, 0], [6500000, 0.25], [6850000, 0.5], [7300000, 0.75], [9200000, 1], [10750000, 1.5], [11250000, 2], [11600000, 2.5], [12600000, 3], [13600000, 4], [14950000, 5], [16400000, 6], [18450000, 7], [21850000, 8], [26000000, 9], [27700000, 10], [29350000, 11], [31450000, 12], [33950000, 13], [37100000, 14], [41100000, 15], [45800000, 16], [49500000, 17], [53800000, 18], [58500000, 19], [64000000, 20], [71000000, 21], [80000000, 22], [93000000, 23], [109000000, 24], [129000000, 25], [163000000, 26], [211000000, 27], [374000000, 28], [459000000, 29], [555000000, 30], [704000000, 31], [957000000, 32], [1405000000, 33], [Infinity, 34]];
const TER_C = [[6600000, 0], [6950000, 0.25], [7350000, 0.5], [7800000, 0.75], [8850000, 1], [9800000, 1.25], [10950000, 1.5], [11200000, 1.75], [12050000, 2], [12950000, 3], [14150000, 4], [15550000, 5], [17050000, 6], [19500000, 7], [22700000, 8], [26600000, 9], [28100000, 10], [30100000, 11], [32600000, 12], [35400000, 13], [38900000, 14], [43000000, 15], [47400000, 16], [51200000, 17], [55800000, 18], [60400000, 19], [66700000, 20], [74500000, 21], [83200000, 22], [95600000, 23], [110000000, 24], [134000000, 25], [169000000, 26], [221000000, 27], [390000000, 28], [463000000, 29], [561000000, 30], [709000000, 31], [965000000, 32], [1419000000, 33], [Infinity, 34]];
const TER = { A: TER_A, B: TER_B, C: TER_C };

// Tarif TER bulanan (%) dari kategori + penghasilan bruto bulanan.
function terRate(category, monthlyGross) {
  const table = TER[category] || TER_A, g = Math.max(0, Number(monthlyGross) || 0);
  for (const [ceil, rate] of table) if (g <= ceil) return rate;
  return 34;
}

// Kalkulasi lengkap otomatis untuk profil pajak karyawan.
function autoTaxProfile({ maritalStatus, dependents = 0, monthlyGross = 0 }) {
  const ptkp = ptkpStatus(maritalStatus, dependents);
  const category = terCategory(ptkp);
  const rate = terRate(category, monthlyGross);
  const gross = Math.max(0, Number(monthlyGross) || 0);
  const monthlyPph21 = Math.round(gross * rate / 100);
  return {
    ptkpStatus: ptkp, ptkpAnnual: PTKP[ptkp], terCategory: category, terRate: rate,
    monthlyGross: gross, monthlyPph21, annualPph21Estimate: monthlyPph21 * 12,
    basis: 'PP 58/2023 · TER bulanan',
  };
}

module.exports = { PTKP, ptkpStatus, terCategory, terRate, autoTaxProfile, TER };
