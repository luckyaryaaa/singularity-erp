'use strict';
(() => {
  const { esc, fmtIDR, fmtIDRFull, fmtDate, fmtDateTime, relTime, api, uploadFile, query, invalidate, router, can, state, newIdemKey , asList } = window.MAT;
  const { ICONS, chip, toast, formDialog, actionDialog, openDrawer, dataTable, clayOrb, kpiCard, pageHead, runDocAction, runDocConversion, actionButtonsFor, conversionButtonFor, MODULE_OF_TYPE, TYPE_LABEL, AUDIT_LABEL, STATUS_META } = window.UI;
  const { progressBar, docCell, docListPage, masterPage } = window.PageKit;

  const quotationWizard = {
    permission: 'quotation.create',
    async render(main, _p, signal) {
      const DRAFT_KEY = 'mat-draft-quotation';
      const saved = localStorage.getItem(DRAFT_KEY);
      const draft = saved ? JSON.parse(saved) : { customerId: '', customerName: '', lines: [], taxPct: 11, discountPct: 0, terms: 'Net 30', deliveryWeeks: 4, notes: '' };
      let step = 0;
      const steps = ['Pelanggan', 'Produk & jumlah', 'Harga & pajak', 'Pengiriman & termin', 'Tinjau', 'Ajukan'];
      const [customers, products] = await Promise.all([
        query('customers:all', () => api('/api/customers?limit=100', { signal }), { staleMs: 900_000 }),
        query('products:all', () => api('/api/products?limit=100', { signal }), { staleMs: 900_000 })
      ]);
      const persist = () => localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      const subtotal = () => draft.lines.reduce((s, l) => s + l.qty * l.price, 0);
      const discount = () => subtotal() * draft.discountPct / 100;
      const tax = () => (subtotal() - discount()) * draft.taxPct / 100;
      const total = () => subtotal() - discount() + tax();

      function view() {
        const stepsHtml = steps.map((label, i) => `<div class="wiz-step ${i === step ? 'active' : i < step ? 'done' : ''}"><span>${i < step ? ICONS.check : i + 1}</span><b>${label}</b></div>`).join('<i class="wiz-line"></i>');
        let body = '';
        if (step === 0) body = `
          <label class="field"><span>Pelanggan <b>*</b></span>
            <select id="wizCustomer" name="customerId" autocomplete="off" class="select block">${['<option value="">— Pilih pelanggan —</option>', ...customers.items.map((c) => `<option value="${esc(c.id)}" ${c.id === draft.customerId ? 'selected' : ''}>${esc(c.name)} · ${esc(c.city)}</option>`)].join('')}</select>
            <small>Termin pembayaran dan alamat mengikuti master pelanggan.</small></label>`;
        if (step === 1) body = `
          <div class="wiz-lines">
            ${draft.lines.map((l, i) => `
              <div class="wiz-line-row">
                <span><b>${esc(l.name)}</b><small>${fmtIDRFull(l.price)} / ${esc(l.uom)}</small></span>
                <input name="lineQty${i}" autocomplete="off" type="number" min="1" value="${l.qty}" data-line-qty="${i}" aria-label="Jumlah ${esc(l.name)}">
                <span class="money">${fmtIDR(l.qty * l.price)}</span>
                <button class="icon-btn sm" data-line-del="${i}" aria-label="Hapus baris">${ICONS.close}</button>
              </div>`).join('') || `<div class="empty-inline">${clayOrb('blue', 'box')}<p>Belum ada baris produk. Tambahkan dari daftar di bawah.</p></div>`}
          </div>
          <label class="field"><span>Tambah produk</span>
            <select id="wizAddProduct" name="productId" autocomplete="off" class="select block"><option value="">— Pilih produk/jasa —</option>${products.items.map((p) => `<option value="${esc(p.id)}">${esc(p.name)} · ${fmtIDRFull(p.price)}</option>`).join('')}</select></label>`;
        if (step === 2) body = `
          <div class="field-grid">
            <label class="field"><span>Diskon (%)</span><input id="wizDiscount" name="discountPct" autocomplete="off" type="number" min="0" max="100" step="0.5" value="${draft.discountPct}"></label>
            <label class="field"><span>PPN (%)</span><input id="wizTax" name="taxPct" autocomplete="off" type="number" min="0" max="100" step="0.5" value="${draft.taxPct}"></label>
          </div>
          <div class="totals-card">
            <div><span>Subtotal</span><b>${fmtIDRFull(subtotal())}</b></div>
            <div><span>Diskon</span><b>− ${fmtIDRFull(discount())}</b></div>
            <div><span>PPN ${draft.taxPct}%</span><b>${fmtIDRFull(tax())}</b></div>
            <div class="grand"><span>Total penawaran</span><b>${fmtIDRFull(total())}</b></div>
          </div>`;
        if (step === 3) body = `
          <div class="field-grid">
            <label class="field"><span>Termin pembayaran</span>
              <select id="wizTerms" name="paymentTerms" autocomplete="off" class="select block">${['DP 50% - Pelunasan', 'Net 14', 'Net 30', 'Net 45'].map((t) => `<option ${t === draft.terms ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
            <label class="field"><span>Estimasi pengerjaan (minggu)</span><input id="wizWeeks" name="deliveryWeeks" autocomplete="off" type="number" min="1" max="52" value="${draft.deliveryWeeks}"></label>
          </div>
          <label class="field"><span>Catatan untuk pelanggan</span><textarea id="wizNotes" name="customerNotes" autocomplete="off" rows="3" placeholder="Contoh: syarat garansi, lingkup pekerjaan, dan pengecualian…">${esc(draft.notes)}</textarea></label>`;
        if (step >= 4) body = `
          <div class="review-card">
            <div class="review-row"><span>Pelanggan</span><b>${esc(draft.customerName || '—')}</b></div>
            <div class="review-row"><span>Baris produk</span><b>${draft.lines.length} item</b></div>
            <div class="review-row"><span>Termin</span><b>${esc(draft.terms)} · ${draft.deliveryWeeks} minggu</b></div>
            <div class="review-row grand"><span>Total penawaran</span><b>${fmtIDRFull(total())}</b></div>
            ${step === 5 ? `<p class="review-note">Dokumen dibuat sebagai draft lalu langsung diajukan ke jenjang persetujuan (${total() > 50_000_000 ? 'supervisor → finance → owner' : total() > 5_000_000 ? 'supervisor → finance' : 'supervisor'}).</p>` : ''}
          </div>`;

        main.innerHTML = pageHead({ eyebrow: 'PENJUALAN · PENAWARAN BARU', title: 'Buat penawaran', sub: 'Draft tersimpan otomatis — data tidak hilang saat berpindah langkah.' }) + `
          <section class="panel wizard-panel">
            <div class="wiz-steps">${stepsHtml}</div>
            <div class="wiz-body">${body}<p class="error-text" id="wizError" role="alert"></p></div>
            <footer class="wiz-footer">
              <button class="btn secondary" id="wizBack" ${step === 0 ? 'disabled' : ''}>Kembali</button>
              <span class="wiz-progress">Langkah ${step + 1} dari ${steps.length}</span>
              <button class="btn primary" id="wizNext">${step === 5 ? 'Buat & ajukan penawaran' : step === 4 ? 'Lanjut ke pengajuan' : 'Lanjut'}</button>
            </footer>
          </section>`;
        bind();
      }

      function bind() {
        const err = (msg) => { main.querySelector('#wizError').textContent = msg; };
        main.querySelector('#wizBack').addEventListener('click', () => { if (step > 0) { step -= 1; view(); } });
        main.querySelector('#wizNext').addEventListener('click', async () => {
          if (step === 0 && !draft.customerId) return err('Pilih pelanggan terlebih dahulu.');
          if (step === 1 && !draft.lines.length) return err('Tambahkan minimal satu baris produk.');
          if (step < 5) { step += 1; persist(); view(); return; }
          const btn = main.querySelector('#wizNext');
          btn.disabled = true; btn.textContent = 'Memproses…'; // cegah klik ganda
          try {
            const doc = await api('/api/documents', { method: 'POST', idempotencyKey: newIdemKey(), body: {
              type: 'QUOTATION', title: `Penawaran ${draft.lines[0].name}${draft.lines.length > 1 ? ` +${draft.lines.length - 1} item` : ''}`,
              amount: Math.round(total()), partyId: draft.customerId, partyName: draft.customerName,
              payload: { lines: draft.lines, discountPct: draft.discountPct, taxPct: draft.taxPct, terms: draft.terms, deliveryWeeks: draft.deliveryWeeks, notes: draft.notes }
            } });
            await api(`/api/documents/${doc.id}/action`, { method: 'POST', idempotencyKey: newIdemKey(), body: { action: 'submit' } });
            localStorage.removeItem(DRAFT_KEY);
            invalidate('documents'); invalidate('dashboard'); invalidate('approvals');
            toast(`${doc.documentNumber} diajukan`, 'Penawaran masuk antrean persetujuan.');
            router.go('#/sales/quotations');
          } catch (error) {
            btn.disabled = false; btn.textContent = 'Buat & ajukan penawaran';
            err(error.message);
          }
        });
        const customerSel = main.querySelector('#wizCustomer');
        if (customerSel) customerSel.addEventListener('change', () => {
          draft.customerId = customerSel.value;
          draft.customerName = customerSel.selectedOptions[0] ? customerSel.selectedOptions[0].textContent.split(' · ')[0] : '';
          persist();
        });
        const addSel = main.querySelector('#wizAddProduct');
        if (addSel) addSel.addEventListener('change', () => {
          const p = products.items.find((x) => x.id === addSel.value);
          if (p) { draft.lines.push({ productId: p.id, name: p.name, uom: p.uom, price: p.price, qty: 1 }); persist(); view(); }
        });
        main.querySelectorAll('[data-line-qty]').forEach((input) => input.addEventListener('change', () => {
          draft.lines[Number(input.dataset.lineQty)].qty = Math.max(1, Number(input.value) || 1); persist(); view();
        }));
        main.querySelectorAll('[data-line-del]').forEach((btn) => btn.addEventListener('click', () => {
          draft.lines.splice(Number(btn.dataset.lineDel), 1); persist(); view();
        }));
        const bindNum = (id, key) => { const el = main.querySelector(id); if (el) el.addEventListener('change', () => { draft[key] = Number(el.value) || 0; persist(); view(); }); };
        bindNum('#wizDiscount', 'discountPct'); bindNum('#wizTax', 'taxPct'); bindNum('#wizWeeks', 'deliveryWeeks');
        const terms = main.querySelector('#wizTerms'); if (terms) terms.addEventListener('change', () => { draft.terms = terms.value; persist(); });
        const notes = main.querySelector('#wizNotes'); if (notes) notes.addEventListener('input', window.MAT.debounce(() => { draft.notes = notes.value; persist(); }, 1000));
      }
      view();
    }
  };

  // ── Revisi penawaran ber-versi (Sprint 9 / R016) ─────────────────────────
  const quotationRevisions = {
    permission: 'quotation.view',
    async render(main, params) {
      const [doc, revs] = await Promise.all([api(`/api/documents/${params.id}`), api(`/api/quotations/${params.id}/revisions`)]);
      const canRevise = can('quotation.edit') && ['WAITING_APPROVAL', 'APPROVED', 'REVISION_REQUIRED', 'SUBMITTED'].includes(doc.status);
      main.innerHTML = pageHead({
        eyebrow: 'PENJUALAN · REVISI', title: `${doc.documentNumber} — rev ${revs.current.revisionNo}`,
        sub: `${esc(doc.title)} · nilai aktif ${fmtIDR(doc.amount)} · setiap revisi membekukan keadaan sebelumnya secara permanen`,
        actions: `${canRevise ? `<button class="btn primary" id="qRevise">${ICONS.refresh} Revisi penawaran</button>` : ''}<button class="btn secondary" id="qDoc">Dokumen ${ICONS.arrow}</button>`
      }) + `
        <section class="panel"><header><div><p class="eyebrow">HISTORI</p><h2>${revs.items.length} revisi tersimpan</h2></div>${chip(doc.status)}</header>
          <div class="table-wrap"><table><thead><tr><th>Rev</th><th class="right">Nilai saat itu</th><th class="right">Δ ke revisi berikutnya</th><th>Status saat direvisi</th><th>Alasan</th><th>Oleh</th><th>Kapan</th></tr></thead>
          <tbody>
            <tr><td><b>rev ${revs.current.revisionNo}</b> <span class="chip mint">Aktif</span></td><td class="right money">${fmtIDRFull(revs.current.amount)}</td><td class="right">—</td><td>${chip(doc.status)}</td><td colspan="3" class="muted">Versi berjalan</td></tr>
            ${revs.items.map((r) => `<tr><td>rev ${r.revisionNo}</td><td class="right money">${fmtIDRFull(r.amount)}</td>
              <td class="right money">${r.amountDelta > 0 ? '+' : ''}${fmtIDR(r.amountDelta)}</td><td>${chip(r.statusAtRevision)}</td>
              <td>${esc(r.reason)}</td><td>${esc(r.revisedByName || '—')}</td><td>${relTime(r.revisedAt)}</td></tr>`).join('')}
          </tbody></table></div>
          <div class="panel-body"><p class="muted">Nomor dokumen tidak berubah antar revisi. Penawaran yang sudah dikonversi menjadi Sales Order tidak dapat direvisi — buat penawaran baru.</p></div>
        </section>`;
      main.querySelector('#qDoc').addEventListener('click', () => openDrawer(doc.id, { onChange: () => this.render(main, params) }));
      main.querySelector('#qRevise')?.addEventListener('click', async () => {
        const answer = await actionDialog({ title: `Revisi ${doc.documentNumber}`, description: `Keadaan rev ${revs.current.revisionNo} dibekukan permanen, dokumen kembali DRAFT sebagai rev ${revs.current.revisionNo + 1}, dan approval diulang dari awal.`, requireReason: true, confirmLabel: 'Bekukan & revisi' });
        if (!answer) return;
        try {
          const r = await api(`/api/quotations/${doc.id}/revise`, { method: 'POST', idempotencyKey: newIdemKey(), body: answer });
          invalidate('documents'); toast('Revisi dibuka', `${r.documentNumber} sekarang rev ${r.revisionNo} (DRAFT).`);
          this.render(main, params);
        } catch (error) { toast('Revisi gagal', error.message, 'coral'); }
      });
    }
  };

  // ── RMA / retur & garansi (Sprint 9 / R016) ───────────────────────────────
  async function createRmaDialog(reload) {
    try {
      const sources = await api('/api/documents?type=DELIVERY,INVOICE&limit=100');
      const usable = sources.items.filter((x) => ['COMPLETED', 'CLOSED', 'APPROVED', 'PARTIALLY_PAID'].includes(x.status));
      if (!usable.length) throw new Error('Tidak ada Delivery/Invoice selesai yang bisa menjadi sumber retur.');
      const pick = await formDialog({
        title: 'Buat RMA — retur / klaim garansi', description: 'Pilih dokumen sumber. Klaim garansi divalidasi terhadap masa garansi produk sejak tanggal dokumen sumber.',
        fields: [
          { name: 'sourceDocumentId', label: 'Dokumen sumber', type: 'select', options: usable.map((x) => [x.id, `${x.documentNumber} · ${x.partyName || '—'} · ${fmtIDR(x.amount)}`]), required: true },
          { name: 'warrantyClaim', label: 'Jenis', type: 'select', options: [['', 'Retur biasa'], ['1', 'Klaim garansi']] },
          { name: 'reasonCode', label: 'Kode alasan', type: 'select', options: [['RETURN', 'Retur penjualan'], ['DEFECT', 'Cacat produk'], ['WRONG_ITEM', 'Salah kirim'], ['WARRANTY', 'Garansi']] }
        ], submitLabel: 'Lanjut pilih barang'
      });
      if (!pick) return;
      const source = await api(`/api/documents/${pick.sourceDocumentId}`);
      const srcLines = Array.isArray(source.payload?.lines) ? source.payload.lines.filter((l) => l.productId) : [];
      if (!srcLines.length) throw new Error('Dokumen sumber tidak memiliki baris produk (productId).');
      const value = await formDialog({
        title: `Barang dari ${source.documentNumber}`, description: 'Satu RMA dapat berisi satu baris via formulir ini; tambahkan RMA lain untuk item berbeda.',
        fields: [
          { name: 'productId', label: 'Produk', type: 'select', options: srcLines.map((l) => [l.productId, `${l.name || l.description || 'Produk'} · qty ${l.qty}`]), required: true },
          { name: 'qty', label: 'Qty retur', type: 'number', min: 0.0001, required: true },
          { name: 'unitPrice', label: 'Nilai kredit / unit (0 untuk klaim tanpa kredit)', type: 'number', min: 0, required: true },
          { name: 'disposition', label: 'Disposisi', type: 'select', options: [['RESTOCK', 'Masuk stok kembali'], ['SCRAP', 'Scrap (musnah)'], ['REPAIR', 'Perbaikan']], required: true },
          { name: 'note', label: 'Catatan kondisi' }
        ], submitLabel: 'Buat RMA'
      });
      if (!value) return;
      const rma = await api('/api/rma', { method: 'POST', idempotencyKey: newIdemKey(), body: {
        sourceDocumentId: pick.sourceDocumentId, warrantyClaim: pick.warrantyClaim === '1', reasonCode: pick.reasonCode,
        lines: [{ productId: value.productId, qty: Number(value.qty), unitPrice: Number(value.unitPrice), disposition: value.disposition, note: value.note }]
      } });
      invalidate('documents'); toast(`${rma.documentNumber} dibuat`, 'Proses lewat alur dokumen: ajukan → setujui → selesaikan untuk posting retur.');
      if (reload) reload();
      openDrawer(rma.id, { onChange: reload });
    } catch (error) { toast('Gagal membuat RMA', error.message, 'coral'); }
  }

  const R = router.register.bind(router);
  R('/sales/inquiries', docListPage({ type: 'CUSTOMER_INQUIRY', module: 'inquiry', title: 'Customer inquiry', eyebrow: 'PENJUALAN' }));
  R('/sales/quotations', docListPage({
    type: 'QUOTATION', module: 'quotation', title: 'Penawaran', eyebrow: 'PENJUALAN', createLabel: 'Buat penawaran', createRoute: '#/sales/quotations/new',
    columns: [
      { label: 'Dokumen', render: docCell },
      { label: 'Rev', render: (r) => `<span class="chip gray">rev ${(r.payload && r.payload.revisionNo) || 1}</span>` },
      { label: 'Pelanggan', render: (r) => esc(r.partyName || '—') },
      { label: 'Nilai', right: true, render: (r) => `<span class="money">${fmtIDR(r.amount)}</span>` },
      { label: 'Status', render: (r) => chip(r.status) },
      { label: 'Diperbarui', render: (r) => relTime(r.updatedAt) }
    ],
    rowRoute: (row) => `#/sales/quotations/${row.id}/revisions`
  }));
  R('/sales/quotations/new', quotationWizard);
  R('/sales/quotations/:id/revisions', quotationRevisions);
  R('/sales/rma', docListPage({
    type: 'RMA', module: 'rma', title: 'Retur & garansi (RMA)', eyebrow: 'PENJUALAN', createLabel: 'Buat RMA', onCreate: createRmaDialog,
    columns: [
      { label: 'Dokumen', render: docCell },
      { label: 'Sumber', render: (r) => esc((r.payload && r.payload.sourceNumber) || '—') },
      { label: 'Jenis', render: (r) => r.payload && r.payload.warrantyClaim ? '<span class="chip lavender">Garansi</span>' : '<span class="chip gray">Retur</span>' },
      { label: 'Nilai kredit', right: true, render: (r) => `<span class="money">${fmtIDR(r.amount)}</span>` },
      { label: 'Status', render: (r) => chip(r.status) },
      { label: 'Diperbarui', render: (r) => relTime(r.updatedAt) }
    ]
  }));
  // ── PO Pelanggan: rekam PO yang DITERIMA dari customer ────────────────────
  // Alur: customer kirim PO → direkam di sini (nomor PO mereka + nilai) →
  // dicocokkan dengan penawaran kita (discrepancy check) → disetujui →
  // dikonversi menjadi Sales Order. Nomor internal CPO-* tetap terbit.
  async function createCustomerPoDialog(reload) {
    try {
      const [customers, quotations] = await Promise.all([
        api('/api/customers?limit=200'),
        api('/api/documents?type=QUOTATION&limit=100')
      ]);
      const custList = asList(customers), quoList = asList(quotations)
        .filter((q) => ['APPROVED', 'WAITING_APPROVAL', 'COMPLETED', 'CLOSED'].includes(q.status));
      if (!custList.length) throw new Error('Belum ada pelanggan. Tambahkan master pelanggan lebih dulu di Master Data › Pelanggan.');
      const value = await formDialog({
        title: 'Rekam PO dari pelanggan',
        description: 'Masukkan PO yang Anda TERIMA dari customer. Bila merujuk penawaran kita, selisih nilai otomatis diperiksa sebelum dikonversi menjadi Sales Order.',
        fields: [
          { name: 'customerId', label: 'Pelanggan', type: 'select', options: custList.map((c) => [c.id, `${c.code} · ${c.name}`]), required: true },
          { name: 'customerPoNumber', label: 'Nomor PO pelanggan (dokumen mereka)', required: true, hint: 'Contoh: PO/2026/VII/0123 — dipakai sebagai referensi resmi di invoice.' },
          { name: 'poDate', label: 'Tanggal PO pelanggan', type: 'date', required: true },
          { name: 'amount', label: 'Nilai PO (Rp)', type: 'number', min: 0, required: true },
          { name: 'quotationId', label: 'Merujuk penawaran kita (opsional)', type: 'select', options: [['', '— Tanpa penawaran —'], ...quoList.map((q) => [q.id, `${q.documentNumber} · ${fmtIDR(q.amount)}`])] },
          { name: 'dueDate', label: 'Target kirim / jatuh tempo', type: 'date' },
          { name: 'description', label: 'Uraian pekerjaan / barang', type: 'textarea', required: true }
        ],
        submitLabel: 'Rekam PO pelanggan'
      });
      if (!value) return;
      const customer = custList.find((c) => c.id === value.customerId);
      const quotation = value.quotationId ? quoList.find((q) => q.id === value.quotationId) : null;
      const amount = Number(value.amount);

      // Discrepancy check (§12 flow "Customer PO Validation"): selisih nilai PO
      // pelanggan vs penawaran kita ditampilkan sebelum direkam.
      if (quotation) {
        const diff = amount - Number(quotation.amount);
        if (Math.abs(diff) > 0.5) {
          const ok = await actionDialog({
            title: 'Selisih nilai terdeteksi',
            description: `PO pelanggan ${fmtIDR(amount)} vs penawaran ${quotation.documentNumber} ${fmtIDR(quotation.amount)} — selisih ${diff > 0 ? 'lebih' : 'kurang'} ${fmtIDR(Math.abs(diff))}. Rekam tetap dengan alasan tertulis?`,
            requireReason: true, confirmLabel: 'Rekam dengan catatan selisih'
          });
          if (!ok) return;
          value.discrepancyReason = ok.reason;
        }
      }

      const doc = await api('/api/documents', { method: 'POST', idempotencyKey: newIdemKey(), body: {
        type: 'CUSTOMER_PO',
        title: `PO ${value.customerPoNumber} — ${customer.name}`,
        amount, partyId: customer.id, partyName: customer.name, dueDate: value.dueDate || null,
        payload: {
          customerPoNumber: value.customerPoNumber, poDate: value.poDate,
          quotationId: quotation?.id || null, quotationNumber: quotation?.documentNumber || null,
          quotationAmount: quotation ? Number(quotation.amount) : null,
          discrepancy: quotation ? Number((amount - Number(quotation.amount)).toFixed(2)) : null,
          discrepancyReason: value.discrepancyReason || null,
          lines: [{ description: value.description, qty: 1, unitPrice: amount }]
        }
      } });
      // Rujukan penawaran tersimpan pada payload (quotationId/Number/Amount)
      // sehingga rantai QUO → CPO → SO tetap terlacak pada dokumen.
      toast(`${doc.documentNumber} direkam`, 'Ajukan → setujui → "Buat Sales Order" untuk melanjutkan ke produksi.');
      if (reload) reload();
      openDrawer(doc.id, { onChange: reload });
    } catch (error) { toast('Gagal merekam PO pelanggan', error.message, 'coral'); }
  }

  const commercialControl = {
    permission: 'sales_order.view',
    async render(main, _params, signal) {
      const [overview, contractsRes, ordersRes, backordersRes, pricingRes] = await Promise.all([
        api('/api/sales/commercial/overview', { signal }), api('/api/sales/contracts', { signal }),
        api('/api/documents?type=SALES_ORDER&limit=100', { signal }), api('/api/sales/backorders', { signal }),
        api('/api/sales/pricing-conditions', { signal }).catch(() => ({ items: [] }))
      ]);
      const contracts = asList(contractsRes), orders = asList(ordersRes), backorders = asList(backordersRes);
      const pricing = (pricingRes && pricingRes.items) || [];
      const orderOptions = orders.map((o) => [o.id, `${o.documentNumber} · ${o.partyName || 'Tanpa pelanggan'} · ${fmtIDR(o.amount)}`]);
      main.innerHTML = pageHead({ eyebrow: 'PENJUALAN · GOVERNANCE', title: 'Commercial Control Center', sub: 'Kendali margin, availability promise, kontrak, milestone billing, dan backorder dengan jejak keputusan.', actions: can('sales_order.create') ? `<button class="btn primary" id="newContract">${ICONS.plus} Kontrak pelanggan</button>` : '' }) + `
        <section class="kpi-grid">
          ${kpiCard({label:'Sales order aktif',value:String(overview.openOrders || 0),note:'Komitmen pelanggan berjalan',orb:'cart',orbTone:'blue'})}
          ${kpiCard({label:'Margin menunggu',value:String(overview.marginPending || 0),note:'Perlu keputusan Finance',tone:overview.marginPending?'warn':'up',orb:'checkCircle',orbTone:'amber'})}
          ${kpiCard({label:'Backorder terbuka',value:String(overview.backorderLines || 0),note:'Baris belum terpenuhi',tone:overview.backorderLines?'warn':'up',orb:'inbox',orbTone:'coral'})}
          ${kpiCard({label:'Kontrak aktif',value:String(overview.activeContracts || 0),note:`${overview.milestonesReady || 0} milestone siap tagih`,orb:'doc',orbTone:'mint'})}
        </section>
        <section class="panel"><header><div><p class="eyebrow">ORDER PROMISE</p><h2>ATP/CTP & billing orchestration</h2></div></header>
          <div class="table-wrap"><table><thead><tr><th>Sales order</th><th>Pelanggan</th><th>Nilai</th><th>Status</th><th>Kontrol</th></tr></thead><tbody>
          ${orders.map((o) => `<tr><td>${docCell(o)}</td><td>${esc(o.partyName || '—')}</td><td class="money">${fmtIDR(o.amount)}</td><td>${chip(o.status)}</td><td><div class="table-actions">
            ${can('sales_order.submit') ? `<button class="btn xs light" data-margin="${o.id}">Margin</button>` : ''}
            ${can('sales_order.edit') ? `<button class="btn xs light" data-atp="${o.id}">ATP/CTP</button>` : ''}
            ${can('invoice.create') || can('invoice.approve') ? `<button class="btn xs light" data-milestone="${o.id}">Milestone</button>` : ''}
            ${can('sales_order.edit') ? `<button class="btn xs light" data-backorder="${o.id}">Backorder</button>` : ''}
          </div></td></tr>`).join('') || '<tr><td colspan="5" class="empty-cell">Belum ada Sales Order.</td></tr>'}
          </tbody></table></div></section>
        <section class="panel"><header><div><p class="eyebrow">MARGIN EXCEPTION</p><h2>Maker-checker Finance</h2></div><span class="chip amber">${overview.marginItems?.length || 0} pending</span></header>
          <div class="table-wrap"><table><thead><tr><th>Dokumen</th><th>Pelanggan</th><th>Revenue</th><th>Est. cost</th><th>Margin</th><th>Keputusan</th></tr></thead><tbody>
          ${(overview.marginItems || []).map((x) => `<tr><td><b>${esc(x.documentNumber)}</b><small>versi ${x.documentVersion}</small></td><td>${esc(x.partyName || '—')}</td><td class="money">${fmtIDR(x.revenue)}</td><td class="money">${fmtIDR(x.estimatedCost)}</td><td><span class="chip coral">${Number(x.marginPct).toLocaleString('id-ID',{maximumFractionDigits:2})}%</span></td><td>${can('credit.approve') ? `<button class="btn xs primary" data-margin-decide="${x.id}" data-doc="${esc(x.documentNumber)}">Putuskan</button>` : '<span class="muted">Finance approver</span>'}</td></tr>`).join('') || '<tr><td colspan="6" class="empty-cell">Tidak ada margin exception.</td></tr>'}
          </tbody></table></div></section>
        <section class="panel"><header><div><p class="eyebrow">CUSTOMER AGREEMENT</p><h2>Kontrak & blanket release</h2></div></header>
          <div class="table-wrap"><table><thead><tr><th>Kontrak</th><th>Pelanggan</th><th>Masa berlaku</th><th>Plafon</th><th>Terpakai</th><th>Status / aksi</th></tr></thead><tbody>
          ${contracts.map((c) => `<tr><td><b>${esc(c.contractNumber)}</b><small>${esc(c.title)}</small></td><td>${esc(c.customerName)}</td><td>${fmtDate(c.validFrom)} – ${fmtDate(c.validTo)}</td><td class="money">${fmtIDR(c.ceilingAmount)}</td><td class="money">${fmtIDR(c.consumedAmount)}</td><td>${chip(c.status)} <span class="table-actions">${c.status === 'DRAFT' && can('sales_order.submit') ? `<button class="btn xs light" data-contract-submit="${c.id}">Ajukan</button>` : ''}${c.status === 'PENDING_APPROVAL' && can('sales_order.approve') ? `<button class="btn xs light" data-contract-decide="${c.id}" data-number="${esc(c.contractNumber)}">Putuskan</button>` : ''}${c.status === 'ACTIVE' && can('sales_order.edit') && orderOptions.length ? `<button class="btn xs light" data-contract-release="${c.id}" data-remaining="${Number(c.ceilingAmount)-Number(c.consumedAmount)}">Release</button>` : ''}</span></td></tr>`).join('') || '<tr><td colspan="6" class="empty-cell">Belum ada kontrak penjualan.</td></tr>'}
          </tbody></table></div></section>
        <section class="panel"><header><div><p class="eyebrow">FULFILMENT EXCEPTION</p><h2>Backorder worklist</h2></div><span class="chip coral">${backorders.filter((x) => !['FULFILLED','CANCELLED'].includes(x.status)).length} terbuka</span></header>
          <div class="table-wrap"><table><thead><tr><th>Sales order</th><th>Baris</th><th>Pelanggan</th><th>Backorder</th><th>Terallocasi</th><th>Promise</th><th>Status</th></tr></thead><tbody>
          ${backorders.map((b) => `<tr><td><b>${esc(b.documentNumber)}</b></td><td>${b.lineNo} · ${esc(b.description)}</td><td>${esc(b.partyName || '—')}</td><td>${Number(b.backorderQty).toLocaleString('id-ID')}</td><td>${Number(b.allocatedQty).toLocaleString('id-ID')}</td><td>${b.promisedDate ? fmtDate(b.promisedDate) : 'Review manual'}</td><td>${chip(b.status)}</td></tr>`).join('') || '<tr><td colspan="7" class="empty-cell">Belum ada backorder tersimpan.</td></tr>'}
          </tbody></table></div></section>
        <section class="panel pricing-conditions"><header><div><p class="eyebrow">PRICING</p><h2>Kondisi harga (price list & diskon)</h2></div><span class="table-actions">
            <button class="btn xs light" id="priceCheck">Cek harga</button>
            ${can('quotation.edit') ? `<button class="btn xs primary" id="newPricing">${ICONS.plus} Tambah kondisi</button>` : ''}</span></header>
          <div class="table-wrap"><table><thead><tr><th>Jenis</th><th>Cakupan</th><th class="right">Nilai</th><th class="right">Min qty</th><th>Berlaku</th><th>Status / aksi</th></tr></thead><tbody>
          ${pricing.map((c) => `<tr><td><b>${esc(c.conditionType)}</b></td>
            <td>${[c.productCode ? esc(c.productCode) : null, c.productCategory ? `kat ${esc(c.productCategory)}` : null, c.partyId ? 'pelanggan' : null].filter(Boolean).join(' · ') || '<span class="muted">semua</span>'}</td>
            <td class="right money">${String(c.conditionType).endsWith('_PCT') ? `${Number(c.amount)}%` : fmtIDR(c.amount)}</td>
            <td class="right">${Number(c.minQty)}</td>
            <td>${fmtDate(c.effectiveFrom)}${c.effectiveTo ? ` – ${fmtDate(c.effectiveTo)}` : ''}</td>
            <td>${chip(c.status)} ${c.status === 'ACTIVE' && can('quotation.edit') ? `<button class="btn xs light" data-price-off="${c.id}" data-ver="${c.version}">Nonaktifkan</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="6" class="empty-cell">Belum ada kondisi harga. Harga jual jatuh ke harga daftar produk.</td></tr>'}
          </tbody></table></div>
          <div class="panel-body"><p class="muted">Resolusi harga server: base price paling spesifik (pelanggan+produk &gt; produk &gt; kategori; jatuh ke harga daftar produk bila tak ada), lalu diskon/surcharge yang berlaku diterapkan berurutan. Skala kuantitas dan masa berlaku dihormati.</p></div>
        </section>`;

      const reload = () => this.render(main, _params, signal);
      main.querySelector('#newPricing')?.addEventListener('click', async () => {
        const products = asList(await api('/api/products?limit=300').catch(() => ({ items: [] })));
        const v = await formDialog({ title: 'Tambah kondisi harga', description: 'Base price menetapkan harga; diskon/surcharge menyesuaikannya. Cakupan minimal satu: produk, kategori, atau pelanggan.', fields: [
          { name: 'conditionType', label: 'Jenis', type: 'select', required: true, options: [['BASE_PRICE', 'Base price'], ['DISCOUNT_PCT', 'Diskon %'], ['DISCOUNT_AMT', 'Diskon /unit'], ['SURCHARGE_PCT', 'Surcharge %']] },
          { name: 'productId', label: 'Produk', type: 'select', options: [['', '— semua —'], ...products.map((p) => [p.id, `${p.code} · ${p.name}`])] },
          { name: 'productCategory', label: 'Kategori produk (opsional)' },
          { name: 'amount', label: 'Nilai (harga / persen / nominal)', type: 'number', min: 0, required: true },
          { name: 'minQty', label: 'Min qty (skala grosir)', type: 'number', min: 0 },
          { name: 'effectiveFrom', label: 'Berlaku mulai', type: 'date' },
          { name: 'effectiveTo', label: 'Berlaku sampai (opsional)', type: 'date' },
          { name: 'notes', label: 'Catatan' }
        ], submitLabel: 'Simpan kondisi' });
        if (!v) return;
        try {
          await api('/api/sales/pricing-conditions', { method: 'POST', idempotencyKey: newIdemKey(), body: {
            conditionType: v.conditionType, productId: v.productId || null, productCategory: v.productCategory || null,
            amount: Number(v.amount), minQty: v.minQty ? Number(v.minQty) : 0, effectiveFrom: v.effectiveFrom || null, effectiveTo: v.effectiveTo || null, notes: v.notes || null } });
          toast('Kondisi harga disimpan', v.conditionType); reload();
        } catch (e) { toast('Gagal menyimpan kondisi', e.message, 'coral'); }
      });
      main.querySelector('#priceCheck')?.addEventListener('click', async () => {
        const products = asList(await api('/api/products?limit=300').catch(() => ({ items: [] })));
        const v = await formDialog({ title: 'Cek harga', description: 'Resolusi harga server dari condition records.', fields: [
          { name: 'productId', label: 'Produk', type: 'select', required: true, options: products.map((p) => [p.id, `${p.code} · ${p.name}`]) },
          { name: 'qty', label: 'Qty', type: 'number', min: 1 }
        ], submitLabel: 'Hitung harga' });
        if (!v) return;
        try {
          const r = await api(`/api/sales/price?productId=${encodeURIComponent(v.productId)}&qty=${Number(v.qty) || 1}`);
          toast(`Harga ${r.productCode}`, `Base ${fmtIDR(r.basePrice)} (${r.basePriceSource}) → Net ${fmtIDR(r.netUnitPrice)} · ${r.appliedConditions.length} kondisi`, 'mint');
        } catch (e) { toast('Gagal menghitung harga', e.message, 'coral'); }
      });
      main.querySelectorAll('[data-price-off]').forEach((btn) => btn.addEventListener('click', async () => {
        try { await api(`/api/sales/pricing-conditions/${btn.dataset.priceOff}/deactivate`, { method: 'POST', body: { version: Number(btn.dataset.ver) } }); toast('Kondisi dinonaktifkan'); reload(); }
        catch (e) { toast('Gagal menonaktifkan', e.message, 'coral'); }
      }));
      main.querySelector('#newContract')?.addEventListener('click', async () => {
        const customers = asList(await api('/api/customers?limit=200'));
        const v = await formDialog({ title: 'Kontrak pelanggan', description: 'Kontrak dibuat DRAFT dan wajib melalui maker-checker.', fields: [
          {name:'contractNumber',label:'Nomor kontrak',required:true},{name:'customerId',label:'Pelanggan',type:'select',options:customers.map(c=>[c.id,`${c.code} · ${c.name}`]),required:true},
          {name:'title',label:'Judul kontrak',required:true},{name:'contractType',label:'Jenis',type:'select',options:[['FRAMEWORK','Framework'],['BLANKET','Blanket'],['PROJECT','Project'],['SERVICE','Service']]},
          {name:'validFrom',label:'Berlaku mulai',type:'date',required:true},{name:'validTo',label:'Berlaku sampai',type:'date',required:true},{name:'ceilingAmount',label:'Plafon nilai',type:'number',min:1,required:true},{name:'description',label:'Ruang lingkup',type:'textarea',required:true}
        ], submitLabel:'Buat draft kontrak' });
        if (!v) return; try { await api('/api/sales/contracts',{method:'POST',idempotencyKey:newIdemKey(),body:{...v,ceilingAmount:Number(v.ceilingAmount),lines:[{description:v.description,ceilingAmount:Number(v.ceilingAmount)}]}});toast('Kontrak dibuat','Draft kontrak siap diajukan.');reload(); } catch(e){toast('Gagal',e.message,'coral');}
      });
      main.querySelectorAll('[data-margin]').forEach((b) => b.addEventListener('click', async()=>{try{const x=await api(`/api/sales/documents/${b.dataset.margin}/margin`,{method:'POST',idempotencyKey:newIdemKey(),body:{}});toast('Margin dinilai',`${Number(x.marginPct).toLocaleString('id-ID',{maximumFractionDigits:2})}% · ${x.status}`);reload();}catch(e){toast('Assessment gagal',e.message,'coral');}}));
      main.querySelectorAll('[data-atp]').forEach((b) => b.addEventListener('click', async()=>{try{const x=await api(`/api/sales/orders/${b.dataset.atp}/availability`,{method:'POST',idempotencyKey:newIdemKey(),body:{}});toast('ATP/CTP dihitung',`${x.items.length} baris memiliki snapshot promise.`);reload();}catch(e){toast('ATP/CTP gagal',e.message,'coral');}}));
      main.querySelectorAll('[data-backorder]').forEach((b) => b.addEventListener('click', async()=>{try{await api(`/api/sales/orders/${b.dataset.backorder}/backorders/refresh`,{method:'POST',idempotencyKey:newIdemKey(),body:{}});toast('Backorder disegarkan','Worklist mengikuti pemenuhan terbaru.');reload();}catch(e){toast('Refresh gagal',e.message,'coral');}}));
      main.querySelectorAll('[data-margin-decide]').forEach((b) => b.addEventListener('click', async()=>{const a=await formDialog({title:`Keputusan margin ${b.dataset.doc}`,description:'Persetujuan hanya berlaku untuk versi dokumen yang dinilai.',fields:[{name:'decision',label:'Keputusan',type:'select',options:[['approve','Setujui exception'],['reject','Tolak exception']]},{name:'reason',label:'Alasan keputusan',type:'textarea',required:true}],submitLabel:'Simpan keputusan'});if(!a)return;try{await api(`/api/sales/margin-assessments/${b.dataset.marginDecide}/${a.decision}`,{method:'POST',idempotencyKey:newIdemKey(),body:{reason:a.reason}});reload();}catch(e){toast('Keputusan gagal',e.message,'coral');}}));
      main.querySelectorAll('[data-contract-submit]').forEach((b)=>b.addEventListener('click',async()=>{try{await api(`/api/sales/contracts/${b.dataset.contractSubmit}/submit`,{method:'POST',idempotencyKey:newIdemKey(),body:{}});reload();}catch(e){toast('Gagal',e.message,'coral');}}));
      main.querySelectorAll('[data-contract-decide]').forEach((b)=>b.addEventListener('click',async()=>{const a=await formDialog({title:`Keputusan ${b.dataset.number}`,description:'Maker-checker kontrak pelanggan.',fields:[{name:'decision',label:'Keputusan',type:'select',options:[['approve','Aktifkan kontrak'],['reject','Tolak kontrak']]},{name:'reason',label:'Alasan keputusan',type:'textarea',required:true}],submitLabel:'Simpan keputusan'});if(!a)return;try{await api(`/api/sales/contracts/${b.dataset.contractDecide}/${a.decision}`,{method:'POST',idempotencyKey:newIdemKey(),body:{reason:a.reason}});reload();}catch(e){toast('Gagal',e.message,'coral');}}));
      main.querySelectorAll('[data-contract-release]').forEach((b)=>b.addEventListener('click',async()=>{const v=await formDialog({title:'Release kontrak ke Sales Order',description:`Sisa plafon ${fmtIDR(Number(b.dataset.remaining))}.`,fields:[{name:'salesOrderId',label:'Sales order',type:'select',options:orderOptions,required:true},{name:'releasedAmount',label:'Nilai release',type:'number',min:1,required:true}],submitLabel:'Catat release'});if(!v)return;try{await api(`/api/sales/contracts/${b.dataset.contractRelease}/releases`,{method:'POST',idempotencyKey:newIdemKey(),body:{salesOrderId:v.salesOrderId,releasedAmount:Number(v.releasedAmount)}});reload();}catch(e){toast('Release gagal',e.message,'coral');}}));
      main.querySelectorAll('[data-milestone]').forEach((b)=>b.addEventListener('click',async()=>{try{const current=asList(await api(`/api/sales/orders/${b.dataset.milestone}/milestones`));if(!current.length){await api(`/api/sales/orders/${b.dataset.milestone}/milestones`,{method:'POST',idempotencyKey:newIdemKey(),body:{milestones:[{description:'Uang muka',billingPct:30,triggerType:'MANUAL_APPROVAL'},{description:'Serah terima',billingPct:70,triggerType:'ACCEPTANCE'}]}});toast('Jadwal dibuat','Skema 30% uang muka dan 70% serah terima dibuat.');return reload();}const ready=current.find(x=>x.status==='READY'),planned=current.find(x=>x.status==='PLANNED');if(ready&&can('invoice.create')){const x=await api(`/api/sales/milestones/${ready.id}/invoice`,{method:'POST',idempotencyKey:newIdemKey(),body:{}});toast('Invoice dibuat',x.invoice.documentNumber);return reload();}if(planned&&can('invoice.approve')){await api(`/api/sales/milestones/${planned.id}/ready`,{method:'POST',idempotencyKey:newIdemKey(),body:{}});toast('Milestone siap tagih',planned.description);return reload();}toast('Tidak ada aksi','Jadwal sudah diproses atau Anda bukan checker.');}catch(e){toast('Milestone gagal',e.message,'coral');}}));
    }
  };

  R('/sales/customer-pos', docListPage({
    type: 'CUSTOMER_PO', module: 'customer_po', title: 'PO pelanggan', eyebrow: 'PENJUALAN',
    createLabel: 'Rekam PO pelanggan', onCreate: createCustomerPoDialog,
    columns: [
      { label: 'Dokumen', render: docCell },
      { label: 'No. PO pelanggan', render: (r) => r.payload?.customerPoNumber ? `<b>${esc(r.payload.customerPoNumber)}</b><small>${r.payload.poDate ? fmtDate(r.payload.poDate) : ''}</small>` : '—' },
      { label: 'Pelanggan', render: (r) => esc(r.partyName || '—') },
      { label: 'Nilai', right: true, render: (r) => `<span class="money">${fmtIDR(r.amount)}</span>` },
      { label: 'Vs penawaran', render: (r) => {
        const d = r.payload?.discrepancy;
        if (r.payload?.quotationNumber == null) return '<span class="muted">—</span>';
        if (!d) return `<span class="chip mint">Sesuai</span><small>${esc(r.payload.quotationNumber)}</small>`;
        return `<span class="chip ${d > 0 ? 'blue' : 'amber'}">${d > 0 ? '+' : ''}${fmtIDR(d)}</span><small>${esc(r.payload.quotationNumber)}</small>`;
      } },
      { label: 'Status', render: (r) => chip(r.status) }
    ],
    empty: { icon: 'inbox', title: 'Belum ada PO pelanggan', note: 'Klik "Rekam PO pelanggan" saat customer mengirimkan PO mereka.' }
  }));
  R('/sales/orders', docListPage({ type: 'SALES_ORDER', module: 'sales_order', title: 'Sales order', eyebrow: 'PENJUALAN' }));
  R('/sales/commercial-control', commercialControl);
  R('/sales/projects', docListPage({ type: 'PROJECT', module: 'project', title: 'Proyek', eyebrow: 'PENJUALAN' }));
})();
