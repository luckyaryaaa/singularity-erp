'use strict';
(() => {
  const { esc, fmtIDR, fmtIDRFull, fmtDate, fmtDateTime, relTime, api, uploadFile, query, invalidate, router, can, state, newIdemKey , asList } = window.MAT;
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
        </table></div></section>
        ${(quotesRes.lineComparison || []).length ? `
        <section class="panel"><header><div><p class="eyebrow">PER ITEM · Sprint 10</p><h2>Harga termurah per baris</h2></div></header>
          <div class="table-wrap"><table><thead><tr><th>Item</th><th class="right">Harga terbaik</th><th>Supplier</th></tr></thead>
          <tbody>${quotesRes.lineComparison.map((l) => `<tr><td>${esc(l.description)}</td><td class="right money">${fmtIDRFull(l.unitPrice)}</td><td><b>${esc(l.supplierName)}</b></td></tr>`).join('')}</tbody></table></div>
          <div class="panel-body"><p class="muted">Perbandingan per item dari kuota multi-baris — pemilihan tetap per supplier (satu PO satu supplier).</p></div>
        </section>` : ''}`;

      main.querySelector('#rfqAddQuote')?.addEventListener('click', async () => {
        const value = await formDialog({ title: 'Tambah kuota supplier', description: 'Landed cost dihitung otomatis dari harga + pajak + ongkir.', fields: [
          { name: 'supplierId', label: 'Supplier', type: 'select', options: suppliers.items.map((s) => [s.id, `${s.code} · ${s.name}`]), required: true },
          { name: 'priceTotal', label: 'Total harga', type: 'number', min: 0, required: true },
          { name: 'taxTotal', label: 'Total pajak', type: 'number', min: 0 },
          { name: 'freightTotal', label: 'Ongkir', type: 'number', min: 0 },
          { name: 'leadTimeDays', label: 'Lead time (hari)', type: 'number', min: 0 },
          { name: 'paymentTerms', label: 'Termin pembayaran' },
          { name: 'qualityScore', label: 'Skor kualitas (1-5)', type: 'number', min: 1, max: 5 },
          { name: 'linesText', label: 'Rincian baris (opsional) — satu baris per item: deskripsi | qty | uom | harga', type: 'textarea' }
        ], submitLabel: 'Tambah kuota' });
        if (!value) return;
        try {
          const body = { ...value };
          if (value.linesText && value.linesText.trim()) {
            body.lines = value.linesText.split('\n').map((s) => s.trim()).filter(Boolean).map((s) => {
              const [description, qty, uom, unitPrice] = s.split('|').map((x) => x.trim());
              return { description, qty: Number(qty), uom: uom || null, unitPrice: Number(unitPrice) };
            });
          }
          delete body.linesText;
          await api(`/api/rfq/${params.id}/quotes`, { method: 'POST', body, idempotencyKey: newIdemKey() }); toast('Kuota ditambahkan', body.lines ? `${body.lines.length} baris — total dihitung server.` : ''); this.render(main, params);
        }
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

  // ── PO change order (Sprint 10 / R017) — amendemen ber-versi maker-checker ─
  const poChangeOrders = {
    permission: 'purchase_order.view',
    async render(main, params) {
      const [doc, data] = await Promise.all([api(`/api/documents/${params.id}`), api(`/api/purchase-orders/${params.id}/change-orders`)]);
      const CO_CHIP = { PENDING: 'amber', APPROVED: 'mint', REJECTED: 'coral' };
      const hasPending = data.items.some((x) => x.status === 'PENDING');
      const canAmend = can('purchase_order.edit') && ['APPROVED', 'IN_PROCESS'].includes(doc.status) && !hasPending;
      main.innerHTML = pageHead({
        eyebrow: 'PENGADAAN · CHANGE ORDER', title: doc.documentNumber, sub: `${esc(doc.title)} · nilai aktif ${fmtIDR(doc.amount)} · setelah ada penerimaan selesai, amendemen terkunci (integritas three-way match)`,
        actions: `${canAmend ? `<button class="btn primary" id="coCreate">${ICONS.plus} Ajukan amendemen</button>` : ''}<button class="btn secondary" id="coDoc">Dokumen ${ICONS.arrow}</button>`
      }) + `
        <section class="panel"><header><div><p class="eyebrow">RIWAYAT AMENDEMEN</p><h2>${data.items.length} change order</h2></div>${chip(doc.status)}</header>
          <div class="table-wrap"><table><thead><tr><th>CO#</th><th class="right">Nilai lama</th><th class="right">Nilai baru</th><th class="right">Δ</th><th>Alasan</th><th>Pemohon</th><th>Status</th><th>Keputusan</th><th></th></tr></thead>
          <tbody>${data.items.map((r) => `<tr><td><b>CO${r.changeNo}</b><small>${relTime(r.requestedAt)}</small></td>
            <td class="right money">${fmtIDR(r.oldAmount)}</td><td class="right money">${fmtIDR(r.newAmount)}</td>
            <td class="right money">${Number(r.newAmount) - Number(r.oldAmount) > 0 ? '+' : ''}${fmtIDR(Number(r.newAmount) - Number(r.oldAmount))}</td>
            <td>${esc(r.reason)}</td><td>${esc(r.requestedByName || '—')}</td>
            <td><span class="chip ${CO_CHIP[r.status]}">${esc(r.status)}</span></td>
            <td>${r.decidedByName ? `${esc(r.decidedByName)}<small>${esc(r.decideReason || '')}</small>` : '—'}</td>
            <td>${r.status === 'PENDING' && can('purchase_order.approve') ? `<div class="row-actions"><button class="btn primary sm" data-codecide="${r.id}" data-dec="approve">Setujui</button><button class="btn danger-outline sm" data-codecide="${r.id}" data-dec="reject">Tolak</button></div>` : ''}</td></tr>`).join('') || '<tr><td colspan="9" class="table-loading">Belum ada amendemen.</td></tr>'}</tbody></table></div>
          <div class="panel-body"><p class="muted">SoD: pemohon tidak dapat memutus amendemennya sendiri (ditegakkan sampai constraint database). Persetujuan menerapkan nilai & baris baru ke PO.</p></div>
        </section>`;
      main.querySelector('#coDoc').addEventListener('click', () => openDrawer(doc.id, { onChange: () => this.render(main, params) }));
      main.querySelector('#coCreate')?.addEventListener('click', async () => {
        const value = await formDialog({ title: `Amendemen ${doc.documentNumber}`, description: 'Keadaan lama dibekukan pada change order; nilai/baris baru berlaku setelah disetujui pemutus berbeda.', fields: [
          { name: 'newAmount', label: 'Nilai baru PO', type: 'number', min: 0, required: true },
          { name: 'reason', label: 'Alasan amendemen', type: 'textarea', required: true },
          { name: 'linesText', label: 'Baris baru (opsional) — deskripsi | qty | uom | harga per baris', type: 'textarea' }
        ], submitLabel: 'Ajukan amendemen' });
        if (!value) return;
        try {
          const body = { newAmount: Number(value.newAmount), reason: value.reason };
          if (value.linesText && value.linesText.trim()) body.newLines = value.linesText.split('\n').map((s) => s.trim()).filter(Boolean).map((s) => { const [description, qty, uom, unitPrice] = s.split('|').map((x) => x.trim()); return { description, qty: Number(qty), uom: uom || null, unitPrice: Number(unitPrice) }; });
          await api(`/api/purchase-orders/${doc.id}/change-orders`, { method: 'POST', idempotencyKey: newIdemKey(), body });
          toast('Amendemen diajukan', 'Menunggu keputusan pemutus berbeda (SoD).');
          this.render(main, params);
        } catch (error) { toast('Gagal mengajukan', error.message, 'coral'); }
      });
      main.querySelectorAll('[data-codecide]').forEach((b) => b.addEventListener('click', async () => {
        const approve = b.dataset.dec === 'approve';
        const answer = await actionDialog({ title: approve ? 'Setujui amendemen' : 'Tolak amendemen', description: approve ? 'Nilai & baris baru langsung diterapkan ke PO.' : 'Amendemen ditolak; PO tidak berubah.', requireReason: true, confirmLabel: approve ? 'Setujui' : 'Tolak', danger: !approve });
        if (!answer) return;
        try { await api(`/api/purchase-orders/change-orders/${b.dataset.codecide}/${b.dataset.dec}`, { method: 'POST', idempotencyKey: newIdemKey(), body: answer }); invalidate('documents'); toast(approve ? 'Amendemen disetujui' : 'Amendemen ditolak', ''); this.render(main, params); }
        catch (error) { toast('Gagal memutus', error.message, 'coral'); }
      }));
    }
  };

  // ── Anggaran pengadaan (Sprint 10 / R017) ─────────────────────────────────
  const budgetsPage = {
    permission: 'budget.view',
    async render(main) {
      this._period = this._period || new Date().toISOString().slice(0, 7);
      const data = await api(`/api/procurement/budgets?period=${this._period}`);
      main.innerHTML = pageHead({
        eyebrow: 'PENGADAAN', title: 'Anggaran pengadaan', sub: 'PR/PO yang melampaui anggaran periode ditolak saat diajukan (409) kecuali override finance ber-alasan.',
        actions: `<label class="period-picker"><span>Periode</span><input id="bdgPeriod" type="month" value="${esc(this._period)}"></label>
          ${can('budget.edit') ? `<button class="btn primary" id="bdgAdd">${ICONS.plus} Atur anggaran</button>` : ''}`
      }) + `
        <section class="panel"><header><div><p class="eyebrow">ANGGARAN ${esc(this._period)}</p><h2>${data.items.length} baris anggaran</h2></div></header>
          <div class="table-wrap"><table><thead><tr><th>Cakupan</th><th class="right">Anggaran</th><th class="right">Terpakai (PO)</th><th class="right">Sisa</th><th>Pemakaian</th><th>Catatan</th></tr></thead>
          <tbody>${data.items.map((r) => { const pct = r.amount > 0 ? Math.min(100, Math.round(r.committed / r.amount * 100)) : 0; return `<tr>
            <td><b>${esc(r.branchName || 'Semua cabang (global)')}</b></td>
            <td class="right money">${fmtIDRFull(r.amount)}</td><td class="right money">${fmtIDRFull(r.committed)}</td>
            <td class="right money ${r.available < 0 ? 'error-text' : ''}">${fmtIDRFull(r.available)}</td>
            <td><span class="chip ${pct >= 100 ? 'coral' : pct >= 80 ? 'amber' : 'mint'}">${pct}%</span></td>
            <td>${esc(r.notes || '—')}</td></tr>`; }).join('') || '<tr><td colspan="6" class="table-loading">Belum ada anggaran periode ini — pengajuan PR/PO tidak dibatasi.</td></tr>'}</tbody></table></div>
        </section>`;
      main.querySelector('#bdgPeriod').addEventListener('change', (e) => { this._period = e.target.value; this.render(main); });
      main.querySelector('#bdgAdd')?.addEventListener('click', async () => {
        try {
          const branches = await api('/api/branches');
          const value = await formDialog({ title: 'Atur anggaran pengadaan', description: 'Satu baris per periode per cakupan; menyimpan ulang menimpa nilai baris yang sama.', fields: [
            { name: 'branchId', label: 'Cakupan', type: 'select', options: [['', 'Semua cabang (global)'], ...branches.items.map((b) => [b.id, b.name])] },
            { name: 'amount', label: 'Nilai anggaran', type: 'number', min: 0, required: true },
            { name: 'notes', label: 'Catatan' }
          ], submitLabel: 'Simpan anggaran' });
          if (!value) return;
          await api('/api/procurement/budgets', { method: 'POST', idempotencyKey: newIdemKey(), body: { period: this._period, branchId: value.branchId || null, amount: Number(value.amount), notes: value.notes } });
          toast('Anggaran tersimpan', `${this._period}`);
          this.render(main);
        } catch (error) { toast('Gagal menyimpan', error.message, 'coral'); }
      });
    }
  };

  const purchaseContractsPage = {
    permission: 'purchase_order.view',
    onEvent() { this._table?.reload(); },
    render(main) {
      main.innerHTML = pageHead({
        eyebrow: 'PENGADAAN · CONTRACT 360', title: 'Kontrak pembelian',
        sub: 'Blanket, framework, dan price agreement dengan maker-checker, pagu real-time, komitmen volume, serta riwayat release.',
        actions: can('purchase_order.create')
          ? `<button class="btn primary" id="contractCreate">${ICONS.plus} Buat kontrak</button>` : ''
      }) + '<section id="contractTable"></section><section id="contractDetail"></section>';
      this._table = dataTable(main.querySelector('#contractTable'), {
        key: 'purchase-contracts', endpoint: '/api/purchase-contracts', params: {},
        title: 'Portfolio kontrak', eyebrow: 'SOURCE-TO-PAY', staleMs: 15_000,
        statusFilter: ['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'EXPIRED', 'CLOSED', 'CANCELLED'],
        columns: [
          { label: 'Kontrak', key: 'contract', render: (r) => `<b>${esc(r.contractNumber)}</b><small>${esc(r.title)}</small>` },
          { label: 'Supplier', render: (r) => esc(r.supplierName) },
          { label: 'Berlaku', render: (r) => `${fmtDate(r.validFrom)}<small>s.d. ${fmtDate(r.validTo)}</small>` },
          { label: 'Pagu', right: true, render: (r) => `<span class="money">${fmtIDR(r.ceilingAmount)}</span><small>terpakai ${fmtIDR(r.consumedAmount)}</small>` },
          { label: 'Sisa', right: true, render: (r) => `<b class="money">${fmtIDR(r.remainingAmount)}</b>` },
          { label: 'Baris', right: true, render: (r) => Number(r.lineCount) },
          { label: 'Status', render: (r) => `<span class="chip ${r.status === 'ACTIVE' ? 'mint' : r.status === 'REJECTED' ? 'coral' : r.status === 'DRAFT' ? 'gray' : 'amber'}">${esc(r.status)}</span>` }
        ],
        empty: { icon: 'doc', title: 'Belum ada kontrak pembelian',
          hint: 'Buat kontrak untuk mengendalikan harga, volume, dan pagu pembelian.' },
        onRow: (row, reload) => this.showDetail(main, row.id, reload)
      });
      main.querySelector('#contractCreate')?.addEventListener('click', () => this.create(main));
    },
    async create(main) {
      try {
        const suppliers = await api('/api/suppliers?limit=100');
        if (!suppliers.items.length) {
          toast('Supplier belum tersedia', 'Lengkapi supplier aktif terlebih dahulu.', 'coral'); return;
        }
        const today = new Date().toISOString().slice(0, 10);
        const nextYear = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
        const value = await formDialog({
          title: 'Buat kontrak pembelian',
          description: 'Satu baris per komitmen: deskripsi | qty | UOM | harga unit | pagu baris. Jumlah pagu baris tidak boleh melebihi pagu header.',
          fields: [
            { name: 'supplierId', label: 'Supplier', type: 'select',
              options: suppliers.items.map((s) => [s.id, `${s.code} · ${s.name}`]), required: true },
            { name: 'title', label: 'Judul kontrak', required: true },
            { name: 'contractType', label: 'Tipe', type: 'select',
              options: [['BLANKET', 'Blanket'], ['FRAMEWORK', 'Framework'], ['PRICE_AGREEMENT', 'Price agreement']], required: true },
            { name: 'validFrom', label: 'Berlaku mulai', type: 'date', value: today, required: true },
            { name: 'validTo', label: 'Berlaku sampai', type: 'date', value: nextYear, required: true },
            { name: 'currency', label: 'Mata uang', value: 'IDR', required: true },
            { name: 'ceilingAmount', label: 'Pagu kontrak', type: 'number', min: 1, required: true },
            { name: 'linesText', label: 'Baris komitmen', type: 'textarea', rows: 5, required: true }
          ], submitLabel: 'Simpan draft kontrak'
        });
        if (!value) return;
        const lines = String(value.linesText || '').split('\n').map((line) => line.trim())
          .filter(Boolean).map((line, index) => {
            const [description, qty, uom, unitPrice, ceilingAmount] = line.split('|').map((part) => part.trim());
            if (!description || !(Number(ceilingAmount) >= 0)) throw new Error(`Format baris ${index + 1} tidak valid.`);
            return { description, committedQty: qty ? Number(qty) : null, uom: uom || null,
              unitPrice: unitPrice ? Number(unitPrice) : null, ceilingAmount: Number(ceilingAmount) };
          });
        const created = await api('/api/purchase-contracts', {
          method: 'POST', idempotencyKey: newIdemKey(), body: {
            supplierId: value.supplierId, title: value.title, contractType: value.contractType,
            validFrom: value.validFrom, validTo: value.validTo,
            currency: String(value.currency || 'IDR').toUpperCase(),
            ceilingAmount: Number(value.ceilingAmount), lines
          }
        });
        toast('Draft kontrak dibuat', created.contractNumber);
        invalidate('purchase-contracts'); this._table.reload();
        this.showDetail(main, created.id, () => this._table.reload());
      } catch (error) { toast('Gagal membuat kontrak', error.message, 'coral'); }
    },
    async showDetail(main, id, reload) {
      const mount = main.querySelector('#contractDetail');
      try {
        const detail = await api(`/api/purchase-contracts/${id}`);
        const canDecide = can('purchase_order.approve')
          && ['DRAFT', 'PENDING_APPROVAL'].includes(detail.status)
          && String(detail.createdBy) !== String(state.user.id);
        const canRelease = can('purchase_order.create') && detail.status === 'ACTIVE';
        mount.innerHTML = `<section class="panel contract-360"><header><div>
            <p class="eyebrow">CONTRACT 360</p><h2>${esc(detail.contractNumber)} · ${esc(detail.supplierName || '')}</h2>
          </div><div class="row-actions">
            ${canDecide ? `<button class="btn primary" data-contract-decision="approve">Setujui</button><button class="btn danger-outline" data-contract-decision="reject">Tolak</button>` : ''}
            ${canRelease ? `<button class="btn secondary" id="contractRelease">${ICONS.plus} Release ke PO</button>` : ''}
          </div></header>
          <div class="contract-summary-grid">
            <div><span>Pagu</span><b>${fmtIDRFull(detail.ceilingAmount)}</b></div>
            <div><span>Terpakai</span><b>${fmtIDRFull(detail.consumedAmount)}</b></div>
            <div><span>Sisa</span><b>${fmtIDRFull(detail.remainingAmount)}</b></div>
            <div><span>Masa berlaku</span><b>${fmtDate(detail.validFrom)} – ${fmtDate(detail.validTo)}</b></div>
          </div>
          <div class="table-wrap"><table><thead><tr><th>#</th><th>Komitmen</th><th class="right">Qty / sisa</th><th class="right">Harga</th><th class="right">Pagu / sisa</th></tr></thead>
            <tbody>${detail.lines.map((line) => `<tr><td>${line.lineNo}</td><td><b>${esc(line.productCode || line.description)}</b><small>${esc(line.description)}</small></td>
              <td class="right">${line.committedQty == null ? '—' : `${Number(line.committedQty)} / ${Number(line.remainingQty)}`} ${esc(line.uom || '')}</td>
              <td class="right money">${line.unitPrice == null ? '—' : fmtIDRFull(line.unitPrice)}</td>
              <td class="right"><span class="money">${fmtIDRFull(line.ceilingAmount)}</span><small>sisa ${fmtIDRFull(line.remainingAmount)}</small></td></tr>`).join('')}</tbody></table></div>
          <div class="panel-body"><p class="eyebrow">RIWAYAT RELEASE</p>
            ${detail.releases.length ? `<div class="timeline-list">${detail.releases.map((release) => `<div><span class="dot"></span><p><b>${esc(release.purchaseOrderNumber)}</b> · ${fmtIDRFull(release.releasedAmount)}<small>${fmtDateTime(release.releasedAt)} · ${esc(release.purchaseOrderStatus)}</small></p></div>`).join('')}</div>`
    : '<p class="muted">Belum ada Purchase Order yang menarik kontrak ini.</p>'}</div>
        </section>`;
        mount.querySelectorAll('[data-contract-decision]').forEach((button) => button.addEventListener('click', async () => {
          const approve = button.dataset.contractDecision === 'approve';
          const answer = await actionDialog({ title: `${approve ? 'Setujui' : 'Tolak'} ${detail.contractNumber}`,
            description: approve ? 'Kontrak menjadi aktif dan dapat dipakai untuk release PO.' : 'Kontrak ditolak dan tidak dapat dipakai.',
            requireReason: true, confirmLabel: approve ? 'Setujui kontrak' : 'Tolak kontrak', danger: !approve });
          if (!answer) return;
          try {
            await api(`/api/purchase-contracts/${detail.id}/${approve ? 'approve' : 'reject'}`, {
              method: 'POST', idempotencyKey: newIdemKey(),
              body: { version: detail.version, reason: answer.reason }
            });
            toast(approve ? 'Kontrak aktif' : 'Kontrak ditolak', detail.contractNumber);
            invalidate('purchase-contracts'); reload(); this.showDetail(main, id, reload);
          } catch (error) { toast('Keputusan gagal', error.message, 'coral'); }
        }));
        mount.querySelector('#contractRelease')?.addEventListener('click', async () => {
          try {
            const orders = await api('/api/documents?type=PURCHASE_ORDER&limit=100');
            const usable = orders.items.filter((order) => String(order.partyId) === String(detail.supplierId)
              && !['CANCELLED', 'VOID', 'REJECTED', 'CLOSED'].includes(order.status));
            if (!usable.length) throw new Error('Tidak ada Purchase Order aktif untuk supplier kontrak ini.');
            const value = await formDialog({ title: `Release ${detail.contractNumber}`,
              description: 'Pagu dan volume diperiksa ulang di server dalam transaksi terkunci.',
              fields: [
                { name: 'purchaseOrderId', label: 'Purchase Order', type: 'select',
                  options: usable.map((order) => [order.id, `${order.documentNumber} · ${fmtIDR(order.amount)}`]), required: true },
                { name: 'contractLineId', label: 'Baris kontrak', type: 'select',
                  options: detail.lines.map((line) => [line.id, `${line.lineNo} · ${line.productCode || line.description} · sisa ${fmtIDR(line.remainingAmount)}`]), required: true },
                { name: 'releasedQty', label: 'Qty release', type: 'number', min: 0.0001 },
                { name: 'releasedAmount', label: 'Nilai release', type: 'number', min: 1, required: true }
              ], submitLabel: 'Catat release'
            });
            if (!value) return;
            await api(`/api/purchase-contracts/${detail.id}/release`, {
              method: 'POST', idempotencyKey: newIdemKey(), body: {
                version: detail.version, purchaseOrderId: value.purchaseOrderId,
                contractLineId: value.contractLineId,
                releasedQty: value.releasedQty === '' ? null : Number(value.releasedQty),
                releasedAmount: Number(value.releasedAmount)
              }
            });
            toast('Release kontrak tercatat', detail.contractNumber);
            invalidate('purchase-contracts'); reload(); this.showDetail(main, id, reload);
          } catch (error) { toast('Release gagal', error.message, 'coral'); }
        });
        mount.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch (error) { mount.innerHTML = `<section class="panel"><div class="panel-body"><p class="error-text">${esc(error.message)}</p></div></section>`; }
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
  R('/procurement/orders', docListPage({
    type: 'PURCHASE_ORDER', module: 'purchase_order', title: 'Purchase order', eyebrow: 'PENGADAAN',
    columns: [
      { label: 'Dokumen', render: docCell },
      { label: 'Supplier', render: (r) => esc(r.partyName || '—') },
      { label: 'CO', render: (r) => r.payload && r.payload.changeOrderNo ? `<span class="chip lavender">CO${r.payload.changeOrderNo}</span>` : '—' },
      { label: 'Nilai', right: true, render: (r) => `<span class="money">${fmtIDR(r.amount)}</span>` },
      { label: 'Status', render: (r) => chip(r.status) },
      { label: 'Diperbarui', render: (r) => relTime(r.updatedAt) }
    ],
    rowRoute: (row) => `#/procurement/orders/${row.id}/changes`
  }));
  R('/procurement/orders/:id/changes', poChangeOrders);
  R('/procurement/contracts', purchaseContractsPage);
  R('/procurement/budgets', budgetsPage);
  R('/procurement/payment-proposals', paymentProposalPage);
})();
