'use strict';
// Cut-over SEKALI PAKAI (Sprint 18 prep / SOP-10 & SOP-11): jurnal saldo awal
// persediaan agar GL 1300 selaras dengan subledger stok — menutup WARNING
// "Inventory reconciliation" pada final assurance sebelum LAN-UAT/go-live.
// Idempoten: dijalankan ulang hanya melaporkan dokumen opening yang sudah ada.
// Jalankan: npm run cutover:opening-inventory
require('../backend/core/env').loadEnv();
const { Client } = require('pg');
const financeReports = require('../backend/infrastructure/database/repositories/finance-reports');
const runtime = require('../backend/infrastructure/database/repositories/runtime');
const { randomUUID } = require('node:crypto');

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    const owner = runtime.camel((await client.query(`SELECT id,username,display_name "displayName",role,branch_id "branchId",branch_scope "branchScope"
      FROM app_users WHERE role='owner' AND active ORDER BY created_at LIMIT 1`)).rows[0]);
    if (!owner) throw new Error('Akun Owner aktif tidak ditemukan.');
    const result = await financeReports.postInventoryOpeningBalance(client, { user: owner, requestId: randomUUID() });
    await client.query('COMMIT');
    if (result.replay) {
      console.log(`Sudah pernah dijalankan: ${result.documentNumber} (${new Date(result.postedAt).toISOString().slice(0, 10)}) — tidak ada perubahan.`);
    } else if (!result.documentNumber) {
      console.log(result.message);
    } else {
      console.log(`Jurnal saldo awal dibuat: ${result.documentNumber}`);
      console.log(`  Subledger stok : Rp ${result.subledger.toLocaleString('id-ID')}`);
      console.log(`  GL 1300 sebelum: Rp ${result.glBefore.toLocaleString('id-ID')}`);
      console.log(`  Selisih dibuku : Rp ${result.difference.toLocaleString('id-ID')} (lawan 3900 ekuitas saldo awal)`);
      console.log(`  GL 1300 sesudah: Rp ${result.glAfter.toLocaleString('id-ID')} — selaras.`);
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('GAGAL:', error.detail || error.message);
    process.exitCode = 1;
  } finally { await client.end(); }
})();
