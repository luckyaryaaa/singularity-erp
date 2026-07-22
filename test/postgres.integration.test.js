'use strict';
require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const operations = require('../backend/infrastructure/database/repositories/operations');
const runtime = require('../backend/infrastructure/database/repositories/runtime');
const posting = require('../backend/infrastructure/database/repositories/posting');
const privateStorage = require('../backend/infrastructure/files/private-storage');
const artifactStorage = require('../backend/infrastructure/files/artifact-storage');
const postgresWorker = require('../backend/workers/postgres-worker');
const { hasPermission } = require('../backend/core/permissions');
const postgresAuth = require('../backend/infrastructure/database/repositories/auth');
const businessOps = require('../backend/infrastructure/database/repositories/business-operations');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const enabled = !!process.env.DATABASE_URL;
const pgTest = enabled ? test : test.skip;

pgTest('PostgreSQL integration: app role minimum, localhost, schema, dan CRUD transaction', async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const identity = (await client.query(`SELECT current_user, inet_server_addr()::text AS address,
      (SELECT rolsuper FROM pg_roles WHERE rolname=current_user) AS superuser,
      (SELECT rolcreatedb FROM pg_roles WHERE rolname=current_user) AS createdb,
      (SELECT rolcreaterole FROM pg_roles WHERE rolname=current_user) AS createrole,
      has_schema_privilege(current_user,'public','CREATE') AS can_create_schema`)).rows[0];
    assert.equal(identity.current_user, 'mat_erp_app');
    assert.ok(['127.0.0.1','127.0.0.1/32'].includes(identity.address));
    assert.equal(identity.superuser, false); assert.equal(identity.createdb, false); assert.equal(identity.createrole, false);
    assert.equal(identity.can_create_schema, false);

    const migrations = await client.query('SELECT filename FROM schema_migrations ORDER BY filename');
    const expectedMigrations = require('../backend/infrastructure/database/migrations').migrationFiles();
    assert.deepEqual(migrations.rows.map((r) => r.filename), expectedMigrations, 'seluruh migrasi repo harus diterapkan');
    const tables = await client.query("SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema='public'");
    assert.ok(tables.rows[0].count >= 20);

    await client.query('BEGIN');
    const inserted = await client.query("INSERT INTO branches(code,name,active) VALUES($1,$2,true) RETURNING code", [`IT-${Date.now()}`, 'Integration Test']);
    assert.equal(inserted.rowCount, 1);
    await client.query('ROLLBACK');

    await assert.rejects(() => client.query('CREATE TABLE should_be_denied(id int)'), /permission denied/i);
  } finally { await client.end(); }
});

pgTest('PostgreSQL integration: notification persistence dan job claim tidak tumpang tindih', async () => {
  const first = new Client({ connectionString: process.env.DATABASE_URL });
  const second = new Client({ connectionString: process.env.DATABASE_URL });
  await Promise.all([first.connect(), second.connect()]);
  const user = (await first.query("SELECT id, 'owner' AS role FROM app_users WHERE active=true ORDER BY created_at LIMIT 1")).rows[0];
  assert.ok(user, 'Development seed harus menyediakan minimal satu user aktif.');
  const marker = `integration-${Date.now()}`;
  const jobIds = [];
  try {
    const notification = await operations.notify(first, { userId:user.id, category:'INFORMATION', title:'Integration test', dedupeKey:marker });
    const duplicate = await operations.notify(first, { userId:user.id, category:'INFORMATION', title:'Duplicate', dedupeKey:marker });
    assert.ok(notification.id); assert.equal(duplicate, null);
    const before = await operations.unreadCount(second, user);
    assert.ok(before.unread >= 1, 'notifikasi baru wajib terhitung belum dibaca');
    assert.ok(Number.isInteger(before.actionRequired), 'hitungan "menuntut tindakan" terpisah dari sekadar belum dibaca');
    assert.equal(await operations.markRead(second, user, notification.id), true);
    // Status baca kini per pengguna: tanda baca tersimpan sebagai receipt.
    const receipts = Number((await second.query('SELECT count(*) n FROM notification_receipts WHERE notification_id=$1 AND user_id=$2', [notification.id, user.id])).rows[0].n);
    assert.equal(receipts, 1);
    assert.equal((await operations.unreadCount(second, user)).unread, before.unread - 1);

    jobIds.push((await operations.enqueue(first, { type:'REPORT_GENERATE', user, params:{ marker, sequence:1 } })).id);
    jobIds.push((await operations.enqueue(first, { type:'REPORT_GENERATE', user, params:{ marker, sequence:2 } })).id);
    await Promise.all([first.query('BEGIN'), second.query('BEGIN')]);
    const [claimedFirst, claimedSecond] = await Promise.all([
      operations.claim(first, `${marker}-worker-a`), operations.claim(second, `${marker}-worker-b`)
    ]);
    assert.ok(claimedFirst.id); assert.ok(claimedSecond.id);
    assert.notEqual(claimedFirst.id, claimedSecond.id);
    await Promise.all([first.query('COMMIT'), second.query('COMMIT')]);
    await operations.startRunning(first, claimedFirst.id, `${marker}-worker-a`);
    await operations.startRunning(second, claimedSecond.id, `${marker}-worker-b`);
    await operations.complete(first, claimedFirst.id, `${marker}-worker-a`, { ok:true });
    await operations.complete(second, claimedSecond.id, `${marker}-worker-b`, { ok:true });
    const persisted = await second.query('SELECT status FROM background_jobs WHERE id=ANY($1::uuid[])', [jobIds]);
    assert.equal(persisted.rowCount, 2);
    assert.ok(persisted.rows.every((row) => row.status === 'SUCCEEDED'));
  } finally {
    await first.query('DELETE FROM notifications WHERE dedupe_key=$1', [marker]).catch(() => {});
    if (jobIds.length) await first.query('DELETE FROM background_jobs WHERE id=ANY($1::uuid[])', [jobIds]).catch(() => {});
    await Promise.all([first.end(), second.end()]);
  }
});

