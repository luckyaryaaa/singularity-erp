# Endpoint Authorization Matrix

Baseline v0.36.0 mencakup 14 bounded router dan 282 handler HTTP.
Seluruh domain router hanya dipanggil setelah validasi session terpusat di
`backend/api-postgres.js`. Endpoint publik dibatasi oleh allowlist eksplisit.

| Domain router | Handler | Enforcement utama | Negative evidence |
|---|---:|---|---|
| Auth | 15 | public allowlist atau own authenticated session | login, lockout, MFA, recovery code sekali pakai, session expiry |
| Workspace | 3 | permission + user scope | employee/role denial |
| Documents | 9 | permission dinamis per tipe + branch | cross-branch read/mutation |
| Sales | 23 | permission + repository branch | quotation, commercial control, dunning, RMA IDOR |
| Procurement | 20 | permission + RLS + branch + SoD + version + idempotency | RFQ, kontrak/release replay, PO, proposal IDOR |
| Operations | 12 | permission + ownership + branch | job, file, artifact isolation |
| Masters | 47 | permission dinamis + repository scope | sensitive bank/employee/master |
| Organization | 30 | scope + Owner PIN + recent MFA | bank, hierarchy, workforce maker-checker |
| Inventory | 14 | permission + RLS + warehouse branch + version + idempotency | lot, bin, reservation release, opname scope |
| Production | 24 | permission + RLS + work-order branch + version + idempotency | WO, capacity/WIP, QC/CAPA/calibration, MRP isolation |
| Finance | 31 | permission + branch + PIN/SoD | asset, ledger, payroll, GL↔tax reconciliation, tax IDOR |
| HR | 15 | permission + branch/own record | roster, correction, payroll scope |
| Reporting | 9 | permission + branch + ownership | filter/schedule/report scope |
| Governance | 30 | permission + SoD/PIN/MFA | IAM, review, reset privileged maker-checker, audit append-only |

## Gate otomatis

`test/authorization-matrix.test.js` memblokir rilis bila:

- router baru tidak terdaftar;
- jumlah handler berubah tanpa pembaruan matriks;
- direct permission guard turun dari baseline;
- evidence test domain hilang;
- permission tidak memiliki jalur allow dan deny;
- public allowlist melebar tanpa kontrak OpenAPI; atau
- session guard tidak lagi mendahului domain dispatcher.

Matriks ini melengkapi—bukan menggantikan—negative PostgreSQL/HTTP tests untuk
cross-branch IDOR, ownership, SoD, PIN Owner, MFA, dan least privilege.
