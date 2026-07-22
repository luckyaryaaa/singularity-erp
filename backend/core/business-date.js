'use strict';
// Tanggal bisnis tunggal untuk seluruh aplikasi.
//
// Sebelumnya "hari ini" dihitung dengan `new Date().toISOString().slice(0,10)`
// di 16 tempat. Itu tanggal UTC, sedangkan PostgreSQL menjawab `current_date`
// menurut TimeZone servernya. Di WIB (UTC+7) keduanya BERBEDA setiap hari
// antara pukul 00:00–07:00: JS masih menyebut kemarin, database sudah hari ini.
//
// Akibatnya bukan kosmetik. Yang dipilih dengan tanggal itu antara lain kurs
// valuta, tarif pajak, peran akun, price list, dan tanggal Faktur Pajak —
// dokumen yang mengikat secara hukum. Tujuh jam setiap hari, sistem berpotensi
// memakai konfigurasi periode yang salah.
//
// Zona waktu operasional perusahaan, bukan zona waktu server. Server bisa
// berpindah (VPS umumnya UTC); perusahaannya tidak.
const TIMEZONE = process.env.MAT_TIMEZONE || 'Asia/Jakarta';

// en-CA memberi format YYYY-MM-DD, sama persis dengan bentuk DATE PostgreSQL.
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit'
});

// Tanggal bisnis hari ini. Sepadan dengan `current_date` PostgreSQL selama
// sesi database memakai TimeZone yang sama — dijamin oleh SET LOCAL TimeZone
// pada setiap transaksi (lihat infrastructure/database/transaction.js).
function today() {
  return formatter.format(new Date());
}

// Ubah nilai apa pun (Date, ISO string, 'YYYY-MM-DD') menjadi tanggal bisnis.
// Nilai kosong → hari ini; nilai tak terbaca dikembalikan apa adanya supaya
// validasi di lapisan atas yang menolaknya, bukan diam-diam berubah.
function toBusinessDate(value) {
  if (value === null || value === undefined || value === '') return today();
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : formatter.format(parsed);
}

// Periode akuntansi (YYYY-MM) dari tanggal bisnis.
const periodOf = (value) => toBusinessDate(value).slice(0, 7);

// Tanggal bisnis n hari dari sebuah tanggal — dihitung pada tengah hari UTC
// supaya pergeseran zona waktu tidak pernah melompati batas hari.
function addDays(value, days) {
  const base = toBusinessDate(value);
  const at = new Date(`${base}T12:00:00Z`);
  at.setUTCDate(at.getUTCDate() + Number(days || 0));
  return at.toISOString().slice(0, 10);
}

module.exports = { TIMEZONE, today, toBusinessDate, periodOf, addDays };