pgTest('PostgreSQL integration: retry email idempotent mempertahankan delivery attempts', async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const previousHost = process.env.MAT_SMTP_HOST;
  try {
    await client.query('BEGIN');
    const user = (await client.query(`SELECT id,role,branch_id "branchId",branch_scope "branchScope" FROM app_users WHERE role='owner' AND active LIMIT 1`)).rows[0];
    process.env.MAT_SMTP_HOST = 'smtp.example.invalid';
    const job = await operations.enqueue(client, { type: 'NOTIFICATION_SEND', user, params: { title: 'Retry integration', email: 'alamat-tidak-valid', dedupeKey: `retry-${Date.now()}` } });
    const first = await postgresWorker.execute(client, job);
    const second = await postgresWorker.execute(client, job);
    assert.match(first.retryableError, /email gagal/i);
    assert.match(second.retryableError, /email gagal/i);
    assert.equal(first.notificationId, second.notificationId);
    const deliveries = (await client.query(`SELECT channel,status,attempts FROM notification_deliveries WHERE notification_id=$1 ORDER BY channel`, [first.notificationId])).rows;
    assert.deepEqual(deliveries, [
      { channel: 'EMAIL', status: 'FAILED', attempts: 2 },
      { channel: 'IN_APP', status: 'SENT', attempts: 1 }
    ]);
    await client.query('ROLLBACK');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    if (previousHost === undefined) delete process.env.MAT_SMTP_HOST; else process.env.MAT_SMTP_HOST = previousHost;
    await client.end();
  }
});

