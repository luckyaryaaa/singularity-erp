'use strict';
// Sprint 15 (R022) — spesifikasi OpenAPI 3.0 + katalог event domain.
// Dihasilkan dari daftar endpoint terkurasi (bukan refleksi otomatis) agar
// kontrak API stabil dan terdokumentasi. API_VERSION dikirim pada header
// X-API-Version setiap respons.
const API_VERSION = '1.2';

// Ringkas: [method, path, tag, summary, {auth?}]. Path memakai {id} OpenAPI.
const ENDPOINTS = [
  ['GET', '/api/live', 'System', 'Liveness — proses hidup tanpa DB', { public: true }],
  ['GET', '/api/health', 'System', 'Readiness — termasuk cek database', { public: true }],
  ['GET', '/api/openapi.json', 'System', 'Spesifikasi OpenAPI ini', { public: true }],
  ['GET', '/api/system/events-catalog', 'System', 'Katalog event domain', { public: true }],
  ['GET', '/api/verify', 'System', 'Verifikasi keaslian dokumen (kode)', { public: true }],
  ['GET', '/api/runtime', 'System', 'Metadata runtime (mode & database)', { public: true }],
  ['POST', '/api/auth/login', 'Auth', 'Login (mengeluarkan cookie sesi)', { public: true }],
  ['POST', '/api/auth/mfa', 'Auth', 'Selesaikan tantangan MFA TOTP', { public: true }],
  ['POST', '/api/auth/change-password-required', 'Auth', 'Ganti sandi wajib saat login challenge', { public: true }],
  ['POST', '/api/auth/logout', 'Auth', 'Logout sesi berjalan'],
  ['GET', '/api/auth/session', 'Auth', 'Sesi + CSRF token + permission'],
  ['GET', '/api/dashboard', 'Workspace', 'KPI ringkas dashboard'],
  ['GET', '/api/my-work', 'Workspace', 'Inbox lintas modul'],
  ['GET', '/api/approvals', 'Workspace', 'Antrean persetujuan (Approval Center)'],
  ['GET', '/api/documents', 'Documents', 'Daftar dokumen (filter type/status)'],
  ['POST', '/api/documents', 'Documents', 'Buat dokumen (Idempotency-Key)'],
  ['GET', '/api/documents/{id}', 'Documents', 'Detail dokumen'],
  ['PATCH', '/api/documents/{id}', 'Documents', 'Ubah draft (optimistic lock)'],
  ['POST', '/api/documents/{id}/action', 'Documents', 'Transisi status (submit/approve/…)'],
  ['POST', '/api/documents/{id}/convert', 'Documents', 'Konversi ke dokumen lanjutan'],
  ['GET', '/api/documents/{id}/official-pdf', 'Documents', 'Cetak dokumen resmi ber-identitas'],
  ['POST', '/api/documents/{id}/email', 'Documents', 'Kirim dokumen via email (SMTP)'],
  ['GET', '/api/quotations/{id}/revisions', 'Sales', 'Histori revisi penawaran'],
  ['POST', '/api/quotations/{id}/revise', 'Sales', 'Revisi penawaran ber-versi'],
  ['POST', '/api/rma', 'Sales', 'Buat RMA / klaim garansi'],
  ['GET', '/api/collection/dunning', 'Sales', 'Notice penagihan terbuka'],
  ['POST', '/api/collection/dunning/run', 'Sales', 'Jalankan dunning'],
  ['GET', '/api/procurement/budgets', 'Procurement', 'Anggaran pengadaan periode'],
  ['GET', '/api/rfq/{id}/quotes', 'Procurement', 'Kuota supplier RFQ + perbandingan'],
  ['POST', '/api/rfq/{id}/create-po', 'Procurement', 'Konversi RFQ terpilih → PO'],
  ['POST', '/api/purchase-orders/{id}/change-orders', 'Procurement', 'Ajukan amendemen PO'],
  ['GET', '/api/purchase-contracts', 'Procurement', 'Portfolio kontrak pembelian berhalaman'],
  ['POST', '/api/purchase-contracts', 'Procurement', 'Buat draft kontrak (Idempotency-Key)'],
  ['GET', '/api/purchase-contracts/{id}', 'Procurement', 'Contract 360 + baris + release'],
  ['POST', '/api/purchase-contracts/{id}/approve', 'Procurement', 'Setujui kontrak (version + SoD)'],
  ['POST', '/api/purchase-contracts/{id}/release', 'Procurement', 'Release kontrak ke PO (version + idempotency)'],
  ['GET', '/api/inventory', 'Inventory', 'Saldo stok'],
  ['GET', '/api/inventory/reservations', 'Inventory', 'Reservation workbench berhalaman'],
  ['POST', '/api/inventory/reservations/{id}/release', 'Inventory', 'Lepas reservasi beralasan (version + idempotency)'],
  ['GET', '/api/inventory/lots', 'Inventory', 'Lot + heat number (traceability)'],
  ['GET', '/api/inventory/valuation', 'Inventory', 'Valuasi persediaan'],
  ['POST', '/api/inventory/opname', 'Inventory', 'Mulai stock opname'],
  ['GET', '/api/work-orders/{id}/production', 'Production', 'Cockpit produksi WO'],
  ['POST', '/api/work-orders/{id}/plan', 'Production', 'Rencanakan produksi (BOM + reservasi)'],
  ['GET', '/api/production/capacity', 'Production', 'Capacity board per work center dan tanggal'],
  ['GET', '/api/production/wip', 'Production', 'Nilai work in process dari fakta transaksi'],
  ['POST', '/api/production/operations/{id}/schedule', 'Production', 'Jadwalkan operasi dengan finite capacity'],
  ['GET', '/api/quality/capa', 'Quality', 'Daftar CAPA berhalaman'],
  ['POST', '/api/quality/capa', 'Quality', 'Buka CAPA (Idempotency-Key)'],
  ['POST', '/api/quality/capa/{id}/advance', 'Quality', 'Transisi CAPA berurutan (version)'],
  ['GET', '/api/quality/instruments', 'Quality', 'Calibration register'],
  ['POST', '/api/quality/instruments/{id}/calibrations', 'Quality', 'Catat kalibrasi alat (version)'],
  ['POST', '/api/mrp/run', 'Production', 'Jalankan MRP'],
  ['GET', '/api/accounting/financial-statements', 'Finance', 'Neraca + laba rugi'],
  ['GET', '/api/accounting/closing-cockpit', 'Finance', 'Checklist tutup buku'],
  ['GET', '/api/accounting/subledger', 'Finance', 'Subledger AR/AP vs GL'],
  ['GET', '/api/assets', 'Finance', 'Registry aset tetap'],
  ['POST', '/api/assets/depreciation/run', 'Finance', 'Jalankan penyusutan'],
  ['POST', '/api/payments/{id}/reverse', 'Finance', 'Pembalikan pembayaran (Owner+PIN)'],
  ['GET', '/api/hr/shifts', 'HR', 'Daftar shift kerja'],
  ['POST', '/api/hr/roster', 'HR', 'Tetapkan roster shift'],
  ['GET', '/api/hr/corrections', 'HR', 'Koreksi absensi (maker-checker)'],
  ['POST', '/api/hr/leave-accrual/run', 'HR', 'Akrual cuti bulanan'],
  ['GET', '/api/reports/cockpit', 'Reporting', 'Executive Cockpit ber-scope cabang dan periode'],
  ['GET', '/api/reports/catalog', 'Reporting', 'Katalog laporan operasional/keuangan/produksi'],
  ['POST', '/api/reports/refresh', 'Reporting', 'Refresh materialized KPI semantic layer'],
  ['GET', '/api/reports/schedules', 'Reporting', 'Daftar laporan terjadwal'],
  ['POST', '/api/reports/schedules', 'Reporting', 'Buat laporan terjadwal'],
  ['PATCH', '/api/reports/schedules/{id}', 'Reporting', 'Aktif/nonaktifkan jadwal dengan optimistic version'],
  ['GET', '/api/reports/saved-filters', 'Reporting', 'Saved view pribadi Executive Cockpit'],
  ['POST', '/api/reports/saved-filters', 'Reporting', 'Simpan filter Executive Cockpit'],
  ['GET', '/api/audit', 'Governance', 'Audit trail (append-only)'],
  ['GET', '/api/governance/sod', 'Governance', 'Konflik Segregation of Duties'],
  ['GET', '/api/governance/retention/policies', 'Governance', 'Policy retention teknis aktif'],
  ['GET', '/api/governance/retention/runs', 'Governance', 'Ledger preview dan eksekusi retention'],
  ['POST', '/api/governance/retention/preview', 'Governance', 'Preview kandidat retention tanpa menghapus'],
  ['POST', '/api/governance/retention/execute', 'Governance', 'Eksekusi preview retention (MFA + idempotency)'],
  ['GET', '/api/governance/retention/holds', 'Governance', 'Daftar legal hold retention'],
  ['POST', '/api/governance/retention/holds', 'Governance', 'Tempatkan legal hold pada record/resource'],
  ['POST', '/api/governance/retention/holds/{id}/release', 'Governance', 'Lepaskan legal hold beralasan'],
  ['GET', '/api/events', 'Realtime', 'Server-Sent Events terautentikasi']
];

