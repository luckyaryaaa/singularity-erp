'use strict';
// Pricing condition engine (Stage 1) — §8.2. Menentukan harga jual dari CONDITION
// RECORDS (price list per pelanggan/produk/kategori, skala kuantitas, diskon/
// surcharge ber-validity) alih-alih entri manual. Resolusi server-authoritative;
// klien hanya meminta, tidak menetapkan. Rebate & komisi = stage berikutnya.
const { randomUUID } = require('node:crypto');
const { AppError } = require('../../../core/errors');
const permissions = require('../../../core/permissions');
const runtime = require('./runtime');
const businessDate = require('../../../core/business-date');

const TYPES = ['BASE_PRICE', 'DISCOUNT_PCT', 'DISCOUNT_AMT', 'SURCHARGE_PCT'];
const round = (n) => Math.round(Number(n || 0) * 10000) / 10000;
const camel = runtime.camel;

// Legal entity yang boleh dikelola pengguna: default dari cabangnya; entity lain
// hanya untuk peran lintas cabang.
async function resolveLegalEntity(client, user, requested) {
  const own = (await client.query('SELECT legal_entity_id FROM branches WHERE id=$1', [user.branchId])).rows[0]?.legal_entity_id;
  if (!requested || String(requested) === String(own)) {
    if (!own) throw new AppError('VALIDATION_ERROR', 'Cabang Anda belum tertaut ke legal entity.');
    return own;
  }
  const crossBranch = permissions.CROSS_BRANCH_ROLES.includes(user.role) || user.branchScope === '*';
  if (!crossBranch) throw new AppError('PERMISSION_DENIED', 'Anda tidak berwenang atas legal entity tersebut.');
  const exists = (await client.query('SELECT 1 FROM legal_entities WHERE id=$1', [requested])).rows[0];
  if (!exists) throw new AppError('RESOURCE_NOT_FOUND', 'Legal entity tidak ditemukan.');
  return requested;
}

