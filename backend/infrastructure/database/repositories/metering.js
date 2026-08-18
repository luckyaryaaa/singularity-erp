'use strict';
// Singularity Metering & Platform Invoicing (control-plane, global tables).
//
// Platform merekam pemakaian per tenant lalu MENERBITKAN tagihan bulanan:
//   base langganan (plan.price_monthly) + overage metered (pemakaian di atas
//   kuota paket) + PPN. Semua fungsi mutasi butuh operator platform; tabelnya
//   global (tanpa RLS tenant), dibaca dalam konteks platform (app.is_platform).
//
// Metrik: seats & documents & storage dihitung dari tabel sumber (app_users,
// business_documents, file_metadata) saat generate; api_calls dari event eksplisit
// (tenant_usage_events). Idempoten per (tenant, periode) via UNIQUE constraint.
const { AppError } = require('../../../core/errors');
const cp = require('./control-plane');
const billing = require('./billing');

const METRICS = ['seats', 'documents', 'storage_gb', 'api_calls'];
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Periode 'YYYY-MM' → { ym, periodStart(date), periodEnd(exclusive date) }.
function normalizePeriod(period) {
  const now = new Date();
  const ym = /^\d{4}-\d{2}$/.test(period || '')
    ? period
    : `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  return { ym, periodStart: `${ym}-01` };
}

// Pemakaian aktual per metrik dalam satu periode (ter-scope tenant eksplisit —
// query dijalankan dalam konteks platform, jadi filter tenant_id manual).
async function computeUsage(client, tenantId, periodStart, periodEnd) {
  const seats = Number((await client.query(
    'SELECT count(*)::int n FROM app_users WHERE tenant_id=$1 AND active', [tenantId])).rows[0].n);
  const documents = Number((await client.query(
    'SELECT count(*)::int n FROM business_documents WHERE tenant_id=$1 AND created_at >= $2 AND created_at < $3',
    [tenantId, periodStart, periodEnd])).rows[0].n);
  const storageBytes = Number((await client.query(
    'SELECT COALESCE(sum(size_bytes),0)::bigint n FROM file_metadata WHERE tenant_id=$1 AND NOT is_deleted',
    [tenantId])).rows[0].n);
  const api_calls = Number((await client.query(
    "SELECT COALESCE(sum(quantity),0)::numeric n FROM tenant_usage_events WHERE tenant_id=$1 AND metric='api_calls' AND occurred_at >= $2 AND occurred_at < $3",
    [tenantId, periodStart, periodEnd])).rows[0].n);
  return { seats, documents, storage_gb: round2(storageBytes / 1e9), api_calls };
}

// Ringkasan pemakaian + kuota paket (read-only) untuk dashboard operator.
async function usageSummary(client, tenantId, period) {
  const { ym, periodStart } = normalizePeriod(period);
  const periodEnd = (await client.query("SELECT ($1::date + interval '1 month')::date pe", [periodStart])).rows[0].pe;
  const usage = await computeUsage(client, tenantId, periodStart, periodEnd);
  const sub = await billing.getSubscription(client, tenantId);
  const meters = sub
    ? (await client.query('SELECT metric,label,unit,included_qty,unit_price FROM plan_meters WHERE plan_id=$1 ORDER BY metric', [sub.plan_id])).rows
    : [];
  return { period: ym, periodStart, periodEnd, usage, plan: sub ? sub.plan_code : null, meters };
}

// Catat event pemakaian eksplisit (mis. api_calls) untuk tenant.
async function recordUsage(client, user, tenantId, { metric, quantity = 1, source = 'manual', meta = {} } = {}) {
  await cp.assertPlatformOperator(client, user);
  if (!METRICS.includes(metric)) throw new AppError('VALIDATION_ERROR', `Metric tidak valid (${METRICS.join('/')}).`);
  if (Number(quantity) < 0) throw new AppError('VALIDATION_ERROR', 'quantity tidak boleh negatif.');
  if (!(await client.query('SELECT 1 FROM tenants WHERE id=$1', [tenantId])).rowCount) throw new AppError('RESOURCE_NOT_FOUND', 'Tenant tidak ditemukan.');
  const row = (await client.query(
    'INSERT INTO tenant_usage_events(tenant_id,metric,quantity,source,meta) VALUES($1,$2,$3,$4,$5) RETURNING id,occurred_at',
    [tenantId, metric, quantity, source, JSON.stringify(meta || {})])).rows[0];
  return { id: String(row.id), tenantId, metric, quantity: Number(quantity), occurredAt: row.occurred_at };
}

// Terbitkan tagihan platform untuk satu tenant + periode. Idempoten: bila sudah
// ada tagihan periode itu, kembalikan yang lama (tak menggandakan).
async function generateInvoice(client, user, tenantId, { period } = {}) {
  await cp.assertPlatformOperator(client, user);
  const tenant = (await client.query('SELECT code,name FROM tenants WHERE id=$1', [tenantId])).rows[0];
  if (!tenant) throw new AppError('RESOURCE_NOT_FOUND', 'Tenant tidak ditemukan.');
  const sub = await billing.getSubscription(client, tenantId);
  if (!sub) throw new AppError('VALIDATION_ERROR', 'Tenant belum memiliki langganan — tidak bisa ditagih.');

  const { ym, periodStart } = normalizePeriod(period);
  const periodEnd = (await client.query("SELECT ($1::date + interval '1 month')::date pe", [periodStart])).rows[0].pe;

  const existing = (await client.query('SELECT id FROM platform_invoices WHERE tenant_id=$1 AND period_start=$2', [tenantId, periodStart])).rows[0];
  if (existing) return { ...(await getInvoice(client, existing.id)), reused: true };

  const meters = (await client.query('SELECT metric,label,unit,included_qty,unit_price FROM plan_meters WHERE plan_id=$1 ORDER BY metric', [sub.plan_id])).rows;
  const usage = await computeUsage(client, tenantId, periodStart, periodEnd);

  const lines = [];
  const base = sub.price_monthly == null ? 0 : Number(sub.price_monthly);
  lines.push({
    kind: 'subscription', description: `Langganan ${sub.plan_name} · ${ym}`, metric: null,
    quantity: 1, unit_price: base, amount: round2(base), sort_order: 0
  });
  let so = 1;
  for (const mt of meters) {
    const used = Number(usage[mt.metric] || 0);
    const over = round2(Math.max(0, used - Number(mt.included_qty)));
    if (over > 0 && Number(mt.unit_price) > 0) {
      lines.push({
        kind: 'overage',
        description: `Overage ${mt.label}: ${over} ${mt.unit} (kuota ${mt.included_qty})`,
        metric: mt.metric, quantity: over, unit_price: Number(mt.unit_price),
        amount: round2(over * Number(mt.unit_price)), sort_order: so++
      });
    }
  }

  const subtotal = round2(lines.reduce((s, l) => s + l.amount, 0));
  const taxRate = 0.11;
  const tax = round2(subtotal * taxRate);
  const total = round2(subtotal + tax);
  const invoiceNumber = `SG-${ym.replace('-', '')}-${String(tenant.code).toUpperCase()}`;

  const inv = (await client.query(
    `INSERT INTO platform_invoices(tenant_id,invoice_number,period_start,period_end,currency,subtotal,tax_rate,tax,total,status,meta)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'issued',$10) RETURNING id`,
    [tenantId, invoiceNumber, periodStart, periodEnd, sub.currency || 'IDR', subtotal, taxRate, tax, total,
      JSON.stringify({ usage, plan: sub.plan_code })])).rows[0];
  for (const l of lines) {
    await client.query(
      `INSERT INTO platform_invoice_lines(invoice_id,kind,description,metric,quantity,unit_price,amount,sort_order)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [inv.id, l.kind, l.description, l.metric, l.quantity, l.unit_price, l.amount, l.sort_order]);
  }
  // Jejak audit invoice ditulis oleh route (audit_logs, GENERATE_INVOICE) —
  // tidak digandakan ke tenant_provisioning_log (khusus aksi provisioning).
  return { ...(await getInvoice(client, inv.id)), reused: false };
}