// Katalog event domain yang ditulis ke outbox transaksional.
const EVENTS = [
  { event: 'document.created', when: 'Dokumen baru dibuat', payload: ['entityId', 'documentType', 'branchId'] },
  { event: 'document.updated', when: 'Dokumen diperbarui / transisi status', payload: ['entityId', 'documentType', 'version', 'status'] },
  { event: 'document.converted', when: 'Dokumen dikonversi (mis. QUO→SO)', payload: ['entityId', 'childNumber', 'relation'] },
  { event: 'quotation.updated', when: 'Penawaran diperbarui / direvisi', payload: ['entityId', 'version', 'branchId'] },
  { event: 'purchase_order.updated', when: 'PO diperbarui / amendemen disetujui', payload: ['entityId', 'branchId'] },
  { event: 'invoice.updated', when: 'Invoice diperbarui / dunning terbit', payload: ['entityId', 'branchId'] },
  { event: 'payment.posted', when: 'Pembayaran diposting / dibalik', payload: ['entityId', 'documentType', 'branchId'] },
  { event: 'goods_receipt.created', when: 'Penerimaan barang dibuat', payload: ['entityId', 'branchId'] },
  { event: 'work_order.updated', when: 'Work order diperbarui', payload: ['entityId', 'branchId'] },
  { event: 'payroll.updated', when: 'Payroll run diperbarui', payload: ['entityId', 'branchId'] }
];

