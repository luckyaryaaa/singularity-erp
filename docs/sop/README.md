# Katalog SOP MAT ERP V2

Katalog ini adalah paket 18 SOP wajib Sprint 17/R024. Setiap dokumen memiliki
owner, frekuensi, langkah eksekusi, evidence, serta jalur eskalasi/rollback.
Kelengkapan struktur diverifikasi otomatis oleh `sprint17-final-audit.test.js`.

| ID | SOP | Owner | Frekuensi |
|---|---|---|---|
| SOP-01 | [Daily operations & monitoring](01-daily-operations-monitoring.md) | System Administrator | Harian |
| SOP-02 | [Weekly performance & security](02-weekly-performance-security.md) | System + Security Administrator | Mingguan |
| SOP-03 | [Monthly maintenance](03-monthly-maintenance.md) | System Administrator | Bulanan |
| SOP-04 | [Backup & restore](04-backup-restore.md) | System Administrator | Harian/bulanan |
| SOP-05 | [Disaster recovery](05-disaster-recovery.md) | Owner + System Administrator | Triwulanan |
| SOP-06 | [Incident response](06-incident-response.md) | Security Administrator | Saat insiden |
| SOP-07 | [Release/deployment/rollback](07-release-deployment-rollback.md) | Release Manager | Per release |
| SOP-08 | [Database migration](08-database-migration.md) | Database Administrator | Per schema change |
| SOP-09 | [User access & IAM](09-user-access-iam.md) | Security Administrator + Owner | JML/bulanan |
| SOP-10 | [Financial close & reconciliation](10-financial-close-reconciliation.md) | Finance Manager | Bulanan |
| SOP-11 | [Inventory opname & reconciliation](11-inventory-opname-reconciliation.md) | Warehouse + Accounting | Bulanan/kuartalan |
| SOP-12 | [Sales O2C, collection & RMA](12-sales-o2c-collection-rma.md) | Sales + Finance | Transaksi/mingguan |
| SOP-13 | [Procurement S2P & payment](13-procurement-s2p-payment.md) | Procurement + Finance | Per transaksi |
| SOP-14 | [Production, quality & MRP](14-production-quality-mrp.md) | Production + Quality | Per WO |
| SOP-15 | [HR & payroll](15-hr-payroll.md) | HR + Finance | Per payroll |
| SOP-16 | [Document, notification & integration](16-document-notification-integration.md) | Document Controller + System Admin | Per penerbitan |
| SOP-17 | [Import, export & retention](17-data-import-export-retention.md) | Data Steward | Per batch/bulanan |
| SOP-18 | [LAN-UAT, training & sign-off](18-lan-uat-training-signoff.md) | UAT Coordinator + Owner | Pra go-live |

Evidence eksekusi tidak disimpan sebagai secret dalam dokumen. Gunakan ID job,
request ID, checksum, nomor dokumen, atau referensi audit trail.