async function getInvoice(client, invoiceId) {
  const inv = (await client.query('SELECT * FROM platform_invoices WHERE id=$1', [invoiceId])).rows[0];
  if (!inv) return null;
  inv.lines = (await client.query(
    'SELECT kind,description,metric,quantity,unit_price,amount,sort_order FROM platform_invoice_lines WHERE invoice_id=$1 ORDER BY sort_order',
    [invoiceId])).rows;
  return inv;
}

async function listInvoices(client, tenantId) {
  return (await client.query(
    `SELECT id,invoice_number,period_start,period_end,currency,subtotal,tax,total,status,issued_at,paid_at
     FROM platform_invoices WHERE tenant_id=$1 ORDER BY period_start DESC`, [tenantId])).rows;
}

async function markInvoicePaid(client, user, invoiceId) {
  await cp.assertPlatformOperator(client, user);
  const inv = (await client.query(
    "UPDATE platform_invoices SET status='paid', paid_at=now(), version=version+1 WHERE id=$1 AND status<>'void' RETURNING id",
    [invoiceId])).rows[0];
  if (!inv) throw new AppError('RESOURCE_NOT_FOUND', 'Invoice tidak ditemukan atau sudah void.');
  return getInvoice(client, invoiceId);
}

async function voidInvoice(client, user, invoiceId) {
  await cp.assertPlatformOperator(client, user);
  const inv = (await client.query(
    "UPDATE platform_invoices SET status='void', version=version+1 WHERE id=$1 AND status<>'paid' RETURNING id",
    [invoiceId])).rows[0];
  if (!inv) throw new AppError('VALIDATION_ERROR', 'Invoice tidak ditemukan atau sudah paid (tak bisa void).');
  return getInvoice(client, invoiceId);
}

module.exports = {
  METRICS, computeUsage, usageSummary, recordUsage,
  generateInvoice, getInvoice, listInvoices, markInvoicePaid, voidInvoice
};
