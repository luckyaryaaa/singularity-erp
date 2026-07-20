# SOP-15 — HR, Attendance, Leave & Payroll

## Tujuan

Memproses data karyawan sensitif dan payroll secara configuration-driven,
maker-checker, branch-scoped, serta dapat direkonsiliasi.

## Pemilik dan frekuensi

HR Manager sebagai maker dan Finance Manager sebagai checker; per periode payroll.

## Prosedur

1. Review employee active, compensation/bank approval, shift roster, holiday,
   attendance correction, leave accrual, dan saldo cuti.
2. Generate payroll sekali per branch/period dengan rule effective-dated.
3. Review base, allowance, overtime, deduction, BPJS, PPh21, dan net pay.
4. Submit/approve sesuai policy; posting memakai snapshot rule dan posting profile.
5. Distribusikan slip privat dan jalankan payroll-to-GL reconciliation.

## Evidence

Period, employee count, attendance/correction IDs, rule/version snapshot, payroll
items total, approval, journal, tax/BPJS totals, serta slip artifact ownership.

## Eskalasi dan rollback

Duplicate period, unapproved bank/compensation, missing rule, mismatch item-total,
atau cross-branch access memblokir payroll. Koreksi melalui adjustment/reversal
periode berikut sesuai approval; jangan menghapus item posted.
