'use strict';
(() => {
  const { esc, fmtIDR, fmtIDRFull, fmtDate, fmtDateTime, relTime, api, uploadFile, query, invalidate, router, can, state, newIdemKey } = window.MAT;
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

  // ── Detail dokumen penuh ──────────────────────────────────────────────────

  const R = router.register.bind(router);
  R('/sales/inquiries', docListPage({ type: 'CUSTOMER_INQUIRY', module: 'inquiry', title: 'Customer inquiry', eyebrow: 'PENJUALAN' }));
  R('/sales/quotations', docListPage({ type: 'QUOTATION', module: 'quotation', title: 'Penawaran', eyebrow: 'PENJUALAN', createLabel: 'Buat penawaran', createRoute: '#/sales/quotations/new' }));
  R('/sales/quotations/new', quotationWizard);
  R('/sales/customer-pos', docListPage({ type: 'CUSTOMER_PO', module: 'customer_po', title: 'PO pelanggan', eyebrow: 'PENJUALAN' }));
  R('/sales/orders', docListPage({ type: 'SALES_ORDER', module: 'sales_order', title: 'Sales order', eyebrow: 'PENJUALAN' }));
  R('/sales/projects', docListPage({ type: 'PROJECT', module: 'project', title: 'Proyek', eyebrow: 'PENJUALAN' }));
})();
