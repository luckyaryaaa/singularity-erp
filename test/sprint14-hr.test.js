'use strict';
// Sprint 14 (R021) — shift/roster, kalender kerja, koreksi absensi
// maker-checker, akrual cuti, dan integrasi LEAVE_REQUEST.
// Semua tes ROLLBACK-terisolasi & defensif terhadap data dev.
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');

const enabled = !!process.env.DATABASE_URL;
const dbTest = enabled ? test : test.skip;

const runtime = require('../backend/infrastructure/database/repositories/runtime');
const hr = require('../backend/infrastructure/database/repositories/hr-operations');
const businessOps = require('../backend/infrastructure/database/repositories/business-operations');

async function withRollback(fn) {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try { await c.query('BEGIN'); await c.query("SELECT set_config('app.is_system','on',true),set_config('app.is_platform','on',true),set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true)"); await fn(c); } finally { await c.query('ROLLBACK').catch(() => {}); await c.end(); }
}
const getUser = async (c, role) => runtime.camel((await c.query(`SELECT id,username,display_name "displayName",role,branch_id "branchId",branch_scope "branchScope",employee_id "employeeId" FROM app_users WHERE role=$1 AND active LIMIT 1`, [role])).rows[0]);
const mkEmployee = async (c, name, joinDate, branchId) => (await c.query(`INSERT INTO employees(id,nik,name,department,job_title,base_salary,active,join_date,branch_id)
  SELECT $1,$2,$3,'HRD','Staf',17_300_000,true,$4,b.id FROM branches b WHERE b.active AND b.id=$5 LIMIT 1 RETURNING id`,
  [randomUUID(), `T${Date.now()}${Math.floor(Math.random() * 1000)}`, name, joinDate, branchId])).rows[0];
const period = new Date().toISOString().slice(0, 7);

dbTest('payroll lembur memakai jam shift (parity NORMAL 8j; roster shift lain mengubah lembur)', async () => {
  await withRollback(async (c) => {
    const u = await getUser(c, 'owner');
    const emp = await mkEmployee(c, 'Shift Test', '2024-01-01', u.branchId);
    await c.query(`INSERT INTO attendance_records(id,employee_id,work_date,check_in,check_out,status) VALUES($1,$2,$3::date,$3::date+time '08:00',$3::date+time '18:00','PRESENT')`, [randomUUID(), emp.id, `${period}-10`]);
    await c.query(`UPDATE business_documents SET status='CANCELLED' WHERE document_type='PAYROLL_RUN' AND payload->>'period'=$1 AND status NOT IN ('CANCELLED','VOID')`, [period]);
    const pr1 = await businessOps.createPayroll(c, { period, user: u, title: 'PR parity' });
    const ot1 = Number((await c.query('SELECT overtime FROM payroll_items WHERE payroll_document_id=$1 AND employee_id=$2', [pr1.document.id, emp.id])).rows[0].overtime);
    assert.equal(ot1, 200_000, '10 jam hadir − NORMAL 8 jam = 2 jam × (17,3jt/173)');
    await c.query(`UPDATE business_documents SET status='CANCELLED' WHERE id=$1`, [pr1.document.id]);
    await c.query(`UPDATE work_shifts SET start_time='08:00',end_time='15:00',break_minutes=60 WHERE code='PAGI'`);
    const pagi = (await c.query(`SELECT id FROM work_shifts WHERE code='PAGI'`)).rows[0];
    await hr.assignRoster(c, { assignments: [{ employeeId: emp.id, workDate: `${period}-10`, shiftId: pagi.id }], user: u, requestId: randomUUID() });
    const pr2 = await businessOps.createPayroll(c, { period, user: u, title: 'PR shift' });
    const ot2 = Number((await c.query('SELECT overtime FROM payroll_items WHERE payroll_document_id=$1 AND employee_id=$2', [pr2.document.id, emp.id])).rows[0].overtime);
    assert.equal(ot2, 400_000, 'shift 6 jam efektif → 4 jam lembur — konfigurasi menentukan hasil');
  });
});

dbTest('kalender kerja: akhir pekan & hari libur dilewati saat menghitung hari kerja', async () => {
  await withRollback(async (c) => {
    const u = await getUser(c, 'owner');
    await hr.upsertHoliday(c, { holidayDate: '2026-07-22', name: 'Libur test', user: u, requestId: randomUUID() });
    assert.equal(await hr.countWorkingDays(c, { from: '2026-07-20', to: '2026-07-24' }), 4);
    assert.equal(await hr.countWorkingDays(c, { from: '2026-07-17', to: '2026-07-20' }), 2);
    await assert.rejects(() => hr.countWorkingDays(c, { from: '2026-07-24', to: '2026-07-20' }), (e) => e.code === 'VALIDATION_ERROR');
  });
});

