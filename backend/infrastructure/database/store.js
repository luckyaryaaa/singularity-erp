'use strict';
// Abstraksi penyimpanan tunggal (satu storage abstraction sesuai prinsip inti).
// Adapter dev: in-memory deterministik. Produksi: PostgreSQL memakai skema pada
// data/migrations — kontrak repository di bawah ini yang menjadi batas modul.

const { clone } = require('../../core/util');

class Collection {
  constructor(name, onChange) { this.name = name; this.rows = new Map(); this.onChange = onChange; }
  insert(row) { this.rows.set(row.id, clone(row)); if (this.onChange) this.onChange(); return clone(row); }
  get(id) { const row = this.rows.get(id); return row ? clone(row) : null; }
  update(id, patch) {
    const row = this.rows.get(id);
    if (!row) return null;
    Object.assign(row, clone(patch));
    if (this.onChange) this.onChange();
    return clone(row);
  }
  delete(id) { const removed = this.rows.delete(id); if (removed && this.onChange) this.onChange(); return removed; }
  all() { return [...this.rows.values()].map(clone); }
  find(predicate) { return this.all().filter(predicate); }
  findOne(predicate) { return this.all().find(predicate) || null; }
  count(predicate) { return predicate ? this.find(predicate).length : this.rows.size; }
}

class Store {
  constructor() {
    this.collections = new Map();
    this.startedAt = Date.now();
    this.onChange = null; // diisi lapisan persistensi
  }
  collection(name) {
    if (!this.collections.has(name)) this.collections.set(name, new Collection(name, () => { if (this.onChange) this.onChange(); }));
    return this.collections.get(name);
  }
  reset() { this.collections.clear(); }
}

// Paginasi + filter + sort + pencarian sisi server, dipakai semua endpoint list.
function paginate(rows, query = {}) {
  let items = rows;
  const q = (query.q || '').toString().trim().toLowerCase();
  if (q) items = items.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  if (query.status) items = items.filter((row) => row.status === query.status);
  if (query.branchId) items = items.filter((row) => row.branchId === query.branchId);

  const [requestedSort, sortDir] = (query.sort || 'updatedAt:desc').split(':');
  const sortAliases = { document_number: 'documentNumber', due_date: 'dueDate', created_at: 'createdAt', updated_at: 'updatedAt' };
  const sortKey = sortAliases[requestedSort] || requestedSort;
  const dir = sortDir === 'asc' ? 1 : -1;
  items.sort((a, b) => {
    const av = a[sortKey]; const bv = b[sortKey];
    if (av === bv) return 0;
    if (av === undefined || av === null) return 1;
    if (bv === undefined || bv === null) return -1;
    return (av > bv ? 1 : -1) * dir;
  });

  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 25, 1), 100);
  const total = items.length;
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const page = Math.min(Math.max(parseInt(query.page, 10) || 1, 1), totalPages);
  return { items: items.slice((page - 1) * limit, page * limit), page, limit, total, totalPages };
}

module.exports = { store: new Store(), Store, paginate };