pgTest('PostgreSQL integration: document lines, inventory ledger, dan jurnal double-entry atomic', async()=>{
  const client=new Client({connectionString:process.env.DATABASE_URL}),admin=new Client({connectionString:process.env.MIGRATION_DATABASE_URL});await Promise.all([client.connect(),admin.connect()]);const ids={docs:[]};
  try{const user=(await client.query(`SELECT u.id,u.username,u.display_name "displayName",u.role,u.branch_id "branchId",u.branch_scope "branchScope" FROM app_users u WHERE role='owner' AND active LIMIT 1`)).rows[0],productId=randomUUID();ids.productId=productId;await client.query(`INSERT INTO products(id,code,name,uom,hpp,price) VALUES($1,$2,'Ledger Test Product','PCS',25000,40000)`,[productId,`LED-${Date.now()}`]);
    let receipt=await runtime.createDocument(client,{type:'GOODS_RECEIPT',user,title:'Ledger receipt',amount:125000,payload:{lines:[{productId,name:'Ledger Test Product',uom:'PCS',qty:5,price:25000}]},requestId:randomUUID()});ids.docs.push(receipt.id);for(const action of ['submit','approve','start','complete'])receipt=await runtime.transitionDocument(client,{id:receipt.id,action,user,requestId:randomUUID(),allowOwnerOverride:true});await posting.postDocument(client,receipt,user);await posting.postDocument(client,receipt,user);const stock=(await client.query('SELECT qty_on_hand FROM inventory_balances WHERE product_id=$1 AND warehouse_id=$2',[productId,user.branchId])).rows[0];assert.equal(Number(stock.qty_on_hand),5);assert.equal(Number((await client.query('SELECT count(*) n FROM inventory_movements WHERE document_id=$1',[receipt.id])).rows[0].n),1);
    let invoice=await runtime.createDocument(client,{type:'INVOICE',user,title:'Ledger invoice',amount:1000000,payload:{lines:[{description:'Service',qty:1,price:1000000}]},requestId:randomUUID()});ids.docs.push(invoice.id);for(const action of ['submit','approve'])invoice=await runtime.transitionDocument(client,{id:invoice.id,action,user,requestId:randomUUID(),allowOwnerOverride:true});await posting.postDocument(client,invoice,user);await posting.postDocument(client,invoice,user);const journal=(await client.query('SELECT count(*)::int lines,sum(debit)::float debit,sum(credit)::float credit FROM journal_lines WHERE journal_document_id=$1',[invoice.id])).rows[0];assert.equal(journal.lines,2);assert.equal(journal.debit,1000000);assert.equal(journal.credit,1000000);assert.equal(Number((await client.query('SELECT count(*) n FROM document_postings WHERE document_id=$1 AND posting_kind=$2',[invoice.id,'ACCOUNTING'])).rows[0].n),1);
  }finally{for(const id of ids.docs){await admin.query('DELETE FROM journal_lines WHERE journal_document_id=$1',[id]).catch(()=>{});await admin.query('DELETE FROM inventory_movements WHERE document_id=$1',[id]).catch(()=>{});
    // Sprint 11: GR kini melahirkan stock_lots (FK RESTRICT) — bersihkan lot sebelum dokumen.
    await admin.query('DELETE FROM stock_lot_movements WHERE lot_id IN (SELECT id FROM stock_lots WHERE source_document_id=$1) OR document_id=$1',[id]).catch(()=>{});
    await admin.query('DELETE FROM stock_opname_lines WHERE lot_id IN (SELECT id FROM stock_lots WHERE source_document_id=$1) OR document_id=$1',[id]).catch(()=>{});
    await admin.query('DELETE FROM stock_lots WHERE source_document_id=$1',[id]).catch(()=>{});
    await admin.query('DELETE FROM document_postings WHERE document_id=$1',[id]).catch(()=>{});await admin.query('DELETE FROM document_lines WHERE document_id=$1',[id]).catch(()=>{});await admin.query('DELETE FROM audit_logs WHERE entity_id=$1',[id]).catch(()=>{});await admin.query("DELETE FROM domain_event_outbox WHERE payload->>'entityId'=(SELECT document_number FROM business_documents WHERE id=$1)",[id]).catch(()=>{});await admin.query('DELETE FROM business_documents WHERE id=$1',[id]).catch(()=>{});}if(ids.productId){await admin.query('DELETE FROM stock_lots WHERE product_id=$1',[ids.productId]).catch(()=>{});await admin.query('DELETE FROM inventory_balances WHERE product_id=$1',[ids.productId]).catch(()=>{});await admin.query('DELETE FROM products WHERE id=$1',[ids.productId]).catch(()=>{});}await Promise.all([client.end(),admin.end()]);}
});

