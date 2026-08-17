'use strict';
// Pajak Penghasilan Orang Pribadi (PPh 21) — PTKP + Tarif Efektif Rata-rata
// (TER) bulanan. SUMBER TARIF: file referensi perusahaan "TER PPH.pdf" (bukan
// asumsi standar) — dipakai persis: pemetaan kategori TER, batas PTKP, dan
// tabel tarif gabungan A/B/C. Dipakai untuk mengisi otomatis profil pajak
// karyawan dari status kawin + tanggungan + penghasilan bruto bulanan.

// PTKP tahunan per status (termasuk K/I = kawin, penghasilan istri digabung).
const PTKP = {
  'TK/0': 54000000, 'TK/1': 58500000, 'TK/2': 63000000, 'TK/3': 67500000,
  'K/0': 58500000, 'K/1': 63000000, 'K/2': 67500000, 'K/3': 72000000,
  'K/I/0': 112500000, 'K/I/1': 117000000, 'K/I/2': 121500000, 'K/I/3': 126000000,
};

// Status PTKP dari status kawin + tanggungan (maks 3) + apakah penghasilan
// istri digabung (K/I). Menerima input "KAWIN"/"BELUM KAWIN" atau kode "K/2".
function ptkpStatus(maritalStatus, dependents = 0, spouseIncome = false) {
  const s = String(maritalStatus || '').toUpperCase().trim();
  const married = /(^K\/I)|(KAWIN|MENIKAH|MARRIED)|(^K\/)|(^K$)/.test(s) && !/(BELUM|TIDAK|SINGLE|^TK)/.test(s);
  const d = Math.max(0, Math.min(3, Math.round(Number(dependents) || 0)));
  if (married && (spouseIncome || /^K\/I/.test(s))) return `K/I/${d}`;
  return `${married ? 'K' : 'TK'}/${d}`;
}

// Kategori TER (A/B/C) — PERSIS sesuai TER PPH.pdf.
function terCategory(ptkp) {
  if (['TK/0', 'TK/1'].includes(ptkp)) return 'A';
  if (['TK/2', 'TK/3', 'K/0', 'K/1', 'K/2'].includes(ptkp)) return 'B';
  return 'C'; // K/3, K/I/0..3
}

// Tabel tarif TER bulanan gabungan: [batas bawah bruto, [tarif A%, B%, C%]].
// Baris pertama batas 0. Untuk bruto G, ambil tarif dari baris dengan batas
// bawah tertinggi yang <= G. Persis dari TER PPH.pdf.
const TER_TABLE = [
  [0, [0, 0, 0]], [5400001, [0.25, 0, 0]], [5650001, [0.5, 0, 0]], [5950001, [0.75, 0, 0]],
  [6000001, [0.75, 0.25, 0.25]], [6300001, [1, 0.25, 0.25]], [6750001, [1.25, 0.25, 0.25]],
  [6950001, [1.25, 0.5, 0.5]], [7350001, [1.25, 0.75, 0.75]], [7500001, [1.5, 0.75, 0.75]],
  [7800001, [1.5, 1, 1]], [8550001, [1.75, 1, 1]], [8850001, [1.75, 1.25, 1.25]],
  [9650001, [2, 1.25, 1.25]], [9800001, [2, 1.5, 1.5]], [10050001, [2.25, 1.5, 1.5]],
  [10350001, [2.5, 1.5, 1.5]], [10700001, [3, 1.5, 1.5]], [10950001, [3, 1.75, 1.75]],
  [11050001, [3.5, 1.75, 1.75]], [11200001, [3.5, 2, 2]], [11600001, [4, 2, 2]],
  [12050001, [4, 2.25, 2.25]], [12500001, [5, 2.25, 2.25]], [12950001, [5, 2.5, 2.5]],
  [13750001, [6, 2.5, 2.5]], [14150001, [6, 3, 3]], [15100001, [7, 3, 3]],
  [15550001, [7, 3.5, 3.5]], [16950001, [8, 3.5, 3.5]], [17050001, [8, 4, 4]],
  [19500001, [8, 5, 5]], [19750001, [9, 5, 5]], [22700001, [9, 6, 6]], [24150001, [10, 6, 6]],
  [26000001, [10, 7, 7]], [26450001, [11, 7, 7]], [28000001, [12, 7, 7]], [28100001, [12, 8, 8]],
  [30050001, [13, 8, 8]], [30100001, [13, 9, 9]], [32400001, [14, 9, 9]], [32600001, [14, 10, 10]],
  [35400001, [15, 11, 11]], [38900001, [15, 12, 12]], [39100001, [16, 12, 12]], [43000001, [16, 13, 13]],
  [43850001, [17, 13, 13]], [47400001, [17, 14, 14]], [47800001, [18, 14, 14]], [51200001, [18, 15, 15]],
  [51400001, [19, 15, 15]], [55800001, [19, 16, 16]], [56300001, [20, 16, 16]], [60400001, [20, 17, 17]],
  [62200001, [21, 17, 17]], [66700001, [21, 18, 18]], [68600001, [22, 18, 18]], [74500001, [22, 19, 19]],
  [77500001, [23, 19, 19]], [83200001, [23, 20, 20]], [89900001, [24, 20, 20]], [95000001, [24, 21, 21]],
  [103000001, [25, 21, 21]], [110000001, [25, 22, 22]], [125000001, [26, 22, 22]], [134000001, [26, 24, 24]],
  [157000001, [27, 24, 24]], [206000001, [28, 24, 24]], [221000001, [28, 25, 25]], [337000001, [29, 25, 25]],
  [390000001, [29, 26, 26]], [454000001, [30, 26, 26]], [463000001, [30, 27, 27]], [550000001, [31, 27, 27]],
  [561000001, [31, 28, 28]], [709000001, [31, 29, 29]], [965000001, [31, 30, 30]], [1419000001, [31, 31, 31]],
];

// Tarif TER bulanan (%) dari kategori + penghasilan bruto bulanan.
function terRate(category, monthlyGross) {
  const g = Math.max(0, Number(monthlyGross) || 0);
  const col = { A: 0, B: 1, C: 2 }[category];
  const idx = col == null ? 0 : col;
  let rate = 0;
  for (const [floor, rates] of TER_TABLE) { if (g >= floor) rate = rates[idx]; else break; }
  return rate;
}

// Kalkulasi lengkap otomatis untuk profil pajak karyawan.
function autoTaxProfile({ maritalStatus, dependents = 0, monthlyGross = 0, spouseIncome = false }) {
  const ptkp = ptkpStatus(maritalStatus, dependents, spouseIncome);
  const category = terCategory(ptkp);
  const rate = terRate(category, monthlyGross);
  const gross = Math.max(0, Number(monthlyGross) || 0);
  const monthlyPph21 = Math.round(gross * rate / 100);
  return {
    ptkpStatus: ptkp, ptkpAnnual: PTKP[ptkp] || null, terCategory: category, terRate: rate,
    monthlyGross: gross, monthlyPph21, annualPph21Estimate: monthlyPph21 * 12,
    basis: 'TER PPH.pdf (PPh 21 TER bulanan)',
  };
}

module.exports = { PTKP, ptkpStatus, terCategory, terRate, autoTaxProfile, TER_TABLE };
