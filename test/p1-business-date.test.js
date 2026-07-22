'use strict';
// P1 — tanggal bisnis tunggal. Sebelumnya "hari ini" dihitung sebagai tanggal
// UTC di 16 tempat, sementara PostgreSQL menjawab current_date menurut TimeZone
// servernya. Di WIB keduanya berbeda setiap hari pukul 00:00–07:00.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const businessDate = require('../backend/core/business-date');
const { withTransaction } = require('../backend/infrastructure/database/transaction');

const dbTest = process.env.DATABASE_URL ? test : test.skip;
test.after(async () => { await require('../backend/infrastructure/database/pool').close(); });

test('P1: tanggal bisnis memakai zona perusahaan, bukan UTC', () => {
  assert.match(businessDate.today(), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(businessDate.TIMEZONE, process.env.MAT_TIMEZONE || 'Asia/Jakarta');

  // Inti bug: pukul 01:00 WIB tanggal 22 masih 18:00 UTC tanggal 21.
  const earlyMorningWib = new Date('2026-07-21T18:00:00Z');
  assert.equal(earlyMorningWib.toISOString().slice(0, 10), '2026-07-21', 'UTC menyebut kemarin');
  assert.equal(businessDate.toBusinessDate(earlyMorningWib), '2026-07-22', 'tanggal bisnis wajib menyebut hari ini');

  // Sebelum tengah malam WIB, keduanya sepakat.
  assert.equal(businessDate.toBusinessDate(new Date('2026-07-21T16:59:00Z')), '2026-07-21');
});

test('P1: konversi dan aritmetika tanggal tidak melompati batas hari', () => {
  assert.equal(businessDate.toBusinessDate('2026-03-15'), '2026-03-15', 'YYYY-MM-DD dilewatkan apa adanya');
  assert.equal(businessDate.periodOf('2026-03-15'), '2026-03');
  assert.equal(businessDate.addDays('2026-02-28', 1), '2026-03-01');
  assert.equal(businessDate.addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(businessDate.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(businessDate.periodOf(businessDate.today()).length, 7);

  // Nilai kosong → hari ini; nilai tak terbaca dikembalikan apa adanya supaya
  // validasi lapisan atas yang menolaknya, bukan diam-diam berubah.
  assert.equal(businessDate.toBusinessDate(''), businessDate.today());
  assert.equal(businessDate.toBusinessDate(null), businessDate.today());
  assert.equal(businessDate.toBusinessDate('bukan-tanggal'), 'bukan-tanggal');
});

dbTest('P1: tanggal bisnis aplikasi sama dengan current_date database', async () => {
  // Inilah yang benar-benar penting: kurs, tarif pajak, peran akun, dan tanggal
  // Faktur Pajak dipilih dengan salah satu dari keduanya.
  const row = await withTransaction(async (c) =>
    (await c.query(`SELECT current_date::text today, current_setting('TimeZone') tz`)).rows[0]);
  assert.equal(row.tz, businessDate.TIMEZONE, 'sesi database wajib memakai zona waktu bisnis');
  assert.equal(row.today, businessDate.today(), 'tanggal aplikasi dan database wajib sama');
});

dbTest('P1: zona waktu sesi tidak bergantung pada konfigurasi server', async () => {
  // Di VPS, PostgreSQL umumnya UTC. Transaksi tetap wajib memakai zona bisnis,
  // apa pun default servernya — disimulasikan dengan koneksi mentah tanpa
  // withTransaction sebagai pembanding.
  const raw = new Client({ connectionString: process.env.DATABASE_URL });
  await raw.connect();
  try {
    await raw.query("SET TimeZone='UTC'");
    const serverUtc = (await raw.query("SELECT current_setting('TimeZone') tz")).rows[0].tz;
    assert.equal(serverUtc, 'UTC', 'pembanding: sesi mentah mengikuti apa pun yang disetel');

    const scoped = await withTransaction(async (c) =>
      (await c.query("SELECT current_setting('TimeZone') tz")).rows[0].tz);
    assert.equal(scoped, businessDate.TIMEZONE, 'withTransaction wajib memaksa zona bisnis');
  } finally { await raw.end(); }
});

dbTest('P1: tidak ada lagi perhitungan hari ini berbasis UTC di kode produksi', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith('.js')) continue;
      if (full.includes('business-date.js')) continue;      // dokumentasi pola lama di komentarnya
      const text = fs.readFileSync(full, 'utf8');
      if (/new Date\(\)\.toISOString\(\)\.slice\(0, ?10\)/.test(text)) offenders.push(full);
    }
  };
  walk('backend');
  assert.deepEqual(offenders, [], `masih memakai tanggal UTC: ${offenders.join(', ')}`);
});