async function createCondition(client, input, user, requestId) {
  permissions.assertPermission(user, 'quotation.edit');
  const type = String(input.conditionType || '').toUpperCase();
  if (!TYPES.includes(type)) throw new AppError('VALIDATION_ERROR', `Jenis kondisi tidak dikenal: ${input.conditionType}.`, { allowed: TYPES });
  if (!input.productId && !input.partyId && !input.productCategory) {
    throw new AppError('VALIDATION_ERROR', 'Kondisi harga wajib menyebut minimal satu: produk, pelanggan, atau kategori.');
  }
  const amount = round(input.amount);
  if (!(amount >= 0)) throw new AppError('VALIDATION_ERROR', 'Nilai kondisi tidak boleh negatif.');
  if (type.endsWith('_PCT') && amount > 100) throw new AppError('VALIDATION_ERROR', 'Persentase kondisi maksimal 100.');
  const legalEntityId = await resolveLegalEntity(client, user, input.legalEntityId);
  const minQty = input.minQty ? round(input.minQty) : 0;
  if (minQty < 0) throw new AppError('VALIDATION_ERROR', 'Skala kuantitas tidak boleh negatif.');
  const from = input.effectiveFrom || businessDate.today();
  if (input.effectiveTo && input.effectiveTo < from) throw new AppError('VALIDATION_ERROR', 'Tanggal berakhir mendahului tanggal mulai.');
  if (input.productId) {
    const p = (await client.query('SELECT 1 FROM products WHERE id=$1', [input.productId])).rows[0];
    if (!p) throw new AppError('RESOURCE_NOT_FOUND', 'Produk tidak ditemukan.');
  }
  const id = randomUUID();
  const row = (await client.query(
    `INSERT INTO pricing_conditions
       (id,legal_entity_id,condition_type,product_id,party_id,product_category,min_qty,amount,currency,priority,effective_from,effective_to,notes,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [id, legalEntityId, type, input.productId || null, input.partyId || null,
      input.productCategory ? String(input.productCategory).slice(0, 80) : null,
      minQty, amount, (input.currency || 'IDR').toUpperCase().slice(0, 3),
      Number.isInteger(input.priority) ? input.priority : 0, from, input.effectiveTo || null,
      input.notes ? String(input.notes).slice(0, 500) : null, user.id])).rows[0];
  await runtime.audit(client, { userId: user.id, action: 'CREATE', module: 'quotation',
    entityType: 'PRICING_CONDITION', entityId: id,
    newValue: { type, amount, productId: input.productId || null, partyId: input.partyId || null, category: input.productCategory || null, minQty, from },
    requestId, branchId: user.branchId });
  return camel(row);
}

async function listConditions(client, user, { legalEntityId = null, productId = null, partyId = null, status = 'ACTIVE' } = {}) {
  permissions.assertPermission(user, 'quotation.view');
  const scope = await resolveLegalEntity(client, user, legalEntityId);
  const params = [scope]; let where = 'legal_entity_id=$1';
  if (status && status.toUpperCase() !== 'ALL') { params.push(status.toUpperCase()); where += ` AND status=$${params.length}`; }
  if (productId) { params.push(productId); where += ` AND product_id=$${params.length}`; }
  if (partyId) { params.push(partyId); where += ` AND party_id=$${params.length}`; }
  const rows = (await client.query(
    `SELECT pc.*, p.code product_code, p.name product_name
     FROM pricing_conditions pc LEFT JOIN products p ON p.id=pc.product_id
     WHERE ${where} ORDER BY priority DESC, condition_type, effective_from DESC`, params)).rows;
  return { legalEntityId: scope, items: rows.map(camel) };
}

async function deactivateCondition(client, { id, expectedVersion, user, requestId }) {
  permissions.assertPermission(user, 'quotation.edit');
  const row = (await client.query('SELECT * FROM pricing_conditions WHERE id=$1 FOR UPDATE', [id])).rows[0];
  if (!row) throw new AppError('RESOURCE_NOT_FOUND', 'Kondisi harga tidak ditemukan.');
  await resolveLegalEntity(client, user, row.legal_entity_id);
  if (Number(expectedVersion) !== Number(row.version)) {
    throw new AppError('DOCUMENT_CONFLICT', `Versi kondisi Anda ${expectedVersion}, versi terbaru ${row.version}.`, { currentVersion: Number(row.version) });
  }
  if (row.status !== 'ACTIVE') throw new AppError('STATUS_INVALID', `Kondisi berstatus ${row.status} tidak dapat dinonaktifkan.`);
  const updated = (await client.query(
    `UPDATE pricing_conditions SET status='INACTIVE',version=version+1 WHERE id=$1 AND version=$2 RETURNING *`,
    [id, row.version])).rows[0];
  if (!updated) throw new AppError('DOCUMENT_CONFLICT', 'Kondisi berubah saat dinonaktifkan.');
  await runtime.audit(client, { userId: user.id, action: 'DEACTIVATE', module: 'quotation',
    entityType: 'PRICING_CONDITION', entityId: id, oldValue: { status: row.status }, newValue: { status: 'INACTIVE' }, requestId, branchId: user.branchId });
  return camel(updated);
}

// Resolusi harga server-authoritative. Base price = kondisi BASE_PRICE paling
// spesifik/berprioritas (jatuh ke harga daftar produk bila tak ada); lalu seluruh
// diskon/surcharge yang berlaku diterapkan berurutan.
async function resolvePrice(client, user, { productId, partyId = null, qty = 1, date = null, legalEntityId = null } = {}) {
  permissions.assertPermission(user, 'quotation.view');
  if (!productId) throw new AppError('VALIDATION_ERROR', 'productId wajib untuk resolusi harga.');
  const scope = await resolveLegalEntity(client, user, legalEntityId);
  const q = round(qty) > 0 ? round(qty) : 1;
  const at = date || businessDate.today();
  const product = (await client.query('SELECT id,code,name,category,price,hpp FROM products WHERE id=$1', [productId])).rows[0];
  if (!product) throw new AppError('RESOURCE_NOT_FOUND', 'Produk tidak ditemukan.');

  const rows = (await client.query(
    `SELECT * FROM pricing_conditions
     WHERE legal_entity_id=$1 AND status='ACTIVE' AND min_qty<=$2
       AND effective_from<=$3 AND (effective_to IS NULL OR effective_to>=$3)
       AND (product_id IS NULL OR product_id=$4)
       AND (party_id IS NULL OR party_id=$5)
       AND (product_category IS NULL OR product_category=$6)`,
    [scope, q, at, productId, partyId, product.category])).rows;

  const specificity = (c) => (c.party_id ? 2 : 0) + (c.product_id ? 2 : 0) + (c.product_category ? 1 : 0);
  const ranked = (list) => list.sort((a, b) =>
    b.priority - a.priority || specificity(b) - specificity(a) || Number(b.min_qty) - Number(a.min_qty));

  const bases = ranked(rows.filter((c) => c.condition_type === 'BASE_PRICE'));
  let basePrice, basePriceSource;
  if (bases.length) { basePrice = round(bases[0].amount); basePriceSource = 'CONDITION'; }
  else if (Number(product.price) > 0) { basePrice = round(product.price); basePriceSource = 'PRODUCT_LIST'; }
  else { basePrice = round(product.hpp); basePriceSource = 'PRODUCT_COST'; }

  const adjustments = ranked(rows.filter((c) => c.condition_type !== 'BASE_PRICE'));
  let net = basePrice; const applied = [];
  for (const c of adjustments) {
    const before = net;
    if (c.condition_type === 'DISCOUNT_PCT') net = round(net * (1 - Number(c.amount) / 100));
    else if (c.condition_type === 'SURCHARGE_PCT') net = round(net * (1 + Number(c.amount) / 100));
    else if (c.condition_type === 'DISCOUNT_AMT') net = round(Math.max(0, net - Number(c.amount)));
    applied.push({ id: c.id, type: c.condition_type, amount: Number(c.amount), from: before, to: net,
      scope: { productId: c.product_id, partyId: c.party_id, category: c.product_category, minQty: Number(c.min_qty) } });
  }
  net = round(Math.max(0, net));
  return {
    productId, productCode: product.code, productName: product.name,
    qty: q, currency: bases[0]?.currency || 'IDR',
    basePrice, basePriceSource, netUnitPrice: net, lineTotal: round(net * q),
    marginVsCost: Number(product.hpp) > 0 ? round((net - Number(product.hpp)) / net * 100) : null,
    appliedConditions: applied
  };
}

module.exports = { createCondition, listConditions, deactivateCondition, resolvePrice, TYPES };