pgTest('PostgreSQL Sprint 3: conversion, master CRUD, private file, artifact, dan matriks role',async()=>{
  const client=new Client({connectionString:process.env.DATABASE_URL});await client.connect();const files=[];
  try{await client.query('BEGIN');const user=(await client.query(`SELECT id,username,display_name "displayName",role,branch_id "branchId",branch_scope "branchScope" FROM app_users WHERE role='owner' AND active LIMIT 1`)).rows[0];assert.ok(user);
    const customer=await operations.createMaster(client,'customers',{code:`S3-${Date.now()}`,name:'Sprint 3 Customer',city:'Bekasi'},user);assert.equal(customer.name,'Sprint 3 Customer');const changed=await operations.updateMaster(client,'customers',customer.id,{city:'Jakarta'},user);assert.equal(changed.city,'Jakarta');
    let source=await runtime.createDocument(client,{type:'QUOTATION',user,title:'Sprint 3 Conversion',amount:1000000,payload:{lines:[{description:'Service',qty:1,price:1000000}]},requestId:randomUUID()});source=await runtime.transitionDocument(client,{id:source.id,action:'submit',user,requestId:randomUUID(),allowOwnerOverride:true});source=await runtime.transitionDocument(client,{id:source.id,action:'approve',user,requestId:randomUUID(),allowOwnerOverride:true});const first=await runtime.convertDocument(client,{id:source.id,user,requestId:randomUUID()}),replay=await runtime.convertDocument(client,{id:source.id,user,requestId:randomUUID()});assert.equal(first.child.documentType,'SALES_ORDER');assert.equal(replay.child.id,first.child.id);assert.equal(replay.alreadyConverted,true);assert.equal((await runtime.documentRelations(client,source.id)).length,1);
    const uploaded=await privateStorage.upload(client,{buffer:Buffer.from('%PDF-1.4\n%%EOF'),filename:'sprint-3.pdf',mimeType:'application/pdf',user,module:'quotation',documentId:source.id});files.push(path.join(privateStorage.ROOT,uploaded.storagePath));assert.equal(uploaded.scanStatus,'QUARANTINED');const scanned=await privateStorage.scan(client,uploaded.id);assert.equal(scanned.scanStatus,'CLEAN');const downloaded=await privateStorage.download(client,uploaded.id);assert.equal(downloaded.buffer.toString(),'%PDF-1.4\n%%EOF');
    const job=await operations.enqueue(client,{type:'GENERATE_PDF',user,params:{title:'Sprint 3',rows:[{status:'PASS'}]}}),result=await postgresWorker.execute(client,job),artifact=(await client.query('SELECT * FROM generated_artifacts WHERE id=$1',[result.artifactId])).rows[0];files.push(path.join(artifactStorage.ROOT,artifact.storage_path));assert.ok((await artifactStorage.download(client,artifact.id,user)).buffer.subarray(0,5).toString()==='%PDF-');
    const roleUsers=[['admin','system_admin'],['finance','finance_manager'],['accounting','accounting'],['tax','tax'],['hrd','hrd'],['sales','sales'],['procurement','procurement'],['warehouse','warehouse'],['production','production'],['employee','employee']],expectedRoles=roleUsers.map(x=>x[1]),roles=(await client.query(`SELECT DISTINCT role FROM app_users WHERE role=ANY($1::text[])`,[expectedRoles])).rows.map(row=>row.role);assert.deepEqual(new Set(roles),new Set(expectedRoles));for(const [username] of roleUsers){const login=await postgresAuth.login(client,{username,password:process.env.MAT_UAT_DEFAULT_PASSWORD,ip:'127.0.0.1',device:'Sprint 3 UAT test'});assert.equal(login.passwordChangeRequired,true);assert.ok(login.changeToken);}assert.equal(hasPermission({role:'employee'},'audit.view'),false);assert.equal(hasPermission({role:'warehouse'},'inventory.edit'),true);assert.equal(hasPermission({role:'accounting'},'journal.post'),true);assert.equal(hasPermission({role:'sales'},'quotation.create'),true);
    await client.query('ROLLBACK');
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{for(const file of files)await fs.unlink(file).catch(()=>{});await client.end();}
});

pgTest('PostgreSQL Sprint 4: accounting, allocation, attendance, payroll, tax, import, reconciliation, dan employee self-service',async()=>{
  const client=new Client({connectionString:process.env.DATABASE_URL});await client.connect();
  try{
    await client.query('BEGIN');
    const owner=(await client.query(`SELECT id,username,display_name "displayName",role,branch_id "branchId",branch_scope "branchScope",employee_id "employeeId" FROM app_users WHERE role='owner' AND active LIMIT 1`)).rows[0];
    const employee=(await client.query(`SELECT id,username,display_name "displayName",role,branch_id "branchId",branch_scope "branchScope",employee_id "employeeId" FROM app_users WHERE role='employee' AND active AND employee_id IS NOT NULL LIMIT 1`)).rows[0];
    assert.ok(owner);assert.ok(employee?.employeeId);
    const current=new Date().toISOString().slice(0,7);
    // Fixture mandiri (rollback-terisolasi): tes tidak lagi bergantung pada
    // data absensi hasil seed — cukup satu catatan miliknya sendiri + satu
    // milik karyawan lain untuk membuktikan isolasi self-service.
    await businessOps.upsertAttendance(client,{employeeId:employee.employeeId,workDate:`${current}-05`,status:'PRESENT',user:owner});
    const otherEmployee=(await client.query('SELECT id FROM employees WHERE active AND id<>$1 LIMIT 1',[employee.employeeId])).rows[0];
    if(otherEmployee)await businessOps.upsertAttendance(client,{employeeId:otherEmployee.id,workDate:`${current}-05`,status:'PRESENT',user:owner});
    const ownAttendance=await businessOps.attendance(client,{period:current,user:employee,limit:250});
    assert.ok(ownAttendance.items.length>0);assert.ok(ownAttendance.items.every(row=>row.employeeId===employee.employeeId));
    const ownLeave=await businessOps.leaveBalances(client,{year:Number(current.slice(0,4)),user:employee});assert.equal(ownLeave.length,1);assert.equal(ownLeave[0].employeeId,employee.employeeId);

    const payrollPeriod='2099-11',calculated=await businessOps.createPayroll(client,{period:payrollPeriod,user:owner,title:'Sprint 4 Payroll Integration'});assert.ok(calculated.headcount>0);assert.ok(calculated.total>0);
    let payroll=calculated.document;payroll=await runtime.transitionDocument(client,{id:payroll.id,action:'submit',user:owner,requestId:randomUUID(),allowOwnerOverride:true});while(payroll.status==='WAITING_APPROVAL')payroll=await runtime.transitionDocument(client,{id:payroll.id,action:'approve',user:owner,requestId:randomUUID(),allowOwnerOverride:true});assert.equal(payroll.status,'APPROVED');
    await posting.postDocument(client,payroll,owner);await businessOps.syncTaxes(client,payrollPeriod,owner);
    const journal=(await client.query('SELECT sum(debit)::float debit,sum(credit)::float credit FROM journal_lines WHERE journal_document_id=$1',[payroll.id])).rows[0];assert.equal(journal.debit,journal.credit);assert.ok(journal.debit>0);
    const summary=await businessOps.accountingSummary(client,payrollPeriod,owner);assert.equal(summary.debitTotal,summary.creditTotal);assert.ok(summary.profitLoss.opex>0);
    const taxes=await businessOps.taxSummary(client,payrollPeriod,owner);assert.ok(taxes.documents.some(row=>row.taxType==='PPH21'));
    const selfPayroll=await businessOps.payrollSelf(client,employee);assert.ok(selfPayroll.some(row=>row.payrollDocumentId===payroll.id));
    // P0-E: closing WAJIB melewati seluruh checklist cockpit. Checklist WARN
    // menolak penutupan tanpa waiver tertulis; dengan waiver, bukti checklist
    // ikut tersimpan pada hasil closing.
    await assert.rejects(()=>businessOps.closePeriod(client,{period:payrollPeriod,user:owner}),error=>error.code==='REASON_REQUIRED','WARN checklist wajib waiver');
    const closed=await businessOps.closePeriod(client,{period:payrollPeriod,user:owner,waiveWarnings:'Integration test: WARN ditinjau dan diterima'});assert.equal(closed.status,'CLOSED');
    assert.ok(closed.closingEvidence&&Array.isArray(closed.closingEvidence.checks)&&closed.closingEvidence.checks.length,'bukti checklist closing wajib tersimpan');
    assert.equal(closed.closingEvidence.waiver.by,owner.id,'waiver mencatat siapa yang menyetujui');
    const reopened=await businessOps.reopenPeriod(client,{period:payrollPeriod,user:owner,reason:'Integration test'});assert.equal(reopened.status,'OPEN');

    const invoice=await runtime.createDocument(client,{type:'INVOICE',user:owner,title:'Allocation invoice',amount:500000,requestId:randomUUID()}),payment=await runtime.createDocument(client,{type:'CUSTOMER_PAYMENT',user:owner,title:'Allocation payment',amount:500000,requestId:randomUUID()});await client.query(`UPDATE business_documents SET status='APPROVED' WHERE id=ANY($1::uuid[])`,[[invoice.id,payment.id]]);const allocated=await businessOps.allocatePayment(client,{paymentId:payment.id,invoiceId:invoice.id,amount:500000,user:owner});assert.equal(allocated.invoiceStatus,'CLOSED');assert.equal(allocated.remaining,0);

    const target=(await client.query('SELECT id,nik FROM employees WHERE active ORDER BY nik LIMIT 1')).rows[0],job=await operations.enqueue(client,{type:'IMPORT_CSV',user:owner,params:{module:'attendance',fileName:'sprint4.csv',csvText:`nik,work_date,status,notes\n${target.nik},2099-11-03,PRESENT,Integration import`}}),imported=await postgresWorker.execute(client,job);assert.equal(imported.successRows,1);assert.equal(imported.errorRows,0);
    await client.query(`INSERT INTO bank_transactions(branch_id,transaction_date,reference,description,direction,amount,imported_by) VALUES($1,'2099-11-04',$2,'Integration reconciliation','D',12345,$3)`,[owner.branchId,`S4-${Date.now()}`,owner.id]);const reconciled=await businessOps.reconcile(client,{period:payrollPeriod,user:owner});assert.equal(reconciled.status,'COMPLETED');assert.equal(typeof Number(reconciled.difference),'number');
    await client.query('ROLLBACK');
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{await client.end();}
});
