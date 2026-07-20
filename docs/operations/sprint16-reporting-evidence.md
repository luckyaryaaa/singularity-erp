# Sprint 16 Reporting & Executive Cockpit — Release Evidence

Release: `v0.23.0`  
Tanggal verifikasi: 20 Juli 2026  
Stage yang diverifikasi: `LOCAL-DEVELOPMENT`

## Cakupan yang selesai

- Semantic monthly KPI PostgreSQL dan freshness history.
- Executive Cockpit desktop/mobile dengan filter periode dan cabang.
- Revenue/margin GL, cash, working capital, order book, AR aging, document
  funnel, actual project margin, quality/delivery, dan action queue.
- Saved view privat serta report scheduler harian/mingguan/bulanan yang
  idempoten dan memakai optimistic locking.
- Delapan report factory PDF/XLSX, export scope validation, artifact checksum,
  dan audit download.

## Data lineage utama

| KPI | Source of truth | Rekonsiliasi |
|---|---|---|
| Pendapatan | `journal_entries` + `journal_lines` akun kelas 4 | materialized monthly GL |
| Margin kotor | pendapatan GL dikurangi akun HPP kelas 5 | monthly GL + trend |
| Kas & bank | saldo akun `1100` | journal ledger |
| Piutang/utang | invoice dan payment allocation | AR/AP subledger |
| Persediaan | inventory ledger dan saldo stok | nilai stok berjalan |
| Order book | sales order/project yang belum selesai | dokumen operasional |
| Margin proyek | nilai proyek dikurangi actual WO production costing | production costing |
| Kualitas/delivery | QC inspection/NCR dan delivery documents | quality/operations |

Setiap response cockpit membawa periode, scope, waktu materialized/refresh,
serta definisi KPI agar angka tidak menjadi metrik tanpa provenance.

## Evidence otomatis

| Gate | Hasil |
|---|---|
| Regression | 128/128 PASS |
| Authorization/IDOR | 11/11 PASS |
| Security | 5/5 PASS |
| Accessibility | 18/18 PASS |
| Visual desktop/mobile | 10/10 PASS; 0 overflow; 0 console error |
| Migration checksum | 001–034 valid |
| Disposable rollback | 34 up → 33 down → 33 re-up PASS |
| Secret scan | 402 file; 0 temuan |
| Dependency audit | 0 vulnerability |
| Production package | 254 file; SHA-256 + fingerprint + Brotli valid |
| Pre-deploy LOCAL | 11/11 PASS |

## Batas klaim

Status ini adalah **LOCAL BUILD READY** dan menutup Sprint 16/R023. Status ini
belum menggantikan audit final Sprint 17, LAN-UAT lintas divisi Sprint 18,
Owner sign-off, maupun activation gate VPS Sprint 19.