dbTest('koreksi absensi: snapshot lama immutable, SoD pemohon≠pemutus, apply source CORRECTION', async () => {
  await withRollback(async (c) => {
    const hrd = await getUser(c, 'hrd');
    const owner = await getUser(c, 'owner');
    const emp = await mkEmployee(c, 'Koreksi Test', '2024-01-01', hrd.branchId);
    await c.query(`INSERT INTO attendance_records(id,employee_id,work_date,status) VALUES($1,$2,'2026-07-15','ABSENT')`, [randomUUID(), emp.id]);
    const req = await hr.requestCorrection(c, { employeeId: emp.id, workDate: '2026-07-15', proposed: { status: 'PRESENT' }, reason: 'Mesin absen rusak', user: hrd, requestId: randomUUID() });
    assert.equal(req.status, 'PENDING');
    assert.equal(req.oldValue.status, 'ABSENT', 'nilai lama dibekukan');
    await assert.rejects(() => hr.decideCorrection(c, { correctionId: req.id, decision: 'APPROVED', reason: 'x', user: hrd, requestId: randomUUID() }), (e) => e.code === 'SOD_CONFLICT');
    await hr.decideCorrection(c, { correctionId: req.id, decision: 'APPROVED', reason: 'Bukti valid', user: owner, requestId: randomUUID() });
    const att = (await c.query(`SELECT status,source FROM attendance_records WHERE employee_id=$1 AND work_date='2026-07-15'`, [emp.id])).rows[0];
    assert.equal(att.status, 'PRESENT');
    assert.equal(att.source, 'CORRECTION');
    // Satu PENDING per karyawan per tanggal
    await hr.requestCorrection(c, { employeeId: emp.id, workDate: '2026-07-15', proposed: { status: 'SICK' }, reason: 'revisi', user: hrd, requestId: randomUUID() });
    await assert.rejects(() => hr.requestCorrection(c, { employeeId: emp.id, workDate: '2026-07-15', proposed: { status: 'LEAVE' }, reason: 'dobel', user: hrd, requestId: randomUUID() }));
  });
});

dbTest('akrual cuti: bulanan configuration-driven, masa kerja minimum, idempoten', async () => {
  await withRollback(async (c) => {
    const u = await getUser(c, 'owner');
    const vet = await mkEmployee(c, 'Veteran', '2024-01-01', u.branchId);
    const newbie = await mkEmployee(c, 'Baru', new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10), u.branchId);
    const run = await hr.runLeaveAccrual(c, { period, user: u, requestId: randomUUID() });
    assert.equal(run.monthlyDays, 1, '12 hari/tahun ÷ 12');
    assert.equal(Number((await c.query('SELECT entitlement FROM leave_balances WHERE employee_id=$1', [vet.id])).rows[0].entitlement), 13);
    assert.equal(Number((await c.query('SELECT count(*) n FROM leave_accrual_entries WHERE employee_id=$1', [newbie.id])).rows[0].n), 0, 'masa kerja < 12 bulan tidak accrue');
    assert.equal((await hr.runLeaveAccrual(c, { period, user: u, requestId: randomUUID() })).accrued, 0, 'idempoten');
    // Kebijakan configuration-driven: ubah days_per_year → akrual berubah
    await c.query(`UPDATE leave_policies SET days_per_year=24 WHERE code='ANNUAL'`);
    const run2 = await hr.runLeaveAccrual(c, { period: '2026-08', user: u, requestId: randomUUID() });
    assert.equal(run2.monthlyDays, 2, '24/12 — bukti tidak hardcoded');
  });
});

dbTest('LEAVE_REQUEST: durasi = hari kerja kalender, saldo dipotong saat approve, over-saldo diblokir', async () => {
  await withRollback(async (c) => {
    const u = await getUser(c, 'owner');
    const emp = await mkEmployee(c, 'Cuti Test', '2024-01-01', u.branchId);
    const doc = await runtime.createDocument(c, { type: 'LEAVE_REQUEST', user: u, title: 'Cuti', amount: 0, requestId: randomUUID(), payload: { employeeId: emp.id, startDate: '2026-07-20', endDate: '2026-07-24' } });
    const raw = (await c.query('SELECT * FROM business_documents WHERE id=$1', [doc.id])).rows[0];
    const ok = await hr.assertLeaveOk(c, raw);
    assert.equal(ok.days, 5);
    await c.query(`UPDATE business_documents SET status='APPROVED' WHERE id=$1`, [doc.id]);
    const camel = runtime.camel((await c.query('SELECT * FROM business_documents WHERE id=$1', [doc.id])).rows[0]);
    await hr.onLeaveApproved(c, camel, u);
    assert.equal(Number((await c.query('SELECT used FROM leave_balances WHERE employee_id=$1', [emp.id])).rows[0].used), 5);
    const camel2 = runtime.camel((await c.query('SELECT * FROM business_documents WHERE id=$1', [doc.id])).rows[0]);
    assert.equal((await hr.onLeaveApproved(c, camel2, u)).replay, true, 'pemotongan idempoten');
    const doc2 = await runtime.createDocument(c, { type: 'LEAVE_REQUEST', user: u, title: 'Cuti panjang', amount: 0, requestId: randomUUID(), payload: { employeeId: emp.id, startDate: '2026-08-03', endDate: '2026-08-21' } });
    const raw2 = (await c.query('SELECT * FROM business_documents WHERE id=$1', [doc2.id])).rows[0];
    await assert.rejects(() => hr.assertLeaveOk(c, raw2), (e) => /tidak cukup/.test(String(e.detail || e.message)));
    // Tanpa tanggal → ditolak jelas
    const doc3 = await runtime.createDocument(c, { type: 'LEAVE_REQUEST', user: u, title: 'Tanpa tanggal', amount: 0, requestId: randomUUID() });
    const raw3 = (await c.query('SELECT * FROM business_documents WHERE id=$1', [doc3.id])).rows[0];
    await assert.rejects(() => hr.assertLeaveOk(c, raw3), (e) => e.code === 'VALIDATION_ERROR');
  });
});
