'use strict';
(() => {
  const { esc, fmtIDR, fmtIDRFull, fmtDate, fmtDateTime, relTime, api, uploadFile, query, invalidate, router, can, state, newIdemKey , asList } = window.MAT;
  const { ICONS, chip, toast, formDialog, actionDialog, openDrawer, dataTable, clayOrb, kpiCard, pageHead, runDocAction, runDocConversion, actionButtonsFor, conversionButtonFor, MODULE_OF_TYPE, TYPE_LABEL, AUDIT_LABEL, STATUS_META } = window.UI;
  const { progressBar, docCell, docListPage, masterPage } = window.PageKit;

  const inventory = {
    permission: 'inventory.view',
    onEvent() { this._table?.reload(); },
    render(main) {
      this._tab = this._tab || 'saldo';
      const TABS = [['saldo', 'Saldo stok'], ['lots', 'Lot & Heat Number'], ['bins', 'Rak & Bin'], ['opname', 'Stock Opname'], ['valuasi', 'Valuasi']];
      const actions = `<nav class="chip-tabs" aria-label="Tab inventori">${TABS.map(([id, label]) => `<button class="btn ${this._tab === id ? 'primary' : 'secondary'}" data-invtab="${id}">${esc(label)}</button>`).join('')}</nav>
        ${this._tab === 'opname' && can('stock_opname.create') ? `<button class="btn primary" id="startOpname">${ICONS.plus} Mulai opname</button>` : ''}`;
      main.innerHTML = pageHead({ eyebrow: 'GUDANG', title: 'Persediaan', sub: 'Saldo stok, traceability lot/heat number (mill certificate), stock opname, dan valuasi.', actions }) + '<section id="pgTable"></section><section id="pgDetail"></section>';
      main.querySelectorAll('[data-invtab]').forEach((b) => b.addEventListener('click', () => { this._tab = b.dataset.invtab; this.render(main); }));
      const mount = main.querySelector('#pgTable');
      if (this._tab === 'saldo') {
        this._table = dataTable(mount, {
          key: 'inventory', endpoint: '/api/inventory', params: {}, title: 'Saldo stok', eyebrow: 'INVENTORI', staleMs: 60_000, sort: 'productCode:asc',
          columns: [
            { label: 'Produk', render: (r) => `<b>${esc(r.productCode)}</b><small>${esc(r.productName)}</small>` },
            { label: 'Gudang', render: (r) => esc(r.warehouseName) },
            { label: 'Stok', right: true, render: (r) => `<span class="money">${r.qtyOnHand} ${esc(r.uom)}</span>` },
            { label: 'Direservasi', right: true, render: (r) => `${r.qtyReserved} ${esc(r.uom)}` },
            { label: 'Min.', right: true, render: (r) => `${r.minQty} ${esc(r.uom)}` },
            { label: 'Nilai', right: true, render: (r) => `<span class="money">${fmtIDR(r.valueIdr)}</span>` },
            { label: 'Status', render: (r) => r.qtyOnHand < r.minQty ? '<span class="chip coral">Stok kritis</span>' : '<span class="chip mint">Aman</span>' }
          ],
          empty: { icon: 'box', title: 'Belum ada stok tercatat' }
        });
      } else if (this._tab === 'lots') {
        const LOT_CHIP = { ACTIVE: 'mint', BLOCKED: 'coral', QUARANTINE: 'amber', CONSUMED: 'gray' };
        this._table = dataTable(mount, {
          key: 'inventory:lots', endpoint: '/api/inventory/lots', params: {}, title: 'Lot & heat number', eyebrow: 'TRACEABILITY', staleMs: 30_000,
          columns: [
            { label: 'Lot', render: (r) => `<b>${esc(r.lotNumber)}</b><small>${esc(r.sourceDocumentNumber || '—')}</small>` },
            { label: 'Produk', render: (r) => `<b>${esc(r.productCode)}</b><small>${esc(r.productName)}</small>` },
            { label: 'Heat / Mill cert', render: (r) => r.heatNumber ? `<b>${esc(r.heatNumber)}</b><small>${esc(r.millCertNo || '—')}</small>` : '<span class="muted">—</span>' },
            { label: 'Gudang', render: (r) => esc(r.warehouseName) },
            { label: 'Sisa', right: true, render: (r) => `<span class="money">${Number(r.qtyOnHand)} ${esc(r.uom || '')}</span><small>dari ${Number(r.qtyReceived)}</small>` },
            { label: 'Supplier', render: (r) => esc(r.supplierName || '—') },
            { label: 'Status', render: (r) => `<span class="chip ${LOT_CHIP[r.status] || 'gray'}">${esc(r.status)}</span>` }
          ],
          empty: { icon: 'box', title: 'Belum ada lot', note: 'Lot tercipta otomatis dari penerimaan barang (heat number diisi pada baris GR).' },
          onRow: (row) => this.showLot(main, row.id)
        });
      } else if (this._tab === 'bins') {
        // Rak & bin: skema ini ada sejak migrasi 012 tetapi tidak pernah
        // terhubung ke stok sampai migrasi 058 — sebelumnya tidak ada layar
        // apa pun yang bisa menampilkannya.
        // render() halaman ini SINKRON (tab lain memakai .then juga) — memakai
        // await di sini memecah seluruh modul sehingga rutenya tidak pernah
        // teregistrasi.
        api('/api/inventory/bins', { signal }).then(({ items }) => {
          mount.innerHTML = `<section class="panel table-panel">
          <header><div><p class="eyebrow">GUDANG</p><h2>${items.length} rak terdaftar</h2></div>
            <span class="chip ${items.some((b) => b.qtyOnHand > 0) ? 'mint' : 'gray'}">${items.filter((b) => b.qtyOnHand > 0).length} rak terisi</span></header>
          <div class="table-wrap"><table>
            <thead><tr><th>Rak</th><th>Zona</th><th>Gudang</th><th>Tipe</th><th class="right">Qty</th><th class="right">SKU</th><th>Status</th></tr></thead>
            <tbody>${items.length ? items.map((b) => `<tr data-bin="${b.binId}">
              <td><b>${esc(b.code)}</b></td><td>${esc(b.storageLocation)}</td><td>${esc(b.warehouse)}</td>
              <td><small>${esc(b.type || '—')}</small></td>
              <td class="right money">${Number(b.qtyOnHand)}</td><td class="right">${Number(b.productCount)}</td>
              <td>${b.active ? '<span class="chip mint">Aktif</span>' : '<span class="chip gray">Non-aktif</span>'}</td></tr>`).join('')
    : '<tr><td colspan="7" class="table-loading">Belum ada rak. Tambahkan gudang dan zona penyimpanan lebih dulu di Struktur perusahaan.</td></tr>'}</tbody>
          </table></div>
          <div class="panel-body"><p class="muted">Isi rak diturunkan dari lot, bukan angka terpisah — saldo rak selalu mengikuti pergerakan lot. Penempatan dan pemindahan tercatat sebagai gerakan lot dengan alasannya.</p></div>
          <div id="binDetail"></div>
        </section>`;
          mount.querySelectorAll('[data-bin]').forEach((row) => row.addEventListener('click', () => {
            const detail = mount.querySelector('#binDetail');
            api(`/api/inventory/bins/${row.dataset.bin}`).then((c) => {
              detail.innerHTML = `<div class="panel-body"><h3>Isi rak ${esc(c.bin.code)} · ${Number(c.totalQty)} unit</h3>
                ${c.items.length ? `<div class="table-wrap"><table><thead><tr><th>Produk</th><th>Lot</th><th>Heat number</th><th class="right">Qty</th></tr></thead>
                  <tbody>${c.items.map((i) => `<tr><td><b>${esc(i.productCode)}</b><small>${esc(i.productName)}</small></td>
                    <td>${esc(i.lotNumber)}</td><td>${esc(i.heatNumber || '—')}</td>
                    <td class="right money">${Number(i.qtyOnHand)} ${esc(i.uom || '')}</td></tr>`).join('')}</tbody></table></div>`
    : '<p class="muted">Rak ini kosong.</p>'}</div>`;
            }).catch((error) => { detail.innerHTML = `<p class="error-text">${esc(error.message)}</p>`; });
          }));
        }).catch((error) => { mount.innerHTML = `<p class="error-text">${esc(error.message)}</p>`; });
      } else if (this._tab === 'opname') {
        this._table = dataTable(mount, {
          key: 'documents:opname', endpoint: '/api/documents', params: { type: 'STOCK_OPNAME' }, title: 'Sesi stock opname', eyebrow: 'OPNAME',
          columns: [
            { label: 'Dokumen', render: docCell },
            { label: 'Nilai selisih', right: true, render: (r) => `<span class="money">${fmtIDR(r.amount)}</span>` },
            { label: 'Status', render: (r) => chip(r.status) },
            { label: 'Diperbarui', render: (r) => relTime(r.updatedAt) }
          ],
          statusFilter: ['DRAFT', 'WAITING_APPROVAL', 'APPROVED', 'REVISION_REQUIRED', 'REJECTED'],
          empty: { icon: 'box', title: 'Belum ada sesi opname' },
          onRow: (row) => { location.hash = `#/warehouse/opname/${row.id}`; }
        });
        main.querySelector('#startOpname')?.addEventListener('click', async () => {
          try {
            const branches = await api('/api/branches');
            const catalog = await api('/api/products?limit=1').catch(() => ({}));
            const categories = catalog.facets?.categories || [];
            const value = await formDialog({
              title: 'Mulai stock opname',
              description: 'Sistem membuat snapshot qty per lot (dan sisa tanpa lot) sesuai cakupan hitung. Cakupan sebagian dipakai untuk cycle counting tanpa menghentikan seluruh gudang. Selisih diposting setelah disetujui approver berbeda (SoD).',
              fields: [
                { name: 'warehouseId', label: 'Gudang', type: 'select', options: branches.items.map((b) => [b.id, b.name]), required: true },
                { name: 'scope', label: 'Cakupan hitung', type: 'select', options: [['FULL', 'Seluruh gudang'], ['CATEGORY', 'Kategori tertentu (cycle count)']], required: true },
                { name: 'category', label: 'Kategori (untuk cakupan kategori)', type: 'select', options: [['', '—'], ...categories.map((c) => [c, c])] },
                { name: 'title', label: 'Judul (opsional)' }
              ],
              submitLabel: 'Buat sesi opname'
            });
            if (!value) return;
            const body = { warehouseId: value.warehouseId, title: value.title, scope: value.scope || 'FULL' };
            if (body.scope === 'CATEGORY') {
              if (!value.category) { toast('Kategori wajib', 'Cakupan kategori membutuhkan satu kategori.', 'coral'); return; }
              body.categories = [value.category];
            }
            const doc = await api('/api/inventory/opname', { method: 'POST', body });
            toast('Sesi opname dibuat', `${doc.documentNumber} · ${doc.lineCount} baris`);
            location.hash = `#/warehouse/opname/${doc.id}`;
          } catch (error) { toast('Gagal membuat opname', error.message, 'coral'); }
        });
      } else {
        api('/api/inventory/valuation').then((v) => {
          mount.innerHTML = `<section class="panel"><header><div><p class="eyebrow">VALUASI</p><h2>Nilai persediaan per produk</h2></div>
            <span class="chip blue">Saldo ${fmtIDR(v.totals.balanceValue)}</span></header>
            <div class="table-wrap"><table><thead><tr><th>Produk</th><th>Gudang</th><th class="right">Qty</th><th class="right">Biaya rata-rata</th><th class="right">Biaya standar (HPP)</th><th class="right">Nilai saldo</th><th class="right">Nilai lapisan lot</th></tr></thead>
            <tbody>${v.items.map((r) => `<tr><td><b>${esc(r.productCode)}</b><small>${esc(r.productName)}</small></td><td>${esc(r.warehouseName)}</td><td class="right money">${r.qtyOnHand}</td><td class="right money">${fmtIDRFull(r.avgCost)}</td><td class="right money">${fmtIDRFull(r.standardCost)}</td><td class="right money">${fmtIDRFull(r.balanceValue)}</td><td class="right money">${r.lotQty > 0 ? fmtIDRFull(r.lotValue) : '—'}</td></tr>`).join('') || '<tr><td colspan="7" class="table-loading">Belum ada saldo.</td></tr>'}</tbody></table></div>
            <div class="panel-body"><p class="muted">Nilai saldo memakai biaya standar (HPP aktif); lapisan lot mencatat biaya saat penerimaan untuk telusur FIFO.</p></div></section>`;
        }).catch((e) => { mount.innerHTML = `<section class="panel"><div class="panel-body"><p class="muted">Gagal memuat valuasi: ${esc(e.message)}</p></div></section>`; });
      }
    },
    async showLot(main, lotId) {
      const box = main.querySelector('#pgDetail');
      try {
        const lot = await api(`/api/inventory/lots/${lotId}`);
        const MV_LABEL = { RECEIPT: 'Penerimaan', ISSUE: 'Pengeluaran', TRANSFER_IN: 'Transfer masuk', TRANSFER_OUT: 'Transfer keluar', ADJUST_IN: 'Penyesuaian +', ADJUST_OUT: 'Penyesuaian −', BLOCK: 'Diblokir', RELEASE: 'Dilepas' };
        box.innerHTML = `<section class="panel"><header><div><p class="eyebrow">DETAIL LOT</p><h2>${esc(lot.lotNumber)}</h2></div>
          <div class="row-actions">${can('inventory.edit') && lot.status === 'ACTIVE' ? `<button class="btn secondary" id="lotBlock">Blokir (QC hold)</button>` : ''}${can('inventory.edit') && ['BLOCKED', 'QUARANTINE'].includes(lot.status) ? `<button class="btn primary" id="lotRelease">Lepas blokir</button>` : ''}</div></header>
          <div class="panel-body stack">
            <div class="stat-row"><span>Heat number / Mill certificate</span><b>${esc(lot.heatNumber || '—')} · ${esc(lot.millCertNo || '—')}</b></div>
            <div class="stat-row"><span>Produk · Gudang</span><b>${esc(lot.productCode)} · ${esc(lot.warehouseName)}</b></div>
            <div class="stat-row"><span>Sisa / diterima</span><b>${Number(lot.qtyOnHand)} / ${Number(lot.qtyReceived)} ${esc(lot.uom || '')} @ ${fmtIDRFull(lot.unitCost)}</b></div>
            <div class="stat-row"><span>Asal</span><b>${esc(lot.sourceDocumentNumber || '—')}${lot.supplierName ? ' · ' + esc(lot.supplierName) : ''}</b></div>
            ${lot.ancestry.length ? `<div class="stat-row"><span>Silsilah (traceability)</span><b>${lot.ancestry.map((a) => `${esc(a.lotNumber)} (${esc(a.warehouseName)})`).join(' ← ')}</b></div>` : ''}
            ${lot.children.length ? `<div class="stat-row"><span>Lot turunan</span><b>${lot.children.map((cRow) => `${esc(cRow.lotNumber)} (${Number(cRow.qtyOnHand)})`).join(', ')}</b></div>` : ''}
            ${lot.blockReason ? `<div class="stat-row"><span>Alasan blokir</span><b>${esc(lot.blockReason)}</b></div>` : ''}
          </div>
          <div class="table-wrap"><table><thead><tr><th>Waktu</th><th>Mutasi</th><th class="right">Qty</th><th>Dokumen</th></tr></thead>
          <tbody>${lot.movements.map((mv) => `<tr><td>${relTime(mv.occurredAt)}</td><td>${esc(MV_LABEL[mv.movementType] || mv.movementType)}${mv.memo ? `<small>${esc(mv.memo)}</small>` : ''}</td><td class="right money">${Number(mv.qty) || '—'}</td><td>${esc(mv.documentNumber || '—')}</td></tr>`).join('')}</tbody></table></div></section>`;
        box.querySelector('#lotBlock')?.addEventListener('click', async () => { const answer = await actionDialog({ title: `Blokir lot ${lot.lotNumber}`, description: 'Lot terblokir dilewati pemilihan FIFO sampai dilepas kembali.', requireReason: true, confirmLabel: 'Blokir lot', danger: true }); if (!answer) return; try { await api(`/api/inventory/lots/${lotId}/block`, { method: 'POST', body: answer }); invalidate('inventory:lots'); toast('Lot diblokir', lot.lotNumber); this.render(main); } catch (error) { toast('Gagal memblokir', error.message, 'coral'); } });
        box.querySelector('#lotRelease')?.addEventListener('click', async () => { try { await api(`/api/inventory/lots/${lotId}/release`, { method: 'POST', body: {} }); invalidate('inventory:lots'); toast('Blokir dilepas', lot.lotNumber); this.render(main); } catch (error) { toast('Gagal melepas blokir', error.message, 'coral'); } });
        box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch (error) { toast('Gagal memuat lot', error.message, 'coral'); }
    }
  };

  // Detail sesi stock opname: isi hasil hitung fisik, lalu ajukan lewat
  // dokumen (approval + SoD standar). Selisih diposting setelah APPROVED.
  const opnameDetail = {
    permission: 'stock_opname.view',
    onEvent() { /* status berubah via drawer → render ulang */ },
    async render(main, params) {
      const data = await api(`/api/inventory/opname/${params.id}/lines`);
      const doc = data.document;
      const editable = ['DRAFT', 'REVISION_REQUIRED'].includes(doc.status) && can('stock_opname.edit');
      const summary = doc.payload?.opname;
      main.innerHTML = pageHead({
        eyebrow: 'GUDANG · OPNAME', title: doc.documentNumber, sub: `${esc(doc.title)} · Gudang ${esc(doc.warehouseName || '—')} · ${data.items.length} baris`,
        actions: `${editable ? `<button class="btn primary" id="saveCounts">${ICONS.check} Simpan hasil hitung</button>` : ''}<button class="btn secondary" id="openDoc">Buka dokumen ${ICONS.arrow}</button>`
      }) + `
        <section class="metrics">
          ${kpiCard({ label: 'Status', value: doc.status, note: editable ? 'Isi hitung fisik lalu ajukan' : 'Menunggu proses berikutnya', orb: 'box', orbTone: 'blue' })}
          ${kpiCard({ label: 'Selisih lebih', value: fmtIDR(summary?.gain || 0), note: 'Diposting sebagai pendapatan selisih', orb: 'trend', orbTone: 'mint' })}
          ${kpiCard({ label: 'Selisih kurang', value: fmtIDR(summary?.loss || 0), note: 'Diposting sebagai beban selisih', orb: 'alert', orbTone: 'amber' })}
          ${kpiCard({ label: 'Belum dihitung', value: String(summary?.uncounted ?? data.items.filter(x => x.countedQty === null).length), note: 'Baris tanpa hasil hitung tidak disesuaikan', orb: 'ledger', orbTone: 'lavender' })}
        </section>
        <section class="panel"><header><div><p class="eyebrow">HASIL HITUNG FISIK</p><h2>Baris opname</h2></div>${chip(doc.status)}</header>
          <div class="table-wrap"><table><thead><tr><th>#</th><th>Produk</th><th>Lot / Heat</th><th class="right">Qty sistem</th><th class="right">Qty fisik</th><th class="right">Selisih</th><th>Catatan</th></tr></thead>
          <tbody>${data.items.map((r) => {
            const variance = r.variance === null ? null : Number(r.variance);
            return `<tr data-line="${r.id}"><td>${r.lineNo}</td>
              <td><b>${esc(r.productCode)}</b><small>${esc(r.productName)}</small></td>
              <td>${r.lotNumber ? `<b>${esc(r.lotNumber)}</b><small>${esc(r.heatNumber || '—')}</small>` : '<span class="muted">Tanpa lot</span>'}</td>
              <td class="right money">${Number(r.systemQty)} ${esc(r.uom || '')}</td>
              <td class="right">${editable ? `<input type="number" class="count-input" data-count="${r.id}" min="0" step="any" value="${r.countedQty ?? ''}" placeholder="—">` : `<span class="money">${r.countedQty ?? '—'}</span>`}</td>
              <td class="right money">${variance === null ? '—' : `<span class="chip ${variance === 0 ? 'mint' : variance > 0 ? 'blue' : 'coral'}">${variance > 0 ? '+' : ''}${variance}</span>`}</td>
              <td>${editable ? `<input type="text" data-note="${r.id}" value="${esc(r.note || '')}" placeholder="Catatan">` : esc(r.note || '—')}</td></tr>`;
          }).join('')}</tbody></table></div>
          <div class="panel-body"><p class="muted">Alur: isi qty fisik → simpan → ajukan lewat "Buka dokumen" → approver berbeda menyetujui (SoD) → selisih otomatis menyesuaikan saldo + lot dan dijurnal via posting profile OPNAME-DEFAULT.</p></div>
        </section>`;
      main.querySelector('#openDoc').addEventListener('click', () => openDrawer(doc.id, { onChange: () => this.render(main, params) }));
      main.querySelector('#saveCounts')?.addEventListener('click', async () => {
        const counts = [...main.querySelectorAll('[data-count]')].map((el) => ({ lineId: el.dataset.count, countedQty: el.value === '' ? null : Number(el.value), note: main.querySelector(`[data-note="${el.dataset.count}"]`)?.value || null })).filter((x) => x.countedQty !== null);
        if (!counts.length) { toast('Tidak ada hasil hitung', 'Isi minimal satu baris qty fisik.', 'coral'); return; }
        try {
          const result = await api(`/api/inventory/opname/${doc.id}/counts`, { method: 'POST', body: { counts } });
          toast('Hasil hitung disimpan', `${result.updated} baris · selisih lebih ${fmtIDR(result.gain)} · kurang ${fmtIDR(result.loss)}`);
          this.render(main, params);
        } catch (error) { toast('Gagal menyimpan', error.message, 'coral'); }
      });
    }
  };


  const R = router.register.bind(router);
  R('/warehouse/inventory', inventory);
  R('/warehouse/opname/:id', opnameDetail);
  R('/warehouse/receipts', docListPage({
    type: 'GOODS_RECEIPT', module: 'goods_receipt', title: 'Penerimaan barang & jasa', eyebrow: 'GUDANG',
    createLabel: 'Terima jasa (service receipt)',
    columns: [
      { label: 'Dokumen', render: docCell },
      { label: 'Jenis', render: (r) => r.payload && r.payload.receiptType === 'SERVICE' ? '<span class="chip lavender">Jasa</span>' : r.payload && r.payload.source === 'PRODUCTION' ? '<span class="chip blue">Produksi</span>' : '<span class="chip gray">Barang</span>' },
      { label: 'Relasi', render: (r) => esc(r.partyName || '—') },
      { label: 'Nilai', right: true, render: (r) => `<span class="money">${fmtIDR(r.amount)}</span>` },
      { label: 'Status', render: (r) => chip(r.status) },
      { label: 'Diperbarui', render: (r) => relTime(r.updatedAt) }
    ],
    onCreate: async (reload) => {
      // Sprint 10: penerimaan jasa — bukti penerimaan untuk three-way match
      // tanpa mutasi stok/lot.
      const pos = await api('/api/documents?type=PURCHASE_ORDER&limit=100');
      const usable = pos.items.filter((x) => ['APPROVED', 'IN_PROCESS'].includes(x.status));
      const value = await formDialog({ title: 'Terima jasa (service receipt)', description: 'Penerimaan jasa dicatat sebagai bukti untuk three-way match tanpa mutasi stok.', fields: [
        { name: 'poId', label: 'PO sumber (opsional)', type: 'select', options: [['', '— Tanpa PO —'], ...usable.map((x) => [x.id, `${x.documentNumber} · ${x.partyName || '—'} · ${fmtIDR(x.amount)}`])] },
        { name: 'title', label: 'Judul penerimaan jasa', required: true },
        { name: 'description', label: 'Deskripsi jasa', required: true },
        { name: 'amount', label: 'Nilai jasa diterima', type: 'number', min: 1, required: true }
      ], submitLabel: 'Buat service receipt' });
      if (!value) return;
      try {
        const po = value.poId ? usable.find((x) => x.id === value.poId) : null;
        let doc;
        const servicePayload = { receiptType: 'SERVICE', purchaseOrderNumber: po?.documentNumber || null, lines: [{ description: value.description, qty: 1, unitPrice: Number(value.amount) }] };
        if (po) {
          // Konversi resmi PO→GR: relasi ORDER_TO_RECEIPT tercipta (dipakai
          // three-way match), lalu draft GR diubah menjadi penerimaan jasa.
          const conv = await api(`/api/documents/${po.id}/convert`, { method: 'POST', body: {}, idempotencyKey: newIdemKey() });
          const child = await api(`/api/documents/${conv.child.id}`);
          doc = await api(`/api/documents/${child.id}`, { method: 'PATCH', body: { version: child.version, title: value.title, amount: Number(value.amount), payload: { ...child.payload, ...servicePayload } } });
        } else {
          doc = await api('/api/documents', { method: 'POST', idempotencyKey: newIdemKey(), body: { type: 'GOODS_RECEIPT', title: value.title, amount: Number(value.amount), payload: servicePayload } });
        }
        toast(`${doc.documentNumber} dibuat`, 'Proses sampai selesai sebagai bukti penerimaan jasa (tanpa mutasi stok).');
        if (reload) reload();
        openDrawer(doc.id, { onChange: reload });
      } catch (error) { toast('Gagal membuat service receipt', error.message, 'coral'); }
    }
  }));
  R('/warehouse/movements', docListPage({ type: 'MATERIAL_ISSUE,STOCK_TRANSFER,STOCK_ADJUSTMENT', module: 'inventory', title: 'Mutasi & penyesuaian', eyebrow: 'GUDANG' }));
  R('/warehouse/deliveries', docListPage({ type: 'DELIVERY', module: 'delivery', title: 'Pengiriman', eyebrow: 'GUDANG' }));
})();
