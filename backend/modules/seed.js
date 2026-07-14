'use strict';
// Seed deterministik untuk adapter dev. Produksi memakai data/migrations + data nyata.
// Penomoran existing (PREFIX-MMYY-XXX) dipertahankan dan counter disinkronkan.

const { store } = require('../infrastructure/database/store');
const { hashPassword } = require('../core/auth');
const numbering = require('../core/numbering');
const { approvalLevelsFor } = require('../core/permissions');
const { uid } = require('../core/util');

const DEMO_PASSWORD = 'materp2026';
const OWNER_PIN = '246810';

function seed() {
  store.reset();

  // ── Organisasi ────────────────────────────────────────────────────────────
  const branches = store.collection('branches');
  const B = {};
  for (const [code, name, kind] of [
    ['HO', 'Head Office Bekasi', 'head_office'],
    ['WS', 'Workshop Bekasi', 'workshop'],
    ['WH', 'Warehouse Cikarang', 'warehouse'],
    ['SBY', 'Branch Surabaya', 'branch']
  ]) B[code] = branches.insert({ id: uid(), code, name, kind, active: true });

  store.collection('settings').insert({
    id: 'company',
    name: 'PT Mandiri Abadi Teknik', shortName: 'MAT',
    npwp: '01.234.567.8-412.000', address: 'Kawasan Industri MM2100, Bekasi',
    bank: { name: 'Bank Mandiri', account: '1250-0011-2233-4', holder: 'PT Mandiri Abadi Teknik' },
    fiscalYear: 2026, currency: 'IDR',
    numberingFormat: '{PREFIX}-{MMYY}-{SEQ3}',
    storage: { usedGb: 184, totalGb: 500 }
  });

  // ── Pengguna ─────────────────────────────────────────────────────────────
  const users = store.collection('users');
  const passwordHash = hashPassword(DEMO_PASSWORD);
  const U = {};
  const mkUser = (username, displayName, role, branch, extra = {}) => {
    U[username] = users.insert({
      id: uid(), username, displayName, role,
      branchId: B[branch].id, branchName: B[branch].name, branchScope: role === 'owner' || role === 'admin' ? '*' : undefined,
      department: extra.department || role, jobTitle: extra.jobTitle || role,
      passwordHash, ownerPinHash: role === 'owner' ? hashPassword(OWNER_PIN) : null,
      mfaEnabled: ['owner','admin','finance','accounting','tax','hrd'].includes(role),
      active: true, failedLoginCount: 0, lockedUntil: null, lastLoginAt: null
    });
    return U[username];
  };
  mkUser('andi', 'Andi Rahman', 'owner', 'HO', { jobTitle: 'Owner & Direktur Utama' });
  mkUser('admin', 'Nadia Putri', 'admin', 'HO', { jobTitle: 'Administrator Sistem' });
  mkUser('dewi', 'Dewi Lestari', 'finance', 'HO', { jobTitle: 'Finance Manager' });
  mkUser('rina', 'Rina Wijaya', 'accounting', 'HO', { jobTitle: 'Chief Accountant' });
  mkUser('tono', 'Tono Prasetyo', 'tax', 'HO', { jobTitle: 'Tax Officer' });
  mkUser('sari', 'Sari Handayani', 'hrd', 'HO', { jobTitle: 'HRD Manager' });
  mkUser('bima', 'Bima Saputra', 'sales', 'HO', { jobTitle: 'Sales Engineer' });
  mkUser('rudi', 'Rudi Hartono', 'procurement', 'HO', { jobTitle: 'Procurement Supervisor' });
  mkUser('joko', 'Joko Susilo', 'warehouse', 'WH', { jobTitle: 'Warehouse Supervisor' });
  mkUser('budi', 'Budi Santoso', 'production', 'WS', { jobTitle: 'Production Supervisor' });
  mkUser('eka', 'Eka Fitriani', 'employee', 'WS', { jobTitle: 'Machinist' });

  // ── Master data ──────────────────────────────────────────────────────────
  const customers = store.collection('customers');
  const C = {};
  for (const [code, name, city, term] of [
    ['CUST-001', 'PT Sinar Konstruksi', 'Jakarta', 30], ['CUST-002', 'PT Bara Mineral Utama', 'Balikpapan', 45],
    ['CUST-003', 'CV Karya Mesin', 'Bekasi', 14], ['CUST-004', 'PT Prima Logistik', 'Surabaya', 30],
    ['CUST-005', 'PT Cipta Heavy Equipment', 'Bekasi', 30], ['CUST-006', 'PT Nusantara Tambang Perkasa', 'Samarinda', 60],
    ['CUST-007', 'PT Baja Struktur Indonesia', 'Karawang', 30], ['CUST-008', 'CV Hidrolik Jaya', 'Cikarang', 14]
  ]) C[code] = customers.insert({ id: uid(), code, name, city, paymentTermDays: term, active: true, npwp: `02.${code.slice(-3)}.111.2-412.000` });

  const suppliers = store.collection('suppliers');
  const S = {};
  for (const [code, name, category] of [
    ['SUPP-001', 'PT Baja Prima Steel', 'Raw Material'], ['SUPP-002', 'PT Hidrolika Komponen', 'Hydraulic Parts'],
    ['SUPP-003', 'CV Logam Teknik', 'Machining Service'], ['SUPP-004', 'PT Bearing Sentral', 'Bearings & Seals'],
    ['SUPP-005', 'PT Kimia Industri Cat', 'Coating & Paint'], ['SUPP-006', 'PT Elektroda Weldindo', 'Welding Consumables']
  ]) S[code] = suppliers.insert({ id: uid(), code, name, category, active: true, rating: 4 });

  const products = store.collection('products');
  const P = {};
  for (const [code, name, uom, hpp, price, qty, minQty] of [
    ['PRD-001', 'Hydraulic Cylinder HC-200', 'unit', 28_500_000, 42_000_000, 6, 2],
    ['PRD-002', 'Gear Pump GP-45', 'unit', 9_800_000, 15_500_000, 12, 4],
    ['PRD-003', 'Plate SS400 12mm', 'lembar', 2_150_000, 2_900_000, 34, 20],
    ['PRD-004', 'Seal Kit SK-77', 'set', 850_000, 1_450_000, 3, 10],
    ['PRD-005', 'Bearing 6205-ZZ', 'pcs', 95_000, 165_000, 48, 60],
    ['PRD-006', 'Shaft S45C Ø60', 'batang', 1_250_000, 1_900_000, 14, 8],
    ['PRD-007', 'Control Valve CV-8', 'unit', 6_400_000, 9_800_000, 2, 3],
    ['PRD-008', 'Elektroda LB-52 3.2mm', 'box', 385_000, 520_000, 26, 15],
    ['PRD-009', 'Hose Hidrolik R2 3/4"', 'meter', 210_000, 340_000, 40, 50],
    ['PRD-010', 'Bucket Tooth 20T', 'pcs', 1_680_000, 2_500_000, 18, 10],
    ['PRD-011', 'Cat Epoxy Primer 20L', 'pail', 1_950_000, 2_600_000, 7, 5],
    ['PRD-012', 'O-Ring Viton Set', 'set', 320_000, 540_000, 5, 12]
  ]) P[code] = products.insert({ id: uid(), code, name, uom, hpp, price, active: true });

  const inventory = store.collection('inventory');
  Object.entries({ 'PRD-001': 6, 'PRD-002': 12, 'PRD-003': 34, 'PRD-004': 3, 'PRD-005': 48, 'PRD-006': 14, 'PRD-007': 2, 'PRD-008': 26, 'PRD-009': 40, 'PRD-010': 18, 'PRD-011': 7, 'PRD-012': 5 })
    .forEach(([code, qty]) => {
      const product = P[code];
      const minQty = [['PRD-004',10],['PRD-005',60],['PRD-007',3],['PRD-009',50],['PRD-012',12]].find(([c]) => c === code)?.[1]
        ?? Math.ceil(qty * 0.4);
      inventory.insert({
        id: uid(), productId: product.id, productCode: code, productName: product.name, uom: product.uom,
        warehouseId: B.WH.id, warehouseName: B.WH.name, branchId: B.WH.id,
        qtyOnHand: qty, qtyReserved: Math.min(2, qty), minQty,
        valueIdr: qty * product.hpp, critical: qty < minQty,
        updatedAt: '2026-07-14T01:30:00.000Z'
      });
    });

  const employees = store.collection('employees');
  for (const [nik, name, dept, title, salary, branch] of [
    ['EMP-001', 'Budi Santoso', 'Production', 'Production Supervisor', 12_500_000, 'WS'],
    ['EMP-002', 'Eka Fitriani', 'Production', 'Machinist', 7_200_000, 'WS'],
    ['EMP-003', 'Joko Susilo', 'Warehouse', 'Warehouse Supervisor', 9_800_000, 'WH'],
    ['EMP-004', 'Bima Saputra', 'Sales', 'Sales Engineer', 11_000_000, 'HO'],
    ['EMP-005', 'Dewi Lestari', 'Finance', 'Finance Manager', 16_500_000, 'HO'],
    ['EMP-006', 'Rina Wijaya', 'Accounting', 'Chief Accountant', 15_000_000, 'HO'],
    ['EMP-007', 'Sari Handayani', 'HRD', 'HRD Manager', 14_000_000, 'HO'],
    ['EMP-008', 'Rudi Hartono', 'Procurement', 'Procurement Supervisor', 10_500_000, 'HO'],
    ['EMP-009', 'Agus Widodo', 'Production', 'Welder Certified 6G', 8_400_000, 'WS'],
    ['EMP-010', 'Lina Marlina', 'Finance', 'AR Staff', 6_800_000, 'HO'],
    ['EMP-011', 'Hendra Gunawan', 'Production', 'CNC Operator', 7_900_000, 'WS'],
    ['EMP-012', 'Tono Prasetyo', 'Tax', 'Tax Officer', 9_200_000, 'HO']
  ]) employees.insert({ id: uid(), nik, name, department: dept, jobTitle: title, baseSalary: salary, branchId: B[branch].id, branchName: B[branch].name, active: true, bpjs: true, joinDate: '2021-03-01' });

  // ── Dokumen transaksi ────────────────────────────────────────────────────
  const docs = store.collection('documents');
  let seededByType = {};
  const mkDoc = (type, seq, spec) => {
    const period = spec.period || '0726';
    seededByType[type] = Math.max(seededByType[type] || 0, seq);
    const prefix = numbering.PREFIXES[type];
    const number = `${prefix}-${period}-${String(seq).padStart(3, '0')}`;
    const creator = spec.creator || U.bima;
    const status = spec.status || 'DRAFT';
    const amount = spec.amount || 0;
    const approvals = spec.approvals || [];
    const doc = docs.insert({
      id: uid(), documentNumber: number, documentType: type,
      title: spec.title, branchId: (spec.branch ? B[spec.branch] : B.HO).id,
      workLocationId: null, partyId: spec.partyId || null, partyName: spec.party || null,
      status, version: spec.version || (approvals.length + 2),
      amount, dueDate: spec.dueDate || null,
      payload: spec.payload || {},
      approvals,
      requiredApprovalLevels: ['WAITING_APPROVAL','APPROVED','IN_PROCESS','COMPLETED','CLOSED','PARTIALLY_PAID','OVERDUE'].includes(status) ? approvalLevelsFor(amount) : [],
      createdAt: spec.createdAt || '2026-07-01T02:00:00.000Z', createdBy: creator.id, createdByName: creator.displayName,
      updatedAt: spec.updatedAt || spec.createdAt || '2026-07-13T03:00:00.000Z', updatedBy: creator.id, updatedByName: creator.displayName,
      approvedAt: null, approvedBy: null, cancelledAt: null, cancelledBy: null,
      voidedAt: null, voidedBy: null, isArchived: false,
      submittedAt: status === 'DRAFT' ? null : (spec.createdAt || '2026-07-02T02:00:00.000Z')
    });
    return doc;
  };
  const approvedBy = (levels) => levels.map((level, i) => ({
    level, userId: level === 'owner' ? U.andi.id : level === 'finance' ? U.dewi.id : U.rudi.id,
    userName: level === 'owner' ? 'Andi Rahman' : level === 'finance' ? 'Dewi Lestari' : 'Rudi Hartono',
    at: `2026-07-0${3 + i}T04:00:00.000Z`, comment: null
  }));

  // Sales chain
  mkDoc('CUSTOMER_INQUIRY', 21, { title: 'Inquiry rebuild silinder boom PC200', party: 'PT Sinar Konstruksi', partyId: C['CUST-001'].id, status: 'COMPLETED', amount: 0, creator: U.bima, createdAt: '2026-06-24T02:00:00.000Z' });
  mkDoc('CUSTOMER_INQUIRY', 22, { title: 'Inquiry fabrikasi hopper 8m³', party: 'PT Nusantara Tambang Perkasa', partyId: C['CUST-006'].id, status: 'IN_PROCESS', amount: 0, creator: U.bima, createdAt: '2026-07-10T02:00:00.000Z' });
  mkDoc('QUOTATION', 31, { title: 'Penawaran overhaul hydraulic cylinder', party: 'PT Sinar Konstruksi', partyId: C['CUST-001'].id, status: 'APPROVED', amount: 186_500_000, approvals: approvedBy(['supervisor','finance']), creator: U.bima, createdAt: '2026-06-26T02:00:00.000Z' });
  mkDoc('QUOTATION', 33, { title: 'Penawaran gear pump assembly GP-45 (6 unit)', party: 'CV Karya Mesin', partyId: C['CUST-003'].id, status: 'WAITING_APPROVAL', amount: 94_250_000, approvals: approvedBy(['supervisor']), creator: U.bima, createdAt: '2026-07-12T02:00:00.000Z' });
  mkDoc('QUOTATION', 34, { title: 'Penawaran fabrikasi hopper 8m³', party: 'PT Nusantara Tambang Perkasa', partyId: C['CUST-006'].id, status: 'DRAFT', amount: 512_000_000, creator: U.bima, createdAt: '2026-07-13T02:00:00.000Z' });
  mkDoc('CUSTOMER_PO', 18, { title: 'PO pelanggan — conveyor support structure', party: 'PT Prima Logistik', partyId: C['CUST-004'].id, status: 'APPROVED', amount: 428_000_000, approvals: approvedBy(['supervisor','finance','owner']), creator: U.bima, createdAt: '2026-06-20T02:00:00.000Z' });
  mkDoc('SALES_ORDER', 11, { title: 'Gear Pump Assembly GP-45', party: 'CV Karya Mesin', partyId: C['CUST-003'].id, status: 'IN_PROCESS', amount: 94_250_000, approvals: approvedBy(['supervisor','finance']), dueDate: '2026-07-15', payload: { progress: 92, stage: 'Final QC' }, creator: U.bima, createdAt: '2026-06-28T02:00:00.000Z' });
  mkDoc('SALES_ORDER', 12, { title: 'Repair gearbox mixer 30kW', party: 'CV Hidrolik Jaya', partyId: C['CUST-008'].id, status: 'APPROVED', amount: 38_500_000, approvals: approvedBy(['supervisor','finance']), dueDate: '2026-07-28', creator: U.bima, createdAt: '2026-07-08T02:00:00.000Z' });
  mkDoc('PROJECT', 8, { title: 'Conveyor Support Structure', party: 'PT Prima Logistik', partyId: C['CUST-004'].id, status: 'IN_PROCESS', amount: 428_000_000, approvals: approvedBy(['supervisor','finance','owner']), dueDate: '2026-08-05', payload: { progress: 34, stage: 'Fabrikasi' }, creator: U.bima, createdAt: '2026-06-22T02:00:00.000Z' });

  // Production chain
  mkDoc('WORK_ORDER', 18, { title: 'Overhaul Hydraulic Cylinder', party: 'PT Sinar Konstruksi', partyId: C['CUST-001'].id, status: 'IN_PROCESS', amount: 186_500_000, approvals: approvedBy(['supervisor','finance']), dueDate: '2026-07-18', payload: { progress: 76, stage: 'Produksi' }, creator: U.budi, branch: 'WS', createdAt: '2026-06-30T02:00:00.000Z', updatedAt: '2026-07-14T01:32:00.000Z' });
  mkDoc('WORK_ORDER', 16, { title: 'Fabrication Bucket 20T', party: 'PT Bara Mineral Utama', partyId: C['CUST-002'].id, status: 'IN_PROCESS', amount: 274_800_000, approvals: approvedBy(['supervisor','finance','owner']), dueDate: '2026-07-22', payload: { progress: 58, stage: 'Fabrikasi' }, creator: U.budi, branch: 'WS', createdAt: '2026-06-27T02:00:00.000Z' });
  mkDoc('WORK_ORDER', 14, { title: 'Repair Main Control Valve', party: 'PT Cipta Heavy Equipment', partyId: C['CUST-005'].id, status: 'COMPLETED', amount: 68_700_000, approvals: approvedBy(['supervisor','finance']), dueDate: '2026-07-14', payload: { progress: 100, stage: 'Selesai' }, creator: U.budi, branch: 'WS', createdAt: '2026-06-25T02:00:00.000Z' });
  mkDoc('WORK_ORDER', 19, { title: 'Machining shaft pompa slurry', party: 'PT Nusantara Tambang Perkasa', partyId: C['CUST-006'].id, status: 'WAITING_APPROVAL', amount: 42_300_000, approvals: approvedBy(['supervisor']), creator: U.budi, branch: 'WS', createdAt: '2026-07-13T02:00:00.000Z' });
  mkDoc('QC_INSPECTION', 9, { title: 'QC final gear pump GP-45', party: 'CV Karya Mesin', status: 'IN_PROCESS', amount: 0, creator: U.budi, branch: 'WS', createdAt: '2026-07-12T05:00:00.000Z' });
  mkDoc('QC_INSPECTION', 8, { title: 'Incoming QC plate SS400', party: 'PT Baja Prima Steel', status: 'COMPLETED', amount: 0, creator: U.joko, branch: 'WH', createdAt: '2026-07-09T05:00:00.000Z' });

  // Procurement chain
  mkDoc('PURCHASE_REQUEST', 27, { title: 'PR seal kit + o-ring stok kritis', status: 'WAITING_APPROVAL', amount: 18_600_000, approvals: [], creator: U.joko, branch: 'WH', createdAt: '2026-07-13T06:00:00.000Z' });
  mkDoc('PURCHASE_REQUEST', 26, { title: 'PR elektroda & consumable welding', status: 'APPROVED', amount: 9_240_000, approvals: approvedBy(['supervisor']), creator: U.budi, branch: 'WS', createdAt: '2026-07-10T06:00:00.000Z' });
  mkDoc('PURCHASE_ORDER', 41, { title: 'PO plate SS400 12mm (20 lembar)', party: 'PT Baja Prima Steel', partyId: S['SUPP-001'].id, status: 'IN_PROCESS', amount: 43_000_000, approvals: approvedBy(['supervisor','finance']), dueDate: '2026-07-17', creator: U.rudi, createdAt: '2026-07-06T02:00:00.000Z' });
  mkDoc('PURCHASE_ORDER', 42, { title: 'PO hydraulic seal & hose', party: 'PT Hidrolika Komponen', partyId: S['SUPP-002'].id, status: 'WAITING_APPROVAL', amount: 27_450_000, approvals: approvedBy(['supervisor']), creator: U.rudi, createdAt: '2026-07-13T02:00:00.000Z' });
  mkDoc('PURCHASE_ORDER', 43, { title: 'PO bearing & seal (blanket order Q3)', party: 'PT Bearing Sentral', partyId: S['SUPP-004'].id, status: 'WAITING_APPROVAL', amount: 64_800_000, approvals: approvedBy(['supervisor','finance']), creator: U.rudi, createdAt: '2026-07-13T07:00:00.000Z' });
  mkDoc('GOODS_RECEIPT', 12, { title: 'Penerimaan plate SS400 (partial 12/20)', party: 'PT Baja Prima Steel', status: 'COMPLETED', amount: 25_800_000, creator: U.joko, branch: 'WH', createdAt: '2026-07-11T02:00:00.000Z' });
  mkDoc('MATERIAL_ISSUE', 15, { title: 'Pengeluaran material WO-0726-018', status: 'COMPLETED', amount: 0, creator: U.joko, branch: 'WH', createdAt: '2026-07-11T08:00:00.000Z' });
  mkDoc('STOCK_ADJUSTMENT', 3, { title: 'Penyesuaian stok opname Juni', status: 'WAITING_APPROVAL', amount: 4_120_000, creator: U.joko, branch: 'WH', createdAt: '2026-07-12T02:00:00.000Z' });
  mkDoc('DELIVERY', 22, { title: 'Pengiriman control valve — selesai repair', party: 'PT Cipta Heavy Equipment', partyId: C['CUST-005'].id, status: 'COMPLETED', amount: 0, creator: U.joko, createdAt: '2026-07-13T02:00:00.000Z' });

  // Finance chain — invoice bulan Juli (pendukung KPI revenue) + overdue
  const inv = (seq, title, custCode, amount, status, invoiceDate, dueDate, extra = {}) =>
    mkDoc('INVOICE', seq, { title, party: C[custCode].name, partyId: C[custCode].id, amount, status, dueDate, creator: U.dewi, approvals: ['DRAFT','WAITING_APPROVAL'].includes(status) ? [] : approvedBy(['supervisor','finance']), createdAt: `${invoiceDate}T02:00:00.000Z`, payload: { invoiceDate, ...extra } });
  inv(101, 'Invoice repair control valve', 'CUST-005', 68_700_000, 'PARTIALLY_PAID', '2026-07-01', '2026-07-31', { paid: 30_000_000 });
  inv(102, 'Invoice termin 1 conveyor support (40%)', 'CUST-004', 171_200_000, 'CLOSED', '2026-07-02', '2026-08-01', { paid: 171_200_000 });
  inv(103, 'Invoice overhaul silinder — DP 50%', 'CUST-001', 93_250_000, 'CLOSED', '2026-07-05', '2026-07-20', { paid: 93_250_000 });
  inv(104, 'Invoice jasa machining shaft', 'CUST-006', 47_800_000, 'OVERDUE', '2026-06-08', '2026-07-08');
  inv(105, 'Invoice fabrikasi platform akses', 'CUST-007', 88_400_000, 'OVERDUE', '2026-06-05', '2026-07-05');
  inv(106, 'Invoice spare part gear pump', 'CUST-003', 24_600_000, 'OVERDUE', '2026-06-10', '2026-07-10');
  inv(107, 'Invoice sewa jig & dies', 'CUST-002', 56_200_000, 'OVERDUE', '2026-06-01', '2026-07-01');
  inv(108, 'Invoice perbaikan hose hidrolik', 'CUST-008', 12_800_000, 'OVERDUE', '2026-06-12', '2026-07-12');
  inv(109, 'Invoice kalibrasi & QC pihak ketiga', 'CUST-005', 15_400_000, 'OVERDUE', '2026-06-09', '2026-07-09');
  inv(110, 'Invoice progress fabrikasi bucket 20T (30%)', 'CUST-002', 82_440_000, 'APPROVED', '2026-07-12', '2026-08-11');

  mkDoc('CUSTOMER_PAYMENT', 55, { title: 'Pembayaran termin 1 conveyor', party: 'PT Prima Logistik', partyId: C['CUST-004'].id, status: 'CLOSED', amount: 171_200_000, creator: U.dewi, approvals: approvedBy(['supervisor','finance']), createdAt: '2026-07-09T02:00:00.000Z' });
  mkDoc('CUSTOMER_PAYMENT', 56, { title: 'Pembayaran DP overhaul silinder', party: 'PT Sinar Konstruksi', partyId: C['CUST-001'].id, status: 'CLOSED', amount: 93_250_000, creator: U.dewi, approvals: approvedBy(['supervisor','finance']), createdAt: '2026-07-11T02:00:00.000Z' });
  mkDoc('SUPPLIER_INVOICE', 71, { title: 'Tagihan plate SS400 (GR-0726-012)', party: 'PT Baja Prima Steel', partyId: S['SUPP-001'].id, status: 'WAITING_APPROVAL', amount: 25_800_000, approvals: [], dueDate: '2026-08-10', creator: U.dewi, createdAt: '2026-07-12T02:00:00.000Z' });
  mkDoc('SUPPLIER_INVOICE', 70, { title: 'Tagihan elektroda LB-52', party: 'PT Elektroda Weldindo', partyId: S['SUPP-006'].id, status: 'APPROVED', amount: 9_240_000, approvals: approvedBy(['supervisor','finance']), dueDate: '2026-07-25', creator: U.dewi, createdAt: '2026-07-08T02:00:00.000Z' });
  mkDoc('SUPPLIER_PAYMENT', 33, { title: 'Pembayaran bearing sentral — Juni', party: 'PT Bearing Sentral', partyId: S['SUPP-004'].id, status: 'CLOSED', amount: 31_500_000, creator: U.dewi, approvals: approvedBy(['supervisor','finance']), createdAt: '2026-07-03T02:00:00.000Z' });
  mkDoc('EXPENSE', 44, { title: 'Reimburse perjalanan dinas Surabaya', status: 'WAITING_APPROVAL', amount: 3_850_000, approvals: [], creator: U.bima, createdAt: '2026-07-13T09:00:00.000Z' });

  // Accounting & tax
  mkDoc('JOURNAL', 88, { title: 'Jurnal penjualan Juli minggu 1', status: 'CLOSED', amount: 332_950_000, creator: U.rina, approvals: approvedBy(['supervisor','finance']), createdAt: '2026-07-07T02:00:00.000Z' });
  mkDoc('JOURNAL', 89, { title: 'Jurnal penyusutan aset Juli', status: 'APPROVED', amount: 18_240_000, creator: U.rina, approvals: approvedBy(['supervisor']), createdAt: '2026-07-12T02:00:00.000Z' });
  mkDoc('JOURNAL', 90, { title: 'Jurnal akrual biaya listrik workshop', status: 'DRAFT', amount: 7_600_000, creator: U.rina, createdAt: '2026-07-13T02:00:00.000Z' });
  mkDoc('TAX_DOCUMENT', 12, { title: 'SPT Masa PPN Juni 2026', status: 'COMPLETED', amount: 118_400_000, creator: U.tono, approvals: approvedBy(['supervisor','finance']), createdAt: '2026-07-10T02:00:00.000Z', payload: { taxType: 'PPN', period: '2026-06' } });
  mkDoc('TAX_DOCUMENT', 13, { title: 'PPh 21 Masa Juli 2026', status: 'IN_PROCESS', amount: 42_600_000, creator: U.tono, approvals: approvedBy(['supervisor','finance']), createdAt: '2026-07-12T02:00:00.000Z', payload: { taxType: 'PPh 21', period: '2026-07' } });
  mkDoc('TAX_DOCUMENT', 14, { title: 'PPh 23 jasa machining', status: 'WAITING_APPROVAL', amount: 3_760_000, approvals: [], creator: U.tono, createdAt: '2026-07-13T02:00:00.000Z', payload: { taxType: 'PPh 23', period: '2026-07' } });

  // HR & payroll
  mkDoc('PAYROLL_RUN', 7, { title: 'Payroll Juli 2026 (12 karyawan)', status: 'WAITING_APPROVAL', amount: 128_800_000, approvals: approvedBy(['supervisor']), creator: U.sari, createdAt: '2026-07-13T02:00:00.000Z', payload: { period: '2026-07', headcount: 12, bpjs: 11_320_000, pph21: 8_640_000 } });
  mkDoc('PAYROLL_RUN', 6, { title: 'Payroll Juni 2026 (12 karyawan)', status: 'CLOSED', amount: 127_400_000, approvals: approvedBy(['supervisor','finance','owner']), creator: U.sari, createdAt: '2026-06-25T02:00:00.000Z', payload: { period: '2026-06', headcount: 12 } });
  mkDoc('LEAVE_REQUEST', 19, { title: 'Cuti tahunan Eka Fitriani (3 hari)', status: 'WAITING_APPROVAL', amount: 0, approvals: [], creator: U.eka, branch: 'WS', createdAt: '2026-07-13T02:00:00.000Z' });

  // Sinkronkan counter penomoran dengan nomor tertinggi yang diseed.
  for (const [type, seq] of Object.entries(seededByType)) numbering.ensureCounter(type, '0726', seq);

  // ── Notifikasi awal ──────────────────────────────────────────────────────
  const notifications = store.collection('notifications');
  const notif = (target, category, title, body, link) => notifications.insert({ id: uid(), ...target, category, title, body, link, dedupeKey: null, createdAt: '2026-07-14T01:00:00.000Z', readAt: null });
  notif({ userId: U.andi.id }, 'ACTION_REQUIRED', '11 persetujuan menunggu keputusan Anda', 'Termasuk payroll Juli senilai Rp 128,8 jt dan PO blanket Q3.', '#/approvals');
  notif({ userId: U.andi.id }, 'WARNING', '6 invoice melewati jatuh tempo', 'Total piutang tertunggak Rp 245,2 jt. AR aging memburuk 8 hari.', '#/finance/invoices');
  notif({ role: 'warehouse' }, 'WARNING', '5 SKU di bawah stok minimum', 'Seal Kit SK-77, Bearing 6205-ZZ, Control Valve CV-8, Hose R2, O-Ring Viton.', '#/warehouse/inventory');
  notif({ userId: U.andi.id }, 'INFORMATION', 'Pembayaran diterima dari PT Prima Logistik', 'Rp 171,2 jt untuk termin 1 conveyor support structure.', '#/finance/payments');
  notif({ role: '*' }, 'SUCCESS', 'Backup malam berhasil', '428 MB • checksum terverifikasi • restore drill lulus.', '#/system/monitoring');
  notif({ userId: U.andi.id }, 'ACTION_REQUIRED', 'QC final gear pump menunggu rilis', 'SO-0726-011 CV Karya Mesin — jatuh tempo besok.', '#/production/quality');

  // ── Riwayat job & backup ────────────────────────────────────────────────
  const jobs = store.collection('jobs');
  jobs.insert({ id: uid(), type: 'BACKUP_RUN', label: 'Backup terjadwal', priority: 'low', params: {}, status: 'COMPLETED', progress: 100, requestedBy: U.admin.id, requestedByName: 'Nadia Putri', createdAt: '2026-07-14T00:30:00.000Z', startedAt: '2026-07-14T00:30:05.000Z', finishedAt: '2026-07-14T00:31:40.000Z', result: { summary: 'Backup 428 MB tersimpan, checksum terverifikasi, restore drill lulus.' }, error: null });
  jobs.insert({ id: uid(), type: 'EXPORT_EXCEL', label: 'Ekspor Excel', priority: 'low', params: { type: 'INVOICE' }, status: 'COMPLETED', progress: 100, requestedBy: U.dewi.id, requestedByName: 'Dewi Lestari', createdAt: '2026-07-13T08:10:00.000Z', startedAt: '2026-07-13T08:10:02.000Z', finishedAt: '2026-07-13T08:10:31.000Z', result: { summary: '10 baris diekspor ke INVOICE.xlsx' }, error: null });
  jobs.insert({ id: uid(), type: 'IMPORT_CSV', label: 'Impor CSV', priority: 'low', params: { source: 'attendance-0726.csv' }, status: 'FAILED', progress: 40, requestedBy: U.sari.id, requestedByName: 'Sari Handayani', createdAt: '2026-07-12T07:00:00.000Z', startedAt: '2026-07-12T07:00:03.000Z', finishedAt: '2026-07-12T07:00:41.000Z', result: null, error: 'Baris 214: format jam tidak valid (kolom check_out).' });
  store.collection('backups').insert({ id: uid(), at: '2026-07-14T00:31:40.000Z', sizeMb: 428, checksum: 'sha256:9f31…ab02', restoreTested: true, target: 'NAS + offsite terenkripsi' });

  return { branches: B, users: U, customers: C, suppliers: S, products: P };
}

function hasDefaultCredentials(targetStore = store) {
  return targetStore.collection('users').all().some((user) =>
    verifySeedCredential(user.passwordHash, DEMO_PASSWORD) ||
    (user.ownerPinHash && verifySeedCredential(user.ownerPinHash, OWNER_PIN)));
}

function verifySeedCredential(hash, value) {
  const { verifyPassword } = require('../core/auth');
  return verifyPassword(value, hash);
}

module.exports = { seed, DEMO_PASSWORD, OWNER_PIN, hasDefaultCredentials };
