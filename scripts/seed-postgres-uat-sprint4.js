'use strict';
const env=require('../backend/core/env');env.loadEnv();env.assertSeedAllowed('uat');
require('./uat-database-guard').assertDedicatedUatDatabase();
const {Client}=require('pg');
const operations=require('../backend/infrastructure/database/repositories/operations');

(async()=>{
  const client=new Client({connectionString:process.env.DATABASE_URL});
  await client.connect();
  try{
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.is_system','on',true)");
    const owner=(await client.query(`SELECT id,branch_id "branchId" FROM app_users WHERE role='owner' AND active ORDER BY created_at LIMIT 1`)).rows[0];
    if(!owner)throw new Error('Owner aktif tidak ditemukan.');
    const employees=(await client.query('SELECT id,nik,base_salary FROM employees WHERE active ORDER BY nik')).rows;
    const month=new Date().toISOString().slice(0,7);
    const days=[3,4,5,6,7];
    for(const employee of employees){
      await client.query(`INSERT INTO leave_balances(employee_id,year,entitlement,used,updated_by) VALUES($1,$2,12,$3,$4) ON CONFLICT(employee_id,year) DO UPDATE SET entitlement=excluded.entitlement,used=excluded.used,updated_at=now(),updated_by=excluded.updated_by`,[employee.id,Number(month.slice(0,4)),employee.nik.endsWith('010')?2:1,owner.id]);
      await client.query(`INSERT INTO payroll_components(employee_id,code,name,kind,amount) VALUES($1,'MEAL','Tunjangan makan','ALLOWANCE',$2) ON CONFLICT(employee_id,code) DO UPDATE SET amount=excluded.amount,active=true,updated_at=now()`,[employee.id,500000]);
      for(const day of days){
        const date=`${month}-${String(day).padStart(2,'0')}`,late=employee.nik.endsWith('003')&&day===4,absent=employee.nik.endsWith('006')&&day===5;
        await client.query(`INSERT INTO attendance_records(employee_id,work_date,check_in,check_out,status,source,notes,created_by) VALUES($1,$2,$3,$4,$5,'UAT',$6,$7) ON CONFLICT(employee_id,work_date) DO UPDATE SET check_in=excluded.check_in,check_out=excluded.check_out,status=excluded.status,source=excluded.source,notes=excluded.notes,updated_at=now()`,[employee.id,date,absent?null:`${date}T${late?'08:18':'07:55'}:00+07:00`,absent?null:`${date}T17:05:00+07:00`,absent?'ABSENT':late?'LATE':'PRESENT',absent?'Skenario absen Sprint 4':late?'Skenario terlambat Sprint 4':null,owner.id]);
      }
    }
    await client.query(`INSERT INTO bank_transactions(branch_id,transaction_date,reference,description,direction,amount,imported_by) VALUES($1,$2,'UAT-S4-BANK-001','Saldo pengujian rekonsiliasi Sprint 4','D',25000000,$3) ON CONFLICT(branch_id,reference,direction) DO UPDATE SET transaction_date=excluded.transaction_date,amount=excluded.amount,description=excluded.description`,[owner.branchId,`${month}-05`,owner.id]);
    await operations.notify(client,{userId:owner.id,category:'SUCCESS',title:'Data UAT Sprint 4 siap',body:'Kehadiran, saldo cuti, komponen payroll, dan mutasi bank sudah tersedia.',link:'#/hr/attendance',dedupeKey:`sprint4-uat:${month}`});
    await client.query('COMMIT');
    console.log(JSON.stringify({seeded:true,suite:'SPRINT4_UAT',period:month,employees:employees.length,attendanceRows:employees.length*days.length}));
  }catch(error){await client.query('ROLLBACK');throw error;}finally{await client.end();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
