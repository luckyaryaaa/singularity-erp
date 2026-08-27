'use strict';
const { randomUUID } = require('node:crypto');
const { AppError } = require('../../../core/errors');
const permissions = require('../../../core/permissions');
const runtime = require('./runtime');
const businessDate = require('../../../core/business-date');
const stockReservations = require('./stock-reservations');

const camel = runtime.camel;
const round = (n, scale = 2) => Math.round(Number(n) * (10 ** scale)) / (10 ** scale);
const requireReason = (reason) => { if (!String(reason || '').trim()) throw new AppError('REASON_REQUIRED'); return String(reason).trim().slice(0, 1000); };

async function document(client, id, user, expected) {
  const row = (await client.query('SELECT * FROM business_documents WHERE id=$1', [id])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Dokumen penjualan tidak ditemukan.');
  permissions.assertBranchScope(user, row.branch_id, 'Dokumen penjualan');
  if (expected && !expected.includes(row.document_type)) throw new AppError('VALIDATION_ERROR', `Kontrol ini tidak berlaku untuk ${row.document_type}.`);
  return row;
}

async function assessMargin(client, { documentId, user }) {
  const doc = await document(client, documentId, user, ['QUOTATION', 'SALES_ORDER']);
  const existing = (await client.query('SELECT * FROM sales_margin_assessments WHERE document_id=$1 AND document_version=$2', [doc.id, doc.version])).rows[0];
  if (existing) return camel(existing);
  const lines = (await client.query(`SELECT l.line_no,l.product_id,l.qty,l.unit_price,l.discount_pct,COALESCE(p.hpp,0) hpp
    FROM document_lines l LEFT JOIN products p ON p.id=l.product_id WHERE l.document_id=$1 ORDER BY l.line_no`, [doc.id])).rows;
  if (!lines.length) throw new AppError('VALIDATION_ERROR', 'Analisis margin membutuhkan baris dokumen.');
  const headerDiscount = Number(doc.payload?.discountPct || 0);
  const grossRevenue = lines.reduce((n, l) => n + Number(l.qty) * Number(l.unit_price) * (1 - Number(l.discount_pct || 0) / 100), 0);
  const revenue = round(grossRevenue * (1 - headerDiscount / 100));
  const estimatedCost = round(lines.reduce((n, l) => n + Number(l.qty) * Number(l.hpp), 0));
  const marginAmount = round(revenue - estimatedCost), marginPct = revenue ? round(marginAmount / revenue * 100, 4) : -100;
  const policy = (await client.query(`SELECT * FROM sales_margin_policies WHERE legal_entity_id=$1 AND document_type=$2 AND status='ACTIVE'
    AND effective_from<=$3 AND (effective_to IS NULL OR effective_to>=$3) ORDER BY effective_from DESC LIMIT 1`,
  [doc.legal_entity_id, doc.document_type, businessDate.today()])).rows[0];
  if (!policy) throw new AppError('RESOURCE_NOT_FOUND', `Policy margin aktif untuk ${doc.document_type} belum tersedia.`);
  const status = marginPct < Number(policy.minimum_margin_pct) ? 'PENDING_APPROVAL' : 'NOT_REQUIRED';
  const costSnapshot = lines.map((l) => ({ lineNo: l.line_no, productId: l.product_id, qty: Number(l.qty), unitCost: Number(l.hpp), extendedCost: round(Number(l.qty) * Number(l.hpp)) }));
  const policySnapshot = { policyId: policy.id, minimumMarginPct: Number(policy.minimum_margin_pct), warningMarginPct: Number(policy.warning_margin_pct), effectiveFrom: policy.effective_from };
  const row = (await client.query(`INSERT INTO sales_margin_assessments(id,document_id,document_version,policy_id,revenue,estimated_cost,margin_amount,margin_pct,policy_snapshot,cost_snapshot,status,requested_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
  [randomUUID(), doc.id, doc.version, policy.id, revenue, estimatedCost, marginAmount, marginPct, JSON.stringify(policySnapshot), JSON.stringify(costSnapshot), status, user.id])).rows[0];
  await runtime.audit(client, { userId: user.id, action: 'ASSESS_MARGIN', module: 'sales_order', entityType: 'SALES_MARGIN_ASSESSMENT', entityId: row.id, documentNumber: doc.document_number, newValue: { revenue, estimatedCost, marginAmount, marginPct, status, policySnapshot }, branchId: doc.branch_id });
  return camel(row);
}

async function marginStatus(client, documentId, user) {
  const doc = await document(client, documentId, user, ['QUOTATION', 'SALES_ORDER']);
  return camel((await client.query('SELECT * FROM sales_margin_assessments WHERE document_id=$1 ORDER BY document_version DESC,requested_at DESC LIMIT 1', [doc.id])).rows[0]) || { documentId: doc.id, documentVersion: doc.version, status: 'NOT_ASSESSED' };
}

async function decideMargin(client, { assessmentId, approve, reason, user, requestId }) {
  reason = requireReason(reason);
  const row = (await client.query(`SELECT a.*,d.branch_id,d.document_number FROM sales_margin_assessments a JOIN business_documents d ON d.id=a.document_id WHERE a.id=$1 FOR UPDATE OF a`, [assessmentId])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Assessment margin tidak ditemukan.');
  permissions.assertBranchScope(user, row.branch_id, 'Assessment margin');
  if (row.status !== 'PENDING_APPROVAL') throw new AppError('STATUS_INVALID', `Assessment margin berstatus ${row.status}.`);
  if (row.requested_by === user.id) throw new AppError('SOD_CONFLICT', 'Pembuat assessment tidak boleh memutuskan margin sendiri.');
  const status = approve ? 'APPROVED' : 'REJECTED';
  const updated = (await client.query(`UPDATE sales_margin_assessments SET status=$2,decided_at=now(),decided_by=$3,decision_reason=$4 WHERE id=$1 RETURNING *`, [assessmentId, status, user.id, reason])).rows[0];
  await runtime.audit(client, { userId: user.id, action: approve ? 'APPROVE_MARGIN' : 'REJECT_MARGIN', module: 'sales_order', entityType: 'SALES_MARGIN_ASSESSMENT', entityId: row.id, documentNumber: row.document_number, oldValue: { status: row.status }, newValue: { status }, reason, requestId, branchId: row.branch_id });
  return camel(updated);
}

async function assertMarginRelease(client, doc, user) {
  if (!['QUOTATION', 'SALES_ORDER'].includes(doc.document_type)) return null;
  // Dokumen agregat legacy (tanpa document_lines) tetap dapat diproses selama
  // masa transisi. Dokumen baru dari UI selalu berbaris dan masuk kontrol.
  const lineCount = Number((await client.query('SELECT count(*) n FROM document_lines WHERE document_id=$1', [doc.id])).rows[0].n);
  if (!lineCount) return { legacyAggregate: true };
  const assessment = await assessMargin(client, { documentId: doc.id, user });
  if (!['NOT_REQUIRED', 'APPROVED'].includes(assessment.status)) throw new AppError('STATUS_INVALID', `Margin ${assessment.marginPct}% membutuhkan persetujuan Finance sebelum dokumen dapat diajukan.`, { assessmentId: assessment.id, marginPct: assessment.marginPct, marginStatus: assessment.status });
  return assessment;
}

async function calculateAvailability(client, { salesOrderId, warehouseId, user }) {
  const doc = await document(client, salesOrderId, user, ['SALES_ORDER']);
  warehouseId = warehouseId || doc.branch_id;
  permissions.assertBranchScope(user, warehouseId, 'Gudang ATP');
  const lines = (await client.query(`SELECT l.*,p.make_or_buy,p.hpp FROM document_lines l LEFT JOIN products p ON p.id=l.product_id WHERE l.document_id=$1 ORDER BY l.line_no`, [doc.id])).rows;
  if (!lines.length) throw new AppError('VALIDATION_ERROR', 'Perhitungan ATP/CTP membutuhkan baris Sales Order.');
  await client.query('UPDATE sales_availability_promises SET active=false WHERE sales_order_id=$1 AND active', [doc.id]);
  // Janji lama beserta stok yang ditahannya dilepas lebih dulu; perhitungan
  // ulang menahan kembali sesuai hasil terbaru. Tanpa ini, menghitung ATP dua
  // kali akan menahan stok dua kali.
  await stockReservations.releaseDocument(client, { documentId: doc.id, user,
    reason: 'Perhitungan ulang ATP/CTP — reservasi lama dilepas sebelum dihitung ulang.' });
  const items = [];
  for (const line of lines) {
    let onHand = 0, reserved = 0, prior = 0, leadDays = Number(doc.payload?.deliveryWeeks || 0) * 7 || 14;
    if (line.product_id) {
      // Ketersediaan dari mesin reservasi, MENGECUALIKAN reservasi Sales Order
      // ini sendiri — menghitung ulang ATP tidak boleh membuat pesanan bersaing
      // dengan stok yang sudah ditahannya sendiri.
      const stock = await stockReservations.availability(client, line.product_id, warehouseId, { excludeDocumentId: doc.id });
      onHand = stock.onHand; reserved = stock.reserved;
      prior = Number((await client.query(`SELECT COALESCE(sum(p.promised_qty),0)::float qty FROM sales_availability_promises p JOIN business_documents d ON d.id=p.sales_order_id
        JOIN document_lines l ON l.id=p.sales_order_line_id WHERE p.active AND p.sales_order_id<>$1 AND p.warehouse_id=$2 AND l.product_id=$3
        AND d.status NOT IN('CANCELLED','VOID','REJECTED','CLOSED','COMPLETED')`, [doc.id, warehouseId, line.product_id])).rows[0].qty);
      if (line.make_or_buy === 'BUY') {
        const lead = (await client.query(`SELECT min(lead_time_days) lead FROM supplier_materials WHERE product_id=$1 AND approved_status='APPROVED' AND (valid_to IS NULL OR valid_to>=current_date)`, [line.product_id])).rows[0]?.lead;
        if (lead != null) leadDays = Number(lead);
      }
    }
    const demand = Number(line.qty), available = Math.max(onHand - reserved - prior, 0), atp = Math.min(demand, available), shortage = round(Math.max(demand - atp, 0), 4);
    const source = !line.product_id ? 'MANUAL_REVIEW' : shortage <= 0 ? 'ATP' : line.make_or_buy === 'MAKE' ? 'CTP_MAKE' : 'CTP_BUY';
    const ctp = source === 'MANUAL_REVIEW' ? 0 : shortage;
    const promiseDate = source === 'MANUAL_REVIEW' ? null : new Date(`${businessDate.today()}T00:00:00Z`);
    if (promiseDate && shortage > 0) promiseDate.setUTCDate(promiseDate.getUTCDate() + Math.max(leadDays, 1));
    const snapshot = { productId: line.product_id, makeOrBuy: line.make_or_buy || null, availableBeforeDemand: round(available, 4), leadTimeDays: shortage > 0 ? leadDays : 0, basis: source === 'ATP' ? 'inventory_balance' : source === 'CTP_BUY' ? 'approved_supplier_lead_time' : source === 'CTP_MAKE' ? 'sales_delivery_horizon' : 'non_product_line' };
    // Inti perbaikan: bagian yang tersedia SEKARANG benar-benar DITAHAN untuk
    // pesanan ini. Sebelumnya ATP hanya mencatat janji, sementara stoknya bebas
    // diambil work order atau pesanan lain — janji tanggal ke pelanggan tidak
    // terlindungi sama sekali.
    if (line.product_id && atp > 0) {
      await stockReservations.reserve(client, { productId: line.product_id, warehouseId,
        documentId: doc.id, documentLineId: line.id, qty: atp, user,
        reason: `Janji ATP Sales Order ${doc.document_number} baris ${line.line_no}`,
        expiresAt: promiseDate ? new Date(promiseDate.getTime() + 30 * 86400000) : null });
    }
    const inserted = (await client.query(`INSERT INTO sales_availability_promises(id,sales_order_id,sales_order_line_id,warehouse_id,demand_qty,on_hand_qty,reserved_qty,prior_promised_qty,atp_qty,ctp_qty,promised_qty,promise_date,promise_source,calculation_snapshot,calculated_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`, [randomUUID(), doc.id, line.id, warehouseId, demand, onHand, reserved, prior, atp, ctp, round(atp + ctp, 4), promiseDate?.toISOString().slice(0, 10) || null, source, snapshot, user.id])).rows[0];
    items.push(camel(inserted));
  }
  await runtime.audit(client, { userId: user.id, action: 'CALCULATE_ATP_CTP', module: 'sales_order', entityType: 'SALES_ORDER', entityId: doc.id, documentNumber: doc.document_number, newValue: { warehouseId, lines: items.map((x) => ({ lineId: x.salesOrderLineId, atpQty: x.atpQty, ctpQty: x.ctpQty, promiseDate: x.promiseDate, source: x.promiseSource })) }, branchId: doc.branch_id });
  return { salesOrderId: doc.id, documentNumber: doc.document_number, items };
}

async function availability(client, salesOrderId, user) {
  await document(client, salesOrderId, user, ['SALES_ORDER']);
  return (await client.query(`SELECT p.*,l.line_no,l.description,l.product_id FROM sales_availability_promises p JOIN document_lines l ON l.id=p.sales_order_line_id WHERE p.sales_order_id=$1 AND p.active ORDER BY l.line_no`, [salesOrderId])).rows.map(camel);
}

async function assertAvailabilityRelease(client, doc, user) {
  if (doc.document_type !== 'SALES_ORDER') return null;
  const counts = (await client.query(`SELECT count(*)::int total,count(p.id)::int promised,count(*) FILTER(WHERE p.promised_qty>=l.qty)::int covered
    FROM document_lines l LEFT JOIN sales_availability_promises p ON p.sales_order_line_id=l.id AND p.active WHERE l.document_id=$1`, [doc.id])).rows[0];
  if (!counts.total) return { legacyAggregate: true };
  if (counts.promised !== counts.total || counts.covered !== counts.total) throw new AppError('STATUS_INVALID', 'ATP/CTP Sales Order harus dihitung dan seluruh baris harus memiliki promise sebelum diajukan.', counts);
  return counts;
}

async function createContract(client, input, user) {
  const branchId = input.branchId || user.branchId;
  permissions.assertBranchScope(user, branchId, 'Kontrak penjualan');
  const entity = (await client.query('SELECT legal_entity_id FROM branches WHERE id=$1 AND active', [branchId])).rows[0];
  if (!entity?.legal_entity_id) throw new AppError('VALIDATION_ERROR', 'Cabang kontrak belum terhubung ke Legal Entity.');
  if (!String(input.contractNumber || '').trim() || !String(input.title || '').trim()) throw new AppError('VALIDATION_ERROR', 'Nomor dan judul kontrak wajib diisi.');
  const lines = Array.isArray(input.lines) ? input.lines : [];
  if (!lines.length) throw new AppError('VALIDATION_ERROR', 'Kontrak membutuhkan minimal satu baris komitmen.');
  const ceiling = round(Number(input.ceilingAmount));
  if (!(ceiling > 0)) throw new AppError('VALIDATION_ERROR', 'Nilai plafon kontrak harus lebih dari nol.');
  const id = randomUUID();
  const row = (await client.query(`INSERT INTO sales_contracts(id,contract_number,legal_entity_id,branch_id,customer_id,title,contract_type,valid_from,valid_to,currency,ceiling_amount,terms,created_by,updated_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13) RETURNING *`, [id, String(input.contractNumber).trim().slice(0, 60), entity.legal_entity_id, branchId, input.customerId, String(input.title).trim().slice(0, 200), input.contractType || 'FRAMEWORK', input.validFrom, input.validTo, input.currency || 'IDR', ceiling, input.terms || {}, user.id])).rows[0];
  let total = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const l = lines[i], lineCeiling = round(Number(l.ceilingAmount)); total += lineCeiling;
    await client.query(`INSERT INTO sales_contract_lines(id,contract_id,line_no,product_id,description,committed_qty,ceiling_amount,uom,unit_price) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [randomUUID(), id, i + 1, l.productId || null, String(l.description || `Baris ${i + 1}`).slice(0, 1000), l.committedQty || null, lineCeiling, l.uom || null, l.unitPrice || null]);
  }
  if (round(total) > ceiling) throw new AppError('VALIDATION_ERROR', 'Total plafon baris kontrak melampaui plafon header.');
  await runtime.audit(client, { userId: user.id, action: 'CREATE', module: 'sales_order', entityType: 'SALES_CONTRACT', entityId: id, documentNumber: row.contract_number, newValue: { title: row.title, ceilingAmount: ceiling, lineCount: lines.length }, branchId });
  return camel(row);
}

async function contracts(client, user) {
  const params = [], where = permissions.CROSS_BRANCH_ROLES.includes(user.role) || user.branchScope === '*' ? 'true' : (params.push(user.branchId), `c.branch_id=$${params.length}`);
  return (await client.query(`SELECT c.*,cu.name customer_name,(SELECT count(*)::int FROM sales_contract_lines l WHERE l.contract_id=c.id) line_count FROM sales_contracts c JOIN customers cu ON cu.id=c.customer_id WHERE ${where} ORDER BY c.updated_at DESC LIMIT 200`, params)).rows.map(camel);
}

async function submitContract(client, id, user) {
  const row = (await client.query('SELECT * FROM sales_contracts WHERE id=$1 FOR UPDATE', [id])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Kontrak tidak ditemukan.'); permissions.assertBranchScope(user, row.branch_id);
  if (row.status !== 'DRAFT') throw new AppError('STATUS_INVALID', 'Hanya kontrak DRAFT yang dapat diajukan.');
  return camel((await client.query(`UPDATE sales_contracts SET status='PENDING_APPROVAL',submitted_at=now(),version=version+1,updated_at=now(),updated_by=$2 WHERE id=$1 RETURNING *`, [id, user.id])).rows[0]);
}

async function decideContract(client, { id, approve, reason, user, requestId }) {
  reason = requireReason(reason); const row = (await client.query('SELECT * FROM sales_contracts WHERE id=$1 FOR UPDATE', [id])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Kontrak tidak ditemukan.'); permissions.assertBranchScope(user, row.branch_id);
  if (row.status !== 'PENDING_APPROVAL') throw new AppError('STATUS_INVALID', 'Kontrak tidak sedang menunggu approval.');
  if (row.created_by === user.id) throw new AppError('SOD_CONFLICT', 'Pembuat kontrak tidak boleh menyetujui kontraknya sendiri.');
  const status = approve ? 'ACTIVE' : 'REJECTED';
  const updated = (await client.query(`UPDATE sales_contracts SET status=$2,approved_at=CASE WHEN $3 THEN now() END,approved_by=CASE WHEN $3 THEN $4::uuid END,decision_reason=$5,version=version+1,updated_at=now(),updated_by=$4::uuid WHERE id=$1 RETURNING *`, [id, status, approve, user.id, reason])).rows[0];
  await runtime.audit(client, { userId: user.id, action: approve ? 'APPROVE' : 'REJECT', module: 'sales_order', entityType: 'SALES_CONTRACT', entityId: id, documentNumber: row.contract_number, oldValue: { status: row.status }, newValue: { status }, reason, requestId, branchId: row.branch_id });
  return camel(updated);
}

async function releaseContract(client, { id, salesOrderId, contractLineId, salesOrderLineId, releasedQty, releasedAmount, user, requestId }) {
  const contract = (await client.query('SELECT * FROM sales_contracts WHERE id=$1 FOR UPDATE', [id])).rows[0];
  if (!contract) throw new AppError('RESOURCE_NOT_FOUND', 'Kontrak tidak ditemukan.'); permissions.assertBranchScope(user, contract.branch_id);
  if (contract.status !== 'ACTIVE' || contract.valid_from > businessDate.today() || contract.valid_to < businessDate.today()) throw new AppError('STATUS_INVALID', 'Kontrak tidak aktif pada tanggal bisnis saat ini.');
  const order = await document(client, salesOrderId, user, ['SALES_ORDER']);
  if (order.party_id !== contract.customer_id) throw new AppError('VALIDATION_ERROR', 'Pelanggan Sales Order tidak cocok dengan kontrak.');
  const amount = round(Number(releasedAmount)); if (!(amount > 0) || Number(contract.consumed_amount) + amount > Number(contract.ceiling_amount)) throw new AppError('VALIDATION_ERROR', 'Release melampaui sisa plafon kontrak.');
  let line = null;
  if (contractLineId) {
    line = (await client.query('SELECT * FROM sales_contract_lines WHERE id=$1 AND contract_id=$2 FOR UPDATE', [contractLineId, id])).rows[0];
    if (!line) throw new AppError('RESOURCE_NOT_FOUND', 'Baris kontrak tidak ditemukan.');
    const qty = releasedQty == null ? null : Number(releasedQty);
    if (Number(line.released_amount) + amount > Number(line.ceiling_amount) || (qty != null && line.committed_qty != null && Number(line.released_qty) + qty > Number(line.committed_qty))) throw new AppError('VALIDATION_ERROR', 'Release melampaui sisa baris kontrak.');
    await client.query('UPDATE sales_contract_lines SET released_amount=released_amount+$2,released_qty=released_qty+COALESCE($3,0) WHERE id=$1', [line.id, amount, qty]);
  }
  if (salesOrderLineId) {
    const orderLine = (await client.query('SELECT * FROM document_lines WHERE id=$1 AND document_id=$2', [salesOrderLineId, salesOrderId])).rows[0];
    if (!orderLine) throw new AppError('VALIDATION_ERROR', 'Baris Sales Order tidak berada pada order release.');
    if (line?.product_id && orderLine.product_id && line.product_id !== orderLine.product_id) throw new AppError('VALIDATION_ERROR', 'Produk baris kontrak tidak cocok dengan baris Sales Order.');
  }
  const row = (await client.query(`INSERT INTO sales_contract_releases(id,contract_id,contract_line_id,sales_order_id,sales_order_line_id,released_qty,released_amount,released_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [randomUUID(), id, contractLineId || null, salesOrderId, salesOrderLineId || null, releasedQty || null, amount, user.id])).rows[0];
  await client.query('UPDATE sales_contracts SET consumed_amount=consumed_amount+$2,version=version+1,updated_at=now(),updated_by=$3 WHERE id=$1', [id, amount, user.id]);
  await runtime.audit(client, { userId: user.id, action: 'RELEASE', module: 'sales_order', entityType: 'SALES_CONTRACT', entityId: id, documentNumber: contract.contract_number, newValue: { salesOrderId, releasedAmount: amount, releasedQty }, requestId, branchId: contract.branch_id });
  return camel(row);
}

async function createMilestones(client, { salesOrderId, milestones, user }) {
  const doc = await document(client, salesOrderId, user, ['SALES_ORDER']);
  if (!Array.isArray(milestones) || !milestones.length) throw new AppError('VALIDATION_ERROR', 'Jadwal milestone wajib memiliki baris.');
  const totalPct = round(milestones.reduce((n, x) => n + Number(x.billingPct), 0), 4);
  if (Math.abs(totalPct - 100) > 0.0001) throw new AppError('VALIDATION_ERROR', 'Total persentase milestone wajib tepat 100%.');
  const existing = Number((await client.query('SELECT count(*) n FROM sales_milestone_schedules WHERE sales_order_id=$1', [doc.id])).rows[0].n);
  if (existing) throw new AppError('DOCUMENT_CONFLICT', 'Jadwal milestone untuk Sales Order ini sudah tersedia.');
  const items = [];
  for (let i = 0; i < milestones.length; i += 1) {
    const m = milestones[i], amount = i === milestones.length - 1 ? round(Number(doc.amount) - items.reduce((n, x) => n + Number(x.billingAmount), 0)) : round(Number(doc.amount) * Number(m.billingPct) / 100);
    items.push(camel((await client.query(`INSERT INTO sales_milestone_schedules(id,sales_order_id,milestone_no,description,billing_pct,billing_amount,trigger_type,planned_date,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [randomUUID(), doc.id, i + 1, String(m.description || `Milestone ${i + 1}`).slice(0, 200), Number(m.billingPct), amount, m.triggerType || 'DATE', m.plannedDate || null, user.id])).rows[0]));
  }
  return items;
}

async function milestones(client, salesOrderId, user) { await document(client, salesOrderId, user, ['SALES_ORDER']); return (await client.query('SELECT * FROM sales_milestone_schedules WHERE sales_order_id=$1 ORDER BY milestone_no', [salesOrderId])).rows.map(camel); }

async function markMilestoneReady(client, { milestoneId, user }) {
  const row = (await client.query(`SELECT m.*,d.branch_id FROM sales_milestone_schedules m JOIN business_documents d ON d.id=m.sales_order_id WHERE m.id=$1 FOR UPDATE OF m`, [milestoneId])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Milestone tidak ditemukan.'); permissions.assertBranchScope(user, row.branch_id);
  if (row.status !== 'PLANNED') throw new AppError('STATUS_INVALID', 'Hanya milestone PLANNED yang dapat ditandai siap tagih.');
  if (row.created_by === user.id) throw new AppError('SOD_CONFLICT', 'Pembuat jadwal tidak boleh mengonfirmasi milestone sendiri.');
  return camel((await client.query(`UPDATE sales_milestone_schedules SET status='READY',ready_at=now(),ready_by=$2 WHERE id=$1 RETURNING *`, [milestoneId, user.id])).rows[0]);
}

async function invoiceMilestone(client, { milestoneId, user, requestId }) {
  const m = (await client.query(`SELECT m.*,d.branch_id,d.party_id,d.party_name,d.title,d.document_number,d.transaction_currency FROM sales_milestone_schedules m JOIN business_documents d ON d.id=m.sales_order_id WHERE m.id=$1 FOR UPDATE OF m`, [milestoneId])).rows[0];
  if (!m) throw new AppError('RESOURCE_NOT_FOUND', 'Milestone tidak ditemukan.'); permissions.assertBranchScope(user, m.branch_id);
  if (m.status === 'INVOICED') return { milestone: camel(m), invoice: camel((await client.query('SELECT * FROM business_documents WHERE id=$1', [m.invoice_document_id])).rows[0]), idempotentReplay: true };
  if (m.status !== 'READY') throw new AppError('STATUS_INVALID', 'Milestone harus READY sebelum invoice dibuat.');
  const invoice = await runtime.createDocument(client, { type: 'INVOICE', user: { ...user, branchId: m.branch_id }, title: `${m.description} — ${m.document_number}`, amount: Number(m.billing_amount), partyId: m.party_id, partyName: m.party_name, transactionCurrency: m.transaction_currency, payload: { milestoneScheduleId: m.id, salesOrderId: m.sales_order_id, salesOrderNumber: m.document_number, billingPct: Number(m.billing_pct), lines: [{ description: m.description, qty: 1, unitPrice: Number(m.billing_amount), taxPct: 0 }] }, requestId });
  await client.query(`INSERT INTO document_relations(parent_document_id,child_document_id,relation_type,created_by) VALUES($1,$2,'ORDER_TO_INVOICE',$3)`, [m.sales_order_id, invoice.id, user.id]);
  const milestone = (await client.query(`UPDATE sales_milestone_schedules SET status='INVOICED',invoice_document_id=$2,invoiced_at=now() WHERE id=$1 RETURNING *`, [m.id, invoice.id])).rows[0];
  return { milestone: camel(milestone), invoice };
}

async function refreshBackorders(client, salesOrderId, user) {
  const doc = await document(client, salesOrderId, user, ['SALES_ORDER']);
  const rows = (await client.query(`SELECT f.*,p.warehouse_id,p.atp_qty,p.promise_date FROM sales_order_line_fulfilment f LEFT JOIN sales_availability_promises p ON p.sales_order_line_id=f.line_id AND p.active WHERE f.sales_order_id=$1`, [salesOrderId])).rows;
  const items = [];
  for (const r of rows) {
    const remaining = Number(r.remaining_qty), allocated = Math.min(remaining, Number(r.atp_qty || 0));
    const status = remaining <= 0 ? 'FULFILLED' : allocated <= 0 ? 'OPEN' : allocated < remaining ? 'PARTIALLY_ALLOCATED' : 'ALLOCATED';
    const snapshot = { orderedQty: Number(r.ordered_qty), deliveredQty: Number(r.delivered_qty), remainingQty: remaining, atpQty: Number(r.atp_qty || 0), refreshedAt: new Date().toISOString() };
    const row = (await client.query(`INSERT INTO sales_backorders(id,sales_order_id,sales_order_line_id,warehouse_id,backorder_qty,allocated_qty,promised_date,status,source_snapshot,updated_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(sales_order_line_id) DO UPDATE SET warehouse_id=EXCLUDED.warehouse_id,backorder_qty=EXCLUDED.backorder_qty,allocated_qty=EXCLUDED.allocated_qty,promised_date=EXCLUDED.promised_date,status=EXCLUDED.status,source_snapshot=EXCLUDED.source_snapshot,updated_at=now(),updated_by=EXCLUDED.updated_by RETURNING *`, [randomUUID(), doc.id, r.line_id, r.warehouse_id || null, remaining, allocated, r.promise_date || null, status, snapshot, user.id])).rows[0];
    items.push(camel(row));
  }
  return items;
}

async function backorders(client, user) {
  const params = [], where = permissions.CROSS_BRANCH_ROLES.includes(user.role) || user.branchScope === '*' ? 'true' : (params.push(user.branchId), `d.branch_id=$${params.length}`);
  return (await client.query(`SELECT b.*,d.document_number,d.party_name,l.line_no,l.description FROM sales_backorders b JOIN business_documents d ON d.id=b.sales_order_id JOIN document_lines l ON l.id=b.sales_order_line_id WHERE ${where} ORDER BY CASE WHEN b.status='OPEN' THEN 0 ELSE 1 END,b.promised_date NULLS LAST,d.document_number,l.line_no`, params)).rows.map(camel);
}

async function overview(client, user) {
  const params = [], scope = permissions.CROSS_BRANCH_ROLES.includes(user.role) || user.branchScope === '*' ? 'true' : (params.push(user.branchId), `d.branch_id=$${params.length}`);
  const row = (await client.query(`SELECT
    count(DISTINCT d.id) FILTER(WHERE d.document_type='SALES_ORDER' AND d.status NOT IN('CANCELLED','VOID','REJECTED','CLOSED','COMPLETED'))::int open_orders,
    count(DISTINCT a.id) FILTER(WHERE a.status='PENDING_APPROVAL')::int margin_pending,
    count(DISTINCT b.id) FILTER(WHERE b.status IN('OPEN','PARTIALLY_ALLOCATED'))::int backorder_lines,
    count(DISTINCT m.id) FILTER(WHERE m.status='READY')::int milestones_ready
    FROM business_documents d LEFT JOIN sales_margin_assessments a ON a.document_id=d.id LEFT JOIN sales_backorders b ON b.sales_order_id=d.id LEFT JOIN sales_milestone_schedules m ON m.sales_order_id=d.id WHERE ${scope}`, params)).rows[0];
  const contractParams = [], contractScope = permissions.CROSS_BRANCH_ROLES.includes(user.role) || user.branchScope === '*' ? 'true' : (contractParams.push(user.branchId), `branch_id=$${contractParams.length}`);
  row.active_contracts = Number((await client.query(`SELECT count(*) n FROM sales_contracts WHERE ${contractScope} AND status='ACTIVE' AND valid_to>=current_date`, contractParams)).rows[0].n);
  const detailParams = [], detailScope = permissions.CROSS_BRANCH_ROLES.includes(user.role) || user.branchScope === '*' ? 'true' : (detailParams.push(user.branchId), `d.branch_id=$${detailParams.length}`);
  const marginItems = (await client.query(`SELECT a.*,d.document_number,d.party_name,d.branch_id FROM sales_margin_assessments a JOIN business_documents d ON d.id=a.document_id WHERE ${detailScope} AND a.status='PENDING_APPROVAL' ORDER BY a.requested_at LIMIT 50`, detailParams)).rows.map(camel);
  const readyMilestones = (await client.query(`SELECT m.*,d.document_number,d.party_name,d.branch_id FROM sales_milestone_schedules m JOIN business_documents d ON d.id=m.sales_order_id WHERE ${detailScope} AND m.status='READY' ORDER BY m.planned_date NULLS LAST,m.milestone_no LIMIT 50`, detailParams)).rows.map(camel);
  return { ...camel(row), marginItems, readyMilestones };
}

// Sales Command Center (order-to-cash cockpit): funnel per tahap, KPI revenue/
// AR/win-rate, tren 6 bulan, top customer, aging piutang. Ter-scope cabang.
async function salesDashboard(client, user) {
  const glob = permissions.CROSS_BRANCH_ROLES.includes(user.role) || user.branchScope === '*';
  const P = glob ? [] : [user.branchId];
  const S = glob ? 'true' : 'branch_id=$1';
  const PAID = "COALESCE(NULLIF(payload->>'paid','')::numeric,0)";
  const funnelRows = (await client.query(`SELECT document_type dt,
      count(*) FILTER (WHERE status NOT IN ('VOID','CANCELLED'))::int c,
      COALESCE(sum(amount) FILTER (WHERE status NOT IN ('VOID','CANCELLED')),0)::bigint v,
      count(*) FILTER (WHERE status NOT IN ('VOID','CANCELLED','REJECTED','COMPLETED','CLOSED','EXPIRED','ARCHIVED'))::int oc,
      COALESCE(sum(amount) FILTER (WHERE status NOT IN ('VOID','CANCELLED','REJECTED','COMPLETED','CLOSED','EXPIRED','ARCHIVED')),0)::bigint ov
    FROM business_documents WHERE ${S} AND document_type IN ('CUSTOMER_INQUIRY','QUOTATION','SALES_ORDER','DELIVERY','INVOICE') GROUP BY 1`, P)).rows;
  const fm = {}; funnelRows.forEach((r) => { fm[r.dt] = r; });
  const st = (dt) => { const r = fm[dt] || {}; return { count: r.c || 0, value: Number(r.v || 0), openCount: r.oc || 0, openValue: Number(r.ov || 0) }; };
  const funnel = [
    { stage: 'inquiry', label: 'Inquiry', ...st('CUSTOMER_INQUIRY') },
    { stage: 'quotation', label: 'Penawaran', ...st('QUOTATION') },
    { stage: 'sales_order', label: 'Sales Order', ...st('SALES_ORDER') },
    { stage: 'delivery', label: 'Pengiriman', ...st('DELIVERY') },
    { stage: 'invoice', label: 'Invoice', ...st('INVOICE') }
  ];
  const inv = (await client.query(`SELECT COALESCE(sum(amount),0)::bigint invoiced, COALESCE(sum(${PAID}),0)::bigint collected,
      COALESCE(sum(amount-${PAID}) FILTER (WHERE status<>'CLOSED'),0)::bigint outstanding,
      COALESCE(sum(amount-${PAID}) FILTER (WHERE status<>'CLOSED' AND due_date<current_date),0)::bigint overdue
    FROM business_documents WHERE ${S} AND document_type='INVOICE' AND status NOT IN ('VOID','CANCELLED','REJECTED','DRAFT')`, P)).rows[0];
  const q = (await client.query(`SELECT count(*) FILTER (WHERE status IN ('COMPLETED','CLOSED'))::int won,
      count(*) FILTER (WHERE status IN ('REJECTED','EXPIRED'))::int lost,
      count(*) FILTER (WHERE status NOT IN ('VOID','CANCELLED','DRAFT'))::int total
    FROM business_documents WHERE ${S} AND document_type='QUOTATION'`, P)).rows[0];
  const pipe = (await client.query(`SELECT COALESCE(sum(amount),0)::bigint v, count(*)::int c FROM business_documents
    WHERE ${S} AND document_type IN ('QUOTATION','SALES_ORDER') AND status NOT IN ('VOID','CANCELLED','REJECTED','COMPLETED','CLOSED','EXPIRED','ARCHIVED')`, P)).rows[0];
  const so = (await client.query(`SELECT count(*)::int c, COALESCE(avg(amount),0)::bigint avg FROM business_documents
    WHERE ${S} AND document_type='SALES_ORDER' AND status NOT IN ('VOID','CANCELLED','REJECTED','COMPLETED','CLOSED')`, P)).rows[0];
  const trend = (await client.query(`SELECT to_char(date_trunc('month',created_at),'YYYY-MM') ym, COALESCE(sum(amount),0)::bigint v
    FROM business_documents WHERE ${S} AND document_type='INVOICE' AND status NOT IN ('VOID','CANCELLED','REJECTED','DRAFT')
      AND created_at>=date_trunc('month',current_date)-interval '5 months' GROUP BY 1 ORDER BY 1`, P)).rows.map((r) => ({ month: r.ym, value: Number(r.v) }));
  const topCustomers = (await client.query(`SELECT party_name name, COALESCE(sum(amount),0)::bigint v, count(*)::int c
    FROM business_documents WHERE ${S} AND document_type='INVOICE' AND status NOT IN ('VOID','CANCELLED','REJECTED','DRAFT') AND party_name IS NOT NULL
    GROUP BY 1 ORDER BY 2 DESC LIMIT 5`, P)).rows.map((r) => ({ name: r.name, value: Number(r.v), invoices: r.c }));
  const ag = (await client.query(`SELECT COALESCE(sum(due) FILTER (WHERE b=0),0)::bigint c0, COALESCE(sum(due) FILTER (WHERE b=1),0)::bigint c1,
      COALESCE(sum(due) FILTER (WHERE b=2),0)::bigint c2, COALESCE(sum(due) FILTER (WHERE b=3),0)::bigint c3
    FROM (SELECT (amount-${PAID}) due, CASE WHEN due_date>=current_date THEN 0 WHEN due_date>=current_date-30 THEN 1 WHEN due_date>=current_date-60 THEN 2 ELSE 3 END b
      FROM business_documents WHERE ${S} AND document_type='INVOICE' AND status NOT IN ('CLOSED','VOID','CANCELLED','REJECTED','DRAFT') AND (amount-${PAID})>0) t`, P)).rows[0];
  const recent = (await client.query(`SELECT document_number, document_type, party_name, amount::bigint, status, created_at
    FROM business_documents WHERE ${S} AND document_type IN ('CUSTOMER_INQUIRY','QUOTATION','SALES_ORDER','DELIVERY','INVOICE') AND status NOT IN ('VOID','CANCELLED')
    ORDER BY created_at DESC LIMIT 8`, P)).rows.map(camel);
  const decided = q.won + q.lost;
  return {
    funnel,
    kpi: { invoiced: Number(inv.invoiced), collected: Number(inv.collected), outstanding: Number(inv.outstanding), overdue: Number(inv.overdue),
      openPipeline: Number(pipe.v), openPipelineCount: pipe.c, winRate: decided ? Math.round(q.won / decided * 100) : 0,
      quotationsWon: q.won, quotationsLost: q.lost, quotationsTotal: q.total, activeOrders: so.c, avgOrder: Number(so.avg) },
    trend, topCustomers,
    aging: { current: Number(ag.c0), d1_30: Number(ag.c1), d31_60: Number(ag.c2), d60p: Number(ag.c3) },
    recent, asOf: new Date().toISOString()
  };
}

module.exports = { assessMargin, marginStatus, decideMargin, assertMarginRelease, calculateAvailability, availability, assertAvailabilityRelease, createContract, contracts, submitContract, decideContract, releaseContract, createMilestones, milestones, markMilestoneReady, invoiceMilestone, refreshBackorders, backorders, overview, salesDashboard };
