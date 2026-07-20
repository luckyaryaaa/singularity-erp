# Endpoint Authorization Matrix

Baseline Sprint 17/R024 mencakup 14 bounded router dan 183 handler HTTP.
Seluruh domain router hanya dipanggil setelah validasi session terpusat di
`backend/api-postgres.js`. Endpoint publik dibatasi oleh allowlist eksplisit.

| Domain router | Handler | Enforcement utama | Negative evidence |
|---|---:|---|---|
| Auth | 13 | public allowlist atau own authenticated session | login, lockout, MFA, session expiry |
| Workspace | 3 | permission + user scope | employee/role denial |
| Documents | 8 | permission dinamis per tipe + branch | cross-branch read/mutation |
| Sales | 6 | permission + repository branch | quotation, dunning, RMA IDOR |
| Procurement | 15 | repository permission/branch + SoD | RFQ, PO, proposal IDOR |
| Operations | 12 | permission + ownership + branch | job, file, artifact isolation |
| Masters | 30 | permission dinamis + repository scope | sensitive bank/employee/master |
| Organization | 8 | scope + Owner PIN + recent MFA | bank maker-checker |
| Inventory | 8 | permission + warehouse branch | lot/opname scope |
| Production | 14 | permission + work-order branch | WO/QC/MRP isolation |
| Finance | 21 | permission + branch + PIN/SoD | asset, ledger, payroll, tax IDOR |
| HR | 15 | permission + branch/own record | roster, correction, payroll scope |
| Reporting | 9 | permission + branch + ownership | filter/schedule/report scope |
| Governance | 21 | permission + SoD/PIN/MFA | IAM, review, audit append-only |

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
