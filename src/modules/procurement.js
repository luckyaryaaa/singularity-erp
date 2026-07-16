'use strict';
(() => {
  const { esc, fmtIDR, fmtIDRFull, fmtDate, fmtDateTime, relTime, api, uploadFile, query, invalidate, router, can, state, newIdemKey } = window.MAT;
  const { ICONS, chip, toast, formDialog, actionDialog, openDrawer, dataTable, clayOrb, kpiCard, pageHead, runDocAction, runDocConversion, actionButtonsFor, conversionButtonFor, MODULE_OF_TYPE, TYPE_LABEL, AUDIT_LABEL, STATUS_META } = window.UI;
  const { progressBar, docCell, docListPage, masterPage } = window.PageKit;

  const rfqCompare = {
    permission: 'rfq.view',
    async render(main, params, signal) {
      const [doc, quotesRes, suppliers] = await Promise.all([
        api(`/api/documents/${params.id}`, { signal }),
        api(`/api/rfq/${params.id}/quotes`, { signal }),
        can('rfq.edit') ? api('/api/suppliers?limit=200', { signal }) : Promise.resolve({ items: [] })
      ]);
      const quotes = quotesRes.items;
      const selected = quotes.find((q) => q.isSelected);
      main.innerHTML = pageHead({
        eyebrow: 'PENGADAAN · RFQ', title: doc.documentNumber, sub: esc(doc.title),
        actions: `<a class="btn secondary" href="#/procurement/rfq">${ICONS.arrow} Kembali</a>${selected && can('purchase_order.create') ? `<button class="btn primary" id="rfqToPo">${ICONS.cart} Jadikan PO</button>` : ''}${can('rfq.edit') ? `<button class="btn secondary" id="rfqAddQuote">${ICONS.plus} Tambah kuota</button>` : ''}`
      }) + `
        <section class="panel table-panel"><header><div><p class="eyebrow">PERBANDINGAN</p><h2>Kuota supplier</h2></div><span class="muted">Diurutkan dari landed cost terendah</span></header>
        <div class="table-wrap"><table>
          <thead><tr><th>Supplier</th><th class="right">Harga</th><th class="right">Pajak</th><th class="right">Ongkir</th><th class="right">Landed cost</th><th>Lead time</th><th>Skor</th><th></th></tr></thead>
          <tbody>${quotes.length ? quotes.map((q) => `<tr class="${q.isSelected ? 'row-selected' : ''}">
            <td><b>${esc(q.supplierName)}</b><small>${esc(q.supplierCode)}${q.recommended ? ' · <span class="chip mint">Rekomendasi</span>' : ''}${q.isSelected ? ' · <span class="chip blue">Terpilih</span>' : ''}</small></td>
            <td class="right money">${fmtIDR(q.priceTotal)}</td><td class="right">${fmtIDR(q.taxTotal)}</td><td class="right">${fmtIDR(q.freightTotal)}</td>
            <td class="right money">${fmtIDR(q.landedCost)}</td><td>${q.leadTimeDays ? q.leadTimeDays + ' hari' : '—'}</td>
            <td>${q.supplierScore ? '★ ' + Number(q.supplierScore).toFixed(0) : '—'}</td>
            <td class="right">${!q.isSelected && can('rfq.approve') ? `<button class="btn secondary sm" data-select-quote="${esc(q.id)}">Pilih</button>` : ''}</td></tr>`).join('')
            : `<tr><td colspan="8"><div class="empty-state">${clayOrb('blue','filter')}<h3>Belum ada kuota</h3><p>Tambahkan penawaran dari beberapa supplier untuk dibandingkan.</p></div></td></tr>`}</tbody>
        </table></div></section>`;

      main.querySelector('#rfqAddQuote')?.addEventListener('click', async () => {
        const value = await formDialog({ title: 'Tambah kuota supplier', description: 'Landed cost dihitung otomatis dari harga + pajak + ongkir.', fields: [
          { name: 'supplierId', label: 'Supplier', type: 'select', options: suppliers.items.map((s) => [s.id, `${s.code} · ${s.name}`]), required: true },
          { name: 'priceTotal', label: 'Total harga', type: 'number', min: 0, required: true },
          { name: 'taxTotal', label: 'Total pajak', type: 'number', min: 0 },
          { name: 'freightTotal', label: 'Ongkir', type: 'number', min: 0 },
          { name: 'leadTimeDays', label: 'Lead time (hari)', type: 'number', min: 0 },
          { name: 'paymentTerms', label: 'Termin pembayaran' },
          { name: 'qualityScore', label: 'Skor kualitas (1-5)', type: 'number', min: 1, max: 5 }
        ], submitLabel: 'Tambah kuota' });
        if (!value) return;
        try { await api(`/api/rfq/${params.id}/quotes`, { method: 'POST', body: value, idempotencyKey: newIdemKey() }); toast('Kuota ditambahkan'); this.render(main, params); }
        catch (error) { toast('Gagal menambah kuota', error.message, 'coral'); }
      });
      main.querySelectorAll('[data-select-quote]').forEach((b) => b.addEventListener('click', async () => {
        const answer = await actionDialog({ title: 'Pilih kuota supplier', description: 'Pemilihan dicatat pada audit trail beserta alasannya.', requireReason: true, confirmLabel: 'Pilih supplier ini' });
        if (!answer) return;
        try { await api(`/api/rfq/${params.id}/quotes/${b.dataset.selectQuote}/select`, { method: 'POST', body: { reason: answer.reason } }); toast('Supplier terpilih'); this.render(main, params); }
        catch (error) { toast('Gagal memilih', error.message, 'coral'); }
      }));
      main.querySelector('#rfqToPo')?.addEventListener('click', async () => {
        try { const res = await api(`/api/rfq/${params.id}/create-po`, { method: 'POST', body: {}, idempotencyKey: newIdemKey() }); toast(res.alreadyConverted ? 'PO sudah pernah dibuat' : 'PO dibuat', res.child.documentNumber); router.go(`#/doc/${res.child.id}`); }
        catch (error) { toast('Gagal membuat PO', error.message, 'coral'); }
      });
    }
  };

  // ── Payment proposal batch (R017 §13.6) ──────────────────────────────────
  const paymentProposalPage = {
    permission: 'payment_proposal.view',
    onEvent() { this._table?.reload(); },
    render(main) {
      main.innerHTML = pageHead({
        eyebrow: 'PENGADAAN · PEMBAYARAN', title: 'Usulan pembayaran', sub: 'Kumpulkan tagihan supplier disetujui yang jatuh tempo menjadi satu batch untuk persetujuan finance.',
        actions: can('payment_proposal.create') ? `<button class="btn primary" id="ppGenerate">${ICONS.plus} Buat usulan</button>` : ''
      }) + '<section id="ppTable"></section>';
      this._table = dataTable(main.querySelector('#ppTable'), {
        key: 'documents:PAYMENT_PROPOSAL', endpoint: '/api/documents', params: { type: 'PAYMENT_PROPOSAL' },
        title: 'Daftar usulan', eyebrow: 'BATCH', columns: [
          { label: 'Dokumen', render: docCell },
          { label: 'Total', right: true, render: (r) => `<span class="money">${fmtIDR(r.amount)}</span>` },
          { label: 'Tagihan', render: (r) => `${(r.payload && r.payload.count) || 0} item` },
          { label: 'Status', render: (r) => chip(r.status) },
          { label: 'Dibuat', render: (r) => relTime(r.createdAt) }
        ], onRow: (row, reload) => openDrawer(row.id, { onChange: reload }),
        empty: { icon: 'wallet', title: 'Belum ada usulan pembayaran' }
      });
      main.querySelector('#ppGenerate')?.addEventListener('click', async () => {
        const value = await formDialog({ title: 'Buat usulan pembayaran', description: 'Sistem mengumpulkan seluruh tagihan supplier berstatus disetujui yang jatuh tempo hingga tanggal berikut. Rekening belum terverifikasi otomatis ditahan.', fields: [{ name: 'dueBefore', label: 'Jatuh tempo hingga', type: 'date', required: true }], submitLabel: 'Buat usulan' });
        if (!value) return;
        try { const res = await api('/api/payment-proposals', { method: 'POST', body: value, idempotencyKey: newIdemKey() }); toast('Usulan dibuat', `${res.lineCount} tagihan, ${res.holdCount} ditahan`); invalidate('documents:PAYMENT_PROPOSAL'); this._table.reload(); }
        catch (error) { toast('Gagal membuat usulan', error.message, 'coral'); }
      });
    }
  };

  const R = router.register.bind(router);
  R('/procurement/requests', docListPage({ type: 'PURCHASE_REQUEST', module: 'purchase_request', title: 'Purchase request', eyebrow: 'PENGADAAN' }));
  R('/procurement/rfq', docListPage({ type: 'RFQ', module: 'rfq', title: 'RFQ & perbandingan supplier', eyebrow: 'PENGADAAN', createLabel: 'Buat RFQ',
    rowRoute: (row) => `#/procurement/rfq/${row.id}`,
    onCreate: async (reload) => {
      const value = await formDialog({ title: 'Buat RFQ', description: 'Setelah dibuat, tambahkan kuota dari beberapa supplier untuk dibandingkan.', fields: [{ name: 'title', label: 'Judul RFQ', required: true }], submitLabel: 'Buat RFQ' });
      if (!value) return;
      try { const doc = await api('/api/documents', { method: 'POST', body: { type: 'RFQ', title: value.title, amount: 0 }, idempotencyKey: newIdemKey() }); toast('RFQ dibuat', doc.documentNumber); router.go(`#/procurement/rfq/${doc.id}`); }
      catch (error) { toast('Gagal membuat RFQ', error.message, 'coral'); }
    } }));
  R('/procurement/rfq/:id', rfqCompare);
  R('/procurement/orders', docListPage({ type: 'PURCHASE_ORDER', module: 'purchase_order', title: 'Purchase order', eyebrow: 'PENGADAAN' }));
  R('/procurement/payment-proposals', paymentProposalPage);
})();