function spec(host = 'localhost') {
  const paths = {};
  for (const [method, path, tag, summary, opt = {}] of ENDPOINTS) {
    paths[path] = paths[path] || {};
    paths[path][method.toLowerCase()] = {
      tags: [tag], summary,
      security: opt.public ? [] : [{ cookieAuth: [] }],
      responses: { '200': { description: 'OK' }, '401': { description: 'Sesi tidak valid' }, '403': { description: 'Izin ditolak' } }
    };
  }
  return {
    openapi: '3.0.3',
    info: {
      title: 'MAT ERP V2 API', version: API_VERSION,
      description: 'API ERP modular monolith PT Mandiri Abadi Teknik. Sesi via cookie HttpOnly `mat_session`; mutasi wajib header `X-CSRF-Token`; operasi kritis wajib `Idempotency-Key`. Header `X-API-Version` dikirim pada setiap respons.'
    },
    servers: [{ url: `http://${host}`, description: 'Runtime lokal' }],
    tags: [...new Set(ENDPOINTS.map((e) => e[2]))].map((name) => ({ name })),
    components: {
      securitySchemes: {
        cookieAuth: { type: 'apiKey', in: 'cookie', name: 'mat_session' },
        csrf: { type: 'apiKey', in: 'header', name: 'X-CSRF-Token' }
      },
      schemas: {
        Error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' }, detail: { type: 'string' } }, required: ['code', 'message'] }
      }
    },
    paths
  };
}

function eventsCatalog() { return { apiVersion: API_VERSION, count: EVENTS.length, events: EVENTS }; }

module.exports = { API_VERSION, spec, eventsCatalog, ENDPOINTS, EVENTS };
